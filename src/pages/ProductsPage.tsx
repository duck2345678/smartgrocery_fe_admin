import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, type Category, type Product } from '../api/adminApi';
import { Pagination } from '../components/Pagination';

const firstVariant = (p: Product | null | undefined) =>
  p?.variants && p.variants.length > 0 ? p.variants[0] : null;

const fmtPrice = (n: number | null | undefined) =>
  n != null ? n.toLocaleString('vi-VN') + '₫' : '—';

const PRODUCT_STATUS_BADGE: Record<string, string> = {
  ACTIVE:   'adm-badge--success',
  INACTIVE: 'adm-badge--muted',
};

export function ProductsPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [page,             setPage]             = useState(0);
  const [size,             setSize]             = useState(20);
  const [filterSearch,     setFilterSearch]     = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterStatus,     setFilterStatus]     = useState('');

  const listQuery = useQuery({
    queryKey: ['products', page, size, filterSearch, filterCategoryId, filterStatus],
    queryFn:  () => adminApi.products.list(page, size, {
      search:     filterSearch     || undefined,
      categoryId: filterCategoryId ? Number(filterCategoryId) : undefined,
      status:     filterStatus     || undefined,
    }),
    staleTime: 5000,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn:  () => adminApi.categories.list(),
    staleTime: 30000,
  });

  const categories = categoriesQuery.data ?? [];

  // ── Form state ──
  const [showForm,        setShowForm]        = useState(false);
  const [editing,         setEditing]         = useState<Product | null>(null);
  const [productCode,     setProductCode]     = useState('');
  const [name,            setName]            = useState('');
  const [categoryId,      setCategoryId]      = useState('');
  const [shortDescription,setShortDescription]= useState('');
  const [description,     setDescription]     = useState('');
  const [originCountry,   setOriginCountry]   = useState('');
  const [status,          setStatus]          = useState('ACTIVE');
  const [isFeatured,      setIsFeatured]      = useState(false);
  const [sku,             setSku]             = useState('');
  const [barcode,         setBarcode]         = useState('');
  const [variantName,     setVariantName]     = useState('');
  const [unit,            setUnit]            = useState('');
  const [netPrice,        setNetPrice]        = useState('');
  const [stock,           setStock]           = useState('');
  const [image,           setImage]           = useState<File | null>(null);

  const [deactivateTarget, setDeactivateTarget] = useState<Product | null>(null);

  const resetForm = () => {
    setEditing(null);
    setProductCode(''); setName(''); setCategoryId('');
    setShortDescription(''); setDescription(''); setOriginCountry('');
    setStatus('ACTIVE'); setIsFeatured(false);
    setSku(''); setBarcode(''); setVariantName('');
    setUnit(''); setNetPrice(''); setStock(''); setImage(null);
  };

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => adminApi.products.deactivate(id),
    onSuccess:  async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeactivateTarget(null);
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const cid = Number(categoryId);
      if (!productCode.trim()) throw new Error(`${t('fields.productCode')}: ${t('common.required')}.`);
      if (!name.trim())        throw new Error(`${t('fields.productName')}: ${t('common.required')}.`);
      if (!Number.isFinite(cid) || cid <= 0) throw new Error(`${t('fields.categoryId')}: ${t('common.required')}.`);
      if (!sku.trim())         throw new Error(`${t('fields.sku')}: ${t('common.required')}.`);
      const price = Number(netPrice);
      if (!Number.isFinite(price) || price < 0) throw new Error(`${t('fields.netPrice')}: ${t('common.required')}.`);
      const st = Number(stock);
      if (!Number.isFinite(st) || st < 0)       throw new Error(`${t('fields.stock')}: ${t('common.required')}.`);

      return adminApi.products.createOrUpdateMultipart(editing ? 'update' : 'create', {
        productId:        editing?.id,
        productCode:      productCode.trim(),
        name:             name.trim(),
        categoryId:       cid,
        shortDescription: shortDescription.trim() || undefined,
        description:      description.trim()      || undefined,
        originCountry:    originCountry.trim()    || undefined,
        status:           status.trim()           || undefined,
        isFeatured,
        sku:              sku.trim(),
        barcode:          barcode.trim()          || undefined,
        variantName:      variantName.trim()      || undefined,
        unit:             unit.trim()             || undefined,
        netPrice:         price,
        stock:            st,
        image,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      resetForm();
      setShowForm(false);
    },
  });

  const items         = useMemo(() => listQuery.data?.content ?? [],                                        [listQuery.data?.content]);
  const featuredCount = useMemo(() => items.filter((p) => Boolean(p.isFeatured)).length,                   [items]);
  const outOfStockCount = useMemo(() => items.filter((p) => (firstVariant(p)?.stock ?? 0) <= 0).length,   [items]);

  const canSubmit = useMemo(() => {
    if (!productCode.trim()) return false;
    if (!name.trim())        return false;
    const cid = Number(categoryId);
    if (!Number.isFinite(cid) || cid <= 0) return false;
    if (!sku.trim())         return false;
    const price = Number(netPrice);
    if (!Number.isFinite(price) || price < 0) return false;
    const st = Number(stock);
    if (!Number.isFinite(st) || st < 0) return false;
    return !upsertMutation.isPending;
  }, [categoryId, name, netPrice, productCode, sku, stock, upsertMutation.isPending]);

  const hasFilter = filterSearch || filterCategoryId || filterStatus;

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
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Vô hiệu sản phẩm</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              <strong>{deactivateTarget.name}</strong> (#{deactivateTarget.id}) sẽ không còn hiển thị với khách hàng.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="adm-button adm-button--ghost" type="button" onClick={() => setDeactivateTarget(null)}>Hủy</button>
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
          <div className="page__title">{t('pages.productsTitle')}</div>
          <div className="page__subtitle">{t('pages.productsSubtitle')}</div>
        </div>
        <button
          className="adm-button adm-button--primary"
          type="button"
          onClick={() => { resetForm(); setShowForm((v) => !v); }}
        >
          {showForm && !editing ? '✕ Đóng' : '+ Thêm sản phẩm'}
        </button>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid--3">
        <div className="card">
          <div className="card__label">Tổng sản phẩm</div>
          <div className="card__value">{listQuery.data?.totalElements ?? 0}</div>
          <div className="card__hint">Toàn bộ hệ thống</div>
        </div>
        <div className="card">
          <div className="card__label">Nổi bật (trang này)</div>
          <div className="card__value" style={{ color: featuredCount > 0 ? 'var(--primary)' : undefined }}>
            {featuredCount}
          </div>
          <div className="card__hint">isFeatured = true</div>
        </div>
        <div className="card">
          <div className="card__label">Hết hàng (trang này)</div>
          <div className="card__value" style={{ color: outOfStockCount > 0 ? 'var(--danger)' : undefined }}>
            {outOfStockCount}
          </div>
          <div className="card__hint">Stock ≤ 0 (variant đầu)</div>
        </div>
      </div>

      {/* ── Create / Edit form (collapsible) ── */}
      {showForm && (
        <div className="card">
          <div className="card__label">
            {editing ? `Chỉnh sửa sản phẩm #${editing.id}` : t('products.formTitleCreate')}
          </div>
          {upsertMutation.isError && (
            <div className="inline-alert">
              {upsertMutation.error instanceof Error ? upsertMutation.error.message : t('messages.saveFailed')}
            </div>
          )}

          {/* Product fields */}
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
                  <option key={c.id} value={String(c.id)}>{c.name} (#{c.id})</option>
                ))}
              </select>
            </label>
            <label className="adm-field">
              <div className="adm-field__label">{t('fields.status')}</div>
              <select className="adm-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </label>
            <label className="adm-field">
              <div className="adm-field__label">{t('fields.originCountry')}</div>
              <input className="adm-input" value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} placeholder="VN" />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">{t('fields.isFeatured')}</div>
              <select className="adm-input" value={isFeatured ? 'true' : 'false'} onChange={(e) => setIsFeatured(e.target.value === 'true')}>
                <option value="false">Không</option>
                <option value="true">Có</option>
              </select>
            </label>
            <label className="adm-field" style={{ gridColumn: '1 / -1' }}>
              <div className="adm-field__label">{t('fields.shortDescription')}</div>
              <input className="adm-input" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="(tùy chọn)" />
            </label>
            <label className="adm-field" style={{ gridColumn: '1 / -1' }}>
              <div className="adm-field__label">{t('fields.description')}</div>
              <input className="adm-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="(tùy chọn)" />
            </label>
          </div>

          <div className="divider" />

          {/* Variant fields */}
          <div className="card__label" style={{ marginBottom: 12 }}>{t('products.variantSection')}</div>
          <div className="form-grid">
            <label className="adm-field">
              <div className="adm-field__label">{t('fields.sku')}</div>
              <input className="adm-input" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU_001" />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">{t('fields.barcode')}</div>
              <input className="adm-input" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="(tùy chọn)" />
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
              <div className="adm-field__label">{t('fields.netPrice')} (₫)</div>
              <input className="adm-input" type="number" min="0" value={netPrice} onChange={(e) => setNetPrice(e.target.value)} placeholder="12000" />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">{t('fields.stock')}</div>
              <input className="adm-input" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="100" />
            </label>
            <label className="adm-field" style={{ gridColumn: '1 / -1' }}>
              <div className="adm-field__label">{t('products.imageOptional')}</div>
              <input
                className="adm-input"
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="row-actions">
            <button className="adm-button adm-button--ghost" type="button" onClick={() => { resetForm(); setShowForm(false); }}>
              Hủy
            </button>
            <button className="adm-button adm-button--primary" type="button" onClick={() => upsertMutation.mutate()} disabled={!canSubmit}>
              {upsertMutation.isPending ? t('common.saving') : editing ? t('products.saveActionEdit') : t('products.saveActionCreate')}
            </button>
          </div>
        </div>
      )}

      {/* ── Filter + Table (one card) ── */}
      <div className="card">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
          <label className="adm-field" style={{ flex: 2, minWidth: 180 }}>
            <div className="adm-field__label">Tìm kiếm</div>
            <input
              className="adm-input"
              placeholder="Tên sản phẩm, mã sản phẩm…"
              value={filterSearch}
              onChange={(e) => { setFilterSearch(e.target.value); setPage(0); }}
            />
          </label>
          <label className="adm-field" style={{ minWidth: 170 }}>
            <div className="adm-field__label">Danh mục</div>
            <select className="adm-input" value={filterCategoryId} onChange={(e) => { setFilterCategoryId(e.target.value); setPage(0); }}>
              <option value="">Tất cả</option>
              {categories.map((c: Category) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="adm-field" style={{ minWidth: 140 }}>
            <div className="adm-field__label">Trạng thái</div>
            <select className="adm-input" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}>
              <option value="">Tất cả</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </label>
          {hasFilter && (
            <button
              className="adm-button adm-button--ghost"
              type="button"
              style={{ alignSelf: 'flex-end' }}
              onClick={() => { setFilterSearch(''); setFilterCategoryId(''); setFilterStatus(''); setPage(0); }}
            >
              Xóa lọc
            </button>
          )}
          <span className="adm-chip" style={{ alignSelf: 'flex-end' }}>
            Tổng: {listQuery.data?.totalElements ?? 0}
          </span>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Ảnh</th>
                <th>Tên sản phẩm</th>
                <th>Danh mục</th>
                <th>SKU</th>
                <th>Giá</th>
                <th>Tồn kho</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr><td colSpan={9} className="muted">{t('common.loading')}</td></tr>
              ) : listQuery.isError ? (
                <tr><td colSpan={9} className="muted">{listQuery.error instanceof Error ? listQuery.error.message : t('messages.loadProductsFailed')}</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="muted">{t('common.noData')}</td></tr>
              ) : (
                items.map((p) => {
                  const v          = firstVariant(p);
                  const statusKey  = (p.status ?? '').toUpperCase();
                  return (
                    <tr key={p.id}>
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
                      <td>{p.category?.name ?? <span className="muted">—</span>}</td>
                      <td className="mono">{v?.sku ?? <span className="muted">—</span>}</td>
                      <td className="mono">{fmtPrice(v?.netPrice)}</td>
                      <td className="mono">{v?.stock != null ? v.stock : <span className="muted">—</span>}</td>
                      <td>
                        <span className={`adm-badge ${PRODUCT_STATUS_BADGE[statusKey] ?? 'adm-badge--muted'}`}>
                          {p.status ?? '—'}
                        </span>
                      </td>
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
                            setShowForm(true);
                          }}
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          className="adm-button adm-button--ghost"
                          type="button"
                          disabled={p.status === 'INACTIVE'}
                          onClick={() => setDeactivateTarget(p)}
                          style={{ color: p.status !== 'INACTIVE' ? 'var(--danger)' : undefined }}
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

        <Pagination
          page={page}
          totalPages={listQuery.data?.totalPages ?? 0}
          totalElements={listQuery.data?.totalElements}
          size={size}
          onPageChange={setPage}
          onSizeChange={setSize}
        />
      </div>
    </div>
  );
}
