import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';
import { realtime } from '../services/realtime.js';

const router = Router();

// GET /api/events
// Server-Sent Events (SSE) real-time streaming endpoint
router.get('/', (req: Request, res: Response) => {
  // Extract token from query parameter or authorization header
  const authHeader = req.headers.authorization;
  const headerToken = authHeader && authHeader.split(' ')[1];
  const token = (req.query.token as string) || headerToken;

  let userId = 0;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      userId = Number(decoded.userId);
    } catch {
      // Invalid token falls back to anonymous client
    }
  }

  // Set standard Server-Sent Events streaming headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': req.headers.origin || '*',
    'Access-Control-Allow-Credentials': 'true',
  });

  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  realtime.addClient(clientId, userId, res);

  // Clean up on client disconnect
  req.on('close', () => {
    realtime.removeClient(clientId);
  });
});

export default router;
