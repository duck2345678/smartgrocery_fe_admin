import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { adminApi, type OpsOrder } from '../api/adminApi';

export function AdminOpsPage() {
  const queryClient = useQueryClient();
  const [reasonByOrder, setReasonByOrder] = useState<Record<number, string>>({});
  const [staffIdByOrder, setStaffIdByOrder] = useState<Record<number, string>>({});
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const monitorQuery = useQuery({
    queryKey: ['admin-ops-monitor'],
    queryFn: () => adminApi.ops.monitor(),
    refetchInterval: 30000,
  });

  const orderDetailQuery = useQuery({
    queryKey: ['admin-order-detail', selectedOrderId],
    queryFn: () => adminApi.orders.getDetail(selectedOrderId!),
    enabled: selectedOrderId != null,
  });

  const forceReleaseMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: number; reason: string }) =>
      adminApi.ops.forceRelease(orderId, reason),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['admin-ops-monitor'] }); },
  });

  const emergencyAssignMutation = useMutation({
    mutationFn: ({ orderId, staffId, reason }: { orderId: number; staffId: number; reason: string }) =>
      adminApi.ops.emergencyAssign(orderId, staffId, reason),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['admin-ops-monitor'] }); },
  });

  const submitForceRelease = (order: OpsOrder) => {
    const reason = (reasonByOrder[order.orderId] ?? '').trim();
    if (reason.length < 5) { window.alert('Vui lòng nhập lý do tối thiểu 5 ký tự.'); return; }
    forceReleaseMutation.mutate({ orderId: order.orderId, reason });
  };

  const submitEmergencyAssign = (order: OpsOrder) => {
    const reason = (reasonByOrder[order.orderId] ?? '').trim();
    const staffId = Number(staffIdByOrder[order.orderId] ?? '');
    if (reason.length < 5) { window.alert('Vui lòng nhập lý do tối thiểu 5 ký tự.'); return; }
    if (!Number.isFinite(staffId) || staffId <= 0) { window.alert('Vui lòng nhập staff ID hợp lệ.'); return; }
    emergencyAssignMutation.mutate({ orderId: order.orderId, staffId, reason });
  };

  const busy = forceReleaseMutation.isPending || emergencyAssignMutation.isPending;
  const detail = orderDetailQuery.data as Record<string, unknown> | undefined;

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">Ops Monitor & Override</div>
          <div className="page__subtitle">Giám sát và can thiệp đơn hàng theo thời gian thực</div>
        </div>
      </div>

      <div className="grid grid--2" style={{ alignItems: 'start' }}>
        {/* Cột trái — danh sách đơn */}
        <div>
          {monitorQuery.isLoading ? (
            <div className="card"><div className="muted">Đang tải…</div></div>
          ) : monitorQuery.isError ? (
            <div className="card"><div className="muted">Không tải được dữ liệu monitor.</div></div>
          ) : (
            <>
              <OpsSection
                title="Đơn rủi ro SLA"
                orders={monitorQuery.data?.stagnantOrders ?? []}
                selectedOrderId={selectedOrderId}
                reasonByOrder={reasonByOrder}
                staffIdByOrder={staffIdByOrder}
                setReasonByOrder={setReasonByOrder}
                setStaffIdByOrder={setStaffIdByOrder}
                onSelect={setSelectedOrderId}
                onForceRelease={submitForceRelease}
                onEmergencyAssign={submitEmergencyAssign}
                busy={busy}
              />
              <OpsSection
                title="Đơn bị bỏ quên"
                orders={monitorQuery.data?.stalledStaffOrders ?? []}
                selectedOrderId={selectedOrderId}
                reasonByOrder={reasonByOrder}
                staffIdByOrder={staffIdByOrder}
                setReasonByOrder={setReasonByOrder}
                setStaffIdByOrder={setStaffIdByOrder}
                onSelect={setSelectedOrderId}
                onForceRelease={submitForceRelease}
                onEmergencyAssign={submitEmergencyAssign}
                busy={busy}
              />
            </>
          )}
        </div>

        {/* Cột phải — chi tiết đơn */}
        <div className="card" style={{ position: 'sticky', top: '1rem' }}>
          {selectedOrderId == null ? (
            <div className="muted" style={{ textAlign: 'center', padding: '2rem 0' }}>
              Chọn một đơn hàng để xem chi tiết
            </div>
          ) : orderDetailQuery.isLoading ? (
            <div className="muted">Đang tải chi tiết…</div>
          ) : orderDetailQuery.isError ? (
            <div className="muted">Không tải được chi tiết đơn.</div>
          ) : detail ? (
            <>
              <div className="row-actions row-actions--between" style={{ marginBottom: '0.75rem' }}>
                <div className="card__label">Chi tiết #{String(detail.orderNumber ?? detail.id)}</div>
                <button className="adm-button adm-button--ghost" style={{ padding: '2px 8px' }}
                  onClick={() => setSelectedOrderId(null)}>✕</button>
              </div>

              <div className="list">
                {[
                  ['Trạng thái', detail.status],
                  ['Thanh toán', detail.paymentMethod],
                  ['PTTT status', detail.paymentStatus],
                  ['Subtotal', detail.subtotal != null ? Number(detail.subtotal).toLocaleString('vi-VN') + '₫' : null],
                  ['Giảm giá', detail.discountAmount != null ? Number(detail.discountAmount).toLocaleString('vi-VN') + '₫' : null],
                  ['Tổng cộng', detail.totalAmount != null ? Number(detail.totalAmount).toLocaleString('vi-VN') + '₫' : null],
                  ['Nhân viên', detail.assigneeId ? `#${detail.assigneeId}` : 'Chưa gán'],
                  ['Ghi chú', detail.customerNote],
                  ['Tạo lúc', detail.createdAt ? String(detail.createdAt).slice(0, 16) : null],
                ].filter(([, v]) => v != null).map(([label, value]) => (
                  <div className="list__row" key={String(label)}>
                    <span className="muted">{String(label)}</span>
                    <span className="mono">{String(value)}</span>
                  </div>
                ))}
              </div>

              {Array.isArray(detail.items) && detail.items.length > 0 && (
                <>
                  <div className="card__label" style={{ marginTop: '1rem' }}>Sản phẩm ({(detail.items as unknown[]).length})</div>
                  <div className="list">
                    {(detail.items as Record<string, unknown>[]).map((it, i) => (
                      <div className="list__row" key={i}>
                        <span>{String(it.productName ?? it.variantName ?? `Item ${i + 1}`)}</span>
                        <span className="mono">
                          x{String(it.quantity)} · {it.unitPrice != null ? Number(it.unitPrice).toLocaleString('vi-VN') + '₫' : '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function OpsSection(props: {
  title: string;
  orders: OpsOrder[];
  selectedOrderId: number | null;
  reasonByOrder: Record<number, string>;
  staffIdByOrder: Record<number, string>;
  setReasonByOrder: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  setStaffIdByOrder: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  onSelect: (id: number) => void;
  onForceRelease: (order: OpsOrder) => void;
  onEmergencyAssign: (order: OpsOrder) => void;
  busy: boolean;
}) {
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="card__label">{props.title}</div>
      <div className="list">
        {props.orders.length === 0 ? (
          <div className="muted">Không có đơn.</div>
        ) : (
          props.orders.map((o) => (
            <div
              className="list__row"
              key={o.orderId}
              style={{
                display: 'block',
                background: props.selectedOrderId === o.orderId ? 'var(--color-surface2)' : undefined,
                borderRadius: 8,
                padding: '0.5rem',
                cursor: 'pointer',
              }}
            >
              <div className="row-actions row-actions--between" onClick={() => props.onSelect(o.orderId)}>
                <div className="mono" style={{ color: 'var(--color-primary)' }}>
                  #{o.orderNumber || o.orderId}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="muted">{o.status}</span>
                  {o.minutesToSla != null && (
                    <span className="adm-badge" style={{ background: o.minutesToSla <= 5 ? 'var(--color-danger,#ef4444)' : undefined, color: o.minutesToSla <= 5 ? '#fff' : undefined }}>
                      {o.minutesToSla}m SLA
                    </span>
                  )}
                </div>
              </div>
              {o.assigneeName && (
                <div className="muted" style={{ fontSize: '0.75rem', marginTop: 2 }}>
                  Nhân viên: {o.assigneeName} · {o.minutesSinceUpdate != null ? `${o.minutesSinceUpdate}m trước` : ''}
                </div>
              )}
              <div className="row-actions" style={{ marginTop: 6, gap: 6 }}>
                <input
                  className="adm-input"
                  placeholder="Lý do (≥5 ký tự)"
                  value={props.reasonByOrder[o.orderId] ?? ''}
                  onChange={(e) => props.setReasonByOrder((prev) => ({ ...prev, [o.orderId]: e.target.value }))}
                  style={{ flex: 1, fontSize: '0.8rem' }}
                />
                <input
                  className="adm-input"
                  placeholder="Staff ID"
                  value={props.staffIdByOrder[o.orderId] ?? ''}
                  onChange={(e) => props.setStaffIdByOrder((prev) => ({ ...prev, [o.orderId]: e.target.value }))}
                  style={{ width: 90, fontSize: '0.8rem' }}
                />
              </div>
              <div className="row-actions" style={{ marginTop: 6 }}>
                <button className="adm-button adm-button--ghost" disabled={props.busy} onClick={() => props.onForceRelease(o)}>
                  Force Release
                </button>
                <button className="adm-button adm-button--ghost" disabled={props.busy} onClick={() => props.onEmergencyAssign(o)}>
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
