import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, type AdminUser } from '../api/adminApi';
import { useAuthStore } from '../store/authStore';

const isStrongPassword = (p: string) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

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

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [newRole, setNewRole] = useState('CUSTOMER');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  const query = useQuery({
    queryKey: ['admin-users', page, size, role, status, createdFrom, createdTo],
    queryFn: () =>
      adminApi.users.list({
        page,
        size,
        role: role || undefined,
        status: status || undefined,
        createdFrom: createdFrom || undefined,
        createdTo: createdTo || undefined,
      }),
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
        roleName: newRole,
        avatarUrl: avatarUrl.trim() || undefined,
        reason: reason.trim() || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditId(null);
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setNewRole('CUSTOMER');
      setAvatarUrl('');
      setReason('');
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
        avatarUrl: avatarUrl.trim() || undefined,
        reason: reason.trim() || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditId(null);
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setNewRole('CUSTOMER');
      setAvatarUrl('');
      setReason('');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus, rsn }: { id: number; nextStatus: 'ACTIVE' | 'INACTIVE'; rsn: string }) =>
      adminApi.users.setStatus(id, nextStatus, rsn),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, rsn }: { id: number; rsn: string }) => adminApi.users.softDelete(id, rsn),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const rows = useMemo(() => query.data?.content ?? [], [query.data?.content]);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">{t('pages.usersTitle')}</div>
          <div className="page__subtitle">{t('pages.usersSubtitle')}</div>
        </div>
      </div>

      <div className="card">
        <div className="filters">
          <div className="filters__row">
            <label className="adm-field">
              <div className="adm-field__label">Role</div>
              <select className="adm-input" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">All</option>
                <option value="CUSTOMER">CUSTOMER</option>
                <option value="STAFF">STAFF</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Status</div>
              <select className="adm-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="DELETED">DELETED</option>
              </select>
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Created From</div>
              <input className="adm-input" type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Created To</div>
              <input className="adm-input" type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} />
            </label>
            <button className="adm-button adm-button--ghost" type="button" onClick={() => query.refetch()}>
              {t('common.search')}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__label">{editId ? `Chỉnh sửa #${editId}` : 'Thêm tài khoản mới'}</div>
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
            <input className="adm-input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">Số điện thoại</div>
            <input className="adm-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">Mật khẩu</div>
            <input className="adm-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={editId ? 'Để trống nếu không đổi' : ''} />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">Vai trò</div>
            <select className="adm-input" value={newRole} onChange={(e) => setNewRole(e.target.value)} disabled={!isAdmin}>
              <option value="CUSTOMER">CUSTOMER</option>
              <option value="STAFF">STAFF</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>
          <label className="adm-field">
            <div className="adm-field__label">Avatar URL</div>
            <input className="adm-input" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
          </label>
          <label className="adm-field" style={{ gridColumn: '1 / -1' }}>
            <div className="adm-field__label">Lý do thao tác (audit)</div>
            <input className="adm-input" value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
        </div>
        <div className="row-actions">
          <button
            className="adm-button adm-button--ghost"
            type="button"
            onClick={() => {
              setEditId(null);
              setFullName('');
              setEmail('');
              setPhone('');
              setPassword('');
              setNewRole('CUSTOMER');
              setAvatarUrl('');
              setReason('');
            }}
          >
            {t('common.resetForm')}
          </button>
          <button
            className="adm-button adm-button--primary"
            type="button"
            onClick={() => (editId ? updateMutation.mutate(editId) : createMutation.mutate())}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? t('common.saving') : editId ? t('common.update') : t('common.create')}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr>
                  <td colSpan={8} className="muted">{t('common.loading')}</td>
                </tr>
              ) : query.isError ? (
                <tr>
                  <td colSpan={8} className="muted">{query.error instanceof Error ? query.error.message : 'Load failed'}</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="muted">{t('common.noData')}</td>
                </tr>
              ) : (
                rows.map((u: AdminUser) => (
                  <tr key={u.id}>
                    <td className="mono">{u.id}</td>
                    <td>{u.fullName ?? '-'}</td>
                    <td className="mono">{u.email}</td>
                    <td className="mono">{u.phone ?? '-'}</td>
                    <td className="mono">{u.roleName}</td>
                    <td className="mono">{u.status}</td>
                    <td className="mono">{u.createdAt ?? '-'}</td>
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
                          setAvatarUrl(u.avatarUrl ?? '');
                          setReason('');
                        }}
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        className="adm-button adm-button--ghost"
                        type="button"
                        disabled={!isAdmin || statusMutation.isPending}
                        onClick={() => {
                          const rsn = window.prompt('Lý do đổi trạng thái?') ?? '';
                          if (!rsn.trim()) return;
                          statusMutation.mutate({ id: u.id, nextStatus: u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE', rsn });
                        }}
                      >
                        {u.status === 'ACTIVE' ? 'Ban' : 'Unban'}
                      </button>
                      <button
                        className="adm-button adm-button--ghost"
                        type="button"
                        disabled={!isAdmin || deleteMutation.isPending}
                        onClick={() => {
                          const rsn = window.prompt('Lý do xóa mềm?') ?? '';
                          if (!rsn.trim()) return;
                          if (!window.confirm(`Xác nhận xóa mềm user #${u.id}?`)) return;
                          deleteMutation.mutate({ id: u.id, rsn });
                        }}
                      >
                        Soft Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <div className="muted">
            {t('table.total')}: {query.data?.totalElements ?? 0} • {t('table.page')} {query.data ? query.data.number + 1 : 0}/{query.data?.totalPages ?? 0}
          </div>
          <div className="pager__actions">
            <label className="adm-field" style={{ minWidth: 120 }}>
              <div className="adm-field__label">{t('fields.size')}</div>
              <select className="adm-input" value={String(size)} onChange={(e) => { setPage(0); setSize(Number(e.target.value)); }}>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </label>
            <button className="adm-button adm-button--ghost" type="button" onClick={() => setPage(0)} disabled={!query.data || page <= 0}>{t('table.first')}</button>
            <button className="adm-button adm-button--ghost" type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={!query.data || page <= 0}>{t('table.prev')}</button>
            <button className="adm-button adm-button--ghost" type="button" onClick={() => setPage((p) => (query.data ? Math.min(query.data.totalPages - 1, p + 1) : p))} disabled={!query.data || page >= (query.data.totalPages ?? 1) - 1}>{t('table.next')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
