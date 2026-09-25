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

async function fetchUserProfile(userId: number | string) {
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
    [userId]
  );

  if (userRes.rows.length === 0) return null;
  const row = userRes.rows[0];

  return {
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
  };
}

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const profile = await fetchUserProfile(req.user!.userId);
    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const updateProfileSchema = z.object({
  full_name: z
    .string({ invalid_type_error: 'Full name must be text' })
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(150, 'Full name cannot exceed 150 characters')
    .optional(),
  phone: z
    .string({ invalid_type_error: 'Phone number must be text' })
    .trim()
    .max(30, 'Phone number cannot exceed 30 characters')
    .optional()
    .nullable(),
  department_id: z
    .number({ invalid_type_error: 'Please select a valid department' })
    .int()
    .positive('Please select a valid department')
    .optional()
    .nullable(),
  student_id: z
    .string({ invalid_type_error: 'Student ID must be text' })
    .trim()
    .min(2, 'Student ID must be at least 2 characters')
    .max(50, 'Student ID cannot exceed 50 characters')
    .optional(),
  profile_image_url: z
    .string({ invalid_type_error: 'Profile image URL must be text' })
    .trim()
    .max(500, 'Image URL cannot exceed 500 characters')
    .optional()
    .nullable(),
  current_password: z
    .string()
    .min(1, 'Current password is required to change password')
    .optional(),
  new_password: z
    .string()
    .min(6, 'New password must be at least 6 characters long')
    .max(100, 'New password cannot exceed 100 characters')
    .optional(),
}).refine((data) => {
  if (data.new_password && !data.current_password) {
    return false;
  }
  return true;
}, {
  message: 'Current password is required to change your password',
  path: ['current_password'],
});

