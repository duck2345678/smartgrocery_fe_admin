import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, type Category, type Product } from '../api/adminApi';

const firstVariant = (p: Product | null | undefined) => (p?.variants && p.variants.length > 0 ? p.variants[0] : null);

export function ProductsPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const listQuery = useQuery({
    queryKey: ['products', page, size],
    queryFn: () => adminApi.products.list(page, size),
    staleTime: 5000,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => adminApi.categories.list(),
    staleTime: 30000,
  });

  const categories = categoriesQuery.data ?? [];

  const [editing, setEditing] = useState<Product | null>(null);
  const [productCode, setProductCode] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [originCountry, setOriginCountry] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [isFeatured, setIsFeatured] = useState(false);

  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [variantName, setVariantName] = useState('');
  const [unit, setUnit] = useState('');
  const [netPrice, setNetPrice] = useState('');
  const [stock, setStock] = useState('');
  const [image, setImage] = useState<File | null>(null);

  const resetForm = () => {
    setEditing(null);
    setProductCode('');
    setName('');
    setCategoryId('');
    setShortDescription('');
    setDescription('');
    setOriginCountry('');
    setStatus('ACTIVE');
    setIsFeatured(false);
    setSku('');
    setBarcode('');
    setVariantName('');
    setUnit('');
    setNetPrice('');
    setStock('');
    setImage(null);
  };

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const cid = Number(categoryId);
      if (!productCode.trim()) throw new Error(`${t('fields.productCode')}: ${t('common.required')}.`);
      if (!name.trim()) throw new Error(`${t('fields.productName')}: ${t('common.required')}.`);
      if (!Number.isFinite(cid) || cid <= 0) throw new Error(`${t('fields.categoryId')}: ${t('common.required')}.`);
      if (!sku.trim()) throw new Error(`${t('fields.sku')}: ${t('common.required')}.`);
      const price = Number(netPrice);
      if (!Number.isFinite(price) || price < 0) throw new Error(`${t('fields.netPrice')}: ${t('common.required')}.`);
      const st = Number(stock);
      if (!Number.isFinite(st) || st < 0) throw new Error(`${t('fields.stock')}: ${t('common.required')}.`);

      return adminApi.products.createOrUpdateMultipart(editing ? 'update' : 'create', {
        productId: editing?.id,
        productCode: productCode.trim(),
        name: name.trim(),
        categoryId: cid,
        shortDescription: shortDescription.trim() || undefined,
        description: description.trim() || undefined,
        originCountry: originCountry.trim() || undefined,
        status: status.trim() || undefined,
        isFeatured,
        sku: sku.trim(),
        barcode: barcode.trim() || undefined,
        variantName: variantName.trim() || undefined,
        unit: unit.trim() || undefined,
        netPrice: price,
        stock: st,
        image,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      resetForm();
    },
  });

  const items = useMemo(() => listQuery.data?.content ?? [], [listQuery.data?.content]);
  const featuredCount = useMemo(() => items.filter((p) => Boolean(p.isFeatured)).length, [items]);
  const outOfStockCount = useMemo(() => items.filter((p) => (firstVariant(p)?.stock ?? 0) <= 0).length, [items]);

  const canSubmit = useMemo(() => {
    if (!productCode.trim()) return false;
    if (!name.trim()) return false;
    const cid = Number(categoryId);
    if (!Number.isFinite(cid) || cid <= 0) return false;
    if (!sku.trim()) return false;
    const price = Number(netPrice);
    if (!Number.isFinite(price) || price < 0) return false;
    const st = Number(stock);
    if (!Number.isFinite(st) || st < 0) return false;
    return !upsertMutation.isPending;
  }, [categoryId, name, netPrice, productCode, sku, stock, upsertMutation.isPending]);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">{t('pages.productsTitle')}</div>
          <div className="page__subtitle">{t('pages.productsSubtitle')}</div>
        </div>
      </div>

      <div className="grid grid--3">
        <div className="card">
          <div className="card__label">{t('table.total')}</div>
          <div className="card__value">{listQuery.data?.totalElements ?? 0}</div>
          <div className="card__hint">{t('table.page')} {listQuery.data ? listQuery.data.number + 1 : 0}</div>
        </div>
        <div className="card">
          <div className="card__label">{t('fields.isFeatured')}</div>
          <div className="card__value">{featuredCount}</div>
          <div className="card__hint">{t('products.formTitleCreate')}</div>
        </div>
        <div className="card">
          <div className="card__label">{t('table.stock')}</div>
          <div className="card__value">{outOfStockCount}</div>
          <div className="card__hint">{t('inventory.lowStock')}</div>
        </div>
      </div>

      <div className="card">
        <div className="card__label">{editing ? `${t('products.formTitleEdit')} #${editing.id}` : t('products.formTitleCreate')}</div>
        {upsertMutation.isError && (
          <div className="inline-alert">{upsertMutation.error instanceof Error ? upsertMutation.error.message : t('messages.saveFailed')}</div>
        )}

        <div className="form-grid">
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.productCode')}</div>
            <input className="adm-input" value={productCode} onChange={(e) => setProductCode(e.target.value)} placeholder="P_BANANA" />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.productName')}</div>
            <input className="adm-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Chuối" />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.categoryId')}</div>
            <select className="adm-input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">{t('products.selectCategory')}</option>
              {categories.map((c: Category) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name} (#{c.id})
                </option>
              ))}
            </select>
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.status')}</div>
            <input className="adm-input" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="ACTIVE" />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.originCountry')}</div>
            <input className="adm-input" value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} placeholder="VN" />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.isFeatured')}</div>
            <select className="adm-input" value={isFeatured ? 'true' : 'false'} onChange={(e) => setIsFeatured(e.target.value === 'true')}>
              <option value="false">false</option>
              <option value="true">true</option>
            </select>
          </label>
          <label className="adm-field" style={{ gridColumn: '1 / -1' }}>
            <div className="adm-field__label">{t('fields.shortDescription')}</div>
            <input className="adm-input" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="(optional)" />
          </label>
          <label className="adm-field" style={{ gridColumn: '1 / -1' }}>
            <div className="adm-field__label">{t('fields.description')}</div>
            <input className="adm-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="(optional)" />
          </label>
        </div>

        <div className="divider" />

        <div className="card__label">{t('products.variantSection')}</div>
        <div className="form-grid">
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.sku')}</div>
            <input className="adm-input" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU_001" />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.barcode')}</div>
            <input className="adm-input" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="(optional)" />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.variantName')}</div>
            <input className="adm-input" value={variantName} onChange={(e) => setVariantName(e.target.value)} placeholder="500g" />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.unit')}</div>
            <input className="adm-input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg" />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.netPrice')}</div>
            <input className="adm-input" value={netPrice} onChange={(e) => setNetPrice(e.target.value)} placeholder="12000" />
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.stock')}</div>
            <input className="adm-input" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="100" />
          </label>
          <label className="adm-field" style={{ gridColumn: '1 / -1' }}>
            <div className="adm-field__label">{t('products.imageOptional')}</div>
            <input
              className="adm-input"
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files && e.target.files.length > 0 ? e.target.files[0] : null)}
            />
          </label>
        </div>

        <div className="row-actions">
          <button className="adm-button adm-button--ghost" type="button" onClick={resetForm} disabled={upsertMutation.isPending}>
            {t('common.resetForm')}
          </button>
          <button className="adm-button adm-button--primary" type="button" onClick={() => upsertMutation.mutate()} disabled={!canSubmit}>
            {upsertMutation.isPending ? t('common.saving') : editing ? t('products.saveActionEdit') : t('products.saveActionCreate')}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="row-actions row-actions--between">
          <div className="card__label">{t('pages.productsTitle')}</div>
          <div className="adm-chip">
            {t('table.total')}: {listQuery.data?.totalElements ?? 0}
          </div>
        </div>
        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>{t('table.id')}</th>
                <th>{t('table.code')}</th>
                <th>{t('table.name')}</th>
                <th>{t('table.category')}</th>
                <th>{t('table.sku')}</th>
                <th>{t('table.price')}</th>
                <th>{t('table.stock')}</th>
                <th>{t('table.status')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr>
                  <td colSpan={9} className="muted">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : listQuery.isError ? (
                <tr>
                  <td colSpan={9} className="muted">
                    {listQuery.error instanceof Error ? listQuery.error.message : t('messages.loadProductsFailed')}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="muted">
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                items.map((p) => {
                  const v = firstVariant(p);
                  return (
                    <tr key={p.id}>
                      <td className="mono">{p.id}</td>
                      <td className="mono">{p.productCode}</td>
                      <td>{p.name}</td>
                      <td className="mono">{p.category?.name ?? '-'}</td>
                      <td className="mono">{v?.sku ?? '-'}</td>
                      <td className="mono">{v?.netPrice != null ? String(v.netPrice) : '-'}</td>
                      <td className="mono">{v?.stock != null ? String(v.stock) : '-'}</td>
                      <td className="mono">{p.status ?? '-'}</td>
                      <td className="cell-actions">
                        <button
                          className="adm-button adm-button--ghost"
                          type="button"
                          onClick={() => {
                            setEditing(p);
                            setProductCode(p.productCode ?? '');
                            setName(p.name ?? '');
                            setCategoryId(p.category?.id != null ? String(p.category.id) : '');
                            setShortDescription(p.shortDescription ?? '');
                            setDescription(p.description ?? '');
                            setOriginCountry(p.originCountry ?? '');
                            setStatus(p.status ?? 'ACTIVE');
                            setIsFeatured(Boolean(p.isFeatured));
                            setSku(v?.sku ?? '');
                            setBarcode(v?.barcode ?? '');
                            setVariantName(v?.variantName ?? '');
                            setUnit(v?.unit ?? '');
                            setNetPrice(v?.netPrice != null ? String(v.netPrice) : '');
                            setStock(v?.stock != null ? String(v.stock) : '');
                            setImage(null);
                          }}
                        >
                          {t('common.edit')}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="pager">
          <div className="muted">
            {t('table.total')}: {listQuery.data?.totalElements ?? 0} • {t('table.page')} {listQuery.data ? listQuery.data.number + 1 : 0}/{listQuery.data?.totalPages ?? 0}
          </div>
          <div className="pager__actions">
            <label className="adm-field" style={{ minWidth: 120 }}>
              <div className="adm-field__label">{t('fields.size')}</div>
              <select
                className="adm-input"
                value={String(size)}
                onChange={(e) => {
                  setPage(0);
                  setSize(Number(e.target.value));
                }}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </label>
            <button className="adm-button adm-button--ghost" type="button" onClick={() => setPage(0)} disabled={!listQuery.data || page <= 0}>
              {t('table.first')}
            </button>
            <button className="adm-button adm-button--ghost" type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={!listQuery.data || page <= 0}>
              {t('table.prev')}
            </button>
            <button
              className="adm-button adm-button--ghost"
              type="button"
              onClick={() => setPage((p) => (listQuery.data ? Math.min(listQuery.data.totalPages - 1, p + 1) : p))}
              disabled={!listQuery.data || page >= (listQuery.data.totalPages ?? 1) - 1}
            >
              {t('table.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
