import { Router, Response } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../config/db.js';
import { authenticateToken, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { realtime } from '../services/realtime.js';

const router = Router();

const createDamageReportSchema = z.object({
  rental_id: z.coerce.number().int().positive(),
  damage_type: z.enum([
    'MINOR_DAMAGE',
    'MAJOR_DAMAGE',
    'MISSING_ACCESSORY',
    'LOST',
    'NON_FUNCTIONAL',
    'BURNED',
    'PHYSICAL_DAMAGE',
    'OTHER',
  ]),
  description: z.string().min(5),
  estimated_cost: z.coerce.number().positive(),
  evidence_url: z.string().optional(),
  evidence_description: z.string().optional(),
});

// GET /api/damage/queue
// Moderator/Admin queue
router.get('/queue', authenticateToken, requireRole(['ADMIN', 'MODERATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, damage_type, search, sort } = req.query;
    let sql = `
      SELECT 
        d.*,
        r.listing_id,
        l.listing_title,
        i.inventory_code,
        c.component_name,
        u_rep.full_name AS reported_by_name,
        u_owner.full_name AS owner_name,
        u_borrower.full_name AS borrower_name,
        COALESCE(
          json_agg(
            json_build_object(
              'evidence_id', de.evidence_id,
              'file_url', de.file_url,
              'description', de.description
            )
          ) FILTER (WHERE de.evidence_id IS NOT NULL), '[]'
        ) AS evidence
      FROM damage_reports d
      JOIN rentals r ON d.rental_id = r.rental_id
      JOIN listings l ON r.listing_id = l.listing_id
      JOIN inventory i ON d.inventory_id = i.inventory_id
      JOIN component_catalog c ON i.component_id = c.component_id
      JOIN users u_rep ON d.reported_by = u_rep.user_id
      JOIN users u_owner ON r.owner_id = u_owner.user_id
      JOIN users u_borrower ON r.borrower_id = u_borrower.user_id
      LEFT JOIN damage_evidence de ON d.damage_report_id = de.damage_report_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      if (status === 'PENDING') {
        sql += ` AND d.status IN ('REPORTED', 'UNDER_REVIEW')`;
      } else {
        params.push(status);
        sql += ` AND d.status = $${params.length}`;
      }
    }

    if (damage_type) {
      params.push(damage_type);
      sql += ` AND d.damage_type = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (
        c.component_name ILIKE $${params.length}
        OR l.listing_title ILIKE $${params.length}
        OR i.inventory_code ILIKE $${params.length}
        OR u_rep.full_name ILIKE $${params.length}
        OR u_owner.full_name ILIKE $${params.length}
        OR u_borrower.full_name ILIKE $${params.length}
        OR d.description ILIKE $${params.length}
        OR CAST(d.damage_report_id AS TEXT) ILIKE $${params.length}
      )`;
    }

    sql += ` GROUP BY d.damage_report_id, r.listing_id, l.listing_title, i.inventory_code, c.component_name, u_rep.full_name, u_owner.full_name, u_borrower.full_name`;

    if (sort === 'highest_cost') {
      sql += ` ORDER BY d.estimated_cost DESC, d.reported_at DESC`;
    } else if (sort === 'lowest_cost') {
      sql += ` ORDER BY d.estimated_cost ASC, d.reported_at DESC`;
    } else {
      sql += ` ORDER BY d.reported_at DESC`;
    }

    const result = await query(sql, params);
    res.json({ reports: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/damage
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createDamageReportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  const { rental_id, damage_type, description, estimated_cost, evidence_url, evidence_description } = parsed.data;

  try {
    const rentalRes = await query('SELECT * FROM rentals WHERE rental_id = $1', [rental_id]);
    if (rentalRes.rows.length === 0) {
      res.status(404).json({ error: 'Rental not found' });
      return;
    }

    const rental = rentalRes.rows[0];
    const isParticipant =
      Number(rental.owner_id) === Number(req.user!.userId) ||
      Number(rental.borrower_id) === Number(req.user!.userId);

    if (!isParticipant && !req.user!.roles.includes('ADMIN')) {
      res.status(403).json({ error: 'Only participants in this rental can file a damage report' });
      return;
    }

    const report = await withTransaction(async (client) => {
      const dmgRes = await client.query(
        `INSERT INTO damage_reports (
          rental_id, inventory_id, reported_by, damage_type, description, estimated_cost, status, reported_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'REPORTED', NOW())
        RETURNING *`,
        [rental.rental_id, rental.inventory_id, req.user!.userId, damage_type, description, estimated_cost]
      );

      const newReport = dmgRes.rows[0];

      if (evidence_url) {
        await client.query(
          `INSERT INTO damage_evidence (damage_report_id, uploaded_by, file_url, description)
           VALUES ($1, $2, $3, $4)`,
          [newReport.damage_report_id, req.user!.userId, evidence_url, evidence_description || null]
        );
      }

      await logAudit(client, req.user!.userId, 'INSERT', 'damage_reports', newReport.damage_report_id, null, {
        damage_type,
        estimated_cost,
      });

      return newReport;
    });

    res.status(201).json({ report });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/damage/:id/review (Moderator/Admin)
router.put('/:id/review', authenticateToken, requireRole(['ADMIN', 'MODERATOR']), async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    status: z.enum(['UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'SETTLED']),
    approved_cost: z.coerce.number().nonnegative().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  try {
    const { status, approved_cost } = parsed.data;

    const result = await query(
      `UPDATE damage_reports SET
        status = $1::damage_status,
        approved_cost = COALESCE($2::numeric, approved_cost),
        resolved_at = CASE WHEN $1::text IN ('ACCEPTED', 'REJECTED', 'SETTLED') THEN NOW() ELSE resolved_at END
       WHERE damage_report_id = $3::bigint
       RETURNING *`,
      [status, approved_cost !== undefined ? approved_cost : null, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Damage report not found' });
      return;
    }

    const report = result.rows[0];

    try {
      await logAudit(null, req.user!.userId, 'UPDATE', 'damage_reports', report.damage_report_id, null, {
        status,
        approved_cost,
      });

      realtime.broadcast('RENTAL_UPDATED', {
        rental_id: report.rental_id,
        damage_report_id: report.damage_report_id,
      });
    } catch (auditErr) {
      console.error('Audit or realtime error in damage review:', auditErr);
    }

    res.json({ report });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
