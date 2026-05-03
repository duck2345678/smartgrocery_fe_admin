import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/adminApi';

export function AdminIssuesPage() {
  const issuesQuery = useQuery({
    queryKey: ['admin-issues-open'],
    queryFn: () => adminApi.issues.open(),
    refetchInterval: 30000,
  });

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">Admin Issues</div>
          <div className="page__subtitle">Inbox xử lý sự cố ON_HOLD.</div>
        </div>
      </div>

      <div className="card">
        {issuesQuery.isLoading ? (
          <div className="muted">Đang tải issue...</div>
        ) : issuesQuery.isError ? (
          <div className="muted">Không tải được issue.</div>
        ) : (issuesQuery.data ?? []).length === 0 ? (
          <div className="muted">Không có issue OPEN.</div>
        ) : (
          <div className="list">
            {(issuesQuery.data ?? []).map((it) => (
              <div className="list__row" key={it.id}>
                <div>
                  <div className="mono">#{it.id} • {it.issueType}</div>
                  <div className="muted">Order #{it.orderId ?? 'N/A'} • {it.status}</div>
                </div>
                <Link className="adm-button" to={`/issues/${it.id}`}>
                  Xử lý
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
