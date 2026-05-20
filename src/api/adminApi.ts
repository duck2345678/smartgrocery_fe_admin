import { apiClient } from './apiClient';

export type AuthUser = {
  id: number;
  email: string;
  fullName: string | null;
  roleName: string | null;
};

export type AuthResponse = {
  token: string;
  refreshToken: string;
  user: AuthUser;
};

export type AuditLog = {
  id: number;
  actorId: number;
  actorName: string | null;
  actionType: string;
  entityType: string;
  entityId: number;
  reason: string;
  beforeState: unknown;
  afterState: unknown;
  createdAt: string;
};

export type Page<T> = {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type OpsOrder = {
  orderId: number;
  orderNumber: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  leaseExpiresAt: string | null;
  minutesToSla: number | null;
  minutesSinceUpdate: number | null;
};

export type OpsMonitor = {
  stagnantOrders: OpsOrder[];
  stalledStaffOrders: OpsOrder[];
};

export type Issue = {
  id: number;
  orderId: number | null;
  orderItemId: number | null;
  reporterId: number | null;
  reporterName: string | null;
  issueType: string;
  status: string;
  createdAt: string;
  details?: Record<string, unknown> | null;
};

export type ResolveType = 'SUBSTITUTE' | 'PARTIAL' | 'CANCEL_LINE' | 'CANCEL_ORDER';

export type ResolveIssuePayload = {
  resolutionType: ResolveType;
  releaseOrder?: boolean;
  resolutionNotes?: string;
  substituteProductId?: number;
  partialQuantity?: number;
};

export type SubstitutionOption = {
  variantId: number;
  name: string;
  price: number;
  stock: number;
  isRecommended: boolean;
};

export type Category = {
  id: number;
  categoryCode: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  parentCategory?: { id: number } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Product = {
  id: number;
  productCode: string;
  name: string;
  status: string | null;
  image: string | null;
  originCountry?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  isFeatured?: boolean | null;
  category?: { id: number; name: string } | null;
  variants?: Array<{
    id: number;
    sku: string;
    barcode: string | null;
    variantName: string | null;
    color?: string | null;
    size?: string | null;
    unit?: string | null;
    netPrice: number | null;
    compareAtPrice?: number | null;
    flashSaleEndsAt?: string | null;
    status?: string | null;
    stock?: number | null;
    aisleLocation?: string | null;
  }>;
};

export type AdminProductSummary = {
  totalCount: number;
  activeCount: number;
  hiddenCount: number;
  deletedCount: number;
};

export type ProductVariantPayload = {
  id?: number;
  sku: string;
  barcode?: string;
  variantName?: string;
  color?: string;
  size?: string;
  unit?: string;
  netPrice: number;
  stock: number;
  status?: string;
};

export type InventoryStock = {
  id: number;
  warehouseId: number;
  warehouseName: string;
  variantId: number;
  variantName: string;
  productName: string;
  availableQuantity: number;
  reservedQuantity: number;
};

export type Warehouse = {
  id: number;
  code: string;
  name: string;
  location: string | null;
};

export type Supplier = {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email?: string | null;
  address?: string | null;
};

export type PurchaseOrder = {
  id: number;
  supplierId: number | null;
  supplierName: string | null;
  poNumber: string | null;
  totalAmount: number | null;
  status: string | null;
  createdAt: string | null;
  items?: Array<{
    variantId: number;
    id?: number;
    variantName?: string | null;
    productName?: string | null;
    quantity: number;
    unitPrice: number;
    subtotal?: number;
  }>;
};

export type PromotionCampaign = {
  id: number;
  campaignCode: string;
  campaignName: string;
  campaignType: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
};

export type VoucherDto = {
  id: number;
  voucherCode: string;
  discountType: 'FIXED_AMOUNT' | 'PERCENT';
  discountValue: number;
  minOrderAmount: number | null;
  validFrom: string | null;
  validUntil: string | null;
  usageLimitPerVoucher: number;
  usedCount: number;
  status: string;
  hidden?: boolean;
  revealTrigger?: string;
  assignedUserId?: number | null;
  unlockedByOrderId?: number | null;
};

export type VoucherGenerationRequest = {
  quantity: number;
  prefix: string;
  discountType: 'FIXED_AMOUNT' | 'PERCENT';
  discountValue: number;
  minOrderAmount?: number;
  validUntil: string;
  usageLimitPerVoucher: number;
  hidden?: boolean;
  revealTrigger?: string;
};

export type AdminProductDiscountRequest = {
  variantIds: number[];
  discountPercentage?: number;
  newNetPrice?: number;
  flashSaleEndsAt?: string;
};

export type Neo4jHealth = {
  ok: boolean;
  productNodeCount: number;
  checkedAt: string;
};

export type SyncResult = {
  ok: boolean;
  syncedCount: number;
};

export type TopQuery = {
  query: string;
  count: number;
};

export type AdminUser = {
  id: number;
  fullName: string | null;
  email: string;
  phone: string | null;
  roleName: string;
  status: string;
  avatarUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ShiftRequest = {
  id: number;
  staffId: number;
  staffName: string | null;
  staffEmail: string | null;
  workDate: string;
  shiftType: 'S' | 'C' | 'G';
  selectedBlocks: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  adminNote: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type OrderSummary = {
  id: number;
  orderNumber: string | null;
  status: string;
  totalAmount: number | null;
  createdAt: string | null;
};

export type OrderItemDto = {
  id: number;
  productName: string;
  variantName: string | null;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type OrderDto = {
  id: number;
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  items?: OrderItemDto[];
};

export type UserNutritionProfileDto = {
  userId: number;
  healthGoals?: string;
  dietaryPreference?: string;
  allergies?: string;
  height?: number;
  weight?: number;
  bmi?: number;
};

export type UserAddressDto = {
  id: number;
  addressType: string;
  receiverName: string;
  receiverPhone: string;
  streetAddress: string;
  ward: string;
  district: string;
  city: string;
  isDefault: boolean;
};

export type CustomerAnalyticsDto = {
  totalSpent: number;
  orderCount: number;
  cancelRate: number;
  vipStatus: string;
};

export type AdminShiftRequestItemDto = {
  id: number;
  userId: number;
  userFullName: string | null;
  workDate: string;
  shiftType: string;
  selectedBlocks: string | null;
  status: string;
  adminNote: string | null;
  scheduledCount: number;
  scheduledAfterApprove: number;
  createdAt: string;
};

export type AttendanceMonthlyStatsDto = {
  year: number;
  month: number;
  totalShifts: number;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  attendanceRate: number;
  details?: unknown[];
};

export type AttendanceInsightDto = {
  totalStaff: number;
  activeToday: number;
  pendingRequests: number;
  topPerformers: Array<{ userId: number; name: string; score: number }>;
};

const toNumber = (v: unknown): number => {
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const unwrap = <T>(value: unknown): T => {
  if (value && typeof value === 'object' && 'data' in value) {
    return (value as { data: T }).data;
  }
  return value as T;
};

const normalizeRoleName = (value: unknown): string => {
  const raw = Array.isArray(value) ? value[0] : value;
  const role = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  if (role === 'ADMIN' || role === 'ROLE_ADMIN') return 'ADMIN';
  if (role === 'STAFF' || role === 'ROLE_STAFF') return 'STAFF';
  if (role === 'CUSTOMER' || role === 'ROLE_CUSTOMER') return 'CUSTOMER';
  return role;
};

export const adminApi = {
  auth: {
    login: async (email: string, password: string): Promise<AuthResponse> => {
      const response = await apiClient.post('/api/v1/auth/login', { email, password });
      const payload = unwrap<AuthResponse>(response);
      return {
        ...payload,
        user: {
          ...payload.user,
          roleName: normalizeRoleName(payload.user?.roleName),
        },
      };
    },
    register: async (payload: { email: string; password: string; fullName: string; phone: string }): Promise<AuthResponse> => {
      return (await apiClient.post('/api/v1/auth/register', payload)) as AuthResponse;
    },
    logout: async (refreshToken: string): Promise<void> => {
      await apiClient.post('/api/v1/auth/logout', { refreshToken });
    },
  },

  auditLogs: {
    search: async (params: {
      actorId?: number;
      actionType?: string;
      entityType?: string;
      entityId?: number;
      fromAt?: string;
      toAt?: string;
      page?: number;
      size?: number;
    }): Promise<Page<AuditLog>> => {
      return (await apiClient.get('/api/v1/admin/audit-logs', { params })) as Page<AuditLog>;
    },
  },

  ops: {
    monitor: async (): Promise<OpsMonitor> => {
      return (await apiClient.get('/api/v1/admin/ops/monitor')) as OpsMonitor;
    },
    forceRelease: async (orderId: number, reason: string): Promise<OpsOrder> => {
      return (await apiClient.post(`/api/v1/admin/orders/${orderId}/force-release`, { reason })) as OpsOrder;
    },
    emergencyAssign: async (orderId: number, staffId: number, reason: string): Promise<OpsOrder> => {
      return (await apiClient.post(`/api/v1/admin/orders/${orderId}/emergency-assign`, { staffId, reason })) as OpsOrder;
    },
  },

  issues: {
    open: async (): Promise<Issue[]> => {
      const res = (await apiClient.get('/api/v1/admin/issues')) as unknown;
      return Array.isArray(res) ? (res as Issue[]) : [];
    },
    detail: async (id: number): Promise<Issue> => {
      return (await apiClient.get(`/api/v1/admin/issues/${id}`)) as Issue;
    },
    substitutions: async (id: number, q?: string): Promise<SubstitutionOption[]> => {
      const res = (await apiClient.get(`/api/v1/admin/issues/${id}/substitutions`, { params: q ? { q } : undefined })) as unknown;
      const list = Array.isArray(res) ? res : [];
      return list.map((x) => {
        const o = x as Record<string, unknown>;
        return {
          variantId: toNumber(o.variantId),
          name: String(o.name ?? ''),
          price: toNumber(o.price),
          stock: toNumber(o.stock),
          isRecommended: Boolean(o.isRecommended),
        };
      });
    },
    resolve: async (id: number, payload: ResolveIssuePayload): Promise<Issue> => {
      return (await apiClient.post(`/api/v1/admin/issues/${id}/resolve`, payload)) as Issue;
    },
  },

  categories: {
    list: async (): Promise<Category[]> => {
      const res = (await apiClient.get('/api/v1/categories')) as unknown;
      return Array.isArray(res) ? (res as Category[]) : [];
    },
    create: async (payload: {
      categoryCode: string;
      name: string;
      description?: string;
      sortOrder?: number;
      isActive?: boolean;
      parentCategoryId?: number;
    }): Promise<Category> => {
      return (await apiClient.post('/api/v1/admin/categories', payload)) as Category;
    },
    update: async (
      id: number,
      payload: {
        categoryCode?: string;
        name?: string;
        description?: string;
        sortOrder?: number;
        isActive?: boolean;
        parentCategoryId?: number | null;
      }
    ): Promise<Category> => {
      return (await apiClient.put(`/api/v1/admin/categories/${id}`, payload)) as Category;
    },
    deactivate: async (id: number): Promise<Category> => {
      return (await apiClient.delete(`/api/v1/admin/categories/${id}`)) as Category;
    },
  },

  products: {
    list: async (page: number, size: number, filters?: { search?: string; categoryId?: number; status?: string }): Promise<Page<Product>> => {
      const params: Record<string, unknown> = { page, size };
      if (filters?.search) params.search = filters.search;
      if (filters?.categoryId) params.categoryId = filters.categoryId;
      if (filters?.status) params.status = filters.status;
      return (await apiClient.get('/api/v1/admin/products', { params })) as Page<Product>;
    },
    adminList: async (params: {
      search?: string;
      categoryId?: number;
      status?: string;
      discounted?: boolean;
      page?: number;
      size?: number;
    }): Promise<Page<Product>> => {
      return (await apiClient.get('/api/v1/admin/products', { params })) as Page<Product>;
    },
    createOrUpdateMultipart: async (
      mode: 'create' | 'update',
      payload: {
        productId?: number;
        productCode: string;
        name: string;
        categoryId: number;
        shortDescription?: string;
        description?: string;
        originCountry?: string;
        status?: string;
        isFeatured?: boolean;
        sku: string;
        barcode?: string;
        variantName?: string;
        color?: string;
        size?: string;
        unit?: string;
        netPrice: number;
        stock: number;
        variants?: ProductVariantPayload[];
        image?: File | null;
      }
    ): Promise<Product> => {
      const form = new FormData();
      form.set('productCode', payload.productCode);
      form.set('name', payload.name);
      form.set('categoryId', String(payload.categoryId));
      if (payload.shortDescription != null) form.set('shortDescription', payload.shortDescription);
      if (payload.description != null) form.set('description', payload.description);
      if (payload.originCountry != null) form.set('originCountry', payload.originCountry);
      if (payload.status != null) form.set('status', payload.status);
      if (payload.isFeatured != null) form.set('isFeatured', String(payload.isFeatured));
      form.set('sku', payload.sku);
      if (payload.barcode != null) form.set('barcode', payload.barcode);
      if (payload.variantName != null) form.set('variantName', payload.variantName);
      if (payload.color != null) form.set('color', payload.color);
      if (payload.size != null) form.set('size', payload.size);
      if (payload.unit != null) form.set('unit', payload.unit);
      form.set('netPrice', String(payload.netPrice));
      form.set('stock', String(payload.stock));
      if (payload.variants) form.set('variantsJson', JSON.stringify(payload.variants));
      if (payload.image) form.set('image', payload.image);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (mode === 'create') {
        return (await apiClient.post('/api/v1/admin/products', form, config)) as Product;
      }
      if (!payload.productId) throw new Error('Thiếu productId');
      return (await apiClient.put(`/api/v1/admin/products/${payload.productId}`, form, config)) as Product;
    },
    deactivate: async (productId: number): Promise<void> => {
      await apiClient.patch(`/api/v1/admin/products/${productId}/deactivate`);
    },
    setStatus: async (id: number, status: 'ACTIVE' | 'HIDDEN', reason?: string): Promise<Product> => {
      return (await apiClient.patch(`/api/v1/admin/products/${id}/status`, { status, reason })) as Product;
    },
    softDelete: async (id: number, reason?: string): Promise<Product> => {
      return (await apiClient.delete(`/api/v1/admin/products/${id}`, { data: { reason } })) as Product;
    },
    restore: async (id: number, reason?: string): Promise<Product> => {
      return (await apiClient.post(`/api/v1/admin/products/${id}/restore`, { reason })) as Product;
    },
    exportExcel: async (params: { search?: string; categoryId?: number; status?: string }): Promise<Blob> => {
      return (await apiClient.get('/api/v1/admin/products/export', { params, responseType: 'blob' })) as Blob;
    },
    getSummary: async (): Promise<AdminProductSummary> => {
      return (await apiClient.get('/api/v1/admin/products/summary')) as AdminProductSummary;
    },
    cleanup: async (): Promise<string> => {
      return (await apiClient.post('/api/v1/admin/products/cleanup')) as string;
    },
  },

  inventory: {
    listAll: async (): Promise<InventoryStock[]> => {
      const res = (await apiClient.get('/api/admin/inventory')) as unknown;
      return Array.isArray(res) ? (res as InventoryStock[]) : [];
    },
    byWarehouse: async (warehouseId: number): Promise<InventoryStock[]> => {
      const res = (await apiClient.get(`/api/admin/inventory/warehouse/${warehouseId}`)) as unknown;
      return Array.isArray(res) ? (res as InventoryStock[]) : [];
    },
  },

  warehouses: {
    list: async (): Promise<Warehouse[]> => {
      const res = (await apiClient.get('/api/admin/warehouses')) as unknown;
      return Array.isArray(res) ? (res as Warehouse[]) : [];
    },
    create: async (payload: { code: string; name: string; location?: string }): Promise<Warehouse> => {
      return (await apiClient.post('/api/admin/warehouses', payload)) as Warehouse;
    },
  },

  suppliers: {
    list: async (): Promise<Supplier[]> => {
      const res = (await apiClient.get('/api/admin/suppliers')) as unknown;
      return Array.isArray(res) ? (res as Supplier[]) : [];
    },
    create: async (payload: { name: string; contactPerson?: string; phone?: string; email?: string; address?: string }): Promise<Supplier> => {
      return (await apiClient.post('/api/admin/suppliers', payload)) as Supplier;
    },
  },

  purchaseOrders: {
    list: async (): Promise<PurchaseOrder[]> => {
      const res = (await apiClient.get('/api/admin/purchase-orders')) as unknown;
      return Array.isArray(res) ? (res as PurchaseOrder[]) : [];
    },
    createDraft: async (payload: { supplierId?: number; items: Array<{ variantId: number; quantity: number; unitPrice: number }> }): Promise<PurchaseOrder> => {
      return (await apiClient.post('/api/admin/purchase-orders', payload)) as PurchaseOrder;
    },
    receive: async (poId: number, warehouseId: number): Promise<PurchaseOrder> => {
      return (await apiClient.post(`/api/admin/purchase-orders/${poId}/receive`, null, { params: { warehouseId } })) as PurchaseOrder;
    },
  },

  promotions: {
    listCampaigns: async (): Promise<PromotionCampaign[]> => {
      const res = (await apiClient.get('/api/admin/promotions/campaigns')) as unknown;
      return Array.isArray(res) ? (res as PromotionCampaign[]) : [];
    },
    createCampaign: async (payload: {
      campaignCode: string;
      campaignName: string;
      campaignType: string;
      status: string;
      startsAt?: string;
      endsAt?: string;
    }): Promise<PromotionCampaign> => {
      return (await apiClient.post('/api/admin/promotions/campaigns', payload)) as PromotionCampaign;
    },
    updateCampaign: async (id: number, payload: Partial<{
      campaignCode: string;
      campaignName: string;
      campaignType: string;
      status: string;
      startsAt: string;
      endsAt: string;
    }>): Promise<PromotionCampaign> => {
      return (await apiClient.put(`/api/admin/promotions/campaigns/${id}`, payload)) as PromotionCampaign;
    },
    deleteCampaign: async (id: number): Promise<void> => {
      await apiClient.delete(`/api/admin/promotions/campaigns/${id}`);
    },
    // New Voucher & Discount APIs
    listVouchers: async (): Promise<VoucherDto[]> => {
      const res = (await apiClient.get('/api/admin/vouchers')) as unknown;
      return Array.isArray(res) ? (res as VoucherDto[]) : [];
    },
    generateVouchers: async (payload: VoucherGenerationRequest): Promise<VoucherDto[]> => {
      return (await apiClient.post('/api/admin/vouchers/generate', payload)) as VoucherDto[];
    },
    deleteVoucher: async (id: number): Promise<void> => {
      await apiClient.delete(`/api/admin/vouchers/${id}`);
    },
    updateDiscounts: async (payload: AdminProductDiscountRequest): Promise<number> => {
      return (await apiClient.post('/api/admin/vouchers/discounts', payload)) as number;
    },
  },

  users: {
    list: async (params: {
      role?: string;
      status?: string;
      createdFrom?: string;
      createdTo?: string;
      search?: string;
      page?: number;
      size?: number;
    }): Promise<Page<AdminUser>> => {
      return (await apiClient.get('/api/v1/admin/users', { params })) as Page<AdminUser>;
    },
    create: async (payload: {
      fullName: string;
      email: string;
      phone?: string;
      password: string;
      roleName: string;
      avatarUrl?: string;
      status?: string;
      reason?: string;
    }): Promise<AdminUser> => {
      return (await apiClient.post('/api/v1/admin/users', payload)) as AdminUser;
    },
    update: async (
      id: number,
      payload: {
        fullName?: string;
        email?: string;
        phone?: string;
        password?: string;
        roleName?: string;
        avatarUrl?: string;
        status?: string;
        reason?: string;
      }
    ): Promise<AdminUser> => {
      return (await apiClient.put(`/api/v1/admin/users/${id}`, payload)) as AdminUser;
    },
    setStatus: async (id: number, status: 'ACTIVE' | 'INACTIVE', reason: string): Promise<AdminUser> => {
      return (await apiClient.post(`/api/v1/admin/users/${id}/status`, { status, reason })) as AdminUser;
    },
    softDelete: async (id: number, reason: string): Promise<AdminUser> => {
      return (await apiClient.delete(`/api/v1/admin/users/${id}`, { data: { reason } })) as AdminUser;
    },
    uploadAvatar: async (id: number, file: File): Promise<AdminUser> => {
      const form = new FormData();
      form.set('avatar', file);
      return (await apiClient.put(`/api/v1/admin/users/${id}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })) as AdminUser;
    },
    orders: async (id: number): Promise<OrderDto[]> => {
      const res = (await apiClient.get(`/api/v1/admin/users/${id}/orders`)) as unknown;
      return Array.isArray(res) ? (res as OrderDto[]) : [];
    },
    nutrition: async (id: number): Promise<UserNutritionProfileDto> => {
      return (await apiClient.get(`/api/v1/users/${id}/nutrition`)) as UserNutritionProfileDto;
    },
    addresses: async (id: number): Promise<UserAddressDto[]> => {
      const res = (await apiClient.get(`/api/v1/users/${id}/addresses`)) as unknown;
      return Array.isArray(res) ? (res as UserAddressDto[]) : [];
    },
    analytics: async (id: number): Promise<CustomerAnalyticsDto> => {
      return (await apiClient.get(`/api/v1/admin/users/${id}/analytics`)) as CustomerAnalyticsDto;
    },
  },

  orders: {
    getDetail: async (orderId: number): Promise<OrderSummary & { items?: unknown[] }> => {
      return (await apiClient.get(`/api/v1/orders/admin/${orderId}`)) as OrderSummary & { items?: unknown[] };
    },
    listAll: async (): Promise<OrderSummary[]> => {
      const res = (await apiClient.get('/api/v1/orders/admin/all')) as unknown;
      const list = Array.isArray(res) ? res : [];
      return list.map((x) => {
        const o = x as Record<string, unknown>;
        return {
          id: toNumber(o.id),
          orderNumber: o.orderNumber != null ? String(o.orderNumber) : null,
          status: String(o.status ?? ''),
          totalAmount: o.totalAmount != null ? toNumber(o.totalAmount) : null,
          createdAt: o.createdAt != null ? String(o.createdAt) : null,
        };
      });
    },
  },

  staffShifts: {
    list: async (status?: string): Promise<ShiftRequest[]> => {
      const res = (await apiClient.get('/api/admin/attendance/requests', { params: status ? { status } : {} })) as unknown;
      return Array.isArray(res) ? (res as ShiftRequest[]) : [];
    },
    approve: async (id: number, adminNote?: string): Promise<ShiftRequest> => {
      return (await apiClient.put(`/api/admin/attendance/requests/${id}/approve`, { adminNote: adminNote ?? '' })) as ShiftRequest;
    },
    reject: async (id: number, adminNote?: string): Promise<ShiftRequest> => {
      return (await apiClient.put(`/api/admin/attendance/requests/${id}/reject`, { adminNote: adminNote ?? '' })) as ShiftRequest;
    },
  },

  shiftRequests: {
    list: async (params: { from?: string; to?: string; status?: string }): Promise<AdminShiftRequestItemDto[]> => {
      const res = await apiClient.get('/api/v1/admin/shift-requests', { params });
      return unwrap<AdminShiftRequestItemDto[]>(res);
    },
    updateStatus: async (id: number, payload: { status: 'APPROVED' | 'REJECTED'; adminNote?: string }): Promise<void> => {
      await apiClient.put(`/api/v1/admin/shift-requests/${id}/status`, payload);
    },
  },

  attendance: {
    getMonthlyStats: async (userId: number, year: number, month: number): Promise<AttendanceMonthlyStatsDto> => {
      const res = await apiClient.get(`/api/v1/admin/attendance/monthly-stats/${userId}`, { params: { year, month } });
      return unwrap<AttendanceMonthlyStatsDto>(res);
    },
    getInsights: async (year: number, month: number): Promise<AttendanceInsightDto> => {
      const res = await apiClient.get('/api/v1/admin/attendance/insights', { params: { year, month } });
      return unwrap<AttendanceInsightDto>(res);
    },
  },

  aiAdmin: {
    neo4jHealth: async (): Promise<Neo4jHealth> => {
      return (await apiClient.get('/api/v1/admin/ai/neo4j-health')) as Neo4jHealth;
    },
    neo4jSync: async (): Promise<SyncResult> => {
      return (await apiClient.post('/api/v1/admin/ai/neo4j-sync')) as SyncResult;
    },
    topQueries: async (limit: number): Promise<TopQuery[]> => {
      const res = (await apiClient.get('/api/v1/admin/ai/chat-analytics/top-queries', { params: { limit: toNumber(limit) || 20 } })) as unknown;
      return Array.isArray(res) ? (res as TopQuery[]) : [];
    },
  },
};
