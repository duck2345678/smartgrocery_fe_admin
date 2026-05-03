import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, type Category } from '../api/adminApi';

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const listQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => adminApi.categories.list(),
  });

  const [editing, setEditing] = useState<Category | null>(null);
  const [categoryCode, setCategoryCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);

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
        name: name.trim(),
        description: description.trim() || undefined,
        sortOrder: Number(sortOrder) || 0,
        isActive,
        parentCategoryId: Number.isFinite(pid) && pid > 0 ? pid : undefined,
      };
      if (!payload.categoryCode) throw new Error(`${t('fields.categoryCode')}: ${t('common.required')}.`);
      if (!payload.name) throw new Error(`${t('fields.categoryName')}: ${t('common.required')}.`);

      if (editing) {
        return adminApi.categories.update(editing.id, payload);
      }
      return adminApi.categories.create(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      resetForm();
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: number) => adminApi.categories.deactivate(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const categories = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const activeCount = useMemo(() => categories.filter((c) => Boolean(c.isActive)).length, [categories]);
  const rootCount = useMemo(() => categories.filter((c) => !c.parentCategory?.id).length, [categories]);

  const canSubmit = useMemo(() => {
    if (!categoryCode.trim()) return false;
    if (!name.trim()) return false;
    return !upsertMutation.isPending;
  }, [categoryCode, name, upsertMutation.isPending]);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">{t('pages.categoriesTitle')}</div>
          <div className="page__subtitle">{t('pages.categoriesSubtitle')}</div>
        </div>
      </div>

      <div className="grid grid--3">
        <div className="card">
          <div className="card__label">{t('table.total')}</div>
          <div className="card__value">{categories.length}</div>
          <div className="card__hint">{t('pages.categoriesTitle')}</div>
        </div>
        <div className="card">
          <div className="card__label">{t('table.active')}</div>
          <div className="card__value">{activeCount}</div>
          <div className="card__hint">{t('fields.isActive')}</div>
        </div>
        <div className="card">
          <div className="card__label">{t('table.parent')}</div>
          <div className="card__value">{rootCount}</div>
          <div className="card__hint">{t('fields.parentCategoryId')}</div>
        </div>
      </div>

      <div className="card">
        <div className="card__label">{editing ? `${t('categories.formTitleEdit')} #${editing.id}` : t('categories.formTitleCreate')}</div>
        {upsertMutation.isError && (
          <div className="inline-alert">{upsertMutation.error instanceof Error ? upsertMutation.error.message : t('messages.saveFailed')}</div>
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
            <div className="adm-field__label">{t('fields.parentCategoryId')}</div>
            <input className="adm-input" value={parentCategoryId} onChange={(e) => setParentCategoryId(e.target.value)} placeholder="(optional)" />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.sortOrder')}</div>
            <input className="adm-input" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="0" />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.isActive')}</div>
            <select className="adm-input" value={isActive ? 'true' : 'false'} onChange={(e) => setIsActive(e.target.value === 'true')}>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </label>
          <label className="adm-field" style={{ gridColumn: '1 / -1' }}>
            <div className="adm-field__label">{t('fields.description')}</div>
            <input className="adm-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="(optional)" />
          </label>
        </div>
        <div className="row-actions">
          <button className="adm-button adm-button--ghost" type="button" onClick={resetForm} disabled={upsertMutation.isPending}>
            {t('common.resetForm')}
          </button>
          <button className="adm-button adm-button--primary" type="button" onClick={() => upsertMutation.mutate()} disabled={!canSubmit}>
            {upsertMutation.isPending ? t('common.saving') : editing ? t('categories.saveActionEdit') : t('categories.saveActionCreate')}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="row-actions row-actions--between">
          <div className="card__label">{t('pages.categoriesTitle')}</div>
          <div className="adm-chip">
            {t('table.total')}: {categories.length}
          </div>
        </div>
        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>{t('table.id')}</th>
                <th>{t('table.code')}</th>
                <th>{t('table.name')}</th>
                <th>{t('table.parent')}</th>
                <th>{t('table.sort')}</th>
                <th>{t('table.active')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="muted">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : listQuery.isError ? (
                <tr>
                  <td colSpan={7} className="muted">
                    {listQuery.error instanceof Error ? listQuery.error.message : t('messages.loadCategoriesFailed')}
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                categories
                  .slice()
                  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                  .map((c) => (
                    <tr key={c.id}>
                      <td className="mono">{c.id}</td>
                      <td className="mono">{c.categoryCode}</td>
                      <td>{c.name}</td>
                      <td className="mono">{c.parentCategory?.id ?? '-'}</td>
                      <td className="mono">{c.sortOrder ?? 0}</td>
                      <td className="mono">{String(Boolean(c.isActive))}</td>
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
                          }}
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          className="adm-button adm-button--ghost"
                          type="button"
                          onClick={() => deactivateMutation.mutate(c.id)}
                          disabled={deactivateMutation.isPending || !c.isActive}
                        >
                          {t('categories.deactivateAction')}
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
