import { Router, Response } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../config/db.js';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();

const accessorySchema = z.object({
  accessory_name: z.string().min(1).max(150),
  quantity: z.number().int().positive().default(1),
  replacement_value: z.number().nonnegative().default(0),
  is_required: z.boolean().default(false),
});

const createInventorySchema = z.object({
  component_id: z.number().int().positive(),
  inventory_code: z.string().min(2).max(50),
  serial_number: z.string().max(100).optional(),
  condition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']),
  replacement_value: z.number().positive(),
  purchase_date: z.string().optional(),
  description: z.string().optional(),
  current_location: z.string().max(255).optional(),
  image_url: z.string().optional().nullable(),
  accessories: z.array(accessorySchema).optional(),
});

// GET /api/inventory/my
// Get all inventory items owned by authenticated user
router.get('/my', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT 
        i.inventory_id,
        i.component_id,
        c.component_name,
        c.manufacturer,
        c.model,
        cat.name AS category_name,
        i.inventory_code,
        i.serial_number,
        i.condition,
        i.status,
        i.replacement_value,
        i.purchase_date,
        i.current_location,
        i.description,
        i.image_url,
        i.added_at,
        l.listing_id,
        l.status AS listing_status,
        l.weekly_rent,
        COALESCE(
          json_agg(
            json_build_object(
              'accessory_id', a.accessory_id,
              'accessory_name', a.accessory_name,
              'quantity', a.quantity,
              'replacement_value', a.replacement_value,
              'is_required', a.is_required
            )
          ) FILTER (WHERE a.accessory_id IS NOT NULL), '[]'
        ) AS accessories
       FROM inventory i
       JOIN component_catalog c ON i.component_id = c.component_id
       JOIN component_categories cat ON c.category_id = cat.category_id
       LEFT JOIN listings l ON i.inventory_id = l.inventory_id
       LEFT JOIN inventory_accessories a ON i.inventory_id = a.inventory_id
       WHERE i.owner_id = $1
       GROUP BY i.inventory_id, c.component_name, c.manufacturer, c.model, cat.name, l.listing_id, l.status, l.weekly_rent, i.image_url
       ORDER BY i.added_at DESC`,
      [req.user!.userId]
    );

    res.json({ inventory: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/:id
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT 
        i.inventory_id,
        i.component_id,
        c.component_name,
        c.manufacturer,
        c.model,
        c.specifications,
        cat.name AS category_name,
        i.owner_id,
        u.full_name AS owner_name,
        i.inventory_code,
        i.serial_number,
        i.condition,
        i.status,
        i.replacement_value,
        i.purchase_date,
        i.current_location,
        i.description,
        i.image_url,
        i.added_at,
        COALESCE(
          json_agg(
            json_build_object(
              'accessory_id', a.accessory_id,
              'accessory_name', a.accessory_name,
              'quantity', a.quantity,
              'replacement_value', a.replacement_value,
              'is_required', a.is_required
            )
          ) FILTER (WHERE a.accessory_id IS NOT NULL), '[]'
        ) AS accessories
       FROM inventory i
       JOIN component_catalog c ON i.component_id = c.component_id
       JOIN component_categories cat ON c.category_id = cat.category_id
       JOIN users u ON i.owner_id = u.user_id
       LEFT JOIN inventory_accessories a ON i.inventory_id = a.inventory_id
       WHERE i.inventory_id = $1
       GROUP BY i.inventory_id, c.component_name, c.manufacturer, c.model, c.specifications, cat.name, u.full_name, i.image_url`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Inventory unit not found' });
      return;
    }

    res.json({ item: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createInventorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  const {
    component_id,
    inventory_code,
    serial_number,
    condition,
    replacement_value,
    purchase_date,
    description,
    current_location,
    image_url,
    accessories,
  } = parsed.data;

  try {
    const item = await withTransaction(async (client) => {
      const invRes = await client.query(
        `INSERT INTO inventory (
          component_id, owner_id, inventory_code, serial_number, condition, replacement_value, purchase_date, description, current_location, image_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          component_id,
          req.user!.userId,
          inventory_code,
          serial_number || null,
          condition,
          replacement_value,
          purchase_date || null,
          description || null,
          current_location || null,
          image_url || null,
        ]
      );

      const newInv = invRes.rows[0];

      if (accessories && accessories.length > 0) {
        for (const acc of accessories) {
          await client.query(
            `INSERT INTO inventory_accessories (
              inventory_id, accessory_name, quantity, replacement_value, is_required
            ) VALUES ($1, $2, $3, $4, $5)`,
            [newInv.inventory_id, acc.accessory_name, acc.quantity, acc.replacement_value, acc.is_required]
          );
        }
      }

      await logAudit(client, req.user!.userId, 'INSERT', 'inventory', newInv.inventory_id, null, {
        code: inventory_code,
        component_id,
      });

      return newInv;
    });

    res.status(201).json({ item });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Inventory code or Serial Number already exists' });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/inventory/:id
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    condition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']).optional(),
    current_location: z.string().max(255).optional(),
    description: z.string().optional(),
    replacement_value: z.number().positive().optional(),
    status: z.enum(['AVAILABLE', 'MAINTENANCE', 'RETIRED']).optional(),
    image_url: z.string().optional().nullable(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  try {
    // Check ownership
    const checkRes = await query('SELECT * FROM inventory WHERE inventory_id = $1', [req.params.id]);
    if (checkRes.rows.length === 0) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    const item = checkRes.rows[0];
    if (item.owner_id !== req.user!.userId && !req.user!.roles.includes('ADMIN')) {
      res.status(403).json({ error: 'Only the owner or an administrator can update this item' });
      return;
    }

    const updates = parsed.data;
    const result = await query(
      `UPDATE inventory SET
        condition = COALESCE($1, condition),
        current_location = COALESCE($2, current_location),
        description = COALESCE($3, description),
        replacement_value = COALESCE($4, replacement_value),
        status = COALESCE($5, status),
        image_url = CASE WHEN $6::boolean THEN $7 ELSE image_url END,
        updated_at = NOW()
       WHERE inventory_id = $8
       RETURNING *`,
      [
        updates.condition || null,
        updates.current_location || null,
        updates.description || null,
        updates.replacement_value || null,
        updates.status || null,
        updates.image_url !== undefined,
        updates.image_url || null,
        req.params.id,
      ]
    );

    await logAudit(query, req.user!.userId, 'UPDATE', 'inventory', Number(req.params.id), item, result.rows[0]);

    res.json({ item: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
