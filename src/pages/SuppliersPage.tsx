import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, type Supplier } from '../api/adminApi';

export function SuppliersPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const listQuery = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => adminApi.suppliers.list(),
  });

  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error(`${t('fields.name')}: ${t('common.required')}.`);
      return adminApi.suppliers.create({
        name: name.trim(),
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
    },
  });

  const canSubmit = useMemo(() => Boolean(name.trim() && !createMutation.isPending), [createMutation.isPending, name]);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">{t('pages.suppliersTitle')}</div>
          <div className="page__subtitle">{t('pages.suppliersSubtitle')}</div>
        </div>
      </div>

      <div className="card">
        <div className="card__label">{t('common.create')}</div>
        {createMutation.isError && (
          <div className="inline-alert">{createMutation.error instanceof Error ? createMutation.error.message : t('messages.saveFailed')}</div>
        )}
        <div className="form-grid">
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.name')}</div>
            <input className="adm-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nông Trại Xanh" />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.contactPerson')}</div>
            <input className="adm-input" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Anh Minh" />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.phone')}</div>
            <input className="adm-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0900..." />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.email')}</div>
            <input className="adm-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="(optional)" />
          </label>
          <label className="adm-field" style={{ gridColumn: '1 / -1' }}>
            <div className="adm-field__label">{t('fields.address')}</div>
            <input className="adm-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="(optional)" />
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
                <th>{t('table.name')}</th>
                <th>{t('table.contact')}</th>
                <th>{t('fields.phone')}</th>
                <th>{t('fields.email')}</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr>
                  <td colSpan={5} className="muted">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : listQuery.isError ? (
                <tr>
                  <td colSpan={5} className="muted">
                    {listQuery.error instanceof Error ? listQuery.error.message : t('messages.loadSuppliersFailed')}
                  </td>
                </tr>
              ) : (listQuery.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                (listQuery.data ?? []).map((s: Supplier) => (
                  <tr key={s.id}>
                    <td className="mono">{s.id}</td>
                    <td>{s.name}</td>
                    <td>{s.contactPerson ?? '-'}</td>
                    <td className="mono">{s.phone ?? '-'}</td>
                    <td className="mono">{s.email ?? '-'}</td>
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
