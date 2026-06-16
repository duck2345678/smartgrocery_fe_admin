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
    flashSaleStartsAt?: string | null;
    flashSaleEndsAt?: string | null;
    flashSaleStockLimit?: number | null;
    flashSaleSoldCount?: number | null;
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

export type InventoryListParams = {
  page?: number;
  size?: number;
  search?: string;
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
  active?: boolean | null;
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
  flashSaleStartsAt?: string;
  flashSaleEndsAt?: string;
  flashSaleStockLimit?: number;
  stopFlashSale?: boolean;
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
  customerId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
};

export type OrderDashboardSummary = {
  total: number;
  pending: number;
  deliveredCount: number;
  cancelledCount?: number;
  revenue: number;
  previousRevenue?: number;
  revenueGrowthRate?: number;
  grossMerchandiseValue?: number;
  discountTotal?: number;
  shippingFeeTotal?: number;
  netRevenue?: number;
  cancellationRate?: number;
  statusCounts: Record<string, number>;
  sparkline: Array<{ date: string; revenue: number }>;
};

export type OrderItemDto = {
  id: number;
  variantId?: number | null;
  productName: string;
  variantName: string | null;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal?: number | null;
  discountAmount?: number | null;
  totalPrice: number;
  pickedQuantity?: number | null;
  isSubstituted?: boolean | null;
  substitutedVariantId?: number | null;
  substitutionReason?: string | null;
  imageUrl?: string | null;
};

