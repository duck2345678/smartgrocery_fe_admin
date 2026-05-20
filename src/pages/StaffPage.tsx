import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, type AdminUser, type AdminShiftRequestItemDto } from '../api/adminApi';
import { 
  UserPlus, Search, Edit, Ban, CheckCircle, XCircle,
  ClipboardCheck, BarChart2, User as UserIcon
} from 'lucide-react';

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
        <div className="grid">
          <div className="grid grid--3">
            <div className="card">
              <div className="card__label">Tổng nhân viên</div>
              <div className="card__value">{attendanceInsightsQuery.data?.totalStaff || 0}</div>
              <div className="card__hint">Đã đăng ký tài khoản</div>
            </div>
            <div className="card">
              <div className="card__label">Đang trực hôm nay</div>
              <div className="card__value" style={{ color: 'var(--ok)' }}>{attendanceInsightsQuery.data?.activeToday || 0}</div>
              <div className="card__hint">Đã bấm Check-in</div>
            </div>
            <div className="card">
              <div className="card__label">Yêu cầu chờ duyệt</div>
              <div className="card__value" style={{ color: (attendanceInsightsQuery.data?.pendingRequests || 0) > 0 ? 'var(--danger)' : 'inherit' }}>
                {attendanceInsightsQuery.data?.pendingRequests || 0}
              </div>
              <div className="card__hint">Đơn đăng ký ca</div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 15 }}>
            <div className="card__label">Bảng xếp hạng hiệu suất (Tháng này)</div>
            <div className="list">
              {attendanceInsightsQuery.data?.topPerformers.map((p, idx) => (
                <div key={p.userId} className="list__row" style={{ alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="adm-user__avatar" style={{ width: 28, height: 28, fontSize: 10 }}>{idx + 1}</div>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                    <div style={{ fontSize: 12 }}>Chỉ số chuyên cần: <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{p.score}%</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
