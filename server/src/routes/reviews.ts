import { Router, Response } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../config/db.js';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { realtime } from '../services/realtime.js';
import { sendValidationError } from '../utils/validation.js';

const router = Router();

const createReviewSchema = z.object({
  rental_id: z.coerce.number().int().positive('Please select a valid rental'),
  rating: z.coerce.number().int().min(1, 'Rating must be between 1 and 5 stars').max(5, 'Rating must be between 1 and 5 stars'),
  comment: z.string().trim().min(5, 'Review comment must be at least 5 characters'),
});

const updateReviewSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Rating must be between 1 and 5 stars').max(5, 'Rating must be between 1 and 5 stars'),
  comment: z.string().trim().min(5, 'Review comment must be at least 5 characters'),
});

const calculateTrustDelta = (rating: number): number => {
  if (rating === 5) return 2.0;
  if (rating === 4) return 1.0;
  if (rating === 3) return 0.0;
  return -5.0; // rating 1 or 2
};

// POST /api/reviews
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
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
      const scoreDelta = calculateTrustDelta(rating);

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

// PUT /api/reviews/:id (Edit Review)
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const reviewId = Number(req.params.id);
  if (!reviewId || isNaN(reviewId)) {
    res.status(400).json({ error: 'Invalid review ID' });
    return;
  }

  const parsed = updateReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const { rating, comment } = parsed.data;

  try {
    const existingRes = await query('SELECT * FROM reviews WHERE review_id = $1', [reviewId]);
    if (existingRes.rows.length === 0) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    const review = existingRes.rows[0];

    // Only the reviewer (author) can edit their review
    if (Number(review.reviewer_id) !== Number(req.user!.userId)) {
      res.status(403).json({ error: 'You are only allowed to edit reviews you created' });
      return;
    }

    const oldRating = review.rating;
    const oldDelta = calculateTrustDelta(oldRating);
    const newDelta = calculateTrustDelta(rating);
    const netDelta = newDelta - oldDelta;

    const updatedReview = await withTransaction(async (client) => {
      if (netDelta !== 0) {
        await client.query(
          'UPDATE users SET trust_score = LEAST(100.0, GREATEST(0.0, trust_score + $1)), updated_at = NOW() WHERE user_id = $2',
          [netDelta, review.reviewee_id]
        );
      }

      const updateRes = await client.query(
        `UPDATE reviews
         SET rating = $1, comment = $2, updated_at = NOW()
         WHERE review_id = $3
         RETURNING *`,
        [rating, comment, reviewId]
      );

      await logAudit(client, req.user!.userId, 'UPDATE', 'reviews', reviewId, {
        rating: review.rating,
        comment: review.comment,
      }, {
        rating,
        comment,
      });

      return updateRes.rows[0];
    });

    // Notify participants & send realtime events
    try {
      const rentalRes = await query('SELECT borrower_id, owner_id FROM rentals WHERE rental_id = $1', [review.rental_id]);
      if (rentalRes.rows.length > 0) {
        const rental = rentalRes.rows[0];
        realtime.sendToUsers([rental.borrower_id, rental.owner_id], 'RENTAL_UPDATED', {
          rental_id: review.rental_id,
        });
      }

      realtime.sendToUser(review.reviewee_id, 'NOTIFICATION', {
        title: 'Peer Review Updated',
        message: `${req.user!.fullName} updated their review for Rental #${review.rental_id}.`,
        related_rental_id: review.rental_id,
      });
      realtime.sendToUser(review.reviewee_id, 'WALLET_UPDATED', {
        user_id: review.reviewee_id,
      });
    } catch (notifErr) {
      console.error('Failed to dispatch update review notifications:', notifErr);
    }

    res.json({ review: updatedReview });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/reviews/:id (Delete Review)
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const reviewId = Number(req.params.id);
  if (!reviewId || isNaN(reviewId)) {
    res.status(400).json({ error: 'Invalid review ID' });
    return;
  }

  try {
    const existingRes = await query('SELECT * FROM reviews WHERE review_id = $1', [reviewId]);
    if (existingRes.rows.length === 0) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    const review = existingRes.rows[0];

    // Check authorization: author or moderator/admin
    const isAuthor = Number(review.reviewer_id) === Number(req.user!.userId);
    const isStaff = req.user!.roles?.some((r: string) => ['ADMIN', 'MODERATOR'].includes(r));

    if (!isAuthor && !isStaff) {
      res.status(403).json({ error: 'You are not authorized to delete this review' });
      return;
    }

    const oldDelta = calculateTrustDelta(review.rating);
    const reversalDelta = -oldDelta;

    await withTransaction(async (client) => {
      // Revert trust score impact
      if (reversalDelta !== 0) {
        await client.query(
          'UPDATE users SET trust_score = LEAST(100.0, GREATEST(0.0, trust_score + $1)), updated_at = NOW() WHERE user_id = $2',
          [reversalDelta, review.reviewee_id]
        );
      }

      await client.query('DELETE FROM reviews WHERE review_id = $1', [reviewId]);

      await logAudit(client, req.user!.userId, 'DELETE', 'reviews', reviewId, {
        rating: review.rating,
        comment: review.comment,
        rental_id: review.rental_id,
        reviewee_id: review.reviewee_id,
      }, null);
    });

    // Notify participants & send realtime events
    try {
      const rentalRes = await query('SELECT borrower_id, owner_id FROM rentals WHERE rental_id = $1', [review.rental_id]);
      if (rentalRes.rows.length > 0) {
        const rental = rentalRes.rows[0];
        realtime.sendToUsers([rental.borrower_id, rental.owner_id], 'RENTAL_UPDATED', {
          rental_id: review.rental_id,
        });
      }

      realtime.sendToUser(review.reviewee_id, 'WALLET_UPDATED', {
        user_id: review.reviewee_id,
      });
    } catch (notifErr) {
      console.error('Failed to dispatch delete review notifications:', notifErr);
    }

    res.json({ message: 'Review deleted successfully', review_id: reviewId });
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
