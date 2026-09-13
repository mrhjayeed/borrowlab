import { Router, Response } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../config/db.js';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { realtime } from '../services/realtime.js';

const router = Router();

const requestRentalSchema = z.object({
  listing_id: z.coerce.number().int().positive(),
  start_date: z.string(),
  due_date: z.string(),
  borrower_condition_notes: z.string().optional(),
});

const returnConfirmationSchema = z.object({
  condition_after_return: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']),
  damage_found: z.boolean().default(false),
  missing_accessories: z.boolean().default(false),
  return_notes: z.string().optional(),
  damage_type: z.enum(['MINOR_DAMAGE', 'MAJOR_DAMAGE', 'MISSING_ACCESSORY', 'LOST', 'NON_FUNCTIONAL', 'BURNED', 'PHYSICAL_DAMAGE', 'OTHER']).optional(),
  damage_description: z.string().optional(),
  estimated_cost: z.number().nonnegative().optional(),
});

// GET /api/rentals/my
router.get('/my', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role } = req.query; // 'borrower' | 'owner' | undefined

    let sql = `
      SELECT 
        r.rental_id,
        r.listing_id,
        l.listing_title,
        i.inventory_id,
        i.inventory_code,
        c.component_name,
        c.manufacturer,
        c.model,
        r.owner_id,
        u_owner.full_name AS owner_name,
        r.borrower_id,
        u_borrower.full_name AS borrower_name,
        r.start_date,
        r.due_date,
        r.returned_at,
        r.weekly_rent,
        r.rental_fee,
        r.security_deposit,
        r.late_penalty,
        r.status,
        r.requested_at,
        r.approved_at,
        e.escrow_id,
        e.status AS escrow_status,
        e.held_amount AS escrow_held_amount,
        ret.return_id,
        ret.condition_after_return,
        ret.damage_found,
        (
          SELECT json_build_object(
            'review_id', my_rev.review_id,
            'rating', my_rev.rating,
            'comment', my_rev.comment,
            'created_at', my_rev.created_at
          )
          FROM reviews my_rev
          WHERE my_rev.rental_id = r.rental_id AND my_rev.reviewer_id = $1
          LIMIT 1
        ) AS my_review,
        (
          SELECT json_build_object(
            'review_id', peer_rev.review_id,
            'rating', peer_rev.rating,
            'comment', peer_rev.comment,
            'reviewer_name', u_rev.full_name,
            'created_at', peer_rev.created_at
          )
          FROM reviews peer_rev
          JOIN users u_rev ON peer_rev.reviewer_id = u_rev.user_id
          WHERE peer_rev.rental_id = r.rental_id AND peer_rev.reviewer_id != $1
          LIMIT 1
        ) AS peer_review
      FROM rentals r
      JOIN listings l ON r.listing_id = l.listing_id
      JOIN inventory i ON r.inventory_id = i.inventory_id
      JOIN component_catalog c ON i.component_id = c.component_id
      JOIN users u_owner ON r.owner_id = u_owner.user_id
      JOIN users u_borrower ON r.borrower_id = u_borrower.user_id
      LEFT JOIN escrows e ON r.rental_id = e.rental_id
      LEFT JOIN returns ret ON r.rental_id = ret.rental_id
      WHERE 1=1
    `;
    const params: any[] = [req.user!.userId];

    if (role === 'borrower') {
      sql += ` AND r.borrower_id = $1`;
    } else if (role === 'owner') {
      sql += ` AND r.owner_id = $1`;
    } else {
      sql += ` AND (r.borrower_id = $1 OR r.owner_id = $1)`;
    }

    sql += ` ORDER BY r.created_at DESC`;

    const result = await query(sql, params);
    res.json({ rentals: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rentals/:id
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rentalRes = await query(
      `SELECT 
        r.*,
        l.listing_title,
        l.pickup_information,
        i.inventory_code,
        i.serial_number,
        i.condition AS initial_condition,
        i.replacement_value,
        c.component_id,
        c.component_name,
        c.manufacturer,
        c.model,
        c.specifications,
        u_owner.full_name AS owner_name,
        u_owner.university_email AS owner_email,
        u_owner.phone AS owner_phone,
        u_owner.trust_score AS owner_trust_score,
        u_borrower.full_name AS borrower_name,
        u_borrower.university_email AS borrower_email,
        u_borrower.phone AS borrower_phone,
        u_borrower.trust_score AS borrower_trust_score,
        e.escrow_id,
        e.held_amount AS escrow_held_amount,
        e.status AS escrow_status,
        ret.return_id,
        ret.condition_after_return,
        ret.damage_found,
        ret.return_notes,
        ret.returned_at AS return_confirmed_at
       FROM rentals r
       JOIN listings l ON r.listing_id = l.listing_id
       JOIN inventory i ON r.inventory_id = i.inventory_id
       JOIN component_catalog c ON i.component_id = c.component_id
       JOIN users u_owner ON r.owner_id = u_owner.user_id
       JOIN users u_borrower ON r.borrower_id = u_borrower.user_id
       LEFT JOIN escrows e ON r.rental_id = e.rental_id
       LEFT JOIN returns ret ON r.rental_id = ret.rental_id
       WHERE r.rental_id = $1`,
      [req.params.id]
    );

    if (rentalRes.rows.length === 0) {
      res.status(404).json({ error: 'Rental not found' });
      return;
    }

    const rental = rentalRes.rows[0];

    // Verify participant or moderator/admin
    const isParticipant =
      Number(rental.owner_id) === Number(req.user!.userId) || Number(rental.borrower_id) === Number(req.user!.userId);
    const isStaff = req.user!.roles.some((r) => ['ADMIN', 'MODERATOR'].includes(r));

    if (!isParticipant && !isStaff) {
      res.status(403).json({ error: 'Unauthorized to view this rental record' });
      return;
    }

    // Status history
    const historyRes = await query(
      `SELECT h.*, u.full_name AS changed_by_name
       FROM rental_status_history h
       JOIN users u ON h.changed_by = u.user_id
       WHERE h.rental_id = $1
       ORDER BY h.changed_at ASC`,
      [rental.rental_id]
    );

    // Damage reports (if any)
    const damageRes = await query(
      `SELECT d.*, u.full_name AS reported_by_name,
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
       JOIN users u ON d.reported_by = u.user_id
       LEFT JOIN damage_evidence de ON d.damage_report_id = de.damage_report_id
       WHERE d.rental_id = $1
       GROUP BY d.damage_report_id, u.full_name`,
      [rental.rental_id]
    );

    // Dispute (if any)
    const disputeRes = await query(
      `SELECT d.*, u_open.full_name AS opened_by_name
       FROM disputes d
       JOIN users u_open ON d.opened_by = u_open.user_id
       WHERE d.rental_id = $1`,
      [rental.rental_id]
    );

    // Reviews (if any)
    const reviewsRes = await query(
      `SELECT rev.*, u.full_name AS reviewer_name
       FROM reviews rev
       JOIN users u ON rev.reviewer_id = u.user_id
       WHERE rev.rental_id = $1`,
      [rental.rental_id]
    );

    const myReview = reviewsRes.rows.find((rev) => Number(rev.reviewer_id) === Number(req.user!.userId)) || null;
    const peerReview = reviewsRes.rows.find((rev) => Number(rev.reviewer_id) !== Number(req.user!.userId)) || null;

    // Direct peer messages (handover & coordination)
    const messagesRes = await query(
      `SELECT m.*, u.full_name AS sender_name,
        COALESCE(
          (SELECT json_agg(r.role_name) FROM user_roles ur JOIN roles r ON ur.role_id = r.role_id WHERE ur.user_id = m.sender_id),
          '[]'
        ) AS sender_roles
       FROM rental_messages m
       JOIN users u ON m.sender_id = u.user_id
       WHERE m.rental_id = $1
       ORDER BY m.created_at ASC`,
      [rental.rental_id]
    );

    res.json({
      rental: {
        ...rental,
        history: historyRes.rows,
        damageReports: damageRes.rows,
        disputes: disputeRes.rows,
        reviews: reviewsRes.rows,
        my_review: myReview,
        peer_review: peerReview,
        messages: messagesRes.rows,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rentals/:id/messages
router.get('/:id/messages', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rentalRes = await query(
      'SELECT rental_id, borrower_id, owner_id FROM rentals WHERE rental_id = $1',
      [req.params.id]
    );

    if (rentalRes.rows.length === 0) {
      res.status(404).json({ error: 'Rental not found' });
      return;
    }

    const rental = rentalRes.rows[0];
    const isParticipant =
      Number(rental.owner_id) === Number(req.user!.userId) ||
      Number(rental.borrower_id) === Number(req.user!.userId);
    const isStaff = req.user!.roles.some((r) => ['ADMIN', 'MODERATOR'].includes(r));

    if (!isParticipant && !isStaff) {
      res.status(403).json({ error: 'Unauthorized to view messages for this rental' });
      return;
    }

    const messagesRes = await query(
      `SELECT m.*, u.full_name AS sender_name,
        COALESCE(
          (SELECT json_agg(r.role_name) FROM user_roles ur JOIN roles r ON ur.role_id = r.role_id WHERE ur.user_id = m.sender_id),
          '[]'
        ) AS sender_roles
       FROM rental_messages m
       JOIN users u ON m.sender_id = u.user_id
       WHERE m.rental_id = $1
       ORDER BY m.created_at ASC`,
      [rental.rental_id]
    );

    res.json({ messages: messagesRes.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rentals/:id/messages
router.post('/:id/messages', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    message: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message cannot exceed 2000 characters'),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  try {
    const rentalRes = await query(
      `SELECT r.*, c.component_name
       FROM rentals r
       JOIN inventory i ON r.inventory_id = i.inventory_id
       JOIN component_catalog c ON i.component_id = c.component_id
       WHERE r.rental_id = $1`,
      [req.params.id]
    );

    if (rentalRes.rows.length === 0) {
      res.status(404).json({ error: 'Rental not found' });
      return;
    }

    const rental = rentalRes.rows[0];
    const isBorrower = Number(rental.borrower_id) === Number(req.user!.userId);
    const isOwner = Number(rental.owner_id) === Number(req.user!.userId);
    const isStaff = req.user!.roles.some((r) => ['ADMIN', 'MODERATOR'].includes(r));

    if (!isBorrower && !isOwner && !isStaff) {
      res.status(403).json({ error: 'Unauthorized to post messages on this rental' });
      return;
    }

    const msgRes = await query(
      `INSERT INTO rental_messages (rental_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [rental.rental_id, req.user!.userId, parsed.data.message]
    );

    const messagePayload = {
      message_id: msgRes.rows[0].message_id,
      rental_id: rental.rental_id,
      sender_id: req.user!.userId,
      sender_name: req.user!.fullName,
      sender_roles: req.user!.roles || [],
      message: parsed.data.message,
      created_at: msgRes.rows[0].created_at,
    };

    // Real-time broadcast to both borrower and lender
    realtime.sendToUsers([rental.borrower_id, rental.owner_id], 'RENTAL_MESSAGE', messagePayload);
    realtime.broadcast('RENTAL_MESSAGE', messagePayload);

    // Send notification to counterpart
    const recipientId = isBorrower ? rental.owner_id : rental.borrower_id;
    try {
      await query(
        `INSERT INTO notifications (user_id, notification_type, title, message, related_rental_id)
         VALUES ($1, 'SYSTEM', 'New Rental Message', $2, $3)`,
        [
          recipientId,
          `${req.user!.fullName} sent a message regarding Rental #${rental.rental_id} (${rental.component_name})`,
          rental.rental_id,
        ]
      );

      realtime.sendToUser(recipientId, 'NOTIFICATION', {
        title: 'New Rental Message',
        message: `${req.user!.fullName}: ${parsed.data.message.slice(0, 80)}`,
        related_rental_id: rental.rental_id,
      });
    } catch (notifErr) {
      console.error('Failed to dispatch notification for rental message:', notifErr);
    }

    res.status(201).json({ message: messagePayload });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rentals/request
// Step 1: Borrower initiates rental request
router.post('/request', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = requestRentalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  const { listing_id, start_date, due_date, borrower_condition_notes } = parsed.data;

  try {
    const listingRes = await query(
      `SELECT l.*, i.replacement_value, i.status AS inv_status 
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

    // Business rule: user cannot rent their own hardware
    if (Number(listing.owner_id) === Number(req.user!.userId)) {
      res.status(400).json({ error: 'You cannot rent your own hardware' });
      return;
    }

    // Business rule: hardware must be available and listing active
    if (listing.status !== 'ACTIVE' || listing.inv_status !== 'AVAILABLE') {
      res.status(400).json({ error: 'Hardware is not currently available for rental' });
      return;
    }

    // Duration calculation in days
    const start = new Date(start_date);
    const due = new Date(due_date);
    const diffTime = due.getTime() - start.getTime();
    const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (durationDays < listing.minimum_duration_days) {
      res.status(400).json({
        error: `Rental duration must be at least ${listing.minimum_duration_days} days`,
      });
      return;
    }

    if (durationDays > listing.maximum_duration_days) {
      res.status(400).json({
        error: `Rental duration cannot exceed ${listing.maximum_duration_days} days`,
      });
      return;
    }

    // Calculate rental fee (based on weekly rent: (weekly_rent / 7) * durationDays)
    const dailyRate = parseFloat(listing.weekly_rent) / 7.0;
    const rental_fee = Math.round(dailyRate * durationDays * 100) / 100;

    // Security deposit: 15% of replacement value, minimum 1000 BDT
    const security_deposit = Math.max(1000.0, Math.round(parseFloat(listing.replacement_value) * 0.15));

    const rental = await withTransaction(async (client) => {
      const insRental = await client.query(
        `INSERT INTO rentals (
          listing_id, inventory_id, owner_id, borrower_id, start_date, due_date,
          weekly_rent, rental_fee, security_deposit, status, borrower_condition_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'REQUESTED', $10)
        RETURNING *`,
        [
          listing.listing_id,
          listing.inventory_id,
          listing.owner_id,
          req.user!.userId,
          start_date,
          due_date,
          listing.weekly_rent,
          rental_fee,
          security_deposit,
          borrower_condition_notes || null,
        ]
      );

      const newRental = insRental.rows[0];

      await client.query(
        `INSERT INTO rental_status_history (rental_id, old_status, new_status, changed_by, reason)
         VALUES ($1, NULL, 'REQUESTED', $2, 'Borrower submitted rental request')`,
        [newRental.rental_id, req.user!.userId]
      );

      // Notify owner
      await client.query(
        `INSERT INTO notifications (user_id, notification_type, title, message, related_rental_id)
         VALUES ($1, 'RENTAL_REQUEST', 'New Rental Request Received', $2, $3)`,
        [
          listing.owner_id,
          `${req.user!.fullName} requested to borrow '${listing.listing_title}' for ${durationDays} days.`,
          newRental.rental_id,
        ]
      );

      return newRental;
    });

    realtime.sendToUsers([listing.owner_id, req.user!.userId], 'RENTAL_UPDATED', {
      rental_id: rental.rental_id,
      status: rental.status,
      listing_id: rental.listing_id,
    });
    realtime.sendToUser(listing.owner_id, 'NOTIFICATION', {
      title: 'New Rental Request Received',
      message: `${req.user!.fullName} requested to borrow '${listing.listing_title}'`,
      related_rental_id: rental.rental_id,
    });
    realtime.broadcast('LISTING_UPDATED', { listing_id: rental.listing_id });

    res.status(201).json({ rental });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rentals/:id/approve
// Step 2: Owner approves rental request
router.post('/:id/approve', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rentalRes = await query('SELECT * FROM rentals WHERE rental_id = $1', [req.params.id]);
    if (rentalRes.rows.length === 0) {
      res.status(404).json({ error: 'Rental not found' });
      return;
    }

    const rental = rentalRes.rows[0];
    if (Number(rental.owner_id) !== Number(req.user!.userId) && !req.user!.roles.includes('ADMIN')) {
      res.status(403).json({ error: 'Only the owner can approve this rental request' });
      return;
    }

    if (rental.status !== 'REQUESTED') {
      res.status(400).json({ error: `Cannot approve rental in status ${rental.status}` });
      return;
    }

    const updated = await withTransaction(async (client) => {
      const result = await client.query(
        `UPDATE rentals SET status = 'APPROVED', approved_at = NOW(), updated_at = NOW()
         WHERE rental_id = $1 RETURNING *`,
        [rental.rental_id]
      );

      await client.query(
        `INSERT INTO rental_status_history (rental_id, old_status, new_status, changed_by, reason)
         VALUES ($1, 'REQUESTED', 'APPROVED', $2, 'Owner approved request')`,
        [rental.rental_id, req.user!.userId]
      );

      await client.query(
        `INSERT INTO notifications (user_id, notification_type, title, message, related_rental_id)
         VALUES ($1, 'RENTAL_APPROVED', 'Rental Request Approved', 'Your rental request was approved. Complete payment to activate.', $2)`,
        [rental.borrower_id, rental.rental_id]
      );

      return result.rows[0];
    });

    realtime.sendToUsers([rental.borrower_id, rental.owner_id], 'RENTAL_UPDATED', {
      rental_id: updated.rental_id,
      status: updated.status,
      listing_id: updated.listing_id,
    });
    realtime.sendToUser(rental.borrower_id, 'NOTIFICATION', {
      title: 'Rental Request Approved',
      message: 'Your rental request was approved. Complete payment to activate.',
      related_rental_id: updated.rental_id,
    });

    res.json({ rental: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rentals/:id/reject
router.post('/:id/reject', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rentalRes = await query('SELECT * FROM rentals WHERE rental_id = $1', [req.params.id]);
    if (rentalRes.rows.length === 0) {
      res.status(404).json({ error: 'Rental not found' });
      return;
    }

    const rental = rentalRes.rows[0];
    if (Number(rental.owner_id) !== Number(req.user!.userId) && !req.user!.roles.includes('ADMIN')) {
      res.status(403).json({ error: 'Only the owner can reject this rental request' });
      return;
    }

    if (rental.status !== 'REQUESTED') {
      res.status(400).json({ error: `Cannot reject rental in status ${rental.status}` });
      return;
    }

    const updated = await withTransaction(async (client) => {
      const result = await client.query(
        `UPDATE rentals SET status = 'CANCELLED', updated_at = NOW() WHERE rental_id = $1 RETURNING *`,
        [rental.rental_id]
      );

      await client.query(
        `INSERT INTO rental_status_history (rental_id, old_status, new_status, changed_by, reason)
        VALUES ($1, 'REQUESTED', 'CANCELLED', $2, 'Owner rejected request')`,
        [rental.rental_id, req.user!.userId]
      );

      await client.query(
        `INSERT INTO notifications (user_id, notification_type, title, message, related_rental_id)
        VALUES ($1, 'RENTAL_REJECTED', 'Rental Request Rejected', 'Your rental request was declined by the owner.', $2)`,
        [rental.borrower_id, rental.rental_id]
      );

      return result.rows[0];
    });

    realtime.sendToUsers([rental.borrower_id, rental.owner_id], 'RENTAL_UPDATED', {
      rental_id: updated.rental_id,
      status: updated.status,
      listing_id: updated.listing_id,
    });
    realtime.sendToUser(rental.borrower_id, 'NOTIFICATION', {
      title: 'Rental Request Rejected',
      message: 'Your rental request was declined by the owner.',
      related_rental_id: updated.rental_id,
    });
    realtime.broadcast('LISTING_UPDATED', { listing_id: updated.listing_id });

    res.json({ rental: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rentals/:id/activate
// Step 3: CRITICAL ACID TRANSACTION & CONCURRENCY CONTROL
// Uses SELECT ... FOR UPDATE on inventory row and borrower wallet.
// Ensures double-booking is impossible even with simultaneous concurrent requests.
router.post('/:id/activate', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rentalId = req.params.id;

    const activatedRental = await withTransaction(async (client) => {
      // 1. Fetch and verify rental
      const rRes = await client.query('SELECT * FROM rentals WHERE rental_id = $1', [rentalId]);
      if (rRes.rows.length === 0) {
        throw new Error('Rental not found');
      }

      const rental = rRes.rows[0];

      // Authorization: borrower or admin
      if (Number(rental.borrower_id) !== Number(req.user!.userId) && !req.user!.roles.includes('ADMIN')) {
        throw new Error('Only the borrower can activate this rental');
      }

      if (rental.status !== 'APPROVED') {
        throw new Error(`Cannot activate rental with status ${rental.status}. Must be APPROVED.`);
      }

      // 2. ROW-LEVEL LOCK ON PHYSICAL INVENTORY
      // This is the core concurrency lock. If another transaction holds this row,
      // subsequent transactions wait and then inspect the updated status.
      const invRes = await client.query(
        'SELECT * FROM inventory WHERE inventory_id = $1 FOR UPDATE',
        [rental.inventory_id]
      );

      if (invRes.rows.length === 0) {
        throw new Error('Inventory unit not found');
      }

      const inv = invRes.rows[0];
      if (inv.status !== 'AVAILABLE') {
        throw new Error(`Inventory item is no longer available (current status: ${inv.status})`);
      }

      // 3. ROW-LEVEL LOCK ON BORROWER WALLET
      const totalRequired = parseFloat(rental.rental_fee) + parseFloat(rental.security_deposit);
      const walletRes = await client.query(
        'SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE',
        [rental.borrower_id]
      );

      if (walletRes.rows.length === 0) {
        throw new Error('Borrower wallet not found');
      }

      const wallet = walletRes.rows[0];
      const currentBalance = parseFloat(wallet.balance);

      if (currentBalance < totalRequired) {
        throw new Error(
          `Insufficient balance. Required: ${totalRequired.toFixed(2)} BDT, Available: ${currentBalance.toFixed(2)} BDT`
        );
      }

      // 4. Deduct total amount from borrower's wallet
      await client.query(
        'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE wallet_id = $2',
        [totalRequired, wallet.wallet_id]
      );

      // 5. Create or lock Escrow record
      const escrowRes = await client.query(
        `INSERT INTO escrows (
          rental_id, borrower_id, owner_id, original_amount, held_amount, status, locked_at
        ) VALUES ($1, $2, $3, $4, $5, 'HELD', NOW())
        ON CONFLICT (rental_id) DO UPDATE SET
          held_amount = EXCLUDED.held_amount,
          status = 'HELD',
          locked_at = NOW(),
          updated_at = NOW()
        RETURNING *`,
        [
          rental.rental_id,
          rental.borrower_id,
          rental.owner_id,
          rental.security_deposit,
          rental.security_deposit,
        ]
      );

      const escrow = escrowRes.rows[0];

      // 6. Record immutable financial ledger entries (wallet_transactions)
      const refRentalPay = `TX-RENT-${rental.rental_id}-${Date.now()}`;
      const refEscrowLock = `TX-ESC-${escrow.escrow_id}-${Date.now()}`;

      // Rental fee deduction ledger
      await client.query(
        `INSERT INTO wallet_transactions (
          wallet_id, rental_id, escrow_id, transaction_type, amount, status, reference_code, description, completed_at
        ) VALUES ($1, $2, NULL, 'RENTAL_PAYMENT', $3, 'COMPLETED', $4, $5, NOW())`,
        [
          wallet.wallet_id,
          rental.rental_id,
          rental.rental_fee,
          refRentalPay,
          `Rental fee for hardware (Rental #${rental.rental_id})`,
        ]
      );

      // Escrow deposit lock ledger
      await client.query(
        `INSERT INTO wallet_transactions (
          wallet_id, rental_id, escrow_id, transaction_type, amount, status, reference_code, description, completed_at
        ) VALUES ($1, $2, $3, 'ESCROW_LOCK', $4, 'COMPLETED', $5, $6, NOW())`,
        [
          wallet.wallet_id,
          rental.rental_id,
          escrow.escrow_id,
          rental.security_deposit,
          refEscrowLock,
          `Security deposit locked into escrow for Rental #${rental.rental_id}`,
        ]
      );

      // Escrow movement ledger
      await client.query(
        `INSERT INTO escrow_transactions (
          escrow_id, transaction_type, amount, performed_by, reference_code, description
        ) VALUES ($1, 'ESCROW_LOCK', $2, $3, $4, $5)`,
        [
          escrow.escrow_id,
          rental.security_deposit,
          req.user!.userId,
          `ETX-LOCK-${escrow.escrow_id}-${Date.now()}`,
          `Security deposit locked upon rental activation`,
        ]
      );

      // 7. Update Rental and Inventory status
      const updatedRentalRes = await client.query(
        `UPDATE rentals SET status = 'ACTIVE', updated_at = NOW() WHERE rental_id = $1 RETURNING *`,
        [rental.rental_id]
      );

      await client.query(
        `UPDATE inventory SET status = 'RENTED', updated_at = NOW() WHERE inventory_id = $1`,
        [rental.inventory_id]
      );

      // 8. Record status history
      await client.query(
        `INSERT INTO rental_status_history (rental_id, old_status, new_status, changed_by, reason)
         VALUES ($1, 'APPROVED', 'ACTIVE', $2, 'Deposit locked and rental activated')`,
        [rental.rental_id, req.user!.userId]
      );

      // 9. Send notifications
      await client.query(
        `INSERT INTO notifications (user_id, notification_type, title, message, related_rental_id)
         VALUES 
         ($1, 'RENTAL_START', 'Rental Activated', 'Your rental is now active. Enjoy using the hardware!', $3),
         ($2, 'RENTAL_START', 'Hardware Handover Active', 'Rental fee and deposit have been secured in escrow.', $3)`,
        [rental.borrower_id, rental.owner_id, rental.rental_id]
      );

      await logAudit(client, req.user!.userId, 'STATUS_CHANGE', 'rentals', rental.rental_id, { status: 'APPROVED' }, { status: 'ACTIVE' });

      return updatedRentalRes.rows[0];
    });

    realtime.sendToUsers([activatedRental.borrower_id, activatedRental.owner_id], 'RENTAL_UPDATED', {
      rental_id: activatedRental.rental_id,
      status: activatedRental.status,
      listing_id: activatedRental.listing_id,
    });
    realtime.sendToUser(activatedRental.borrower_id, 'WALLET_UPDATED', {
      user_id: activatedRental.borrower_id,
      rental_id: activatedRental.rental_id,
    });
    realtime.sendToUser(activatedRental.borrower_id, 'NOTIFICATION', {
      title: 'Rental Activated',
      message: 'Your rental is now active. Enjoy using the hardware!',
      related_rental_id: activatedRental.rental_id,
    });
    realtime.sendToUser(activatedRental.owner_id, 'NOTIFICATION', {
      title: 'Hardware Handover Active',
      message: 'Rental fee and deposit have been secured in escrow.',
      related_rental_id: activatedRental.rental_id,
    });
    realtime.broadcast('LISTING_UPDATED', { listing_id: activatedRental.listing_id });

    res.json({ message: 'Rental activated successfully', rental: activatedRental });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/rentals/:id/request-return
// Step 4: Borrower initiates return handover
router.post('/:id/request-return', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rentalRes = await query('SELECT * FROM rentals WHERE rental_id = $1', [req.params.id]);
    if (rentalRes.rows.length === 0) {
      res.status(404).json({ error: 'Rental not found' });
      return;
    }

    const rental = rentalRes.rows[0];
    if (Number(rental.borrower_id) !== Number(req.user!.userId) && !req.user!.roles.includes('ADMIN')) {
      res.status(403).json({ error: 'Only the borrower can request return' });
      return;
    }

    if (!['ACTIVE', 'OVERDUE'].includes(rental.status)) {
      res.status(400).json({ error: `Cannot return rental with status ${rental.status}` });
      return;
    }

    const updated = await withTransaction(async (client) => {
      const result = await client.query(
        `UPDATE rentals SET status = 'RETURN_PENDING', updated_at = NOW() WHERE rental_id = $1 RETURNING *`,
        [rental.rental_id]
      );

      await client.query(
        `INSERT INTO rental_status_history (rental_id, old_status, new_status, changed_by, reason)
         VALUES ($1, $2, 'RETURN_PENDING', $3, 'Borrower initiated return handover')`,
        [rental.rental_id, rental.status, req.user!.userId]
      );

      await client.query(
        `INSERT INTO notifications (user_id, notification_type, title, message, related_rental_id)
         VALUES ($1, 'RETURN_REQUEST', 'Hardware Return Pending Inspection', 'Borrower initiated return. Please inspect condition and confirm.', $2)`,
        [rental.owner_id, rental.rental_id]
      );

      return result.rows[0];
    });

    realtime.sendToUsers([rental.borrower_id, rental.owner_id], 'RENTAL_UPDATED', {
      rental_id: updated.rental_id,
      status: updated.status,
      listing_id: updated.listing_id,
    });
    realtime.sendToUser(rental.owner_id, 'NOTIFICATION', {
      title: 'Hardware Return Pending Inspection',
      message: 'Borrower initiated return. Please inspect condition and confirm.',
      related_rental_id: updated.rental_id,
    });

    res.json({ rental: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rentals/:id/confirm-return
// Step 5: Owner inspects hardware, records return, releases escrow or files damage
router.post('/:id/confirm-return', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = returnConfirmationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  const {
    condition_after_return,
    damage_found,
    missing_accessories,
    return_notes,
    damage_type,
    damage_description,
    estimated_cost,
  } = parsed.data;

  try {
    const rentalId = req.params.id;

    const result = await withTransaction(async (client) => {
      const rRes = await client.query('SELECT * FROM rentals WHERE rental_id = $1 FOR UPDATE', [rentalId]);
      if (rRes.rows.length === 0) {
        throw new Error('Rental not found');
      }

      const rental = rRes.rows[0];
      if (Number(rental.owner_id) !== Number(req.user!.userId) && !req.user!.roles.includes('ADMIN')) {
        throw new Error('Only the owner or an administrator can confirm return');
      }

      if (!['ACTIVE', 'RETURN_PENDING', 'OVERDUE'].includes(rental.status)) {
        throw new Error(`Cannot confirm return for rental with status ${rental.status}`);
      }

      // Check overdue penalty
      const dueDate = new Date(rental.due_date);
      const now = new Date();
      let latePenalty = 0;

      if (now > dueDate) {
        const diffMs = now.getTime() - dueDate.getTime();
        const daysOverdue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (daysOverdue > 0) {
          const dailyRate = parseFloat(rental.weekly_rent) / 7.0;
          // Policy: 15% of daily rate per day overdue, minimum 50 BDT/day
          latePenalty = Math.max(50.0 * daysOverdue, Math.round(dailyRate * 0.15 * daysOverdue * 100) / 100);
        }
      }

      // Record Returns row
      await client.query(
        `INSERT INTO returns (
          rental_id, received_by, returned_at, condition_after_return, damage_found,
          missing_accessories, return_notes, owner_confirmed, confirmed_at
        ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, true, NOW())
        ON CONFLICT (rental_id) DO UPDATE SET
          condition_after_return = EXCLUDED.condition_after_return,
          damage_found = EXCLUDED.damage_found,
          missing_accessories = EXCLUDED.missing_accessories,
          return_notes = EXCLUDED.return_notes,
          owner_confirmed = true,
          confirmed_at = NOW()`,
        [
          rental.rental_id,
          req.user!.userId,
          condition_after_return,
          damage_found,
          missing_accessories,
          return_notes || null,
        ]
      );

      // Fetch escrow
      const escrowRes = await client.query('SELECT * FROM escrows WHERE rental_id = $1 FOR UPDATE', [rental.rental_id]);
      if (escrowRes.rows.length === 0) {
        throw new Error('Escrow record not found for this rental');
      }
      const escrow = escrowRes.rows[0];

      if (damage_found) {
        // DAMAGE WORKFLOW:
        // Freeze escrow, flag rental as DISPUTED / RETURNED with damage
        await client.query(
          "UPDATE escrows SET status = 'FROZEN', updated_at = NOW() WHERE escrow_id = $1",
          [escrow.escrow_id]
        );

        // Record damage report
        const dmgRes = await client.query(
          `INSERT INTO damage_reports (
            rental_id, inventory_id, reported_by, damage_type, description, estimated_cost, status, reported_at
          ) VALUES ($1, $2, $3, $4, $5, $6, 'REPORTED', NOW())
          RETURNING *`,
          [
            rental.rental_id,
            rental.inventory_id,
            req.user!.userId,
            damage_type || 'PHYSICAL_DAMAGE',
            damage_description || return_notes || 'Damage noted during return inspection',
            estimated_cost || 500.0,
          ]
        );

        // Update rental status
        await client.query(
          `UPDATE rentals SET status = 'DISPUTED', late_penalty = $1, returned_at = NOW(), updated_at = NOW() WHERE rental_id = $2`,
          [latePenalty, rental.rental_id]
        );

        // Update inventory to DISPUTED or MAINTENANCE
        await client.query(
          `UPDATE inventory SET status = 'DISPUTED', condition = $1, updated_at = NOW() WHERE inventory_id = $2`,
          [condition_after_return, rental.inventory_id]
        );

        await client.query(
          `INSERT INTO rental_status_history (rental_id, old_status, new_status, changed_by, reason)
           VALUES ($1, $2, 'DISPUTED', $3, 'Damage found upon return inspection')`,
          [rental.rental_id, rental.status, req.user!.userId]
        );

        // Check or create dispute
        let disputeId: number | null = null;
        const existingDisp = await client.query('SELECT dispute_id FROM disputes WHERE rental_id = $1', [rental.rental_id]);
        if (existingDisp.rows.length === 0) {
          const disputeReason = missing_accessories && !damage_type ? 'MISSING_ACCESSORY' : (damage_type === 'MISSING_ACCESSORY' ? 'MISSING_ACCESSORY' : 'DAMAGE');
          const dispDesc = damage_description || return_notes || 'Damage noted during return inspection';
          const dispRes = await client.query(
            `INSERT INTO disputes (
              rental_id, opened_by, against_user_id, reason, description, requested_amount, status, opened_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', NOW())
            RETURNING dispute_id`,
            [
              rental.rental_id,
              req.user!.userId,
              rental.borrower_id,
              disputeReason,
              dispDesc,
              estimated_cost || parseFloat(escrow.held_amount || '0'),
            ]
          );
          disputeId = dispRes.rows[0].dispute_id;

          await client.query(
            `INSERT INTO dispute_messages (dispute_id, sender_id, message)
             VALUES ($1, $2, $3)`,
            [
              disputeId,
              req.user!.userId,
              `Return inspection flagged damage: ${dispDesc}. Estimated repair cost: ${estimated_cost || 0} BDT. Escrow deposit frozen for arbitration.`,
            ]
          );

          await logAudit(client, req.user!.userId, 'DISPUTE_ACTION', 'disputes', disputeId, null, {
            rental_id: rental.rental_id,
            reason: disputeReason,
          });
        } else {
          disputeId = existingDisp.rows[0].dispute_id;
        }

        // Notifications
        await client.query(
          `INSERT INTO notifications (user_id, notification_type, title, message, related_rental_id, related_dispute_id)
           VALUES 
           ($1, 'DAMAGE_REPORTED', 'Damage Reported on Return', 'The owner noted damage on returned hardware. Escrow deposit frozen.', $3, $4),
           ($2, 'RETURN_CONFIRMED', 'Damage Report Submitted', 'Damage report logged. Escrow held pending review.', $3, $4)`,
          [rental.borrower_id, rental.owner_id, rental.rental_id, disputeId]
        );

        return {
          rentalId: rental.rental_id,
          status: 'DISPUTED',
          damageReportId: dmgRes.rows[0].damage_report_id,
          disputeId,
          borrowerId: rental.borrower_id,
          ownerId: rental.owner_id,
          listingId: rental.listing_id,
        };
      } else {
        // CLEAN RETURN WORKFLOW:
        // 1. Release rental fee to owner's wallet
        await client.query(
          'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2',
          [rental.rental_fee, rental.owner_id]
        );

        const ownerWallet = await client.query('SELECT wallet_id FROM wallets WHERE user_id = $1', [rental.owner_id]);
        await client.query(
          `INSERT INTO wallet_transactions (
            wallet_id, rental_id, escrow_id, transaction_type, amount, status, reference_code, description, completed_at
          ) VALUES ($1, $2, NULL, 'OWNER_EARNING', $3, 'COMPLETED', $4, $5, NOW())`,
          [
            ownerWallet.rows[0].wallet_id,
            rental.rental_id,
            rental.rental_fee,
            `TX-EARN-${rental.rental_id}-${Date.now()}`,
            `Rental fee payout for completed Rental #${rental.rental_id}`,
          ]
        );

        // 2. Handle deposit refund (minus late penalty if any)
        const heldDeposit = parseFloat(escrow.held_amount);
        const penaltyDeduction = Math.min(heldDeposit, latePenalty);
        const depositRefund = heldDeposit - penaltyDeduction;

        if (depositRefund > 0) {
          await client.query(
            'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2',
            [depositRefund, rental.borrower_id]
          );

          const borrowerWallet = await client.query('SELECT wallet_id FROM wallets WHERE user_id = $1', [rental.borrower_id]);
          await client.query(
            `INSERT INTO wallet_transactions (
              wallet_id, rental_id, escrow_id, transaction_type, amount, status, reference_code, description, completed_at
            ) VALUES ($1, $2, $3, 'ESCROW_RELEASE', $4, 'COMPLETED', $5, $6, NOW())`,
            [
              borrowerWallet.rows[0].wallet_id,
              rental.rental_id,
              escrow.escrow_id,
              depositRefund,
              `TX-ESC-REL-${escrow.escrow_id}-${Date.now()}`,
              `Security deposit released for Rental #${rental.rental_id}`,
            ]
          );
        }

        // 3. Update Escrow status to RELEASED
        await client.query(
          `UPDATE escrows SET 
            held_amount = 0,
            released_amount = $1,
            deducted_amount = $2,
            status = 'RELEASED',
            released_at = NOW(),
            updated_at = NOW()
           WHERE escrow_id = $3`,
          [depositRefund, penaltyDeduction, escrow.escrow_id]
        );

        await client.query(
          `INSERT INTO escrow_transactions (
            escrow_id, transaction_type, amount, performed_by, reference_code, description
          ) VALUES ($1, 'ESCROW_RELEASE', $2, $3, $4, $5)`,
          [
            escrow.escrow_id,
            depositRefund,
            req.user!.userId,
            `ETX-REL-${escrow.escrow_id}-${Date.now()}`,
            `Escrow released after successful return`,
          ]
        );

        // 4. Update Rental status to COMPLETED
        await client.query(
          `UPDATE rentals SET 
            status = 'COMPLETED',
            late_penalty = $1,
            returned_at = NOW(),
            updated_at = NOW()
           WHERE rental_id = $2`,
          [latePenalty, rental.rental_id]
        );

        // 5. Update Inventory status to AVAILABLE
        await client.query(
          `UPDATE inventory SET status = 'AVAILABLE', condition = $1, updated_at = NOW() WHERE inventory_id = $2`,
          [condition_after_return, rental.inventory_id]
        );

        await client.query(
          `INSERT INTO rental_status_history (rental_id, old_status, new_status, changed_by, reason)
           VALUES ($1, $2, 'COMPLETED', $3, 'Return confirmed without damage')`,
          [rental.rental_id, rental.status, req.user!.userId]
        );

        // 6. Update Trust Score (+2 for on-time, -10 if late)
        const trustDelta = latePenalty > 0 ? -10.0 : 2.0;
        await client.query(
          `UPDATE users SET trust_score = LEAST(100.0, GREATEST(0.0, trust_score + $1)), updated_at = NOW() WHERE user_id = $2`,
          [trustDelta, rental.borrower_id]
        );

        // 7. CHECK WAITLIST FOR THIS COMPONENT (Auto-fulfillment notification)
        const invCompRes = await client.query('SELECT component_id FROM inventory WHERE inventory_id = $1', [rental.inventory_id]);
        if (invCompRes.rows.length > 0) {
          const compId = invCompRes.rows[0].component_id;
          const waitlistRes = await client.query(
            `SELECT waitlist_id, borrower_id 
             FROM waitlist 
             WHERE component_id = $1 AND status = 'WAITING' 
             ORDER BY joined_at ASC 
             LIMIT 1`,
            [compId]
          );

          if (waitlistRes.rows.length > 0) {
            const nextWait = waitlistRes.rows[0];
            await client.query(
              `UPDATE waitlist SET status = 'NOTIFIED', notified_at = NOW() WHERE waitlist_id = $1`,
              [nextWait.waitlist_id]
            );

            await client.query(
              `INSERT INTO notifications (user_id, notification_type, title, message, related_waitlist_id)
               VALUES ($1, 'WAITLIST_AVAILABLE', 'Waitlisted Hardware Available!', 'A unit of your waitlisted hardware is now available. You have 24 hours to reserve.', $2)`,
              [nextWait.borrower_id, nextWait.waitlist_id]
            );
          }
        }

        // Notifications
        await client.query(
          `INSERT INTO notifications (user_id, notification_type, title, message, related_rental_id)
           VALUES 
           ($1, 'RETURN_CONFIRMED', 'Rental Completed', 'Hardware return confirmed. Your security deposit has been refunded.', $3),
           ($2, 'RETURN_CONFIRMED', 'Rental Completed & Payout Received', 'Return confirmed. Rental fee has been credited to your wallet.', $3)`,
          [rental.borrower_id, rental.owner_id, rental.rental_id]
        );

        return {
          rentalId: rental.rental_id,
          status: 'COMPLETED',
          borrowerId: rental.borrower_id,
          ownerId: rental.owner_id,
          listingId: rental.listing_id,
        };
      }
    });

    if (result.status === 'DISPUTED') {
      realtime.sendToUsers([result.borrowerId, result.ownerId], 'RENTAL_UPDATED', {
        rental_id: result.rentalId,
        status: 'DISPUTED',
      });
      realtime.sendToUsers([result.borrowerId, result.ownerId], 'DISPUTE_UPDATED', {
        dispute_id: (result as any).disputeId,
        rental_id: result.rentalId,
      });
      realtime.broadcast('DISPUTE_UPDATED', { dispute_id: (result as any).disputeId });
    } else {
      realtime.sendToUsers([result.borrowerId, result.ownerId], 'RENTAL_UPDATED', {
        rental_id: result.rentalId,
        status: 'COMPLETED',
      });
      realtime.sendToUsers([result.borrowerId, result.ownerId], 'WALLET_UPDATED', {
        rental_id: result.rentalId,
      });
      realtime.broadcast('LISTING_UPDATED', { listing_id: result.listingId });
    }

    res.json({ message: 'Return confirmed successfully', result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
