import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, type Category } from '../api/adminApi';

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const listQuery = useQuery({
    queryKey: ['categories'],
    queryFn:  () => adminApi.categories.list(),
  });

  const productsQuery = useQuery({
    queryKey: ['admin-products-for-categories'],
    queryFn:  () => adminApi.products.adminList({ size: 1000 }),
  });

  const [showForm,         setShowForm]         = useState(false);
  const [editing,          setEditing]          = useState<Category | null>(null);
  const [viewing,          setViewing]          = useState<Category | null>(null);
  const [categoryCode,     setCategoryCode]     = useState('');
  const [name,             setName]             = useState('');
  const [description,      setDescription]      = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [sortOrder,        setSortOrder]        = useState('0');
  const [isActive,         setIsActive]         = useState(true);

  const [deactivateTarget, setDeactivateTarget] = useState<Category | null>(null);
  const [statusFilter,     setStatusFilter]     = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [search,           setSearch]           = useState('');
  const [page,             setPage]             = useState(0);
  const [size,             setSize]             = useState(20);

  const resetForm = () => {
    setEditing(null);
    setCategoryCode('');
    setName('');
    setDescription('');
    setParentCategoryId('');
    setSortOrder('0');
    setIsActive(true);
  };

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const pid = Number(parentCategoryId);
      const payload = {
        categoryCode: categoryCode.trim(),
        name:         name.trim(),
        description:  description.trim() || undefined,
        sortOrder:    Number(sortOrder) || 0,
        isActive,
        parentCategoryId: Number.isFinite(pid) && pid > 0 ? pid : undefined,
      };
      if (!payload.categoryCode) throw new Error(`${t('fields.categoryCode')}: ${t('common.required')}.`);
      if (!payload.name)         throw new Error(`${t('fields.categoryName')}: ${t('common.required')}.`);
      return editing
        ? adminApi.categories.update(editing.id, payload)
        : adminApi.categories.create(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      resetForm();
      setShowForm(false);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => adminApi.categories.deactivate(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeactivateTarget(null);
    },
  });

  const activateMutation = useMutation({
    mutationFn: (category: Category) => adminApi.categories.update(category.id, { isActive: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const categories   = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const activeCount  = useMemo(() => categories.filter((c) => Boolean(c.isActive)).length,      [categories]);
  const inactiveCount = useMemo(() => categories.filter((c) => !c.isActive).length,             [categories]);
  const rootCount    = useMemo(() => categories.filter((c) => !c.parentCategory?.id).length,    [categories]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories.filter((c) => {
      const matchesStatus =
        statusFilter === 'ACTIVE' ? Boolean(c.isActive)
        : statusFilter === 'INACTIVE' ? !c.isActive
        : true;
      if (!matchesStatus) return false;
      if (!q) return true;
      const haystack = `${c.categoryCode ?? ''} ${c.name ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [categories, statusFilter, search]);
  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / size));
  const currentPage = Math.min(page, totalPages - 1);
  const pagedCategories = useMemo(
    () => filteredCategories.slice(currentPage * size, currentPage * size + size),
    [filteredCategories, currentPage, size]
  );

  const products     = useMemo(() => productsQuery.data?.content ?? [], [productsQuery.data]);
  const productCountByCategoryId = useMemo(() => {
    const counts: Record<number, number> = {};
    products.forEach((p) => {
      if (p.category?.id) {
        counts[p.category.id] = (counts[p.category.id] ?? 0) + 1;
      }
    });
    return counts;
  }, [products]);
  const viewingProducts = useMemo(
    () => viewing ? products.filter((p) => p.category?.id === viewing.id) : [],
    [products, viewing]
  );
  const editingProductCount = editing ? (productCountByCategoryId[editing.id] ?? 0) : 0;

  const canSubmit = useMemo(
    () => !!categoryCode.trim() && !!name.trim() && !upsertMutation.isPending,
    [categoryCode, name, upsertMutation.isPending]
  );

  return (
    <div className="page">

      {/* â”€â”€ Deactivate confirm dialog â”€â”€ */}
      {deactivateTarget && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setDeactivateTarget(null)}
        >
          <div className="card" style={{ width: 380, maxWidth: '90vw', margin: 0 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Vô hiệu danh mục</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              <strong>{deactivateTarget.name}</strong> (#{deactivateTarget.id}) sẽ bị ẩn khỏi hệ thống.
            </div>
            {deactivateMutation.isError && (
              <div className="inline-alert" style={{ marginBottom: 16 }}>
                {deactivateMutation.error instanceof Error ? deactivateMutation.error.message : 'Không thể vô hiệu danh mục này'}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="adm-button adm-button--ghost" type="button" onClick={() => setDeactivateTarget(null)}>
                Hủy
              </button>
              <button
                className="adm-button adm-button--danger"
                type="button"
                disabled={deactivateMutation.isPending}
                onClick={() => deactivateMutation.mutate(deactivateTarget.id)}
              >
                {deactivateMutation.isPending ? 'Đang xử lý...' : 'Xác nhận vô hiệu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setViewing(null)}
        >
          <div className="modal-content category-detail-modal category-detail-modal--legacy" onClick={(e) => e.stopPropagation()}>
            <button className="adm-button adm-button--ghost modal-close" type="button" onClick={() => setViewing(null)}>Đóng</button>
            <div className="card" style={{ boxShadow: 'none' }}>
              <div className="card__title">{viewing.name}</div>
              <div className="card__hint">{viewing.categoryCode}</div>
              <div className="grid category-detail-metrics" style={{ marginTop: 16 }}>
                <div className="card" style={{ boxShadow: 'none' }}>
                  <div className="card__label">Trạng thái</div>
                  <span className={`adm-badge ${viewing.isActive ? 'adm-badge--success' : 'adm-badge--muted'}`}>
                    {viewing.isActive ? 'Hoạt động' : 'Vô hiệu'}
                  </span>
                </div>
                <div className="card" style={{ boxShadow: 'none' }}>
                  <div className="card__label">Số sản phẩm</div>
                  <div className="card__value">{viewingProducts.length}</div>
                </div>
              </div>
              {viewing.description && (
                <div className="delivery-info" style={{ marginTop: 16 }}>
                  <div className="delivery-info__label">Mô tả</div>
                  <div className="delivery-info__address">{viewing.description}</div>
                </div>
              )}

              <div className="card__label" style={{ marginTop: 18 }}>Sản phẩm thuộc danh mục</div>
              {productsQuery.isLoading ? (
                <div className="muted">Đang tải sản phẩm...</div>
              ) : viewingProducts.length === 0 ? (
                <div className="muted">Chưa có sản phẩm trong danh mục này.</div>
              ) : (
                <div className="table-wrap category-detail-products" style={{ marginTop: 10 }}>
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Mã</th>
                        <th>Sản phẩm</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingProducts.map((p) => (
                        <tr key={p.id}>
                          <td className="mono">{p.productCode}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="order-item-row__thumb">
                                {p.image ? <img src={p.image} alt={p.name} /> : <span>IMG</span>}
                              </div>
                              <span>{p.name}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`adm-badge ${p.status === 'ACTIVE' ? 'adm-badge--success' : 'adm-badge--muted'}`}>
                              {p.status ?? '-'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="page__header">
        <div>
          <div className="page__title">{t('pages.categoriesTitle')}</div>
          <div className="page__subtitle">{t('pages.categoriesSubtitle')}</div>
        </div>
        <button
          className="adm-button adm-button--primary"
          type="button"
          onClick={() => { resetForm(); setShowForm((v) => !v); }}
        >
          {showForm && !editing ? 'Đóng' : '+ Thêm danh mục'}
        </button>
      </div>

      {/* â”€â”€ KPI cards â”€â”€ */}
      <div className="grid grid--3">
        <div className="card">
          <div className="card__label">Tổng danh mục</div>
          <div className="card__value">{categories.length}</div>
          <div className="card__hint">Tất cả, kể cả vô hiệu</div>
        </div>
        <div className="card">
          <div className="card__label">Đang hoạt động</div>
          <div className="card__value" style={{ color: 'var(--emerald)' }}>{activeCount}</div>
          <div className="card__hint">{inactiveCount > 0 ? `${inactiveCount} đã vô hiệu` : 'Không có vô hiệu'}</div>
        </div>
        <div className="card">
          <div className="card__label">Danh mục gốc</div>
          <div className="card__value">{rootCount}</div>
          <div className="card__hint">Không có danh mục cha</div>
        </div>
      </div>

      {/* â”€â”€ Create / Edit form (collapsible) â”€â”€ */}
      {showForm && (
        <div className="card">
          <div className="card__label">
            {editing ? `Chỉnh sửa danh mục #${editing.id}` : t('categories.formTitleCreate')}
          </div>
          {upsertMutation.isError && (
            <div className="inline-alert">
              {upsertMutation.error instanceof Error ? upsertMutation.error.message : t('messages.saveFailed')}
            </div>
          )}
          <div className="form-grid">
            <label className="adm-field">
              <div className="adm-field__label">{t('fields.categoryCode')}</div>
              <input className="adm-input" value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} placeholder="CAT_FRUIT" />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">{t('fields.categoryName')}</div>
              <input className="adm-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Trái cây" />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Trạng thái</div>
              <select className="adm-input" value={isActive ? 'true' : 'false'} onChange={(e) => setIsActive(e.target.value === 'true')}>
                <option value="true">Hoạt động</option>
                <option value="false" disabled={editingProductCount > 0}>Vô hiệu</option>
              </select>
              {editingProductCount > 0 && (
                <div className="adm-field__hint">Danh mục đang có sản phẩm nên không thể vô hiệu.</div>
              )}
            </label>
            <label className="adm-field" style={{ gridColumn: '1 / -1' }}>
              <div className="adm-field__label">{t('fields.description')}</div>
              <input className="adm-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Không bắt buộc" />
            </label>
          </div>
          <div className="row-actions">
            <button className="adm-button adm-button--ghost" type="button" onClick={() => { resetForm(); setShowForm(false); }}>
              Hủy
            </button>
            <button className="adm-button adm-button--primary" type="button" onClick={() => upsertMutation.mutate()} disabled={!canSubmit}>
              {upsertMutation.isPending ? t('common.saving') : editing ? t('categories.saveActionEdit') : t('categories.saveActionCreate')}
            </button>
          </div>
        </div>
      )}

      {/* â”€â”€ Table â”€â”€ */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
          <div className="card__label">{t('pages.categoriesTitle')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              className="adm-input"
              style={{ width: 260, margin: 0, padding: '4px 10px', fontSize: 13, height: 32 }}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Tìm mã hoặc tên danh mục"
            />
            <select
              className="adm-input"
              style={{ width: 180, margin: 0, padding: '4px 8px', fontSize: 13, height: 32 }}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as any); setPage(0); }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Đã vô hiệu</option>
            </select>
            <select
              className="adm-input"
              style={{ width: 110, margin: 0, padding: '4px 8px', fontSize: 13, height: 32 }}
              value={size}
              onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}
            >
              {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} / trang</option>)}
            </select>
            <span className="adm-chip" style={{ margin: 0 }}>Hiển thị: {filteredCategories.length} / {categories.length}</span>
          </div>
        </div>
        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Mã</th>
                <th>Tên danh mục</th>
                <th>Số sản phẩm</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr><td colSpan={6} className="muted">{t('common.loading')}</td></tr>
              ) : listQuery.isError ? (
                <tr><td colSpan={6} className="muted">{listQuery.error instanceof Error ? listQuery.error.message : t('messages.loadCategoriesFailed')}</td></tr>
              ) : filteredCategories.length === 0 ? (
                <tr><td colSpan={6} className="muted">{t('common.noData')}</td></tr>
              ) : (
                pagedCategories
                  .slice()
                  .sort((a, b) => a.id - b.id)
                  .map((c) => {
                    const productCount = productCountByCategoryId[c.id] ?? 0;
                    const canDeactivate = Boolean(c.isActive) && productCount === 0;
                    return (
                      <tr key={c.id}>
                        <td className="mono">{c.id}</td>
                        <td className="mono">{c.categoryCode}</td>
                        <td>{c.name}</td>
                        <td className="mono" style={{ fontWeight: 600 }}>{productCount}</td>
                        <td>
                          <span className={`adm-badge ${c.isActive ? 'adm-badge--success' : 'adm-badge--muted'}`}>
                            {c.isActive ? 'Hoạt động' : 'Vô hiệu'}
                          </span>
                        </td>
                        <td className="cell-actions category-actions">
                          <button
                            className="adm-button adm-button--ghost"
                            type="button"
                            onClick={() => setViewing(c)}
                          >
                            Xem
                          </button>
                          <button
                            className="adm-button adm-button--ghost"
                            type="button"
                            onClick={() => {
                              setEditing(c);
                              setCategoryCode(c.categoryCode ?? '');
                              setName(c.name ?? '');
                              setDescription(c.description ?? '');
                              setParentCategoryId(c.parentCategory?.id ? String(c.parentCategory.id) : '');
                              setSortOrder(String(c.sortOrder ?? 0));
                              setIsActive(Boolean(c.isActive));
                              setShowForm(true);
                            }}
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            className="adm-button adm-button--ghost"
                            type="button"
                            disabled={
                              activateMutation.isPending
                              || deactivateMutation.isPending
                              || (Boolean(c.isActive) && !canDeactivate)
                            }
                            onClick={() => {
                              if (canDeactivate) {
                                setDeactivateTarget(c);
                              } else {
                                activateMutation.mutate(c);
                              }
                            }}
                            style={{ color: c.isActive ? 'var(--danger)' : 'var(--ok)' }}
                            title={c.isActive && !canDeactivate ? 'Danh mục đang có sản phẩm nên không thể vô hiệu' : undefined}
                          >
                            {c.isActive ? (canDeactivate ? 'Vô hiệu' : 'Có sản phẩm') : 'Kích hoạt'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
        <div className="pager" style={{ marginTop: 12 }}>
          <div className="pager__info">
            Tổng: {filteredCategories.length} / Trang {filteredCategories.length > 0 ? currentPage + 1 : 0}/{filteredCategories.length > 0 ? totalPages : 0}
          </div>
          <div className="pager__actions">
            <button className="adm-button adm-button--ghost" type="button" onClick={() => setPage(0)} disabled={currentPage <= 0}>Đầu</button>
            <button className="adm-button adm-button--ghost" type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={currentPage <= 0}>Trước</button>
            <button className="adm-button adm-button--ghost" type="button" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={filteredCategories.length === 0 || currentPage >= totalPages - 1}>Sau</button>
          </div>
        </div>
      </div>
    </div>
  );
}

