import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, type PurchaseOrder, type Supplier, type Warehouse } from '../api/adminApi';

type DraftItem = { variantId: string; quantity: string; unitPrice: string };

const PO_STATUS_BADGE: Record<string, string> = {
  DRAFT:    'adm-badge--pending',
  RECEIVED: 'adm-badge--success',
};

const fmt = (n: number) => n.toLocaleString('vi-VN') + '₫';

export function PurchaseOrdersPage() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['purchase-orders'],
    queryFn:  () => adminApi.purchaseOrders.list(),
  });
  const warehousesQuery = useQuery({
    queryKey: ['warehouses'],
    queryFn:  () => adminApi.warehouses.list(),
    staleTime: 30000,
  });
  const suppliersQuery = useQuery({
    queryKey: ['suppliers'],
    queryFn:  () => adminApi.suppliers.list(),
    staleTime: 60000,
  });
  const productsQuery = useQuery({
    queryKey: ['products-all'],
    queryFn:  () => adminApi.products.list(0, 200),
    staleTime: 60000,
  });

  const productOptions = useMemo(() => {
    const list = productsQuery.data?.content ?? [];
    return list.flatMap((p) =>
      (p.variants ?? []).map((v) => ({
        variantId: String(v.id),
        label: `${p.name}${v.variantName ? ` — ${v.variantName}` : ''} (ID: ${v.id})`,
        price: v.netPrice ?? 0,
      }))
    );
  }, [productsQuery.data]);

  // ── PO form state ──
  const [showForm,      setShowForm]      = useState(false);
  const [supplierId,    setSupplierId]    = useState('');
  const [items,         setItems]         = useState<DraftItem[]>([{ variantId: '', quantity: '1', unitPrice: '' }]);
  const [productSearch, setProductSearch] = useState<Record<number, string>>({});

  // ── Supplier panel state ──
  const [showSuppliers,  setShowSuppliers]  = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [sName,     setSName]     = useState('');
  const [sContact,  setSContact]  = useState('');
  const [sPhone,    setSPhone]    = useState('');
  const [sEmail,    setSEmail]    = useState('');
  const [sAddress,  setSAddress]  = useState('');

  const filteredOptions = (idx: number) => {
    const q = (productSearch[idx] ?? '').toLowerCase();
    if (!q) return productOptions.slice(0, 30);
    return productOptions.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 30);
  };

  const selectVariant = (idx: number, variantId: string) => {
    const opt = productOptions.find((o) => o.variantId === variantId);
    setItems((arr) =>
      arr.map((x, i) =>
        i === idx ? { ...x, variantId, unitPrice: opt?.price ? String(opt.price) : x.unitPrice } : x
      )
    );
    setProductSearch((prev) => ({ ...prev, [idx]: '' }));
  };

  const resetForm = () => {
    setSupplierId('');
    setItems([{ variantId: '', quantity: '1', unitPrice: '' }]);
    setProductSearch({});
  };

  const resetSupplierForm = () => {
    setSName(''); setSContact(''); setSPhone(''); setSEmail(''); setSAddress('');
  };

  // Running total
  const draftTotal = useMemo(
    () => items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0),
    [items]
  );

  // ── Mutations ──
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

  const createSupplierMutation = useMutation({
    mutationFn: async () => {
      if (!sName.trim()) throw new Error('Tên nhà cung cấp là bắt buộc');
      return adminApi.suppliers.create({
        name:          sName.trim(),
        contactPerson: sContact.trim() || undefined,
        phone:         sPhone.trim()   || undefined,
        email:         sEmail.trim()   || undefined,
        address:       sAddress.trim() || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      resetSupplierForm();
      setShowAddSupplier(false);
    },
  });

  const [receiveWarehouseIdByPo, setReceiveWarehouseIdByPo] = useState<Record<number, string>>({});
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
    [items, createMutation.isPending]
  );

  // ── Stats ──
  const allPos    = listQuery.data ?? [];
  const draftPos  = useMemo(() => allPos.filter((p) => p.status?.toUpperCase() === 'DRAFT').length,    [allPos]);
  const rcvdPos   = useMemo(() => allPos.filter((p) => p.status?.toUpperCase() === 'RECEIVED').length, [allPos]);
  const totalRcvd = useMemo(
    () => allPos.filter((p) => p.status?.toUpperCase() === 'RECEIVED').reduce((s, p) => s + (p.totalAmount ?? 0), 0),
    [allPos]
  );
  const supplierCount = suppliersQuery.data?.length ?? 0;

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">Phiếu nhập (PO)</div>
          <div className="page__subtitle">Tạo và nhập kho theo phiếu nhập</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="adm-button adm-button--ghost"
            type="button"
            onClick={() => setShowSuppliers((v) => !v)}
          >
            Nhà cung cấp{supplierCount > 0 ? ` (${supplierCount})` : ''}
          </button>
          <button
            className="adm-button adm-button--primary"
            type="button"
            onClick={() => { resetForm(); setShowForm((v) => !v); }}
          >
            {showForm ? '✕ Đóng' : '+ Tạo phiếu nhập'}
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid--4">
        <div className="card">
          <div className="card__label">Tổng phiếu nhập</div>
          <div className="card__value">{allPos.length}</div>
          <div className="card__hint">Tất cả trạng thái</div>
        </div>
        <div className="card">
          <div className="card__label">Đang là nháp</div>
          <div className="card__value" style={{ color: draftPos > 0 ? 'var(--primary)' : undefined }}>
            {draftPos}
          </div>
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
            {totalRcvd > 0 ? totalRcvd.toLocaleString('vi-VN') + '₫' : '—'}
          </div>
          <div className="card__hint">Các PO RECEIVED</div>
        </div>
      </div>

      {/* ── Supplier management panel (collapsible) ── */}
      {showSuppliers && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="card__label">Nhà cung cấp</div>
            <button
              className="adm-button adm-button--ghost"
              type="button"
              onClick={() => { setShowAddSupplier((v) => !v); resetSupplierForm(); }}
            >
              {showAddSupplier ? '✕ Hủy' : '+ Thêm nhà cung cấp'}
            </button>
          </div>

          {/* Add supplier form */}
          {showAddSupplier && (
            <div style={{
              padding: 16, marginBottom: 16,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 10,
            }}>
              {createSupplierMutation.isError && (
                <div className="inline-alert" style={{ marginBottom: 12 }}>
                  {createSupplierMutation.error instanceof Error
                    ? createSupplierMutation.error.message
                    : 'Không thể thêm nhà cung cấp'}
                </div>
              )}
              <div className="form-grid">
                <label className="adm-field">
                  <div className="adm-field__label">Tên nhà cung cấp *</div>
                  <input className="adm-input" value={sName} onChange={(e) => setSName(e.target.value)} placeholder="Nông Trại Xanh" />
                </label>
                <label className="adm-field">
                  <div className="adm-field__label">Người liên hệ</div>
                  <input className="adm-input" value={sContact} onChange={(e) => setSContact(e.target.value)} placeholder="Anh Minh" />
                </label>
                <label className="adm-field">
                  <div className="adm-field__label">Số điện thoại</div>
                  <input className="adm-input" type="tel" value={sPhone} onChange={(e) => setSPhone(e.target.value)} placeholder="0900 123 456" />
                </label>
                <label className="adm-field">
                  <div className="adm-field__label">Email</div>
                  <input className="adm-input" type="email" value={sEmail} onChange={(e) => setSEmail(e.target.value)} placeholder="(tùy chọn)" />
                </label>
                <label className="adm-field" style={{ gridColumn: '1 / -1' }}>
                  <div className="adm-field__label">Địa chỉ</div>
                  <input className="adm-input" value={sAddress} onChange={(e) => setSAddress(e.target.value)} placeholder="(tùy chọn)" />
                </label>
              </div>
              <div className="row-actions" style={{ marginTop: 12 }}>
                <button
                  className="adm-button adm-button--primary"
                  type="button"
                  disabled={!sName.trim() || createSupplierMutation.isPending}
                  onClick={() => createSupplierMutation.mutate()}
                >
                  {createSupplierMutation.isPending ? 'Đang lưu…' : 'Lưu nhà cung cấp'}
                </button>
              </div>
            </div>
          )}

          {/* Supplier list */}
          <div className="table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên</th>
                  <th>Người liên hệ</th>
                  <th>SĐT</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {suppliersQuery.isLoading ? (
                  <tr><td colSpan={5} className="muted">Đang tải…</td></tr>
                ) : (suppliersQuery.data ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="muted">Chưa có nhà cung cấp nào</td></tr>
                ) : (
                  (suppliersQuery.data ?? []).map((s: Supplier) => (
                    <tr key={s.id}>
                      <td className="mono">{s.id}</td>
                      <td>{s.name}</td>
                      <td>{s.contactPerson ?? <span className="muted">—</span>}</td>
                      <td className="mono">{s.phone ?? <span className="muted">—</span>}</td>
                      <td className="mono">{s.email ?? <span className="muted">—</span>}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create PO form (collapsible) ── */}
      {showForm && (
        <div className="card">
          <div className="card__label">Tạo phiếu nhập nháp</div>
          {createMutation.isError && (
            <div className="inline-alert">
              {createMutation.error instanceof Error ? createMutation.error.message : 'Không thể tạo phiếu nhập'}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label className="adm-field" style={{ maxWidth: 360 }}>
              <div className="adm-field__label">Nhà cung cấp (tuỳ chọn)</div>
              <select className="adm-input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">— Không chọn —</option>
                {(suppliersQuery.data ?? []).map((s: Supplier) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}{s.contactPerson ? ` · ${s.contactPerson}` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="table-wrap">
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
                  const selectedLabel = productOptions.find((o) => o.variantId === it.variantId)?.label ?? '';
                  const lineTotal     = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
                  return (
                    <tr key={idx}>
                      <td>
                        {it.variantId && selectedLabel ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="muted" style={{ fontSize: '0.8rem', flex: 1 }}>{selectedLabel}</span>
                            <button
                              className="adm-button adm-button--ghost"
                              style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                              type="button"
                              onClick={() => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, variantId: '' } : x))}
                            >
                              Đổi
                            </button>
                          </div>
                        ) : (
                          <div style={{ position: 'relative' }}>
                            <input
                              className="adm-input"
                              placeholder="Tìm sản phẩm…"
                              value={productSearch[idx] ?? ''}
                              onChange={(e) => setProductSearch((prev) => ({ ...prev, [idx]: e.target.value }))}
                            />
                            {(productSearch[idx] ?? '').length > 0 && (
                              <div style={{
                                position: 'absolute', zIndex: 50, top: '100%', left: 0, right: 0,
                                background: 'var(--panel)', border: '1px solid var(--border)',
                                borderRadius: 8, maxHeight: 200, overflowY: 'auto',
                              }}>
                                {filteredOptions(idx).length === 0 ? (
                                  <div className="muted" style={{ padding: '0.5rem 0.75rem' }}>Không tìm thấy</div>
                                ) : filteredOptions(idx).map((opt) => (
                                  <div
                                    key={opt.variantId}
                                    style={{ padding: '0.5rem 0.75rem', cursor: 'pointer' }}
                                    onMouseDown={() => selectVariant(idx, opt.variantId)}
                                    className="muted"
                                  >
                                    {opt.label}
                                  </div>
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
                        {lineTotal > 0 ? fmt(lineTotal) : '—'}
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
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
                  {draftTotal > 0 ? fmt(draftTotal) : '—'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="adm-button adm-button--ghost" type="button" onClick={() => { resetForm(); setShowForm(false); }}>
                  Hủy
                </button>
                <button className="adm-button adm-button--primary" type="button" onClick={() => createMutation.mutate()} disabled={!canCreate}>
                  {createMutation.isPending ? 'Đang tạo…' : 'Tạo phiếu nhập nháp'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PO list ── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="card__label">Danh sách phiếu nhập</div>
          <span className="adm-chip">Tổng: {allPos.length}</span>
        </div>

        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Mã PO</th>
                <th>Nhà cung cấp</th>
                <th>Trạng thái</th>
                <th>Tổng tiền</th>
                <th>Tạo lúc</th>
                <th>Nhập kho</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr><td colSpan={7} className="muted">Đang tải…</td></tr>
              ) : listQuery.isError ? (
                <tr><td colSpan={7} className="muted">Không tải được phiếu nhập.</td></tr>
              ) : allPos.length === 0 ? (
                <tr><td colSpan={7} className="muted">Chưa có dữ liệu</td></tr>
              ) : (
                allPos.map((po: PurchaseOrder) => {
                  const selectedWh = receiveWarehouseIdByPo[po.id] ?? '';
                  const canReceive = po.status?.toUpperCase() === 'DRAFT' && Number(selectedWh) > 0 && !receiveMutation.isPending;
                  const statusKey  = (po.status ?? '').toUpperCase();
                  return (
                    <tr key={po.id}>
                      <td className="mono">{po.id}</td>
                      <td className="mono">{po.poNumber ?? '—'}</td>
                      <td>{po.supplierName ?? <span className="muted">—</span>}</td>
                      <td>
                        <span className={`adm-badge ${PO_STATUS_BADGE[statusKey] ?? 'adm-badge--muted'}`}>
                          {po.status ?? '—'}
                        </span>
                      </td>
                      <td className="mono">
                        {po.totalAmount != null ? fmt(Number(po.totalAmount)) : '—'}
                      </td>
                      <td className="mono">{po.createdAt ? po.createdAt.slice(0, 16).replace('T', ' ') : '—'}</td>
                      <td>
                        {statusKey === 'DRAFT' ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <select
                              className="adm-input"
                              style={{ minWidth: 150 }}
                              value={selectedWh}
                              onChange={(e) => setReceiveWarehouseIdByPo((m) => ({ ...m, [po.id]: e.target.value }))}
                            >
                              <option value="">— Chọn kho —</option>
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
                              {receiveMutation.isPending ? 'Đang nhập…' : 'Nhập kho'}
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

        {receiveMutation.isError && (
          <div className="inline-alert" style={{ marginTop: 8 }}>
            {receiveMutation.error instanceof Error ? receiveMutation.error.message : 'Không thể nhập kho'}
          </div>
        )}
      </div>
    </div>
  );
}
