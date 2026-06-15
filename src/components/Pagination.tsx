import React from 'react';

type Props = {
  page: number;           // 0-indexed
  totalPages: number;
  totalElements?: number;
  size?: number;
  onPageChange: (p: number) => void;
  onSizeChange?: (s: number) => void;
  sizeOptions?: number[];
};

function buildPages(current: number, total: number): (number | '...')[] {
  if (total <= 0) return [];
  const cur = current + 1; // convert to 1-indexed
  const set = new Set<number>([1, total]);
  for (let i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) set.add(i);
  const sorted = Array.from(set).sort((a, b) => a - b);
  const result: (number | '...')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('...');
    result.push(sorted[i]);
  }
  return result;
}

const btnBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: 34, height: 34, padding: '0 6px',
  borderRadius: 8, border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--text)',
  fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 400,
  cursor: 'pointer', transition: 'all 150ms ease',
  userSelect: 'none',
};

const btnActive: React.CSSProperties = {
  ...btnBase,
  background: 'var(--grad-primary)',
  border: 'none',
  color: '#fff',
  fontWeight: 700,
  boxShadow: '0 4px 16px rgba(var(--primary-rgb), 0.4)',
};

const btnDisabled: React.CSSProperties = {
  ...btnBase,
  opacity: 0.35,
  cursor: 'not-allowed',
};

export function Pagination({
  page,
  totalPages,
  totalElements,
  size,
  onPageChange,
  onSizeChange,
  sizeOptions = [10, 20, 50],
}: Props) {
  if (totalPages <= 0) return null;

  const pages = buildPages(page, totalPages);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 10, paddingTop: 14,
      borderTop: '1px solid var(--border)',
    }}>
      {/* Left: total info + size selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {totalElements != null && (
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            Tổng: <strong style={{ color: 'var(--text)' }}>{totalElements.toLocaleString('vi-VN')}</strong> bản ghi
          </span>
        )}
        {onSizeChange && (
          <select
            className="adm-input"
            style={{ width: 80, padding: '3px 6px', fontSize: 12 }}
            value={String(size ?? 20)}
            onChange={(e) => { onSizeChange(Number(e.target.value)); onPageChange(0); }}
          >
            {sizeOptions.map((s) => (
              <option key={s} value={String(s)}>{s} / trang</option>
            ))}
          </select>
        )}
      </div>

      {/* Right: page buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Prev */}
        <button
          style={page <= 0 ? btnDisabled : btnBase}
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          ←
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} style={{ ...btnBase, border: 'none', cursor: 'default', color: 'var(--muted)' }}>
              …
            </span>
          ) : (
            <button
              key={p}
              style={p - 1 === page ? btnActive : btnBase}
              onClick={() => onPageChange(p - 1)}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          style={page >= totalPages - 1 ? btnDisabled : btnBase}
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          →
        </button>
      </div>
    </div>
  );
}
