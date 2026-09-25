const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export interface ApiIssue {
  field?: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  data: any;
  reason?: string;
  issues?: ApiIssue[];

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.reason = data?.reason;
    this.issues = data?.issues;
  }
}

export const getAuthToken = (): string | null => {
  return localStorage.getItem('borrowlab_token');
};

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('borrowlab_token', token);
  } else {
    localStorage.removeItem('borrowlab_token');
  }
};

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // 1. Extract specific reason from data.reason, data.issues, or data.details
    let reason = typeof data.reason === 'string' && data.reason.trim() ? data.reason.trim() : '';

    const issues: ApiIssue[] = Array.isArray(data.issues) ? data.issues : [];

    if (!reason && issues.length > 0) {
      reason = issues
        .map((i: any) => (i?.message ? String(i.message) : String(i)))
        .filter(Boolean)
        .join('; ');
    }

    // Fallback: If reason still not found, inspect details object (e.g. Zod format tree)
    if (!reason && data.details && typeof data.details === 'object') {
      const extracted: string[] = [];
      const extractErrors = (obj: any, prefix = '') => {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj._errors) && obj._errors.length > 0) {
          const field = prefix ? prefix.replace(/_/g, ' ') : '';
          extracted.push(field ? `${field}: ${obj._errors.join(', ')}` : obj._errors.join(', '));
        }
        for (const key of Object.keys(obj)) {
          if (key !== '_errors') {
            extractErrors(obj[key], prefix ? `${prefix}.${key}` : key);
          }
        }
      };
      extractErrors(data.details);
      if (extracted.length > 0) {
        reason = extracted.join('; ');
      }
    }

    // 2. Build descriptive error message
    let rawError = typeof data.error === 'string' && data.error.trim() ? data.error.trim() : '';

    let errorMsg = '';
    if (rawError && reason) {
      if (rawError.toLowerCase().includes(reason.toLowerCase())) {
        errorMsg = rawError;
      } else if (rawError.toLowerCase() === 'validation failed') {
        errorMsg = `Validation failed: ${reason}`;
      } else {
        errorMsg = `${rawError}: ${reason}`;
      }
    } else if (rawError) {
      errorMsg = rawError;
    } else if (reason) {
      errorMsg = `Validation failed: ${reason}`;
    } else {
      errorMsg = 'An unexpected error occurred';
    }

    throw new ApiError(errorMsg, response.status, {
      ...data,
      reason: reason || undefined,
      issues: issues.length ? issues : undefined,
    });
  }

  return data as T;
}

