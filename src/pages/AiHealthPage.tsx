import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../api/adminApi';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

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
    onSuccess: () => { void healthQuery.refetch(); },
  });

  const queries = topQueriesQuery.data ?? [];

  const queryStats = useMemo(() => ({
    unique:      queries.length,
    totalVolume: queries.reduce((s, q) => s + q.count, 0),
    maxCount:    Math.max(...queries.map((q) => q.count), 1),
  }), [queries]);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">{t('pages.aiTitle')}</div>
          <div className="page__subtitle">{t('pages.aiSubtitle')}</div>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid--3">
        <div className="card">
          <div className="card__label">Trạng thái Neo4j</div>
          <div className="card__value" style={{ fontSize: 22 }}>
            {healthQuery.isLoading ? (
              <span className="muted">…</span>
            ) : (
              <span className={`adm-badge adm-badge--lg ${healthQuery.data?.ok ? 'adm-badge--success' : 'adm-badge--danger'}`}
                style={{ fontSize: 15, padding: '4px 14px' }}>
                {healthQuery.data?.ok ? '● Healthy' : '● Unhealthy'}
              </span>
            )}
          </div>
          <div className="card__hint">
            Nodes: <strong style={{ color: 'var(--fg)' }}>
              {healthQuery.data?.productNodeCount ?? '—'}
            </strong>
          </div>
        </div>

        <div className="card">
          <div className="card__label">Unique Queries</div>
          <div className="card__value">
            {topQueriesQuery.isLoading ? <span className="muted">…</span> : queryStats.unique.toLocaleString('vi-VN')}
          </div>
          <div className="card__hint">Truy vấn AI khác nhau (top {limit})</div>
        </div>

        <div className="card">
          <div className="card__label">Tổng lượt tìm kiếm</div>
          <div className="card__value">
            {topQueriesQuery.isLoading ? <span className="muted">…</span> : queryStats.totalVolume.toLocaleString('vi-VN')}
          </div>
          <div className="card__hint">Tổng count trong top {limit}</div>
        </div>
      </div>

      <div className="grid grid--2">
        {/* ── Neo4j Health ── */}
        <div className="card">
          <div className="card__label">{t('ai.neo4jHealth')}</div>

          {healthQuery.isLoading ? (
            <div className="muted">{t('common.loading')}</div>
          ) : healthQuery.isError ? (
            <div className="inline-alert">
              {healthQuery.error instanceof Error ? healthQuery.error.message : t('messages.checkNeo4jFailed')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)', minWidth: 110 }}>Trạng thái</span>
                <span className={`adm-badge ${healthQuery.data?.ok ? 'adm-badge--success' : 'adm-badge--danger'}`}>
                  {healthQuery.data?.ok ? t('ai.healthy') : t('ai.unhealthy')}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)', minWidth: 110 }}>{t('ai.productNodes')}</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>
                  {(healthQuery.data?.productNodeCount ?? 0).toLocaleString('vi-VN')}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)', minWidth: 110 }}>{t('ai.checkedAt')}</span>
                <span style={{ fontSize: 13 }}>{fmtDate(healthQuery.data?.checkedAt)}</span>
              </div>
            </div>
          )}

          <div className="row-actions" style={{ marginTop: 16 }}>
            <button
              className="adm-button adm-button--ghost"
              type="button"
              onClick={() => healthQuery.refetch()}
              disabled={healthQuery.isFetching}
            >
              {t('common.refresh')}
            </button>
            <button
              className="adm-button adm-button--primary"
              type="button"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? t('ai.syncing') : t('ai.forceSync')}
            </button>
          </div>

          {syncMutation.isError && (
            <div className="inline-alert" style={{ marginTop: 12 }}>
              {syncMutation.error instanceof Error ? syncMutation.error.message : t('messages.saveFailed')}
            </div>
          )}

          {syncMutation.isSuccess && (
            <div style={{
              marginTop: 14, padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(var(--emerald-rgb, 16,185,129), 0.3)',
              background: 'rgba(16,185,129,0.06)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 20 }}>✓</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--emerald)' }}>Đồng bộ thành công</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  Đã đồng bộ{' '}
                  <strong style={{ color: 'var(--fg)', fontFamily: 'var(--mono)' }}>
                    {syncMutation.data.syncedCount.toLocaleString('vi-VN')}
                  </strong>{' '}
                  sản phẩm vào Neo4j
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Top Queries ── */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="card__label">{t('ai.topQueries')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                className="adm-input"
                style={{ width: 90, padding: '3px 6px', fontSize: 12 }}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              >
                <option value="10">Top 10</option>
                <option value="20">Top 20</option>
                <option value="50">Top 50</option>
              </select>
              <button
                className="adm-button adm-button--ghost"
                type="button"
                style={{ padding: '4px 10px', fontSize: 12 }}
                onClick={() => topQueriesQuery.refetch()}
                disabled={topQueriesQuery.isFetching}
              >
                {t('common.refresh')}
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('ai.query')}</th>
                  <th style={{ width: 160 }}>{t('ai.count')}</th>
                </tr>
              </thead>
              <tbody>
                {topQueriesQuery.isLoading ? (
                  <tr><td colSpan={3} className="muted">{t('common.loading')}</td></tr>
                ) : topQueriesQuery.isError ? (
                  <tr>
                    <td colSpan={3} className="muted">
                      {topQueriesQuery.error instanceof Error ? topQueriesQuery.error.message : t('messages.loadAnalyticsFailed')}
                    </td>
                  </tr>
                ) : queries.length === 0 ? (
                  <tr><td colSpan={3} className="muted">{t('common.noData')}</td></tr>
                ) : (
                  queries.map((x, idx) => (
                    <tr key={`${x.query}-${x.count}`}>
                      <td className="mono" style={{ color: 'var(--muted)', fontSize: 12 }}>{idx + 1}</td>
                      <td>
                        <span
                          title={x.query}
                          style={{
                            display: 'block', maxWidth: 280,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            fontSize: 13,
                          }}
                        >
                          {x.query}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            flex: 1, height: 6, borderRadius: 999,
                            background: 'var(--border)', overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${(x.count / queryStats.maxCount) * 100}%`,
                              background: 'var(--grad-primary)',
                              borderRadius: 999,
                              transition: 'width 400ms ease',
                            }} />
                          </div>
                          <span className="mono" style={{ fontSize: 12, minWidth: 32, textAlign: 'right' }}>
                            {x.count.toLocaleString('vi-VN')}
                          </span>
                        </div>
                      </td>
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
