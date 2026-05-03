import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, type PurchaseOrder, type Supplier, type Warehouse } from '../api/adminApi';

type DraftItem = { variantId: string; quantity: string; unitPrice: string };

export function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const listQuery = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => adminApi.purchaseOrders.list(),
  });

  const suppliersQuery = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => adminApi.suppliers.list(),
    staleTime: 30000,
  });

  const warehousesQuery = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => adminApi.warehouses.list(),
    staleTime: 30000,
  });

  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ variantId: '', quantity: '', unitPrice: '' }]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const sid = Number(supplierId);
      if (!Number.isFinite(sid) || sid <= 0) throw new Error(t('purchaseOrders.validation.supplierRequired'));

      const parsed = items.map((it) => ({
        rawVariantId: it.variantId.trim(),
        variantId: Number(it.variantId),
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
      }));

      for (const it of parsed) {
        if (it.rawVariantId !== '' && (!Number.isFinite(it.variantId) || it.variantId <= 0)) throw new Error(t('purchaseOrders.validation.variantIdInvalid'));
      }

      const normalized = parsed
        .filter((x) => Number.isFinite(x.variantId) && x.variantId > 0)
        .map((x) => ({ variantId: x.variantId, quantity: x.quantity, unitPrice: x.unitPrice }));

      if (normalized.length === 0) throw new Error(t('purchaseOrders.validation.itemsRequired'));
      for (const it of normalized) {
        if (!Number.isFinite(it.quantity) || it.quantity <= 0) throw new Error(t('purchaseOrders.validation.quantityInvalid'));
        if (!Number.isFinite(it.unitPrice) || it.unitPrice < 0) throw new Error(t('purchaseOrders.validation.unitPriceInvalid'));
      }

      return adminApi.purchaseOrders.createDraft({ supplierId: sid, items: normalized });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setSupplierId('');
      setItems([{ variantId: '', quantity: '', unitPrice: '' }]);
    },
  });

  const [receiveWarehouseIdByPo, setReceiveWarehouseIdByPo] = useState<Record<number, string>>({});

  const receiveMutation = useMutation({
    mutationFn: async (payload: { poId: number; warehouseId: number }) => adminApi.purchaseOrders.receive(payload.poId, payload.warehouseId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  const canCreate = useMemo(() => {
    const sid = Number(supplierId);
    if (!Number.isFinite(sid) || sid <= 0) return false;
    if (createMutation.isPending) return false;
    return true;
  }, [createMutation.isPending, supplierId]);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">{t('pages.purchaseOrdersTitle')}</div>
          <div className="page__subtitle">{t('pages.purchaseOrdersSubtitle')}</div>
        </div>
      </div>

      <div className="card">
        <div className="card__label">{t('purchaseOrders.createDraftTitle')}</div>
        {createMutation.isError && (
          <div className="inline-alert">
            {createMutation.error instanceof Error ? createMutation.error.message : t('purchaseOrders.errors.createDraftFailed')}
          </div>
        )}
        <div className="row-actions">
          <label className="adm-field" style={{ minWidth: 280 }}>
            <div className="adm-field__label">{t('purchaseOrders.supplierLabel')}</div>
            <select className="adm-input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">{t('purchaseOrders.supplierPlaceholder')}</option>
              {(suppliersQuery.data ?? []).map((s: Supplier) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name} (#{s.id})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th style={{ width: 180 }}>{t('purchaseOrders.variantId')}</th>
                <th style={{ width: 180 }}>{t('purchaseOrders.quantity')}</th>
                <th style={{ width: 180 }}>{t('purchaseOrders.unitPrice')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx}>
                  <td>
                    <input
                      className="adm-input"
                      value={it.variantId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, variantId: v } : x)));
                      }}
                      placeholder={t('purchaseOrders.placeholders.variantId')}
                    />
                  </td>
                  <td>
                    <input
                      className="adm-input"
                      value={it.quantity}
                      onChange={(e) => {
                        const v = e.target.value;
                        setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, quantity: v } : x)));
                      }}
                      placeholder={t('purchaseOrders.placeholders.quantity')}
                    />
                  </td>
                  <td>
                    <input
                      className="adm-input"
                      value={it.unitPrice}
                      onChange={(e) => {
                        const v = e.target.value;
                        setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, unitPrice: v } : x)));
                      }}
                      placeholder={t('purchaseOrders.placeholders.unitPrice')}
                    />
                  </td>
                  <td className="cell-actions">
                    <button
                      className="adm-button adm-button--ghost"
                      type="button"
                      onClick={() => setItems((arr) => arr.filter((_, i) => i !== idx))}
                      disabled={items.length <= 1 || createMutation.isPending}
                    >
                      {t('purchaseOrders.removeItem')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="row-actions">
          <button
            className="adm-button adm-button--ghost"
            type="button"
            onClick={() => setItems((arr) => [...arr, { variantId: '', quantity: '', unitPrice: '' }])}
            disabled={createMutation.isPending}
          >
            {t('purchaseOrders.addItem')}
          </button>
          <button className="adm-button adm-button--primary" type="button" onClick={() => createMutation.mutate()} disabled={!canCreate}>
            {createMutation.isPending ? t('purchaseOrders.creatingDraft') : t('purchaseOrders.createDraftAction')}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>{t('table.id')}</th>
                <th>{t('purchaseOrders.table.poNumber')}</th>
                <th>{t('purchaseOrders.supplierLabel')}</th>
                <th>{t('fields.status')}</th>
                <th>{t('table.total')}</th>
                <th>{t('purchaseOrders.table.createdAt')}</th>
                <th>{t('purchaseOrders.table.receive')}</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="muted">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : listQuery.isError ? (
                <tr>
                  <td colSpan={7} className="muted">
                    {listQuery.error instanceof Error ? listQuery.error.message : t('messages.loadPurchaseOrdersFailed')}
                  </td>
                </tr>
              ) : (listQuery.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                (listQuery.data ?? []).map((po: PurchaseOrder) => {
                  const selectedWh = receiveWarehouseIdByPo[po.id] ?? '';
                  const canReceive = po.status?.toUpperCase() === 'DRAFT' && Number(selectedWh) > 0 && !receiveMutation.isPending;
                  return (
                    <tr key={po.id}>
                      <td className="mono">{po.id}</td>
                      <td className="mono">{po.poNumber ?? '-'}</td>
                      <td>{po.supplierName ?? `#${po.supplierId ?? '-'}`}</td>
                      <td className="mono">{po.status ?? '-'}</td>
                      <td className="mono">{po.totalAmount != null ? String(po.totalAmount) : '-'}</td>
                      <td className="mono">{po.createdAt ?? '-'}</td>
                      <td>
                        <div className="row-actions" style={{ justifyContent: 'flex-start' }}>
                          <select
                            className="adm-input"
                            value={selectedWh}
                            onChange={(e) => setReceiveWarehouseIdByPo((m) => ({ ...m, [po.id]: e.target.value }))}
                          >
                            <option value="">{t('purchaseOrders.receiveWarehousePlaceholder')}</option>
                            {(warehousesQuery.data ?? []).map((w: Warehouse) => (
                              <option key={w.id} value={String(w.id)}>
                                {w.name} (#{w.id})
                              </option>
                            ))}
                          </select>
                          <button
                            className="adm-button adm-button--primary"
                            type="button"
                            onClick={() => receiveMutation.mutate({ poId: po.id, warehouseId: Number(selectedWh) })}
                            disabled={!canReceive}
                          >
                            {receiveMutation.isPending ? t('purchaseOrders.receiving') : t('purchaseOrders.receiveAction')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {receiveMutation.isError && (
          <div className="inline-alert">
            {receiveMutation.error instanceof Error ? receiveMutation.error.message : t('purchaseOrders.errors.receiveFailed')}
          </div>
        )}
      </div>
    </div>
  );
}