export type OrderDto = {
  id: number;
  userId?: number | null;
  addressId?: number | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  addressLine?: string | null;
  orderNumber: string;
  subtotal?: number | null;
  discountAmount?: number | null;
  taxAmount?: number | null;
  shippingFee?: number | null;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  customerNote?: string | null;
  assigneeId?: number | null;
  leaseExpiresAt?: string | null;
  packingPhotoUrl?: string | null;
  deliveryPhotoUrl?: string | null;
  assignedAt?: string | null;
  pickedAt?: string | null;
  deliveredAt?: string | null;
  aiGenerated?: boolean | null;
  aiListCode?: string | null;
  aiListName?: string | null;
  createdAt: string;
  updatedAt?: string | null;
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

export type AdminShiftScheduleItemDto = {
  id: number;
  userId: number;
  userFullName: string | null;
  workDate: string;
  shiftType: string;
  selectedBlocks: string | null;
  createdAt: string;
};

export type AttendanceMonthlyStatsDto = {
  year: number;
  month: number;
  startDate?: string | null;
  endDate?: string | null;
  scheduledDays?: number;
  attendedDays?: number;
  absentDays?: number;
  lateCheckIns?: number;
  earlyCheckOuts?: number;
  onTimeCheckIns?: number;
  onTimeCheckOuts?: number;
  totalBlocks?: number;
  completedBlocks?: number;
  completionRate?: number;
  totalWorkedMinutes?: number;
  totalScheduledMinutes?: number;
  lateMinutes?: number;
  earlyMinutes?: number;
  dailySummaries?: unknown[];
  chartPoints?: unknown[];
};

export type AttendanceInsightDto = {
  scheduledToday?: number;
  activeToday?: number;
  totalStaff?: number;
  pendingRequests?: number;
  topPerformers?: Array<{ userId: number; name: string; score: number }>;
  lateRanking?: Array<{ userId: number; userFullName: string | null; lateCount: number; absentCount: number; earlyCount: number; attendedDays: number; score: number }>;
  absentRanking?: Array<{ userId: number; userFullName: string | null; lateCount: number; absentCount: number; earlyCount: number; attendedDays: number; score: number }>;
  earlyRanking?: Array<{ userId: number; userFullName: string | null; lateCount: number; absentCount: number; earlyCount: number; attendedDays: number; score: number }>;
};

const toNumber = (v: unknown): number => {
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toPage = <T>(value: unknown, fallbackPage = 0, fallbackSize = 20): Page<T> => {
  const obj = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const pageObj = obj.page && typeof obj.page === 'object' ? obj.page as Record<string, unknown> : {};
  const content = Array.isArray(obj.content) ? obj.content as T[] : Array.isArray(value) ? value as T[] : [];
  const size = toNumber(obj.size ?? pageObj.size ?? fallbackSize);
  const number = toNumber(obj.number ?? pageObj.number ?? fallbackPage);
  const totalElements = toNumber(obj.totalElements ?? pageObj.totalElements ?? content.length);
  const totalPages = toNumber(obj.totalPages ?? pageObj.totalPages ?? (size > 0 ? Math.ceil(totalElements / size) : 0));
  return {
    content,
    number,
    size,
    totalElements,
    totalPages,
  };
};

const normalizeRoleName = (value: unknown): string => {
  const raw = Array.isArray(value) ? value[0] : value;
  const role = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  if (role === 'ADMIN' || role === 'ROLE_ADMIN') return 'ADMIN';
  if (role === 'STAFF' || role === 'ROLE_STAFF') return 'STAFF';
  if (role === 'CUSTOMER' || role === 'ROLE_CUSTOMER') return 'CUSTOMER';
  return role;
};

const toAttendanceRanking = (value: unknown): NonNullable<AttendanceInsightDto['lateRanking']> => {
  const list = Array.isArray(value) ? value : [];
  return list.map((item) => {
    const obj = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return {
      userId: toNumber(obj.userId),
      userFullName: obj.userFullName == null ? null : String(obj.userFullName),
      lateCount: toNumber(obj.lateCount),
      absentCount: toNumber(obj.absentCount),
      earlyCount: toNumber(obj.earlyCount),
      attendedDays: toNumber(obj.attendedDays),
      score: toNumber(obj.score),
    };
  });
};

export const adminApi = {
  auth: {
    login: async (email: string, password: string): Promise<AuthResponse> => {
      const payload = (await apiClient.post('/api/v1/auth/login', { email, password })) as AuthResponse;
      return {
        ...payload,
        user: {
          ...payload.user,
          roleName: normalizeRoleName(payload.user?.roleName),
        },
      };
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
      return toPage<Product>(await apiClient.get('/api/v1/admin/products', { params }), page, size);
    },
    adminList: async (params: {
      search?: string;
      categoryId?: number;
      status?: string;
      discounted?: boolean;
      page?: number;
      size?: number;
      sort?: string;
    }): Promise<Page<Product>> => {
      return toPage<Product>(
        await apiClient.get('/api/v1/admin/products', { params }),
        params.page ?? 0,
        params.size ?? 20,
      );
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
    listAll: async (params: InventoryListParams = {}): Promise<Page<InventoryStock>> => {
      return (await apiClient.get('/api/admin/inventory', { params })) as Page<InventoryStock>;
    },
    byWarehouse: async (warehouseId: number, params: InventoryListParams = {}): Promise<Page<InventoryStock>> => {
      return (await apiClient.get(`/api/admin/inventory/warehouse/${warehouseId}`, { params })) as Page<InventoryStock>;
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
      return toPage<AdminUser>(
        await apiClient.get('/api/v1/admin/users', { params }),
        params.page ?? 0,
        params.size ?? 20,
      );
    },
    count: async (role?: string): Promise<number> => {
      const value = (await apiClient.get('/api/v1/admin/users/count', { params: role ? { role } : {} })) as unknown;
      return toNumber(value);
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
    list: async (params: {
      page?: number;
      size?: number;
      search?: string;
      status?: string;
      from?: string;
      to?: string;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    } = {}): Promise<Page<OrderSummary>> => {
      return toPage<OrderSummary>(
        await apiClient.get('/api/v1/admin/orders', { params }),
        params.page ?? 0,
        params.size ?? 20,
      );
    },
    listAll: async (): Promise<OrderSummary[]> => {
      const page = toPage<OrderSummary>(
        await apiClient.get('/api/v1/admin/orders', { params: { page: 0, size: 100 } }),
        0,
        100,
      );
      return page.content ?? [];
    },
    getDashboardSummary: async (params: { from?: string; to?: string } = {}): Promise<OrderDashboardSummary> => {
      return (await apiClient.get('/api/v1/admin/orders/dashboard-summary', { params })) as OrderDashboardSummary;
    },
  },

  staffShifts: {
    list: async (status?: string): Promise<AdminShiftRequestItemDto[]> => {
      return (await apiClient.get('/api/v1/admin/shift-requests', { params: status ? { status } : {} })) as AdminShiftRequestItemDto[];
    },
    approve: async (id: number, adminNote?: string): Promise<void> => {
      await apiClient.put(`/api/v1/admin/shift-requests/${id}/status`, { status: 'APPROVED', adminNote: adminNote ?? '' });
    },
    reject: async (id: number, adminNote?: string): Promise<void> => {
      await apiClient.put(`/api/v1/admin/shift-requests/${id}/status`, { status: 'REJECTED', adminNote: adminNote ?? '' });
    },
  },

  shiftRequests: {
    list: async (params: { from?: string; to?: string; status?: string }): Promise<AdminShiftRequestItemDto[]> => {
      return (await apiClient.get('/api/v1/admin/shift-requests', { params })) as AdminShiftRequestItemDto[];
    },
    updateStatus: async (id: number, payload: { status: 'APPROVED' | 'REJECTED'; adminNote?: string }): Promise<void> => {
      await apiClient.put(`/api/v1/admin/shift-requests/${id}/status`, payload);
    },
  },

  shiftSchedules: {
    list: async (params: { from?: string; to?: string }): Promise<AdminShiftScheduleItemDto[]> => {
      return (await apiClient.get('/api/v1/admin/shift-requests/schedules', { params })) as AdminShiftScheduleItemDto[];
    },
  },

  attendance: {
    getMonthlyStats: async (userId: number, year: number, month: number): Promise<AttendanceMonthlyStatsDto> => {
      return (await apiClient.get(`/api/v1/admin/attendance/monthly-stats/${userId}`, { params: { year, month } })) as AttendanceMonthlyStatsDto;
    },
    getInsights: async (year: number, month: number): Promise<AttendanceInsightDto> => {
      const res = (await apiClient.get('/api/v1/admin/attendance/insights', { params: { year, month } })) as unknown;
      const obj = res && typeof res === 'object' ? res as Record<string, unknown> : {};
      const lateRanking = toAttendanceRanking(obj.lateRanking);
      const absentRanking = toAttendanceRanking(obj.absentRanking);
      const earlyRanking = toAttendanceRanking(obj.earlyRanking);
      const rankingSource = lateRanking.length > 0 ? lateRanking : absentRanking.length > 0 ? absentRanking : earlyRanking;
      return {
        scheduledToday: toNumber(obj.scheduledToday),
        activeToday: toNumber(obj.activeToday),
        totalStaff: toNumber(obj.totalStaff),
        pendingRequests: toNumber(obj.pendingRequests),
        topPerformers: Array.isArray(obj.topPerformers)
          ? obj.topPerformers.map((item) => {
              const performer = item && typeof item === 'object' ? item as Record<string, unknown> : {};
              return {
                userId: toNumber(performer.userId),
                name: String(performer.name ?? ''),
                score: toNumber(performer.score),
              };
            })
          : rankingSource.map((item) => ({
              userId: item.userId,
              name: item.userFullName ?? `Staff #${item.userId}`,
              score: item.score,
            })),
        lateRanking,
        absentRanking,
        earlyRanking,
      };
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
