import { Router, Response } from 'express';
import { query } from '../config/db.js';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/escrow/my
// Returns user's escrows (as borrower or owner)
router.get('/my', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT 
        e.*,
        r.listing_id,
        l.listing_title,
        i.inventory_code,
        c.component_name,
        u_borrower.full_name AS borrower_name,
        u_owner.full_name AS owner_name
       FROM escrows e
       JOIN rentals r ON e.rental_id = r.rental_id
       JOIN listings l ON r.listing_id = l.listing_id
       JOIN inventory i ON r.inventory_id = i.inventory_id
       JOIN component_catalog c ON i.component_id = c.component_id
       JOIN users u_borrower ON e.borrower_id = u_borrower.user_id
       JOIN users u_owner ON e.owner_id = u_owner.user_id
       WHERE e.borrower_id = $1 OR e.owner_id = $1
       ORDER BY e.created_at DESC`,
      [req.user!.userId]
    );

    res.json({ escrows: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/escrow/:id
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const escrowRes = await query(
      `SELECT 
        e.*,
        r.listing_id,
        l.listing_title,
        i.inventory_code,
        c.component_name,
        u_borrower.full_name AS borrower_name,
        u_owner.full_name AS owner_name
       FROM escrows e
       JOIN rentals r ON e.rental_id = r.rental_id
       JOIN listings l ON r.listing_id = l.listing_id
       JOIN inventory i ON r.inventory_id = i.inventory_id
       JOIN component_catalog c ON i.component_id = c.component_id
       JOIN users u_borrower ON e.borrower_id = u_borrower.user_id
       JOIN users u_owner ON e.owner_id = u_owner.user_id
       WHERE e.escrow_id = $1`,
      [req.params.id]
    );

    if (escrowRes.rows.length === 0) {
      res.status(404).json({ error: 'Escrow record not found' });
      return;
    }

    const escrow = escrowRes.rows[0];
    const isParticipant =
      escrow.borrower_id === req.user!.userId || escrow.owner_id === req.user!.userId;
    const isStaff = req.user!.roles.some((r) => ['ADMIN', 'MODERATOR'].includes(r));

    if (!isParticipant && !isStaff) {
      res.status(403).json({ error: 'Unauthorized to view this escrow' });
      return;
    }

    const txRes = await query(
      `SELECT et.*, u.full_name AS performed_by_name
       FROM escrow_transactions et
       JOIN users u ON et.performed_by = u.user_id
       WHERE et.escrow_id = $1
       ORDER BY et.created_at DESC`,
      [escrow.escrow_id]
    );

    res.json({ escrow: { ...escrow, transactions: txRes.rows } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
