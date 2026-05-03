import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminApi, type ResolveType } from '../api/adminApi';

const RESOLVE_TYPES: ResolveType[] = ['SUBSTITUTE', 'PARTIAL', 'CANCEL_LINE', 'CANCEL_ORDER'];

export function AdminIssueDetailPage() {
  const { id } = useParams();
  const issueId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [resolutionType, setResolutionType] = useState<ResolveType>('CANCEL_LINE');
  const [releaseOrder, setReleaseOrder] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [keyword, setKeyword] = useState('');
  const [substituteProductId, setSubstituteProductId] = useState<number | undefined>(undefined);
  const [partialQuantity, setPartialQuantity] = useState('');

  const issueQuery = useQuery({
    queryKey: ['admin-issue-detail', issueId],
    queryFn: () => adminApi.issues.detail(issueId),
    enabled: Number.isFinite(issueId) && issueId > 0,
  });

  const substitutionsQuery = useQuery({
    queryKey: ['admin-issue-substitutions', issueId, keyword],
    queryFn: () => adminApi.issues.substitutions(issueId, keyword.trim() || undefined),
    enabled: resolutionType === 'SUBSTITUTE' && Number.isFinite(issueId) && issueId > 0,
  });

  const resolveMutation = useMutation({
    mutationFn: () =>
      adminApi.issues.resolve(issueId, {
        resolutionType,
        releaseOrder,
        resolutionNotes: resolutionNotes.trim() || undefined,
        substituteProductId: resolutionType === 'SUBSTITUTE' ? substituteProductId : undefined,
        partialQuantity: resolutionType === 'PARTIAL' ? Number(partialQuantity) : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-issues-open'] });
      navigate('/issues');
    },
  });

  const canSubmit = useMemo(() => {
    if (resolutionType === 'SUBSTITUTE' && !substituteProductId) return false;
    if (resolutionType === 'PARTIAL') {
      const q = Number(partialQuantity);
      if (!Number.isInteger(q) || q < 0) return false;
    }
    return !resolveMutation.isPending;
  }, [partialQuantity, resolutionType, resolveMutation.isPending, substituteProductId]);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">Issue #{issueId || ''}</div>
          <div className="page__subtitle">Màn hình xử lý sự cố của ADMIN.</div>
        </div>
        <Link className="adm-button adm-button--ghost" to="/issues">Quay lại</Link>
      </div>

      {issueQuery.isLoading ? (
        <div className="card"><div className="muted">Đang tải...</div></div>
      ) : issueQuery.isError || !issueQuery.data ? (
        <div className="card"><div className="muted">Không tải được chi tiết issue.</div></div>
      ) : (
        <>
          <div className="card">
            <div className="card__label">{issueQuery.data.issueType}</div>
            <div className="muted">Order #{issueQuery.data.orderId ?? 'N/A'} • {issueQuery.data.status}</div>
          </div>

          <div className="card">
            <div className="card__label">Quyết định xử lý</div>
            <div className="row-actions" style={{ flexWrap: 'wrap' }}>
              {RESOLVE_TYPES.map((t) => (
                <button
                  key={t}
                  className={`adm-button ${resolutionType === t ? '' : 'adm-button--ghost'}`}
                  onClick={() => setResolutionType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {resolutionType === 'SUBSTITUTE' ? (
            <div className="card">
              <div className="card__label">Sản phẩm thay thế</div>
              <input
                className="input"
                placeholder="Tìm theo tên/SKU"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <div className="list" style={{ marginTop: 10 }}>
                {(substitutionsQuery.data ?? []).slice(0, 10).map((it) => (
                  <div className="list__row" key={it.variantId}>
                    <div className="muted">{it.name} • tồn: {it.stock} {it.isRecommended ? '(gợi ý)' : ''}</div>
                    <button className="adm-button adm-button--ghost" onClick={() => setSubstituteProductId(it.variantId)}>
                      {substituteProductId === it.variantId ? 'Đã chọn' : 'Chọn'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {resolutionType === 'PARTIAL' ? (
            <div className="card">
              <div className="card__label">Số lượng giao thực tế</div>
              <input className="input" value={partialQuantity} onChange={(e) => setPartialQuantity(e.target.value)} placeholder="Nhập số lượng" />
            </div>
          ) : null}

          <div className="card">
            <label className="row-actions">
              <input type="checkbox" checked={releaseOrder} onChange={(e) => setReleaseOrder(e.target.checked)} />
              <span className="muted">Nhả lại vào hàng đợi (PENDING)</span>
            </label>
            <textarea
              className="input"
              style={{ minHeight: 80, marginTop: 10 }}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Ghi chú xử lý"
            />
          </div>

          <div className="row-actions">
            <button className="adm-button" disabled={!canSubmit} onClick={() => resolveMutation.mutate()}>
              {resolveMutation.isPending ? 'Đang xử lý...' : 'Xác nhận'}
            </button>
            <Link className="adm-button adm-button--ghost" to="/issues">Hủy</Link>
          </div>
        </>
      )}
    </div>
  );
}
