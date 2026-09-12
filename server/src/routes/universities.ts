import { Router } from 'express';
import { query } from '../config/db.js';

const router = Router();

// GET /api/universities
router.get('/', async (_req, res) => {
  try {
    const result = await query(`
      SELECT 
        u.university_id,
        u.name,
        u.short_name,
        u.email_domain,
        u.address,
        u.is_active,
        COALESCE(
          json_agg(
            json_build_object(
              'department_id', d.department_id,
              'name', d.name,
              'code', d.code
            ) ORDER BY d.name
          ) FILTER (WHERE d.department_id IS NOT NULL), '[]'
        ) AS departments
      FROM universities u
      LEFT JOIN departments d ON u.university_id = d.university_id AND d.is_active = true
      WHERE u.is_active = true
      GROUP BY u.university_id
      ORDER BY u.name ASC
    `);

    res.json({ universities: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/universities/:id/departments
router.get('/:id/departments', async (req, res) => {
  try {
    const result = await query(
      `SELECT department_id, university_id, name, code, is_active
       FROM departments 
       WHERE university_id = $1 AND is_active = true
       ORDER BY name ASC`,
      [req.params.id]
    );
    res.json({ departments: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
