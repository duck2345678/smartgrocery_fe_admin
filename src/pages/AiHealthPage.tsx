import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../api/adminApi';

export function AiHealthPage() {
  const { t } = useTranslation();
  const [limit, setLimit] = useState('20');

  const healthQuery = useQuery({
    queryKey: ['ai-neo4j-health'],
    queryFn: () => adminApi.aiAdmin.neo4jHealth(),
    refetchInterval: 30000,
  });

  const topQueriesQuery = useQuery({
    queryKey: ['ai-top-queries', limit],
    queryFn: () => adminApi.aiAdmin.topQueries(Number(limit) || 20),
  });

  const syncMutation = useMutation({
    mutationFn: () => adminApi.aiAdmin.neo4jSync(),
    onSuccess: () => {
      void healthQuery.refetch();
    },
  });

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">{t('pages.aiTitle')}</div>
          <div className="page__subtitle">{t('pages.aiSubtitle')}</div>
        </div>
      </div>

      <div className="grid grid--2">
        <div className="card">
          <div className="card__label">{t('ai.neo4jHealth')}</div>
          {healthQuery.isLoading ? (
            <div className="muted">{t('common.loading')}</div>
          ) : healthQuery.isError ? (
            <div className="inline-alert">{healthQuery.error instanceof Error ? healthQuery.error.message : t('messages.checkNeo4jFailed')}</div>
          ) : (
            <>
              <div className="card__value">{healthQuery.data?.ok ? t('ai.healthy') : t('ai.unhealthy')}</div>
              <div className="card__hint">
                {t('ai.productNodes')}: {healthQuery.data?.productNodeCount ?? 0}
              </div>
              <div className="card__hint">
                {t('ai.checkedAt')}: {healthQuery.data?.checkedAt ?? ''}
              </div>
            </>
          )}
          <div className="row-actions">
            <button className="adm-button adm-button--ghost" type="button" onClick={() => healthQuery.refetch()} disabled={healthQuery.isFetching}>
              {t('common.refresh')}
            </button>
            <button className="adm-button adm-button--primary" type="button" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
              {syncMutation.isPending ? t('ai.syncing') : t('ai.forceSync')}
            </button>
          </div>
          {syncMutation.isError && (
            <div className="inline-alert">{syncMutation.error instanceof Error ? syncMutation.error.message : t('messages.saveFailed')}</div>
          )}
          {syncMutation.isSuccess && (
            <div className="inline-alert inline-alert--ok">
              {t('ai.syncedCount')}: {syncMutation.data.syncedCount}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card__label">{t('ai.topQueries')}</div>
          <div className="row-actions">
            <label className="adm-field" style={{ minWidth: 120 }}>
              <div className="adm-field__label">{t('fields.limit')}</div>
              <select className="adm-input" value={limit} onChange={(e) => setLimit(e.target.value)}>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </label>
            <button className="adm-button adm-button--ghost" type="button" onClick={() => topQueriesQuery.refetch()} disabled={topQueriesQuery.isFetching}>
              {t('common.refresh')}
            </button>
          </div>

          <div className="table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>{t('ai.query')}</th>
                  <th style={{ width: 120 }}>{t('ai.count')}</th>
                </tr>
              </thead>
              <tbody>
                {topQueriesQuery.isLoading ? (
                  <tr>
                    <td colSpan={2} className="muted">
                      {t('common.loading')}
                    </td>
                  </tr>
                ) : topQueriesQuery.isError ? (
                  <tr>
                    <td colSpan={2} className="muted">
                      {topQueriesQuery.error instanceof Error ? topQueriesQuery.error.message : t('messages.loadAnalyticsFailed')}
                    </td>
                  </tr>
                ) : (topQueriesQuery.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={2} className="muted">
                      {t('common.noData')}
                    </td>
                  </tr>
                ) : (
                  (topQueriesQuery.data ?? []).map((x) => (
                    <tr key={`${x.query}-${x.count}`}>
                      <td title={x.query}>{x.query}</td>
                      <td className="mono">{x.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
