import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

const joinWaitlistSchema = z.object({
  component_id: z.coerce.number().int().positive(),
  requested_start_date: z.string().optional(),
  requested_duration_days: z.coerce.number().int().positive().optional(),
});

// POST /api/waitlist
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = joinWaitlistSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  const { component_id, requested_start_date, requested_duration_days } = parsed.data;

  try {
    // Check if user already has an active waitlist entry for this component
    const existing = await query(
      `SELECT waitlist_id FROM waitlist 
       WHERE component_id = $1 AND borrower_id = $2 AND status IN ('WAITING', 'NOTIFIED')`,
      [component_id, req.user!.userId]
    );

    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'You are already on the active waitlist for this hardware' });
      return;
    }

    const result = await query(
      `INSERT INTO waitlist (
        component_id, borrower_id, requested_start_date, requested_duration_days, status, joined_at
      ) VALUES ($1, $2, $3, $4, 'WAITING', NOW())
      RETURNING *`,
      [component_id, req.user!.userId, requested_start_date || null, requested_duration_days || 7]
    );

    res.status(201).json({ waitlist: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/waitlist/my
router.get('/my', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT 
        w.*,
        c.component_name,
        c.manufacturer,
        c.model,
        cat.name AS category_name,
        (SELECT COUNT(*) FROM waitlist WHERE component_id = w.component_id AND status = 'WAITING' AND joined_at <= w.joined_at) AS queue_position
       FROM waitlist w
       JOIN component_catalog c ON w.component_id = c.component_id
       JOIN component_categories cat ON c.category_id = cat.category_id
       WHERE w.borrower_id = $1
       ORDER BY w.joined_at DESC`,
      [req.user!.userId]
    );

    res.json({ waitlist: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/waitlist/:id
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const checkRes = await query('SELECT * FROM waitlist WHERE waitlist_id = $1', [req.params.id]);
    if (checkRes.rows.length === 0) {
      res.status(404).json({ error: 'Waitlist entry not found' });
      return;
    }

    if (Number(checkRes.rows[0].borrower_id) !== Number(req.user!.userId) && !req.user!.roles.includes('ADMIN')) {
      res.status(403).json({ error: 'Unauthorized to cancel this waitlist entry' });
      return;
    }

    const result = await query(
      "UPDATE waitlist SET status = 'CANCELLED', cancelled_at = NOW() WHERE waitlist_id = $1 RETURNING *",
      [req.params.id]
    );

    res.json({ message: 'Waitlist entry cancelled', waitlist: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
