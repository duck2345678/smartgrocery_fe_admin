import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, type InventoryStock, type Warehouse } from '../api/adminApi';

type SortDir = 'asc' | 'desc';

function StockBadge({ qty, threshold }: { qty: number; threshold: number }) {
  if (qty === 0) return <span className="adm-badge adm-badge--danger">Het hang</span>;
  if (qty <= threshold) return <span className="adm-badge adm-badge--warn">Ton thap</span>;
  return <span className="adm-badge adm-badge--success">On dinh</span>;
}

export function InventoryPage() {
  const { t } = useTranslation();

  const [warehouseId, setWarehouseId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [threshold, setThreshold] = useState(10);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const warehousesQuery = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => adminApi.warehouses.list(),
    staleTime: 30000,
  });

  const inventoryQuery = useQuery({
    queryKey: ['inventory', warehouseId, page, size, search],
    queryFn: () =>
      warehouseId === 'all'
        ? adminApi.inventory.listAll({ page, size, search: search.trim() || undefined })
        : adminApi.inventory.byWarehouse(Number(warehouseId), { page, size, search: search.trim() || undefined }),
  });

  const allRows = useMemo(() => inventoryQuery.data?.content ?? [], [inventoryQuery.data]);
  const rows = useMemo(
    () =>
      [...allRows].sort((a, b) => {
        const diff = (a.availableQuantity ?? 0) - (b.availableQuantity ?? 0);
        return sortDir === 'asc' ? diff : -diff;
      }),
    [allRows, sortDir],
  );

  const outCount = useMemo(() => allRows.filter((r) => (r.availableQuantity ?? 0) === 0).length, [allRows]);
  const lowCount = useMemo(
    () => allRows.filter((r) => { const q = r.availableQuantity ?? 0; return q > 0 && q <= threshold; }).length,
    [allRows, threshold],
  );
  const totalAvail = useMemo(() => allRows.reduce((s, r) => s + (r.availableQuantity ?? 0), 0), [allRows]);
  const totalElements = inventoryQuery.data?.totalElements ?? 0;
  const totalPages = inventoryQuery.data?.totalPages ?? 0;
  const selectedWarehouse = warehousesQuery.data?.find((w) => String(w.id) === warehouseId);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">{t('pages.inventoryTitle')}</div>
          <div className="page__subtitle">{t('pages.inventorySubtitle')}</div>
        </div>
      </div>

      <div className="grid grid--4">
        <div className="card">
          <div className="card__label">Tong mat hang</div>
          <div className="card__value">{totalElements.toLocaleString('vi-VN')}</div>
          <div className="card__hint">{warehouseId === 'all' ? 'Tat ca kho' : (selectedWarehouse?.name ?? 'Kho da chon')}</div>
        </div>
        <div className="card">
          <div className="card__label">Het hang</div>
          <div className="card__value" style={{ color: outCount > 0 ? 'var(--danger)' : undefined }}>
            {outCount}
          </div>
          <div className="card__hint">Trong trang hien tai</div>
        </div>
        <div className="card">
          <div className="card__label">Ton thap</div>
          <div className="card__value" style={{ color: lowCount > 0 ? 'var(--warn)' : undefined }}>
            {lowCount}
          </div>
          <div className="card__hint">1 - {threshold} don vi, trang hien tai</div>
        </div>
        <div className="card">
          <div className="card__label">Tong kha dung</div>
          <div className="card__value">{totalAvail.toLocaleString('vi-VN')}</div>
          <div className="card__hint">San ban trong trang hien tai</div>
        </div>
      </div>

      <div className="card">
        <div className="filters">
          <div className="filters__row">
            <label className="adm-field" style={{ flex: 2 }}>
              <div className="adm-field__label">Tim san pham / bien the</div>
              <input
                className="adm-input"
                placeholder="Nhap ten san pham hoac bien the..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </label>
            <label className="adm-field" style={{ minWidth: 200 }}>
              <div className="adm-field__label">Kho hang</div>
              <select
                className="adm-input"
                value={warehouseId}
                onChange={(e) => {
                  setWarehouseId(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">Tat ca kho</option>
                {(warehousesQuery.data ?? []).map((w: Warehouse) => (
                  <option key={w.id} value={String(w.id)}>
                    {w.name} (#{w.id})
                  </option>
                ))}
              </select>
            </label>
            <label className="adm-field" style={{ minWidth: 150 }}>
              <div className="adm-field__label">Nguong ton thap</div>
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

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div className="card__label">Danh sach ton kho</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <span className="adm-chip">Hien thi: {rows.length} / {totalElements}</span>
            <select
              className="adm-input"
              style={{ width: 104, height: 32, fontSize: 12 }}
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(0);
              }}
            >
              <option value={10}>10 / trang</option>
              <option value={20}>20 / trang</option>
              <option value={50}>50 / trang</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Kho</th>
                <th>Bien the</th>
                <th>San pham</th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                  onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                >
                  Kha dung&nbsp;{sortDir === 'asc' ? '↑' : '↓'}
                </th>
                <th>Reserved</th>
                <th>Tong ton</th>
                <th>Trang thai</th>
              </tr>
            </thead>
            <tbody>
              {inventoryQuery.isLoading ? (
                <tr><td colSpan={8} className="muted">{t('common.loading')}</td></tr>
              ) : inventoryQuery.isError ? (
                <tr>
                  <td colSpan={8} className="muted">
                    {inventoryQuery.error instanceof Error ? inventoryQuery.error.message : t('messages.loadInventoryFailed')}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="muted">{t('common.noData')}</td></tr>
              ) : (
                rows.map((r: InventoryStock) => {
                  const avail = r.availableQuantity ?? 0;
                  const reserved = r.reservedQuantity ?? 0;
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <span className="muted" style={{ fontSize: 12 }}>
            Trang {totalPages === 0 ? 0 : page + 1} / {totalPages}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="adm-button"
              type="button"
              disabled={page <= 0 || inventoryQuery.isLoading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Truoc
            </button>
            <button
              className="adm-button"
              type="button"
              disabled={page + 1 >= totalPages || inventoryQuery.isLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Tiep
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
