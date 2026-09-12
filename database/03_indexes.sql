-- =============================================================
-- BORROWLAB: Performance Indexes with Written Justifications
-- =============================================================

-- 1. Inventory Availability Index
-- JUSTIFICATION: The marketplace and search engines constantly query inventory units
-- by catalog component filtered on status = 'AVAILABLE'. A composite B-tree index
-- on (component_id, status) eliminates full table scans during browse queries.
CREATE INDEX idx_inventory_component_status 
  ON inventory(component_id, status);

-- 2. Inventory Owner Status Index
-- JUSTIFICATION: Student inventory dashboards filter all hardware owned by the authenticated
-- user and group by status ('AVAILABLE', 'RENTED', 'MAINTENANCE').
CREATE INDEX idx_inventory_owner_status 
  ON inventory(owner_id, status);

-- 3. Listings Marketplace Filtering Index
-- JUSTIFICATION: Discovery queries heavily filter active listings sorted by price.
-- The composite index on (status, weekly_rent) allows direct index-range scans
-- when filtering ACTIVE listings ordered by weekly rental fee.
CREATE INDEX idx_listings_status_rent 
  ON listings(status, weekly_rent);

-- 4. Active Rentals Concurrency Index
-- JUSTIFICATION: Used during rental creation and inventory locking to quickly locate
-- non-terminal rentals on a physical inventory item. Prevents full table scan on rentals.
CREATE INDEX idx_rentals_inventory_status 
  ON rentals(inventory_id, status);

-- 5. Borrower Active Rentals Lookup
-- JUSTIFICATION: Frequently queried when checking if a user has overdue items or
-- max borrow limits, and renders the borrower's active items in their dashboard.
CREATE INDEX idx_rentals_borrower_status 
  ON rentals(borrower_id, status);

-- 6. Due Date Index for Overdue Detection
-- JUSTIFICATION: Background cron/jobs and automated monitoring check daily for rentals
-- where due_date < CURRENT_DATE and status = 'ACTIVE' to flag OVERDUE items and assess late penalties.
CREATE INDEX idx_rentals_due_date_active 
  ON rentals(due_date) 
  WHERE status = 'ACTIVE';

-- 7. Unread Notifications Compound Index
-- JUSTIFICATION: The topbar notification badge and popover query user unread notifications
-- ordered by created_at DESC on every navigation event.
CREATE INDEX idx_notifications_user_unread_created 
  ON notifications(user_id, is_read, created_at DESC);

-- 8. Waitlist Priority FIFO Index
-- JUSTIFICATION: When an inventory unit is returned and becomes AVAILABLE, the system
-- finds the next eligible borrower using (component_id, status, joined_at ASC).
CREATE INDEX idx_waitlist_fifo 
  ON waitlist(component_id, status, joined_at ASC);

-- 9. Reviews Aggregation Index
-- JUSTIFICATION: Speeds up calculation of average review scores and count for users:
-- SELECT AVG(rating) FROM reviews WHERE reviewee_id = $1.
CREATE INDEX idx_reviews_reviewee_rating 
  ON reviews(reviewee_id, rating);

-- 10. Audit Log Entity Tracing Index
-- JUSTIFICATION: Administrators trace history of specific entities (e.g. rental_id or user_id)
-- across audit logs using (entity_type, entity_id).
CREATE INDEX idx_audit_logs_entity 
  ON audit_logs(entity_type, entity_id);

-- Additional Foreign Key & Look-up Indexes
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_trust_score ON users(trust_score);

CREATE INDEX idx_catalog_category ON component_catalog(category_id);
CREATE INDEX idx_catalog_manufacturer_model ON component_catalog(manufacturer, model);
CREATE INDEX idx_catalog_name ON component_catalog(component_name);

CREATE INDEX idx_inventory_accessories_inventory ON inventory_accessories(inventory_id);
CREATE INDEX idx_listing_images_listing_order ON listing_images(listing_id, display_order);

CREATE INDEX idx_reservations_listing_status ON reservations(listing_id, status);
CREATE INDEX idx_reservations_borrower ON reservations(borrower_id);

CREATE INDEX idx_rental_history_rental ON rental_status_history(rental_id);
CREATE INDEX idx_rental_history_changed_at ON rental_status_history(changed_at);

CREATE INDEX idx_wallet_tx_wallet_created ON wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX idx_wallet_tx_rental ON wallet_transactions(rental_id);
CREATE INDEX idx_wallet_tx_type_status ON wallet_transactions(transaction_type, status);

CREATE INDEX idx_escrow_tx_escrow ON escrow_transactions(escrow_id, created_at DESC);

CREATE INDEX idx_damage_reports_rental ON damage_reports(rental_id);
CREATE INDEX idx_damage_reports_status ON damage_reports(status);

CREATE INDEX idx_disputes_rental ON disputes(rental_id);
CREATE INDEX idx_disputes_status_opened ON disputes(status, opened_at DESC);
CREATE INDEX idx_dispute_messages_dispute_created ON dispute_messages(dispute_id, created_at ASC);

CREATE INDEX idx_maintenance_inventory_started ON maintenance_records(inventory_id, started_at DESC);
