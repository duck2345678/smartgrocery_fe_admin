import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, type AdminUser, type AdminShiftRequestItemDto } from '../api/adminApi';
import {
  UserPlus, Search, Edit, Ban, CheckCircle, XCircle,
  ClipboardCheck, BarChart2, User as UserIcon,
  Clock, UserX, LogOut, Calendar,
} from 'lucide-react';
import type { AttendanceRankingItem } from '../api/adminApi';

const isStrongPassword = (p: string) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

export function StaffPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  // Tabs State
  const [activeTab, setActiveTab] = useState<'list' | 'requests' | 'attendance'>('list');

  // List State
  const [page] = useState(0);
  const [size] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Form State
  const [editId, setEditId] = useState<number | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [reason, setReason] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Requests Filter State
  const [requestStatusFilter, setRequestStatusFilter] = useState('PENDING');

  // Queries
  const staffQuery = useQuery({
    queryKey: ['admin-staff', page, size, statusFilter],
    queryFn: () =>
      adminApi.users.list({
        page,
        size,
        role: 'STAFF',
        status: statusFilter || undefined,
      }),
    enabled: activeTab === 'list',
  });

  const requestsQuery = useQuery({
    queryKey: ['admin-shift-requests', requestStatusFilter],
    queryFn: () => adminApi.shiftRequests.list({ status: requestStatusFilter }),
    enabled: activeTab === 'requests',
  });

  const attendanceInsightsQuery = useQuery({
    queryKey: ['admin-attendance-insights'],
    queryFn: () => adminApi.attendance.getInsights(new Date().getFullYear(), new Date().getMonth() + 1),
    enabled: activeTab === 'attendance',
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => {
      if (!fullName.trim()) throw new Error('Thiếu họ tên');
      if (!email.trim()) throw new Error('Thiếu email');
      if (!isStrongPassword(password)) throw new Error('Mật khẩu >= 8 ký tự, gồm chữ và số');
      return adminApi.users.create({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        roleName: 'STAFF',
        avatarUrl: avatarUrl.trim() || undefined,
        reason: reason.trim() || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
      resetForm();
      alert('Thêm nhân viên thành công');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (id: number) =>
      adminApi.users.update(id, {
        fullName: fullName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password: password.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        reason: reason.trim() || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
      resetForm();
      alert('Cập nhật thông tin thành công');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus, rsn }: { id: number; nextStatus: 'ACTIVE' | 'INACTIVE'; rsn: string }) =>
      adminApi.users.setStatus(id, nextStatus, rsn),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    },
  });

  const approveShiftMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: number; status: 'APPROVED' | 'REJECTED'; note?: string }) =>
      adminApi.shiftRequests.updateStatus(id, { status, adminNote: note }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-shift-requests'] });
    },
  });

  const resetForm = () => {
    setEditId(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setAvatarUrl('');
    setReason('');
    setShowForm(false);
  };

  const filteredStaff = useMemo(() => {
    const data = staffQuery.data?.content ?? [];
    if (!searchKeyword.trim()) return data;
    const kw = searchKeyword.toLowerCase();
    return data.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(kw) ||
        u.email.toLowerCase().includes(kw) ||
        u.phone?.includes(kw)
    );
  }, [staffQuery.data?.content, searchKeyword]);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">{t('pages.staffTitle')}</div>
          <div className="page__subtitle">{t('pages.staffSubtitle')}</div>
        </div>
        {activeTab === 'list' && (
          <button className="adm-button adm-button--primary" onClick={() => setShowForm(true)}>
            <UserPlus size={18} />
            <span>Thêm nhân viên</span>
          </button>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="card" style={{ padding: 0, marginBottom: 15, overflow: 'hidden' }}>
        <div style={{ display: 'flex', background: 'var(--panel-2)' }}>
          <button className={`adm-nav__item ${activeTab === 'list' ? 'is-active' : ''}`} style={{ border: 0, borderRadius: 0, padding: '12px 20px', flex: 1 }} onClick={() => setActiveTab('list')}>
            <UserIcon size={16} /> Danh sách nhân viên
          </button>
          <button className={`adm-nav__item ${activeTab === 'requests' ? 'is-active' : ''}`} style={{ border: 0, borderRadius: 0, padding: '12px 20px', flex: 1 }} onClick={() => setActiveTab('requests')}>
            <ClipboardCheck size={16} /> Duyệt đăng ký ca
          </button>
          <button className={`adm-nav__item ${activeTab === 'attendance' ? 'is-active' : ''}`} style={{ border: 0, borderRadius: 0, padding: '12px 20px', flex: 1 }} onClick={() => setActiveTab('attendance')}>
            <BarChart2 size={16} /> Thống kê & Chấm công
          </button>
        </div>
      </div>

      {/* Tab: Staff List */}
      {activeTab === 'list' && (
        <>
          {showForm && (
            <div className="card" style={{ border: '1px solid var(--primary)', marginBottom: 15 }}>
              <div className="card__label">{editId ? `Chỉnh sửa nhân viên #${editId}` : 'Tạo nhân viên mới'}</div>
              <div className="form-grid">
                <label className="adm-field">
                  <div className="adm-field__label">Họ tên</div>
                  <input className="adm-input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </label>
                <label className="adm-field">
                  <div className="adm-field__label">Email</div>
                  <input className="adm-input" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label className="adm-field">
                  <div className="adm-field__label">Số điện thoại</div>
                  <input className="adm-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </label>
                <label className="adm-field">
                  <div className="adm-field__label">Mật khẩu</div>
                  <input className="adm-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={editId ? 'Để trống nếu không đổi' : 'Tối thiểu 8 ký tự'} />
                </label>
                <label className="adm-field">
                  <div className="adm-field__label">Lý do lưu (Audit)</div>
                  <input className="adm-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Nhập lý do lưu..." />
                </label>
              </div>
              <div className="row-actions">
                <button className="adm-button adm-button--ghost" onClick={resetForm}>Hủy</button>
                <button className="adm-button adm-button--primary" onClick={() => (editId ? updateMutation.mutate(editId) : createMutation.mutate())} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editId ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </div>
          )}

          <div className="card">
            <div className="filters">
              <div className="filters__row">
                <label className="adm-field">
                  <div className="adm-field__label">Tìm kiếm</div>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--muted)' }} />
                    <input className="adm-input" style={{ paddingLeft: 32 }} placeholder="Tên, Email..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} />
                  </div>
                </label>
                <label className="adm-field">
                  <div className="adm-field__label">Trạng thái</div>
                  <select className="adm-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">Tất cả</option>
                    <option value="ACTIVE">Đang làm việc</option>
                    <option value="INACTIVE">Nghỉ việc/Tạm dừng</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="table-wrap" style={{ marginTop: 15 }}>
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nhân viên</th>
                    <th>Liên hệ</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {staffQuery.isLoading ? <tr><td colSpan={5} className="muted">Đang tải...</td></tr> : filteredStaff.map((u: AdminUser) => (
                    <tr key={u.id}>
                      <td className="mono">{u.id}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div className="adm-user__avatar" style={{ width: 32, height: 32 }}>{u.avatarUrl ? <img src={u.avatarUrl} className="adm-brand__logo-img" alt="" /> : (u.fullName || 'S')[0]}</div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{u.fullName || 'N/A'}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="mono" style={{ fontSize: 12 }}>{u.phone || '-'}</td>
                      <td>
                        {u.status === 'ACTIVE' ? (
                          <span style={{ color: 'var(--ok)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle size={14} /> Hoạt động</span>
                        ) : (
                          <span style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Ban size={14} /> Tạm dừng</span>
                        )}
                      </td>
                      <td className="cell-actions">
                        <button className="adm-button adm-button--ghost" onClick={() => {
                          setEditId(u.id);
                          setFullName(u.fullName || '');
                          setEmail(u.email);
                          setPhone(u.phone || '');
                          setShowForm(true);
                        }}><Edit size={14} /></button>
                        <button className="adm-button adm-button--ghost" style={{ color: u.status === 'ACTIVE' ? 'var(--danger)' : 'var(--ok)' }} onClick={() => {
                          const rsn = window.prompt(`Lý do ${u.status === 'ACTIVE' ? 'tạm dừng' : 'kích hoạt'}?`) || 'Admin update';
                          statusMutation.mutate({ id: u.id, nextStatus: u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE', rsn });
                        }}>{u.status === 'ACTIVE' ? <Ban size={14} /> : <CheckCircle size={14} />}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Tab: Shift Requests */}
      {activeTab === 'requests' && (
        <div className="card">
          <div className="filters">
            <div className="filters__row">
              <label className="adm-field">
                <div className="adm-field__label">Trạng thái đơn</div>
                <select className="adm-input" value={requestStatusFilter} onChange={(e) => setRequestStatusFilter(e.target.value)}>
                  <option value="PENDING">Chờ duyệt</option>
                  <option value="APPROVED">Đã duyệt</option>
                  <option value="REJECTED">Đã từ chối</option>
                </select>
              </label>
            </div>
          </div>
          <div className="table-wrap" style={{ marginTop: 15 }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Ngày làm</th>
                  <th>Nhân viên</th>
                  <th>Ca trực</th>
                  <th>Tình trạng nhân sự</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {requestsQuery.isLoading ? <tr><td colSpan={5} className="muted">Đang tải...</td></tr> : requestsQuery.data?.length === 0 ? <tr><td colSpan={5} className="muted">Không có yêu cầu nào</td></tr> : requestsQuery.data?.map((r: AdminShiftRequestItemDto) => (
                  <tr key={r.id}>
                    <td className="mono">{new Date(r.workDate).toLocaleDateString('vi-VN')}</td>
                    <td><div style={{ fontWeight: 600 }}>{r.userFullName}</div></td>
                    <td>
                      <div className="adm-chip">
                        {r.shiftType === 'S' ? 'Sáng (6:30 - 14:30)' : r.shiftType === 'C' ? 'Chiều (14:30 - 22:30)' : `Hành chính (Blocks: ${r.selectedBlocks})`}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12 }}>
                        <div>Hiện tại: <strong>{r.scheduledCount}</strong> người</div>
                        <div className="muted">Sau khi duyệt: {r.scheduledAfterApprove} người</div>
                      </div>
                    </td>
                    <td className="cell-actions">
                      {r.status === 'PENDING' ? (
                        <>
                          <button className="adm-button adm-button--ghost" style={{ color: 'var(--ok)' }} onClick={() => approveShiftMutation.mutate({ id: r.id, status: 'APPROVED' })}>
                            <CheckCircle size={14} /> Duyệt
                          </button>
                          <button className="adm-button adm-button--ghost" style={{ color: 'var(--danger)' }} onClick={() => {
                            const note = window.prompt('Lý do từ chối?') || '';
                            approveShiftMutation.mutate({ id: r.id, status: 'REJECTED', note });
                          }}>
                            <XCircle size={14} /> Từ chối
                          </button>
                        </>
                      ) : (
                        <span className="adm-chip">{r.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Attendance Analytics */}
      {activeTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {attendanceInsightsQuery.isLoading ? (
            <div className="card"><div className="muted">Đang tải thống kê…</div></div>
          ) : attendanceInsightsQuery.isError ? (
            <div className="card"><div className="muted" style={{ color: 'var(--danger)' }}>Không thể tải dữ liệu chấm công.</div></div>
          ) : (() => {
            const d = attendanceInsightsQuery.data;
            const now = new Date();
            const monthLabel = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;

            const RankingTable = ({ title, icon, items, countKey, countLabel, accentColor }: {
              title: string; icon: React.ReactNode;
              items: AttendanceRankingItem[];
              countKey: keyof AttendanceRankingItem;
              countLabel: string;
              accentColor: string;
            }) => (
              <div style={{
                background: 'var(--panel)', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                boxShadow: '0 2px 12px -4px rgba(60,20,80,0.07)',
                overflow: 'hidden', flex: 1,
              }}>
                <div style={{
                  padding: '13px 16px 11px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 9,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: `${accentColor}18`, color: accentColor,
                    display: 'grid', placeItems: 'center',
                  }}>{icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{title}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{monthLabel}</div>
                  </div>
                </div>
                <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(items ?? []).length === 0 ? (
                    <div className="muted" style={{ fontSize: 12 }}>Không có dữ liệu</div>
                  ) : (items ?? []).slice(0, 5).map((item, idx) => (
                    <div key={item.userId} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 10px', borderRadius: 10,
                      background: idx === 0 ? `${accentColor}0d` : 'var(--panel-2)',
                      border: `1px solid ${idx === 0 ? `${accentColor}30` : 'var(--border)'}`,
                    }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        background: idx === 0 ? accentColor : 'var(--border)',
                        color: idx === 0 ? '#fff' : 'var(--muted)',
                        display: 'grid', placeItems: 'center',
                        fontSize: 11, fontWeight: 800,
                      }}>{idx + 1}</div>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.userFullName}
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px',
                        borderRadius: 99, whiteSpace: 'nowrap',
                        background: `${accentColor}18`, color: accentColor,
                      }}>
                        {String(item[countKey])} {countLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );

            return (
              <>
                {/* Summary bar */}
                <div style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)',
                  borderRadius: 'var(--radius-lg)', padding: '16px 22px',
                  color: '#fff', display: 'flex', alignItems: 'center', gap: 16,
                  boxShadow: '0 4px 20px -4px rgba(16,185,129,0.35)',
                }}>
                  <Calendar size={20} strokeWidth={2.5} style={{ opacity: 0.9 }} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>Thống kê Chấm công — {monthLabel}</div>
                    <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
                      {(d?.chartPoints ?? []).length} ngày có dữ liệu · {(d?.lateRanking ?? []).length} nhân viên trong bảng xếp hạng
                    </div>
                  </div>
                </div>

                {/* 3 ranking tables */}
                <div style={{ display: 'flex', gap: 16 }}>
                  <RankingTable
                    title="Đi trễ nhiều nhất"
                    icon={<Clock size={14} />}
                    items={d?.lateRanking ?? []}
                    countKey="lateCount"
                    countLabel="lần"
                    accentColor="var(--danger)"
                  />
                  <RankingTable
                    title="Vắng mặt nhiều nhất"
                    icon={<UserX size={14} />}
                    items={d?.absentRanking ?? []}
                    countKey="absentCount"
                    countLabel="ngày"
                    accentColor="var(--warn)"
                  />
                  <RankingTable
                    title="Về sớm nhiều nhất"
                    icon={<LogOut size={14} />}
                    items={d?.earlyRanking ?? []}
                    countKey="earlyCount"
                    countLabel="lần"
                    accentColor="var(--purple)"
                  />
                </div>

                {/* Chart points table */}
                {(d?.chartPoints ?? []).length > 0 && (
                  <div style={{
                    background: 'var(--panel)', borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 2px 12px -4px rgba(60,20,80,0.07)',
                    overflow: 'hidden',
                  }}>
                    <div style={{ padding: '13px 16px 11px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>
                      Chi tiết theo ngày
                    </div>
                    <div className="table-wrap">
                      <table className="adm-table">
                        <thead>
                          <tr>
                            <th>Ngày</th>
                            <th>Blocks hoàn thành</th>
                            <th>Giờ làm</th>
                            <th>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(d?.chartPoints ?? []).slice(-14).reverse().map((cp) => (
                            <tr key={cp.date}>
                              <td className="mono">{new Date(cp.date).toLocaleDateString('vi-VN')}</td>
                              <td>{cp.completedBlocks}/{cp.scheduledBlocks}</td>
                              <td>{Math.round(cp.workedMinutes / 60 * 10) / 10}h / {Math.round(cp.scheduledMinutes / 60 * 10) / 10}h</td>
                              <td>
                                {cp.late && <span style={{ color: 'var(--danger)', fontSize: 11, fontWeight: 600, marginRight: 6 }}>⚠ Trễ</span>}
                                {cp.early && <span style={{ color: 'var(--warn)', fontSize: 11, fontWeight: 600, marginRight: 6 }}>⚠ Về sớm</span>}
                                {!cp.late && !cp.early && <span style={{ color: 'var(--ok)', fontSize: 11, fontWeight: 600 }}>✓ Đúng giờ</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
