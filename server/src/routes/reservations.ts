import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();

const reservationSchema = z.object({
  listing_id: z.coerce.number().int().positive(),
  start_date: z.string(),
  end_date: z.string(),
});

// POST /api/reservations
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = reservationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  const { listing_id, start_date, end_date } = parsed.data;

  try {
    // 1. Fetch listing and check validity
    const listingRes = await query(
      `SELECT l.*, i.status AS inv_status 
       FROM listings l 
       JOIN inventory i ON l.inventory_id = i.inventory_id 
       WHERE l.listing_id = $1`,
      [listing_id]
    );

    if (listingRes.rows.length === 0) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    const listing = listingRes.rows[0];

    // Business rule: Cannot reserve own hardware
    if (Number(listing.owner_id) === Number(req.user!.userId)) {
      res.status(400).json({ error: 'You cannot reserve your own hardware' });
      return;
    }

    if (listing.status !== 'ACTIVE' || listing.inv_status !== 'AVAILABLE') {
      res.status(400).json({ error: 'Hardware is not currently available for reservation' });
      return;
    }

    // Check date overlaps
    const overlapRes = await query(
      `SELECT * FROM reservations 
       WHERE listing_id = $1 
         AND status = 'ACTIVE' 
         AND daterange(start_date, end_date, '[]') && daterange($2::date, $3::date, '[]')`,
      [listing_id, start_date, end_date]
    );

    if (overlapRes.rows.length > 0) {
      res.status(409).json({ error: 'Hardware is already reserved for the selected date range' });
      return;
    }

    // Set reservation expiry (e.g. 48 hours to confirm or convert to rental)
    const result = await query(
      `INSERT INTO reservations (
        listing_id, borrower_id, start_date, end_date, status, expires_at
      ) VALUES ($1, $2, $3, $4, 'ACTIVE', NOW() + INTERVAL '48 hours')
      RETURNING *`,
      [listing_id, req.user!.userId, start_date, end_date]
    );

    await logAudit(query, req.user!.userId, 'INSERT', 'reservations', result.rows[0].reservation_id, null, {
      listing_id,
      start_date,
      end_date,
    });

    res.status(201).json({ reservation: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reservations/my
router.get('/my', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT 
        r.reservation_id,
        r.listing_id,
        l.listing_title,
        c.component_name,
        r.start_date,
        r.end_date,
        r.status,
        r.expires_at,
        u.full_name AS owner_name
       FROM reservations r
       JOIN listings l ON r.listing_id = l.listing_id
       JOIN inventory i ON l.inventory_id = i.inventory_id
       JOIN component_catalog c ON i.component_id = c.component_id
       JOIN users u ON l.owner_id = u.user_id
       WHERE r.borrower_id = $1
       ORDER BY r.start_date ASC`,
      [req.user!.userId]
    );

    res.json({ reservations: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/reservations/:id
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const checkRes = await query('SELECT * FROM reservations WHERE reservation_id = $1', [req.params.id]);
    if (checkRes.rows.length === 0) {
      res.status(404).json({ error: 'Reservation not found' });
      return;
    }

    const resItem = checkRes.rows[0];
    if (Number(resItem.borrower_id) !== Number(req.user!.userId) && !req.user!.roles.includes('ADMIN')) {
      res.status(403).json({ error: 'Unauthorized to cancel this reservation' });
      return;
    }

    const result = await query(
      `UPDATE reservations SET status = 'CANCELLED' WHERE reservation_id = $1 RETURNING *`,
      [req.params.id]
    );

    res.json({ message: 'Reservation cancelled', reservation: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
