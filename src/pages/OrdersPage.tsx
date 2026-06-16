import { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, type OrderDto, type OrderItemDto } from '../api/adminApi';

type SortBy = 'orderNumber' | 'status' | 'totalAmount' | 'createdAt';
type SortDir = 'asc' | 'desc';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'ASSIGNED', label: 'Đã phân công' },
  { value: 'PICKING', label: 'Đang soạn hàng' },
  { value: 'PICKED', label: 'Đã soạn hàng' },
  { value: 'READY_TO_SHIP', label: 'Chờ giao' },
  { value: 'DELIVERING', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  ASSIGNED: 'Đã phân công',
  CONFIRMED: 'Đã xác nhận',
  CONFIRMING: 'Đang xác nhận',
  PROCESSING: 'Đang xử lý',
  PICKING: 'Đang soạn hàng',
  PICKED: 'Đã soạn hàng',
  READY_TO_SHIP: 'Chờ giao',
  DELIVERING: 'Đang giao',
  IN_TRANSIT: 'Đang vận chuyển',
  SHIPPED: 'Đã gửi hàng',
  OUT_FOR_DELIVERY: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  CANCELED: 'Đã hủy',
};

const fmtVnd = (value: number | null | undefined) =>
  value == null ? '-' : Math.round(value).toLocaleString('vi-VN') + '₫';

const fmtDateTime = (value: string | null | undefined) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};

const statusLabel = (status: string | null | undefined) => {
  const key = String(status ?? '').toUpperCase();
  return STATUS_LABELS[key] ?? (key || '-');
};

