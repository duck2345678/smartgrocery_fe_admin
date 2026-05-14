import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/adminApi';
import { useAuthStore } from '../store/authStore';

export function StaffDashboardPage() {
  const user = useAuthStore((s) => s.user);

  const opsQuery = useQuery({
    queryKey: ['ops-monitor-staff'],
    queryFn: () => adminApi.ops.monitor(),
    refetchInterval: 30000,
  });

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">Dashboard</div>
          <div className="page__subtitle">
            Xin chào, {user?.fullName ?? user?.email ?? 'Staff'} — Nhịp vận hành hôm nay
          </div>
        </div>
      </div>

      <div className="grid grid--3">
        <div className="card">
          <div className="card__label">Đơn chờ xử lý</div>
          <div className="card__value">
            {opsQuery.data ? opsQuery.data.stagnantOrders.length : opsQuery.isLoading ? '...' : '-'}
          </div>
          <div className="card__hint">Đơn PENDING còn ≤ 15 phút đến SLA</div>
        </div>

        <div className="card">
          <div className="card__label">Đơn bị giữ lâu</div>
          <div className="card__value">
            {opsQuery.data ? opsQuery.data.stalledStaffOrders.length : opsQuery.isLoading ? '...' : '-'}
          </div>
          <div className="card__hint">Đơn ASSIGNED ≥ 10 phút không cập nhật</div>
        </div>

        <div className="card">
          <div className="card__label">Trạng thái</div>
          <div className="card__value" style={{ color: 'var(--color-success)' }}>Online</div>
          <div className="card__hint">Hệ thống hoạt động bình thường</div>
        </div>
      </div>

      <div className="grid grid--2">
        <div className="card">
          <div className="card__label">Đơn chờ lâu</div>
          <div className="card__hint">Top 10</div>
          <div className="list">
            {(opsQuery.data?.stagnantOrders ?? []).slice(0, 10).map((o) => (
              <div className="list__row" key={o.orderId}>
                <div className="mono">#{o.orderNumber || o.orderId}</div>
                <div className="muted">
                  Còn SLA: {o.minutesToSla != null ? `${o.minutesToSla}m` : 'N/A'}
                </div>
              </div>
            ))}
            {!opsQuery.isLoading && (opsQuery.data?.stagnantOrders ?? []).length === 0 && (
              <div className="muted">Chưa có dữ liệu</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card__label">Đơn đang xử lý</div>
          <div className="card__hint">Đơn ASSIGNED — Top 10</div>
          <div className="list">
            {(opsQuery.data?.stalledStaffOrders ?? []).slice(0, 10).map((o) => (
              <div className="list__row" key={o.orderId}>
                <div className="mono">#{o.orderNumber || o.orderId}</div>
                <div className="muted">
                  {o.assigneeName ?? 'Chưa gán'} —{' '}
                  {o.minutesSinceUpdate != null ? `${o.minutesSinceUpdate}m trước` : 'N/A'}
                </div>
              </div>
            ))}
            {!opsQuery.isLoading && (opsQuery.data?.stalledStaffOrders ?? []).length === 0 && (
              <div className="muted">Chưa có dữ liệu</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
