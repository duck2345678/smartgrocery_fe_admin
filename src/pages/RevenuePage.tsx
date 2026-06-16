import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/adminApi';

type DateRange = 'today' | '7d' | '30d' | 'month' | 'custom';

const RANGE_LABELS: Record<DateRange, string> = {
  today: 'Hôm nay',
  '7d': '7 ngày',
  '30d': '30 ngày gần nhất',
  month: 'Tháng hiện tại',
  custom: 'Tùy chọn',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  ASSIGNED: 'Đã phân công',
  PROCESSING: 'Đang xử lý',
  PICKING: 'Đang soạn hàng',
  PICKED: 'Đã soạn hàng',
  READY_TO_SHIP: 'Chờ giao',
  DELIVERING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  CANCELED: 'Đã hủy',
};

function getDateRange(range: DateRange): { from: number; to: number } {
  const now = Date.now();
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const todayStart = d.getTime();
  switch (range) {
    case 'today': return { from: todayStart, to: now };
    case '7d': return { from: todayStart - 6 * 86_400_000, to: now };
    case '30d': return { from: todayStart - 29 * 86_400_000, to: now };
    case 'month': {
      const first = new Date(d.getFullYear(), d.getMonth(), 1);
      return { from: first.getTime(), to: now };
    }
    case 'custom': return { from: todayStart - 29 * 86_400_000, to: now };
  }
}

