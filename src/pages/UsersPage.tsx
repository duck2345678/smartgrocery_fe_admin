import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, type AdminUser } from '../api/adminApi';
import { useAuthStore } from '../store/authStore';
import { Pagination } from '../components/Pagination';

const isStrongPassword = (p: string) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

const ROLE_BADGE: Record<string, string> = {
  ADMIN:    'adm-badge--pending',
  MANAGER:  'adm-badge--purple',
  STAFF:    'adm-badge--cyan',
  CUSTOMER: 'adm-badge--muted',
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:   'adm-badge--success',
  INACTIVE: 'adm-badge--muted',
  DELETED:  'adm-badge--danger',
};

type ConfirmDialog = { mode: 'ban' | 'delete'; user: AdminUser } | null;

export function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const isAdmin = (me?.roleName ?? '').toUpperCase() === 'ADMIN';

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [newRole, setNewRole] = useState('CUSTOMER');
  const [editId, setEditId] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>(null);
  const [dialogReason, setDialogReason] = useState('');

  const query = useQuery({
    queryKey: ['admin-users', page, size, role, status, createdFrom, createdTo, search],
    queryFn: () =>
      adminApi.users.list({
        page, size,
        role: role || undefined,
        status: status || undefined,
        createdFrom: createdFrom || undefined,
        createdTo: createdTo || undefined,
        search: search.trim() || undefined,
      }),
  });

  const resetForm = () => {
    setEditId(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setNewRole('CUSTOMER');
    setReason('');
  };

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
        roleName: newRole,
        reason: reason.trim() || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      resetForm();
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (id: number) =>
      adminApi.users.update(id, {
        fullName: fullName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password: password.trim() || undefined,
        roleName: newRole || undefined,
        reason: reason.trim() || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      resetForm();
      setShowForm(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus, rsn }: { id: number; nextStatus: 'ACTIVE' | 'INACTIVE'; rsn: string }) =>
      adminApi.users.setStatus(id, nextStatus, rsn),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setConfirmDialog(null);
      setDialogReason('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, rsn }: { id: number; rsn: string }) => adminApi.users.softDelete(id, rsn),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setConfirmDialog(null);
      setDialogReason('');
    },
  });

  const rows = useMemo(() => query.data?.content ?? [], [query.data?.content]);

  const closeDialog = () => {
    setConfirmDialog(null);
    setDialogReason('');
  };

  const handleConfirmAction = () => {
    if (!confirmDialog || !dialogReason.trim()) return;
    if (confirmDialog.mode === 'ban') {
      statusMutation.mutate({
        id: confirmDialog.user.id,
        nextStatus: confirmDialog.user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        rsn: dialogReason.trim(),
      });
    } else {
      deleteMutation.mutate({ id: confirmDialog.user.id, rsn: dialogReason.trim() });
    }
  };

  const isBusy = statusMutation.isPending || deleteMutation.isPending;

  return (
    <div className="page">

      {/* ── Confirm dialog overlay ── */}
      {confirmDialog && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={closeDialog}
        >
          <div
            className="card"
            style={{ width: 400, maxWidth: '90vw', margin: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
              {confirmDialog.mode === 'ban'
                ? confirmDialog.user.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'
                : 'Xóa tài khoản'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              {confirmDialog.user.fullName ?? confirmDialog.user.email} (#{confirmDialog.user.id})
            </div>

            <label className="adm-field">
              <div className="adm-field__label">Lý do (bắt buộc)</div>
              <input
                className="adm-input"
                value={dialogReason}
                onChange={(e) => setDialogReason(e.target.value)}
                placeholder="Nhập lý do..."
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && dialogReason.trim()) handleConfirmAction(); }}
              />
            </label>

            {(statusMutation.isError || deleteMutation.isError) && (
              <div className="inline-alert" style={{ marginTop: 8 }}>
                {statusMutation.error instanceof Error
                  ? statusMutation.error.message
                  : deleteMutation.error instanceof Error
                  ? deleteMutation.error.message
                  : 'Thao tác thất bại'}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="adm-button adm-button--ghost" type="button" onClick={closeDialog}>
                Hủy
              </button>
              <button
                className={`adm-button ${confirmDialog.mode === 'delete' ? 'adm-button--danger' : 'adm-button--primary'}`}
                type="button"
                disabled={!dialogReason.trim() || isBusy}
                onClick={handleConfirmAction}
              >
                {isBusy
                  ? 'Đang xử lý…'
                  : confirmDialog.mode === 'ban'
                  ? confirmDialog.user.status === 'ACTIVE' ? 'Xác nhận khóa' : 'Xác nhận mở khóa'
                  : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ── */}
      <div className="page__header">
        <div>
          <div className="page__title">{t('pages.usersTitle')}</div>
          <div className="page__subtitle">{t('pages.usersSubtitle')}</div>
        </div>
        <button
          className="adm-button adm-button--primary"
          type="button"
          onClick={() => { resetForm(); setShowForm((v) => !v); }}
        >
          {showForm && !editId ? '✕ Đóng' : '+ Thêm tài khoản'}
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="card">
        <div className="filters">
          <div className="filters__row">
            <label className="adm-field" style={{ flex: 2 }}>
              <div className="adm-field__label">Tìm kiếm (tên / email)</div>
              <input
                className="adm-input"
                placeholder="Nhập tên hoặc email…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Vai trò</div>
              <select className="adm-input" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">Tất cả</option>
                <option value="CUSTOMER">CUSTOMER</option>
                <option value="STAFF">STAFF</option>
                <option value="MANAGER">MANAGER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Trạng thái</div>
              <select className="adm-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Tất cả</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="DELETED">DELETED</option>
              </select>
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Từ ngày</div>
              <input className="adm-input" type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Đến ngày</div>
              <input className="adm-input" type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} />
            </label>
            <button className="adm-button adm-button--ghost" type="button" onClick={() => query.refetch()}>
              {t('common.search')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Create / Edit form (collapsible) ── */}
      {showForm && (
        <div className="card">
          <div className="card__label">{editId ? `Chỉnh sửa tài khoản #${editId}` : 'Thêm tài khoản mới'}</div>
          {(createMutation.isError || updateMutation.isError) && (
            <div className="inline-alert">
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : updateMutation.error instanceof Error
                ? updateMutation.error.message
                : 'Không thể lưu'}
            </div>
          )}
          <div className="form-grid">
            <label className="adm-field">
              <div className="adm-field__label">Họ tên</div>
              <input className="adm-input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Email</div>
              <input className="adm-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Số điện thoại</div>
              <input className="adm-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">
                Mật khẩu{editId ? ' (để trống nếu không đổi)' : ''}
              </div>
              <input
                className="adm-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={editId ? 'Để trống nếu không đổi' : '≥ 8 ký tự, gồm chữ và số'}
                autoComplete={editId ? 'new-password' : 'new-password'}
              />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Vai trò</div>
              <select className="adm-input" value={newRole} onChange={(e) => setNewRole(e.target.value)} disabled={!isAdmin}>
                <option value="CUSTOMER">CUSTOMER</option>
                <option value="STAFF">STAFF</option>
                <option value="MANAGER">MANAGER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>
            <label className="adm-field" style={{ gridColumn: '1 / -1' }}>
              <div className="adm-field__label">Lý do thao tác (audit)</div>
              <input className="adm-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ghi chú lý do tạo / chỉnh sửa…" />
            </label>
          </div>
          <div className="row-actions">
            <button
              className="adm-button adm-button--ghost"
              type="button"
              onClick={() => { resetForm(); setShowForm(false); }}
            >
              Hủy
            </button>
            <button
              className="adm-button adm-button--primary"
              type="button"
              onClick={() => (editId ? updateMutation.mutate(editId) : createMutation.mutate())}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? t('common.saving')
                : editId ? t('common.update') : t('common.create')}
            </button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="card">
        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Người dùng</th>
                <th>Email</th>
                <th>SĐT</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr><td colSpan={8} className="muted">{t('common.loading')}</td></tr>
              ) : query.isError ? (
                <tr><td colSpan={8} className="muted">{query.error instanceof Error ? query.error.message : 'Load failed'}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="muted">{t('common.noData')}</td></tr>
              ) : (
                rows.map((u: AdminUser) => {
                  const initial = (u.fullName ?? u.email ?? '?').trim().split(' ').at(-1)?.slice(0, 1).toUpperCase() ?? '?';
                  return (
                    <tr key={u.id}>
                      <td className="mono">{u.id}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt=""
                              style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                            />
                          ) : (
                            <div style={{
                              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                              background: 'var(--grad-primary)',
                              display: 'grid', placeItems: 'center',
                              fontWeight: 700, fontSize: 13, color: '#fff',
                            }}>
                              {initial}
                            </div>
                          )}
                          <span>{u.fullName ?? '-'}</span>
                        </div>
                      </td>
                      <td className="mono">{u.email}</td>
                      <td className="mono">{u.phone ?? '-'}</td>
                      <td>
                        <span className={`adm-badge ${ROLE_BADGE[u.roleName ?? ''] ?? 'adm-badge--muted'}`}>
                          {u.roleName ?? '-'}
                        </span>
                      </td>
                      <td>
                        <span className={`adm-badge ${STATUS_BADGE[u.status ?? ''] ?? 'adm-badge--muted'}`}>
                          {u.status ?? '-'}
                        </span>
                      </td>
                      <td className="mono">{u.createdAt?.slice(0, 10) ?? '-'}</td>
                      <td className="cell-actions">
                        <button
                          className="adm-button adm-button--ghost"
                          type="button"
                          onClick={() => {
                            setEditId(u.id);
                            setFullName(u.fullName ?? '');
                            setEmail(u.email ?? '');
                            setPhone(u.phone ?? '');
                            setPassword('');
                            setNewRole(u.roleName ?? 'CUSTOMER');
                            setReason('');
                            setShowForm(true);
                          }}
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          className="adm-button adm-button--ghost"
                          type="button"
                          disabled={!isAdmin || isBusy}
                          onClick={() => setConfirmDialog({ mode: 'ban', user: u })}
                        >
                          {u.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}
                        </button>
                        <button
                          className="adm-button adm-button--ghost"
                          type="button"
                          disabled={!isAdmin || isBusy}
                          onClick={() => setConfirmDialog({ mode: 'delete', user: u })}
                          style={{ color: 'var(--danger)' }}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={query.data?.totalPages ?? 0}
          totalElements={query.data?.totalElements}
          size={size}
          onPageChange={setPage}
          onSizeChange={setSize}
        />
      </div>
    </div>
  );
}
