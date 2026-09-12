-- =============================================================
-- BORROWLAB: Reusable SQL Views
-- =============================================================

-- View: listing_availability
-- Combines listing details, physical inventory specifications, canonical hardware catalog,
-- owner profile, review score, and active rental/reservation flags to compute instantaneous
-- hardware availability in real time.
CREATE OR REPLACE VIEW listing_availability AS
SELECT 
  l.listing_id,
  l.listing_title,
  l.description AS listing_description,
  l.weekly_rent,
  ROUND(l.weekly_rent / 7.0, 2) AS daily_rent,
  l.minimum_duration_days,
  l.maximum_duration_days,
  l.pickup_information,
  l.status AS listing_status,
  l.created_at AS listing_created_at,

  -- Inventory details
  i.inventory_id,
  i.inventory_code,
  i.serial_number,
  i.condition AS hardware_condition,
  i.status AS inventory_status,
  i.replacement_value,
  i.current_location,
  i.image_url AS inventory_image_url,

  -- Catalog component details
  c.component_id,
  c.component_name,
  c.manufacturer,
  c.model,
  c.specifications,
  c.default_rental_period_days,

  -- Category hierarchy
  cat.category_id,
  cat.name AS category_name,
  parent_cat.name AS parent_category_name,

  -- Primary Image (from listing images or inventory item image)
  COALESCE(img.image_url, i.image_url, NULL) AS primary_image_url,

  -- Owner details
  u.user_id AS owner_id,
  u.full_name AS owner_name,
  u.university_email AS owner_email,
  u.trust_score AS owner_trust_score,
  u.profile_image_url AS owner_avatar_url,
  un.name AS university_name,
  un.short_name AS university_short_name,
  dept.name AS department_name,
  dept.code AS department_code,

  -- Owner reputation stats
  COALESCE(rev.review_count, 0) AS owner_review_count,
  COALESCE(rev.avg_rating, 5.00) AS owner_avg_rating,

  -- Active rental reference (if any)
  active_rental.rental_id AS active_rental_id,
  active_rental.status AS active_rental_status,
  active_rental.due_date AS active_rental_due_date,
  active_rental.borrower_id AS current_borrower_id,

  -- Active reservation reference (if any)
  active_res.reservation_id AS active_reservation_id,
  active_res.start_date AS reservation_start_date,
  active_res.end_date AS reservation_end_date,

  -- Computed Availability Status
  CASE
    WHEN i.status IN ('MAINTENANCE', 'DISPUTED', 'LOST', 'RETIRED') THEN i.status::text
    WHEN l.status IN ('PAUSED', 'REMOVED', 'EXPIRED') THEN l.status::text
    WHEN active_rental.rental_id IS NOT NULL THEN
      CASE 
        WHEN active_rental.status = 'ACTIVE' THEN 'RENTED'
        WHEN active_rental.status = 'OVERDUE' THEN 'OVERDUE'
        WHEN active_rental.status = 'APPROVED' THEN 'RESERVED'
        ELSE 'RENTED'
      END
    WHEN active_res.reservation_id IS NOT NULL THEN 'RESERVED'
    WHEN i.status = 'AVAILABLE' AND l.status = 'ACTIVE' THEN 'AVAILABLE'
    ELSE 'UNAVAILABLE'
  END AS availability_status,

  -- Real-time rentability boolean indicator
  CASE
    WHEN i.status = 'AVAILABLE'
     AND l.status = 'ACTIVE'
     AND active_rental.rental_id IS NULL
     AND active_res.reservation_id IS NULL
    THEN true
    ELSE false
  END AS is_rentable

FROM listings l
INNER JOIN inventory i ON l.inventory_id = i.inventory_id
INNER JOIN component_catalog c ON i.component_id = c.component_id
INNER JOIN component_categories cat ON c.category_id = cat.category_id
LEFT JOIN component_categories parent_cat ON cat.parent_category_id = parent_cat.category_id
INNER JOIN users u ON l.owner_id = u.user_id
INNER JOIN universities un ON u.university_id = un.university_id
LEFT JOIN departments dept ON u.department_id = dept.department_id

-- Primary image join
LEFT JOIN LATERAL (
  SELECT image_url 
  FROM listing_images 
  WHERE listing_id = l.listing_id 
  ORDER BY display_order ASC, listing_image_id ASC 
  LIMIT 1
) img ON true

-- Active rental join (only non-terminal rental states block hardware)
LEFT JOIN LATERAL (
  SELECT rental_id, status, due_date, borrower_id
  FROM rentals 
  WHERE listing_id = l.listing_id 
    AND status IN ('REQUESTED', 'APPROVED', 'ACTIVE', 'RETURN_PENDING', 'OVERDUE', 'DISPUTED')
  ORDER BY requested_at DESC
  LIMIT 1
) active_rental ON true

-- Active reservation join
LEFT JOIN LATERAL (
  SELECT reservation_id, start_date, end_date
  FROM reservations 
  WHERE listing_id = l.listing_id 
    AND status = 'ACTIVE' 
    AND (expires_at IS NULL OR expires_at > NOW())
    AND end_date >= CURRENT_DATE
  ORDER BY start_date ASC
  LIMIT 1
) active_res ON true

-- Aggregated owner review stats
LEFT JOIN (
  SELECT 
    reviewee_id, 
    COUNT(*)::int AS review_count, 
    ROUND(AVG(rating), 2) AS avg_rating 
  FROM reviews 
  WHERE status = 'PUBLISHED' 
  GROUP BY reviewee_id
) rev ON rev.reviewee_id = l.owner_id;


-- View: user_trust_summary
-- Provides aggregated trust metrics across completed rentals, dispute records, and reviews
CREATE OR REPLACE VIEW user_trust_summary AS
SELECT
  u.user_id,
  u.full_name,
  u.university_email,
  u.trust_score,
  u.status AS user_status,
  COUNT(DISTINCT r_borrowed.rental_id) AS total_borrowed_count,
  COUNT(DISTINCT r_owned.rental_id) AS total_lent_count,
  COUNT(DISTINCT d_against.dispute_id) AS disputes_against_count,
  COALESCE(AVG(rev.rating), 5.00) AS average_review_score,
  COUNT(DISTINCT rev.review_id) AS total_reviews_received
FROM users u
LEFT JOIN rentals r_borrowed ON r_borrowed.borrower_id = u.user_id AND r_borrowed.status = 'COMPLETED'
LEFT JOIN rentals r_owned ON r_owned.owner_id = u.user_id AND r_owned.status = 'COMPLETED'
LEFT JOIN disputes d_against ON d_against.against_user_id = u.user_id
LEFT JOIN reviews rev ON rev.reviewee_id = u.user_id AND rev.status = 'PUBLISHED'
GROUP BY u.user_id, u.full_name, u.university_email, u.trust_score, u.status;
