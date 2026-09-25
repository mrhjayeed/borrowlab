import { Response } from 'express';
import { z } from 'zod';

export interface FormattedValidationIssue {
  field: string;
  message: string;
}

export interface FormattedValidationResponse {
  error: string;
  reason: string;
  issues: FormattedValidationIssue[];
  details: any;
}

// User-friendly dictionary for mapping technical field keys to clean human-readable names
const FIELD_LABELS: Record<string, string> = {
  // Inventory & Hardware
  component_id: 'Hardware Model',
  inventory_code: 'Asset Tag ID',
  serial_number: 'Serial Number',
  condition: 'Physical Condition',
  replacement_value: 'Replacement Value',
  purchase_date: 'Purchase Date',
  current_location: 'Storage Location',
  description: 'Description',
  image_url: 'Hardware Photo',
  accessories: 'Accessories',

  // Listing
  listing: 'Marketplace Listing',
  weekly_rent: 'Weekly Rental Rate',
  minimum_duration_days: 'Minimum Rental Duration',
  maximum_duration_days: 'Maximum Rental Duration',
  listing_title: 'Listing Title',
  pickup_information: 'Pickup Information',
  image_urls: 'Listing Images',

  // Catalog
  category_id: 'Hardware Category',
  manufacturer: 'Manufacturer',
  model: 'Model Code / SKU',
  component_name: 'Device Name',
  specifications: 'Specifications',
  default_rental_period_days: 'Default Rental Period',

  // Auth & User
  university_id: 'University',
  department_id: 'Department',
  student_id: 'Student ID',
  full_name: 'Full Name',
  university_email: 'University Email',
  email: 'Email Address',
  password: 'Password',
  phone: 'Phone Number',

  // Rental & Return
  listing_id: 'Listing Reference',
  start_date: 'Start Date',
  due_date: 'Due Date',
  condition_after_return: 'Return Condition',
  damage_found: 'Damage Found Flag',
  missing_accessories: 'Missing Accessories',
  return_notes: 'Return Notes',
  damage_type: 'Damage Type',
  damage_description: 'Damage Description',
  estimated_cost: 'Estimated Damage Cost',
  evidence_url: 'Evidence Image',
  evidence_description: 'Evidence Description',

  // Dispute
  rental_id: 'Rental Reference',
  reason: 'Reason',
  requested_amount: 'Requested Settlement Amount',
  resolution_notes: 'Resolution Notes',
  settlement_amount_owner: 'Settlement Amount to Owner',

  // Review
  rating: 'Rating Score',
  comment: 'Review Comment',

  // Wallet
  amount: 'Deposit Amount',

  // Maintenance
  maintenance_type: 'Maintenance Type',
  cost: 'Cost',
  notes: 'Notes',
  status: 'Status',
};

/**
 * Resolves a human-friendly field name from a Zod path
 */
export function getFieldLabel(path: Array<string | number>): string {
  if (path.length === 0) return 'Input';

  const fullPath = path.map(String).join('.');
  if (FIELD_LABELS[fullPath]) {
    return FIELD_LABELS[fullPath];
  }

  // Check last segment
  const lastKey = String(path[path.length - 1]);
  if (FIELD_LABELS[lastKey]) {
    return FIELD_LABELS[lastKey];
  }

  // Humanize underscore or camelCase identifier
  return lastKey
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Normalizes issue message to ensure the user knows which field failed and why
 */
function formatIssueMessage(fieldLabel: string, rawMessage: string): string {
  const normalizedLabel = fieldLabel.toLowerCase();
  const normalizedMsg = rawMessage.toLowerCase();

  // Handle generic Zod default errors
  if (normalizedMsg === 'required') {
    return `${fieldLabel} is required`;
  }
  if (
    normalizedMsg.includes('expected number, received') ||
    normalizedMsg.includes('expected number')
  ) {
    return `${fieldLabel} must be a valid number`;
  }
  if (
    normalizedMsg.includes('expected string, received') ||
    normalizedMsg.includes('expected string')
  ) {
    return `${fieldLabel} must be a text value`;
  }
  if (normalizedMsg.includes('expected boolean, received')) {
    return `${fieldLabel} must be true or false`;
  }

  // If the message already explicitly names the field or label, preserve it as-is
  if (normalizedMsg.includes(normalizedLabel)) {
    return rawMessage;
  }

  // Otherwise, prefix the friendly field name so the reason is immediately obvious
  return `${fieldLabel}: ${rawMessage}`;
}

/**
 * Transforms a ZodError into a comprehensive, user-informative validation payload
 */
export function formatZodError(
  error: z.ZodError,
  customTitle: string = 'Validation failed'
): FormattedValidationResponse {
  const issues: FormattedValidationIssue[] = error.issues.map((issue) => {
    const fieldPath = issue.path.map(String).join('.');
    const fieldLabel = getFieldLabel(issue.path);
    const message = formatIssueMessage(fieldLabel, issue.message);

    return {
      field: fieldPath,
      message,
    };
  });

  const reason = issues.map((i) => i.message).join('; ');
  const errorMsg = reason ? `${customTitle}: ${reason}` : customTitle;

  return {
    error: errorMsg,
    reason: reason || 'Invalid form input provided',
    issues,
    details: error.format(),
  };
}

/**
 * Helper to immediately respond with standard 400 Bad Request validation error
 */
export function sendValidationError(
  res: Response,
  error: z.ZodError,
  customTitle: string = 'Validation failed'
): void {
  res.status(400).json(formatZodError(error, customTitle));
}
