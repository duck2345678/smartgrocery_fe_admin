import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, type PromotionCampaign } from '../api/adminApi';

const toDateTimeLocal = (v: string | null | undefined) => (!v ? '' : v.length > 16 ? v.slice(0, 16) : v);
const toIso           = (v: string) => (!v ? undefined : v.length === 16 ? `${v}:00` : v);
const fmtDate         = (v: string | null | undefined) => (v ? v.slice(0, 16).replace('T', ' ') : '—');

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'DRAFT'];
const TYPE_OPTIONS   = ['PERCENT', 'FIXED', 'BUY_X_GET_Y'];

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:   'adm-badge--success',
  DRAFT:    'adm-badge--pending',
  INACTIVE: 'adm-badge--muted',
};

const TYPE_BADGE: Record<string, string> = {
  PERCENT:     'adm-badge--cyan',
  FIXED:       'adm-badge--purple',
  BUY_X_GET_Y: 'adm-badge--pending',
};

const TYPE_LABEL: Record<string, string> = {
  PERCENT:     'Giảm %',
  FIXED:       'Giảm cố định',
  BUY_X_GET_Y: 'Mua X tặng Y',
};

function timeStatus(c: PromotionCampaign): { label: string; cls: string } | null {
  if (!c.startsAt && !c.endsAt) return null;
  const now = Date.now();
  const start = c.startsAt ? new Date(c.startsAt).getTime() : null;
  const end   = c.endsAt   ? new Date(c.endsAt).getTime()   : null;
  if (start && now < start) return { label: 'Sắp tới',   cls: 'adm-badge--warn' };
  if (end   && now > end)   return { label: 'Đã hết hạn', cls: 'adm-badge--muted' };
  return { label: 'Đang chạy', cls: 'adm-badge--success' };
}

