import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, type AuditLog } from '../api/adminApi';

const toLocalDateTimeParam = (value: string): string | undefined => {
  const v = value.trim();
  if (!v) return undefined;
  return v.length === 16 ? `${v}:00` : v;
};

export function AuditLogsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);

  const [actorId, setActorId] = useState('');
  const [actionType, setActionType] = useState('');
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [fromAt, setFromAt] = useState('');
  const [toAt, setToAt] = useState('');

  const params = useMemo(() => {
    const aid = Number(actorId);
    const eid = Number(entityId);
    return {
      page,
      size,
      actorId: Number.isFinite(aid) && aid > 0 ? aid : undefined,
      actionType: actionType.trim() || undefined,
      entityType: entityType.trim() || undefined,
      entityId: Number.isFinite(eid) && eid > 0 ? eid : undefined,
      fromAt: toLocalDateTimeParam(fromAt),
      toAt: toLocalDateTimeParam(toAt),
    };
  }, [actionType, actorId, entityId, entityType, fromAt, page, size, toAt]);

  const query = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => adminApi.auditLogs.search(params),
    staleTime: 5000,
  });

  const content = query.data?.content ?? [];

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">{t('pages.auditLogsTitle')}</div>
          <div className="page__subtitle">{t('pages.auditLogsSubtitle')}</div>
        </div>
      </div>

      <div className="card">
        <div className="filters">
          <div className="filters__row">
            <label className="adm-field">
              <div className="adm-field__label">{t('auditLogs.actorId')}</div>
              <input className="adm-input" value={actorId} onChange={(e) => setActorId(e.target.value)} placeholder="123" />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">{t('auditLogs.actionType')}</div>
              <input className="adm-input" value={actionType} onChange={(e) => setActionType(e.target.value)} placeholder="FORCE_RELEASE" />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">{t('auditLogs.entityType')}</div>
              <input className="adm-input" value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="ORDER" />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">{t('auditLogs.entityId')}</div>
              <input className="adm-input" value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="456" />
            </label>
          </div>

          <div className="filters__row">
            <label className="adm-field">
              <div className="adm-field__label">{t('auditLogs.from')}</div>
              <input className="adm-input" value={fromAt} onChange={(e) => setFromAt(e.target.value)} type="datetime-local" />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">{t('auditLogs.to')}</div>
              <input className="adm-input" value={toAt} onChange={(e) => setToAt(e.target.value)} type="datetime-local" />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">{t('auditLogs.pageSize')}</div>
              <select
                className="adm-input"
                value={String(size)}
                onChange={(e) => {
                  setPage(0);
                  setSize(Number(e.target.value));
                }}
              >
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </label>
            <div className="filters__actions">
              <button
                className="adm-button adm-button--ghost"
                type="button"
                onClick={() => {
                  setPage(0);
                  setActorId('');
                  setActionType('');
                  setEntityType('');
                  setEntityId('');
                  setFromAt('');
                  setToAt('');
                }}
              >
                {t('common.clear')}
              </button>
              <button className="adm-button adm-button--primary" type="button" onClick={() => query.refetch()} disabled={query.isFetching}>
                {query.isFetching ? t('common.loading') : t('common.search')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>{t('auditLogs.time')}</th>
                <th>{t('auditLogs.actor')}</th>
                <th>{t('auditLogs.action')}</th>
                <th>{t('auditLogs.entity')}</th>
                <th>{t('auditLogs.reason')}</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr>
                  <td colSpan={6} className="muted">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : query.isError ? (
                <tr>
                  <td colSpan={6} className="muted">
                    {query.error instanceof Error ? query.error.message : t('auditLogs.loadFailed')}
                  </td>
                </tr>
              ) : content.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                content.map((a: AuditLog) => (
                  <tr key={a.id}>
                    <td className="mono">{a.id}</td>
                    <td className="mono">{a.createdAt}</td>
                    <td>
                      <div>{a.actorName ?? '-'}</div>
                      <div className="muted mono">#{a.actorId}</div>
                    </td>
                    <td className="mono">{a.actionType}</td>
                    <td className="mono">
                      {a.entityType} #{a.entityId}
                    </td>
                    <td title={a.reason}>{a.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pager">
          <div className="muted">
            {t('auditLogs.total')}: {query.data?.totalElements ?? 0} • {t('auditLogs.page')} {query.data ? query.data.number + 1 : 0}/{query.data?.totalPages ?? 0}
          </div>
          <div className="pager__actions">
            <button className="adm-button adm-button--ghost" type="button" onClick={() => setPage(0)} disabled={!query.data || page <= 0}>
              {t('auditLogs.first')}
            </button>
            <button className="adm-button adm-button--ghost" type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={!query.data || page <= 0}>
              {t('auditLogs.prev')}
            </button>
            <button
              className="adm-button adm-button--ghost"
              type="button"
              onClick={() => setPage((p) => (query.data ? Math.min(query.data.totalPages - 1, p + 1) : p))}
              disabled={!query.data || page >= (query.data.totalPages ?? 1) - 1}
            >
              {t('auditLogs.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
