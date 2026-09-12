import { Router, Response } from 'express';
import { query } from '../config/db.js';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth.js';
import { realtime } from '../services/realtime.js';

const router = Router();

// GET /api/notifications
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.user!.userId]
    );

    const unreadCountRes = await query(
      `SELECT COUNT(*)::int AS unread_count 
       FROM notifications 
       WHERE user_id = $1 AND is_read = false`,
      [req.user!.userId]
    );

    res.json({
      notifications: result.rows,
      unreadCount: unreadCountRes.rows[0].unread_count,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(
      `UPDATE notifications 
       SET is_read = true, read_at = NOW() 
       WHERE notification_id = $1 AND user_id = $2 
       RETURNING *`,
      [req.params.id, req.user!.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    realtime.sendToUser(req.user!.userId, 'NOTIFICATION_READ', { notification_id: req.params.id });

    res.json({ notification: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await query(
      `UPDATE notifications 
       SET is_read = true, read_at = NOW() 
       WHERE user_id = $1 AND is_read = false`,
      [req.user!.userId]
    );

    realtime.sendToUser(req.user!.userId, 'NOTIFICATION_READ', { all: true });

    res.json({ message: 'All notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
