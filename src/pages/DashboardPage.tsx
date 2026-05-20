import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../api/adminApi';

const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtVnd = (n: number) => n.toLocaleString('vi-VN') + '₫';

// ── Date range helpers ──────────────────────────────────────────────────────
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

// ── Sparkline SVG ───────────────────────────────────────────────────────────
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

// ── Misc helpers ─────────────────────────────────────────────────────────────
const statusBadgeClass = (status: string): string => {
  const s = (status ?? '').toUpperCase();
  if (s === 'DELIVERED') return 'adm-badge--success';
  if (s === 'CANCELLED' || s === 'CANCELED') return 'adm-badge--danger';
  if (s === 'PENDING') return 'adm-badge--pending';
  if (['CONFIRMED', 'CONFIRMING', 'PROCESSING', 'PICKING', 'PICKED'].includes(s)) return 'adm-badge--cyan';
  if (['DELIVERING', 'IN_TRANSIT', 'SHIPPED'].includes(s)) return 'adm-badge--purple';
  return 'adm-badge--muted';
};

const SHIFT_LABELS: Record<string, string> = { S: 'Ca Sáng', C: 'Ca Chiều', G: 'Ca Gãy' };

const SHIFT_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  S: { bg: 'rgba(249,115,22,0.1)',  color: 'var(--primary)', border: 'rgba(249,115,22,0.25)' },
  C: { bg: 'rgba(14,165,233,0.1)',  color: 'var(--cyan)',    border: 'rgba(14,165,233,0.25)' },
  G: { bg: 'rgba(139,92,246,0.1)',  color: 'var(--purple)',  border: 'rgba(139,92,246,0.25)' },
};

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

