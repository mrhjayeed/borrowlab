import { Router, Response } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../config/db.js';
import { authenticateToken, optionalAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { realtime } from '../services/realtime.js';

const router = Router();

const createListingSchema = z.object({
  inventory_id: z.number().int().positive(),
  weekly_rent: z.number().positive(),
  minimum_duration_days: z.number().int().positive().default(1),
  maximum_duration_days: z.number().int().positive().default(30),
  listing_title: z.string().min(5).max(200),
  description: z.string().optional(),
  pickup_information: z.string().max(500).optional(),
  image_urls: z.array(z.string().min(1)).optional(),
});

// GET /api/listings
// Marketplace search & discovery using the reusable listing_availability view
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      search,
      category_id,
      condition,
      is_rentable,
      min_price,
      max_price,
      min_trust,
      university_id,
      sort,
    } = req.query;

    let sql = `SELECT * FROM listing_availability WHERE listing_status = 'ACTIVE'`;
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (
        listing_title ILIKE $${params.length} 
        OR component_name ILIKE $${params.length}
        OR manufacturer ILIKE $${params.length}
        OR model ILIKE $${params.length}
        OR category_name ILIKE $${params.length}
      )`;
    }

    if (category_id) {
      params.push(category_id);
      sql += ` AND category_id = $${params.length}`;
    }

    if (condition) {
      params.push(condition);
      sql += ` AND hardware_condition = $${params.length}`;
    }

    if (is_rentable === 'true') {
      sql += ` AND is_rentable = true`;
    }

    if (min_price) {
      params.push(min_price);
      sql += ` AND weekly_rent >= $${params.length}`;
    }

    if (max_price) {
      params.push(max_price);
      sql += ` AND weekly_rent <= $${params.length}`;
    }

    if (min_trust) {
      params.push(min_trust);
      sql += ` AND owner_trust_score >= $${params.length}`;
    }

    // Sort order
    if (sort === 'price_asc') {
      sql += ` ORDER BY weekly_rent ASC`;
    } else if (sort === 'price_desc') {
      sql += ` ORDER BY weekly_rent DESC`;
    } else if (sort === 'rating_desc') {
      sql += ` ORDER BY owner_avg_rating DESC, owner_trust_score DESC`;
    } else {
      sql += ` ORDER BY listing_created_at DESC`;
    }

    const result = await query(sql, params);
    res.json({ listings: result.rows, total: result.rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/listings/my
router.get('/my', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM listing_availability WHERE owner_id = $1 ORDER BY listing_created_at DESC`,
      [req.user!.userId]
    );
    res.json({ listings: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/listings/:id
// Detailed listing view with accessories, image gallery, and rental terms
router.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const listingRes = await query(
      `SELECT * FROM listing_availability WHERE listing_id = $1`,
      [req.params.id]
    );

    if (listingRes.rows.length === 0) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    const listing = listingRes.rows[0];

    // Fetch images
    const imagesRes = await query(
      `SELECT listing_image_id, image_url, display_order 
       FROM listing_images 
       WHERE listing_id = $1 
       ORDER BY display_order ASC`,
      [listing.listing_id]
    );

    let images = imagesRes.rows;
    if (images.length === 0 && listing.primary_image_url) {
      images = [{ listing_image_id: 0, image_url: listing.primary_image_url, display_order: 1 }];
    }

    // Fetch accessories
    const accessoriesRes = await query(
      `SELECT accessory_id, accessory_name, quantity, replacement_value, is_required
       FROM inventory_accessories
       WHERE inventory_id = $1
       ORDER BY is_required DESC, accessory_name ASC`,
      [listing.inventory_id]
    );

    // Fetch recent reviews for owner
    const reviewsRes = await query(
      `SELECT r.review_id, r.rating, r.comment, r.created_at, u.full_name AS reviewer_name
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.user_id
       WHERE r.reviewee_id = $1 AND r.status = 'PUBLISHED'
       ORDER BY r.created_at DESC
       LIMIT 5`,
      [listing.owner_id]
    );

    res.json({
      listing: {
        ...listing,
        images,
        accessories: accessoriesRes.rows,
        recentReviews: reviewsRes.rows,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/listings
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createListingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  const {
    inventory_id,
    weekly_rent,
    minimum_duration_days,
    maximum_duration_days,
    listing_title,
    description,
    pickup_information,
    image_urls,
  } = parsed.data;

  try {
    // 1. Verify item ownership and availability
    const invRes = await query('SELECT * FROM inventory WHERE inventory_id = $1', [inventory_id]);
    if (invRes.rows.length === 0) {
      res.status(404).json({ error: 'Inventory unit not found' });
      return;
    }

    const item = invRes.rows[0];
    if (Number(item.owner_id) !== Number(req.user!.userId)) {
      res.status(403).json({ error: 'You can only create listings for hardware you own' });
      return;
    }

    if (['LOST', 'RETIRED', 'DISPUTED'].includes(item.status)) {
      res.status(400).json({ error: `Cannot list hardware currently in ${item.status} state` });
      return;
    }

    const listing = await withTransaction(async (client) => {
      const listRes = await client.query(
        `INSERT INTO listings (
          inventory_id, owner_id, weekly_rent, minimum_duration_days, maximum_duration_days,
          listing_title, description, pickup_information, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE')
        RETURNING *`,
        [
          inventory_id,
          req.user!.userId,
          weekly_rent,
          minimum_duration_days,
          maximum_duration_days,
          listing_title,
          description || null,
          pickup_information || null,
        ]
      );

      const newListing = listRes.rows[0];

      if (image_urls && image_urls.length > 0) {
        for (let i = 0; i < image_urls.length; i++) {
          await client.query(
            `INSERT INTO listing_images (listing_id, image_url, display_order)
             VALUES ($1, $2, $3)`,
            [newListing.listing_id, image_urls[i], i + 1]
          );
        }
      } else if (item.image_url) {
        await client.query(
          `INSERT INTO listing_images (listing_id, image_url, display_order)
           VALUES ($1, $2, 1)`,
          [newListing.listing_id, item.image_url]
        );
      }

      await logAudit(client, req.user!.userId, 'INSERT', 'listings', newListing.listing_id, null, {
        listing_title,
        weekly_rent,
      });

      return newListing;
    });

    realtime.broadcast('LISTING_UPDATED', listing);

    res.status(201).json({ listing });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'A listing already exists for this inventory unit' });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/listings/:id
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    weekly_rent: z.number().positive().optional(),
    minimum_duration_days: z.number().int().positive().optional(),
    maximum_duration_days: z.number().int().positive().optional(),
    listing_title: z.string().min(5).max(200).optional(),
    description: z.string().optional(),
    pickup_information: z.string().max(500).optional(),
    status: z.enum(['ACTIVE', 'PAUSED', 'REMOVED']).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  try {
    const listRes = await query('SELECT * FROM listings WHERE listing_id = $1', [req.params.id]);
    if (listRes.rows.length === 0) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    const current = listRes.rows[0];
    if (Number(current.owner_id) !== Number(req.user!.userId) && !req.user!.roles.includes('ADMIN')) {
      res.status(403).json({ error: 'Unauthorized to update this listing' });
      return;
    }

    const updates = parsed.data;
    const result = await query(
      `UPDATE listings SET
        weekly_rent = COALESCE($1, weekly_rent),
        minimum_duration_days = COALESCE($2, minimum_duration_days),
        maximum_duration_days = COALESCE($3, maximum_duration_days),
        listing_title = COALESCE($4, listing_title),
        description = COALESCE($5, description),
        pickup_information = COALESCE($6, pickup_information),
        status = COALESCE($7, status),
        updated_at = NOW()
       WHERE listing_id = $8
       RETURNING *`,
      [
        updates.weekly_rent || null,
        updates.minimum_duration_days || null,
        updates.maximum_duration_days || null,
        updates.listing_title || null,
        updates.description || null,
        updates.pickup_information || null,
        updates.status || null,
        req.params.id,
      ]
    );

    await logAudit(query, req.user!.userId, 'UPDATE', 'listings', Number(req.params.id), current, result.rows[0]);

    realtime.broadcast('LISTING_UPDATED', result.rows[0]);

    res.json({ listing: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
