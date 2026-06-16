import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, type Product } from '../api/adminApi';

type FlashStatus = 'ALL' | 'ACTIVE' | 'UPCOMING' | 'ENDED' | 'NO_END';

const formatPrice = (value: number | null | undefined) =>
  (value ?? 0).toLocaleString('vi-VN') + '₫';

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16).replace('T', ' ');
  return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};

const toInputDateTime = (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const fromInputDateTime = (value: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const flashStatusOf = (variant?: NonNullable<Product['variants']>[number]): Exclude<FlashStatus, 'ALL'> => {
  const now = Date.now();
  const startsAt = variant?.flashSaleStartsAt ? new Date(variant.flashSaleStartsAt).getTime() : null;
  const endsAt = variant?.flashSaleEndsAt ? new Date(variant.flashSaleEndsAt).getTime() : null;
  if (!endsAt) return 'NO_END';
  if (startsAt && startsAt > now) return 'UPCOMING';
  if (endsAt < now) return 'ENDED';
  return 'ACTIVE';
};

const flashStatusLabel = (status: Exclude<FlashStatus, 'ALL'>) => {
  if (status === 'ACTIVE') return 'Đang diễn ra';
  if (status === 'UPCOMING') return 'Sắp diễn ra';
  if (status === 'NO_END') return 'Thiếu hạn';
  return 'Đã kết thúc';
};

const flashStatusClass = (status: Exclude<FlashStatus, 'ALL'>) => {
  if (status === 'ACTIVE') return 'adm-badge--success';
  if (status === 'UPCOMING') return 'adm-badge--cyan';
  if (status === 'NO_END') return 'adm-badge--danger';
  return 'adm-badge--muted';
};

export function PromotionsPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'VOUCHERS' | 'FLASH_SALE'>('VOUCHERS');
  const [voucherPage, setVoucherPage] = useState<'NORMAL' | 'AI'>('NORMAL');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [flashCategoryId, setFlashCategoryId] = useState('');
  const [flashStatus, setFlashStatus] = useState<FlashStatus>('ALL');
  const [selectedVariantIds, setSelectedVariantIds] = useState<number[]>([]);
  const [vForm, setVForm] = useState({
    quantity: 10,
    prefix: 'SG',
    discountType: 'FIXED_AMOUNT' as 'FIXED_AMOUNT' | 'PERCENT',
    discountValue: 20000,
    minOrderAmount: 100000,
    validUntil: '',
    usageLimit: 1,
  });
  const [dForm, setDForm] = useState({
    discountPercent: 10,
    startsAt: '',
    endsAt: '',
    stockLimit: 100,
  });

  const voucherListQuery = useQuery({
    queryKey: ['admin-vouchers'],
    queryFn: () => adminApi.promotions.listVouchers(),
    enabled: activeTab === 'VOUCHERS',
  });

  const visibleVouchers = (voucherListQuery.data ?? []).filter((v) =>
    voucherPage === 'AI' ? v.hidden : !v.hidden,
  );

  const productSearchQuery = useQuery({
    queryKey: ['admin-product-search', search],
    queryFn: () => adminApi.products.adminList({ search, size: 20 }),
    enabled: activeTab === 'FLASH_SALE' && search.length > 2,
  });

  const discountedProductsQuery = useQuery({
    queryKey: ['admin-discounted-products', flashCategoryId],
    queryFn: () => adminApi.products.adminList({
      discounted: true,
      categoryId: flashCategoryId ? Number(flashCategoryId) : undefined,
      size: 100,
    }),
    enabled: activeTab === 'FLASH_SALE',
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => adminApi.categories.list(),
    enabled: activeTab === 'FLASH_SALE',
  });

  const generateVouchersMutation = useMutation({
    mutationFn: () => adminApi.promotions.generateVouchers({
      quantity: vForm.quantity,
      prefix: voucherPage === 'AI' ? (vForm.prefix || 'AI-GIFT') : vForm.prefix,
      discountType: vForm.discountType,
      discountValue: vForm.discountValue,
      minOrderAmount: vForm.minOrderAmount,
      validUntil: fromInputDateTime(vForm.validUntil) ?? new Date(Date.now() + 7 * 86400000).toISOString(),
      usageLimitPerVoucher: vForm.usageLimit,
      hidden: voucherPage === 'AI',
      revealTrigger: voucherPage === 'AI' ? 'AI_ORDER_COMPLETED' : 'PUBLIC',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vouchers'] });
      alert(t('common.save'));
    },
  });

  const deleteVoucherMutation = useMutation({
    mutationFn: (id: number) => adminApi.promotions.deleteVoucher(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-vouchers'] }),
    onError: (error) => alert(error instanceof Error ? error.message : 'Không thể xóa voucher'),
  });

  const updateDiscountMutation = useMutation({
    mutationFn: () => {
      if (!selectedProduct || !selectedProduct.variants?.[0]) {
        throw new Error(t('promotions.voucherHub.flashSale.noProductSelected'));
      }
      if (!dForm.endsAt) throw new Error('Flash Sale bắt buộc có thời gian kết thúc.');
      if (new Date(dForm.endsAt).getTime() <= Date.now()) throw new Error('Thời gian kết thúc phải ở tương lai.');
      if (!Number.isFinite(dForm.stockLimit) || dForm.stockLimit <= 0) throw new Error('Số lượng khuyến mãi phải lớn hơn 0.');
      return adminApi.promotions.updateDiscounts({
        variantIds: selectedProduct.variants.map((v) => v.id),
        discountPercentage: dForm.discountPercent,
        flashSaleStartsAt: fromInputDateTime(dForm.startsAt),
        flashSaleEndsAt: fromInputDateTime(dForm.endsAt),
        flashSaleStockLimit: dForm.stockLimit,
      });
    },
    onSuccess: () => {
      alert(t('promotions.voucherHub.flashSale.successMessage'));
      setSelectedProduct(null);
      queryClient.invalidateQueries({ queryKey: ['admin-product-search'] });
      queryClient.invalidateQueries({ queryKey: ['admin-discounted-products'] });
    },
    onError: (error) => alert(error instanceof Error ? error.message : 'Không thể cập nhật Flash Sale'),
  });

  const stopFlashSaleMutation = useMutation({
    mutationFn: (variantIds: number[]) => adminApi.promotions.updateDiscounts({ variantIds, stopFlashSale: true }),
    onSuccess: () => {
      setSelectedVariantIds([]);
      queryClient.invalidateQueries({ queryKey: ['admin-discounted-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-product-search'] });
    },
    onError: (error) => alert(error instanceof Error ? error.message : 'Không thể dừng khuyến mãi'),
  });

  const switchVoucherPage = (page: 'NORMAL' | 'AI') => {
    setVoucherPage(page);
    setVForm((prev) => ({ ...prev, prefix: page === 'AI' ? 'AI-GIFT' : 'SG' }));
  };

  const discountedRows = (discountedProductsQuery.data?.content ?? []).filter((product) => {
    const status = flashStatusOf(product.variants?.[0]);
    return flashStatus === 'ALL' || status === flashStatus;
  });
  const visibleVariantIds = discountedRows
    .map((product) => product.variants?.[0]?.id)
    .filter((id): id is number => Number.isFinite(id));
  const allVisibleSelected = visibleVariantIds.length > 0 && visibleVariantIds.every((id) => selectedVariantIds.includes(id));

  const toggleVariant = (variantId: number) => {
    setSelectedVariantIds((ids) => ids.includes(variantId) ? ids.filter((id) => id !== variantId) : [...ids, variantId]);
  };

  const toggleAllVisible = () => {
    setSelectedVariantIds((ids) =>
      allVisibleSelected
        ? ids.filter((id) => !visibleVariantIds.includes(id))
        : Array.from(new Set([...ids, ...visibleVariantIds])),
    );
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">{t('promotions.voucherHub.title')}</div>
          <div className="page__subtitle">{t('promotions.voucherHub.subtitle')}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className={`adm-button ${activeTab === 'VOUCHERS' ? 'adm-button--primary' : ''}`} type="button" onClick={() => setActiveTab('VOUCHERS')}>
          {t('promotions.voucherHub.tabs.vouchers')}
        </button>
        <button className={`adm-button ${activeTab === 'FLASH_SALE' ? 'adm-button--primary' : ''}`} type="button" onClick={() => setActiveTab('FLASH_SALE')}>
          {t('promotions.voucherHub.tabs.flashSale')}
        </button>
      </div>

      {activeTab === 'VOUCHERS' ? (
        <div className="page">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => switchVoucherPage('NORMAL')} className={`adm-button ${voucherPage === 'NORMAL' ? 'adm-button--primary' : ''}`}>
              Voucher thường
            </button>
            <button type="button" onClick={() => switchVoucherPage('AI')} className={`adm-button ${voucherPage === 'AI' ? 'adm-button--primary' : ''}`}>
              Voucher AI đặc biệt
            </button>
          </div>

          <div className="card">
            <div className="card__label">{voucherPage === 'AI' ? 'Tạo sẵn kho voucher AI đặc biệt' : t('promotions.voucherHub.createVoucherTitle')}</div>
            {voucherPage === 'AI' && (
              <div className="inline-alert" style={{ marginBottom: 14 }}>
                Voucher AI được tạo sẵn và chỉ gán khi user hoàn tất đơn hàng từ danh sách gợi ý AI.
              </div>
            )}
            <div className="form-grid">
              <label className="adm-field">
                <div className="adm-field__label">{t('promotions.voucherHub.fields.quantity')}</div>
                <input type="number" className="adm-input" value={vForm.quantity} onChange={(e) => setVForm({ ...vForm, quantity: +e.target.value })} />
              </label>
              <label className="adm-field">
                <div className="adm-field__label">{t('promotions.voucherHub.fields.prefix')}</div>
                <input className="adm-input" value={vForm.prefix} onChange={(e) => setVForm({ ...vForm, prefix: e.target.value.toUpperCase() })} />
              </label>
              <label className="adm-field">
                <div className="adm-field__label">{t('promotions.voucherHub.fields.discountType')}</div>
                <select className="adm-input" value={vForm.discountType} onChange={(e) => setVForm({ ...vForm, discountType: e.target.value as 'FIXED_AMOUNT' | 'PERCENT' })}>
                  <option value="FIXED_AMOUNT">{t('promotions.voucherHub.fields.fixedAmount')}</option>
                  <option value="PERCENT">{t('promotions.voucherHub.fields.percent')}</option>
                </select>
              </label>
              <label className="adm-field">
                <div className="adm-field__label">{t('promotions.voucherHub.fields.discountValue')}</div>
                <input type="number" className="adm-input" value={vForm.discountValue} onChange={(e) => setVForm({ ...vForm, discountValue: +e.target.value })} />
              </label>
              <label className="adm-field">
                <div className="adm-field__label">{t('promotions.voucherHub.fields.minOrderAmount')}</div>
                <input type="number" className="adm-input" value={vForm.minOrderAmount} onChange={(e) => setVForm({ ...vForm, minOrderAmount: +e.target.value })} />
              </label>
              <label className="adm-field">
                <div className="adm-field__label">{t('promotions.voucherHub.fields.validUntil')}</div>
                <input type="datetime-local" className="adm-input" value={vForm.validUntil} onChange={(e) => setVForm({ ...vForm, validUntil: e.target.value })} />
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button className="adm-button adm-button--primary" type="button" onClick={() => generateVouchersMutation.mutate()} disabled={generateVouchersMutation.isPending}>
                {generateVouchersMutation.isPending ? t('promotions.voucherHub.actions.generating') : t('promotions.voucherHub.actions.generate')}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>{t('promotions.voucherHub.table.code')}</th>
                    <th>{t('promotions.voucherHub.table.type')}</th>
                    <th>{t('promotions.voucherHub.table.value')}</th>
                    <th>{t('promotions.voucherHub.table.minOrder')}</th>
                    <th>{t('promotions.voucherHub.table.used')}</th>
                    <th>{t('promotions.voucherHub.table.expiry')}</th>
                    <th>Hiển thị</th>
                    <th>{t('promotions.voucherHub.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleVouchers.map((voucher) => (
                    <tr key={voucher.id}>
                      <td className="mono">{voucher.voucherCode}</td>
                      <td>{voucher.discountType === 'FIXED_AMOUNT' ? t('promotions.voucherHub.fields.fixedAmount') : t('promotions.voucherHub.fields.percent')}</td>
                      <td>{voucher.discountType === 'FIXED_AMOUNT' ? formatPrice(voucher.discountValue) : `${voucher.discountValue}%`}</td>
                      <td>{formatPrice(voucher.minOrderAmount)}</td>
                      <td>{voucher.usedCount} / {voucher.usageLimitPerVoucher}</td>
                      <td className="mono">{voucher.validUntil ? new Date(voucher.validUntil).toLocaleDateString('vi-VN') : '-'}</td>
                      <td><span className="adm-badge adm-badge--muted">{voucher.hidden ? 'Trong kho AI' : 'Công khai'}</span></td>
                      <td>
                        <button
                          className="adm-button adm-button--danger"
                          type="button"
                          disabled={deleteVoucherMutation.isPending}
                          onClick={() => {
                            if (confirm('Xóa voucher này?')) deleteVoucherMutation.mutate(voucher.id);
                          }}
                        >
                          {t('promotions.voucherHub.actions.delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {visibleVouchers.length === 0 && (
                    <tr><td colSpan={8} className="muted">Chưa có voucher phù hợp.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="page">
          <div className="card">
            <div className="card__label">{t('promotions.voucherHub.flashSale.title')}</div>
            <div className="adm-field" style={{ marginBottom: 14 }}>
              <div className="adm-field__label">{t('promotions.voucherHub.flashSale.searchPlaceholder')}</div>
              <input className="adm-input" placeholder={t('promotions.voucherHub.flashSale.searchHint')} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {productSearchQuery.data?.content && (
              <div className="grid grid--2" style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 14 }}>
                {productSearchQuery.data.content.map((product) => (
                  <button
                    key={product.id}
                    className={`adm-button ${selectedProduct?.id === product.id ? 'adm-button--primary' : ''}`}
                    type="button"
                    style={{ justifyContent: 'flex-start', borderRadius: 12 }}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <span>{product.name}</span>
                    <span className="muted">{formatPrice(product.variants?.[0]?.netPrice)}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="form-grid">
              <label className="adm-field">
                <div className="adm-field__label">{t('promotions.voucherHub.flashSale.discountPercent')}</div>
                <input type="number" className="adm-input" value={dForm.discountPercent} onChange={(e) => setDForm({ ...dForm, discountPercent: +e.target.value })} />
              </label>
              <label className="adm-field">
                <div className="adm-field__label">Bắt đầu</div>
                <input type="datetime-local" className="adm-input" value={dForm.startsAt} onChange={(e) => setDForm({ ...dForm, startsAt: e.target.value })} />
              </label>
              <label className="adm-field">
                <div className="adm-field__label">Kết thúc *</div>
                <input type="datetime-local" className="adm-input" required value={dForm.endsAt} onChange={(e) => setDForm({ ...dForm, endsAt: e.target.value })} />
              </label>
              <label className="adm-field">
                <div className="adm-field__label">SL khuyến mãi *</div>
                <input type="number" min="1" className="adm-input" value={dForm.stockLimit} onChange={(e) => setDForm({ ...dForm, stockLimit: +e.target.value })} />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button className="adm-button adm-button--primary" type="button" onClick={() => updateDiscountMutation.mutate()} disabled={!selectedProduct || updateDiscountMutation.isPending}>
                {updateDiscountMutation.isPending ? t('promotions.voucherHub.actions.updating') : t('promotions.voucherHub.actions.applyDiscount')}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="row-actions row-actions--between" style={{ marginBottom: 12 }}>
              <div>
                <div className="card__label">Sản phẩm Flash Sale</div>
                <div className="card__hint">Có thời gian bắt đầu, kết thúc và giới hạn số lượng khuyến mãi.</div>
              </div>
              <button
                className="adm-button adm-button--danger"
                type="button"
                disabled={selectedVariantIds.length === 0 || stopFlashSaleMutation.isPending}
                onClick={() => {
                  if (confirm(`Dừng khuyến mãi ${selectedVariantIds.length} mặt hàng đã chọn?`)) stopFlashSaleMutation.mutate(selectedVariantIds);
                }}
              >
                Dừng KM đã chọn
              </button>
            </div>

            <div className="filters__row" style={{ gridTemplateColumns: 'minmax(180px, 260px) minmax(180px, 240px)', marginBottom: 14 }}>
              <label className="adm-field">
                <div className="adm-field__label">Danh mục</div>
                <select className="adm-input" value={flashCategoryId} onChange={(e) => setFlashCategoryId(e.target.value)}>
                  <option value="">Tất cả danh mục</option>
                  {(categoriesQuery.data ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label className="adm-field">
                <div className="adm-field__label">Trạng thái</div>
                <select className="adm-input" value={flashStatus} onChange={(e) => setFlashStatus(e.target.value as FlashStatus)}>
                  <option value="ALL">Tất cả</option>
                  <option value="ACTIVE">Đang diễn ra</option>
                  <option value="UPCOMING">Sắp diễn ra</option>
                  <option value="ENDED">Đã kết thúc</option>
                  <option value="NO_END">Thiếu hạn kết thúc</option>
                </select>
              </label>
            </div>

            <div className="table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} /></th>
                    <th>Sản phẩm</th>
                    <th>Trạng thái</th>
                    <th>Giá gốc</th>
                    <th>Giá KM</th>
                    <th>Giảm</th>
                    <th>Bắt đầu</th>
                    <th>Kết thúc</th>
                    <th>Đã bán / SL KM</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {discountedRows.map((product) => {
                    const variant = product.variants?.[0];
                    const variantId = variant?.id ?? 0;
                    const discount = variant?.compareAtPrice && variant.compareAtPrice > 0
                      ? Math.round((1 - (variant.netPrice || 0) / variant.compareAtPrice) * 100)
                      : 0;
                    const status = flashStatusOf(variant);
                    return (
                      <tr key={product.id}>
                        <td><input type="checkbox" checked={selectedVariantIds.includes(variantId)} onChange={() => toggleVariant(variantId)} /></td>
                        <td>
                          <div style={{ fontWeight: 800 }}>{product.name}</div>
                          <div className="muted mono">{variant?.sku ?? '-'}</div>
                        </td>
                        <td><span className={`adm-badge ${flashStatusClass(status)}`}>{flashStatusLabel(status)}</span></td>
                        <td className="mono">{formatPrice(variant?.compareAtPrice)}</td>
                        <td className="mono">{formatPrice(variant?.netPrice)}</td>
                        <td><span className="adm-badge adm-badge--warn">-{discount}%</span></td>
                        <td className="mono">{formatDateTime(variant?.flashSaleStartsAt)}</td>
                        <td className="mono">{formatDateTime(variant?.flashSaleEndsAt)}</td>
                        <td className="mono">{variant?.flashSaleSoldCount ?? 0} / {variant?.flashSaleStockLimit ?? '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="adm-button adm-button--ghost"
                              type="button"
                              onClick={() => {
                                setSelectedProduct(product);
                                setDForm({
                                  discountPercent: discount,
                                  startsAt: toInputDateTime(variant?.flashSaleStartsAt),
                                  endsAt: toInputDateTime(variant?.flashSaleEndsAt),
                                  stockLimit: variant?.flashSaleStockLimit ?? 100,
                                });
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                            >
                              Sửa
                            </button>
                            <button
                              className="adm-button adm-button--danger"
                              type="button"
                              disabled={!variantId || stopFlashSaleMutation.isPending}
                              onClick={() => {
                                if (confirm('Dừng khuyến mãi mặt hàng này?')) stopFlashSaleMutation.mutate([variantId]);
                              }}
                            >
                              Dừng KM
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {discountedRows.length === 0 && (
                    <tr><td colSpan={10} className="muted">Không có sản phẩm Flash Sale phù hợp.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