// ── Page ─────────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  const opsQuery = useQuery({
    queryKey: ['ops-monitor'],
    queryFn: () => adminApi.ops.monitor(),
    refetchInterval: 30000,
  });
  const issuesQuery = useQuery({
    queryKey: ['admin-issues-open'],
    queryFn: () => adminApi.issues.open(),
    refetchInterval: 30000,
  });
  const ordersQuery = useQuery({
    queryKey: ['admin-all-orders'],
    queryFn: () => adminApi.orders.listAll(),
    staleTime: 60000,
    refetchInterval: 60000,
  });
  const customersQuery = useQuery({
    queryKey: ['admin-customers-count'],
    queryFn: () => adminApi.users.list({ role: 'CUSTOMER', page: 0, size: 1 }),
    staleTime: 60000,
  });
  const inventoryQuery = useQuery({
    queryKey: ['inventory'],
    queryFn: () => adminApi.inventory.listAll(),
    staleTime: 60000,
  });
  const promotionsQuery = useQuery({
    queryKey: ['promotions-dashboard'],
    queryFn: () => adminApi.promotions.listCampaigns(),
    staleTime: 60000,
  });
  const pendingShiftsQuery = useQuery({
    queryKey: ['staff-shifts-pending'],
    queryFn: () => adminApi.staffShifts.list('PENDING'),
    staleTime: 30000,
  });
  const approvedShiftsQuery = useQuery({
    queryKey: ['staff-shifts-approved'],
    queryFn: () => adminApi.staffShifts.list('APPROVED'),
    staleTime: 30000,
    refetchInterval: 60000,
  });
  const purchaseOrdersQuery = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => adminApi.purchaseOrders.list(),
    staleTime: 60000,
  });

  // ── Range-filtered orders ────────────────────────────────────────────────
  const rangeOrders = useMemo(() => {
    const { from, to } = getDateRange(dateRange);
    return (ordersQuery.data ?? []).filter((o) => {
      if (!o.createdAt) return false;
      const time = new Date(o.createdAt).getTime();
      return time >= from && time <= to;
    });
  }, [ordersQuery.data, dateRange]);

  const rangeStats = useMemo(() => {
    const delivered = rangeOrders.filter((o) => (o.status ?? '').toUpperCase() === 'DELIVERED');
    return {
      total:          rangeOrders.length,
      pending:        rangeOrders.filter((o) => (o.status ?? '').toUpperCase() === 'PENDING').length,
      deliveredCount: delivered.length,
      revenue:        delivered.reduce((s, o) => s + (o.totalAmount ?? 0), 0),
    };
  }, [rangeOrders]);

  // ── Sparkline: daily DELIVERED revenue for the selected range ─────────────
  const sparklineValues = useMemo(() => {
    if (dateRange === 'today') return [];
    const { from } = getDateRange(dateRange);
    const days =
      dateRange === '7d'  ? 7 :
      dateRange === '30d' ? 30 :
      new Date().getDate(); // days elapsed in current month

    const map: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(from + i * 86_400_000);
      map[d.toISOString().slice(0, 10)] = 0;
    }
    (ordersQuery.data ?? [])
      .filter((o) => (o.status ?? '').toUpperCase() === 'DELIVERED' && o.createdAt)
      .forEach((o) => {
        const key = o.createdAt!.slice(0, 10);
        if (key in map) map[key] += o.totalAmount ?? 0;
      });
    return Object.keys(map).sort().map((k) => map[k]);
  }, [ordersQuery.data, dateRange]);

  // ── Other computed values ────────────────────────────────────────────────
  const orderPipeline = useMemo(() => {
    const orders = ordersQuery.data ?? [];
    const total = orders.length || 1;
    const pending    = orders.filter((o) => (o.status ?? '').toUpperCase() === 'PENDING').length;
    const processing = orders.filter((o) =>
      ['CONFIRMED', 'CONFIRMING', 'PROCESSING', 'PICKING', 'PICKED'].includes((o.status ?? '').toUpperCase())
    ).length;
    const delivering = orders.filter((o) =>
      ['DELIVERING', 'IN_TRANSIT', 'SHIPPED'].includes((o.status ?? '').toUpperCase())
    ).length;
    const delivered  = orders.filter((o) => (o.status ?? '').toUpperCase() === 'DELIVERED').length;
    const cancelled  = orders.filter((o) =>
      ['CANCELLED', 'CANCELED', 'REFUNDED'].includes((o.status ?? '').toUpperCase())
    ).length;
    return { total, pending, processing, delivering, delivered, cancelled };
  }, [ordersQuery.data]);

  const recentOrders = useMemo(
    () => [...(ordersQuery.data ?? [])]
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, 8),
    [ordersQuery.data]
  );

  const lowStockItems = useMemo(
    () => (inventoryQuery.data ?? [])
      .filter((it) => it.availableQuantity < 10)
      .sort((a, b) => a.availableQuantity - b.availableQuantity)
      .slice(0, 8),
    [inventoryQuery.data]
  );

  const todayWorkingStaff = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (approvedShiftsQuery.data ?? []).filter((r) => r.workDate === today);
  }, [approvedShiftsQuery.data]);

  const activePromotions = useMemo(
    () => (promotionsQuery.data ?? []).filter((p) => p.status === 'ACTIVE').length,
    [promotionsQuery.data]
  );
  const pendingShiftsCount = (pendingShiftsQuery.data ?? []).length;
  const draftPoCount = useMemo(
    () => (purchaseOrdersQuery.data ?? []).filter((p) => (p.status ?? '').toUpperCase() === 'DRAFT').length,
    [purchaseOrdersQuery.data]
  );
  const totalCustomers = customersQuery.data?.totalElements ?? 0;

  const L = (loading: boolean) => loading ? <span className="muted">…</span> : null;

  return (
    <div className="page" style={{ gap: 32 }}>
      <div className="page__header">
        <div>
          <div className="page__title">Dashboard</div>
          <div className="page__subtitle">Tổng quan vận hành thời gian thực</div>
        </div>
      </div>

      {/* ── Tổng quan kinh doanh ── */}
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
              {ordersQuery.isLoading ? L(true) : fmt(rangeStats.total)}
            </div>
            <div className="card__hint">
              Pending:{' '}
              <strong style={{ color: 'var(--warn)' }}>
                {ordersQuery.isLoading ? '…' : fmt(rangeStats.pending)}
              </strong>
              {' · '}Đã giao:{' '}
              <strong style={{ color: 'var(--emerald)' }}>
                {ordersQuery.isLoading ? '…' : fmt(rangeStats.deliveredCount)}
              </strong>
            </div>
          </div>

          {/* Doanh thu */}
          <div className="card" style={{ gridColumn: 'span 1' }}>
            <div className="card__label">Doanh thu (DELIVERED)</div>
            <div className="card__value" style={{ fontSize: '1.3rem' }}>
              {ordersQuery.isLoading ? L(true) : fmtVnd(rangeStats.revenue)}
            </div>
            <div className="card__hint">
              {ordersQuery.isLoading
                ? '…'
                : `${fmt(rangeStats.deliveredCount)} đơn đã giao trong kỳ`}
            </div>
            {!ordersQuery.isLoading && sparklineValues.length > 1 && (
              <Sparkline values={sparklineValues} />
            )}
            {!ordersQuery.isLoading && dateRange === 'today' && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
                Chọn khoảng rộng hơn để xem biểu đồ xu hướng
              </div>
            )}
          </div>

          {/* Khách hàng */}
          <div className="card">
            <div className="card__label">Khách hàng</div>
            <div className="card__value">
              {customersQuery.isLoading ? L(true) : fmt(totalCustomers)}
            </div>
            <div className="card__hint">Tổng tài khoản CUSTOMER</div>
          </div>
        </div>
      </section>

      {/* ── Real-time Operations ── */}
      <section>
        <SectionHeader label="Vận hành thời gian thực" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
          <div className="card">
            <div className="card__label">Đơn PENDING</div>
            <div className="card__value" style={{ fontSize: 28, color: 'var(--warn)' }}>
              {ordersQuery.isLoading ? L(true) : fmt(orderPipeline.pending)}
            </div>
            <div className="card__hint">Tất cả đơn chờ xử lý</div>
          </div>
          <div className="card">
            <div className="card__label">Sắp trễ SLA</div>
            <div className="card__value" style={{ fontSize: 28, color: 'var(--danger)' }}>
              {opsQuery.isLoading ? L(true) : fmt(opsQuery.data?.stagnantOrders.length ?? 0)}
            </div>
            <div className="card__hint">≤ 15 phút đến deadline</div>
          </div>
          <div className="card">
            <div className="card__label">Sự cố đang mở</div>
            <div className="card__value" style={{ fontSize: 28, color: 'var(--pink)' }}>
              {issuesQuery.isLoading ? L(true) : fmt(issuesQuery.data?.length ?? 0)}
            </div>
            <div className="card__hint">
              <Link to="/issues" style={{ color: 'var(--primary)' }}>Xem Issue Inbox →</Link>
            </div>
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

      {/* ── Today's Shifts ── */}
      <section>
        <SectionHeader
          label="Nhân sự hôm nay"
          hint={approvedShiftsQuery.isLoading ? undefined : `${todayWorkingStaff.length} người đang làm`}
        />
        <div className="card">
          {approvedShiftsQuery.isLoading ? (
            <div className="muted" style={{ fontSize: 13 }}>Đang tải…</div>
          ) : todayWorkingStaff.length === 0 ? (
            <div className="muted" style={{ fontSize: 13 }}>
              Chưa có ca nào được duyệt cho hôm nay.{' '}
              <Link to="/staff-management" style={{ color: 'var(--primary)' }}>
                Xem lịch làm việc →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {todayWorkingStaff.map((r) => {
                const st = SHIFT_STYLE[r.shiftType] ?? SHIFT_STYLE['S'];
                const initial = (r.staffName ?? '?').trim().split(' ').at(-1)?.slice(0, 1).toUpperCase() ?? '?';
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
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.staffName ?? '-'}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                        {SHIFT_LABELS[r.shiftType] ?? r.shiftType}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Order Status Pipeline ── */}
      <section>
        <SectionHeader label="Phân bổ đơn hàng" hint="(tất cả thời gian)" />
        <div className="card">
          {ordersQuery.isLoading ? (
            <div className="muted" style={{ fontSize: 13 }}>Đang tải…</div>
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
                const pct = ordersQuery.data && ordersQuery.data.length > 0
                  ? (count / ordersQuery.data.length) * 100 : 0;
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

      {/* ── Other Operations ── */}
      <section>
        <SectionHeader label="Hoạt động khác" />
        <div className="grid grid--3">
          <div className="card">
            <div className="card__label">Khuyến mãi đang chạy</div>
            <div className="card__value" style={{ fontSize: 28, color: 'var(--pink)' }}>
              {promotionsQuery.isLoading ? L(true) : fmt(activePromotions)}
            </div>
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

      {/* ── Transactions and Stock ── */}
      <section>
        <SectionHeader label="Giao dịch & Kho" />
        <div className="grid grid--2">
          <div className="card">
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Đơn hàng gần đây</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>8 đơn mới nhất</div>
            </div>
            {ordersQuery.isLoading ? (
              <div className="muted">Đang tải…</div>
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
              <div className="muted">Đang tải…</div>
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

      {/* ── Warnings & SLA Issues ── */}
      <section>
        <SectionHeader label="Cảnh báo & Sự cố" />
        <div className="grid grid--2">
          <div className="card">
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Đơn chờ lâu (SLA risk)</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Top 10</div>
            </div>
            <div className="list">
              {(opsQuery.data?.stagnantOrders ?? []).slice(0, 10).map((o) => (
                <div className="list__row" key={o.orderId}>
                  <div className="mono">#{o.orderNumber || o.orderId}</div>
                  <div className="muted">Còn SLA: {o.minutesToSla != null ? `${o.minutesToSla}m` : 'N/A'}</div>
                </div>
              ))}
              {!opsQuery.isLoading && (opsQuery.data?.stagnantOrders ?? []).length === 0 && (
                <div className="muted">Không có đơn nào</div>
              )}
            </div>
          </div>

          <div className="card">
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Sự cố đang mở</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                Top 10 —{' '}
                <Link to="/issues" style={{ color: 'var(--primary)' }}>Xem tất cả</Link>
              </div>
            </div>
            <div className="list">
              {(issuesQuery.data ?? []).slice(0, 10).map((it) => (
                <div className="list__row" key={it.id}>
                  <Link to={`/issues/${it.id}`} className="mono" style={{ color: 'var(--primary)' }}>
                    #{it.id}
                  </Link>
                  <div className="muted">{it.issueType}</div>
                </div>
              ))}
              {!issuesQuery.isLoading && (issuesQuery.data ?? []).length === 0 && (
                <div className="muted">Không có sự cố nào</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
