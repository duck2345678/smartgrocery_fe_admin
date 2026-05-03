import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../api/adminApi';

export function DashboardPage() {
  const { t } = useTranslation();
  const opsQuery = useQuery({
    queryKey: ['ops-monitor'],
    queryFn: () => adminApi.ops.monitor(),
    refetchInterval: 30000,
  });

  const issuesQuery = useQuery({
    queryKey: ['admin-issues-open'],
    queryFn: () => adminApi.issues.open(),
    refetchInterval: 30000,
  });

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">{t('pages.dashboardTitle')}</div>
          <div className="page__subtitle">{t('pages.dashboardSubtitle')}</div>
        </div>
      </div>

      <div className="card">
        <div className="row-actions row-actions--between">
          <div className="card__label">{t('pages.dashboardTitle')}</div>
          <div className="adm-chip">
            {t('dashboard.openIssues')}: {issuesQuery.data ? issuesQuery.data.length : 0}
          </div>
        </div>
      </div>

      <div className="grid grid--3">
        <div className="card">
          <div className="card__label">{t('dashboard.openIssues')}</div>
          <div className="card__value">{issuesQuery.data ? issuesQuery.data.length : issuesQuery.isLoading ? '...' : '-'}</div>
          <div className="card__hint">{t('dashboard.adminInboxHint')}</div>
        </div>

        <div className="card">
          <div className="card__label">{t('dashboard.ordersAtSlaRisk')}</div>
          <div className="card__value">
            {opsQuery.data ? opsQuery.data.stagnantOrders.length : opsQuery.isLoading ? '...' : '-'}
          </div>
          <div className="card__hint">{t('dashboard.pendingSlaHint')}</div>
        </div>

        <div className="card">
          <div className="card__label">{t('dashboard.stalledStaff')}</div>
          <div className="card__value">
            {opsQuery.data ? opsQuery.data.stalledStaffOrders.length : opsQuery.isLoading ? '...' : '-'}
          </div>
          <div className="card__hint">{t('dashboard.assignedNoUpdateHint')}</div>
        </div>
      </div>

      <div className="grid grid--2">
        <div className="card">
          <div className="card__label">{t('dashboard.stagnantOrders')}</div>
          <div className="card__hint">{t('dashboard.top10')}</div>
          <div className="list">
            {(opsQuery.data?.stagnantOrders ?? []).slice(0, 10).map((o) => (
              <div className="list__row" key={o.orderId}>
                <div className="mono">#{o.orderNumber || o.orderId}</div>
                <div className="muted">
                  {t('dashboard.toSla')}: {o.minutesToSla != null ? `${o.minutesToSla}m` : t('dashboard.na')}
                </div>
              </div>
            ))}
            {!opsQuery.isLoading && (opsQuery.data?.stagnantOrders ?? []).length === 0 && <div className="muted">{t('common.noData')}</div>}
          </div>
        </div>

        <div className="card">
          <div className="card__label">{t('dashboard.openIssues')}</div>
          <div className="card__hint">{t('dashboard.top10')}</div>
          <div className="list">
            {(issuesQuery.data ?? []).slice(0, 10).map((it) => (
              <div className="list__row" key={it.id}>
                <div className="mono">#{it.id}</div>
                <div className="muted">{it.issueType}</div>
              </div>
            ))}
            {!issuesQuery.isLoading && (issuesQuery.data ?? []).length === 0 && <div className="muted">{t('common.noData')}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
