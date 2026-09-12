import { Router, Response } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../config/db.js';
import { authenticateToken, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { realtime } from '../services/realtime.js';

const router = Router();

const createDisputeSchema = z.object({
  rental_id: z.coerce.number().int().positive(),
  reason: z.enum([
    'DAMAGE',
    'LOST_ITEM',
    'MISSING_ACCESSORY',
    'PRE_EXISTING_DAMAGE',
    'DEFECTIVE_ITEM',
    'INCORRECT_ITEM',
    'LATE_RETURN',
    'PAYMENT_ISSUE',
    'OTHER',
  ]),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  requested_amount: z.coerce.number().nonnegative().optional(),
});

const resolveDisputeSchema = z.object({
  status: z.enum(['RESOLVED_OWNER', 'RESOLVED_BORROWER', 'PARTIAL_SETTLEMENT', 'CLOSED', 'REJECTED']),
  settlement_amount_owner: z.coerce.number().nonnegative().default(0),
  resolution_notes: z.string().min(5),
});

// GET /api/disputes/queue (Moderator/Admin)
router.get('/queue', authenticateToken, requireRole(['ADMIN', 'MODERATOR']), async (_req, res) => {
  try {
    const result = await query(`
      SELECT 
        d.*,
        r.listing_id,
        l.listing_title,
        i.inventory_code,
        c.component_name,
        u_open.full_name AS opened_by_name,
        u_against.full_name AS against_user_name,
        e.held_amount AS escrow_held_amount,
        e.status AS escrow_status,
        (SELECT COUNT(*) FROM dispute_messages WHERE dispute_id = d.dispute_id) AS message_count
      FROM disputes d
      JOIN rentals r ON d.rental_id = r.rental_id
      JOIN listings l ON r.listing_id = l.listing_id
      JOIN inventory i ON r.inventory_id = i.inventory_id
      JOIN component_catalog c ON i.component_id = c.component_id
      JOIN users u_open ON d.opened_by = u_open.user_id
      JOIN users u_against ON d.against_user_id = u_against.user_id
      LEFT JOIN escrows e ON r.rental_id = e.rental_id
      ORDER BY d.opened_at DESC
    `);

    res.json({ disputes: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/disputes/my
router.get('/my', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT 
        d.*,
        r.listing_id,
        l.listing_title,
        i.inventory_code,
        c.component_name,
        u_open.full_name AS opened_by_name,
        u_against.full_name AS against_user_name,
        e.held_amount AS escrow_held_amount,
        (SELECT COUNT(*) FROM dispute_messages WHERE dispute_id = d.dispute_id) AS message_count
       FROM disputes d
       JOIN rentals r ON d.rental_id = r.rental_id
       JOIN listings l ON r.listing_id = l.listing_id
       JOIN inventory i ON r.inventory_id = i.inventory_id
       JOIN component_catalog c ON i.component_id = c.component_id
       JOIN users u_open ON d.opened_by = u_open.user_id
       JOIN users u_against ON d.against_user_id = u_against.user_id
       LEFT JOIN escrows e ON r.rental_id = e.rental_id
       WHERE d.opened_by = $1 OR d.against_user_id = $1
       ORDER BY d.opened_at DESC`,
      [req.user!.userId]
    );

    res.json({ disputes: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/disputes/:id
// Dispute detail with threaded conversation messages
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const disputeRes = await query(
      `SELECT 
        d.*,
        r.listing_id,
        l.listing_title,
        i.inventory_code,
        c.component_name,
        u_open.full_name AS opened_by_name,
        u_against.full_name AS against_user_name,
        u_res.full_name AS resolved_by_name,
        e.escrow_id,
        e.held_amount AS escrow_held_amount,
        e.status AS escrow_status,
        r.owner_id,
        r.borrower_id
       FROM disputes d
       JOIN rentals r ON d.rental_id = r.rental_id
       JOIN listings l ON r.listing_id = l.listing_id
       JOIN inventory i ON r.inventory_id = i.inventory_id
       JOIN component_catalog c ON i.component_id = c.component_id
       JOIN users u_open ON d.opened_by = u_open.user_id
       JOIN users u_against ON d.against_user_id = u_against.user_id
       LEFT JOIN users u_res ON d.resolved_by = u_res.user_id
       LEFT JOIN escrows e ON r.rental_id = e.rental_id
       WHERE d.dispute_id = $1`,
      [req.params.id]
    );

    if (disputeRes.rows.length === 0) {
      res.status(404).json({ error: 'Dispute not found' });
      return;
    }

    const dispute = disputeRes.rows[0];
    const isParticipant =
      Number(dispute.opened_by) === Number(req.user!.userId) ||
      Number(dispute.against_user_id) === Number(req.user!.userId);
    const isStaff = req.user!.roles.some((r) => ['ADMIN', 'MODERATOR'].includes(r));

    if (!isParticipant && !isStaff) {
      res.status(403).json({ error: 'Unauthorized to view this dispute' });
      return;
    }

    // Threaded messages
    const msgRes = await query(
      `SELECT 
        m.message_id,
        m.dispute_id,
        m.sender_id,
        u.full_name AS sender_name,
        COALESCE(array_agg(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '{}') AS sender_roles,
        m.message,
        m.created_at
       FROM dispute_messages m
       JOIN users u ON m.sender_id = u.user_id
       LEFT JOIN user_roles ur ON u.user_id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.role_id
       WHERE m.dispute_id = $1
       GROUP BY m.message_id, u.full_name
       ORDER BY m.created_at ASC`,
      [dispute.dispute_id]
    );

    res.json({ dispute: { ...dispute, messages: msgRes.rows } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/disputes
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createDisputeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  const { rental_id, reason, description, requested_amount } = parsed.data;

  try {
    const rentalRes = await query('SELECT * FROM rentals WHERE rental_id = $1', [rental_id]);
    if (rentalRes.rows.length === 0) {
      res.status(404).json({ error: 'Rental not found' });
      return;
    }

    const rental = rentalRes.rows[0];
    const isOwner = Number(rental.owner_id) === Number(req.user!.userId);
    const isBorrower = Number(rental.borrower_id) === Number(req.user!.userId);

    if (!isOwner && !isBorrower) {
      res.status(403).json({ error: 'Only borrower or owner can open a dispute' });
      return;
    }

    const againstUserId = isOwner ? rental.borrower_id : rental.owner_id;

    const dispute = await withTransaction(async (client) => {
      // 1. Insert dispute
      const dispRes = await client.query(
        `INSERT INTO disputes (
          rental_id, opened_by, against_user_id, reason, description, requested_amount, status, opened_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', NOW())
        RETURNING *`,
        [rental.rental_id, req.user!.userId, againstUserId, reason, description, requested_amount || 0]
      );

      const newDispute = dispRes.rows[0];

      // 2. Insert initial message
      await client.query(
        `INSERT INTO dispute_messages (dispute_id, sender_id, message)
         VALUES ($1, $2, $3)`,
        [newDispute.dispute_id, req.user!.userId, description]
      );

      // 3. Freeze escrow if active
      await client.query(
        "UPDATE escrows SET status = 'FROZEN', updated_at = NOW() WHERE rental_id = $1",
        [rental.rental_id]
      );

      // 4. Update rental status to DISPUTED
      await client.query(
        "UPDATE rentals SET status = 'DISPUTED', updated_at = NOW() WHERE rental_id = $1",
        [rental.rental_id]
      );

      await client.query(
        `INSERT INTO rental_status_history (rental_id, old_status, new_status, changed_by, reason)
         VALUES ($1, $2, 'DISPUTED', $3, $4)`,
        [rental.rental_id, rental.status, req.user!.userId, `Dispute opened: ${reason}`]
      );

      // 5. Notifications
      await client.query(
        `INSERT INTO notifications (user_id, notification_type, title, message, related_dispute_id)
         VALUES ($1, 'DISPUTE_OPENED', 'Dispute Opened', $2, $3)`,
        [
          againstUserId,
          `${req.user!.fullName} opened a dispute regarding Rental #${rental.rental_id} (${reason}).`,
          newDispute.dispute_id,
        ]
      );

      await logAudit(client, req.user!.userId, 'DISPUTE_ACTION', 'disputes', newDispute.dispute_id, null, {
        rental_id,
        reason,
      });

      return newDispute;
    });

    realtime.sendToUsers([rental.borrower_id, rental.owner_id], 'DISPUTE_UPDATED', dispute);
    realtime.sendToUsers([rental.borrower_id, rental.owner_id], 'RENTAL_UPDATED', {
      rental_id: rental.rental_id,
      status: 'DISPUTED',
    });
    realtime.sendToUser(againstUserId, 'NOTIFICATION', {
      title: 'Dispute Opened',
      message: `${req.user!.fullName} opened a dispute regarding Rental #${rental.rental_id}`,
      related_dispute_id: dispute.dispute_id,
    });
    realtime.broadcast('DISPUTE_UPDATED', dispute);

    res.status(201).json({ dispute });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/disputes/:id/messages
router.post('/:id/messages', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    message: z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Message cannot be empty' });
    return;
  }

  try {
    const disputeRes = await query('SELECT * FROM disputes WHERE dispute_id = $1', [req.params.id]);
    if (disputeRes.rows.length === 0) {
      res.status(404).json({ error: 'Dispute not found' });
      return;
    }

    const dispute = disputeRes.rows[0];
    const isParticipant =
      Number(dispute.opened_by) === Number(req.user!.userId) ||
      Number(dispute.against_user_id) === Number(req.user!.userId);
    const isStaff = req.user!.roles.some((r) => ['ADMIN', 'MODERATOR'].includes(r));

    if (!isParticipant && !isStaff) {
      res.status(403).json({ error: 'Unauthorized to post messages in this dispute' });
      return;
    }

    const msgRes = await query(
      `INSERT INTO dispute_messages (dispute_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [dispute.dispute_id, req.user!.userId, parsed.data.message]
    );

    const messagePayload = {
      message_id: msgRes.rows[0].message_id,
      dispute_id: dispute.dispute_id,
      sender_id: req.user!.userId,
      sender_name: req.user!.fullName,
      sender_roles: req.user!.roles || [],
      message: parsed.data.message,
      created_at: msgRes.rows[0].created_at,
    };

    // Real-time broadcast to participants and watching moderators
    realtime.sendToUsers([dispute.opened_by, dispute.against_user_id], 'DISPUTE_MESSAGE', messagePayload);
    realtime.broadcast('DISPUTE_MESSAGE', messagePayload);

    // Notify recipient
    const recipientId =
      Number(req.user!.userId) === Number(dispute.opened_by)
        ? dispute.against_user_id
        : dispute.opened_by;

    await query(
      `INSERT INTO notifications (user_id, notification_type, title, message, related_dispute_id)
       VALUES ($1, 'DISPUTE_OPENED', 'New Dispute Message', $2, $3)`,
      [
        recipientId,
        `New message in Dispute #${dispute.dispute_id} from ${req.user!.fullName}`,
        dispute.dispute_id,
      ]
    );

    realtime.sendToUser(recipientId, 'NOTIFICATION', {
      title: 'New Dispute Message',
      message: `New message in Dispute #${dispute.dispute_id} from ${req.user!.fullName}`,
      related_dispute_id: dispute.dispute_id,
    });

    res.status(201).json({ message: messagePayload });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/disputes/:id/resolve (Moderator/Admin)
// Executes arbitrated escrow settlement atomically
router.post('/:id/resolve', authenticateToken, requireRole(['ADMIN', 'MODERATOR']), async (req: AuthenticatedRequest, res: Response) => {
  const parsed = resolveDisputeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  const { status, settlement_amount_owner, resolution_notes } = parsed.data;

  try {
    const disputeId = req.params.id;

    const result = await withTransaction(async (client) => {
      // 1. Fetch dispute and rental
      const dispRes = await client.query('SELECT * FROM disputes WHERE dispute_id = $1 FOR UPDATE', [disputeId]);
      if (dispRes.rows.length === 0) {
        throw new Error('Dispute not found');
      }

      const dispute = dispRes.rows[0];
      const rRes = await client.query('SELECT * FROM rentals WHERE rental_id = $1 FOR UPDATE', [dispute.rental_id]);
      const rental = rRes.rows[0];

      // 2. Fetch Escrow
      const escRes = await client.query('SELECT * FROM escrows WHERE rental_id = $1 FOR UPDATE', [rental.rental_id]);
      const escrow = escRes.rows[0];
      const heldDeposit = parseFloat(escrow.held_amount || escrow.original_amount);

      // Ensure settlement to owner does not exceed available held deposit
      const ownerSettlement = Math.min(heldDeposit, settlement_amount_owner);
      const borrowerRefund = Math.max(0, heldDeposit - ownerSettlement);

      // 3. Process Escrow settlement
      if (ownerSettlement > 0) {
        // Credit owner wallet
        await client.query('UPDATE wallets SET balance = balance + $1 WHERE user_id = $2', [
          ownerSettlement,
          rental.owner_id,
        ]);

        const ownerW = await client.query('SELECT wallet_id FROM wallets WHERE user_id = $1', [rental.owner_id]);
        await client.query(
          `INSERT INTO wallet_transactions (
            wallet_id, rental_id, escrow_id, transaction_type, amount, status, reference_code, description, completed_at
          ) VALUES ($1, $2, $3, 'DISPUTE_SETTLEMENT', $4, 'COMPLETED', $5, $6, NOW())`,
          [
            ownerW.rows[0].wallet_id,
            rental.rental_id,
            escrow.escrow_id,
            ownerSettlement,
            `TX-DISP-SETTLE-${dispute.dispute_id}-${Date.now()}`,
            `Arbitrated dispute settlement for Rental #${rental.rental_id}`,
          ]
        );
      }

      if (borrowerRefund > 0) {
        // Credit remaining deposit to borrower
        await client.query('UPDATE wallets SET balance = balance + $1 WHERE user_id = $2', [
          borrowerRefund,
          rental.borrower_id,
        ]);

        const borrowerW = await client.query('SELECT wallet_id FROM wallets WHERE user_id = $1', [rental.borrower_id]);
        await client.query(
          `INSERT INTO wallet_transactions (
            wallet_id, rental_id, escrow_id, transaction_type, amount, status, reference_code, description, completed_at
          ) VALUES ($1, $2, $3, 'REFUND', $4, 'COMPLETED', $5, $6, NOW())`,
          [
            borrowerW.rows[0].wallet_id,
            rental.rental_id,
            escrow.escrow_id,
            borrowerRefund,
            `TX-DISP-REF-${dispute.dispute_id}-${Date.now()}`,
            `Remaining deposit refunded following dispute resolution`,
          ]
        );
      }

      // 4. Update Escrow status
      const newEscrowStatus = ownerSettlement > 0 && borrowerRefund > 0 ? 'PARTIALLY_RELEASED' : 'RELEASED';
      await client.query(
        `UPDATE escrows SET 
          held_amount = 0,
          released_amount = $1,
          deducted_amount = $2,
          status = $3,
          released_at = NOW(),
          updated_at = NOW()
         WHERE escrow_id = $4`,
        [borrowerRefund, ownerSettlement, newEscrowStatus, escrow.escrow_id]
      );

      // 5. Update Dispute status
      const updatedDispute = await client.query(
        `UPDATE disputes SET 
          status = $1,
          resolved_at = NOW(),
          resolved_by = $2,
          resolution_notes = $3
         WHERE dispute_id = $4
         RETURNING *`,
        [status, req.user!.userId, resolution_notes, dispute.dispute_id]
      );

      // 6. Update Rental status to COMPLETED
      await client.query(
        "UPDATE rentals SET status = 'COMPLETED', updated_at = NOW() WHERE rental_id = $1",
        [rental.rental_id]
      );

      // 7. Update Inventory back to AVAILABLE (or MAINTENANCE if severe damage)
      const invStatus = ownerSettlement > 2000 ? 'MAINTENANCE' : 'AVAILABLE';
      await client.query(
        'UPDATE inventory SET status = $1, updated_at = NOW() WHERE inventory_id = $2',
        [invStatus, rental.inventory_id]
      );

      if (invStatus === 'AVAILABLE') {
        await client.query(
          "UPDATE listings SET status = 'ACTIVE', updated_at = NOW() WHERE listing_id = $1",
          [rental.listing_id]
        );
      }

      // 8. Adjust trust score for the penalized party
      if (status === 'RESOLVED_OWNER') {
        // Borrower penalized
        await client.query(
          'UPDATE users SET trust_score = GREATEST(0.0, trust_score - 30.0), updated_at = NOW() WHERE user_id = $1',
          [rental.borrower_id]
        );
      } else if (status === 'RESOLVED_BORROWER') {
        // False claim by owner penalized
        await client.query(
          'UPDATE users SET trust_score = GREATEST(0.0, trust_score - 20.0), updated_at = NOW() WHERE user_id = $1',
          [rental.owner_id]
        );
      }

      // 9. Notifications
      await client.query(
        `INSERT INTO notifications (user_id, notification_type, title, message, related_dispute_id)
         VALUES 
         ($1, 'DISPUTE_RESOLVED', 'Dispute Resolved', $3, $4),
         ($2, 'DISPUTE_RESOLVED', 'Dispute Resolved', $3, $4)`,
        [
          rental.borrower_id,
          rental.owner_id,
          `Dispute #${dispute.dispute_id} resolved: ${status}. Settlement: ${ownerSettlement} BDT to owner, ${borrowerRefund} BDT to borrower.`,
          dispute.dispute_id,
        ]
      );

      await logAudit(client, req.user!.userId, 'DISPUTE_ACTION', 'disputes', dispute.dispute_id, dispute, updatedDispute.rows[0]);

      return {
        ...updatedDispute.rows[0],
        borrower_id: rental.borrower_id,
        owner_id: rental.owner_id,
      };
    });

    realtime.sendToUsers([result.borrower_id, result.owner_id], 'DISPUTE_RESOLVED', result);
    realtime.sendToUsers([result.borrower_id, result.owner_id], 'WALLET_UPDATED', { dispute_id: result.dispute_id });
    realtime.sendToUsers([result.borrower_id, result.owner_id], 'RENTAL_UPDATED', { rental_id: result.rental_id });
    realtime.broadcast('DISPUTE_UPDATED', result);

    res.json({ message: 'Dispute resolved and escrow settlement executed', dispute: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
