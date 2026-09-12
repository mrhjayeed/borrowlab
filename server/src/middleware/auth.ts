import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL SECURITY WARNING: JWT_SECRET environment variable is required in production.');
}

export const JWT_SECRET = process.env.JWT_SECRET || 'borrowlab_dev_fallback_jwt_secret_do_not_use_in_prod';

export interface AuthUser {
  userId: number;
  universityId: number;
  departmentId: number | null;
  studentId: string;
  fullName: string;
  universityEmail: string;
  trustScore: number;
  status: string;
  roles: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Authentication token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    
    // Fetch user and aggregated roles from user_roles
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
        COALESCE(array_agg(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '{}') AS roles
       FROM users u
       LEFT JOIN user_roles ur ON u.user_id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.role_id
       WHERE u.user_id = $1
       GROUP BY u.user_id`,
      [decoded.userId]
    );

    if (userRes.rows.length === 0) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }

    const row = userRes.rows[0];

    if (row.status === 'BANNED' || row.status === 'DEACTIVATED') {
      res.status(403).json({ error: `Account is ${row.status.toLowerCase()}` });
      return;
    }

    req.user = {
      userId: Number(row.user_id),
      universityId: Number(row.university_id),
      departmentId: row.department_id ? Number(row.department_id) : null,
      studentId: row.student_id,
      fullName: row.full_name,
      universityEmail: row.university_email,
      trustScore: parseFloat(row.trust_score),
      status: row.status,
      roles: row.roles,
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
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
        COALESCE(array_agg(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '{}') AS roles
       FROM users u
       LEFT JOIN user_roles ur ON u.user_id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.role_id
       WHERE u.user_id = $1
       GROUP BY u.user_id`,
      [decoded.userId]
    );

    if (userRes.rows.length > 0) {
      const row = userRes.rows[0];
      req.user = {
        userId: Number(row.user_id),
        universityId: Number(row.university_id),
        departmentId: row.department_id ? Number(row.department_id) : null,
        studentId: row.student_id,
        fullName: row.full_name,
        universityEmail: row.university_email,
        trustScore: parseFloat(row.trust_score),
        status: row.status,
        roles: row.roles,
      };
    }
  } catch {
    // Ignore invalid tokens for optional authentication
  }

  next();
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const hasRole = req.user.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      res.status(403).json({
        error: `Forbidden: Requires one of [${allowedRoles.join(', ')}] roles`,
      });
      return;
    }

    next();
  };
};
