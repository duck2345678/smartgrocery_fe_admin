import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BarChart2, CheckCircle, ClipboardCheck, Download, Search, XCircle } from 'lucide-react';
import { adminApi, type AdminShiftRequestItemDto } from '../api/adminApi';

type StaffTab = 'requests' | 'attendance';
type ShiftRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type SelectedAttendanceStaff = { userId: number; name: string; score: number } | null;

const HOURLY_WAGE = 30000;

const statusLabel = (status: string) => {
  if (status === 'PENDING') return 'Cho duyet';
  if (status === 'APPROVED') return 'Da duyet';
  if (status === 'REJECTED') return 'Da tu choi';
  if (status === 'CANCELLED') return 'Da huy';
  return status || '-';
};

const statusClass = (status: string) => {
  if (status === 'PENDING') return 'adm-badge--warn';
  if (status === 'APPROVED') return 'adm-badge--success';
  if (status === 'REJECTED') return 'adm-badge--danger';
  return 'adm-badge--muted';
};

const shiftLabel = (item: AdminShiftRequestItemDto) => {
  if (item.shiftType === 'S') return 'Sang (6:30 - 14:30)';
  if (item.shiftType === 'C') return 'Chieu (14:30 - 22:30)';
  return `Hanh chinh${item.selectedBlocks ? `: ${item.selectedBlocks}` : ''}`;
};

const csvEscape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const formatMoney = (value: number) => value.toLocaleString('vi-VN') + '₫';
const formatHours = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

