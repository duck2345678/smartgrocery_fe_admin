import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi, type OpsOrder } from '../api/adminApi';

const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtVnd = (n: number) => Math.round(n).toLocaleString('vi-VN') + 'đ';

// Date range helpers
type DateRange = 'today' | '7d' | '30d' | 'month';

const RANGE_LABELS: Record<DateRange, string> = {
  today: 'Hôm nay',
  '7d':  '7 ngày',
  '30d': '30 ngày',
  month: 'Tháng này',
};

function getDateRange(range: DateRange): { from: number; to: number } {
  const now = Date.now();
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const todayStart = d.getTime();
  switch (range) {
    case 'today':  return { from: todayStart, to: now };
    case '7d':     return { from: todayStart - 6 * 86_400_000, to: now };
    case '30d':    return { from: todayStart - 29 * 86_400_000, to: now };
    case 'month': {
      const first = new Date(d.getFullYear(), d.getMonth(), 1);
      return { from: first.getTime(), to: now };
    }
  }
}

function toDateParam(ms: number): string {
  const date = new Date(ms);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toLocalDateParam(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Sparkline SVG
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const W = 400, H = 60, PX = 4, PY = 6;
  const max = Math.max(...values, 1);
  const step = (W - PX * 2) / (values.length - 1);
  const pts = values.map((v, i): [number, number] => [
    PX + i * step,
    H - PY - (v / max) * (H - PY * 2),
  ]);
  const linePath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${H} L${PX},${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: H, display: 'block', marginTop: 12 }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sg-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--primary)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sg-area)" />
      <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Misc helpers
const statusBadgeClass = (status: string): string => {
  const s = (status ?? '').toUpperCase();
  if (s === 'DELIVERED') return 'adm-badge--success';
  if (s === 'CANCELLED' || s === 'CANCELED') return 'adm-badge--danger';
  if (s === 'PENDING') return 'adm-badge--pending';
  if (['ASSIGNED', 'CONFIRMED', 'CONFIRMING', 'PROCESSING', 'PICKING', 'PICKED', 'READY_TO_SHIP'].includes(s)) return 'adm-badge--cyan';
  if (['DELIVERING', 'IN_TRANSIT', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(s)) return 'adm-badge--purple';
  return 'adm-badge--muted';
};

const SHIFT_LABELS: Record<string, string> = {
  S: 'Ca sáng',
  C: 'Ca chiều',
  G: 'Ca hành chính',
};

const SHIFT_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  S: { bg: 'rgba(249,115,22,0.1)',  color: 'var(--primary)', border: 'rgba(249,115,22,0.25)' },
  C: { bg: 'rgba(14,165,233,0.1)',  color: 'var(--cyan)',    border: 'rgba(14,165,233,0.25)' },
  G: { bg: 'rgba(139,92,246,0.1)',  color: 'var(--purple)',  border: 'rgba(139,92,246,0.25)' },
};

const STAFF_STALLED_STATUSES = new Set(['ASSIGNED', 'PICKING', 'PICKED', 'READY_TO_SHIP', 'DELIVERING']);

function normalizeShiftType(shiftType: string | null | undefined): string {
  return String(shiftType ?? '').trim().toUpperCase();
}

function formatShiftLabel(shiftType: string | null | undefined, selectedBlocks?: string | null): string {
  const normalized = normalizeShiftType(shiftType);
  const label = SHIFT_LABELS[normalized] ?? 'Ca làm việc';
  if (normalized === 'G' && selectedBlocks) return `${label} · Block ${selectedBlocks}`;
  return label;
}

function formatSlaTiming(order: OpsOrder): string {
  const status = normalizeShiftType(order.status);
  if (STAFF_STALLED_STATUSES.has(status) && order.minutesSinceUpdate != null) {
    return `Kẹt staff: ${order.minutesSinceUpdate}m`;
  }
  if (order.minutesToSla == null) return 'SLA: N/A';
  if (order.minutesToSla < 0) return `Trễ SLA: ${Math.abs(order.minutesToSla)}m`;
  return `Còn SLA: ${order.minutesToSla}m`;
}

