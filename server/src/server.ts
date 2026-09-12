import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRouter from './routes/auth.js';
import universitiesRouter from './routes/universities.js';
import catalogRouter from './routes/catalog.js';
import inventoryRouter from './routes/inventory.js';
import listingsRouter from './routes/listings.js';
import reservationsRouter from './routes/reservations.js';
import rentalsRouter from './routes/rentals.js';
import walletRouter from './routes/wallet.js';
import escrowRouter from './routes/escrow.js';
import damageRouter from './routes/damage.js';
import disputesRouter from './routes/disputes.js';
import reviewsRouter from './routes/reviews.js';
import waitlistRouter from './routes/waitlist.js';
import notificationsRouter from './routes/notifications.js';
import maintenanceRouter from './routes/maintenance.js';
import adminRouter from './routes/admin.js';
import uploadRouter from './routes/upload.js';
import eventsRouter from './routes/events.js';
import { query } from './config/db.js';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'],
  credentials: true,
}));

app.use(express.json());

// Serve static uploaded physical hardware photos
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API Health Check
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const dbCheck = await query('SELECT NOW() AS current_time');
    res.json({
      status: 'healthy',
      platform: 'BorrowLab API',
      database: 'connected',
      timestamp: dbCheck.rows[0].current_time,
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'error',
      message: err.message,
    });
  }
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/universities', universitiesRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/rentals', rentalsRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/escrow', escrowRouter);
app.use('/api/damage', damageRouter);
app.use('/api/disputes', disputesRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/waitlist', waitlistRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/admin', adminRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/events', eventsRouter);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`==> BorrowLab API Server listening on http://0.0.0.0:${PORT}`);
});