export const api = {
  // Auth
  getDemoUsers: () => request<{ users: any[] }>('/auth/demo-users'),
  switchPersona: (userId: number) => request<{ token: string; user: any }>('/auth/switch-persona', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  }),
  login: (credentials: any) => request<{ token: string; user: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  register: (payload: any) => request<{ token: string; user: any }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getMe: () => request<{ user: any }>('/auth/me'),
  updateProfile: (payload: {
    full_name?: string;
    phone?: string | null;
    department_id?: number | null;
    profile_image_url?: string | null;
    student_id?: string;
    current_password?: string;
    new_password?: string;
  }) =>
    request<{ user: any; message: string }>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getDeletionEligibility: () =>
    request<{
      canDelete: boolean;
      blockers: string[];
      activeRentalsCount: number;
      activeRentals: any[];
      escrowLockedTotal: number;
      activeListingsCount: number;
      availableInventoryCount: number;
    }>('/auth/me/deletion-eligibility'),
  deleteAccount: (payload?: { password?: string; confirmation?: string }) =>
    request<{ success: boolean; message: string }>('/auth/me', {
      method: 'DELETE',
      body: JSON.stringify(payload || {}),
    }),

  // Universities & Departments
  getUniversities: () => request<{ universities: any[] }>('/universities'),

  // Catalog
  getCategories: () => request<{ categories: any[] }>('/catalog/categories'),
  getComponents: (params?: { category_id?: string | number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.category_id) q.set('category_id', String(params.category_id));
    if (params?.search) q.set('search', params.search);
    return request<{ components: any[] }>(`/catalog/components?${q.toString()}`);
  },
  getComponentDetail: (id: number | string) => request<{ component: any }>(`/catalog/components/${id}`),
  createComponent: (payload: {
    category_id: number;
    manufacturer?: string;
    model: string;
    component_name: string;
    description?: string;
    specifications?: string;
    default_rental_period_days?: number;
  }) => request<{ component: any }>('/catalog/components', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  createCategory: (payload: { name: string; description?: string }) =>
    request<{ category: any }>('/catalog/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Inventory
  getMyInventory: () => request<{ inventory: any[] }>('/inventory/my'),
  getInventoryDetail: (id: number | string) => request<{ item: any }>(`/inventory/${id}`),
  createInventory: (payload: any) => request<{ item: any; listing?: any }>('/inventory', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateInventory: (id: number | string, payload: any) => request<{ item: any }>(`/inventory/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),

  // Upload
  uploadImage: async (file: File): Promise<{ url: string; filename: string; size: number; mimetype: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(data.error || 'Failed to upload image file', response.status, data);
    }
    return data;
  },

  // Listings & Marketplace
  getListings: (params?: Record<string, any>) => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
      });
    }
    return request<{ listings: any[]; total: number }>(`/listings?${q.toString()}`);
  },
  getMyListings: () => request<{ listings: any[] }>('/listings/my'),
  getListingDetail: (id: number | string) => request<{ listing: any }>(`/listings/${id}`),
  createListing: (payload: any) => request<{ listing: any }>('/listings', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateListing: (id: number | string, payload: any) => request<{ listing: any }>(`/listings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),

  // Reservations
  createReservation: (payload: { listing_id: number; start_date: string; end_date: string }) =>
    request<{ reservation: any }>('/reservations', { method: 'POST', body: JSON.stringify(payload) }),
  getMyReservations: () => request<{ reservations: any[] }>('/reservations/my'),
  cancelReservation: (id: number | string) => request(`/reservations/${id}`, { method: 'DELETE' }),

  // Rentals
  requestRental: (payload: { listing_id: number; start_date: string; due_date: string; borrower_condition_notes?: string }) =>
    request<{ rental: any }>('/rentals/request', { method: 'POST', body: JSON.stringify(payload) }),
  approveRental: (id: number | string) => request<{ rental: any }>(`/rentals/${id}/approve`, { method: 'POST' }),
  rejectRental: (id: number | string) => request<{ rental: any }>(`/rentals/${id}/reject`, { method: 'POST' }),
  cancelRental: (id: number | string, reason?: string) =>
    request<{ message: string; rental: any }>(`/rentals/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  activateRental: (id: number | string) => request<{ message: string; rental: any }>(`/rentals/${id}/activate`, { method: 'POST' }),
  requestReturn: (id: number | string) => request<{ rental: any }>(`/rentals/${id}/request-return`, { method: 'POST' }),
  confirmReturn: (id: number | string, payload: any) => request<{ message: string; result: any }>(`/rentals/${id}/confirm-return`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getMyRentals: (role?: 'borrower' | 'owner') =>
    request<{ rentals: any[] }>(`/rentals/my${role ? `?role=${role}` : ''}`),
  getRentalDetail: (id: number | string) => request<{ rental: any }>(`/rentals/${id}`),
  getRentalMessages: (rentalId: number | string) => request<{ messages: any[] }>(`/rentals/${rentalId}/messages`),
  sendRentalMessage: (rentalId: number | string, message: string) =>
    request<{ message: any }>(`/rentals/${rentalId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  // Wallet
  getWallet: () => request<{ wallet: any }>('/wallet'),
  depositWallet: (amount: number, description?: string) => request<{ message: string; result: any }>('/wallet/deposit', {
    method: 'POST',
    body: JSON.stringify({ amount, description }),
  }),
  getTransactions: (params?: { type?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set('type', params.type);
    if (params?.status) q.set('status', params.status);
    return request<{ transactions: any[] }>(`/wallet/transactions?${q.toString()}`);
  },

  // Escrow
  getMyEscrows: () => request<{ escrows: any[] }>('/escrow/my'),
  getEscrowDetail: (id: number | string) => request<{ escrow: any }>(`/escrow/${id}`),

  // Damage Reports
  createDamageReport: (payload: any) => request<{ report: any }>('/damage', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getDamageQueue: (params?: Record<string, any>) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')).toString() : '';
    return request<{ reports: any[] }>(`/damage/queue${qs ? `?${qs}` : ''}`);
  },
  reviewDamageReport: (id: number | string, payload: { status: string; approved_cost?: number }) =>
    request<{ report: any }>(`/damage/${id}/review`, { method: 'PUT', body: JSON.stringify(payload) }),

  // Disputes
  createDispute: (payload: any) => request<{ dispute: any }>('/disputes', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getMyDisputes: (params?: Record<string, any>) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')).toString() : '';
    return request<{ disputes: any[] }>(`/disputes/my${qs ? `?${qs}` : ''}`);
  },
  getDisputeQueue: (params?: Record<string, any>) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')).toString() : '';
    return request<{ disputes: any[] }>(`/disputes/queue${qs ? `?${qs}` : ''}`);
  },
  getDisputeDetail: (id: number | string) => request<{ dispute: any }>(`/disputes/${id}`),
  postDisputeMessage: (id: number | string, message: string, file_url?: string) => request<{ message: any }>(`/disputes/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message, file_url }),
  }),
  resolveDispute: (id: number | string, payload: { status: string; settlement_amount_owner: number; resolution_notes: string }) =>
    request<{ message: string; dispute: any }>(`/disputes/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Reviews
  createReview: (payload: { rental_id: number; rating: number; comment: string }) =>
    request<{ review: any }>('/reviews', { method: 'POST', body: JSON.stringify(payload) }),
  updateReview: (reviewId: number | string, payload: { rating: number; comment: string }) =>
    request<{ review: any }>(`/reviews/${reviewId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteReview: (reviewId: number | string) =>
    request<{ message: string; review_id: number }>(`/reviews/${reviewId}`, { method: 'DELETE' }),
  getUserReviews: (userId: number | string) => request<{ reviews: any[] }>(`/reviews/user/${userId}`),

  // Waitlist
  joinWaitlist: (payload: { component_id: number; requested_start_date?: string; requested_duration_days?: number }) =>
    request<{ waitlist: any }>('/waitlist', { method: 'POST', body: JSON.stringify(payload) }),
  getMyWaitlist: () => request<{ waitlist: any[] }>('/waitlist/my'),
  leaveWaitlist: (id: number | string) => request(`/waitlist/${id}`, { method: 'DELETE' }),

  // Notifications
  getNotifications: () => request<{ notifications: any[]; unreadCount: number }>('/notifications'),
  markNotificationRead: (id: number | string) => request<{ notification: any }>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request<{ message: string }>('/notifications/read-all', { method: 'PUT' }),

  // Admin & Analytics
  getAdminOverview: () => request<{ overview: any }>('/admin/overview'),
  getHardwarePopularity: () => request<{ queryDescription: string; categories: any[] }>('/admin/analytics/hardware-popularity'),
  getDepartmentRevenue: () => request<{ queryDescription: string; departments: any[] }>('/admin/analytics/department-revenue'),
  getHighTrustStudents: () => request<{ queryDescription: string; students: any[] }>('/admin/analytics/high-trust-students'),
  getPristineHardware: () => request<{ queryDescription: string; pristineComponents: any[] }>('/admin/analytics/pristine-hardware'),
  getUnbookedListings: () => request<{ queryDescription: string; unbookedListings: any[] }>('/admin/analytics/unbooked-listings'),
  getExplainIndex: () => request<any>('/admin/analytics/explain-index'),
  getAdminUsers: (params?: { status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    return request<{ users: any[] }>(`/admin/users?${q.toString()}`);
  },
  updateUserStatus: (id: number | string, status: string) =>
    request<{ user: any }>(`/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getAuditLogs: (params?: { action?: string; entity_type?: string; search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.action) q.set('action', params.action);
    if (params?.entity_type) q.set('entity_type', params.entity_type);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return request<{ logs: any[]; total: number; page: number; limit: number; totalPages: number }>(`/admin/audit-logs?${q.toString()}`);
  },
};
