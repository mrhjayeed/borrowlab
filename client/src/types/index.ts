export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DEACTIVATED';
export type InventoryCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
export type InventoryStatus = 'AVAILABLE' | 'RESERVED' | 'RENTED' | 'MAINTENANCE' | 'DISPUTED' | 'LOST' | 'RETIRED';
export type ListingStatus = 'ACTIVE' | 'PAUSED' | 'RENTED' | 'REMOVED' | 'EXPIRED';
export type RentalStatus = 'REQUESTED' | 'APPROVED' | 'ACTIVE' | 'RETURN_PENDING' | 'RETURNED' | 'OVERDUE' | 'DISPUTED' | 'CANCELLED' | 'COMPLETED';
export type EscrowStatus = 'PENDING' | 'HELD' | 'PARTIALLY_RELEASED' | 'RELEASED' | 'FORFEITED' | 'FROZEN' | 'CANCELLED';
export type TransactionType = 'WALLET_DEPOSIT' | 'RENTAL_PAYMENT' | 'ESCROW_LOCK' | 'ESCROW_RELEASE' | 'DAMAGE_DEDUCTION' | 'LATE_PENALTY' | 'REFUND' | 'OWNER_EARNING' | 'DISPUTE_SETTLEMENT' | 'ADJUSTMENT';
export type DamageType = 'MINOR_DAMAGE' | 'MAJOR_DAMAGE' | 'MISSING_ACCESSORY' | 'LOST' | 'NON_FUNCTIONAL' | 'BURNED' | 'PHYSICAL_DAMAGE' | 'OTHER';
export type DamageStatus = 'REPORTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'SETTLED';
export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED_OWNER' | 'RESOLVED_BORROWER' | 'PARTIAL_SETTLEMENT' | 'CLOSED' | 'REJECTED';
export type DisputeReason = 'DAMAGE' | 'LOST_ITEM' | 'MISSING_ACCESSORY' | 'PRE_EXISTING_DAMAGE' | 'DEFECTIVE_ITEM' | 'INCORRECT_ITEM' | 'LATE_RETURN' | 'PAYMENT_ISSUE' | 'OTHER';
export type WaitlistStatus = 'WAITING' | 'NOTIFIED' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';

export interface User {
  userId: number;
  universityId: number;
  universityName?: string;
  universityShortName?: string;
  departmentId: number | null;
  departmentName?: string;
  departmentCode?: string;
  studentId: string;
  fullName: string;
  universityEmail: string;
  phone?: string;
  profileImageUrl?: string;
  trustScore: number;
  walletBalance?: number;
  status: UserStatus;
  roles: string[];
  activeBorrowsCount?: number;
  activeLendsCount?: number;
  lockedEscrowTotal?: number;
}

export interface University {
  university_id: number;
  name: string;
  short_name: string;
  email_domain: string;
  address?: string;
  is_active: boolean;
  departments?: Department[];
}

export interface Department {
  department_id: number;
  university_id?: number;
  name: string;
  code: string;
  is_active?: boolean;
}

export interface ComponentCategory {
  category_id: number;
  parent_category_id: number | null;
  name: string;
  description?: string;
  parent_category_name?: string;
  component_count?: number;
}

export interface ComponentCatalog {
  component_id: number;
  category_id: number;
  category_name: string;
  manufacturer?: string;
  model: string;
  component_name: string;
  description?: string;
  specifications?: string;
  default_rental_period_days: number;
  total_units?: number;
  available_units?: number;
}

export interface InventoryAccessory {
  accessory_id?: number;
  inventory_id?: number;
  accessory_name: string;
  quantity: number;
  replacement_value: number;
  is_required: boolean;
}

export interface InventoryItem {
  inventory_id: number;
  component_id: number;
  component_name: string;
  manufacturer?: string;
  model: string;
  category_name: string;
  owner_id?: number;
  owner_name?: string;
  inventory_code: string;
  serial_number?: string;
  condition: InventoryCondition;
  status: InventoryStatus;
  replacement_value: number;
  purchase_date?: string;
  current_location?: string;
  description?: string;
  image_url?: string | null;
  added_at: string;
  listing_id?: number;
  listing_status?: ListingStatus;
  weekly_rent?: number;
  accessories?: InventoryAccessory[];
}

