import { Router, Response } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../config/db.js';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();

const depositSchema = z.object({
  amount: z.number().positive().max(100000),
  description: z.string().optional(),
});

// GET /api/wallet
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const walletRes = await query(
      `SELECT 
        w.*,
        COALESCE(
          (SELECT SUM(held_amount) FROM escrows WHERE borrower_id = w.user_id AND status = 'HELD'), 0
        ) AS total_escrow_locked,
        COALESCE(
          (SELECT SUM(amount) FROM wallet_transactions WHERE wallet_id = w.wallet_id AND transaction_type = 'OWNER_EARNING' AND status = 'COMPLETED'), 0
        ) AS total_earnings
       FROM wallets w
       WHERE w.user_id = $1`,
      [req.user!.userId]
    );

    if (walletRes.rows.length === 0) {
      res.status(404).json({ error: 'Wallet not found' });
      return;
    }

    res.json({ wallet: walletRes.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wallet/deposit
// Simulated instant top-up
router.post('/deposit', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = depositSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid deposit amount', details: parsed.error.format() });
    return;
  }

  const { amount, description } = parsed.data;

  try {
    const result = await withTransaction(async (client) => {
      const walletRes = await client.query(
        'SELECT wallet_id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
        [req.user!.userId]
      );

      if (walletRes.rows.length === 0) {
        throw new Error('Wallet not found');
      }

      const wallet = walletRes.rows[0];

      await client.query(
        'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE wallet_id = $2',
        [amount, wallet.wallet_id]
      );

      const refCode = `TX-DEP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const txRes = await client.query(
        `INSERT INTO wallet_transactions (
          wallet_id, transaction_type, amount, status, reference_code, description, completed_at
        ) VALUES ($1, 'WALLET_DEPOSIT', $2, 'COMPLETED', $3, $4, NOW())
        RETURNING *`,
        [wallet.wallet_id, amount, refCode, description || 'Simulated Campus Card Deposit']
      );

      await logAudit(client, req.user!.userId, 'PAYMENT', 'wallets', wallet.wallet_id, null, {
        amount,
        reference_code: refCode,
      });

      return {
        wallet_id: wallet.wallet_id,
        new_balance: parseFloat(wallet.balance) + amount,
        transaction: txRes.rows[0],
      };
    });

    res.json({ message: 'Deposit successful', result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wallet/transactions
router.get('/transactions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, status } = req.query;

    let sql = `
      SELECT 
        tx.*,
        r.rental_id,
        l.listing_title
      FROM wallet_transactions tx
      JOIN wallets w ON tx.wallet_id = w.wallet_id
      LEFT JOIN rentals r ON tx.rental_id = r.rental_id
      LEFT JOIN listings l ON r.listing_id = l.listing_id
      WHERE w.user_id = $1
    `;
    const params: any[] = [req.user!.userId];

    if (type) {
      params.push(type);
      sql += ` AND tx.transaction_type = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND tx.status = $${params.length}`;
    }

    sql += ` ORDER BY tx.created_at DESC`;

    const result = await query(sql, params);
    res.json({ transactions: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
