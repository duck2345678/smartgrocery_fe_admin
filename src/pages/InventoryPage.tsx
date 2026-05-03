import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, type InventoryStock, type Warehouse } from '../api/adminApi';

export function InventoryPage() {
  const { t } = useTranslation();
  const [warehouseId, setWarehouseId] = useState<string>('all');

  const warehousesQuery = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => adminApi.warehouses.list(),
    staleTime: 30000,
  });

  const inventoryQuery = useQuery({
    queryKey: ['inventory', warehouseId],
    queryFn: () => {
      if (warehouseId === 'all') return adminApi.inventory.listAll();
      return adminApi.inventory.byWarehouse(Number(warehouseId));
    },
  });

  const rows = useMemo(() => inventoryQuery.data ?? [], [inventoryQuery.data]);
  const totalAvailable = useMemo(() => rows.reduce((sum, r) => sum + (r.availableQuantity ?? 0), 0), [rows]);

  const lowStockCount = useMemo(() => {
    const data = inventoryQuery.data ?? [];
    return data.filter((r) => (r.availableQuantity ?? 0) <= 5).length;
  }, [inventoryQuery.data]);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">{t('pages.inventoryTitle')}</div>
          <div className="page__subtitle">{t('pages.inventorySubtitle')}</div>
        </div>
      </div>

      <div className="card">
        <div className="row-actions">
          <label className="adm-field" style={{ minWidth: 240 }}>
            <div className="adm-field__label">{t('inventory.warehouseFilter')}</div>
            <select className="adm-input" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              <option value="all">{t('inventory.allWarehouses')}</option>
              {(warehousesQuery.data ?? []).map((w: Warehouse) => (
                <option key={w.id} value={String(w.id)}>
                  {w.name} (#{w.id})
                </option>
              ))}
            </select>
          </label>
          <div className="adm-chip">
            {t('inventory.lowStock')}: {lowStockCount}
          </div>
        </div>
      </div>

      <div className="grid grid--3">
        <div className="card">
          <div className="card__label">{t('table.total')}</div>
          <div className="card__value">{rows.length}</div>
          <div className="card__hint">{warehouseId === 'all' ? t('inventory.allWarehouses') : t('inventory.warehouseFilter')}</div>
        </div>
        <div className="card">
          <div className="card__label">{t('table.available')}</div>
          <div className="card__value">{totalAvailable}</div>
          <div className="card__hint">{t('pages.inventoryTitle')}</div>
        </div>
        <div className="card">
          <div className="card__label">{t('inventory.lowStock')}</div>
          <div className="card__value">{lowStockCount}</div>
          <div className="card__hint">{t('pages.inventorySubtitle')}</div>
        </div>
      </div>

      <div className="card">
        <div className="row-actions row-actions--between">
          <div className="card__label">{t('pages.inventoryTitle')}</div>
          <div className="adm-chip">{t('table.total')}: {rows.length}</div>
        </div>
        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>{t('table.id')}</th>
                <th>{t('table.warehouse')}</th>
                <th>{t('table.variant')}</th>
                <th>{t('table.product')}</th>
                <th>{t('table.available')}</th>
                <th>{t('table.reserved')}</th>
              </tr>
            </thead>
            <tbody>
              {inventoryQuery.isLoading ? (
                <tr>
                  <td colSpan={6} className="muted">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : inventoryQuery.isError ? (
                <tr>
                  <td colSpan={6} className="muted">
                    {inventoryQuery.error instanceof Error ? inventoryQuery.error.message : t('messages.loadInventoryFailed')}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                rows.map((r: InventoryStock) => {
                  const isLow = (r.availableQuantity ?? 0) <= 5;
                  return (
                    <tr key={r.id} className={isLow ? 'row-low' : ''}>
                      <td className="mono">{r.id}</td>
                      <td className="mono">
                        {r.warehouseName} (#{r.warehouseId})
                      </td>
                      <td className="mono">{r.variantName} (#{r.variantId})</td>
                      <td>{r.productName}</td>
                      <td className="mono">{r.availableQuantity}</td>
                      <td className="mono">{r.reservedQuantity}</td>
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
