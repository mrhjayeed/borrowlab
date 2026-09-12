import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { authenticateToken, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();

// Require ADMIN or MODERATOR role for all admin routes
router.use(authenticateToken);
router.use(requireRole(['ADMIN', 'MODERATOR']));

// GET /api/admin/overview
// High-level system KPI telemetry
router.get('/overview', async (_req, res) => {
  try {
    const kpiRes = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE') AS active_users_count,
        (SELECT COUNT(*) FROM component_catalog) AS total_catalog_components,
        (SELECT COUNT(*) FROM inventory) AS total_inventory_units,
        (SELECT COUNT(*) FROM listings WHERE status = 'ACTIVE') AS active_listings_count,
        (SELECT COUNT(*) FROM rentals WHERE status = 'ACTIVE') AS active_rentals_count,
        (SELECT COUNT(*) FROM rentals WHERE status = 'COMPLETED') AS completed_rentals_count,
        (SELECT COUNT(*) FROM disputes WHERE status IN ('OPEN', 'UNDER_REVIEW')) AS pending_disputes_count,
        (SELECT COUNT(*) FROM damage_reports WHERE status = 'REPORTED') AS pending_damage_reports_count,
        (SELECT COALESCE(SUM(rental_fee), 0) FROM rentals WHERE status = 'COMPLETED') AS total_completed_volume,
        (SELECT COALESCE(SUM(held_amount), 0) FROM escrows WHERE status = 'HELD') AS current_escrow_pool
    `);

    res.json({ overview: kpiRes.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/analytics/hardware-popularity
// SQL DEMO: Aggregations (COUNT, SUM, AVG, MIN, MAX) with GROUP BY and HAVING
router.get('/analytics/hardware-popularity', async (_req, res) => {
  try {
    const result = await query(`
      SELECT 
        cat.category_id,
        cat.name AS category_name,
        COUNT(r.rental_id)::int AS rental_count,
        COALESCE(SUM(r.rental_fee), 0)::numeric(12,2) AS total_revenue,
        COALESCE(ROUND(AVG(r.rental_fee), 2), 0)::numeric(12,2) AS avg_rental_fee,
        COALESCE(MIN(r.weekly_rent), 0)::numeric(12,2) AS min_weekly_rent,
        COALESCE(MAX(r.weekly_rent), 0)::numeric(12,2) AS max_weekly_rent,
        COALESCE(ROUND(AVG(r.due_date - r.start_date), 1), 0)::numeric(5,1) AS avg_duration_days
      FROM component_categories cat
      INNER JOIN component_catalog c ON cat.category_id = c.category_id
      INNER JOIN inventory i ON c.component_id = i.component_id
      INNER JOIN rentals r ON i.inventory_id = r.inventory_id
      WHERE r.status IN ('ACTIVE', 'COMPLETED', 'DISPUTED', 'OVERDUE')
      GROUP BY cat.category_id, cat.name
      HAVING COUNT(r.rental_id) >= 1
      ORDER BY total_revenue DESC, rental_count DESC
    `);

    res.json({
      queryDescription: "Demonstrates SQL COUNT, SUM, AVG, MIN, MAX with GROUP BY category and HAVING rental_count >= 1",
      categories: result.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/analytics/department-revenue
// SQL DEMO: Aggregations + Multi-table INNER JOIN + GROUP BY + HAVING
router.get('/analytics/department-revenue', async (_req, res) => {
  try {
    const result = await query(`
      SELECT 
        d.department_id,
        d.code AS department_code,
        d.name AS department_name,
        un.short_name AS university_short_name,
        COUNT(r.rental_id)::int AS total_rentals,
        COALESCE(SUM(r.rental_fee), 0)::numeric(12,2) AS total_volume,
        COALESCE(ROUND(AVG(r.rental_fee), 2), 0)::numeric(12,2) AS avg_rental_value,
        COUNT(DISTINCT r.owner_id)::int AS active_lenders_count
      FROM departments d
      INNER JOIN universities un ON d.university_id = un.university_id
      INNER JOIN users u ON d.department_id = u.department_id
      INNER JOIN rentals r ON u.user_id = r.owner_id
      GROUP BY d.department_id, d.code, d.name, un.short_name
      HAVING COUNT(r.rental_id) > 0
      ORDER BY total_volume DESC
    `);

    res.json({
      queryDescription: "Demonstrates INNER JOIN across departments, universities, users, and rentals with GROUP BY and HAVING count > 0",
      departments: result.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/analytics/high-trust-students
// SQL DEMO: Correlated Subquery
// "Users with trust score strictly higher than their department's average trust score"
router.get('/analytics/high-trust-students', async (_req, res) => {
  try {
    const result = await query(`
      SELECT 
        u.user_id,
        u.full_name,
        u.university_email,
        u.student_id,
        u.trust_score,
        d.code AS department_code,
        d.name AS department_name,
        ROUND((
          SELECT AVG(u2.trust_score) 
          FROM users u2 
          WHERE u2.department_id = u.department_id
        ), 2) AS department_avg_trust
      FROM users u
      INNER JOIN departments d ON u.department_id = d.department_id
      WHERE u.trust_score > (
        SELECT AVG(u_dept.trust_score)
        FROM users u_dept
        WHERE u_dept.department_id = u.department_id
      )
      ORDER BY u.trust_score DESC, u.full_name ASC
    `);

    res.json({
      queryDescription: "Demonstrates Correlated Subquery: Finds users whose trust score exceeds their department's average",
      students: result.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/analytics/pristine-hardware
// SQL DEMO: Nested Subquery
// "Hardware catalog components that have NEVER received any review rating below 4 stars"
router.get('/analytics/pristine-hardware', async (_req, res) => {
  try {
    const result = await query(`
      SELECT 
        c.component_id,
        c.component_name,
        c.manufacturer,
        c.model,
        cat.name AS category_name,
        (
          SELECT COUNT(*)::int 
          FROM rentals r 
          WHERE r.inventory_id IN (
            SELECT i2.inventory_id FROM inventory i2 WHERE i2.component_id = c.component_id
          )
        ) AS total_rental_count,
        (
          SELECT COALESCE(ROUND(AVG(rev.rating), 2), 5.00)
          FROM reviews rev 
          WHERE rev.rental_id IN (
            SELECT r2.rental_id FROM rentals r2 WHERE r2.inventory_id IN (
              SELECT i3.inventory_id FROM inventory i3 WHERE i3.component_id = c.component_id
            )
          )
        ) AS average_rating
      FROM component_catalog c
      INNER JOIN component_categories cat ON c.category_id = cat.category_id
      WHERE c.component_id NOT IN (
        SELECT DISTINCT i.component_id
        FROM inventory i
        INNER JOIN rentals r ON i.inventory_id = r.inventory_id
        INNER JOIN reviews rev ON r.rental_id = rev.rental_id
        WHERE rev.rating < 4
      )
      ORDER BY total_rental_count DESC, c.component_name ASC
    `);

    res.json({
      queryDescription: "Demonstrates Nested Subquery: Selects hardware components with NOT IN (subquery filtering ratings < 4)",
      pristineComponents: result.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/analytics/unbooked-listings
// SQL DEMO: INNER + LEFT JOIN
// Listings with no active reservation and no active rental
router.get('/analytics/unbooked-listings', async (_req, res) => {
  try {
    const result = await query(`
      SELECT 
        l.listing_id,
        l.listing_title,
        l.weekly_rent,
        i.inventory_code,
        c.component_name,
        u.full_name AS owner_name,
        un.short_name AS university_name
      FROM listings l
      INNER JOIN inventory i ON l.inventory_id = i.inventory_id
      INNER JOIN component_catalog c ON i.component_id = c.component_id
      INNER JOIN users u ON l.owner_id = u.user_id
      INNER JOIN universities un ON u.university_id = un.university_id
      LEFT JOIN reservations res ON res.listing_id = l.listing_id AND res.status = 'ACTIVE'
      LEFT JOIN rentals r ON r.listing_id = l.listing_id AND r.status IN ('REQUESTED', 'APPROVED', 'ACTIVE', 'RETURN_PENDING', 'OVERDUE')
      WHERE l.status = 'ACTIVE' 
        AND i.status = 'AVAILABLE'
        AND res.reservation_id IS NULL
        AND r.rental_id IS NULL
      ORDER BY l.created_at DESC
    `);

    res.json({
      queryDescription: "Demonstrates INNER + LEFT JOIN: Finds completely unbooked active listings",
      unbookedListings: result.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/analytics/explain-index
// SQL DEMO: Index Demonstration with EXPLAIN ANALYZE
router.get('/analytics/explain-index', async (_req, res) => {
  try {
    const explainRes = await query(`
      EXPLAIN (ANALYZE, FORMAT JSON)
      SELECT inventory_id, inventory_code, status 
      FROM inventory 
      WHERE component_id = 1 AND status = 'AVAILABLE'
    `);

    res.json({
      indexName: "idx_inventory_component_status",
      query: "SELECT inventory_id, inventory_code, status FROM inventory WHERE component_id = 1 AND status = 'AVAILABLE'",
      justification: "Marketplace browse & availability checks query inventory by component filtered on status = 'AVAILABLE'. The composite index eliminates table scans.",
      plan: explainRes.rows[0]['QUERY PLAN'],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { status, search } = req.query;
    let sql = `
      SELECT 
        u.user_id,
        u.student_id,
        u.full_name,
        u.university_email,
        u.trust_score,
        u.status,
        un.name AS university_name,
        dept.code AS department_code,
        w.balance AS wallet_balance,
        COALESCE(array_agg(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '{}') AS roles,
        u.created_at
      FROM users u
      JOIN universities un ON u.university_id = un.university_id
      LEFT JOIN departments dept ON u.department_id = dept.department_id
      LEFT JOIN wallets w ON u.user_id = w.user_id
      LEFT JOIN user_roles ur ON u.user_id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.role_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      params.push(status);
      sql += ` AND u.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (u.full_name ILIKE $${params.length} OR u.university_email ILIKE $${params.length} OR u.student_id ILIKE $${params.length})`;
    }

    sql += ` GROUP BY u.user_id, un.name, dept.code, w.balance ORDER BY u.user_id ASC`;

    const result = await query(sql, params);
    res.json({ users: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id/status
router.put('/users/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED', 'DEACTIVATED']),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  try {
    const targetUserId = req.params.id;
    const oldUser = await query('SELECT * FROM users WHERE user_id = $1', [targetUserId]);
    if (oldUser.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const result = await query(
      'UPDATE users SET status = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *',
      [parsed.data.status, targetUserId]
    );

    await logAudit(
      query,
      req.user!.userId,
      parsed.data.status === 'SUSPENDED' ? 'SUSPEND' : 'STATUS_CHANGE',
      'users',
      Number(targetUserId),
      { status: oldUser.rows[0].status },
      { status: parsed.data.status }
    );

    res.json({ user: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', async (req, res) => {
  try {
    const { action, entity_type, limit = 100 } = req.query;
    let sql = `
      SELECT 
        a.*,
        u.full_name AS actor_name,
        u.university_email AS actor_email
      FROM audit_logs a
      LEFT JOIN users u ON a.actor_user_id = u.user_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (action) {
      params.push(action);
      sql += ` AND a.action = $${params.length}`;
    }

    if (entity_type) {
      params.push(entity_type);
      sql += ` AND a.entity_type = $${params.length}`;
    }

    params.push(limit);
    sql += ` ORDER BY a.created_at DESC LIMIT $${params.length}`;

    const result = await query(sql, params);
    res.json({ logs: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
