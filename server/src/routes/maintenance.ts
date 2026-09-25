import { Router, Response } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../config/db.js';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { sendValidationError } from '../utils/validation.js';

const router = Router();

const createMaintenanceSchema = z.object({
  inventory_id: z.number().int().positive('Please select a valid inventory unit'),
  maintenance_type: z.string().trim().min(2, 'Maintenance type must be at least 2 characters').max(100),
  description: z.string().optional(),
  cost: z.number().nonnegative('Cost cannot be negative').default(0),
  notes: z.string().optional(),
});

// POST /api/maintenance
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createMaintenanceSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const { inventory_id, maintenance_type, description, cost, notes } = parsed.data;

  try {
    const invRes = await query('SELECT * FROM inventory WHERE inventory_id = $1', [inventory_id]);
    if (invRes.rows.length === 0) {
      res.status(404).json({ error: 'Inventory unit not found' });
      return;
    }

    const item = invRes.rows[0];
    const isOwner = Number(item.owner_id) === Number(req.user!.userId);
    const isStaff = req.user!.roles.some((r) => ['ADMIN', 'MODERATOR'].includes(r));

    if (!isOwner && !isStaff) {
      res.status(403).json({ error: 'Unauthorized to log maintenance on this item' });
      return;
    }

    const record = await withTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO maintenance_records (
          inventory_id, reported_by, maintenance_type, description, cost, started_at, notes
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
        RETURNING *`,
        [inventory_id, req.user!.userId, maintenance_type, description || null, cost, notes || null]
      );

      // Block rental by updating inventory status to MAINTENANCE
      await client.query(
        "UPDATE inventory SET status = 'MAINTENANCE', updated_at = NOW() WHERE inventory_id = $1",
        [inventory_id]
      );

      await logAudit(client, req.user!.userId, 'INSERT', 'maintenance_records', result.rows[0].maintenance_id, null, {
        inventory_id,
        maintenance_type,
      });

      return result.rows[0];
    });

    res.status(201).json({ record });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/maintenance/:id/complete
router.put('/:id/complete', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const checkRes = await query(
      `SELECT m.*, i.owner_id 
       FROM maintenance_records m 
       JOIN inventory i ON m.inventory_id = i.inventory_id 
       WHERE m.maintenance_id = $1`,
      [req.params.id]
    );

    if (checkRes.rows.length === 0) {
      res.status(404).json({ error: 'Maintenance record not found' });
      return;
    }

    const rec = checkRes.rows[0];
    const isOwner = Number(rec.owner_id) === Number(req.user!.userId);
    const isStaff = req.user!.roles.some((r) => ['ADMIN', 'MODERATOR'].includes(r));

    if (!isOwner && !isStaff) {
      res.status(403).json({ error: 'Unauthorized to complete maintenance for this item' });
      return;
    }

    const result = await withTransaction(async (client) => {
      const updRec = await client.query(
        `UPDATE maintenance_records 
         SET completed_at = NOW(), notes = COALESCE($1, notes)
         WHERE maintenance_id = $2 
         RETURNING *`,
        [req.body.notes || null, req.params.id]
      );

      // Return inventory status back to AVAILABLE
      await client.query(
        "UPDATE inventory SET status = 'AVAILABLE', updated_at = NOW() WHERE inventory_id = $1",
        [rec.inventory_id]
      );

      return updRec.rows[0];
    });

    res.json({ record: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/maintenance/inventory/:id
router.get('/inventory/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT m.*, u.full_name AS reported_by_name
       FROM maintenance_records m
       JOIN users u ON m.reported_by = u.user_id
       WHERE m.inventory_id = $1
       ORDER BY m.started_at DESC`,
      [req.params.id]
    );

    res.json({ records: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
