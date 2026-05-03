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
    unit?: string | null;
    netPrice: number | null;
    stock?: number | null;
    aisleLocation?: string | null;
  }>;
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

const toNumber = (v: unknown): number => {
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const adminApi = {
  auth: {
    login: async (email: string, password: string): Promise<AuthResponse> => {
      return (await apiClient.post('/api/v1/auth/login', { email, password })) as AuthResponse;
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
    list: async (page: number, size: number): Promise<Page<Product>> => {
      const params = { page, size };
      return (await apiClient.get('/api/v1/products', { params })) as Page<Product>;
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
        unit?: string;
        netPrice: number;
        stock: number;
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
      if (payload.unit != null) form.set('unit', payload.unit);
      form.set('netPrice', String(payload.netPrice));
      form.set('stock', String(payload.stock));
      if (payload.image) form.set('image', payload.image);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (mode === 'create') {
        return (await apiClient.post('/api/v1/admin/products', form, config)) as Product;
      }
      if (!payload.productId) throw new Error('Thiếu productId');
      return (await apiClient.put(`/api/v1/admin/products/${payload.productId}`, form, config)) as Product;
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
    createDraft: async (payload: { supplierId: number; items: Array<{ variantId: number; quantity: number; unitPrice: number }> }): Promise<PurchaseOrder> => {
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
  },

  users: {
    list: async (params: {
      role?: string;
      status?: string;
      createdFrom?: string;
      createdTo?: string;
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
