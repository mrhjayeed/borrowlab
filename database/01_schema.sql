-- =============================================================
-- BORROWLAB: Peer-to-Peer Academic Hardware Lending Platform
-- Database Schema: 3NF Relational DDL for PostgreSQL
-- =============================================================

-- Drop existing schema if needed
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- -------------------------------------------------------------
-- ENUMS
-- -------------------------------------------------------------

CREATE TYPE user_status AS ENUM (
  'ACTIVE',
  'SUSPENDED',
  'BANNED',
  'DEACTIVATED'
);

CREATE TYPE inventory_condition AS ENUM (
  'EXCELLENT',
  'GOOD',
  'FAIR',
  'POOR',
  'DAMAGED'
);

CREATE TYPE inventory_status AS ENUM (
  'AVAILABLE',
  'RESERVED',
  'RENTED',
  'MAINTENANCE',
  'DISPUTED',
  'LOST',
  'RETIRED'
);

CREATE TYPE listing_status AS ENUM (
  'ACTIVE',
  'PAUSED',
  'RENTED',
  'REMOVED',
  'EXPIRED'
);

CREATE TYPE rental_status AS ENUM (
  'REQUESTED',
  'APPROVED',
  'ACTIVE',
  'RETURN_PENDING',
  'RETURNED',
  'OVERDUE',
  'DISPUTED',
  'CANCELLED',
  'COMPLETED'
);

CREATE TYPE payment_status AS ENUM (
  'PENDING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'REFUNDED'
);

CREATE TYPE escrow_status AS ENUM (
  'PENDING',
  'HEHeld',
  'PARTIALLY_RELEASED',
  'RELEASED',
  'FORFEITED',
  'FROZEN',
  'CANCELLED'
);
-- Fix typo in enum above: replace 'HEHeld' with 'HELD'
DROP TYPE escrow_status;
CREATE TYPE escrow_status AS ENUM (
  'PENDING',
  'HELD',
  'PARTIALLY_RELEASED',
  'RELEASED',
  'FORFEITED',
  'FROZEN',
  'CANCELLED'
);

CREATE TYPE transaction_type AS ENUM (
  'WALLET_DEPOSIT',
  'RENTAL_PAYMENT',
  'ESCROW_LOCK',
  'ESCROW_RELEASE',
  'DAMAGE_DEDUCTION',
  'LATE_PENALTY',
  'REFUND',
  'OWNER_EARNING',
  'DISPUTE_SETTLEMENT',
  'ADJUSTMENT'
);

CREATE TYPE transaction_status AS ENUM (
  'PENDING',
  'COMPLETED',
  'FAILED',
  'REVERSED',
  'CANCELLED'
);

CREATE TYPE damage_type AS ENUM (
  'MINOR_DAMAGE',
  'MAJOR_DAMAGE',
  'MISSING_ACCESSORY',
  'LOST',
  'NON_FUNCTIONAL',
  'BURNED',
  'PHYSICAL_DAMAGE',
  'OTHER'
);

CREATE TYPE damage_status AS ENUM (
  'REPORTED',
  'UNDER_REVIEW',
  'ACCEPTED',
  'REJECTED',
  'SETTLED'
);

CREATE TYPE dispute_status AS ENUM (
  'OPEN',
  'UNDER_REVIEW',
  'RESOLVED_OWNER',
  'RESOLVED_BORROWER',
  'PARTIAL_SETTLEMENT',
  'CLOSED',
  'REJECTED'
);

CREATE TYPE dispute_reason AS ENUM (
  'DAMAGE',
  'LOST_ITEM',
  'MISSING_ACCESSORY',
  'PRE_EXISTING_DAMAGE',
  'DEFECTIVE_ITEM',
  'INCORRECT_ITEM',
  'LATE_RETURN',
  'PAYMENT_ISSUE',
  'OTHER'
);

CREATE TYPE review_status AS ENUM (
  'PUBLISHED',
  'HIDDEN',
  'REMOVED'
);

CREATE TYPE notification_type AS ENUM (
  'RENTAL_REQUEST',
  'RENTAL_APPROVED',
  'RENTAL_REJECTED',
  'RENTAL_CANCELLED',
  'RENTAL_START',
  'DUE_SOON',
  'OVERDUE',
  'RETURN_REQUEST',
  'RETURN_CONFIRMED',
  'DAMAGE_REPORTED',
  'DISPUTE_OPENED',
  'DISPUTE_RESOLVED',
  'ESCROW_RELEASED',
  'WAITLIST_AVAILABLE',
  'REVIEW_RECEIVED',
  'SYSTEM'
);