export interface ListingAvailabilityItem {
  listing_id: number;
  listing_title: string;
  listing_description?: string;
  weekly_rent: string | number;
  daily_rent: string | number;
  inventory_image_url?: string | null;
  minimum_duration_days: number;
  maximum_duration_days: number;
  pickup_information?: string;
  listing_status: ListingStatus;
  listing_created_at: string;
  inventory_id: number;
  inventory_code: string;
  serial_number?: string;
  hardware_condition: InventoryCondition;
  inventory_status: InventoryStatus;
  replacement_value: string | number;
  current_location?: string;
  component_id: number;
  component_name: string;
  manufacturer?: string;
  model: string;
  specifications?: string;
  default_rental_period_days: number;
  category_id: number;
  category_name: string;
  parent_category_name?: string;
  primary_image_url?: string | null;
  owner_id: number;
  owner_name: string;
  owner_email: string;
  owner_trust_score: string | number;
  owner_avatar_url?: string;
  university_name: string;
  university_short_name: string;
  department_name?: string;
  department_code?: string;
  owner_review_count: number;
  owner_avg_rating: string | number;
  active_rental_id?: number;
  active_rental_status?: string;
  active_rental_due_date?: string;
  current_borrower_id?: number;
  active_reservation_id?: number;
  reservation_start_date?: string;
  reservation_end_date?: string;
  availability_status: string;
  is_rentable: boolean;
  images?: { listing_image_id: number; image_url: string; display_order: number }[];
  accessories?: InventoryAccessory[];
  recentReviews?: any[];
}

export interface Rental {
  rental_id: number;
  listing_id: number;
  listing_title: string;
  inventory_id: number;
  inventory_code: string;
  component_id?: number;
  component_name: string;
  manufacturer?: string;
  model?: string;
  owner_id: number;
  owner_name: string;
  borrower_id: number;
  borrower_name: string;
  start_date: string;
  due_date: string;
  returned_at?: string;
  weekly_rent: string | number;
  rental_fee: string | number;
  security_deposit: string | number;
  late_penalty: string | number;
  status: RentalStatus;
  requested_at: string;
  approved_at?: string;
  expires_at?: string;
  escrow_id?: number;
  escrow_status?: EscrowStatus;
  escrow_held_amount?: string | number;
  return_id?: number;
  condition_after_return?: InventoryCondition;
  damage_found?: boolean;
  my_review?: {
    review_id: number;
    rating: number;
    comment: string;
    created_at: string;
  } | null;
  peer_review?: {
    review_id: number;
    rating: number;
    comment: string;
    reviewer_name?: string;
    created_at: string;
  } | null;
  messages?: RentalMessage[];
}

export interface RentalMessage {
  message_id: number;
  rental_id: number;
  sender_id: number;
  sender_name: string;
  sender_roles?: string[];
  message: string;
  created_at: string;
}

export interface Wallet {
  wallet_id: number;
  user_id: number;
  balance: string | number;
  currency: string;
  is_active: boolean;
  total_escrow_locked: string | number;
  total_earnings: string | number;
}

export interface WalletTransaction {
  wallet_transaction_id: number;
  wallet_id: number;
  rental_id?: number;
  escrow_id?: number;
  transaction_type: TransactionType;
  amount: string | number;
  status: string;
  reference_code: string;
  description?: string;
  created_at: string;
  completed_at?: string;
  listing_title?: string;
}

export interface Escrow {
  escrow_id: number;
  rental_id: number;
  listing_id: number;
  listing_title: string;
  inventory_code: string;
  component_name: string;
  borrower_id: number;
  borrower_name: string;
  owner_id: number;
  owner_name: string;
  original_amount: string | number;
  held_amount: string | number;
  released_amount: string | number;
  deducted_amount: string | number;
  status: EscrowStatus;
  locked_at: string;
  released_at?: string;
  transactions?: any[];
}

export interface Dispute {
  dispute_id: number;
  rental_id: number;
  listing_title: string;
  component_name: string;
  opened_by: number;
  opened_by_name: string;
  against_user_id: number;
  against_user_name: string;
  reason: DisputeReason;
  description: string;
  requested_amount: string | number;
  status: DisputeStatus;
  evidence_url?: string;
  opened_at: string;
  resolved_at?: string;
  resolved_by_name?: string;
  resolution_notes?: string;
  escrow_held_amount?: string | number;
  message_count?: number;
  messages?: DisputeMessage[];
}

export interface DisputeMessage {
  message_id: number;
  dispute_id: number;
  sender_id: number;
  sender_name: string;
  sender_roles: string[];
  message: string;
  file_url?: string;
  created_at: string;
}

export interface DamageReport {
  damage_report_id: number;
  rental_id: number;
  listing_title: string;
  inventory_code: string;
  component_name: string;
  reported_by: number;
  reported_by_name: string;
  owner_name: string;
  borrower_name: string;
  damage_type: DamageType;
  description: string;
  estimated_cost: string | number;
  approved_cost?: string | number;
  status: DamageStatus;
  reported_at: string;
  resolved_at?: string;
  evidence?: { evidence_id: number; file_url: string; description?: string }[];
}

export interface NotificationItem {
  notification_id: number;
  user_id: number;
  notification_type: string;
  title: string;
  message: string;
  related_rental_id?: number;
  related_dispute_id?: number;
  related_waitlist_id?: number;
  is_read: boolean;
  created_at: string;
}

export interface WaitlistItem {
  waitlist_id: number;
  component_id: number;
  component_name: string;
  manufacturer?: string;
  model: string;
  category_name: string;
  requested_start_date?: string;
  requested_duration_days: number;
  status: WaitlistStatus;
  joined_at: string;
  queue_position?: number;
}
