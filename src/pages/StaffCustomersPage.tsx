import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/adminApi';

export function StaffCustomersPage() {
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(0);
  const PAGE_SIZE = 20;

  const query = useQuery({
    queryKey: ['staff-customers', page, PAGE_SIZE],
    queryFn: () => adminApi.users.list({ role: 'CUSTOMER', page, size: PAGE_SIZE }),
  });

  const customers = query.data?.content ?? [];
  const totalPages = query.data?.totalPages ?? 0;
  const total = query.data?.totalElements ?? 0;

  const filtered = search
    ? customers.filter(
        (u) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          (u.fullName ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (u.phone ?? '').includes(search)
      )
    : customers;

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">Khách hàng</div>
          <div className="page__subtitle">Danh sách tài khoản khách hàng ({total.toLocaleString()})</div>
        </div>
      </div>

      <div className="card">
        <div className="row-actions row-actions--between">
          <input
            className="adm-input"
            placeholder="Tìm theo tên, email, số điện thoại…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 320 }}
          />
          {search && (
            <button className="adm-button adm-button--ghost" onClick={() => setSearch('')} type="button">
              Xoá lọc
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {query.isLoading && <div className="muted">Đang tải…</div>}
        {query.isError && <div className="muted">Không tải được danh sách khách hàng.</div>}
        {!query.isLoading && !query.isError && (
          <table className="adm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td className="mono">{u.id}</td>
                  <td>{u.fullName ?? '—'}</td>
                  <td>{u.email}</td>
                  <td>{u.phone ?? '—'}</td>
                  <td>
                    <span className={`adm-badge ${u.status === 'ACTIVE' ? 'adm-badge--success' : 'adm-badge--muted'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="muted">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '1rem' }}>
                    Chưa có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="row-actions" style={{ marginTop: '1rem', justifyContent: 'center', gap: '0.5rem' }}>
            <button className="adm-button adm-button--ghost" disabled={page === 0} onClick={() => setPage(0)} type="button">
              Đầu
            </button>
            <button className="adm-button adm-button--ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)} type="button">
              Trước
            </button>
            <span className="muted">
              Trang {page + 1} / {totalPages}
            </span>
            <button className="adm-button adm-button--ghost" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} type="button">
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
