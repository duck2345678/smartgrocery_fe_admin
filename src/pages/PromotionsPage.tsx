import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, type PromotionCampaign } from '../api/adminApi';

export function PromotionsPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const listQuery = useQuery({
    queryKey: ['promotions-campaigns'],
    queryFn: () => adminApi.promotions.listCampaigns(),
  });

  const [campaignCode, setCampaignCode] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState('PERCENT');
  const [status, setStatus] = useState('ACTIVE');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!campaignCode.trim()) throw new Error(t('promotions.validation.campaignCodeRequired'));
      if (!campaignName.trim()) throw new Error(t('promotions.validation.campaignNameRequired'));
      if (!campaignType.trim()) throw new Error(t('promotions.validation.campaignTypeRequired'));
      if (!status.trim()) throw new Error(t('promotions.validation.statusRequired'));
      return adminApi.promotions.createCampaign({
        campaignCode: campaignCode.trim(),
        campaignName: campaignName.trim(),
        campaignType: campaignType.trim(),
        status: status.trim(),
        startsAt: startsAt.trim() ? (startsAt.trim().length === 16 ? `${startsAt.trim()}:00` : startsAt.trim()) : undefined,
        endsAt: endsAt.trim() ? (endsAt.trim().length === 16 ? `${endsAt.trim()}:00` : endsAt.trim()) : undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['promotions-campaigns'] });
      setCampaignCode('');
      setCampaignName('');
      setCampaignType('PERCENT');
      setStatus('ACTIVE');
      setStartsAt('');
      setEndsAt('');
    },
  });

  const canSubmit = useMemo(() => {
    if (!campaignCode.trim()) return false;
    if (!campaignName.trim()) return false;
    if (!campaignType.trim()) return false;
    if (!status.trim()) return false;
    return !createMutation.isPending;
  }, [campaignCode, campaignName, campaignType, createMutation.isPending, status]);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">{t('pages.promotionsTitle')}</div>
          <div className="page__subtitle">{t('pages.promotionsSubtitle')}</div>
        </div>
      </div>

      <div className="card">
        <div className="card__label">{t('promotions.createCampaignTitle')}</div>
        {createMutation.isError && (
          <div className="inline-alert">
            {createMutation.error instanceof Error ? createMutation.error.message : t('promotions.errors.createFailed')}
          </div>
        )}
        <div className="form-grid">
          <label className="adm-field">
            <div className="adm-field__label">{t('promotions.fields.campaignCode')}</div>
            <input
              className="adm-input"
              value={campaignCode}
              onChange={(e) => setCampaignCode(e.target.value)}
              placeholder={t('promotions.placeholders.campaignCode')}
            />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('promotions.fields.campaignName')}</div>
            <input
              className="adm-input"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder={t('promotions.placeholders.campaignName')}
            />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('promotions.fields.campaignType')}</div>
            <input
              className="adm-input"
              value={campaignType}
              onChange={(e) => setCampaignType(e.target.value)}
              placeholder={t('promotions.placeholders.campaignType')}
            />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('promotions.fields.status')}</div>
            <input className="adm-input" value={status} onChange={(e) => setStatus(e.target.value)} placeholder={t('promotions.placeholders.status')} />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('promotions.fields.startsAt')}</div>
            <input className="adm-input" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} type="datetime-local" />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('promotions.fields.endsAt')}</div>
            <input className="adm-input" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} type="datetime-local" />
          </label>
        </div>
        <div className="row-actions">
          <button className="adm-button adm-button--primary" type="button" onClick={() => createMutation.mutate()} disabled={!canSubmit}>
            {createMutation.isPending ? t('promotions.creating') : t('promotions.createAction')}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>{t('table.id')}</th>
                <th>{t('promotions.table.code')}</th>
                <th>{t('promotions.table.name')}</th>
                <th>{t('promotions.table.type')}</th>
                <th>{t('promotions.table.status')}</th>
                <th>{t('promotions.table.starts')}</th>
                <th>{t('promotions.table.ends')}</th>
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
                    {listQuery.error instanceof Error ? listQuery.error.message : t('messages.loadPromotionsFailed')}
                  </td>
                </tr>
              ) : (listQuery.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                (listQuery.data ?? []).map((c: PromotionCampaign) => (
                  <tr key={c.id}>
                    <td className="mono">{c.id}</td>
                    <td className="mono">{c.campaignCode}</td>
                    <td>{c.campaignName}</td>
                    <td className="mono">{c.campaignType}</td>
                    <td className="mono">{c.status}</td>
                    <td className="mono">{c.startsAt ?? '-'}</td>
                    <td className="mono">{c.endsAt ?? '-'}</td>
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
