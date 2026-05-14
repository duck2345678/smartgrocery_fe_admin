import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, type InventoryStock, type Warehouse } from '../api/adminApi';

type SortDir = 'asc' | 'desc';

function StockBadge({ qty, threshold }: { qty: number; threshold: number }) {
  if (qty === 0)          return <span className="adm-badge adm-badge--danger">Hết hàng</span>;
  if (qty <= threshold)   return <span className="adm-badge adm-badge--warn">Tồn thấp</span>;
  return                         <span className="adm-badge adm-badge--success">Ổn định</span>;
}

export function InventoryPage() {
  const { t } = useTranslation();

  const [warehouseId, setWarehouseId] = useState<string>('all');
  const [search,      setSearch]      = useState('');
  const [threshold,   setThreshold]   = useState(10);
  const [sortDir,     setSortDir]     = useState<SortDir>('asc');

  const warehousesQuery = useQuery({
    queryKey: ['warehouses'],
    queryFn:  () => adminApi.warehouses.list(),
    staleTime: 30000,
  });

  const inventoryQuery = useQuery({
    queryKey: ['inventory', warehouseId],
    queryFn:  () =>
      warehouseId === 'all'
        ? adminApi.inventory.listAll()
        : adminApi.inventory.byWarehouse(Number(warehouseId)),
  });

  const allRows = useMemo(() => inventoryQuery.data ?? [], [inventoryQuery.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(
      (r) =>
        r.productName.toLowerCase().includes(q) ||
        r.variantName.toLowerCase().includes(q),
    );
  }, [allRows, search]);

  const rows = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const diff = (a.availableQuantity ?? 0) - (b.availableQuantity ?? 0);
        return sortDir === 'asc' ? diff : -diff;
      }),
    [filtered, sortDir],
  );

  // Stats computed from full dataset (not filtered)
  const outCount   = useMemo(() => allRows.filter((r) => (r.availableQuantity ?? 0) === 0).length, [allRows]);
  const lowCount   = useMemo(() => allRows.filter((r) => { const q = r.availableQuantity ?? 0; return q > 0 && q <= threshold; }).length, [allRows, threshold]);
  const totalAvail = useMemo(() => allRows.reduce((s, r) => s + (r.availableQuantity ?? 0), 0), [allRows]);

  const selectedWarehouse = warehousesQuery.data?.find((w) => String(w.id) === warehouseId);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">{t('pages.inventoryTitle')}</div>
          <div className="page__subtitle">{t('pages.inventorySubtitle')}</div>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid--4">
        <div className="card">
          <div className="card__label">Tổng mặt hàng</div>
          <div className="card__value">{allRows.length}</div>
          <div className="card__hint">{warehouseId === 'all' ? 'Tất cả kho' : (selectedWarehouse?.name ?? 'Kho đã chọn')}</div>
        </div>
        <div className="card">
          <div className="card__label">Hết hàng</div>
          <div className="card__value" style={{ color: outCount > 0 ? 'var(--danger)' : undefined }}>
            {outCount}
          </div>
          <div className="card__hint">Số lượng = 0</div>
        </div>
        <div className="card">
          <div className="card__label">Tồn thấp</div>
          <div className="card__value" style={{ color: lowCount > 0 ? 'var(--warn)' : undefined }}>
            {lowCount}
          </div>
          <div className="card__hint">1 – {threshold} đơn vị</div>
        </div>
        <div className="card">
          <div className="card__label">Tổng khả dụng</div>
          <div className="card__value">{totalAvail.toLocaleString('vi-VN')}</div>
          <div className="card__hint">Sẵn bán (chưa gồm reserved)</div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card">
        <div className="filters">
          <div className="filters__row">
            <label className="adm-field" style={{ flex: 2 }}>
              <div className="adm-field__label">Tìm sản phẩm / biến thể</div>
              <input
                className="adm-input"
                placeholder="Nhập tên sản phẩm hoặc biến thể…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="adm-field" style={{ minWidth: 200 }}>
              <div className="adm-field__label">Kho hàng</div>
              <select className="adm-input" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                <option value="all">Tất cả kho</option>
                {(warehousesQuery.data ?? []).map((w: Warehouse) => (
                  <option key={w.id} value={String(w.id)}>
                    {w.name} (#{w.id})
                  </option>
                ))}
              </select>
            </label>
            <label className="adm-field" style={{ minWidth: 150 }}>
              <div className="adm-field__label">Ngưỡng tồn thấp</div>
              <input
                className="adm-input"
                type="number"
                min={1}
                max={999}
                value={threshold}
                onChange={(e) => setThreshold(Math.max(1, Number(e.target.value) || 1))}
              />
            </label>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="card__label">Danh sách tồn kho</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="adm-chip">
              Hiển thị: {rows.length} / {allRows.length}
            </span>
            {(outCount > 0 || lowCount > 0) && (
              <span className="adm-badge adm-badge--danger">
                {outCount > 0 && `${outCount} hết hàng`}
                {outCount > 0 && lowCount > 0 && ' · '}
                {lowCount > 0 && `${lowCount} tồn thấp`}
              </span>
            )}
          </div>
        </div>

        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Kho</th>
                <th>Biến thể</th>
                <th>Sản phẩm</th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                  onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                >
                  Khả dụng&nbsp;{sortDir === 'asc' ? '↑' : '↓'}
                </th>
                <th>Reserved</th>
                <th>Tổng tồn</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {inventoryQuery.isLoading ? (
                <tr><td colSpan={8} className="muted">{t('common.loading')}</td></tr>
              ) : inventoryQuery.isError ? (
                <tr>
                  <td colSpan={8} className="muted">
                    {inventoryQuery.error instanceof Error
                      ? inventoryQuery.error.message
                      : t('messages.loadInventoryFailed')}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="muted">{t('common.noData')}</td></tr>
              ) : (
                rows.map((r: InventoryStock) => {
                  const avail    = r.availableQuantity ?? 0;
                  const reserved = r.reservedQuantity  ?? 0;
                  return (
                    <tr key={r.id}>
                      <td className="mono">{r.id}</td>
                      <td className="mono">{r.warehouseName}&nbsp;(#{r.warehouseId})</td>
                      <td className="mono">{r.variantName}&nbsp;(#{r.variantId})</td>
                      <td>{r.productName}</td>
                      <td className="mono">{avail}</td>
                      <td className="mono">{reserved}</td>
                      <td className="mono">{avail + reserved}</td>
                      <td><StockBadge qty={avail} threshold={threshold} /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
