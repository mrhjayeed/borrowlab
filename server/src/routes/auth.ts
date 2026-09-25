import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query, withTransaction } from '../config/db.js';
import { authenticateToken, JWT_SECRET, type AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { sendValidationError } from '../utils/validation.js';

const router = Router();

const registerSchema = z.object({
  university_id: z.number({ required_error: 'Please select a university' }).int().positive('Please select a valid university'),
  department_id: z.number().int().positive().optional(),
  student_id: z.string().trim().min(2, 'Student ID must be at least 2 characters').max(50, 'Student ID cannot exceed 50 characters'),
  full_name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(150, 'Full name cannot exceed 150 characters'),
  university_email: z.string().trim().email('Please enter a valid university email address').max(150, 'Email cannot exceed 150 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters long').max(100, 'Password cannot exceed 100 characters'),
  phone: z.string().trim().max(30, 'Phone number cannot exceed 30 characters').optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// GET /api/auth/demo-users
// Quick persona switcher list for grading and review
router.get('/demo-users', async (_req, res) => {
  try {
    const result = await query(`
      SELECT 
        u.user_id,
        u.full_name,
        u.university_email,
        u.student_id,
        u.trust_score,
        u.status,
        un.short_name AS university_short_name,
        d.code AS department_code,
        w.balance AS wallet_balance,
        COALESCE(array_agg(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '{}') AS roles
      FROM users u
      JOIN universities un ON u.university_id = un.university_id
      LEFT JOIN departments d ON u.department_id = d.department_id
      LEFT JOIN wallets w ON u.user_id = w.user_id
      LEFT JOIN user_roles ur ON u.user_id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.role_id
      WHERE u.status = 'ACTIVE'
      GROUP BY u.user_id, un.short_name, d.code, w.balance
      ORDER BY u.user_id ASC
    `);

    res.json({ users: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/switch-persona
// Allows 1-click switching to any persona in development mode
router.post('/switch-persona', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'Persona switching is disabled in production environments' });
    return;
  }

  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  try {
    const userRes = await query(
      `SELECT 
        u.user_id, 
        u.university_id, 
        u.department_id, 
        u.student_id, 
        u.full_name, 
        u.university_email, 
        u.trust_score, 
        u.status,
        w.balance AS wallet_balance,
        COALESCE(array_agg(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '{}') AS roles
       FROM users u
       LEFT JOIN wallets w ON u.user_id = w.user_id
       LEFT JOIN user_roles ur ON u.user_id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.role_id
       WHERE u.user_id = $1
       GROUP BY u.user_id, w.balance`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userRes.rows[0];
    const token = jwt.sign({ userId: user.user_id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        userId: Number(user.user_id),
        universityId: Number(user.university_id),
        departmentId: user.department_id ? Number(user.department_id) : null,
        studentId: user.student_id,
        fullName: user.full_name,
        universityEmail: user.university_email,
        trustScore: parseFloat(user.trust_score),
        walletBalance: parseFloat(user.wallet_balance || 0),
        status: user.status,
        roles: user.roles,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const { university_id, department_id, student_id, full_name, university_email, password, phone } = parsed.data;

  try {
    // 1. Verify university domain
    const uniRes = await query('SELECT email_domain FROM universities WHERE university_id = $1', [university_id]);
    if (uniRes.rows.length === 0) {
      res.status(400).json({ error: 'Selected university does not exist' });
      return;
    }

    const requiredDomain = uniRes.rows[0].email_domain;
    if (requiredDomain) {
      const emailLower = university_email.toLowerCase().trim();
      const domainLower = requiredDomain.toLowerCase().trim();
      const isDirectDomain = emailLower.endsWith(`@${domainLower}`);
      const isSubDomain = emailLower.endsWith(`.${domainLower}`);
      if (!isDirectDomain && !isSubDomain) {
        res.status(400).json({
          error: `Email must match university domain: @${requiredDomain}`,
        });
        return;
      }
    }

    // 2. Hash password and insert atomically
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await withTransaction(async (client) => {
      const insertUser = await client.query(
        `INSERT INTO users (
          university_id, department_id, student_id, full_name, university_email, password_hash, phone, email_verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        RETURNING user_id, full_name, university_email, student_id, trust_score, status`,
        [university_id, department_id || null, student_id, full_name, university_email.toLowerCase(), passwordHash, phone || null]
      );

      const newUser = insertUser.rows[0];

      // Assign default STUDENT role
      const studentRole = await client.query("SELECT role_id FROM roles WHERE role_name = 'STUDENT'");
      if (studentRole.rows.length > 0) {
        await client.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
          [newUser.user_id, studentRole.rows[0].role_id]
        );
      }

      // Initialize virtual wallet with simulated 5000 BDT starting credit
      await client.query(
        'INSERT INTO wallets (user_id, balance, currency) VALUES ($1, $2, $3)',
        [newUser.user_id, 5000.00, 'BDT']
      );

      await logAudit(client, newUser.user_id, 'INSERT', 'users', newUser.user_id, null, {
        email: newUser.university_email,
        full_name: newUser.full_name,
      });

      return newUser;
    });

    const token = jwt.sign({ userId: result.user_id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        userId: Number(result.user_id),
        universityId: university_id,
        departmentId: department_id || null,
        studentId: result.student_id,
        fullName: result.full_name,
        universityEmail: result.university_email,
        trustScore: parseFloat(result.trust_score),
        walletBalance: 5000.00,
        status: result.status,
        roles: ['STUDENT'],
      },
    });
  } catch (err: any) {
    if (err.code === '23505') {
      if (err.constraint === 'users_university_email_key' || err.detail?.includes('university_email')) {
        res.status(409).json({ error: 'This university email is already registered. Please sign in instead.' });
        return;
      }
      if (err.constraint === 'uq_university_student' || err.detail?.includes('student_id')) {
        res.status(409).json({ error: 'This Student ID is already registered under the selected university.' });
        return;
      }
      res.status(409).json({ error: 'An account with this Email or Student ID already exists.' });
      return;
    }
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const { email, password } = parsed.data;

  try {
    const userRes = await query(
      `SELECT 
        u.user_id, 
        u.university_id, 
        u.department_id, 
        u.student_id, 
        u.full_name, 
        u.university_email, 
        u.password_hash,
        u.trust_score, 
        u.status,
        w.balance AS wallet_balance,
        COALESCE(array_agg(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '{}') AS roles
       FROM users u
       LEFT JOIN wallets w ON u.user_id = w.user_id
       LEFT JOIN user_roles ur ON u.user_id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.role_id
       WHERE LOWER(u.university_email) = LOWER($1)
       GROUP BY u.user_id, w.balance`,
      [email]
    );

    if (userRes.rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = userRes.rows[0];

    if (user.status === 'BANNED' || user.status === 'DEACTIVATED') {
      res.status(403).json({ error: `Account is ${user.status.toLowerCase()}` });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    await logAudit(query, user.user_id, 'LOGIN', 'users', user.user_id, null, {
      timestamp: new Date().toISOString(),
    });

    const token = jwt.sign({ userId: user.user_id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        userId: Number(user.user_id),
        universityId: Number(user.university_id),
        departmentId: user.department_id ? Number(user.department_id) : null,
        studentId: user.student_id,
        fullName: user.full_name,
        universityEmail: user.university_email,
        trustScore: parseFloat(user.trust_score),
        walletBalance: parseFloat(user.wallet_balance || 0),
        status: user.status,
        roles: user.roles,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRes = await query(
      `SELECT 
        u.user_id, 
        u.university_id, 
        un.name AS university_name,
        un.short_name AS university_short_name,
        u.department_id, 
        dept.name AS department_name,
        dept.code AS department_code,
        u.student_id, 
        u.full_name, 
        u.university_email, 
        u.phone,
        u.profile_image_url,
        u.trust_score, 
        u.status,
        w.balance AS wallet_balance,
        COALESCE(array_agg(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '{}') AS roles,
        (SELECT COUNT(*) FROM rentals WHERE borrower_id = u.user_id AND status = 'ACTIVE') AS active_borrows_count,
        (SELECT COUNT(*) FROM rentals WHERE owner_id = u.user_id AND status = 'ACTIVE') AS active_lends_count,
        (SELECT COALESCE(SUM(held_amount), 0) FROM escrows WHERE borrower_id = u.user_id AND status = 'HELD') AS locked_escrow_total
       FROM users u
       JOIN universities un ON u.university_id = un.university_id
       LEFT JOIN departments dept ON u.department_id = dept.department_id
       LEFT JOIN wallets w ON u.user_id = w.user_id
       LEFT JOIN user_roles ur ON u.user_id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.role_id
       WHERE u.user_id = $1
       GROUP BY u.user_id, un.name, un.short_name, dept.name, dept.code, w.balance`,
      [req.user!.userId]
    );

    if (userRes.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const row = userRes.rows[0];

    res.json({
      user: {
        userId: Number(row.user_id),
        universityId: Number(row.university_id),
        universityName: row.university_name,
        universityShortName: row.university_short_name,
        departmentId: row.department_id ? Number(row.department_id) : null,
        departmentName: row.department_name,
        departmentCode: row.department_code,
        studentId: row.student_id,
        fullName: row.full_name,
        universityEmail: row.university_email,
        phone: row.phone,
        profileImageUrl: row.profile_image_url,
        trustScore: parseFloat(row.trust_score),
        walletBalance: parseFloat(row.wallet_balance || 0),
        status: row.status,
        roles: row.roles,
        activeBorrowsCount: parseInt(row.active_borrows_count, 10),
        activeLendsCount: parseInt(row.active_lends_count, 10),
        lockedEscrowTotal: parseFloat(row.locked_escrow_total || 0),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
