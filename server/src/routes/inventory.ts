import { Router, Response } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../config/db.js';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { realtime } from '../services/realtime.js';
import { sendValidationError } from '../utils/validation.js';

const router = Router();

const accessorySchema = z.object({
  accessory_name: z.string({ invalid_type_error: 'Accessory name must be text' }).min(1, 'Accessory name is required').max(150, 'Accessory name cannot exceed 150 characters'),
  quantity: z.number({ invalid_type_error: 'Accessory quantity must be a valid number' }).int('Accessory quantity must be a whole number').positive('Accessory quantity must be at least 1').default(1),
  replacement_value: z.number({ invalid_type_error: 'Accessory replacement value must be a valid number' }).nonnegative('Accessory replacement value cannot be negative').default(0),
  is_required: z.boolean().default(false),
});

const createInventorySchema = z.object({
  component_id: z.number({ invalid_type_error: 'Please select a hardware model from catalog' }).int().positive('Please select a valid hardware model'),
  inventory_code: z.string({ invalid_type_error: 'Asset tag ID must be text' }).max(50, 'Asset tag ID cannot exceed 50 characters').optional(),
  serial_number: z.string({ invalid_type_error: 'Serial number must be text' }).max(100, 'Serial number cannot exceed 100 characters').optional(),
  condition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'], {
    errorMap: () => ({ message: 'Condition must be EXCELLENT, GOOD, FAIR, POOR, or DAMAGED' }),
  }),
  replacement_value: z.number({ invalid_type_error: 'Replacement value must be a valid number' }).positive('Replacement value must be greater than 0 BDT'),
  purchase_date: z.string().optional(),
  description: z.string().optional(),
  current_location: z.string().max(255, 'Location cannot exceed 255 characters').optional(),
  image_url: z.string().optional().nullable(),
  accessories: z.array(accessorySchema).optional(),
  listing: z.object({
    weekly_rent: z.number({ invalid_type_error: 'Weekly rent must be a valid number' }).positive('Weekly rent must be greater than 0 BDT'),
    minimum_duration_days: z.number({ invalid_type_error: 'Minimum rental days must be a whole number' }).int().positive('Minimum rental days must be at least 1 day').default(1),
    maximum_duration_days: z.number({ invalid_type_error: 'Maximum rental days must be a whole number' }).int().positive('Maximum rental days must be at least 1 day').default(30),
    listing_title: z.string().min(5, 'Listing title must be at least 5 characters').max(200, 'Listing title cannot exceed 200 characters').optional(),
    description: z.string().optional(),
    pickup_information: z.string().max(500, 'Pickup information cannot exceed 500 characters').optional(),
  }).refine((data) => data.maximum_duration_days >= data.minimum_duration_days, {
    message: 'Maximum rental duration must be greater than or equal to minimum rental duration',
    path: ['maximum_duration_days'],
  }).optional(),
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
    sendValidationError(res, parsed.error);
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
    listing,
  } = parsed.data;

  // Auto-generate asset code if not supplied by user
  let finalCode = (inventory_code && inventory_code.trim()) || '';
  if (!finalCode) {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    finalCode = `BL-UIU-${randomSuffix}`;
  }

  try {
    const result = await withTransaction(async (client) => {
      const invRes = await client.query(
        `INSERT INTO inventory (
          component_id, owner_id, inventory_code, serial_number, condition, replacement_value, purchase_date, description, current_location, image_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          component_id,
          req.user!.userId,
          finalCode,
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
        code: finalCode,
        component_id,
      });

      let newListing = null;
      if (listing) {
        const compRes = await client.query(
          'SELECT component_name, manufacturer, model FROM component_catalog WHERE component_id = $1',
          [component_id]
        );
        const comp = compRes.rows[0];
        const defaultTitle = comp
          ? `${comp.manufacturer ? comp.manufacturer + ' ' : ''}${comp.model} (${comp.component_name})`.trim()
          : `Hardware Unit ${finalCode}`;

        const listRes = await client.query(
          `INSERT INTO listings (
            inventory_id, owner_id, weekly_rent, minimum_duration_days, maximum_duration_days,
            listing_title, description, pickup_information, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE')
          RETURNING *`,
          [
            newInv.inventory_id,
            req.user!.userId,
            listing.weekly_rent,
            listing.minimum_duration_days || 1,
            listing.maximum_duration_days || 30,
            listing.listing_title || defaultTitle,
            listing.description || description || null,
            listing.pickup_information || current_location || null,
          ]
        );

        newListing = listRes.rows[0];

        if (image_url) {
          await client.query(
            `INSERT INTO listing_images (listing_id, image_url, display_order)
             VALUES ($1, $2, 1)`,
            [newListing.listing_id, image_url]
          );
        }

        await logAudit(client, req.user!.userId, 'INSERT', 'listings', newListing.listing_id, null, {
          listing_title: newListing.listing_title,
          weekly_rent: newListing.weekly_rent,
        });
      }

      return { item: newInv, listing: newListing };
    });

    realtime.sendToUser(req.user!.userId, 'INVENTORY_UPDATED', result.item);
    if (result.listing) {
      realtime.broadcast('LISTING_UPDATED', result.listing);
    }

    res.status(201).json({ item: result.item, listing: result.listing });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Asset Code or Serial Number already exists' });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/inventory/:id
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    condition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'], {
      errorMap: () => ({ message: 'Condition must be EXCELLENT, GOOD, FAIR, POOR, or DAMAGED' }),
    }).optional(),
    current_location: z.string().max(255, 'Location cannot exceed 255 characters').optional(),
    description: z.string().optional(),
    replacement_value: z.number({ invalid_type_error: 'Replacement value must be a valid number' }).positive('Replacement value must be greater than 0 BDT').optional(),
    status: z.enum(['AVAILABLE', 'MAINTENANCE', 'RETIRED'], {
      errorMap: () => ({ message: 'Status must be AVAILABLE, MAINTENANCE, or RETIRED' }),
    }).optional(),
    image_url: z.string().optional().nullable(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
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
    if (Number(item.owner_id) !== Number(req.user!.userId) && !req.user!.roles.includes('ADMIN')) {
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

    realtime.sendToUser(req.user!.userId, 'INVENTORY_UPDATED', result.rows[0]);

    res.json({ item: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