const statusBadgeClass = (status: string): string => {
  const s = (status ?? '').toUpperCase();
  if (s === 'DELIVERED') return 'adm-badge--success';
  if (s === 'CANCELLED' || s === 'CANCELED') return 'adm-badge--danger';
  if (s === 'PENDING') return 'adm-badge--warn';
  if (['ASSIGNED', 'CONFIRMED', 'CONFIRMING', 'PROCESSING', 'PICKING', 'PICKED', 'READY_TO_SHIP'].includes(s)) return 'adm-badge--cyan';
  if (['DELIVERING', 'IN_TRANSIT', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(s)) return 'adm-badge--purple';
  return 'adm-badge--muted';
};

const displayOrderNumber = (order: { id: number; orderNumber?: string | null }) =>
  order.orderNumber || `ORD-${order.id}`;

const todayParam = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const csvEscape = (value: unknown) => {
  const raw = String(value ?? '');
  return `"${raw.replace(/"/g, '""')}"`;
};

export function OrdersPage() {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const queryParams = {
    page,
    size,
    search: search.trim() || undefined,
    status: status || undefined,
    from: from || undefined,
    to: to || undefined,
    sortBy,
    sortDir,
  };

  const ordersQuery = useQuery({
    queryKey: ['admin-orders-page', queryParams],
    queryFn: () => adminApi.orders.list(queryParams),
    staleTime: 30000,
  });

  const exportQuery = useQuery({
    queryKey: ['admin-orders-export', search, status, from, to, sortBy, sortDir],
    queryFn: () => adminApi.orders.list({ ...queryParams, page: 0, size: 1000 }),
    enabled: false,
  });

  const detailQuery = useQuery({
    queryKey: ['admin-order-detail', selectedOrderId],
    queryFn: () => adminApi.orders.getDetail(selectedOrderId!),
    enabled: selectedOrderId != null,
  });

  const rows = useMemo(() => ordersQuery.data?.content ?? [], [ordersQuery.data]);
  const currentPage = ordersQuery.data ? Math.max(0, Number(ordersQuery.data.number) || 0) : 0;
  const pageTotal = ordersQuery.data ? Math.max(0, Number(ordersQuery.data.totalPages) || 0) : 0;
  const totalElements = ordersQuery.data?.totalElements ?? 0;
  const selectedOrder = detailQuery.data as OrderDto | undefined;
  const items = Array.isArray(selectedOrder?.items) ? selectedOrder.items : [];

  const setSort = (nextSortBy: SortBy) => {
    if (sortBy === nextSortBy) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(nextSortBy);
      setSortDir(nextSortBy === 'createdAt' ? 'desc' : 'asc');
    }
    setPage(0);
  };

  const resetFilters = () => {
    setSearch('');
    setStatus('');
    setFrom('');
    setTo('');
    setPage(0);
  };

  const exportCsv = async () => {
    const result = await exportQuery.refetch();
    const exportRows = result.data?.content ?? [];
    const lines = [
      ['Mã đơn', 'Trạng thái', 'Khách hàng', 'Số điện thoại', 'Tổng tiền', 'Thời gian tạo'].map(csvEscape).join(','),
      ...exportRows.map((order) => [
        displayOrderNumber(order),
        statusLabel(order.status),
        order.customerName ?? '',
        order.customerPhone ?? '',
        order.totalAmount ?? 0,
        fmtDateTime(order.createdAt),
      ].map(csvEscape).join(',')),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `don-hang-${todayParam()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">Quản lý đơn hàng</div>
          <div className="page__subtitle">Tìm kiếm, lọc, đối soát và xem chi tiết từng đơn hàng.</div>
        </div>
        <button className="adm-button adm-button--secondary" type="button" onClick={exportCsv} disabled={exportQuery.isFetching}>
          <Download size={16} />
          <span>{exportQuery.isFetching ? 'Đang xuất...' : 'Xuất CSV'}</span>
        </button>
      </div>

      <div className="card">
        <div className="filters">
          <div className="filters__row orders-filters">
            <label className="adm-field">
              <div className="adm-field__label">Tìm kiếm</div>
              <div className="input-with-icon">
                <Search size={16} />
                <input
                  className="adm-input"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Mã đơn, tên khách hàng, số điện thoại"
                />
              </div>
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Trạng thái</div>
              <select
                className="adm-input"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(0);
                }}
              >
                {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Từ ngày</div>
              <input className="adm-input" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Đến ngày</div>
              <input className="adm-input" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Kích thước</div>
              <select
                className="adm-input"
                value={size}
                onChange={(e) => {
                  setSize(Number(e.target.value));
                  setPage(0);
                }}
              >
                {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <button className="adm-button adm-button--ghost" type="button" onClick={resetFilters}>Xóa lọc</button>
          </div>
        </div>
      </div>

      <div className="grid grid--2" style={{ alignItems: 'start', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(320px, 0.65fr)' }}>
        <div className="card">
          <div className="row-actions row-actions--between" style={{ marginBottom: 12 }}>
            <div>
              <div className="card__title">Danh sách đơn hàng</div>
              <div className="card__hint">{totalElements.toLocaleString('vi-VN')} đơn khớp điều kiện</div>
            </div>
          </div>

          {ordersQuery.isLoading ? (
            <div className="muted">Đang tải đơn hàng...</div>
          ) : ordersQuery.isError ? (
            <div className="inline-alert">Không tải được danh sách đơn hàng.</div>
          ) : rows.length === 0 ? (
            <div className="muted">Không có đơn hàng phù hợp.</div>
          ) : (
            <div className="table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <SortableTh label="Mã đơn" field="orderNumber" sortBy={sortBy} sortDir={sortDir} onSort={setSort} />
                    <SortableTh label="Trạng thái" field="status" sortBy={sortBy} sortDir={sortDir} onSort={setSort} />
                    <th>Khách hàng</th>
                    <SortableTh label="Tổng tiền" field="totalAmount" sortBy={sortBy} sortDir={sortDir} onSort={setSort} />
                    <SortableTh label="Thời gian tạo" field="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={setSort} />
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((order) => (
                    <tr key={order.id}>
                      <td className="mono">#{displayOrderNumber(order)}</td>
                      <td><StatusBadge status={order.status} /></td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{order.customerName || (order.customerId != null ? `User #${order.customerId}` : '-')}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{order.customerPhone || '-'}</div>
                      </td>
                      <td>{fmtVnd(order.totalAmount)}</td>
                      <td>{fmtDateTime(order.createdAt)}</td>
                      <td>
                        <button
                          className="adm-button adm-button--ghost"
                          type="button"
                          onClick={() => setSelectedOrderId(order.id)}
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="pager" style={{ marginTop: 12 }}>
            <div className="pager__info">
              Tổng: {totalElements.toLocaleString('vi-VN')} / Trang {pageTotal > 0 ? currentPage + 1 : 0}/{pageTotal}
            </div>
            <div className="pager__actions">
              <button className="adm-button adm-button--ghost" type="button" onClick={() => setPage(0)} disabled={currentPage <= 0}>Đầu</button>
              <button className="adm-button adm-button--ghost" type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={currentPage <= 0}>Trước</button>
              <button className="adm-button adm-button--ghost" type="button" onClick={() => setPage((p) => Math.min(Math.max(0, pageTotal - 1), p + 1))} disabled={pageTotal <= 0 || currentPage >= pageTotal - 1}>Sau</button>
            </div>
          </div>
        </div>

        <div className="card" style={{ position: 'sticky', top: 16 }}>
          {selectedOrderId == null ? (
            <div className="muted" style={{ textAlign: 'center', padding: '2rem 0' }}>
              Chọn một đơn để xem chi tiết.
            </div>
          ) : detailQuery.isLoading ? (
            <div className="muted">Đang tải chi tiết...</div>
          ) : detailQuery.isError ? (
            <div className="inline-alert">Không tải được chi tiết đơn hàng.</div>
          ) : selectedOrder ? (
            <>
              <div className="row-actions row-actions--between" style={{ marginBottom: 12 }}>
                <div>
                  <div className="card__title">#{displayOrderNumber(selectedOrder)}</div>
                  <div className="card__hint">{fmtDateTime(selectedOrder.createdAt)}</div>
                </div>
                <button className="adm-button adm-button--ghost" type="button" onClick={() => setSelectedOrderId(null)}>Đóng</button>
              </div>

              <div className="list">
                <div className="list__row">
                  <span className="muted">Trạng thái</span>
                  <StatusBadge status={selectedOrder.status} />
                </div>
                <DeliveryInfo order={selectedOrder} />
                {selectedOrder.customerNote && <DetailRow label="Ghi chú khách" value={selectedOrder.customerNote} />}
                <DetailRow label="Phương thức thanh toán" value={selectedOrder.paymentMethod ?? '-'} />
                <DetailRow label="Nhân viên" value={selectedOrder.assigneeId != null ? `Staff #${selectedOrder.assigneeId}` : 'Chưa gán'} />
                <PaymentSummary order={selectedOrder} />
              </div>

              <div className="card__label" style={{ marginTop: 16 }}>Ảnh xác nhận</div>
              <div className="proof-grid">
                <ProofImage label="Đóng gói" src={selectedOrder.packingPhotoUrl} />
                <ProofImage label="Giao hàng" src={selectedOrder.deliveryPhotoUrl} />
              </div>

              <div className="card__label" style={{ marginTop: 16 }}>Sản phẩm ({items.length})</div>
              <div className="list">
                {items.length === 0 ? (
                  <div className="muted">Không có dòng sản phẩm.</div>
                ) : items.map((item) => (
                  <OrderItemRow item={item} key={item.id ?? `${item.sku}-${item.variantId}`} />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SortableTh({ label, field, sortBy, sortDir, onSort }: {
  label: string;
  field: SortBy;
  sortBy: SortBy;
  sortDir: SortDir;
  onSort: (field: SortBy) => void;
}) {
  const active = sortBy === field;
  return (
    <th>
      <button className="table-sort" type="button" onClick={() => onSort(field)} aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <span>{label}</span>
        <span className="table-sort__icon">{active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    </th>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`adm-badge ${statusBadgeClass(status)}`}>{statusLabel(status)}</span>;
}

function DeliveryInfo({ order }: { order: OrderDto }) {
  const receiver = order.receiverName || (order.userId != null ? `User #${order.userId}` : 'Chưa có tên người nhận');
  const phone = order.receiverPhone || 'Chưa có SĐT';
  const address = order.addressLine || 'Chưa có địa chỉ giao hàng';

  return (
    <div className="delivery-info">
      <div className="delivery-info__label">Thông tin giao hàng</div>
      <div className="delivery-info__receiver">
        <span>{receiver}</span>
        <span className="delivery-info__phone">{phone}</span>
      </div>
      <div className="delivery-info__address">{address}</div>
    </div>
  );
}

function PaymentSummary({ order }: { order: OrderDto }) {
  return (
    <div className="payment-summary">
      <div className="payment-summary__label">Tổng kết thanh toán</div>
      <div className="payment-summary__row">
        <span>Tạm tính</span>
        <span>{fmtVnd(order.subtotal)}</span>
      </div>
      <div className="payment-summary__row">
        <span>Giảm giá</span>
        <span>{fmtVnd(order.discountAmount)}</span>
      </div>
      <div className="payment-summary__row">
        <span>Phí ship</span>
        <span>{fmtVnd(order.shippingFee)}</span>
      </div>
      <div className="payment-summary__total">
        <span>Tổng cộng</span>
        <span>{fmtVnd(order.totalAmount)}</span>
      </div>
    </div>
  );
}

function DetailRow({ label, value, strong }: { label: string; value: string | number | null | undefined; strong?: boolean }) {
  return (
    <div className="list__row">
      <span className="muted">{label}</span>
      <span className={strong ? 'mono' : undefined} style={strong ? { fontWeight: 800 } : undefined}>{value ?? '-'}</span>
    </div>
  );
}

function ProofImage({ label, src }: { label: string; src?: string | null }) {
  return (
    <div className="proof-tile">
      <div className="proof-tile__label">{label}</div>
      {src ? (
        <a href={src} target="_blank" rel="noreferrer" className="proof-tile__image-link" title={`Mở ảnh ${label.toLowerCase()}`}>
          <img src={src} alt={`Ảnh xác nhận ${label.toLowerCase()}`} className="proof-tile__image" />
        </a>
      ) : (
        <div className="proof-tile__empty">Chưa có ảnh</div>
      )}
    </div>
  );
}

function OrderItemRow({ item }: { item: OrderItemDto }) {
  return (
    <div className="order-item-row">
      <div className="order-item-row__thumb">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.productName || item.variantName || 'Sản phẩm'} />
        ) : (
          <span>IMG</span>
        )}
      </div>
      <div className="order-item-row__meta">
        <div className="order-item-row__name">{item.productName || item.variantName || 'Sản phẩm'}</div>
        <div className="muted" style={{ fontSize: 12 }}>
          {[item.variantName, item.sku].filter(Boolean).join(' · ') || '-'}
        </div>
      </div>
      <div className="order-item-row__amount mono">
        x{item.quantity ?? 0} · {fmtVnd(item.totalPrice)}
      </div>
    </div>
  );
}
