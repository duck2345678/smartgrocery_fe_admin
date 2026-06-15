import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, type Warehouse } from '../api/adminApi';

export function WarehousesPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const listQuery = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => adminApi.warehouses.list(),
  });

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!code.trim()) throw new Error(`${t('fields.code')}: ${t('common.required')}.`);
      if (!name.trim()) throw new Error(`${t('fields.name')}: ${t('common.required')}.`);
      return adminApi.warehouses.create({ code: code.trim(), name: name.trim(), location: location.trim() || undefined });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setCode('');
      setName('');
      setLocation('');
    },
  });

  const canSubmit = useMemo(() => Boolean(code.trim() && name.trim() && !createMutation.isPending), [code, createMutation.isPending, name]);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">{t('pages.warehousesTitle')}</div>
          <div className="page__subtitle">{t('pages.warehousesSubtitle')}</div>
        </div>
      </div>

      <div className="card">
        <div className="card__label">{t('common.create')}</div>
        {createMutation.isError && (
          <div className="inline-alert">{createMutation.error instanceof Error ? createMutation.error.message : t('messages.saveFailed')}</div>
        )}
        <div className="form-grid">
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.code')}</div>
            <input className="adm-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="VD: WH_MAIN, WH_HCM" />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.name')}</div>
            <input className="adm-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Kho Trung Tâm, Kho Miền Nam" />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.location')}</div>
            <input className="adm-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="VD: TP. Thủ Đức, Quận 1, Hà Nội" />
          </label>
        </div>
        <div className="row-actions">
          <button className="adm-button adm-button--primary" type="button" onClick={() => createMutation.mutate()} disabled={!canSubmit}>
            {createMutation.isPending ? t('common.saving') : t('common.create')}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>{t('table.id')}</th>
                <th>{t('table.code')}</th>
                <th>{t('table.name')}</th>
                <th>{t('table.location')}</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr>
                  <td colSpan={4} className="muted">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : listQuery.isError ? (
                <tr>
                  <td colSpan={4} className="muted">
                    {listQuery.error instanceof Error ? listQuery.error.message : t('messages.loadWarehousesFailed')}
                  </td>
                </tr>
              ) : (listQuery.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                (listQuery.data ?? []).map((w: Warehouse) => (
                  <tr key={w.id}>
                    <td className="mono">{w.id}</td>
                    <td className="mono">{w.code}</td>
                    <td>{w.name}</td>
                    <td>{w.location ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