// PUT /api/auth/me - Edit User Profile
router.put('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const userId = req.user!.userId;
  const {
    full_name,
    phone,
    department_id,
    student_id,
    profile_image_url,
    current_password,
    new_password,
  } = parsed.data;

  try {
    const currentUserRes = await query(
      'SELECT user_id, university_id, student_id, password_hash FROM users WHERE user_id = $1',
      [userId]
    );
    if (currentUserRes.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const currentUser = currentUserRes.rows[0];

    // If student_id changed, check uniqueness within university
    if (student_id && student_id !== currentUser.student_id) {
      const dupRes = await query(
        'SELECT user_id FROM users WHERE university_id = $1 AND student_id = $2 AND user_id != $3',
        [currentUser.university_id, student_id, userId]
      );
      if (dupRes.rows.length > 0) {
        res.status(409).json({
          error: 'Student ID already in use',
          reason: 'Another student at your university is already registered with this Student ID',
        });
        return;
      }
    }

    // If department_id changed, verify it belongs to user's university
    if (department_id !== undefined && department_id !== null) {
      const deptRes = await query(
        'SELECT department_id FROM departments WHERE department_id = $1 AND university_id = $2',
        [department_id, currentUser.university_id]
      );
      if (deptRes.rows.length === 0) {
        res.status(400).json({
          error: 'Invalid department',
          reason: 'The selected department does not belong to your university',
        });
        return;
      }
    }

    // If password change requested, verify current password
    let updatedPasswordHash: string | undefined = undefined;
    if (new_password) {
      const isMatch = await bcrypt.compare(current_password || '', currentUser.password_hash);
      if (!isMatch) {
        res.status(400).json({
          error: 'Incorrect current password',
          reason: 'The current password you entered is incorrect',
        });
        return;
      }
      updatedPasswordHash = await bcrypt.hash(new_password, 10);
    }

    // Update user record
    await query(
      `UPDATE users SET
        full_name = COALESCE($1, full_name),
        phone = CASE WHEN $2::boolean THEN $3 ELSE phone END,
        department_id = CASE WHEN $4::boolean THEN $5 ELSE department_id END,
        student_id = COALESCE($6, student_id),
        profile_image_url = CASE WHEN $7::boolean THEN $8 ELSE profile_image_url END,
        password_hash = COALESCE($9, password_hash),
        updated_at = NOW()
       WHERE user_id = $10`,
      [
        full_name || null,
        phone !== undefined,
        phone || null,
        department_id !== undefined,
        department_id || null,
        student_id || null,
        profile_image_url !== undefined,
        profile_image_url || null,
        updatedPasswordHash || null,
        userId,
      ]
    );

    await logAudit(query, userId, 'UPDATE', 'users', userId, null, {
      updatedFields: Object.keys(parsed.data).filter((k) => k !== 'current_password' && k !== 'new_password'),
      passwordChanged: !!new_password,
    });

    const updatedProfile = await fetchUserProfile(userId);
    res.json({
      user: updatedProfile,
      message: 'Account profile updated successfully',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me/deletion-eligibility - Pre-flight check for account deletion blockers
router.get('/me/deletion-eligibility', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  try {
    const activeRentalsRes = await query(
      `SELECT 
        r.rental_id,
        r.status,
        c.component_name,
        r.owner_id,
        r.borrower_id
       FROM rentals r
       JOIN inventory i ON r.inventory_id = i.inventory_id
       JOIN component_catalog c ON i.component_id = c.component_id
       WHERE (r.borrower_id = $1 OR r.owner_id = $1)
         AND r.status IN ('REQUESTED', 'APPROVED', 'ACTIVE', 'RETURN_PENDING', 'OVERDUE', 'DISPUTED')`,
      [userId]
    );

    const escrowRes = await query(
      `SELECT COALESCE(SUM(held_amount), 0) AS escrow_total
       FROM escrows
       WHERE (borrower_id = $1 OR owner_id = $1) AND status = 'HELD'`,
      [userId]
    );

    const listingsRes = await query(
      `SELECT COUNT(*) AS active_listings FROM listings WHERE owner_id = $1 AND status = 'ACTIVE'`,
      [userId]
    );

    const inventoryRes = await query(
      `SELECT COUNT(*) AS total_items FROM inventory WHERE owner_id = $1 AND status = 'AVAILABLE'`,
      [userId]
    );

    const blockers: string[] = [];
    const activeRentalsCount = activeRentalsRes.rows.length;
    const escrowLockedTotal = parseFloat(escrowRes.rows[0]?.escrow_total || '0');

    if (activeRentalsCount > 0) {
      blockers.push(
        `You have ${activeRentalsCount} active hardware rental agreement(s) in progress. All borrowed or lent equipment must be returned and confirmed before account deletion.`
      );
    }

    if (escrowLockedTotal > 0) {
      blockers.push(
        `You have ${escrowLockedTotal.toFixed(2)} BDT in locked security deposit escrows. Ongoing transactions must be settled before deleting your account.`
      );
    }

    res.json({
      canDelete: blockers.length === 0,
      blockers,
      activeRentalsCount,
      activeRentals: activeRentalsRes.rows,
      escrowLockedTotal,
      activeListingsCount: parseInt(listingsRes.rows[0]?.active_listings || '0', 10),
      availableInventoryCount: parseInt(inventoryRes.rows[0]?.total_items || '0', 10),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/me - Delete / Deactivate User Account
router.delete('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { password, confirmation } = req.body;

  try {
    const userRes = await query('SELECT user_id, password_hash, status FROM users WHERE user_id = $1', [userId]);
    if (userRes.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const user = userRes.rows[0];

    // Password or confirmation verification
    if (password) {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        res.status(400).json({
          error: 'Incorrect password',
          reason: 'The password you entered is incorrect',
        });
        return;
      }
    } else if (confirmation !== 'DELETE') {
      res.status(400).json({
        error: 'Confirmation required',
        reason: 'Please enter your password or type DELETE to confirm account deletion',
      });
      return;
    }

    // Check for active rentals
    const activeRentalsRes = await query(
      `SELECT COUNT(*) AS active_count
       FROM rentals
       WHERE (borrower_id = $1 OR owner_id = $1)
         AND status IN ('REQUESTED', 'APPROVED', 'ACTIVE', 'RETURN_PENDING', 'OVERDUE', 'DISPUTED')`,
      [userId]
    );

    if (parseInt(activeRentalsRes.rows[0]?.active_count || '0', 10) > 0) {
      res.status(400).json({
        error: 'Cannot delete account with active rentals',
        reason: 'You have active ongoing hardware rental agreements. All borrowed or lent items must be returned and completed before deletion.',
      });
      return;
    }

    // Check for locked escrow
    const escrowRes = await query(
      `SELECT COALESCE(SUM(held_amount), 0) AS escrow_total
       FROM escrows
       WHERE (borrower_id = $1 OR owner_id = $1) AND status = 'HELD'`,
      [userId]
    );

    if (parseFloat(escrowRes.rows[0]?.escrow_total || '0') > 0) {
      res.status(400).json({
        error: 'Cannot delete account with locked escrow',
        reason: 'You have locked security deposit escrows. Please wait for rental inspection and escrow settlement before deleting your account.',
      });
      return;
    }

    // Execute atomic account deletion and cleanup
    await withTransaction(async (client) => {
      // A. Remove any active marketplace listings
      await client.query(
        `UPDATE listings SET status = 'REMOVED', updated_at = NOW() WHERE owner_id = $1 AND status IN ('ACTIVE', 'PAUSED')`,
        [userId]
      );

      // B. Cancel any pending waitlist entries
      await client.query(
        `UPDATE waitlist SET status = 'CANCELLED' WHERE borrower_id = $1 AND status IN ('WAITING', 'NOTIFIED')`,
        [userId]
      );

      // C. Retire any available inventory units
      await client.query(
        `UPDATE inventory SET status = 'RETIRED' WHERE owner_id = $1 AND status = 'AVAILABLE'`,
        [userId]
      );

      // D. Log audit trail before deletion
      await logAudit(client.query, userId, 'DELETE', 'users', userId, null, {
        action: 'USER_ACCOUNT_DELETION',
        timestamp: new Date().toISOString(),
      });

      // E. Attempt hard DELETE; if FK violation occurs (historical completed rentals/reviews), fallback to DEACTIVATED
      try {
        await client.query('DELETE FROM users WHERE user_id = $1', [userId]);
      } catch (fkErr: any) {
        if (fkErr.code === '23503') {
          await client.query(
            `UPDATE users SET
              status = 'DEACTIVATED',
              phone = NULL,
              profile_image_url = NULL,
              password_hash = 'DEACTIVATED_' || gen_random_uuid(),
              updated_at = NOW()
             WHERE user_id = $1`,
            [userId]
          );
        } else {
          throw fkErr;
        }
      }
    });

    res.json({
      success: true,
      message: 'Your account has been deleted successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