export function PromotionsPage() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['promotions-campaigns'],
    queryFn:  () => adminApi.promotions.listCampaigns(),
  });

  // ── Form state ──
  const [showForm,      setShowForm]      = useState(false);
  const [editing,       setEditing]       = useState<PromotionCampaign | null>(null);
  const [campaignCode,  setCampaignCode]  = useState('');
  const [campaignName,  setCampaignName]  = useState('');
  const [campaignType,  setCampaignType]  = useState('PERCENT');
  const [status,        setStatus]        = useState('ACTIVE');
  const [startsAt,      setStartsAt]      = useState('');
  const [endsAt,        setEndsAt]        = useState('');

  // ── Filter state ──
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType,   setFilterType]   = useState('');

  // ── Delete dialog ──
  const [deleteTarget, setDeleteTarget] = useState<PromotionCampaign | null>(null);

  const resetForm = () => {
    setEditing(null);
    setCampaignCode(''); setCampaignName('');
    setCampaignType('PERCENT'); setStatus('ACTIVE');
    setStartsAt(''); setEndsAt('');
  };

  const startEdit = (c: PromotionCampaign) => {
    setEditing(c);
    setCampaignCode(c.campaignCode);
    setCampaignName(c.campaignName);
    setCampaignType(c.campaignType);
    setStatus(c.status);
    setStartsAt(toDateTimeLocal(c.startsAt));
    setEndsAt(toDateTimeLocal(c.endsAt));
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!campaignCode.trim()) throw new Error('Vui lòng nhập mã chiến dịch');
      if (!campaignName.trim()) throw new Error('Vui lòng nhập tên chiến dịch');
      const payload = {
        campaignCode: campaignCode.trim(),
        campaignName: campaignName.trim(),
        campaignType,
        status,
        startsAt: toIso(startsAt),
        endsAt:   toIso(endsAt),
      };
      return editing
        ? adminApi.promotions.updateCampaign(editing.id, payload)
        : adminApi.promotions.createCampaign(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['promotions-campaigns'] });
      resetForm();
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.promotions.deleteCampaign(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['promotions-campaigns'] });
      setDeleteTarget(null);
    },
  });

  const canSubmit = useMemo(
    () => !!campaignCode.trim() && !!campaignName.trim() && !saveMutation.isPending,
    [campaignCode, campaignName, saveMutation.isPending]
  );

  const allCampaigns = listQuery.data ?? [];

  // KPI stats
  const now          = Date.now();
  const activeCount  = useMemo(() => allCampaigns.filter((c) => c.status === 'ACTIVE').length, [allCampaigns]);
  const upcomingCount = useMemo(
    () => allCampaigns.filter((c) => c.startsAt && new Date(c.startsAt).getTime() > now).length,
    [allCampaigns]
  );
  const expiredCount = useMemo(
    () => allCampaigns.filter((c) => c.endsAt && new Date(c.endsAt).getTime() < now).length,
    [allCampaigns]
  );

  // Filtered rows
  const rows = useMemo(() => {
    let list = allCampaigns;
    if (filterStatus) list = list.filter((c) => c.status === filterStatus);
    if (filterType)   list = list.filter((c) => c.campaignType === filterType);
    return list;
  }, [allCampaigns, filterStatus, filterType]);

  const hasFilter = filterStatus || filterType;

  return (
    <div className="page">

      {/* ── Delete confirm dialog ── */}
      {deleteTarget && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setDeleteTarget(null)}
        >
          <div className="card" style={{ width: 380, maxWidth: '90vw', margin: 0 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Xóa chiến dịch</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              <strong>{deleteTarget.campaignName}</strong> (<span className="mono">{deleteTarget.campaignCode}</span>) sẽ bị xóa vĩnh viễn.
            </div>
            {deleteMutation.isError && (
              <div className="inline-alert" style={{ marginBottom: 12 }}>
                {deleteMutation.error instanceof Error ? deleteMutation.error.message : 'Không thể xóa'}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="adm-button adm-button--ghost" type="button" onClick={() => setDeleteTarget(null)}>Hủy</button>
              <button
                className="adm-button adm-button--danger"
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
              >
                {deleteMutation.isPending ? 'Đang xóa…' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page__header">
        <div>
          <div className="page__title">Khuyến mãi</div>
          <div className="page__subtitle">Tạo và quản lý chiến dịch khuyến mãi</div>
        </div>
        <button
          className="adm-button adm-button--primary"
          type="button"
          onClick={() => { resetForm(); setShowForm((v) => !v); }}
        >
          {showForm && !editing ? '✕ Đóng' : '+ Tạo chiến dịch'}
        </button>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid--4">
        <div className="card">
          <div className="card__label">Tổng chiến dịch</div>
          <div className="card__value">{allCampaigns.length}</div>
          <div className="card__hint">Tất cả trạng thái</div>
        </div>
        <div className="card">
          <div className="card__label">Đang hoạt động</div>
          <div className="card__value" style={{ color: activeCount > 0 ? 'var(--emerald)' : undefined }}>
            {activeCount}
          </div>
          <div className="card__hint">Status = ACTIVE</div>
        </div>
        <div className="card">
          <div className="card__label">Sắp diễn ra</div>
          <div className="card__value" style={{ color: upcomingCount > 0 ? 'var(--warn)' : undefined }}>
            {upcomingCount}
          </div>
          <div className="card__hint">Ngày bắt đầu chưa tới</div>
        </div>
        <div className="card">
          <div className="card__label">Đã hết hạn</div>
          <div className="card__value" style={{ color: expiredCount > 0 ? 'var(--muted)' : undefined }}>
            {expiredCount}
          </div>
          <div className="card__hint">Ngày kết thúc đã qua</div>
        </div>
      </div>

      {/* ── Create / Edit form (collapsible) ── */}
      {showForm && (
        <div className="card">
          <div className="card__label">
            {editing ? `Chỉnh sửa: ${editing.campaignCode}` : 'Tạo chiến dịch mới'}
          </div>
          {saveMutation.isError && (
            <div className="inline-alert">
              {saveMutation.error instanceof Error ? saveMutation.error.message : 'Không thể lưu'}
            </div>
          )}
          <div className="form-grid">
            <label className="adm-field">
              <div className="adm-field__label">Mã chiến dịch</div>
              <input className="adm-input" value={campaignCode} onChange={(e) => setCampaignCode(e.target.value)} placeholder="PROMO_TET" />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Tên chiến dịch</div>
              <input className="adm-input" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Tết Sale" />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Loại</div>
              <select className="adm-input" value={campaignType} onChange={(e) => setCampaignType(e.target.value)}>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{TYPE_LABEL[t] ?? t}</option>
                ))}
              </select>
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Trạng thái</div>
              <select className="adm-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Bắt đầu</div>
              <input className="adm-input" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </label>
            <label className="adm-field">
              <div className="adm-field__label">Kết thúc</div>
              <input className="adm-input" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </label>
          </div>
          <div className="row-actions">
            <button className="adm-button adm-button--ghost" type="button" onClick={() => { resetForm(); setShowForm(false); }}>
              Hủy
            </button>
            <button className="adm-button adm-button--primary" type="button" onClick={() => saveMutation.mutate()} disabled={!canSubmit}>
              {saveMutation.isPending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo chiến dịch'}
            </button>
          </div>
        </div>
      )}

      {/* ── Filter + Table ── */}
      <div className="card">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
          <label className="adm-field" style={{ minWidth: 160 }}>
            <div className="adm-field__label">Trạng thái</div>
            <select className="adm-input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Tất cả</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="adm-field" style={{ minWidth: 180 }}>
            <div className="adm-field__label">Loại chiến dịch</div>
            <select className="adm-input" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Tất cả</option>
              {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{TYPE_LABEL[t] ?? t}</option>)}
            </select>
          </label>
          {hasFilter && (
            <button
              className="adm-button adm-button--ghost"
              type="button"
              style={{ alignSelf: 'flex-end' }}
              onClick={() => { setFilterStatus(''); setFilterType(''); }}
            >
              Xóa lọc
            </button>
          )}
          <span className="adm-chip" style={{ alignSelf: 'flex-end' }}>
            Hiển thị: {rows.length} / {allCampaigns.length}
          </span>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Mã</th>
                <th>Tên chiến dịch</th>
                <th>Loại</th>
                <th>Trạng thái</th>
                <th>Thời gian thực tế</th>
                <th>Bắt đầu</th>
                <th>Kết thúc</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr><td colSpan={9} className="muted">Đang tải…</td></tr>
              ) : listQuery.isError ? (
                <tr><td colSpan={9} className="muted">Không tải được danh sách.</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="muted">Chưa có dữ liệu</td></tr>
              ) : (
                rows.map((c: PromotionCampaign) => {
                  const ts = timeStatus(c);
                  return (
                    <tr key={c.id} style={editing?.id === c.id ? { background: 'rgba(var(--primary-rgb),0.04)' } : undefined}>
                      <td className="mono">{c.id}</td>
                      <td className="mono">{c.campaignCode}</td>
                      <td>{c.campaignName}</td>
                      <td>
                        <span className={`adm-badge ${TYPE_BADGE[c.campaignType] ?? 'adm-badge--muted'}`}>
                          {TYPE_LABEL[c.campaignType] ?? c.campaignType}
                        </span>
                      </td>
                      <td>
                        <span className={`adm-badge ${STATUS_BADGE[c.status] ?? 'adm-badge--muted'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        {ts
                          ? <span className={`adm-badge ${ts.cls}`}>{ts.label}</span>
                          : <span className="muted">—</span>
                        }
                      </td>
                      <td className="mono">{fmtDate(c.startsAt)}</td>
                      <td className="mono">{fmtDate(c.endsAt)}</td>
                      <td className="cell-actions">
                        <button className="adm-button adm-button--ghost" type="button" onClick={() => startEdit(c)}>
                          Sửa
                        </button>
                        <button
                          className="adm-button adm-button--ghost"
                          type="button"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => setDeleteTarget(c)}
                        >
                          Xóa
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