export function StaffPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<StaffTab>('requests');
  const [requestStatusFilter, setRequestStatusFilter] = useState<ShiftRequestStatus>('PENDING');
  const [requestFrom, setRequestFrom] = useState('');
  const [requestTo, setRequestTo] = useState('');
  const [requestSearch, setRequestSearch] = useState('');
  const [selectedRequestIds, setSelectedRequestIds] = useState<number[]>([]);
  const [selectedAttendanceStaff, setSelectedAttendanceStaff] = useState<SelectedAttendanceStaff>(null);

  const requestsQuery = useQuery({
    queryKey: ['admin-shift-requests', requestStatusFilter, requestFrom, requestTo],
    queryFn: () => adminApi.shiftRequests.list({
      status: requestStatusFilter,
      from: requestFrom || undefined,
      to: requestTo || undefined,
    }),
    enabled: activeTab === 'requests',
  });

  const attendanceInsightsQuery = useQuery({
    queryKey: ['admin-attendance-insights'],
    queryFn: () => adminApi.attendance.getInsights(new Date().getFullYear(), new Date().getMonth() + 1),
    enabled: activeTab === 'attendance',
  });

  const staffCountQuery = useQuery({
    queryKey: ['admin-staff-count-attendance'],
    queryFn: () => adminApi.users.count('STAFF'),
    enabled: activeTab === 'attendance',
  });

  const pendingShiftRequestsQuery = useQuery({
    queryKey: ['admin-shift-requests-pending-count'],
    queryFn: () => adminApi.shiftRequests.list({ status: 'PENDING' }),
    enabled: activeTab === 'attendance',
  });

  const selectedStaffMonthlyStatsQuery = useQuery({
    queryKey: ['admin-staff-monthly-stats', selectedAttendanceStaff?.userId],
    queryFn: () => {
      const now = new Date();
      if (!selectedAttendanceStaff) throw new Error('Thieu nhan vien');
      return adminApi.attendance.getMonthlyStats(selectedAttendanceStaff.userId, now.getFullYear(), now.getMonth() + 1);
    },
    enabled: activeTab === 'attendance' && selectedAttendanceStaff != null,
  });

  const visibleRequests = useMemo(() => {
    const keyword = requestSearch.trim().toLowerCase();
    const rows = requestsQuery.data ?? [];
    if (!keyword) return rows;
    return rows.filter((item) =>
      [item.userFullName, item.shiftType, item.selectedBlocks]
        .some((value) => String(value ?? '').toLowerCase().includes(keyword)),
    );
  }, [requestSearch, requestsQuery.data]);

  const selectedVisibleIds = visibleRequests.filter((item) => item.status === 'PENDING').map((item) => item.id);
  const allVisibleSelected = selectedVisibleIds.length > 0 && selectedVisibleIds.every((id) => selectedRequestIds.includes(id));

  const approveShiftMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: number; status: 'APPROVED' | 'REJECTED'; note?: string }) =>
      adminApi.shiftRequests.updateStatus(id, { status, adminNote: note }),
    onSuccess: async () => {
      setSelectedRequestIds([]);
      await queryClient.invalidateQueries({ queryKey: ['admin-shift-requests'] });
    },
  });

  const bulkShiftMutation = useMutation({
    mutationFn: async ({ ids, status, note }: { ids: number[]; status: 'APPROVED' | 'REJECTED'; note?: string }) => {
      await Promise.all(ids.map((id) => adminApi.shiftRequests.updateStatus(id, { status, adminNote: note })));
    },
    onSuccess: async () => {
      setSelectedRequestIds([]);
      await queryClient.invalidateQueries({ queryKey: ['admin-shift-requests'] });
    },
  });

  const toggleRequest = (id: number) => {
    setSelectedRequestIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  };

  const toggleVisibleRequests = () => {
    setSelectedRequestIds((ids) =>
      allVisibleSelected ? ids.filter((id) => !selectedVisibleIds.includes(id)) : Array.from(new Set([...ids, ...selectedVisibleIds])),
    );
  };

  const rejectOne = (id: number) => {
    const note = window.prompt('Nhap ly do tu choi')?.trim();
    if (!note) return;
    approveShiftMutation.mutate({ id, status: 'REJECTED', note });
  };

  const rejectSelected = () => {
    const note = window.prompt(`Nhap ly do tu choi ${selectedRequestIds.length} don`)?.trim();
    if (!note) return;
    bulkShiftMutation.mutate({ ids: selectedRequestIds, status: 'REJECTED', note });
  };

  const exportAttendanceCsv = () => {
    const rows = attendanceInsightsQuery.data?.topPerformers ?? [];
    const csvRows = [
      ['Hang', 'Nhan vien', 'Diem chuyen can'].map(csvEscape).join(','),
      ...rows.map((item, index) => [index + 1, item.name, item.score].map(csvEscape).join(',')),
    ];
    const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cham-cong-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const detailStats = selectedStaffMonthlyStatsQuery.data;
  const workedMinutes = detailStats?.totalWorkedMinutes ?? 0;
  const estimatedSalary = Math.round((workedMinutes / 60) * HOURLY_WAGE);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">{t('pages.staffTitle')}</div>
          <div className="page__subtitle">{t('pages.staffSubtitle')}</div>
        </div>
        {activeTab === 'attendance' && (
          <button className="adm-button adm-button--primary" type="button" onClick={exportAttendanceCsv}>
            <Download size={16} />
            <span>Xuat Excel</span>
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, marginBottom: 15, overflow: 'hidden' }}>
        <div style={{ display: 'flex', background: 'var(--panel-2)' }}>
          <button className={`adm-nav__item ${activeTab === 'requests' ? 'is-active' : ''}`} style={{ border: 0, borderRadius: 0, padding: '12px 20px', flex: 1 }} onClick={() => setActiveTab('requests')} type="button">
            <ClipboardCheck size={16} /> Duyet dang ky ca
          </button>
          <button className={`adm-nav__item ${activeTab === 'attendance' ? 'is-active' : ''}`} style={{ border: 0, borderRadius: 0, padding: '12px 20px', flex: 1 }} onClick={() => setActiveTab('attendance')} type="button">
            <BarChart2 size={16} /> Thong ke & Cham cong
          </button>
        </div>
      </div>

      {activeTab === 'requests' && (
        <div className="card">
          <div className="filters">
            <div className="filters__row">
              <label className="adm-field">
                <div className="adm-field__label">Trang thai don</div>
                <select className="adm-input" value={requestStatusFilter} onChange={(e) => { setRequestStatusFilter(e.target.value as ShiftRequestStatus); setSelectedRequestIds([]); }}>
                  <option value="PENDING">Cho duyet</option>
                  <option value="APPROVED">Da duyet</option>
                  <option value="REJECTED">Da tu choi</option>
                </select>
              </label>
              <label className="adm-field">
                <div className="adm-field__label">Tu ngay</div>
                <input className="adm-input" type="date" value={requestFrom} onChange={(e) => setRequestFrom(e.target.value)} />
              </label>
              <label className="adm-field">
                <div className="adm-field__label">Den ngay</div>
                <input className="adm-input" type="date" value={requestTo} onChange={(e) => setRequestTo(e.target.value)} />
              </label>
              <label className="adm-field" style={{ flex: 1.5 }}>
                <div className="adm-field__label">Ten nhan vien / chi nhanh</div>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--muted)' }} />
                  <input className="adm-input" style={{ paddingLeft: 32 }} placeholder="Ten, ca truc..." value={requestSearch} onChange={(e) => setRequestSearch(e.target.value)} />
                </div>
              </label>
            </div>
          </div>

          <div className="row-actions row-actions--between" style={{ marginTop: 12 }}>
            <div className="muted">Da chon {selectedRequestIds.length} don</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="adm-button adm-button--primary" type="button" disabled={selectedRequestIds.length === 0 || bulkShiftMutation.isPending} onClick={() => bulkShiftMutation.mutate({ ids: selectedRequestIds, status: 'APPROVED' })}>
                Duyet tat ca
              </button>
              <button className="adm-button adm-button--danger" type="button" disabled={selectedRequestIds.length === 0 || bulkShiftMutation.isPending} onClick={rejectSelected}>
                Tu choi tat ca
              </button>
            </div>
          </div>

          <div className="table-wrap" style={{ marginTop: 15 }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleRequests} disabled={selectedVisibleIds.length === 0} /></th>
                  <th>Ngay lam</th>
                  <th>Nhan vien</th>
                  <th>Ca truc</th>
                  <th>Trang thai</th>
                  <th>Tinh trang nhan su</th>
                  <th style={{ textAlign: 'right' }}>Thao tac</th>
                </tr>
              </thead>
              <tbody>
                {requestsQuery.isLoading ? (
                  <tr><td colSpan={7} className="muted">Dang tai...</td></tr>
                ) : visibleRequests.length === 0 ? (
                  <tr><td colSpan={7} className="muted">Khong co yeu cau nao</td></tr>
                ) : visibleRequests.map((item) => (
                  <tr key={item.id}>
                    <td><input type="checkbox" checked={selectedRequestIds.includes(item.id)} disabled={item.status !== 'PENDING'} onChange={() => toggleRequest(item.id)} /></td>
                    <td className="mono">{new Date(item.workDate).toLocaleDateString('vi-VN')}</td>
                    <td><div style={{ fontWeight: 600 }}>{item.userFullName || '-'}</div></td>
                    <td><div className="adm-chip">{shiftLabel(item)}</div></td>
                    <td><span className={`adm-badge ${statusClass(item.status)}`}>{statusLabel(item.status)}</span></td>
                    <td>
                      <div style={{ fontSize: 12 }}>
                        <div>Hien tai: <strong>{item.scheduledCount}</strong> nguoi</div>
                        <div className="muted">Sau khi duyet: {item.scheduledAfterApprove} nguoi</div>
                      </div>
                    </td>
                    <td className="cell-actions">
                      {item.status === 'PENDING' ? (
                        <>
                          <button className="adm-button adm-button--ghost" style={{ color: 'var(--ok)' }} onClick={() => approveShiftMutation.mutate({ id: item.id, status: 'APPROVED' })} type="button">
                            <CheckCircle size={14} /> Duyet
                          </button>
                          <button className="adm-button adm-button--ghost" style={{ color: 'var(--danger)' }} onClick={() => rejectOne(item.id)} type="button">
                            <XCircle size={14} /> Tu choi
                          </button>
                        </>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="grid">
          <div className="grid grid--3">
            <div className="card">
              <div className="card__label">Tong nhan vien</div>
              <div className="card__value">{staffCountQuery.data ?? 0}</div>
              <div className="card__hint">Da dang ky tai khoan</div>
            </div>
            <div className="card">
              <div className="card__label">Dang truc hom nay</div>
              <div className="card__value" style={{ color: 'var(--ok)' }}>{attendanceInsightsQuery.data?.activeToday || 0}</div>
              <div className="card__hint">Da bam Check-in</div>
            </div>
            <div className="card">
              <div className="card__label">Yeu cau cho duyet</div>
              <div className="card__value" style={{ color: (pendingShiftRequestsQuery.data?.length || 0) > 0 ? 'var(--danger)' : 'inherit' }}>
                {pendingShiftRequestsQuery.data?.length ?? 0}
              </div>
              <div className="card__hint">Don dang ky ca</div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 15 }}>
            <div className="card__label">Bang xep hang hieu suat (Thang nay)</div>
            <div className="list">
              {(attendanceInsightsQuery.data?.topPerformers ?? []).length === 0 && <div className="muted">Chua co du lieu hieu suat.</div>}
              {attendanceInsightsQuery.data?.topPerformers?.map((item, index) => (
                <div key={item.userId} className="list__row" style={{ alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="adm-user__avatar" style={{ width: 28, height: 28, fontSize: 10 }}>{index + 1}</div>
                    <button
                      className="adm-button adm-button--ghost"
                      type="button"
                      style={{ padding: '6px 10px', justifyContent: 'flex-start' }}
                      onClick={() => setSelectedAttendanceStaff(item)}
                    >
                      {item.name}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                    <div style={{ fontSize: 12 }}>Diem chuyen can: <span style={{ fontWeight: 700, color: item.score < 0 ? 'var(--danger)' : 'var(--primary)' }}>{item.score}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedAttendanceStaff && (
            <div className="card" style={{ marginTop: 15 }}>
              <div className="row-actions row-actions--between" style={{ marginBottom: 12 }}>
                <div>
                  <div className="card__label">{selectedAttendanceStaff.name}</div>
                  <div className="card__hint">Chi tiet cham cong thang nay</div>
                </div>
                <button className="adm-button adm-button--ghost" type="button" onClick={() => setSelectedAttendanceStaff(null)}>
                  Dong
                </button>
              </div>

              {selectedStaffMonthlyStatsQuery.isLoading ? (
                <div className="muted">Dang tai chi tiet...</div>
              ) : selectedStaffMonthlyStatsQuery.isError ? (
                <div className="inline-alert">
                  {selectedStaffMonthlyStatsQuery.error instanceof Error ? selectedStaffMonthlyStatsQuery.error.message : 'Khong tai duoc chi tiet cham cong'}
                </div>
              ) : (
                <div className="grid grid--4">
                  <div className="card">
                    <div className="card__label">Luong tam tinh</div>
                    <div className="card__value">{formatMoney(estimatedSalary)}</div>
                    <div className="card__hint">{formatHours(workedMinutes)} x {formatMoney(HOURLY_WAGE)}/gio</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Ngay lam</div>
                    <div className="card__value">{detailStats?.attendedDays ?? 0}</div>
                    <div className="card__hint">Co check-in</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Dung ca</div>
                    <div className="card__value">{detailStats?.onTimeCheckIns ?? 0}</div>
                    <div className="card__hint">Check-in dung gio</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Vang</div>
                    <div className="card__value" style={{ color: (detailStats?.absentDays ?? 0) > 0 ? 'var(--danger)' : 'inherit' }}>{detailStats?.absentDays ?? 0}</div>
                    <div className="card__hint">Ngay co lich nhung khong lam</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Ca duoc xep</div>
                    <div className="card__value">{detailStats?.scheduledDays ?? 0}</div>
                    <div className="card__hint">{detailStats?.totalBlocks ?? 0} block</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Ca hoan tat</div>
                    <div className="card__value">{detailStats?.completedBlocks ?? 0}</div>
                    <div className="card__hint">{Math.round(detailStats?.completionRate ?? 0)}% hoan thanh</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Di tre</div>
                    <div className="card__value" style={{ color: (detailStats?.lateCheckIns ?? 0) > 0 ? 'var(--danger)' : 'inherit' }}>{detailStats?.lateCheckIns ?? 0}</div>
                    <div className="card__hint">{detailStats?.lateMinutes ?? 0} phut tre</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Ve som</div>
                    <div className="card__value" style={{ color: (detailStats?.earlyCheckOuts ?? 0) > 0 ? 'var(--danger)' : 'inherit' }}>{detailStats?.earlyCheckOuts ?? 0}</div>
                    <div className="card__hint">{detailStats?.earlyMinutes ?? 0} phut som</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
