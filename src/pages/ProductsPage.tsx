import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Eye, EyeOff, Plus, RotateCcw, Save, Search, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { adminApi, type Category, type Product, type ProductVariantPayload } from '../api/adminApi';
import { Pagination } from '../components/Pagination';

type ProductStatus = 'ACTIVE' | 'HIDDEN' | 'DELETED';

type VariantForm = {
  id?: number;
  sku: string;
  barcode: string;
  variantName: string;
  color: string;
  size: string;
  unit: string;
  netPrice: string;
  stock: string;
  status: ProductStatus;
};

const emptyVariant = (): VariantForm => ({
  sku: '',
  barcode: '',
  variantName: '',
  color: '',
  size: '',
  unit: 'unit',
  netPrice: '',
  stock: '0',
  status: 'ACTIVE',
});

const firstVariant = (p: Product | null | undefined) =>
  p?.variants && p.variants.length > 0 ? p.variants[0] : null;

const fmtPrice = (n: number | null | undefined) =>
  n != null ? n.toLocaleString('vi-VN') + '₫' : '—';

const clean = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

export function ProductsPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(0);
      setSearch(searchInput.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const queryParams = useMemo(
    () => ({
      page,
      size,
      search: search || undefined,
      categoryId: categoryFilter ? Number(categoryFilter) : undefined,
      status: statusFilter || undefined,
    }),
    [categoryFilter, page, search, size, statusFilter]
  );

  const listQuery = useQuery({
    queryKey: ['admin-products', queryParams],
    queryFn: () => adminApi.products.adminList(queryParams),
    staleTime: 5000,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn:  () => adminApi.categories.list(),
    staleTime: 30000,
  });

  const summaryQuery = useQuery({
    queryKey: ['admin-products-summary'],
    queryFn: () => adminApi.products.getSummary(),
    staleTime: 10000,
  });

  const categories = categoriesQuery.data ?? [];
  const summary = summaryQuery.data;

  const [editing, setEditing] = useState<Product | null>(null);
  const [productCode, setProductCode] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [originCountry, setOriginCountry] = useState('');
  const [status, setStatus] = useState<ProductStatus>('ACTIVE');
  const [isFeatured, setIsFeatured] = useState(false);
  const [variants, setVariants] = useState<VariantForm[]>([emptyVariant()]);
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

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
    setVariants([emptyVariant()]);
    setImage(null);
    setImageError('');
    setIsFormOpen(false);
  };

  const hydrateForm = (product: Product) => {
    setEditing(product);
    setProductCode(product.productCode ?? '');
    setName(product.name ?? '');
    setCategoryId(product.category?.id != null ? String(product.category.id) : '');
    setShortDescription(product.shortDescription ?? '');
    setDescription(product.description ?? '');
    setOriginCountry(product.originCountry ?? '');
    setStatus((product.status as ProductStatus) ?? 'ACTIVE');
    setIsFeatured(Boolean(product.isFeatured));
    setVariants(
      product.variants && product.variants.length > 0
        ? product.variants.map((v) => ({
            id: v.id,
            sku: v.sku ?? '',
            barcode: v.barcode ?? '',
            variantName: v.variantName ?? '',
            color: v.color ?? '',
            size: v.size ?? '',
            unit: v.unit ?? 'unit',
            netPrice: v.netPrice != null ? String(v.netPrice) : '',
            stock: v.stock != null ? String(v.stock) : '0',
            status: ((v.status as ProductStatus) || 'ACTIVE'),
          }))
        : [emptyVariant()]
    );
    setImage(null);
    setImageError('');
    setIsFormOpen(true);
  };

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!productCode.trim()) errors.push(`${t('fields.productCode')}: ${t('common.required')}`);
    if (!name.trim()) errors.push(`${t('fields.productName')}: ${t('common.required')}`);
    const cid = Number(categoryId);
    if (!Number.isFinite(cid) || cid <= 0) errors.push(`${t('fields.categoryId')}: ${t('common.required')}`);
    if (variants.length === 0) errors.push(t('products.variantRequired'));
    const skus = new Set<string>();
    variants.forEach((v, index) => {
      const row = index + 1;
      if (!v.sku.trim()) errors.push(`${t('fields.sku')} #${row}: ${t('common.required')}`);
      const skuKey = v.sku.trim().toLowerCase();
      if (skuKey && skus.has(skuKey)) errors.push(`${t('products.duplicateSku')}: ${v.sku}`);
      skus.add(skuKey);
      const price = Number(v.netPrice);
      if (!Number.isFinite(price) || price < 0) errors.push(`${t('fields.netPrice')} #${row}: ${t('products.invalidNumber')}`);
      const stock = Number(v.stock);
      if (!Number.isFinite(stock) || stock < 0) errors.push(`${t('fields.stock')} #${row}: ${t('products.invalidNumber')}`);
    });
    if (imageError) errors.push(imageError);
    return errors;
  }, [categoryId, imageError, name, productCode, t, variants]);

  const variantPayload = (): ProductVariantPayload[] =>
    variants.map((v) => ({
      id: v.id,
      sku: v.sku.trim(),
      barcode: clean(v.barcode),
      variantName: clean(v.variantName),
      color: clean(v.color),
      size: clean(v.size),
      unit: clean(v.unit) ?? 'unit',
      netPrice: Number(v.netPrice),
      stock: Number(v.stock),
      status: v.status,
    }));

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (validationErrors.length > 0) throw new Error(validationErrors[0]);
      const payloadVariants = variantPayload();
      const primary = payloadVariants[0];
      return adminApi.products.createOrUpdateMultipart(editing ? 'update' : 'create', {
        productId: editing?.id,
        productCode: productCode.trim(),
        name: name.trim(),
        categoryId: Number(categoryId),
        shortDescription: clean(shortDescription),
        description: clean(description),
        originCountry: clean(originCountry),
        status,
        isFeatured,
        sku: primary.sku,
        barcode: primary.barcode,
        variantName: primary.variantName,
        color: primary.color,
        size: primary.size,
        unit: primary.unit,
        netPrice: primary.netPrice,
        stock: primary.stock,
        variants: payloadVariants,
        image,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-products-summary'] });
      resetForm();
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ product, next }: { product: Product; next: 'ACTIVE' | 'HIDDEN' }) =>
      adminApi.products.setStatus(product.id, next, `Set product ${next.toLowerCase()}`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products-summary'] });
      alert(`Đã ${data.status === 'ACTIVE' ? 'HIỂN THỊ' : 'ẨN'} sản phẩm "${data.name}" thành công!`);
    },
    onError: (err: any) => {
      alert(err instanceof Error ? err.message : 'Lỗi khi thay đổi trạng thái sản phẩm');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (product: Product) => adminApi.products.softDelete(product.id, 'Soft delete product from admin'),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products-summary'] });
      alert(`Đã XÓA TẠM sản phẩm "${data.name}" thành công!`);
    },
    onError: (err: any) => {
      alert(err instanceof Error ? err.message : 'Lỗi khi xóa sản phẩm');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (product: Product) => adminApi.products.restore(product.id, 'Restore product from admin'),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products-summary'] });
      alert(`Đã KHÔI PHỤC sản phẩm "${data.name}" thành công!`);
    },
    onError: (err: any) => {
      alert(err instanceof Error ? err.message : 'Lỗi khi khôi phục sản phẩm');
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: () => adminApi.products.cleanup(),
    onSuccess: async (msg) => {
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-products-summary'] });
      alert(msg);
    },
  });

  const exportMutation = useMutation({
    mutationFn: () =>
      adminApi.products.exportExcel({
        search: search || undefined,
        categoryId: categoryFilter ? Number(categoryFilter) : undefined,
        status: statusFilter || undefined,
      }),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `products-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  });

  const items = listQuery.data?.content ?? [];
  const activeCount = summary?.activeCount ?? 0;
  const hiddenCount = summary?.hiddenCount ?? 0;
  const deletedCount = summary?.deletedCount ?? 0;
  const totalElements = summary?.totalCount ?? (listQuery.data?.totalElements ?? 0);
  const canSubmit = validationErrors.length === 0 && !upsertMutation.isPending;

  const updateVariant = (index: number, patch: Partial<VariantForm>) => {
    setVariants((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const onImageSelected = (file: File | null) => {
    setImageError('');
    if (!file) {
      setImage(null);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setImageError(t('products.imageTypeError'));
      setImage(null);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setImageError(t('products.imageSizeError'));
      setImage(null);
      return;
    }
    setImage(file);
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">{t('pages.productsTitle')}</div>
          <div className="page__subtitle">{t('pages.productsSubtitle')}</div>
        </div>
        <div className="row-actions" style={{ marginTop: 0 }}>
          <button className="adm-button adm-button--ghost" type="button" onClick={() => cleanupMutation.mutate()} disabled={cleanupMutation.isPending}>
            <RotateCcw size={16} />
            <span>{cleanupMutation.isPending ? t('common.loading') : 'Dọn dẹp kho hàng'}</span>
          </button>
          <button className="adm-button adm-button--ghost" type="button" onClick={() => setIsFormOpen(true)}>
            <Plus size={16} />
            <span>{t('products.formTitleCreate')}</span>
          </button>
          <button className="adm-button adm-button--primary" type="button" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
            <Download size={16} />
            <span>{exportMutation.isPending ? t('products.exporting') : t('products.exportExcel')}</span>
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid--3">
        <div className="card">
          <div className="card__label">{t('table.total')}</div>
          <div className="card__value">{totalElements}</div>
          <div className="card__hint">{t('table.page')} {listQuery.data ? listQuery.data.number + 1 : 0}</div>
        </div>
        <div className="card">
          <div className="card__label">{t('products.statusActive')}</div>
          <div className="card__value">{activeCount}</div>
          <div className="card__hint">{t('products.statusHidden')}: {hiddenCount}</div>
        </div>
        <div className="card">
          <div className="card__label">{t('products.statusDeleted')}</div>
          <div className="card__value">{deletedCount}</div>
          <div className="card__hint">{t('products.restoreHint')}</div>
        </div>
      </div>

      <div className="card">
        <div className="filters__row filters__row--products">
          <label className="adm-field">
            <div className="adm-field__label">{t('common.search')}</div>
            <div className="input-with-icon">
              <Search size={16} />
              <input className="adm-input" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder={t('products.searchPlaceholder')} />
            </div>
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.categoryId')}</div>
            <select className="adm-input" value={categoryFilter} onChange={(e) => { setPage(0); setCategoryFilter(e.target.value); }}>
              <option value="">{t('products.allCategories')}</option>
              {categories.map((c: Category) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="adm-field">
            <div className="adm-field__label">{t('fields.status')}</div>
            <select className="adm-input" value={statusFilter} onChange={(e) => { setPage(0); setStatusFilter(e.target.value); }}>
              <option value="">{t('products.allStatuses')}</option>
              <option value="ACTIVE">{t('products.statusActive')}</option>
              <option value="HIDDEN">{t('products.statusHidden')}</option>
              <option value="DELETED">{t('products.statusDeleted')}</option>
            </select>
          </label>
          <div className="filters__actions">
            <button
              className="adm-button adm-button--ghost"
              type="button"
              onClick={() => {
                setSearchInput('');
                setSearch('');
                setCategoryFilter('');
                setStatusFilter('');
                setPage(0);
              }}
            >
              <X size={16} />
              <span>{t('common.clear')}</span>
            </button>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ margin: 0 }}>
            <button className="adm-button adm-button--ghost modal-close" onClick={resetForm}>
              <X size={20} />
            </button>

            <div className="card__label" style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>
              {editing ? `${t('products.formTitleEdit')} #${editing.id}` : t('products.formTitleCreate')}
            </div>

            {(upsertMutation.isError || exportMutation.isError || imageError) && (
              <div className="inline-alert">
                {upsertMutation.error instanceof Error
                  ? upsertMutation.error.message
                  : exportMutation.error instanceof Error
                    ? exportMutation.error.message
                    : imageError || t('messages.saveFailed')}
              </div>
            )}
            {validationErrors.length > 0 && (
              <div className="inline-alert inline-alert--subtle">{validationErrors[0]}</div>
            )}

            <div className="form-grid">
              <label className="adm-field">
                <div className="adm-field__label">{t('fields.productCode')}</div>
                <input className="adm-input" value={productCode} onChange={(e) => setProductCode(e.target.value)} placeholder="VD: P_CHUOI, P_CAM" />
              </label>
              <label className="adm-field">
                <div className="adm-field__label">{t('fields.productName')}</div>
                <input className="adm-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Chuối, Táo Fuji, Cam sành…" />
              </label>
              <label className="adm-field">
                <div className="adm-field__label">{t('fields.categoryId')}</div>
                <select className="adm-input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">{t('products.selectCategory')}</option>
                  {categories.map((c: Category) => (
                    <option key={c.id} value={String(c.id)}>{c.name} (#{c.id})</option>
                  ))}
                </select>
              </label>
              <label className="adm-field">
                <div className="adm-field__label">{t('fields.status')}</div>
                <select className="adm-input" value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
                  <option value="ACTIVE">{t('products.statusActive')}</option>
                  <option value="HIDDEN">{t('products.statusHidden')}</option>
                  <option value="DELETED">{t('products.statusDeleted')}</option>
                </select>
              </label>
              <label className="adm-field">
                <div className="adm-field__label">{t('fields.originCountry')}</div>
                <input className="adm-input" value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} placeholder="VD: VN, USA, JP, TH" />
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
                <input className="adm-input" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder={t('common.optional')} />
              </label>
              <label className="adm-field" style={{ gridColumn: '1 / -1' }}>
                <div className="adm-field__label">{t('fields.description')}</div>
                <textarea 
                  className="adm-input" 
                  style={{ minHeight: '120px', resize: 'vertical' }}
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder={t('common.optional')} 
                />
              </label>
              <div className="adm-field" style={{ gridColumn: '1 / -1' }}>
                <div className="adm-field__label">{t('products.imageOptional')}</div>
                <div className="image-uploader">
                  <div className="image-preview">
                    {image ? (
                      <img src={URL.createObjectURL(image)} alt="Preview" className="image-preview__img" />
                    ) : editing?.image ? (
                      <img src={editing.image} alt="Current" className="image-preview__img" />
                    ) : (
                      <div className="image-preview__placeholder">
                        <Plus size={24} />
                      </div>
                    )}
                  </div>
                  <div className="image-uploader__controls">
                    <input 
                      id="image-input"
                      type="file" 
                      className="hidden-input"
                      accept="image/jpeg,image/png,image/webp" 
                      onChange={(e) => onImageSelected(e.target.files?.[0] ?? null)} 
                    />
                    <label htmlFor="image-input" className="adm-button adm-button--ghost">
                      {image || editing?.image ? t('common.changeImage') : t('common.selectImage')}
                    </label>
                    {(image || editing?.image) && (
                      <div className="muted" style={{ fontSize: '11px', marginTop: '8px' }}>
                        {image ? `${t('common.newFile')}: ${image.name}` : t('common.currentImageOnServer')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="divider" />
            <div className="row-actions row-actions--between">
              <div className="card__label">{t('products.variantSection')}</div>
              <button className="adm-button adm-button--ghost" type="button" onClick={() => setVariants((rows) => [...rows, emptyVariant()])}>
                <Plus size={16} />
                <span>{t('products.addVariant')}</span>
              </button>
            </div>

            <div className="variant-editor">
              {variants.map((variant, index) => (
                <div className="variant-row" key={`${variant.id ?? 'new'}-${index}`}>
                  <input className="adm-input" value={variant.sku} onChange={(e) => updateVariant(index, { sku: e.target.value })} placeholder={t('fields.sku')} />
                  <input className="adm-input" value={variant.color} onChange={(e) => updateVariant(index, { color: e.target.value })} placeholder={t('fields.color')} />
                  <input className="adm-input" value={variant.size} onChange={(e) => updateVariant(index, { size: e.target.value })} placeholder={t('fields.variantSize')} />
                  <input className="adm-input" value={variant.variantName} onChange={(e) => updateVariant(index, { variantName: e.target.value })} placeholder={t('fields.variantName')} />
                  <input className="adm-input" value={variant.unit} onChange={(e) => updateVariant(index, { unit: e.target.value })} placeholder={t('fields.unit')} />
                  <input className="adm-input" value={variant.netPrice} onChange={(e) => updateVariant(index, { netPrice: e.target.value })} placeholder={t('fields.netPrice')} />
                  <input className="adm-input" value={variant.stock} onChange={(e) => updateVariant(index, { stock: e.target.value })} placeholder={t('fields.stock')} />
                  <select className="adm-input" value={variant.status} onChange={(e) => updateVariant(index, { status: e.target.value as ProductStatus })}>
                    <option value="ACTIVE">{t('products.statusActive')}</option>
                    <option value="HIDDEN">{t('products.statusHidden')}</option>
                    <option value="DELETED">{t('products.statusDeleted')}</option>
                  </select>
                  <button className="adm-button adm-button--ghost" type="button" onClick={() => setVariants((rows) => rows.filter((_, i) => i !== index))} disabled={variants.length <= 1} title={t('products.removeVariant')}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="row-actions" style={{ marginTop: '20px' }}>
              <button className="adm-button adm-button--ghost" type="button" onClick={resetForm} disabled={upsertMutation.isPending}>
                <X size={16} />
                <span>{t('common.cancel')}</span>
              </button>
              <button className="adm-button adm-button--primary" type="button" onClick={() => upsertMutation.mutate()} disabled={!canSubmit}>
                <Save size={16} />
                <span>{upsertMutation.isPending ? t('common.saving') : editing ? t('products.saveActionEdit') : t('products.saveActionCreate')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="row-actions row-actions--between">
          <div className="card__label">{t('pages.productsTitle')}</div>
          <div className="adm-chip">{t('table.total')}: {listQuery.data?.totalElements ?? 0}</div>
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
                <th>{t('fields.color')}</th>
                <th>{t('fields.variantSize')}</th>
                <th>{t('table.price')}</th>
                <th>{t('table.stock')}</th>
                <th>{t('table.status')}</th>
                <th>{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={11}><div className="skeleton-line" /></td>
                  </tr>
                ))
              ) : listQuery.isError ? (
                <tr>
                  <td colSpan={11} className="muted">{listQuery.error instanceof Error ? listQuery.error.message : t('messages.loadProductsFailed')}</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="muted">{t('products.emptyState')}</td>
                </tr>
              ) : (
                items.map((p) => {
                  const v          = firstVariant(p);
                  return (
                    <tr key={p.id} className={p.status === 'DELETED' ? 'row-muted' : undefined}>
                      <td className="mono">{p.id}</td>
                      <td>
                        {p.image ? (
                          <img
                            src={p.image}
                            alt=""
                            style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          <div style={{
                            width: 36, height: 36, borderRadius: 8,
                            background: 'var(--grad-secondary)',
                            display: 'grid', placeItems: 'center',
                            fontSize: 13, fontWeight: 700, color: '#fff',
                          }}>
                            {(p.name ?? '?').slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td>{p.name}</td>
                      <td>{p.category?.name ?? '-'}</td>
                      <td className="mono">{v?.sku ?? '-'}</td>
                      <td>{v?.color ?? '-'}</td>
                      <td>{v?.size ?? '-'}</td>
                      <td className="mono">{v?.netPrice != null ? fmtPrice(v.netPrice) : '-'}</td>
                      <td className="mono">{v?.stock != null ? String(v.stock) : '-'}</td>
                      <td>
                        <span className={`status-pill status-pill--${(p.status ?? 'UNKNOWN').toLowerCase()}`}>
                          {p.status === 'ACTIVE' ? t('products.statusActive') : 
                           p.status === 'HIDDEN' ? t('products.statusHidden') : 
                           p.status === 'DELETED' ? t('products.statusDeleted') : (p.status ?? '-')}
                        </span>
                      </td>
                      <td className="cell-actions">
                        <button className="adm-button adm-button--ghost" type="button" onClick={() => hydrateForm(p)}>{t('common.edit')}</button>
                        {p.status === 'DELETED' ? (
                          <button className="adm-button adm-button--ghost" type="button" onClick={() => restoreMutation.mutate(p)} disabled={restoreMutation.isPending}>
                            <RotateCcw size={16} />
                          </button>
                        ) : (
                          <>
                            <button className="adm-button adm-button--ghost" type="button" onClick={() => statusMutation.mutate({ product: p, next: p.status === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE' })} disabled={statusMutation.isPending}>
                              {p.status === 'ACTIVE' ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            <button className="adm-button adm-button--ghost" type="button" onClick={() => deleteMutation.mutate(p)} disabled={deleteMutation.isPending}>
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {(() => {
        const tp = Math.ceil(totalElements / size) || 1;
        const pageNums: (number | '...')[] = [];
        for (let i = 0; i < tp; i++) {
          if (i === 0 || i === tp - 1 || Math.abs(i - page) <= 2) pageNums.push(i);
          else if (pageNums[pageNums.length - 1] !== '...') pageNums.push('...');
        }
        return (
          <div className="pager">
            <div className="muted" style={{ fontSize: 12 }}>
              Tổng: <strong>{totalElements.toLocaleString('vi-VN')}</strong> bản ghi &nbsp;·&nbsp;
              <select className="adm-input" style={{ width: 90, padding: '2px 6px', fontSize: 12 }} value={String(size)} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}>
                {[10, 20, 50].map(s => <option key={s} value={String(s)}>{s} / trang</option>)}
              </select>
            </div>
            <div className="pager__actions">
              <button className="adm-button adm-button--ghost" disabled={page <= 0} onClick={() => setPage(0)}>«</button>
              <button className="adm-button adm-button--ghost" disabled={page <= 0} onClick={() => setPage(p => p - 1)}>‹</button>
              {pageNums.map((p, i) => p === '...'
                ? <span key={`d${i}`} style={{ padding: '0 4px', color: 'var(--muted)' }}>…</span>
                : <button key={p} className={p === page ? 'adm-button adm-button--primary' : 'adm-button adm-button--ghost'} onClick={() => setPage(p as number)}>{(p as number) + 1}</button>
              )}
              <button className="adm-button adm-button--ghost" disabled={page >= tp - 1} onClick={() => setPage(p => p + 1)}>›</button>
              <button className="adm-button adm-button--ghost" disabled={page >= tp - 1} onClick={() => setPage(tp - 1)}>»</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
