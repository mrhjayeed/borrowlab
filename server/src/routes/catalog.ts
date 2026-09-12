import { Router } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { authenticateToken, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/catalog/categories
router.get('/categories', async (_req, res) => {
  try {
    const result = await query(`
      SELECT 
        c.category_id,
        c.parent_category_id,
        c.name,
        c.description,
        p.name AS parent_category_name,
        (SELECT COUNT(*) FROM component_catalog WHERE category_id = c.category_id) AS component_count
      FROM component_categories c
      LEFT JOIN component_categories p ON c.parent_category_id = p.category_id
      WHERE c.is_active = true
      ORDER BY c.name ASC
    `);

    res.json({ categories: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/catalog/categories (Admin only)
router.post('/categories', authenticateToken, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    name: z.string().min(2).max(100),
    description: z.string().optional(),
    parent_category_id: z.number().int().positive().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  try {
    const result = await query(
      `INSERT INTO component_categories (name, description, parent_category_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [parsed.data.name, parsed.data.description || null, parsed.data.parent_category_id || null]
    );

    res.status(201).json({ category: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/catalog/components
router.get('/components', async (req, res) => {
  try {
    const { category_id, search } = req.query;
    let sql = `
      SELECT 
        c.component_id,
        c.category_id,
        cat.name AS category_name,
        c.manufacturer,
        c.model,
        c.component_name,
        c.description,
        c.specifications,
        c.default_rental_period_days,
        (SELECT COUNT(*) FROM inventory WHERE component_id = c.component_id) AS total_units,
        (SELECT COUNT(*) FROM inventory WHERE component_id = c.component_id AND status = 'AVAILABLE') AS available_units
      FROM component_catalog c
      JOIN component_categories cat ON c.category_id = cat.category_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (category_id) {
      params.push(category_id);
      sql += ` AND c.category_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (c.component_name ILIKE $${params.length} OR c.model ILIKE $${params.length} OR c.manufacturer ILIKE $${params.length})`;
    }

    sql += ` ORDER BY c.component_name ASC`;

    const result = await query(sql, params);
    res.json({ components: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/catalog/components/:id
router.get('/components/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        c.component_id,
        c.category_id,
        cat.name AS category_name,
        c.manufacturer,
        c.model,
        c.component_name,
        c.description,
        c.specifications,
        c.default_rental_period_days,
        (SELECT COUNT(*) FROM inventory WHERE component_id = c.component_id) AS total_units,
        (SELECT COUNT(*) FROM inventory WHERE component_id = c.component_id AND status = 'AVAILABLE') AS available_units
      FROM component_catalog c
      JOIN component_categories cat ON c.category_id = cat.category_id
      WHERE c.component_id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Component not found' });
      return;
    }

    res.json({ component: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/catalog/components (Admin/Moderator)
router.post('/components', authenticateToken, requireRole(['ADMIN', 'MODERATOR']), async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    category_id: z.number().int().positive(),
    manufacturer: z.string().max(100).optional(),
    model: z.string().min(1).max(120),
    component_name: z.string().min(2).max(150),
    description: z.string().optional(),
    specifications: z.string().optional(),
    default_rental_period_days: z.number().int().positive().default(7),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  try {
    const { category_id, manufacturer, model, component_name, description, specifications, default_rental_period_days } = parsed.data;
    const result = await query(
      `INSERT INTO component_catalog (
        category_id, manufacturer, model, component_name, description, specifications, default_rental_period_days
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [category_id, manufacturer || null, model, component_name, description || null, specifications || null, default_rental_period_days]
    );

    res.status(201).json({ component: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
