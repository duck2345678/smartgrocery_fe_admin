import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, type Product } from '../api/adminApi';

const toDateTimeLocal = (v: string | null | undefined) => (!v ? '' : v.length > 16 ? v.slice(0, 16) : v);
const toIso           = (v: string) => (!v ? undefined : v.length === 16 ? `${v}:00` : v);
const fmtDate         = (v: string | null | undefined) => (v ? v.slice(0, 16).replace('T', ' ') : '—');

export function PromotionsPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'VOUCHERS' | 'FLASH_SALE'>('VOUCHERS');
  const [voucherPage, setVoucherPage] = useState<'NORMAL' | 'AI'>('NORMAL');

  // --- VOUCHER LOGIC ---
  const voucherListQuery = useQuery({
    queryKey: ['admin-vouchers'],
    queryFn: () => adminApi.promotions.listVouchers(),
    enabled: activeTab === 'VOUCHERS',
  });

  const [vForm, setVForm] = useState({
    quantity: 10,
    prefix: 'SG',
    discountType: 'FIXED_AMOUNT' as 'FIXED_AMOUNT' | 'PERCENT',
    discountValue: 20000,
    minOrderAmount: 100000,
    validUntil: '',
    usageLimit: 1,
    hidden: false,
  });

  const visibleVouchers = (voucherListQuery.data ?? []).filter((v) =>
    voucherPage === 'AI' ? v.hidden : !v.hidden
  );

  const switchVoucherPage = (page: 'NORMAL' | 'AI') => {
    setVoucherPage(page);
    setVForm((prev) => ({
      ...prev,
      hidden: page === 'AI',
      prefix: page === 'AI' ? 'AI-GIFT' : 'SG',
    }));
  };

  const generateVouchersMutation = useMutation({
    mutationFn: () => adminApi.promotions.generateVouchers({
      quantity: vForm.quantity,
      prefix: voucherPage === 'AI' ? (vForm.prefix || 'AI-GIFT') : vForm.prefix,
      discountType: vForm.discountType,
      discountValue: vForm.discountValue,
      minOrderAmount: vForm.minOrderAmount,
      validUntil: vForm.validUntil ? `${vForm.validUntil}:00` : new Date(Date.now() + 7 * 86400000).toISOString(),
      usageLimitPerVoucher: vForm.usageLimit,
      hidden: voucherPage === 'AI',
      revealTrigger: voucherPage === 'AI' ? 'AI_ORDER_COMPLETED' : 'PUBLIC',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vouchers'] });
      alert(t('common.save'));
    }
  });

  const deleteVoucherMutation = useMutation({
    mutationFn: (id: number) => adminApi.promotions.deleteVoucher(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-vouchers'] }),
  });

  const [search, setSearch] = useState('');
  const productSearchQuery = useQuery({
    queryKey: ['admin-product-search', search],
    queryFn: () => adminApi.products.adminList({ search, size: 20 }),
    enabled: activeTab === 'FLASH_SALE' && search.length > 2,
  });

  const discountedProductsQuery = useQuery({
    queryKey: ['admin-discounted-products'],
    queryFn: () => adminApi.products.adminList({ discounted: true, size: 50 }),
    enabled: activeTab === 'FLASH_SALE',
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dForm, setDForm] = useState({
    discountPercent: 10,
    endsAt: '',
  });

  const updateDiscountMutation = useMutation({
    mutationFn: () => {
      if (!selectedProduct || !selectedProduct.variants?.[0]) throw new Error(t('promotions.voucherHub.flashSale.noProductSelected'));
      return adminApi.promotions.updateDiscounts({
        variantIds: selectedProduct.variants.map(v => v.id),
        discountPercentage: dForm.discountPercent,
        flashSaleEndsAt: dForm.endsAt ? `${dForm.endsAt}:00` : undefined,
      });
    },
    onSuccess: () => {
      alert(t('promotions.voucherHub.flashSale.successMessage'));
      setSelectedProduct(null);
      queryClient.invalidateQueries({ queryKey: ['admin-product-search'] });
      queryClient.invalidateQueries({ queryKey: ['admin-discounted-products'] });
    }
  });

  const formatPrice = (p: number) => p.toLocaleString('vi-VN') + '₫';

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">{t('promotions.voucherHub.title')}</div>
          <div className="page__subtitle">{t('promotions.voucherHub.subtitle')}</div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('VOUCHERS')}
          className={`adm-button ${activeTab === 'VOUCHERS' ? 'adm-button--primary' : 'bg-white text-slate-600'}`}
        >
          {t('promotions.voucherHub.tabs.vouchers')}
        </button>
        <button 
          onClick={() => setActiveTab('FLASH_SALE')}
          className={`adm-button ${activeTab === 'FLASH_SALE' ? 'adm-button--primary' : 'bg-white text-slate-600'}`}
        >
          {t('promotions.voucherHub.tabs.flashSale')}
        </button>
      </div>

      {activeTab === 'VOUCHERS' ? (
        <div className="space-y-6">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => switchVoucherPage('NORMAL')}
              className={`adm-button ${voucherPage === 'NORMAL' ? 'adm-button--primary' : 'bg-white text-slate-600'}`}
            >
              Voucher thường
            </button>
            <button
              type="button"
              onClick={() => switchVoucherPage('AI')}
              className={`adm-button ${voucherPage === 'AI' ? 'adm-button--primary' : 'bg-white text-slate-600'}`}
            >
              Voucher AI đặc biệt
            </button>
          </div>

          <div className={`card ${voucherPage === 'AI' ? 'border-l-4 border-l-emerald-500' : ''}`}>
            <div className="card__label">
              {voucherPage === 'AI' ? 'Tạo sẵn kho voucher AI đặc biệt' : t('promotions.voucherHub.createVoucherTitle')}
            </div>
            {voucherPage === 'AI' ? (
              <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Voucher AI được admin tạo sẵn, không hiển thị trực tiếp cho user. Khi user hoàn tất đơn hàng từ danh sách gợi ý AI, hệ thống sẽ tự động gán 1 voucher chưa cấp từ kho này để tặng cho user.
              </div>
            ) : null}
            <div className="form-grid">
              <label className="adm-field">
                <div className="adm-field__label">{t('promotions.voucherHub.fields.quantity')}</div>
                <input type="number" className="adm-input" value={vForm.quantity} onChange={e => setVForm({...vForm, quantity: +e.target.value})} />
              </label>
              <label className="adm-field">
                <div className="adm-field__label">{t('promotions.voucherHub.fields.prefix')}</div>
                <input className="adm-input" value={vForm.prefix} onChange={e => setVForm({...vForm, prefix: e.target.value.toUpperCase()})} />
              </label>
              <label className="adm-field">
                <div className="adm-field__label">{t('promotions.voucherHub.fields.discountType')}</div>
                <select className="adm-input" value={vForm.discountType} onChange={e => setVForm({...vForm, discountType: e.target.value as any})}>
                  <option value="FIXED_AMOUNT">{t('promotions.voucherHub.fields.fixedAmount')}</option>
                  <option value="PERCENT">{t('promotions.voucherHub.fields.percent')}</option>
                </select>
              </label>
              <label className="adm-field">
                <div className="adm-field__label">{t('promotions.voucherHub.fields.discountValue')}</div>
                <input type="number" className="adm-input" value={vForm.discountValue} onChange={e => setVForm({...vForm, discountValue: +e.target.value})} />
              </label>
              <label className="adm-field">
                <div className="adm-field__label">{t('promotions.voucherHub.fields.minOrderAmount')}</div>
                <input type="number" className="adm-input" value={vForm.minOrderAmount} onChange={e => setVForm({...vForm, minOrderAmount: +e.target.value})} />
              </label>
              <label className="adm-field">
                <div className="adm-field__label">{t('promotions.voucherHub.fields.validUntil')}</div>
                <input type="datetime-local" className="adm-input" value={vForm.validUntil} onChange={e => setVForm({...vForm, validUntil: e.target.value})} />
              </label>
              <label className="adm-field">
                <div className="adm-field__label">Chế độ hiển thị</div>
                <input
                  className="adm-input"
                  value={voucherPage === 'AI' ? 'Voucher AI ẩn' : 'Voucher thường công khai'}
                  disabled
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button 
                className="adm-button adm-button--primary" 
                onClick={() => generateVouchersMutation.mutate()}
                disabled={generateVouchersMutation.isPending}
              >
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
                  {visibleVouchers.map(v => (
                    <tr key={v.id}>
                      <td className="font-bold text-emerald-600 font-mono">{v.voucherCode}</td>
                      <td>{v.discountType === 'FIXED_AMOUNT' ? t('promotions.voucherHub.fields.fixedAmount') : t('promotions.voucherHub.fields.percent')}</td>
                      <td className="font-bold">{v.discountType === 'FIXED_AMOUNT' ? formatPrice(v.discountValue) : v.discountValue + '%'}</td>
                      <td>{formatPrice(v.minOrderAmount || 0)}</td>
                      <td>{v.usedCount} / {v.usageLimitPerVoucher}</td>
                      <td className="font-mono">{v.validUntil ? new Date(v.validUntil).toLocaleDateString('vi-VN') : '-'}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${v.hidden ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-600'}`}>
                          {v.hidden ? (v.assignedUserId ? 'Đã cấp cho user' : 'Trong kho AI') : 'Công khai'}
                        </span>
                        {v.assignedUserId ? <div className="text-[11px] text-slate-500 mt-1">User #{v.assignedUserId}</div> : null}
                      </td>
                      <td>
                        <button 
                          className="text-red-500 hover:underline"
                          onClick={() => {
                            if (confirm(t('common.deactivate'))) deleteVoucherMutation.mutate(v.id);
                          }}
                        >
                          {t('promotions.voucherHub.actions.delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {visibleVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-400">
                        {voucherPage === 'AI' ? 'Chưa có voucher AI đặc biệt nào trong kho.' : 'Chưa có voucher thường nào.'}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card border-l-4 border-l-amber-500">
            <div className="card__label">{t('promotions.voucherHub.flashSale.title')}</div>
            <div className="adm-field mb-4">
              <div className="adm-field__label">{t('promotions.voucherHub.flashSale.searchPlaceholder')}</div>
              <input 
                className="adm-input" 
                placeholder={t('promotions.voucherHub.flashSale.searchHint')} 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {productSearchQuery.data?.content && (
              <div className="grid grid-cols-2 gap-2 mb-4 max-h-60 overflow-y-auto p-2 bg-slate-50 rounded-lg shadow-inner">
                {productSearchQuery.data.content.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => setSelectedProduct(p)}
                    className={`p-3 rounded-xl cursor-pointer flex items-center border transition-all ${selectedProduct?.id === p.id ? 'border-amber-500 bg-amber-50 shadow-sm' : 'border-slate-200 bg-white hover:border-amber-300'}`}
                  >
                    {p.image && <img src={p.image} className="w-10 h-10 rounded-md mr-3 object-cover shadow-sm" />}
                    <div className="flex-1 overflow-hidden">
                      <div className="text-sm font-bold truncate">{p.name}</div>
                      <div className="text-xs text-slate-500">{t('promotions.voucherHub.flashSale.selectedHint')} {formatPrice(p.variants?.[0]?.netPrice || 0)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedProduct && (
              <div className="form-grid mt-4 p-4 bg-amber-50/30 rounded-2xl border border-amber-100/50">
                <label className="adm-field">
                  <div className="adm-field__label">{t('promotions.voucherHub.flashSale.discountPercent')}</div>
                  <input 
                    type="number" 
                    className="adm-input" 
                    value={dForm.discountPercent} 
                    onChange={e => setDForm({...dForm, discountPercent: +e.target.value})} 
                  />
                </label>
                <label className="adm-field">
                  <div className="adm-field__label">{t('promotions.voucherHub.flashSale.endsAt')}</div>
                  <input 
                    type="datetime-local" 
                    className="adm-input" 
                    value={dForm.endsAt} 
                    onChange={e => setDForm({...dForm, endsAt: e.target.value})} 
                  />
                </label>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button 
                className="adm-button adm-button--primary bg-amber-600 border-amber-600 hover:bg-amber-700" 
                onClick={() => updateDiscountMutation.mutate()}
                disabled={!selectedProduct || updateDiscountMutation.isPending}
              >
                {updateDiscountMutation.isPending ? t('promotions.voucherHub.actions.updating') : t('promotions.voucherHub.actions.applyDiscount')}
              </button>
            </div>
          </div>

          {/* LIST OF CURRENTLY DISCOUNTED PRODUCTS */}
          <div className="card">
            <div className="card__label">Sản phẩm đang khuyến mãi</div>
            <div className="table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Giá gốc</th>
                    <th>Giá KM</th>
                    <th>Giảm (%)</th>
                    <th>Hết hạn</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {discountedProductsQuery.data?.content?.map(p => {
                    const variant = p.variants?.[0];
                    const discount = variant?.compareAtPrice && variant.compareAtPrice > 0 
                      ? Math.round((1 - (variant.netPrice || 0) / variant.compareAtPrice) * 100)
                      : 0;
                    
                    return (
                      <tr key={p.id}>
                        <td className="flex items-center py-3">
                          {p.image && <img src={p.image} className="w-8 h-8 rounded mr-3" />}
                          <div>
                            <div className="font-bold">{p.name}</div>
                            <div className="text-xs text-slate-500 font-mono">{variant?.sku}</div>
                          </div>
                        </td>
                        <td className="line-through text-slate-400">{formatPrice(variant?.compareAtPrice || 0)}</td>
                        <td className="text-emerald-600 font-bold">{formatPrice(variant?.netPrice || 0)}</td>
                        <td>
                          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold">
                            -{discount}%
                          </span>
                        </td>
                        <td className="font-mono text-xs">
                          {variant?.flashSaleEndsAt ? new Date(variant.flashSaleEndsAt).toLocaleDateString('vi-VN') : '-'}
                        </td>
                        <td>
                          <button 
                            className="text-amber-600 hover:underline"
                            onClick={() => {
                              setSelectedProduct(p);
                              setDForm({ ...dForm, discountPercent: discount });
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          >
                            Sửa
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {(!discountedProductsQuery.data?.content || discountedProductsQuery.data.content.length === 0) && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">Không có sản phẩm nào đang giảm giá.</td>
                    </tr>
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