function SectionHeader({ label, hint }: { label: string; hint?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.8px',
        textTransform: 'uppercase', color: 'var(--muted)',
        whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        {label}
      </span>
      {hint && (
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400, flexShrink: 0 }}>
          {hint}
        </span>
      )}
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 6, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${Math.max(0, Math.min(pct, 100))}%`,
        background: color,
        borderRadius: 999,
        transition: 'width 700ms cubic-bezier(0.16, 1, 0.3, 1)',
      }} />
    </div>
  );
}

// Page
export function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  const opsQuery = useQuery({
    queryKey: ['ops-monitor'],
    queryFn: () => adminApi.ops.monitor(),
    refetchInterval: 30000,
  });
  const ordersQuery = useQuery({
    queryKey: ['admin-recent-orders'],
    queryFn: () => adminApi.orders.list({ page: 0, size: 8 }),
    staleTime: 60000,
    refetchInterval: 60000,
  });
  const orderSummaryQuery = useQuery({
    queryKey: ['admin-orders-dashboard-summary', dateRange],
    queryFn: () => {
      const range = getDateRange(dateRange);
      return adminApi.orders.getDashboardSummary({
        from: toDateParam(range.from),
        to: toDateParam(range.to),
      });
    },
    staleTime: 60000,
    refetchInterval: 60000,
  });
  const customersQuery = useQuery({
    queryKey: ['admin-customers-count'],
    queryFn: () => adminApi.users.count('CUSTOMER'),
    staleTime: 60000,
  });
  const inventoryQuery = useQuery({
    queryKey: ['inventory', 'dashboard-low-stock'],
    queryFn: () => adminApi.inventory.listAll({ page: 0, size: 1000 }),
    staleTime: 60000,
  });
  const promotionsQuery = useQuery({
    queryKey: ['promotions-dashboard'],
    queryFn: () => adminApi.promotions.listCampaigns(),
    staleTime: 60000,
  });
  const vouchersQuery = useQuery({
    queryKey: ['vouchers-dashboard'],
    queryFn: () => adminApi.promotions.listVouchers(),
    staleTime: 60000,
  });
  const discountedProductsQuery = useQuery({
    queryKey: ['discounted-products-dashboard'],
    queryFn: () => adminApi.products.adminList({ discounted: true, page: 0, size: 1000 }),
    staleTime: 60000,
  });
  const pendingShiftsQuery = useQuery({
    queryKey: ['staff-shifts-pending'],
    queryFn: () => adminApi.shiftRequests.list({ status: 'PENDING' }),
    staleTime: 30000,
  });
  const todayParam = toLocalDateParam();
  const todaySchedulesQuery = useQuery({
    queryKey: ['staff-schedules-today', todayParam],
    queryFn: () => adminApi.shiftSchedules.list({ from: todayParam, to: todayParam }),
    staleTime: 30000,
    refetchInterval: 60000,
  });
  const attendanceInsightsQuery = useQuery({
    queryKey: ['attendance-insights-dashboard'],
    queryFn: () => {
      const now = new Date();
      return adminApi.attendance.getInsights(now.getFullYear(), now.getMonth() + 1);
    },
    staleTime: 60000,
    refetchInterval: 60000,
  });
  const purchaseOrdersQuery = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => adminApi.purchaseOrders.list(),
    staleTime: 60000,
  });

  const rangeStats = orderSummaryQuery.data ?? {
    total: 0,
    pending: 0,
    deliveredCount: 0,
    revenue: 0,
    statusCounts: {},
    sparkline: [],
  };

  const sparklineValues = useMemo(() => {
    if (dateRange === 'today') return [];
    return (orderSummaryQuery.data?.sparkline ?? []).map((point) => point.revenue ?? 0);
  }, [orderSummaryQuery.data, dateRange]);

  // Other computed values
  const orderPipeline = useMemo(() => {
    const counts = orderSummaryQuery.data?.statusCounts ?? {};
    const normalizedCounts = Object.entries(counts).reduce<Record<string, number>>((acc, [status, count]) => {
      acc[String(status).toUpperCase()] = Number(count) || 0;
      return acc;
    }, {});
    const get = (...statuses: string[]) => statuses.reduce((sum, status) => sum + (normalizedCounts[status] ?? 0), 0);
    const pending = get('PENDING');
    const processing = get('ASSIGNED', 'CONFIRMED', 'CONFIRMING', 'PROCESSING', 'PICKING', 'PICKED', 'READY_TO_SHIP');
    const delivering = get('DELIVERING', 'IN_TRANSIT', 'SHIPPED', 'OUT_FOR_DELIVERY');
    const delivered = get('DELIVERED');
    const cancelled = get('CANCELLED', 'CANCELED', 'REFUNDED');
    const total = Math.max(1, pending + processing + delivering + delivered + cancelled);
    return { total, pending, processing, delivering, delivered, cancelled };
  }, [orderSummaryQuery.data]);

  const recentOrders = useMemo(
    () => ordersQuery.data?.content ?? [],
    [ordersQuery.data]
  );

  const lowStockItems = useMemo(
    () => (inventoryQuery.data?.content ?? [])
      .filter((it) => it.availableQuantity < 10)
      .sort((a, b) => a.availableQuantity - b.availableQuantity)
      .slice(0, 8),
    [inventoryQuery.data]
  );

  const todayWorkingStaff = useMemo(() => {
    return (todaySchedulesQuery.data ?? []).filter((r) => r.workDate === todayParam);
  }, [todaySchedulesQuery.data, todayParam]);

  const activePromotionCampaigns = useMemo(() => {
    const now = Date.now();
    return (promotionsQuery.data ?? []).filter((p) => {
      const status = (p.status ?? '').toUpperCase();
      const startsAt = p.startsAt ? new Date(p.startsAt).getTime() : null;
      const endsAt = p.endsAt ? new Date(p.endsAt).getTime() : null;
      return status === 'ACTIVE' && (startsAt == null || startsAt <= now) && (endsAt == null || endsAt >= now);
    }).length;
  }, [promotionsQuery.data]);
  const activeVouchers = useMemo(() => {
    const now = Date.now();
    return (vouchersQuery.data ?? []).filter((v) => {
      const status = (v.status ?? '').toUpperCase();
      const validFrom = v.validFrom ? new Date(v.validFrom).getTime() : null;
      const validUntil = v.validUntil ? new Date(v.validUntil).getTime() : null;
      return status === 'ACTIVE'
        && v.active !== false
        && !v.hidden
        && (validFrom == null || validFrom <= now)
        && (validUntil == null || validUntil >= now);
    }).length;
  }, [vouchersQuery.data]);
  const discountedProductCount = useMemo(() => {
    return (discountedProductsQuery.data?.content ?? []).filter((p) =>
      (p.variants ?? []).some((v) => {
        const compareAtPrice = v.compareAtPrice ?? 0;
        const netPrice = v.netPrice ?? 0;
        const flashSaleEndsAt = v.flashSaleEndsAt ? new Date(v.flashSaleEndsAt).getTime() : null;
        return compareAtPrice > netPrice && (flashSaleEndsAt == null || flashSaleEndsAt >= Date.now());
      })
    ).length;
  }, [discountedProductsQuery.data]);
  const activePromotions = activePromotionCampaigns + activeVouchers + discountedProductCount;
  const opsRiskOrders = useMemo(
    () => [
      ...(opsQuery.data?.stagnantOrders ?? []),
      ...(opsQuery.data?.stalledStaffOrders ?? []),
    ],
    [opsQuery.data]
  );
  const pendingShiftsCount = (pendingShiftsQuery.data ?? []).length;
  const scheduledToday = Math.max(attendanceInsightsQuery.data?.scheduledToday ?? 0, todayWorkingStaff.length);
  const activeToday = attendanceInsightsQuery.data?.activeToday ?? 0;
  const draftPoCount = useMemo(
    () => (purchaseOrdersQuery.data ?? []).filter((p) => (p.status ?? '').toUpperCase() === 'DRAFT').length,
    [purchaseOrdersQuery.data]
  );
  const totalCustomers = customersQuery.data ?? 0;

  const L = (loading: boolean) => loading ? <span className="muted">...</span> : null;

  return (
    <div className="page" style={{ gap: 32 }}>
      <div className="page__header">
        <div>
          <div className="page__title">Dashboard</div>
          <div className="page__subtitle">Tổng quan vận hành thời gian thực</div>
        </div>
      </div>

      {/* Tổng quan kinh doanh */}
      <section>
        <SectionHeader label="Tổng quan kinh doanh" />

        {/* Date range selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {(['today', '7d', '30d', 'month'] as DateRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: '1px solid var(--border)',
                background: dateRange === r ? 'var(--grad-primary)' : 'transparent',
                color: dateRange === r ? '#fff' : 'var(--muted)',
                cursor: 'pointer', transition: 'all 150ms',
                boxShadow: dateRange === r ? '0 2px 10px rgba(var(--primary-rgb),0.35)' : 'none',
              }}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        <div className="grid grid--3">
          {/* Tổng đơn */}
          <div className="card">
            <div className="card__label">Tổng đơn hàng</div>
            <div className="card__value">
              {orderSummaryQuery.isLoading ? L(true) : fmt(rangeStats.total)}
            </div>
            <div className="card__hint">
              Pending:{' '}
              <strong style={{ color: 'var(--warn)' }}>
                {orderSummaryQuery.isLoading ? '...' : fmt(rangeStats.pending)}
              </strong>
              {' · '}Đã giao:{' '}
              <strong style={{ color: 'var(--emerald)' }}>
                {orderSummaryQuery.isLoading ? '...' : fmt(rangeStats.deliveredCount)}
              </strong>
            </div>
          </div>

          {/* Doanh thu */}
          <div className="card" style={{ gridColumn: 'span 1' }}>
            <div className="card__label">Doanh thu (DELIVERED)</div>
            <div className="card__value" style={{ fontSize: '1.3rem' }}>
              {orderSummaryQuery.isLoading ? L(true) : fmtVnd(rangeStats.revenue)}
            </div>
            <div className="card__hint">
              {orderSummaryQuery.isLoading
                ? '...'
                : `${fmt(rangeStats.deliveredCount)} đơn đã giao trong kỳ`}
            </div>
            {!orderSummaryQuery.isLoading && sparklineValues.length > 1 && (
              <Sparkline values={sparklineValues} />
            )}
            {!orderSummaryQuery.isLoading && dateRange === 'today' && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
                Chọn khoảng rộng hơn để xem biểu đồ xu hướng
              </div>
            )}
          </div>

          {/* Khách hàng */}
          <div className="card">
            <div className="card__label">Khách hàng</div>
            <div className="card__value">
              {customersQuery.isLoading ? L(true) : customersQuery.isError ? '-' : fmt(totalCustomers)}
            </div>
            <div className="card__hint">Tổng tài khoản CUSTOMER</div>
          </div>
        </div>
      </section>

      {/* Real-time Operations */}
      <section>
        <SectionHeader label="Vận hành thời gian thực" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
          <div className="card">
            <div className="card__label">Đơn PENDING</div>
            <div className="card__value" style={{ fontSize: 28, color: 'var(--warn)' }}>
              {orderSummaryQuery.isLoading ? L(true) : fmt(orderPipeline.pending)}
            </div>
            <div className="card__hint">Tất cả đơn chờ xử lý</div>
          </div>
          <div className="card">
            <div className="card__label">Sắp trễ SLA</div>
            <div className="card__value" style={{ fontSize: 28, color: 'var(--danger)' }}>
              {opsQuery.isLoading ? L(true) : fmt(opsRiskOrders.length)}
            </div>
            <div className="card__hint">PENDING gần SLA hoặc ASSIGNED bị kẹt</div>
          </div>
          <div className="card">
            <div className="card__label">Tồn kho thấp</div>
            <div className="card__value" style={{ fontSize: 28, color: 'var(--purple)' }}>
              {inventoryQuery.isLoading ? L(true) : fmt(lowStockItems.length)}
            </div>
            <div className="card__hint">Variants &lt; 10 đơn vị</div>
          </div>
        </div>
      </section>

      {/* Today's Shifts */}
      <section>
        <SectionHeader
          label="Nhân sự hôm nay"
          hint={attendanceInsightsQuery.isLoading ? undefined : `${activeToday} đang làm / ${scheduledToday} có lịch`}
        />
        <div className="card">
          {attendanceInsightsQuery.isLoading || todaySchedulesQuery.isLoading ? (
            <div className="muted" style={{ fontSize: 13 }}>Đang tải...</div>
          ) : scheduledToday === 0 ? (
            <div className="muted" style={{ fontSize: 13 }}>
              Chưa có lịch làm việc nào cho hôm nay.{' '}
              <Link to="/staff-management" style={{ color: 'var(--primary)' }}>
                Xem lịch làm việc →
              </Link>
            </div>
          ) : todayWorkingStaff.length === 0 ? (
            <div className="muted" style={{ fontSize: 13 }}>
              Có {fmt(scheduledToday)} nhân sự được xếp lịch hôm nay, nhưng chưa tải được danh sách chi tiết.{' '}
              <Link to="/staff-management" style={{ color: 'var(--primary)' }}>
                Xem lịch làm việc →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {todayWorkingStaff.map((r) => {
                const shiftType = normalizeShiftType(r.shiftType);
                const st = SHIFT_STYLE[shiftType] ?? SHIFT_STYLE['S'];
                const staffName = r.userFullName ?? '-';
                const initial = (staffName || '?').trim().split(' ').at(-1)?.slice(0, 1).toUpperCase() ?? '?';
                return (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px',
                      border: `1px solid ${st.border}`,
                      borderRadius: 'var(--radius-lg)',
                      background: st.bg,
                      minWidth: 190, flex: '0 0 auto',
                    }}
                  >
                    <div style={{
                       width: 34, height: 34, borderRadius: 10,
                       background: st.color,
                       display: 'grid', placeItems: 'center',
                       fontWeight: 900, fontSize: 14, color: '#fff',
                       flexShrink: 0, boxShadow: `0 0 14px ${st.border}`,
                    }}>
                      {initial}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{staffName}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                        {formatShiftLabel(r.shiftType, r.selectedBlocks)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Order Status Pipeline */}
      <section>
        <SectionHeader label="Phân bổ đơn hàng" hint="(tất cả thời gian)" />
        <div className="card">
          {orderSummaryQuery.isLoading ? (
            <div className="muted" style={{ fontSize: 13 }}>Đang tải...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '12px 32px' }}>
              {(
                [
                  { label: 'Pending',    count: orderPipeline.pending,    color: 'var(--warn)' },
                  { label: 'Processing', count: orderPipeline.processing, color: 'var(--cyan)' },
                  { label: 'Delivering', count: orderPipeline.delivering, color: 'var(--purple)' },
                  { label: 'Delivered',  count: orderPipeline.delivered,  color: 'var(--emerald)' },
                  { label: 'Cancelled',  count: orderPipeline.cancelled,  color: 'var(--danger)' },
                ] as { label: string; count: number; color: string }[]
              ).map(({ label, count, color }) => {
                const pct = orderPipeline.total > 0 ? (count / orderPipeline.total) * 100 : 0;
                return (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {label}
                      </span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color, fontWeight: 700 }}>
                        {fmt(count)}{' '}
                        <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 400 }}>({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <ProgressBar pct={pct} color={color} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Other Operations */}
      <section>
        <SectionHeader label="Hoạt động khác" />
        <div className="grid grid--3">
          <div className="card">
            <div className="card__label">Khuyến mãi đang chạy</div>
            <div className="card__value" style={{ fontSize: 28, color: 'var(--pink)' }}>
              {promotionsQuery.isLoading || vouchersQuery.isLoading || discountedProductsQuery.isLoading ? L(true) : fmt(activePromotions)}
            </div>
            <div className="card__hint">{fmt(activeVouchers)} voucher công khai · {fmt(discountedProductCount)} sản phẩm giảm giá</div>
            <div className="card__hint">
              <Link to="/supply/promotions" style={{ color: 'var(--primary)' }}>Xem chiến dịch →</Link>
            </div>
          </div>
          <div className="card">
            <div className="card__label">Ca làm chờ duyệt</div>
            <div className="card__value" style={{ fontSize: 28, color: 'var(--cyan)' }}>
              {pendingShiftsQuery.isLoading ? L(true) : fmt(pendingShiftsCount)}
            </div>
            <div className="card__hint">
              <Link to="/staff-management" style={{ color: 'var(--primary)' }}>Xem lịch làm việc →</Link>
            </div>
          </div>
          <div className="card">
            <div className="card__label">Phiếu nhập nháp</div>
            <div className="card__value" style={{ fontSize: 28, color: 'var(--purple)' }}>
              {purchaseOrdersQuery.isLoading ? L(true) : fmt(draftPoCount)}
            </div>
            <div className="card__hint">
              <Link to="/supply/purchase-orders" style={{ color: 'var(--primary)' }}>Xem phiếu nhập →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Transactions and Stock */}
      <section>
        <SectionHeader label="Giao dịch & Kho" />
        <div className="grid grid--2">
          <div className="card">
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Đơn hàng gần đây</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>8 đơn mới nhất</div>
            </div>
            {ordersQuery.isLoading ? (
              <div className="muted">Đang tải...</div>
            ) : recentOrders.length === 0 ? (
              <div className="muted">Chưa có đơn hàng</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recentOrders.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)', background: 'var(--list-row-bg)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span className="mono" style={{ fontSize: 12 }}>#{o.orderNumber ?? o.id}</span>
                      <span className={`adm-badge ${statusBadgeClass(o.status)}`}>{o.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span className="mono" style={{ fontSize: 12 }}>
                        {o.totalAmount != null ? fmtVnd(o.totalAmount) : '-'}
                      </span>
                      <span className="muted" style={{ fontSize: 11 }}>
                        {o.createdAt ? o.createdAt.slice(5, 16) : '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Cảnh báo tồn kho thấp</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Variants còn &lt; 10 đơn vị</div>
            </div>
            {inventoryQuery.isLoading ? (
              <div className="muted">Đang tải...</div>
            ) : lowStockItems.length === 0 ? (
              <div className="muted" style={{ marginTop: 8 }}>✓ Tất cả hàng đang đủ tồn kho</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {lowStockItems.map((it) => (
                  <div
                    key={it.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px', borderRadius: 'var(--radius-md)',
                      border: `1px solid ${it.availableQuantity === 0 ? 'rgba(var(--danger-rgb), 0.3)' : 'var(--border)'}`,
                      background: it.availableQuantity === 0 ? 'var(--danger-bg)' : 'var(--list-row-bg)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{it.productName}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{it.variantName} · {it.warehouseName}</div>
                    </div>
                    <span className={`adm-badge ${it.availableQuantity === 0 ? 'adm-badge--danger' : 'adm-badge--warn'}`}>
                      {it.availableQuantity} còn
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SLA Warnings */}
      <section>
        <SectionHeader label="Cảnh báo SLA" />
        <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="card">
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Đơn chờ lâu (SLA risk)</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Top 10</div>
            </div>
            <div className="list">
              {opsRiskOrders.slice(0, 10).map((o) => (
                <div className="list__row" key={o.orderId}>
                  <div className="mono">#{o.orderNumber || o.orderId}</div>
                  <div className="muted">
                    {formatSlaTiming(o)}
                  </div>
                </div>
              ))}
              {!opsQuery.isLoading && opsRiskOrders.length === 0 && (
                <div className="muted">Không có đơn nào</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
