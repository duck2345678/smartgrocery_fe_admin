import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { adminApi, type OpsOrder } from '../api/adminApi';

export function AdminOpsPage() {
  const queryClient = useQueryClient();
  const [reasonByOrder, setReasonByOrder] = useState<Record<number, string>>({});
  const [staffIdByOrder, setStaffIdByOrder] = useState<Record<number, string>>({});

  const monitorQuery = useQuery({
    queryKey: ['admin-ops-monitor'],
    queryFn: () => adminApi.ops.monitor(),
    refetchInterval: 30000,
  });

  const forceReleaseMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: number; reason: string }) => adminApi.ops.forceRelease(orderId, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-ops-monitor'] });
    },
  });

  const emergencyAssignMutation = useMutation({
    mutationFn: ({ orderId, staffId, reason }: { orderId: number; staffId: number; reason: string }) =>
      adminApi.ops.emergencyAssign(orderId, staffId, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-ops-monitor'] });
    },
  });

  const submitForceRelease = (order: OpsOrder) => {
    const reason = (reasonByOrder[order.orderId] ?? '').trim();
    if (reason.length < 5) {
      window.alert('Vui lòng nhập lý do tối thiểu 5 ký tự.');
      return;
    }
    forceReleaseMutation.mutate({ orderId: order.orderId, reason });
  };

  const submitEmergencyAssign = (order: OpsOrder) => {
    const reason = (reasonByOrder[order.orderId] ?? '').trim();
    const staffId = Number(staffIdByOrder[order.orderId] ?? '');
    if (reason.length < 5) {
      window.alert('Vui lòng nhập lý do tối thiểu 5 ký tự.');
      return;
    }
    if (!Number.isFinite(staffId) || staffId <= 0) {
      window.alert('Vui lòng nhập staff ID hợp lệ.');
      return;
    }
    emergencyAssignMutation.mutate({ orderId: order.orderId, staffId, reason });
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">Ops Monitor & Override</div>
          <div className="page__subtitle">Tách hẳn khỏi staff app, chỉ chạy ở admin console.</div>
        </div>
      </div>

      {monitorQuery.isLoading ? (
        <div className="card"><div className="muted">Đang tải dữ liệu...</div></div>
      ) : monitorQuery.isError ? (
        <div className="card"><div className="muted">Không tải được dữ liệu monitor.</div></div>
      ) : (
        <>
          <OpsSection
            title="Đơn rủi ro SLA"
            orders={monitorQuery.data?.stagnantOrders ?? []}
            reasonByOrder={reasonByOrder}
            staffIdByOrder={staffIdByOrder}
            setReasonByOrder={setReasonByOrder}
            setStaffIdByOrder={setStaffIdByOrder}
            onForceRelease={submitForceRelease}
            onEmergencyAssign={submitEmergencyAssign}
            busy={forceReleaseMutation.isPending || emergencyAssignMutation.isPending}
          />
          <OpsSection
            title="Đơn bị bỏ quên"
            orders={monitorQuery.data?.stalledStaffOrders ?? []}
            reasonByOrder={reasonByOrder}
            staffIdByOrder={staffIdByOrder}
            setReasonByOrder={setReasonByOrder}
            setStaffIdByOrder={setStaffIdByOrder}
            onForceRelease={submitForceRelease}
            onEmergencyAssign={submitEmergencyAssign}
            busy={forceReleaseMutation.isPending || emergencyAssignMutation.isPending}
          />
        </>
      )}
    </div>
  );
}

function OpsSection(props: {
  title: string;
  orders: OpsOrder[];
  reasonByOrder: Record<number, string>;
  staffIdByOrder: Record<number, string>;
  setReasonByOrder: (v: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  setStaffIdByOrder: (v: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  onForceRelease: (order: OpsOrder) => void;
  onEmergencyAssign: (order: OpsOrder) => void;
  busy: boolean;
}) {
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="card__label">{props.title}</div>
      <div className="list">
        {props.orders.length === 0 ? (
          <div className="muted">Không có đơn.</div>
        ) : (
          props.orders.map((o) => (
            <div className="list__row" key={o.orderId} style={{ display: 'block' }}>
              <div className="row-actions row-actions--between">
                <div className="mono">#{o.orderNumber || o.orderId}</div>
                <div className="muted">status: {o.status}</div>
              </div>
              <div className="row-actions row-actions--between" style={{ marginTop: 8 }}>
                <input
                  className="input"
                  placeholder="Lý do override (>=5 ký tự)"
                  value={props.reasonByOrder[o.orderId] ?? ''}
                  onChange={(e) => props.setReasonByOrder((prev) => ({ ...prev, [o.orderId]: e.target.value }))}
                  style={{ flex: 1 }}
                />
                <input
                  className="input"
                  placeholder="Staff ID"
                  value={props.staffIdByOrder[o.orderId] ?? ''}
                  onChange={(e) => props.setStaffIdByOrder((prev) => ({ ...prev, [o.orderId]: e.target.value }))}
                  style={{ width: 120 }}
                />
              </div>
              <div className="row-actions" style={{ marginTop: 8 }}>
                <button className="adm-button adm-button--ghost" disabled={props.busy} onClick={() => props.onForceRelease(o)}>
                  Force Release
                </button>
                <button className="adm-button" disabled={props.busy} onClick={() => props.onEmergencyAssign(o)}>
                  Emergency Assign
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
