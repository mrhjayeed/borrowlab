import { Router, Response } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../config/db.js';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { realtime } from '../services/realtime.js';

const router = Router();

const createReviewSchema = z.object({
  rental_id: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(5, 'Review comment must be at least 5 characters'),
});

// POST /api/reviews
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  const { rental_id, rating, comment } = parsed.data;

  try {
    const rentalRes = await query('SELECT * FROM rentals WHERE rental_id = $1', [rental_id]);
    if (rentalRes.rows.length === 0) {
      res.status(404).json({ error: 'Rental not found' });
      return;
    }

    const rental = rentalRes.rows[0];

    // Business rule: Rental must be COMPLETED
    if (rental.status !== 'COMPLETED') {
      res.status(400).json({ error: 'Reviews are only permitted for completed rentals' });
      return;
    }

    // Must be participant
    const isOwner = Number(rental.owner_id) === Number(req.user!.userId);
    const isBorrower = Number(rental.borrower_id) === Number(req.user!.userId);

    if (!isOwner && !isBorrower) {
      res.status(403).json({ error: 'Only participants in this rental can write a review' });
      return;
    }

    const revieweeId = isOwner ? rental.borrower_id : rental.owner_id;

    // Check duplicate review
    const existing = await query(
      'SELECT review_id FROM reviews WHERE rental_id = $1 AND reviewer_id = $2',
      [rental_id, req.user!.userId]
    );
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'You have already submitted a review for this rental' });
      return;
    }

    const review = await withTransaction(async (client) => {
      const insRes = await client.query(
        `INSERT INTO reviews (rental_id, reviewer_id, reviewee_id, rating, comment, status)
         VALUES ($1, $2, $3, $4, $5, 'PUBLISHED')
         RETURNING *`,
        [rental.rental_id, req.user!.userId, revieweeId, rating, comment]
      );

      // Trust score adjustment based on rating
      let scoreDelta = 0;
      if (rating === 5) scoreDelta = 2.0;
      else if (rating === 4) scoreDelta = 1.0;
      else if (rating <= 2) scoreDelta = -5.0;

      if (scoreDelta !== 0) {
        await client.query(
          'UPDATE users SET trust_score = LEAST(100.0, GREATEST(0.0, trust_score + $1)), updated_at = NOW() WHERE user_id = $2',
          [scoreDelta, revieweeId]
        );
      }

      await logAudit(client, req.user!.userId, 'INSERT', 'reviews', insRes.rows[0].review_id, null, {
        rental_id,
        rating,
        revieweeId,
      });

      return insRes.rows[0];
    });

    // Safely notify reviewee about the peer review
    try {
      await query(
        `INSERT INTO notifications (user_id, notification_type, title, message, related_rental_id)
         VALUES ($1, 'REVIEW_RECEIVED', 'New Peer Review Received', $2, $3)`,
        [
          revieweeId,
          `${req.user!.fullName} gave you a ${rating}-star review for Rental #${rental.rental_id}.`,
          rental.rental_id,
        ]
      );

      realtime.sendToUser(revieweeId, 'NOTIFICATION', {
        title: 'New Peer Review Received',
        message: `${req.user!.fullName} left you a ${rating}-star review`,
        related_rental_id: rental.rental_id,
      });
      realtime.sendToUsers([rental.borrower_id, rental.owner_id], 'RENTAL_UPDATED', {
        rental_id: rental.rental_id,
      });
      realtime.sendToUser(revieweeId, 'WALLET_UPDATED', {
        user_id: revieweeId,
      });
    } catch (notifErr) {
      console.error('Failed to send review notification:', notifErr);
    }

    res.status(201).json({ review });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reviews/user/:id
router.get('/user/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        r.*,
        u_reviewer.full_name AS reviewer_name,
        u_reviewer.profile_image_url AS reviewer_avatar,
        c.component_name
       FROM reviews r
       JOIN users u_reviewer ON r.reviewer_id = u_reviewer.user_id
       JOIN rentals rent ON r.rental_id = rent.rental_id
       JOIN inventory i ON rent.inventory_id = i.inventory_id
       JOIN component_catalog c ON i.component_id = c.component_id
       WHERE r.reviewee_id = $1 AND r.status = 'PUBLISHED'
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );

    res.json({ reviews: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
