import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, type AdminUser } from '../api/adminApi';
import { UserPlus, Search, Edit, Ban, CheckCircle, XCircle, RotateCcw, Activity, MapPin, BarChart2, User as UserIcon } from 'lucide-react';

const isStrongPassword = (p: string) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

export function CustomersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // State cho List
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  // State cho Form (Add/Edit)
  const [editId, setEditId] = useState<number | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [reason, setReason] = useState('');
  const [showForm, setShowForm] = useState(false);

  // State cho Customer Details Modal
  const [detailsUserId, setDetailsUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'nutrition' | 'addresses' | 'analytics'>('profile');

  // Query danh sách khách hàng
  const query = useQuery({
    queryKey: ['admin-customers', page, size, statusFilter],
    queryFn: () =>
      adminApi.users.list({
        page,
        size,
        role: 'CUSTOMER',
        status: statusFilter || undefined,
      }),
  });

  // Queries cho Chi tiết khách hàng
  const nutritionQuery = useQuery({
    queryKey: ['customer-nutrition', detailsUserId],
    queryFn: () => (detailsUserId ? adminApi.users.nutrition(detailsUserId) : null),
    enabled: !!detailsUserId && activeTab === 'nutrition',
  });

  const addressesQuery = useQuery({
    queryKey: ['customer-addresses', detailsUserId],
    queryFn: () => (detailsUserId ? adminApi.users.addresses(detailsUserId) : []),
    enabled: !!detailsUserId && activeTab === 'addresses',
  });

  const ordersQuery = useQuery({
    queryKey: ['customer-orders', detailsUserId],
    queryFn: () => (detailsUserId ? adminApi.users.orders(detailsUserId) : []),
    enabled: !!detailsUserId && activeTab === 'analytics',
  });

  const analyticsQuery = useQuery({
    queryKey: ['customer-analytics', detailsUserId],
    queryFn: () => (detailsUserId ? adminApi.users.analytics(detailsUserId) : null),
    enabled: !!detailsUserId && activeTab === 'analytics',
  });

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
        roleName: 'CUSTOMER',
        avatarUrl: avatarUrl.trim() || undefined,
        reason: reason.trim() || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      resetForm();
      alert('Thêm khách hàng thành công');
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
      await queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      resetForm();
      alert('Cập nhật thông tin thành công');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus, rsn }: { id: number; nextStatus: 'ACTIVE' | 'INACTIVE'; rsn: string }) =>
      adminApi.users.setStatus(id, nextStatus, rsn),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
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

  const rows = useMemo(() => {
    const data = query.data?.content ?? [];
    if (!searchKeyword.trim()) return data;
    const kw = searchKeyword.toLowerCase();
    return data.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(kw) ||
        u.email.toLowerCase().includes(kw) ||
        u.phone?.includes(kw)
    );
  }, [query.data?.content, searchKeyword]);

  const selectedUser = useMemo(() => {
    return rows.find(u => u.id === detailsUserId);
  }, [rows, detailsUserId]);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">{t('pages.customersTitle')}</div>
          <div className="page__subtitle">{t('pages.customersSubtitle')}</div>
        </div>
        <button className="adm-button adm-button--primary" onClick={() => setShowForm(true)}>
          <UserPlus size={18} />
          <span>Thêm khách hàng</span>
        </button>
      </div>

      {/* Form Section (Add/Edit) */}
      {showForm && (
        <div className="card" style={{ border: '1px solid var(--primary)' }}>
          <div className="card__label">{editId ? `Chỉnh sửa khách hàng #${editId}` : 'Tạo khách hàng mới'}</div>
          {(createMutation.isError || updateMutation.isError) && (
            <div className="inline-alert">
              {((createMutation.error || updateMutation.error) as Error)?.message || 'Thao tác thất bại'}
            </div>
          )}
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
              <input
                className="adm-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={editId ? 'Để trống nếu không đổi' : 'Tối thiểu 8 ký tự'}
              />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Avatar URL</div>
              <input className="adm-input" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Lý do thao tác (Audit)</div>
              <input className="adm-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Nhập lý do lưu..." />
            </label>
          </div>
          <div className="row-actions">
            <button className="adm-button adm-button--ghost" onClick={resetForm}>Hủy</button>
            <button
              className="adm-button adm-button--primary"
              onClick={() => (editId ? updateMutation.mutate(editId) : createMutation.mutate())}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Đang lưu...' : editId ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="card">
        <div className="filters">
          <div className="filters__row">
            <label className="adm-field">
              <div className="adm-field__label">Tìm kiếm</div>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--muted)' }} />
                <input
                  className="adm-input"
                  style={{ paddingLeft: 32 }}
                  placeholder="Tên, Email, SĐT..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Trạng thái</div>
              <select className="adm-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Tất cả</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Bị khóa</option>
              </select>
            </label>
            <div className="filters__actions">
                <button className="adm-button adm-button--ghost" onClick={() => { setStatusFilter(''); setSearchKeyword(''); }}>
                    <RotateCcw size={14} />
                    Làm mới
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="card">
        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Khách hàng</th>
                <th>Liên hệ</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr><td colSpan={6} className="muted">Đang tải dữ liệu...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="muted">Không tìm thấy khách hàng nào</td></tr>
              ) : (
                rows.map((u: AdminUser) => (
                  <tr key={u.id}>
                    <td className="mono">{u.id}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div className="adm-user__avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                          {u.avatarUrl ? <img src={u.avatarUrl} className="adm-brand__logo-img" alt="" /> : (u.fullName || 'C')[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.fullName || 'N/A'}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="mono" style={{ fontSize: 12 }}>{u.phone || '-'}</div>
                    </td>
                    <td>
                      {u.status === 'ACTIVE' ? (
                        <span style={{ color: 'var(--ok)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={14} /> Hoạt động
                        </span>
                      ) : (
                        <span style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Ban size={14} /> Bị khóa
                        </span>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '-'}
                    </td>
                    <td className="cell-actions">
                      <button className="adm-button adm-button--ghost" title="Chi tiết & Thống kê" onClick={() => {
                        setDetailsUserId(u.id);
                        setActiveTab('profile');
                      }}>
                        <BarChart2 size={14} />
                      </button>
                      <button className="adm-button adm-button--ghost" title="Sửa nhanh" onClick={() => {
                        setEditId(u.id);
                        setFullName(u.fullName || '');
                        setEmail(u.email);
                        setPhone(u.phone || '');
                        setPassword('');
                        setAvatarUrl(u.avatarUrl || '');
                        setShowForm(true);
                      }}>
                        <Edit size={14} />
                      </button>
                      <button
                        className="adm-button adm-button--ghost"
                        title={u.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Kích hoạt'}
                        style={{ color: u.status === 'ACTIVE' ? 'var(--danger)' : 'var(--ok)' }}
                        onClick={() => {
                          const rsn = window.prompt(`Lý do ${u.status === 'ACTIVE' ? 'khóa' : 'mở khóa'}?`) || 'Admin update';
                          statusMutation.mutate({ id: u.id, nextStatus: u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE', rsn });
                        }}
                      >
                        {u.status === 'ACTIVE' ? <XCircle size={14} /> : <CheckCircle size={14} />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pager">
          <div className="muted" style={{ fontSize: 12 }}>
            Tổng số: {query.data?.totalElements || 0}
          </div>
          <div className="pager__actions">
            <button className="adm-button adm-button--ghost" disabled={page === 0} onClick={() => setPage(0)}>Đầu</button>
            <button className="adm-button adm-button--ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trước</button>
            <span className="mono" style={{ padding: '0 10px' }}>{page + 1} / {query.data?.totalPages || 1}</span>
            <button className="adm-button adm-button--ghost" disabled={page >= (query.data?.totalPages || 1) - 1} onClick={() => setPage(p => p + 1)}>Sau</button>
          </div>
        </div>
      </div>

      {/* Advanced Customer Details Modal */}
      {detailsUserId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
          display: 'grid', placeItems: 'center', padding: 20, backdropFilter: 'blur(4px)'
        }} onClick={() => setDetailsUserId(null)}>
          <div className="card" style={{ width: 900, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }} onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                <div className="adm-user__avatar" style={{ width: 48, height: 48, fontSize: 18 }}>
                  {selectedUser?.avatarUrl ? <img src={selectedUser.avatarUrl} className="adm-brand__logo-img" alt="" /> : (selectedUser?.fullName || 'C')[0]}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedUser?.fullName || 'Khách hàng'}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>#{detailsUserId} • {selectedUser?.email}</div>
                </div>
              </div>
              <button className="adm-button adm-button--ghost" onClick={() => setDetailsUserId(null)}><XCircle size={20} /></button>
            </div>

            {/* Tabs Navigation */}
            <div style={{ display: 'flex', background: 'var(--panel-2)', padding: '0 12px' }}>
              <button className={`adm-nav__item ${activeTab === 'profile' ? 'is-active' : ''}`} style={{ border: 0, borderRadius: 0, padding: '12px 20px' }} onClick={() => setActiveTab('profile')}>
                <UserIcon size={16} /> Hồ sơ
              </button>
              <button className={`adm-nav__item ${activeTab === 'nutrition' ? 'is-active' : ''}`} style={{ border: 0, borderRadius: 0, padding: '12px 20px' }} onClick={() => setActiveTab('nutrition')}>
                <Activity size={16} /> Dinh dưỡng
              </button>
              <button className={`adm-nav__item ${activeTab === 'addresses' ? 'is-active' : ''}`} style={{ border: 0, borderRadius: 0, padding: '12px 20px' }} onClick={() => setActiveTab('addresses')}>
                <MapPin size={16} /> Địa chỉ
              </button>
              <button className={`adm-nav__item ${activeTab === 'analytics' ? 'is-active' : ''}`} style={{ border: 0, borderRadius: 0, padding: '12px 20px' }} onClick={() => setActiveTab('analytics')}>
                <BarChart2 size={16} /> Phân tích mua sắm
              </button>
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              
              {activeTab === 'profile' && (
                <div className="form-grid">
                  <div className="adm-field">
                    <div className="adm-field__label">Họ và tên</div>
                    <div className="adm-input" style={{ background: 'var(--panel-2)' }}>{selectedUser?.fullName || '-'}</div>
                  </div>
                  <div className="adm-field">
                    <div className="adm-field__label">Email</div>
                    <div className="adm-input" style={{ background: 'var(--panel-2)' }}>{selectedUser?.email}</div>
                  </div>
                  <div className="adm-field">
                    <div className="adm-field__label">Số điện thoại</div>
                    <div className="adm-input" style={{ background: 'var(--panel-2)' }}>{selectedUser?.phone || '-'}</div>
                  </div>
                  <div className="adm-field">
                    <div className="adm-field__label">Trạng thái</div>
                    <div className="adm-input" style={{ background: 'var(--panel-2)', color: selectedUser?.status === 'ACTIVE' ? 'var(--ok)' : 'var(--danger)' }}>
                      {selectedUser?.status}
                    </div>
                  </div>
                  <div className="adm-field">
                    <div className="adm-field__label">Ngày gia nhập</div>
                    <div className="adm-input" style={{ background: 'var(--panel-2)' }}>
                      {selectedUser?.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('vi-VN') : '-'}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'nutrition' && (
                <div>
                  {nutritionQuery.isLoading ? <div className="muted">Đang tải hồ sơ sức khỏe...</div> : (
                    <div className="grid grid--2">
                      <div className="card">
                        <div className="card__label">Chỉ số BMI</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                          <div className="card__value" style={{ color: (nutritionQuery.data?.bmi || 0) > 25 ? 'var(--danger)' : 'var(--ok)' }}>
                            {nutritionQuery.data?.bmi?.toFixed(1) || 'N/A'}
                          </div>
                          <div className="muted">{ (nutritionQuery.data?.bmi || 0) > 25 ? '(Thừa cân)' : (nutritionQuery.data?.bmi || 0) < 18.5 ? '(Gầy)' : '(Cân đối)' }</div>
                        </div>
                        <div className="card__hint">Chiều cao: {nutritionQuery.data?.height}cm • Cân nặng: {nutritionQuery.data?.weight}kg</div>
                      </div>
                      <div className="card">
                        <div className="card__label">Mục tiêu sức khỏe</div>
                        <div style={{ fontWeight: 600 }}>{nutritionQuery.data?.healthGoals || 'Chưa thiết lập'}</div>
                        <div className="card__hint">Chế độ ăn ưu tiên: {nutritionQuery.data?.dietaryPreference || 'Mặc định'}</div>
                      </div>
                      <div className="card" style={{ gridColumn: '1 / -1' }}>
                        <div className="card__label">Cảnh báo dị ứng</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                          {nutritionQuery.data?.allergies ? nutritionQuery.data.allergies.split(',').map(a => (
                            <span key={a} className="adm-chip" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}>
                              {a.trim()}
                            </span>
                          )) : <div className="muted">Không có thông tin dị ứng</div>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'addresses' && (
                <div className="list">
                  {addressesQuery.isLoading ? <div className="muted">Đang tải sổ địa chỉ...</div> : addressesQuery.data?.length === 0 ? <div className="muted">Chưa có địa chỉ nào</div> : (
                    addressesQuery.data?.map(addr => (
                      <div key={addr.id} className="list__row" style={{ alignItems: 'center', borderLeft: addr.isDefault ? '4px solid var(--primary)' : undefined }}>
                        <div>
                          <div style={{ fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
                            {addr.addressType} {addr.isDefault && <span className="adm-chip" style={{ fontSize: 10, padding: '2px 6px', background: 'var(--ok-bg)', color: 'var(--ok-text)' }}>Mặc định</span>}
                          </div>
                          <div style={{ fontSize: 13, marginTop: 4 }}>{addr.streetAddress}, {addr.ward}, {addr.district}, {addr.city}</div>
                          <div className="muted" style={{ fontSize: 11 }}>Người nhận: {addr.receiverName} • {addr.receiverPhone}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="grid">
                  {/* Stats Cards */}
                  <div className="grid grid--3">
                    <div className="card">
                      <div className="card__label">Tổng chi tiêu</div>
                      <div className="card__value" style={{ fontSize: 24 }}>{analyticsQuery.data?.totalSpent.toLocaleString()}đ</div>
                      <div className="chip" style={{ marginTop: 5, display: 'inline-block', background: analyticsQuery.data?.vipStatus === 'VIP' ? 'gold' : 'var(--chip-bg)', color: analyticsQuery.data?.vipStatus === 'VIP' ? '#000' : 'inherit', fontSize: 10, padding: '2px 8px', borderRadius: 4 }}>
                        {analyticsQuery.data?.vipStatus}
                      </div>
                    </div>
                    <div className="card">
                      <div className="card__label">Số đơn hàng</div>
                      <div className="card__value" style={{ fontSize: 24 }}>{analyticsQuery.data?.orderCount}</div>
                      <div className="card__hint">Đơn thành công</div>
                    </div>
                    <div className="card">
                      <div className="card__label">Tỷ lệ hủy</div>
                      <div className="card__value" style={{ fontSize: 24, color: (analyticsQuery.data?.cancelRate || 0) > 20 ? 'var(--danger)' : 'inherit' }}>
                        {analyticsQuery.data?.cancelRate.toFixed(1)}%
                      </div>
                      <div className="card__hint">Dựa trên tổng đơn đã đặt</div>
                    </div>
                  </div>

                  {/* Orders Table */}
                  <div className="card" style={{ marginTop: 12 }}>
                    <div className="card__label">Lịch sử giao dịch gần đây</div>
                    <div className="table-wrap">
                      <table className="adm-table">
                        <thead>
                          <tr>
                            <th>Mã đơn</th>
                            <th>Ngày đặt</th>
                            <th>Tổng tiền</th>
                            <th>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ordersQuery.isLoading ? <tr><td colSpan={4}>Đang tải...</td></tr> : ordersQuery.data?.slice(0, 5).map(o => (
                            <tr key={o.id}>
                              <td className="mono" style={{ fontSize: 12 }}>{o.orderNumber}</td>
                              <td className="mono" style={{ fontSize: 11 }}>
                                {o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '-'}
                              </td>
                              <td style={{ fontWeight: 600 }}>{o.totalAmount.toLocaleString()}đ</td>
                              <td><span className="adm-chip" style={{ fontSize: 10 }}>{o.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
