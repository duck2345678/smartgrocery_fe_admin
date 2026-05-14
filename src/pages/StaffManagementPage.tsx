import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AdminUser, type ShiftRequest } from '../api/adminApi';

const SHIFT_LABELS: Record<string, string> = { S: 'Ca Sáng', C: 'Ca Chiều', G: 'Ca Gãy' };

const SHIFT_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  S: { bg: 'rgba(249,115,22,0.1)',  color: 'var(--primary)', border: 'rgba(249,115,22,0.28)' },
  C: { bg: 'rgba(14,165,233,0.1)',  color: 'var(--cyan)',    border: 'rgba(14,165,233,0.28)' },
  G: { bg: 'rgba(139,92,246,0.1)',  color: 'var(--purple)',  border: 'rgba(139,92,246,0.28)' },
};

const STATUS_BADGE: Record<string, string> = {
  PENDING:   'adm-badge adm-badge--pending',
  APPROVED:  'adm-badge adm-badge--success',
  REJECTED:  'adm-badge adm-badge--danger',
  CANCELLED: 'adm-badge adm-badge--muted',
};

function formatBlocks(val: string | null) {
  if (!val) return '';
  return val.split(',').map((b) => `G${b.trim()}`).join(' + ');
}

export function StaffManagementPage() {
  const queryClient = useQueryClient();
  const [shiftTab, setShiftTab] = useState<'PENDING' | 'ALL'>('PENDING');
  const [noteByRequest, setNoteByRequest] = useState<Record<number, string>>({});

  const staffQuery = useQuery({
    queryKey: ['admin-users-staff'],
    queryFn: () => adminApi.users.list({ role: 'STAFF', size: 100 }),
  });

  const shiftQuery = useQuery({
    queryKey: ['shift-requests', shiftTab],
    queryFn: () => adminApi.staffShifts.list(shiftTab === 'PENDING' ? 'PENDING' : undefined),
    refetchInterval: 30000,
  });

  const allShiftsQuery = useQuery({
    queryKey: ['shift-requests-all'],
    queryFn: () => adminApi.staffShifts.list(undefined),
    refetchInterval: 30000,
  });

  const [staffStatusConfirm, setStaffStatusConfirm] = useState<{ id: number; next: 'ACTIVE' | 'INACTIVE' } | null>(null);

  const staffStatusMutation = useMutation({
    mutationFn: ({ id, next }: { id: number; next: 'ACTIVE' | 'INACTIVE' }) =>
      adminApi.users.setStatus(id, next, next === 'INACTIVE' ? 'Bị khóa bởi admin' : 'Mở khóa bởi admin'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-staff'] });
      setStaffStatusConfirm(null);
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => adminApi.staffShifts.approve(id, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shift-requests'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => adminApi.staffShifts.reject(id, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shift-requests'] }),
  });

  const staffList: AdminUser[] = staffQuery.data?.content ?? [];
  const shiftList: ShiftRequest[] = shiftQuery.data ?? [];
  const busy = approveMutation.isPending || rejectMutation.isPending;

  const todayStr = new Date().toISOString().slice(0, 10);

  const todayStaff = useMemo(() => {
    return (allShiftsQuery.data ?? []).filter(
      (r) => r.status === 'APPROVED' && r.workDate === todayStr
    );
  }, [allShiftsQuery.data, todayStr]);

  const approvedTodayCount = useMemo(() => {
    return (allShiftsQuery.data ?? []).filter(
      (r) => r.status === 'APPROVED' && r.updatedAt?.startsWith(todayStr)
    ).length;
  }, [allShiftsQuery.data, todayStr]);

  const pendingCount = useMemo(() => {
    return (allShiftsQuery.data ?? []).filter((r) => r.status === 'PENDING').length;
  }, [allShiftsQuery.data]);

  // Group today's staff by shift type for the summary row
  const byShift = useMemo(() => {
    const groups: Record<string, ShiftRequest[]> = { S: [], C: [], G: [] };
    todayStaff.forEach((r) => {
      (groups[r.shiftType] ??= []).push(r);
    });
    return groups;
  }, [todayStaff]);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">Quản lý nhân viên</div>
          <div className="page__subtitle">Danh sách nhân viên và duyệt đăng ký ca làm việc</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid--3">
        <div className="card">
          <div className="card__label">Tổng nhân viên</div>
          <div className="card__value">{staffQuery.data?.totalElements ?? 0}</div>
        </div>
        <div className="card">
          <div className="card__label">Đơn chờ duyệt</div>
          <div className="card__value" style={{ color: 'var(--warn)' }}>
            {allShiftsQuery.isLoading ? '…' : pendingCount}
          </div>
        </div>
        <div className="card">
          <div className="card__label">Đã duyệt hôm nay</div>
          <div className="card__value" style={{ color: 'var(--emerald)' }}>
            {allShiftsQuery.isLoading ? '…' : approvedTodayCount}
          </div>
        </div>
      </div>

      {/* ── Nhân viên đi làm hôm nay ── */}
      <div className="card">
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              Nhân viên đi làm hôm nay
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              {todayStr} —{' '}
              {allShiftsQuery.isLoading
                ? 'Đang tải…'
                : todayStaff.length === 0
                ? 'Chưa có ca nào được duyệt'
                : `${todayStaff.length} người`}
            </div>
          </div>

          {/* Shift count summary chips */}
          {!allShiftsQuery.isLoading && todayStaff.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              {(['S', 'C', 'G'] as const).map((type) => {
                const count = byShift[type]?.length ?? 0;
                if (count === 0) return null;
                const st = SHIFT_STYLE[type];
                return (
                  <div
                    key={type}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 999,
                      border: `1px solid ${st.border}`,
                      background: st.bg,
                      fontSize: 12,
                      fontWeight: 700,
                      color: st.color,
                    }}
                  >
                    {SHIFT_LABELS[type]}: {count}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Staff cards */}
        {allShiftsQuery.isLoading ? (
          <div className="muted" style={{ fontSize: 13 }}>Đang tải…</div>
        ) : todayStaff.length === 0 ? (
          <div
            style={{
              padding: '24px 0',
              textAlign: 'center',
              color: 'var(--muted)',
              fontSize: 13,
            }}
          >
            Không có nhân viên nào đăng ký ca hôm nay.
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {todayStaff.map((r) => {
              const st = SHIFT_STYLE[r.shiftType] ?? SHIFT_STYLE['S'];
              const initial =
                (r.staffName ?? '?').trim().split(' ').at(-1)?.slice(0, 1).toUpperCase() ?? '?';
              return (
                <div
                  key={r.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 16px',
                    border: `1px solid ${st.border}`,
                    borderRadius: 'var(--radius-lg)',
                    background: st.bg,
                    minWidth: 200,
                    flex: '0 0 auto',
                    transition: 'transform 160ms ease, box-shadow 160ms ease',
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      background: st.color,
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 900,
                      fontSize: 15,
                      color: '#fff',
                      flexShrink: 0,
                      boxShadow: `0 0 16px ${st.border}`,
                    }}
                  >
                    {initial}
                  </div>

                  {/* Info */}
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {r.staffName ?? '-'}
                    </div>
                    <div style={{ fontSize: 11, color: st.color, fontWeight: 600, marginTop: 1 }}>
                      {SHIFT_LABELS[r.shiftType] ?? r.shiftType}
                      {r.selectedBlocks
                        ? ` · ${formatBlocks(r.selectedBlocks)}`
                        : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Duyệt ca đăng ký */}
      <div className="card">
        <div className="row-actions row-actions--between" style={{ marginBottom: '0.75rem' }}>
          <div className="card__label">Đơn đăng ký ca làm việc</div>
          <div className="row-actions" style={{ gap: 6 }}>
            <button
              className={`adm-button ${shiftTab === 'PENDING' ? 'adm-button--primary' : 'adm-button--ghost'}`}
              onClick={() => setShiftTab('PENDING')}
            >
              Chờ duyệt
            </button>
            <button
              className={`adm-button ${shiftTab === 'ALL' ? 'adm-button--primary' : 'adm-button--ghost'}`}
              onClick={() => setShiftTab('ALL')}
            >
              Tất cả
            </button>
          </div>
        </div>

        {(approveMutation.isError || rejectMutation.isError) && (
          <div className="inline-alert">
            {approveMutation.error instanceof Error
              ? approveMutation.error.message
              : rejectMutation.error instanceof Error
              ? rejectMutation.error.message
              : 'Có lỗi xảy ra'}
          </div>
        )}

        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nhân viên</th>
                <th>Ngày làm</th>
                <th>Ca</th>
                <th>Block</th>
                <th>Trạng thái</th>
                <th>Ghi chú admin</th>
                <th>Gửi lúc</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {shiftQuery.isLoading ? (
                <tr><td colSpan={9} className="muted">Đang tải…</td></tr>
              ) : shiftQuery.isError ? (
                <tr><td colSpan={9} className="muted">Không tải được dữ liệu.</td></tr>
              ) : shiftList.length === 0 ? (
                <tr><td colSpan={9} className="muted">Không có đơn nào.</td></tr>
              ) : (
                shiftList.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.id}</td>
                    <td>
                      <div>{r.staffName ?? '-'}</div>
                      <div className="muted" style={{ fontSize: '0.75rem' }}>{r.staffEmail ?? ''}</div>
                    </td>
                    <td className="mono">{r.workDate}</td>
                    <td>
                      <span
                        className="adm-badge"
                        style={{
                          background: SHIFT_STYLE[r.shiftType]?.bg,
                          borderColor: SHIFT_STYLE[r.shiftType]?.border,
                          color: SHIFT_STYLE[r.shiftType]?.color,
                        }}
                      >
                        {SHIFT_LABELS[r.shiftType] ?? r.shiftType}
                      </span>
                    </td>
                    <td className="mono">{formatBlocks(r.selectedBlocks) || '-'}</td>
                    <td>
                      <span className={STATUS_BADGE[r.status] ?? 'adm-badge'}>{r.status}</span>
                    </td>
                    <td className="muted" style={{ fontSize: '0.8rem', maxWidth: 140 }}>
                      {r.adminNote || '-'}
                    </td>
                    <td className="mono" style={{ fontSize: '0.75rem' }}>
                      {r.createdAt ? r.createdAt.slice(0, 16) : '-'}
                    </td>
                    <td>
                      {r.status === 'PENDING' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 180 }}>
                          <input
                            className="adm-input"
                            placeholder="Ghi chú (tùy chọn)"
                            style={{ fontSize: '0.75rem' }}
                            value={noteByRequest[r.id] ?? ''}
                            onChange={(e) =>
                              setNoteByRequest((prev) => ({ ...prev, [r.id]: e.target.value }))
                            }
                          />
                          <div className="row-actions" style={{ gap: 4 }}>
                            <button
                              className="adm-button adm-button--primary"
                              disabled={busy}
                              style={{ flex: 1, fontSize: '0.75rem', padding: '4px 8px' }}
                              onClick={() =>
                                approveMutation.mutate({ id: r.id, note: noteByRequest[r.id] ?? '' })
                              }
                            >
                              ✓ Duyệt
                            </button>
                            <button
                              className="adm-button adm-button--ghost"
                              disabled={busy}
                              style={{ flex: 1, fontSize: '0.75rem', padding: '4px 8px', color: 'var(--danger)' }}
                              onClick={() =>
                                rejectMutation.mutate({ id: r.id, note: noteByRequest[r.id] ?? '' })
                              }
                            >
                              ✕ Từ chối
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="muted" style={{ fontSize: '0.8rem' }}>Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danh sách nhân viên */}
      <div className="card">
        <div className="card__label">
          Danh sách nhân viên ({staffQuery.data?.totalElements ?? 0})
        </div>
        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {staffStatusMutation.isError && (
                <tr>
                  <td colSpan={7} className="inline-alert">
                    {staffStatusMutation.error instanceof Error
                      ? staffStatusMutation.error.message
                      : 'Có lỗi xảy ra'}
                  </td>
                </tr>
              )}
              {staffQuery.isLoading ? (
                <tr><td colSpan={7} className="muted">Đang tải…</td></tr>
              ) : staffList.length === 0 ? (
                <tr><td colSpan={7} className="muted">Chưa có nhân viên.</td></tr>
              ) : (
                staffList.map((u: AdminUser) => {
                  const isConfirming = staffStatusConfirm?.id === u.id;
                  const nextStatus = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                  return (
                    <tr key={u.id}>
                      <td className="mono">{u.id}</td>
                      <td>{u.fullName ?? '-'}</td>
                      <td className="mono">{u.email}</td>
                      <td className="mono">{u.phone ?? '-'}</td>
                      <td>
                        <span
                          className={`adm-badge ${
                            u.status === 'ACTIVE' ? 'adm-badge--success' : 'adm-badge--muted'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="mono">{u.createdAt ? u.createdAt.slice(0, 10) : '-'}</td>
                      <td className="cell-actions">
                        {isConfirming ? (
                          <>
                            <button
                              className="adm-button"
                              style={{
                                background:
                                  nextStatus === 'INACTIVE' ? 'var(--danger)' : 'var(--emerald)',
                                color: '#fff',
                                borderColor: 'transparent',
                              }}
                              type="button"
                              disabled={staffStatusMutation.isPending}
                              onClick={() => staffStatusMutation.mutate({ id: u.id, next: nextStatus })}
                            >
                              Xác nhận
                            </button>
                            <button
                              className="adm-button adm-button--ghost"
                              type="button"
                              onClick={() => setStaffStatusConfirm(null)}
                            >
                              Hủy
                            </button>
                          </>
                        ) : (
                          <button
                            className="adm-button adm-button--ghost"
                            type="button"
                            style={{ color: u.status === 'ACTIVE' ? 'var(--danger)' : 'var(--emerald)' }}
                            onClick={() => setStaffStatusConfirm({ id: u.id, next: nextStatus })}
                          >
                            {u.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
