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

  const [showForm,         setShowForm]         = useState(false);
  const [editing,          setEditing]          = useState<Category | null>(null);
  const [categoryCode,     setCategoryCode]     = useState('');
  const [name,             setName]             = useState('');
  const [description,      setDescription]      = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [sortOrder,        setSortOrder]        = useState('0');
  const [isActive,         setIsActive]         = useState(true);

  const [deactivateTarget, setDeactivateTarget] = useState<Category | null>(null);

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

  const categories   = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const activeCount  = useMemo(() => categories.filter((c) => Boolean(c.isActive)).length,      [categories]);
  const inactiveCount = useMemo(() => categories.filter((c) => !c.isActive).length,             [categories]);
  const rootCount    = useMemo(() => categories.filter((c) => !c.parentCategory?.id).length,    [categories]);

  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  const canSubmit = useMemo(
    () => !!categoryCode.trim() && !!name.trim() && !upsertMutation.isPending,
    [categoryCode, name, upsertMutation.isPending]
  );

  return (
    <div className="page">

      {/* ── Deactivate confirm dialog ── */}
      {deactivateTarget && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setDeactivateTarget(null)}
        >
          <div className="card" style={{ width: 380, maxWidth: '90vw', margin: 0 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Vô hiệu danh mục</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              <strong>{deactivateTarget.name}</strong> (#{deactivateTarget.id}) sẽ bị ẩn khỏi hệ thống.
            </div>
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
                {deactivateMutation.isPending ? 'Đang xử lý…' : 'Xác nhận vô hiệu'}
              </button>
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
          {showForm && !editing ? '✕ Đóng' : '+ Thêm danh mục'}
        </button>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid--3">
        <div className="card">
          <div className="card__label">Tổng danh mục</div>
          <div className="card__value">{categories.length}</div>
          <div className="card__hint">Tất cả (kể cả vô hiệu)</div>
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

      {/* ── Create / Edit form (collapsible) ── */}
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
              <div className="adm-field__label">Danh mục cha</div>
              <select className="adm-input" value={parentCategoryId} onChange={(e) => setParentCategoryId(e.target.value)}>
                <option value="">— Không có danh mục cha —</option>
                {categories
                  .filter((c) => !editing || c.id !== editing.id)
                  .map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name} (#{c.id})</option>
                  ))}
              </select>
            </label>
            <label className="adm-field">
              <div className="adm-field__label">{t('fields.sortOrder')}</div>
              <input className="adm-input" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="0" />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Trạng thái</div>
              <select className="adm-input" value={isActive ? 'true' : 'false'} onChange={(e) => setIsActive(e.target.value === 'true')}>
                <option value="true">Hoạt động</option>
                <option value="false">Vô hiệu</option>
              </select>
            </label>
            <label className="adm-field" style={{ gridColumn: '1 / -1' }}>
              <div className="adm-field__label">{t('fields.description')}</div>
              <input className="adm-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="(tùy chọn)" />
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

      {/* ── Table ── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="card__label">{t('pages.categoriesTitle')}</div>
          <span className="adm-chip">Tổng: {categories.length}</span>
        </div>
        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Mã</th>
                <th>Tên danh mục</th>
                <th>Danh mục cha</th>
                <th>Thứ tự</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr><td colSpan={7} className="muted">{t('common.loading')}</td></tr>
              ) : listQuery.isError ? (
                <tr><td colSpan={7} className="muted">{listQuery.error instanceof Error ? listQuery.error.message : t('messages.loadCategoriesFailed')}</td></tr>
              ) : categories.length === 0 ? (
                <tr><td colSpan={7} className="muted">{t('common.noData')}</td></tr>
              ) : (
                categories
                  .slice()
                  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                  .map((c) => {
                    const parentName = c.parentCategory?.id ? (catById[c.parentCategory.id]?.name ?? `#${c.parentCategory.id}`) : null;
                    return (
                      <tr key={c.id}>
                        <td className="mono">{c.id}</td>
                        <td className="mono">{c.categoryCode}</td>
                        <td>{c.name}</td>
                        <td>{parentName ?? <span className="muted">—</span>}</td>
                        <td className="mono">{c.sortOrder ?? 0}</td>
                        <td>
                          <span className={`adm-badge ${c.isActive ? 'adm-badge--success' : 'adm-badge--muted'}`}>
                            {c.isActive ? 'Hoạt động' : 'Vô hiệu'}
                          </span>
                        </td>
                        <td className="cell-actions">
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
                            disabled={!c.isActive}
                            onClick={() => setDeactivateTarget(c)}
                            style={{ color: c.isActive ? 'var(--danger)' : undefined }}
                          >
                            Vô hiệu
                          </button>
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
