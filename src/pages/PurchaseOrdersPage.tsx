import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, type PurchaseOrder, type Warehouse } from '../api/adminApi';

type DraftItem = { variantId: string; quantity: string; unitPrice: string };
type PoSortKey = 'id' | 'poNumber' | 'status' | 'totalAmount' | 'createdAt';
type SortDir = 'asc' | 'desc';
type ProductOption = {
  variantId: string;
  productName: string;
  variantName: string | null;
  label: string;
  searchText: string;
  price: number;
};

const PO_STATUS_BADGE: Record<string, string> = {
  DRAFT: 'adm-badge--pending',
  RECEIVED: 'adm-badge--success',
};

const PO_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp',
  RECEIVED: 'Đã nhập kho',
};

const fmt = (n: number | null | undefined) =>
  n == null ? '-' : Math.round(Number(n)).toLocaleString('vi-VN') + '₫';

const fmtDateTime = (value: string | null | undefined) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16).replace('T', ' ');
  return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};

const itemSubtotal = (item: NonNullable<PurchaseOrder['items']>[number]) =>
  item.subtotal ?? (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);

export function PurchaseOrdersPage() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => adminApi.purchaseOrders.list(),
  });
  const warehousesQuery = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => adminApi.warehouses.list(),
    staleTime: 30000,
  });
  const productsQuery = useQuery({
    queryKey: ['products-all'],
    queryFn: () => adminApi.products.list(0, 200),
    staleTime: 60000,
  });

  const productOptions = useMemo(() => {
    const list = productsQuery.data?.content ?? [];
    return list.flatMap((p) =>
      (p.variants ?? []).map((v): ProductOption => {
        const variantName = v.variantName?.trim() || null;
        const label = `${p.name}${variantName ? ` - ${variantName}` : ''}`;
        return {
          variantId: String(v.id),
          productName: p.name,
          variantName,
          label,
          searchText: [p.name, variantName, v.sku, v.barcode, v.id].filter(Boolean).join(' ').toLowerCase(),
          price: v.netPrice ?? 0,
        };
      }),
    );
  }, [productsQuery.data]);

  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ variantId: '', quantity: '1', unitPrice: '' }]);
  const [productSearch, setProductSearch] = useState<Record<number, string>>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<PoSortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [selectedPoId, setSelectedPoId] = useState<number | null>(null);
  const [receiveWarehouseIdByPo, setReceiveWarehouseIdByPo] = useState<Record<number, string>>({});

  const filteredOptions = (idx: number) => {
    const q = (productSearch[idx] ?? '').toLowerCase();
    if (!q) return productOptions.slice(0, 80);
    return productOptions.filter((o) => o.searchText.includes(q)).slice(0, 80);
  };

  const selectVariant = (idx: number, variantId: string) => {
    const opt = productOptions.find((o) => o.variantId === variantId);
    setItems((arr) =>
      arr.map((x, i) =>
        i === idx ? { ...x, variantId, unitPrice: opt?.price ? String(Math.round(opt.price * 0.7)) : x.unitPrice } : x,
      ),
    );
    setProductSearch((prev) => ({ ...prev, [idx]: '' }));
  };

  const resetForm = () => {
    setSupplierId('');
    setItems([{ variantId: '', quantity: '1', unitPrice: '' }]);
    setProductSearch({});
  };

  const draftTotal = useMemo(
    () => items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0),
    [items],
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const normalized = items
        .filter((it) => it.variantId && Number(it.variantId) > 0)
        .map((it) => ({ variantId: Number(it.variantId), quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) }));
      if (normalized.length === 0) throw new Error('Vui lòng thêm ít nhất 1 mặt hàng');
      for (const it of normalized) {
        if (it.quantity <= 0) throw new Error('Số lượng phải lớn hơn 0');
        if (it.unitPrice < 0) throw new Error('Đơn giá không hợp lệ');
      }
      return adminApi.purchaseOrders.createDraft({
        supplierId: supplierId ? Number(supplierId) : undefined,
        items: normalized,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      resetForm();
      setShowForm(false);
    },
  });

  const receiveMutation = useMutation({
    mutationFn: (payload: { poId: number; warehouseId: number }) =>
      adminApi.purchaseOrders.receive(payload.poId, payload.warehouseId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  const canCreate = useMemo(
    () => items.some((it) => it.variantId && Number(it.variantId) > 0) && !createMutation.isPending,
    [items, createMutation.isPending],
  );

  const allPos = listQuery.data ?? [];
  const selectedPo = useMemo(
    () => allPos.find((po) => po.id === selectedPoId) ?? null,
    [allPos, selectedPoId],
  );
  const selectedPoItems = selectedPo?.items ?? [];
  const draftPos = useMemo(() => allPos.filter((p) => p.status?.toUpperCase() === 'DRAFT').length, [allPos]);
  const rcvdPos = useMemo(() => allPos.filter((p) => p.status?.toUpperCase() === 'RECEIVED').length, [allPos]);
  const totalRcvd = useMemo(
    () => allPos.filter((p) => p.status?.toUpperCase() === 'RECEIVED').reduce((s, p) => s + (p.totalAmount ?? 0), 0),
    [allPos],
  );

  const toggleSort = (key: PoSortKey) => {
    setPage(0);
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  };

  const sortHeader = (key: PoSortKey, label: string) => (
    <button
      className={`table-sort ${sortKey === key ? 'is-active' : ''}`}
      type="button"
      onClick={() => toggleSort(key)}
      aria-sort={sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span>{label}</span>
      <span className="table-sort__icon">{sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  );

  const filteredPos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allPos.filter((po) => {
      const status = po.status?.toUpperCase() ?? '';
      if (statusFilter && status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        po.id,
        po.poNumber,
        po.status,
        po.supplierName,
        po.totalAmount,
        po.createdAt,
      ].filter((value) => value != null).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [allPos, search, statusFilter]);

  const sortedPos = useMemo(() => {
    const direction = sortDir === 'asc' ? 1 : -1;
    return [...filteredPos].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (sortKey === 'id' || sortKey === 'totalAmount') {
        return ((Number(av) || 0) - (Number(bv) || 0)) * direction;
      }
      return String(av ?? '').localeCompare(String(bv ?? ''), 'vi', { numeric: true, sensitivity: 'base' }) * direction;
    });
  }, [filteredPos, sortDir, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedPos.length / size));
  const currentPage = Math.min(page, totalPages - 1);
  const pagedPos = useMemo(
    () => sortedPos.slice(currentPage * size, currentPage * size + size),
    [currentPage, size, sortedPos],
  );

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">Phiếu nhập (PO)</div>
          <div className="page__subtitle">Tạo và nhập kho theo phiếu nhập</div>
        </div>
        <button
          className="adm-button adm-button--primary"
          type="button"
          onClick={() => { resetForm(); setShowForm((v) => !v); }}
        >
          {showForm ? '× Đóng' : '+ Tạo phiếu nhập'}
        </button>
      </div>

      <div className="grid grid--4">
        <div className="card">
          <div className="card__label">Tổng phiếu nhập</div>
          <div className="card__value">{allPos.length}</div>
          <div className="card__hint">Tất cả trạng thái</div>
        </div>
        <div className="card">
          <div className="card__label">Đang là nháp</div>
          <div className="card__value" style={{ color: draftPos > 0 ? 'var(--primary)' : undefined }}>{draftPos}</div>
          <div className="card__hint">Chờ nhập kho</div>
        </div>
        <div className="card">
          <div className="card__label">Đã nhập kho</div>
          <div className="card__value" style={{ color: 'var(--emerald)' }}>{rcvdPos}</div>
          <div className="card__hint">Hoàn thành</div>
        </div>
        <div className="card">
          <div className="card__label">Tổng giá trị đã nhập</div>
          <div className="card__value" style={{ fontSize: totalRcvd > 0 ? 20 : undefined }}>
            {totalRcvd > 0 ? fmt(totalRcvd) : '-'}
          </div>
          <div className="card__hint">Các PO đã nhập kho</div>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <div className="card__label">Tạo phiếu nhập nháp</div>
          {createMutation.isError && (
            <div className="inline-alert">
              {createMutation.error instanceof Error ? createMutation.error.message : 'Không thể tạo phiếu nhập'}
            </div>
          )}

          <div className="table-wrap po-create-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 280 }}>Sản phẩm / Biến thể</th>
                  <th style={{ width: 120 }}>Số lượng</th>
                  <th style={{ width: 160 }}>Đơn giá (₫)</th>
                  <th style={{ width: 160 }}>Thành tiền</th>
                  <th style={{ width: 72 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const selectedProduct = productOptions.find((o) => o.variantId === it.variantId);
                  const lineTotal = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
                  const options = filteredOptions(idx);
                  return (
                    <tr key={idx}>
                      <td>
                        {it.variantId && selectedProduct ? (
                          <div className="po-product-selected">
                            <div className="po-product-selected__main">
                              <div className="po-product-selected__name">{selectedProduct.productName}</div>
                              <div className="po-product-selected__meta">
                                {selectedProduct.variantName || 'Mặc định'} · ID {selectedProduct.variantId}
                              </div>
                            </div>
                            <button
                              className="adm-button adm-button--ghost"
                              type="button"
                              onClick={() => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, variantId: '' } : x))}
                            >
                              Đổi
                            </button>
                          </div>
                        ) : (
                          <div className="po-product-picker">
                            <input
                              className="adm-input"
                              placeholder="Tìm theo tên, biến thể, SKU, barcode hoặc ID..."
                              value={productSearch[idx] ?? ''}
                              onChange={(e) => setProductSearch((prev) => ({ ...prev, [idx]: e.target.value }))}
                            />
                            {(productSearch[idx] ?? '').length > 0 && (
                              <div className="po-product-picker__menu">
                                {options.length === 0 ? (
                                  <div className="po-product-picker__empty">Không tìm thấy sản phẩm phù hợp</div>
                                ) : options.map((opt) => (
                                  <button
                                    key={opt.variantId}
                                    className="po-product-option"
                                    type="button"
                                    onMouseDown={() => selectVariant(idx, opt.variantId)}
                                  >
                                    <span className="po-product-option__body">
                                      <span className="po-product-option__name">{opt.productName}</span>
                                      <span className="po-product-option__meta">
                                        {opt.variantName || 'Mặc định'} · ID {opt.variantId}
                                      </span>
                                    </span>
                                    <span className="po-product-option__price">{fmt(opt.price)}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <input
                          className="adm-input"
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))}
                        />
                      </td>
                      <td>
                        <input
                          className="adm-input"
                          type="number"
                          min="0"
                          value={it.unitPrice}
                          onChange={(e) => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, unitPrice: e.target.value } : x))}
                          placeholder="0"
                        />
                      </td>
                      <td className="mono" style={{ color: lineTotal > 0 ? 'var(--fg)' : 'var(--muted)' }}>
                        {lineTotal > 0 ? fmt(lineTotal) : '-'}
                      </td>
                      <td>
                        <button
                          className="adm-button adm-button--ghost"
                          type="button"
                          onClick={() => setItems((arr) => arr.filter((_, i) => i !== idx))}
                          disabled={items.length <= 1}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, flexWrap: 'wrap', gap: 8 }}>
            <button
              className="adm-button adm-button--ghost"
              type="button"
              onClick={() => setItems((arr) => [...arr, { variantId: '', quantity: '1', unitPrice: '' }])}
            >
              + Thêm dòng
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)' }}>
                  Tổng ước tính
                </div>
                <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18, color: draftTotal > 0 ? 'var(--primary)' : 'var(--muted)' }}>
                  {draftTotal > 0 ? fmt(draftTotal) : '-'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="adm-button adm-button--ghost" type="button" onClick={() => { resetForm(); setShowForm(false); }}>
                  Hủy
                </button>
                <button className="adm-button adm-button--primary" type="button" onClick={() => createMutation.mutate()} disabled={!canCreate}>
                  {createMutation.isPending ? 'Đang tạo...' : 'Tạo phiếu nhập nháp'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="card__label">Danh sách phiếu nhập</div>
          <span className="adm-chip">Tổng: {filteredPos.length} / {allPos.length}</span>
        </div>

        <div className="po-filters" style={{ marginBottom: 14 }}>
          <label className="adm-field">
            <div className="adm-field__label">Tìm kiếm</div>
            <input
              className="adm-input"
              value={search}
              onChange={(e) => { setPage(0); setSearch(e.target.value); }}
              placeholder="Tìm mã PO, ID, trạng thái..."
            />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">Trạng thái</div>
            <select className="adm-input" value={statusFilter} onChange={(e) => { setPage(0); setStatusFilter(e.target.value); }}>
              <option value="">Tất cả trạng thái</option>
              <option value="DRAFT">DRAFT</option>
              <option value="RECEIVED">RECEIVED</option>
            </select>
          </label>
          <label className="adm-field">
            <div className="adm-field__label">Kích thước</div>
            <select className="adm-input" value={String(size)} onChange={(e) => { setPage(0); setSize(Number(e.target.value)); }}>
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </label>
        </div>

        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>{sortHeader('id', 'ID')}</th>
                <th>{sortHeader('poNumber', 'Mã PO')}</th>
                <th>{sortHeader('status', 'Trạng thái')}</th>
                <th>{sortHeader('totalAmount', 'Tổng tiền')}</th>
                <th>{sortHeader('createdAt', 'Tạo lúc')}</th>
                <th>Chi tiết</th>
                <th>Nhập kho</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr><td colSpan={7} className="muted">Đang tải...</td></tr>
              ) : listQuery.isError ? (
                <tr><td colSpan={7} className="muted">Không tải được phiếu nhập.</td></tr>
              ) : filteredPos.length === 0 ? (
                <tr><td colSpan={7} className="muted">Không có phiếu nhập phù hợp</td></tr>
              ) : (
                pagedPos.map((po: PurchaseOrder) => {
                  const selectedWh = receiveWarehouseIdByPo[po.id] ?? '';
                  const canReceive = po.status?.toUpperCase() === 'DRAFT' && Number(selectedWh) > 0 && !receiveMutation.isPending;
                  const statusKey = (po.status ?? '').toUpperCase();
                  return (
                    <tr key={po.id}>
                      <td className="mono">{po.id}</td>
                      <td className="mono">{po.poNumber ?? '-'}</td>
                      <td>
                        <span className={`adm-badge ${PO_STATUS_BADGE[statusKey] ?? 'adm-badge--muted'}`}>
                          {po.status ?? '-'}
                        </span>
                      </td>
                      <td className="mono">{fmt(po.totalAmount)}</td>
                      <td className="mono">{fmtDateTime(po.createdAt)}</td>
                      <td>
                        <button
                          className="adm-button adm-button--ghost"
                          type="button"
                          onClick={() => setSelectedPoId(po.id)}
                        >
                          Xem chi tiết
                        </button>
                      </td>
                      <td>
                        {statusKey === 'DRAFT' ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <select
                              className="adm-input"
                              style={{ minWidth: 150 }}
                              value={selectedWh}
                              onChange={(e) => setReceiveWarehouseIdByPo((m) => ({ ...m, [po.id]: e.target.value }))}
                            >
                              <option value="">- Chọn kho -</option>
                              {(warehousesQuery.data ?? []).map((w: Warehouse) => (
                                <option key={w.id} value={String(w.id)}>{w.name}</option>
                              ))}
                            </select>
                            <button
                              className="adm-button adm-button--primary"
                              type="button"
                              onClick={() => receiveMutation.mutate({ poId: po.id, warehouseId: Number(selectedWh) })}
                              disabled={!canReceive}
                            >
                              {receiveMutation.isPending ? 'Đang nhập...' : 'Nhập kho'}
                            </button>
                          </div>
                        ) : (
                          <span className="adm-badge adm-badge--success">Đã nhập kho</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="pager" style={{ marginTop: 12 }}>
          <div className="pager__info">
            Tổng: {filteredPos.length} / Trang {filteredPos.length > 0 ? currentPage + 1 : 0}/{filteredPos.length > 0 ? totalPages : 0}
          </div>
          <div className="pager__actions">
            <button className="adm-button adm-button--ghost" type="button" onClick={() => setPage(0)} disabled={currentPage <= 0}>Đầu</button>
            <button className="adm-button adm-button--ghost" type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={currentPage <= 0}>Trước</button>
            <button className="adm-button adm-button--ghost" type="button" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={filteredPos.length === 0 || currentPage >= totalPages - 1}>Sau</button>
          </div>
        </div>

        {receiveMutation.isError && (
          <div className="inline-alert" style={{ marginTop: 8 }}>
            {receiveMutation.error instanceof Error ? receiveMutation.error.message : 'Không thể nhập kho'}
          </div>
        )}
      </div>

      {selectedPo && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setSelectedPoId(null)}>
          <div className="modal-content" style={{ margin: 0, padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <button className="adm-button adm-button--ghost modal-close" type="button" onClick={() => setSelectedPoId(null)}>
              Đóng
            </button>

            <div className="row-actions row-actions--between" style={{ marginBottom: 18, paddingRight: 64 }}>
              <div>
                <div className="card__title">{selectedPo.poNumber ?? `PO #${selectedPo.id}`}</div>
                <div className="card__hint">Tạo lúc {fmtDateTime(selectedPo.createdAt)}</div>
              </div>
              <span className={`adm-badge ${PO_STATUS_BADGE[(selectedPo.status ?? '').toUpperCase()] ?? 'adm-badge--muted'}`}>
                {PO_STATUS_LABEL[(selectedPo.status ?? '').toUpperCase()] ?? selectedPo.status ?? '-'}
              </span>
            </div>

            <div className="grid grid--3" style={{ marginBottom: 18 }}>
              <div className="card" style={{ margin: 0 }}>
                <div className="card__label">ID phiếu</div>
                <div className="card__value" style={{ fontSize: 22 }}>{selectedPo.id}</div>
              </div>
              <div className="card" style={{ margin: 0 }}>
                <div className="card__label">Số dòng hàng</div>
                <div className="card__value" style={{ fontSize: 22 }}>{selectedPoItems.length}</div>
              </div>
              <div className="card" style={{ margin: 0 }}>
                <div className="card__label">Tổng tiền</div>
                <div className="card__value" style={{ fontSize: 22 }}>{fmt(selectedPo.totalAmount)}</div>
              </div>
            </div>

            <div className="list" style={{ marginBottom: 18 }}>
              <DetailRow label="Mã PO" value={selectedPo.poNumber ?? '-'} strong />
              <DetailRow label="Trạng thái" value={PO_STATUS_LABEL[(selectedPo.status ?? '').toUpperCase()] ?? selectedPo.status ?? '-'} />
              <DetailRow label="Ngày tạo" value={fmtDateTime(selectedPo.createdAt)} />
            </div>

            <div className="card__label" style={{ marginBottom: 10 }}>Danh sách mặt hàng</div>
            <div className="table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Biến thể</th>
                    <th>ID biến thể</th>
                    <th>Số lượng</th>
                    <th>Đơn giá</th>
                    <th>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPoItems.length === 0 ? (
                    <tr><td colSpan={6} className="muted">Phiếu nhập chưa có dòng hàng.</td></tr>
                  ) : selectedPoItems.map((item) => (
                    <tr key={item.id ?? `${selectedPo.id}-${item.variantId}`}>
                      <td>{item.productName ?? '-'}</td>
                      <td>{item.variantName ?? '-'}</td>
                      <td className="mono">{item.variantId}</td>
                      <td className="mono">{item.quantity}</td>
                      <td className="mono">{fmt(item.unitPrice)}</td>
                      <td className="mono">{fmt(itemSubtotal(item))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
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