CREATE TYPE waitlist_status AS ENUM (
  'WAITING',
  'NOTIFIED',
  'FULFILLED',
  'CANCELLED',
  'EXPIRED'
);

CREATE TYPE reservation_status AS ENUM (
  'ACTIVE',
  'EXPIRED',
  'CANCELLED',
  'CONVERTED'
);

CREATE TYPE audit_action AS ENUM (
  'INSERT',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'SUSPEND',
  'UNSUSPEND',
  'PAYMENT',
  'REFUND',
  'STATUS_CHANGE',
  'DISPUTE_ACTION'
);

-- -------------------------------------------------------------
-- UNIVERSITY / ORGANIZATION
-- -------------------------------------------------------------

CREATE TABLE universities (
  university_id BIGSERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  short_name VARCHAR(30) NOT NULL UNIQUE,
  email_domain VARCHAR(100) UNIQUE,
  address VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE departments (
  department_id BIGSERIAL PRIMARY KEY,
  university_id BIGINT NOT NULL REFERENCES universities(university_id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_university_dept_code UNIQUE (university_id, code)
);

-- -------------------------------------------------------------
-- USERS / AUTHORIZATION
-- -------------------------------------------------------------

CREATE TABLE users (
  user_id BIGSERIAL PRIMARY KEY,
  university_id BIGINT NOT NULL REFERENCES universities(university_id),
  department_id BIGINT REFERENCES departments(department_id) ON DELETE SET NULL,
  student_id VARCHAR(50) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  university_email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  profile_image_url VARCHAR(500),
  trust_score DECIMAL(5,2) NOT NULL DEFAULT 100.00 CHECK (trust_score >= 0.00 AND trust_score <= 100.00),
  status user_status NOT NULL DEFAULT 'ACTIVE',
  email_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP,
  CONSTRAINT uq_university_student UNIQUE (university_id, student_id)
);

CREATE TABLE roles (
  role_id BIGSERIAL PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255)
);

CREATE TABLE user_roles (
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- -------------------------------------------------------------
-- HARDWARE CATALOG
-- -------------------------------------------------------------

CREATE TABLE component_categories (
  category_id BIGSERIAL PRIMARY KEY,
  parent_category_id BIGINT REFERENCES component_categories(category_id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE component_catalog (
  component_id BIGSERIAL PRIMARY KEY,
  category_id BIGINT NOT NULL REFERENCES component_categories(category_id),
  manufacturer VARCHAR(100),
  model VARCHAR(120) NOT NULL,
  component_name VARCHAR(150) NOT NULL,
  description TEXT,
  specifications TEXT,
  default_rental_period_days INT DEFAULT 7,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- -------------------------------------------------------------
-- PHYSICAL INVENTORY
-- -------------------------------------------------------------

CREATE TABLE inventory (
  inventory_id BIGSERIAL PRIMARY KEY,
  component_id BIGINT NOT NULL REFERENCES component_catalog(component_id),
  owner_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  inventory_code VARCHAR(50) NOT NULL UNIQUE,
  serial_number VARCHAR(100) UNIQUE,
  condition inventory_condition NOT NULL,
  status inventory_status NOT NULL DEFAULT 'AVAILABLE',
  replacement_value DECIMAL(12,2) NOT NULL CHECK (replacement_value >= 0),
  purchase_date DATE,
  description TEXT,
  current_location VARCHAR(255),
  image_url VARCHAR(500),
  added_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE inventory_accessories (
  accessory_id BIGSERIAL PRIMARY KEY,
  inventory_id BIGINT NOT NULL REFERENCES inventory(inventory_id) ON DELETE CASCADE,
  accessory_name VARCHAR(150) NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  replacement_value DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (replacement_value >= 0),
  is_required BOOLEAN NOT NULL DEFAULT false
);

-- -------------------------------------------------------------
-- LISTINGS
-- -------------------------------------------------------------

CREATE TABLE listings (
  listing_id BIGSERIAL PRIMARY KEY,
  inventory_id BIGINT NOT NULL UNIQUE REFERENCES inventory(inventory_id) ON DELETE CASCADE,
  owner_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  weekly_rent DECIMAL(12,2) NOT NULL CHECK (weekly_rent >= 0),
  minimum_duration_days INT NOT NULL CHECK (minimum_duration_days > 0),
  maximum_duration_days INT NOT NULL CHECK (maximum_duration_days >= minimum_duration_days),
  listing_title VARCHAR(200) NOT NULL,
  description TEXT,
  pickup_information VARCHAR(500),
  status listing_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE listing_images (
  listing_image_id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES listings(listing_id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  display_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- RESERVATIONS
-- -------------------------------------------------------------

CREATE TABLE reservations (
  reservation_id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES listings(listing_id) ON DELETE CASCADE,
  borrower_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL CHECK (end_date >= start_date),
  status reservation_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- -------------------------------------------------------------
-- RENTALS & STATUS HISTORY
-- -------------------------------------------------------------

CREATE TABLE rentals (
  rental_id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES listings(listing_id),
  inventory_id BIGINT NOT NULL REFERENCES inventory(inventory_id),
  owner_id BIGINT NOT NULL REFERENCES users(user_id),
  borrower_id BIGINT NOT NULL REFERENCES users(user_id),
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMP,
  start_date DATE NOT NULL,
  due_date DATE NOT NULL CHECK (due_date >= start_date),
  returned_at TIMESTAMP,
  weekly_rent DECIMAL(12,2) NOT NULL CHECK (weekly_rent >= 0),
  rental_fee DECIMAL(12,2) NOT NULL CHECK (rental_fee >= 0),
  security_deposit DECIMAL(12,2) NOT NULL CHECK (security_deposit >= 0),
  late_penalty DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (late_penalty >= 0),
  status rental_status NOT NULL DEFAULT 'REQUESTED',
  borrower_condition_notes TEXT,
  owner_condition_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP,
  CONSTRAINT chk_owner_not_borrower CHECK (owner_id <> borrower_id)
);

CREATE TABLE rental_status_history (
  history_id BIGSERIAL PRIMARY KEY,
  rental_id BIGINT NOT NULL REFERENCES rentals(rental_id) ON DELETE CASCADE,
  old_status rental_status,
  new_status rental_status NOT NULL,
  changed_by BIGINT NOT NULL REFERENCES users(user_id),
  reason VARCHAR(500),
  changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE rental_messages (
  message_id BIGSERIAL PRIMARY KEY,
  rental_id BIGINT NOT NULL REFERENCES rentals(rental_id) ON DELETE CASCADE,
  sender_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- RETURNS
-- -------------------------------------------------------------

CREATE TABLE returns (
  return_id BIGSERIAL PRIMARY KEY,
  rental_id BIGINT NOT NULL UNIQUE REFERENCES rentals(rental_id) ON DELETE CASCADE,
  received_by BIGINT NOT NULL REFERENCES users(user_id),
  returned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  condition_after_return inventory_condition NOT NULL,
  damage_found BOOLEAN NOT NULL DEFAULT false,
  missing_accessories BOOLEAN NOT NULL DEFAULT false,
  return_notes TEXT,
  owner_confirmed BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMP
);

-- -------------------------------------------------------------
-- WALLET & FINANCIAL LEDGER
-- -------------------------------------------------------------

CREATE TABLE wallets (
  wallet_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  balance DECIMAL(14,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0.00),
  currency CHAR(3) NOT NULL DEFAULT 'BDT',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE escrows (
  escrow_id BIGSERIAL PRIMARY KEY,
  rental_id BIGINT NOT NULL UNIQUE REFERENCES rentals(rental_id) ON DELETE CASCADE,
  borrower_id BIGINT NOT NULL REFERENCES users(user_id),
  owner_id BIGINT NOT NULL REFERENCES users(user_id),
  original_amount DECIMAL(14,2) NOT NULL CHECK (original_amount >= 0),
  held_amount DECIMAL(14,2) NOT NULL CHECK (held_amount >= 0),
  released_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00 CHECK (released_amount >= 0),
  deducted_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00 CHECK (deducted_amount >= 0),
  status escrow_status NOT NULL DEFAULT 'PENDING',
  locked_at TIMESTAMP,
  released_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE wallet_transactions (
  wallet_transaction_id BIGSERIAL PRIMARY KEY,
  wallet_id BIGINT NOT NULL REFERENCES wallets(wallet_id) ON DELETE CASCADE,
  rental_id BIGINT REFERENCES rentals(rental_id) ON DELETE SET NULL,
  escrow_id BIGINT REFERENCES escrows(escrow_id) ON DELETE SET NULL,
  transaction_type transaction_type NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  status transaction_status NOT NULL DEFAULT 'PENDING',
  reference_code VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE escrow_transactions (
  escrow_transaction_id BIGSERIAL PRIMARY KEY,
  escrow_id BIGINT NOT NULL REFERENCES escrows(escrow_id) ON DELETE CASCADE,
  transaction_type transaction_type NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  performed_by BIGINT NOT NULL REFERENCES users(user_id),
  reference_code VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- DAMAGE REPORTS & EVIDENCE
-- -------------------------------------------------------------

CREATE TABLE damage_reports (
  damage_report_id BIGSERIAL PRIMARY KEY,
  rental_id BIGINT NOT NULL REFERENCES rentals(rental_id) ON DELETE CASCADE,
  inventory_id BIGINT NOT NULL REFERENCES inventory(inventory_id),
  reported_by BIGINT NOT NULL REFERENCES users(user_id),
  damage_type damage_type NOT NULL,
  description TEXT,
  estimated_cost DECIMAL(12,2) NOT NULL CHECK (estimated_cost >= 0),
  approved_cost DECIMAL(12,2) CHECK (approved_cost >= 0),
  status damage_status NOT NULL DEFAULT 'REPORTED',
  reported_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE TABLE damage_evidence (
  evidence_id BIGSERIAL PRIMARY KEY,
  damage_report_id BIGINT NOT NULL REFERENCES damage_reports(damage_report_id) ON DELETE CASCADE,
  uploaded_by BIGINT NOT NULL REFERENCES users(user_id),
  file_url VARCHAR(500) NOT NULL,
  description VARCHAR(255),
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- DISPUTES & MESSAGES
-- -------------------------------------------------------------

CREATE TABLE disputes (
  dispute_id BIGSERIAL PRIMARY KEY,
  rental_id BIGINT NOT NULL REFERENCES rentals(rental_id) ON DELETE CASCADE,
  opened_by BIGINT NOT NULL REFERENCES users(user_id),
  against_user_id BIGINT NOT NULL REFERENCES users(user_id),
  reason dispute_reason NOT NULL,
  description TEXT,
  requested_amount DECIMAL(12,2) CHECK (requested_amount >= 0),
  status dispute_status NOT NULL DEFAULT 'OPEN',
  evidence_url TEXT,
  opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolved_by BIGINT REFERENCES users(user_id),
  resolution_notes TEXT
);

CREATE TABLE dispute_messages (
  message_id BIGSERIAL PRIMARY KEY,
  dispute_id BIGINT NOT NULL REFERENCES disputes(dispute_id) ON DELETE CASCADE,
  sender_id BIGINT NOT NULL REFERENCES users(user_id),
  message TEXT NOT NULL,
  file_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- WAITLIST
-- -------------------------------------------------------------

CREATE TABLE waitlist (
  waitlist_id BIGSERIAL PRIMARY KEY,
  component_id BIGINT NOT NULL REFERENCES component_catalog(component_id) ON DELETE CASCADE,
  borrower_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  requested_start_date DATE,
  requested_duration_days INT,
  status waitlist_status NOT NULL DEFAULT 'WAITING',
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  notified_at TIMESTAMP,
  fulfilled_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  CONSTRAINT uq_waitlist_item UNIQUE (component_id, borrower_id, status)
);

-- -------------------------------------------------------------
-- REVIEWS
-- -------------------------------------------------------------

CREATE TABLE reviews (
  review_id BIGSERIAL PRIMARY KEY,
  rental_id BIGINT NOT NULL REFERENCES rentals(rental_id) ON DELETE CASCADE,
  reviewer_id BIGINT NOT NULL REFERENCES users(user_id),
  reviewee_id BIGINT NOT NULL REFERENCES users(user_id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  status review_status NOT NULL DEFAULT 'PUBLISHED',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- -------------------------------------------------------------
-- NOTIFICATIONS
-- -------------------------------------------------------------

CREATE TABLE notifications (
  notification_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  related_rental_id BIGINT REFERENCES rentals(rental_id) ON DELETE SET NULL,
  related_dispute_id BIGINT REFERENCES disputes(dispute_id) ON DELETE SET NULL,
  related_waitlist_id BIGINT REFERENCES waitlist(waitlist_id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  read_at TIMESTAMP
);

-- -------------------------------------------------------------
-- AUDIT LOG
-- -------------------------------------------------------------

CREATE TABLE audit_logs (
  audit_log_id BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id BIGINT,
  old_values TEXT,
  new_values TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- MAINTENANCE
-- -------------------------------------------------------------

CREATE TABLE maintenance_records (
  maintenance_id BIGSERIAL PRIMARY KEY,
  inventory_id BIGINT NOT NULL REFERENCES inventory(inventory_id) ON DELETE CASCADE,
  reported_by BIGINT NOT NULL REFERENCES users(user_id),
  maintenance_type VARCHAR(100) NOT NULL,
  description TEXT,
  cost DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (cost >= 0),
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  notes TEXT
);