function toDateParam(ms: number): string {
  const date = new Date(ms);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const fmt = (value: number | null | undefined) =>
  (value ?? 0).toLocaleString('vi-VN');

const fmtVnd = (value: number | null | undefined) =>
  Math.round(value ?? 0).toLocaleString('vi-VN') + '₫';

const fmtPct = (value: number | null | undefined) =>
  `${(value ?? 0) >= 0 ? '+' : ''}${(value ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;

const fmtDate = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const toLocalDateKey = (value: string | null | undefined) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function RevenuePage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const defaultCustom = getDateRange('30d');
  const [customFrom, setCustomFrom] = useState(() => toDateParam(defaultCustom.from));
  const [customTo, setCustomTo] = useState(() => toDateParam(defaultCustom.to));
  const activeRange = dateRange === 'custom' ? null : getDateRange(dateRange);
  const activeFrom = dateRange === 'custom' ? customFrom : toDateParam(activeRange!.from);
  const activeTo = dateRange === 'custom' ? customTo : toDateParam(activeRange!.to);
  const activeRangeLabel = dateRange === 'custom' ? `${fmtDate(activeFrom)} - ${fmtDate(activeTo)}` : RANGE_LABELS[dateRange];

  const summaryQuery = useQuery({
    queryKey: ['admin-revenue-page', activeFrom, activeTo],
    queryFn: () => adminApi.orders.getDashboardSummary({ from: activeFrom, to: activeTo }),
    staleTime: 60000,
  });

  const dayOrdersQuery = useQuery({
    queryKey: ['admin-revenue-day-orders', selectedDate],
    queryFn: () => adminApi.orders.list({
      page: 0,
      size: 100,
      status: 'DELIVERED',
      from: selectedDate ?? undefined,
      to: selectedDate ?? undefined,
      sortBy: 'createdAt',
      sortDir: 'desc',
    }),
    enabled: selectedDate != null,
    staleTime: 30000,
  });

  const summary = summaryQuery.data ?? {
    total: 0,
    pending: 0,
    deliveredCount: 0,
    cancelledCount: 0,
    revenue: 0,
    previousRevenue: 0,
    revenueGrowthRate: 0,
    grossMerchandiseValue: 0,
    discountTotal: 0,
    shippingFeeTotal: 0,
    netRevenue: 0,
    cancellationRate: 0,
    statusCounts: {},
    sparkline: [],
  };

  const statusRows = useMemo(() => {
    const entries = Object.entries(summary.statusCounts ?? {})
      .map(([status, count]) => ({ status: status.toUpperCase(), count: Number(count) || 0 }))
      .sort((a, b) => b.count - a.count);
    const total = entries.reduce((sum, row) => sum + row.count, 0);
    return entries.map((row) => ({
      ...row,
      pct: total > 0 ? Math.round((row.count / total) * 100) : 0,
    }));
  }, [summary.statusCounts]);

  const sparklineRows = summary.sparkline ?? [];
  const maxRevenue = Math.max(...sparklineRows.map((point) => point.revenue ?? 0), 1);
  const selectedPoint = sparklineRows.find((point) => point.date === selectedDate) ?? null;
  const selectedOrders = (dayOrdersQuery.data?.content ?? []).filter((order) => toLocalDateKey(order.createdAt) === selectedDate);
  const selectedDayRevenue = selectedOrders.reduce((sum, order) => sum + (order.totalAmount ?? 0), 0);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">Quản lý doanh thu</div>
          <div className="page__subtitle">Doanh thu chỉ tính các đơn DELIVERED trong khoảng thời gian đã chọn.</div>
        </div>
        <div className="revenue-range-controls">
          <div className="segmented" role="group" aria-label="Khoảng thời gian doanh thu">
            {(Object.keys(RANGE_LABELS) as DateRange[]).map((key) => (
              <button
                key={key}
                className={`segmented__item ${dateRange === key ? 'is-active' : ''}`}
                type="button"
                aria-pressed={dateRange === key}
                onClick={() => {
                  setDateRange(key);
                  setSelectedDate(null);
                }}
              >
                {RANGE_LABELS[key]}
              </button>
            ))}
          </div>
          {dateRange === 'custom' && (
            <div className="revenue-custom-range">
              <input className="adm-input" type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setSelectedDate(null); }} />
              <span className="muted">đến</span>
              <input className="adm-input" type="date" value={customTo} onChange={(e) => { setCustomTo(e.target.value); setSelectedDate(null); }} />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid--4">
        <div className="card">
          <div className="card__label">Doanh thu gộp</div>
          <div className="card__value">{summaryQuery.isLoading ? '...' : fmtVnd(summary.revenue)}</div>
          <div className="card__hint">{fmt(summary.deliveredCount)} đơn đã giao</div>
        </div>
        <div className="card">
          <div className="card__label">Tăng trưởng</div>
          <div className="card__value">{summaryQuery.isLoading ? '...' : fmtPct(summary.revenueGrowthRate)}</div>
          <div className="card__hint">So với kỳ trước · {fmtVnd(summary.previousRevenue)}</div>
        </div>
        <div className="card">
          <div className="card__label">Tỷ lệ hủy</div>
          <div className="card__value">{summaryQuery.isLoading ? '...' : fmtPct(summary.cancellationRate)}</div>
          <div className="card__hint">{fmt(summary.cancelledCount)} đơn hủy / {fmt(summary.total)} tổng đơn</div>
        </div>
        <div className="card">
          <div className="card__label">Doanh thu thực tế</div>
          <div className="card__value">{summaryQuery.isLoading ? '...' : fmtVnd(summary.netRevenue)}</div>
          <div className="card__hint">Hàng {fmtVnd(summary.grossMerchandiseValue)} · giảm {fmtVnd(summary.discountTotal)} · ship {fmtVnd(summary.shippingFeeTotal)}</div>
        </div>
      </div>

      <div className="grid grid--2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="row-actions row-actions--between" style={{ marginBottom: 12 }}>
            <div>
              <div className="card__title">Xu hướng doanh thu</div>
              <div className="card__hint">{activeRangeLabel}</div>
            </div>
          </div>

          {summaryQuery.isLoading ? (
            <div className="muted">Đang tải doanh thu...</div>
          ) : summaryQuery.isError ? (
            <div className="inline-alert">Không tải được dữ liệu doanh thu.</div>
          ) : sparklineRows.length === 0 ? (
            <div className="muted">Chưa có dữ liệu trong kỳ.</div>
          ) : (
            <div className="revenue-chart" role="list" aria-label="Biểu đồ doanh thu theo ngày">
              {sparklineRows.map((point) => {
                const revenue = point.revenue ?? 0;
                const height = `${Math.max(revenue > 0 ? 8 : 2, Math.round((revenue / maxRevenue) * 100))}%`;
                const isSelected = selectedDate === point.date;
                return (
                  <button
                    className={`revenue-bar ${isSelected ? 'is-selected' : ''}`}
                    key={point.date}
                    type="button"
                    onClick={() => setSelectedDate(point.date)}
                    title={`${fmtDate(point.date)} · ${fmtVnd(revenue)}`}
                  >
                    <span className="revenue-bar__value">{revenue > 0 ? fmtVnd(revenue) : '0₫'}</span>
                    <span className="revenue-bar__track">
                      <span className="revenue-bar__fill" style={{ height }} />
                    </span>
                    <span className="revenue-bar__date">{fmtDate(point.date)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <div className="card__title">Phân bổ trạng thái đơn</div>
            <div className="card__hint">{activeRangeLabel}</div>
            <div className="list" style={{ marginTop: 12 }}>
              {statusRows.length === 0 ? (
                <div className="muted">Chưa có đơn hàng.</div>
              ) : statusRows.map((row) => (
                <div className="list__row" key={row.status}>
                  <span>{STATUS_LABELS[row.status] ?? row.status}</span>
                  <span className="mono">{fmt(row.count)} ({row.pct}%)</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="row-actions row-actions--between" style={{ marginBottom: 12 }}>
              <div>
                <div className="card__title">Chi tiết doanh thu theo ngày</div>
                <div className="card__hint">
                  {selectedDate ? `${fmtDate(selectedDate)} · chỉ tính đơn Đã giao` : 'Chọn một ngày bên trái để xem chi tiết'}
                </div>
              </div>
              {selectedDate && (
                <button className="adm-button adm-button--ghost" type="button" onClick={() => setSelectedDate(null)}>
                  Bỏ chọn
                </button>
              )}
            </div>

            {!selectedDate ? (
              <div className="muted">Chưa chọn ngày.</div>
            ) : dayOrdersQuery.isLoading ? (
              <div className="muted">Đang tải đơn hàng trong ngày...</div>
            ) : dayOrdersQuery.isError ? (
              <div className="inline-alert">Không tải được chi tiết doanh thu ngày.</div>
            ) : (
              <>
                <div className="grid grid--3 revenue-day-stats" style={{ marginBottom: 14 }}>
                  <div className="card" style={{ boxShadow: 'none' }}>
                    <div className="card__label">Doanh thu ngày</div>
                    <div className="card__value">{fmtVnd(selectedDayRevenue || selectedPoint?.revenue || 0)}</div>
                  </div>
                  <div className="card" style={{ boxShadow: 'none' }}>
                    <div className="card__label">Đơn đã giao</div>
                    <div className="card__value">{fmt(selectedOrders.length)}</div>
                  </div>
                  <div className="card" style={{ boxShadow: 'none' }}>
                    <div className="card__label">Giá trị TB</div>
                    <div className="card__value">{fmtVnd(selectedOrders.length > 0 ? selectedDayRevenue / selectedOrders.length : 0)}</div>
                  </div>
                </div>

                {selectedOrders.length === 0 ? (
                  <div className="muted">Ngày này chưa có đơn đã giao.</div>
                ) : (
                  <div className="table-wrap">
                    <table className="adm-table revenue-detail-table">
                      <thead>
                        <tr>
                          <th>Mã đơn</th>
                          <th>Khách hàng</th>
                          <th>Tổng tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrders.map((order) => (
                          <tr key={order.id}>
                            <td className="mono">#{order.orderNumber || `ORD-${order.id}`}</td>
                            <td>
                              <div>{order.customerName || '-'}</div>
                              <div className="muted mono" style={{ fontSize: 11 }}>{order.customerPhone || '-'}</div>
                            </td>
                            <td>{fmtVnd(order.totalAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
