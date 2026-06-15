import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, Tag, ClipboardList, AlertTriangle, Package, CalendarClock,
  ArrowUpRight, TrendingUp,
} from 'lucide-react';
import { adminApi } from '../api/adminApi';

const fmt = (n: number) => n.toLocaleString('vi-VN');

const SHIFT_LABELS: Record<string, string> = { S: 'Ca Sáng', C: 'Ca Chiều', G: 'Ca Gãy' };
const SHIFT_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  S: { bg: 'rgba(249,115,22,0.08)',  color: 'var(--primary)', border: 'rgba(249,115,22,0.18)' },
  C: { bg: 'rgba(14,165,233,0.08)',  color: 'var(--cyan)',    border: 'rgba(14,165,233,0.18)' },
  G: { bg: 'rgba(139,92,246,0.08)', color: 'var(--purple)',  border: 'rgba(139,92,246,0.18)' },
};

function StatCard({
  label, value, hint, icon, bar, iconBg, iconColor, valueColor, loading, to,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  bar: string;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
  loading?: boolean;
  to?: string;
}) {
  return (
    <div style={{
      background: 'var(--panel)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: '0 2px 16px -4px rgba(60,20,80,0.09), 0 1px 3px rgba(60,20,80,0.05)',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'box-shadow 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px -6px rgba(60,20,80,0.15), 0 2px 8px rgba(60,20,80,0.07)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 16px -4px rgba(60,20,80,0.09), 0 1px 3px rgba(60,20,80,0.05)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      <div style={{ height: 4, background: bar, flexShrink: 0 }} />
      <div style={{ padding: '18px 20px 18px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.7px',
              textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8,
            }}>
              {label}
            </div>
            <div style={{
              fontSize: 36, fontWeight: 800, lineHeight: 1,
              color: valueColor ?? 'var(--text)',
              letterSpacing: '-1px',
            }}>
              {loading ? <span style={{ fontSize: 22, color: 'var(--muted)', fontWeight: 400 }}>…</span> : value}
            </div>
          </div>
          <div style={{
            width: 44, height: 44, borderRadius: 13, flexShrink: 0,
            background: iconBg, display: 'grid', placeItems: 'center',
            color: iconColor,
          }}>
            {icon}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          {to ? (
            <Link
              to={to}
              style={{ color: iconColor, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}
            >
              {hint} <ArrowUpRight size={11} />
            </Link>
          ) : hint}
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const opsQuery = useQuery({
    queryKey: ['ops-monitor'],
    queryFn: () => adminApi.ops.monitor(),
    refetchInterval: 30000,
  });
  const customersQuery = useQuery({
    queryKey: ['admin-customers-count'],
    queryFn: () => adminApi.users.count('CUSTOMER'),
    staleTime: 60000,
  });
  const inventoryQuery = useQuery({
    queryKey: ['inventory'],
    queryFn: () => adminApi.inventory.listAll(),
    staleTime: 60000,
  });
  const promotionsQuery = useQuery({
    queryKey: ['promotions-dashboard'],
    queryFn: () => adminApi.promotions.listCampaigns(),
    staleTime: 60000,
  });
  const pendingShiftsQuery = useQuery({
    queryKey: ['staff-shifts-pending'],
    queryFn: () => adminApi.staffShifts.list('PENDING'),
    staleTime: 30000,
  });
  const approvedShiftsQuery = useQuery({
    queryKey: ['staff-shifts-approved'],
    queryFn: () => adminApi.staffShifts.list('APPROVED'),
    staleTime: 30000,
    refetchInterval: 60000,
  });
  const purchaseOrdersQuery = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => adminApi.purchaseOrders.list(),
    staleTime: 60000,
  });

  const lowStockItems = useMemo(
    () => (inventoryQuery.data ?? [])
      .filter(it => it.availableQuantity < 10)
      .sort((a, b) => a.availableQuantity - b.availableQuantity)
      .slice(0, 8),
    [inventoryQuery.data],
  );

  const todayWorkingStaff = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (approvedShiftsQuery.data ?? []).filter(r => r.workDate === today);
  }, [approvedShiftsQuery.data]);

  const activePromotions = useMemo(
    () => (promotionsQuery.data ?? []).filter(p => p.status === 'ACTIVE').length,
    [promotionsQuery.data],
  );
  const pendingShiftsCount = (pendingShiftsQuery.data ?? []).length;
  const draftPoCount = useMemo(
    () => (purchaseOrdersQuery.data ?? []).filter(p => (p.status ?? '').toUpperCase() === 'DRAFT').length,
    [purchaseOrdersQuery.data],
  );
  const totalCustomers = customersQuery.data ?? 0;
  const slaRisk = opsQuery.data?.stagnantOrders.length ?? 0;
  const stagnantOrders = opsQuery.data?.stagnantOrders ?? [];

  const now = new Date();
  const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="page" style={{ gap: 28 }}>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #f97316 0%, #ec4899 55%, #8b5cf6 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px 28px',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 8px 32px -8px rgba(249,115,22,0.45)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <TrendingUp size={20} strokeWidth={2.5} />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.5px', opacity: 0.9 }}>TRUNG TÂM CHỈ HUY</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1 }}>Dashboard</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>Tổng quan vận hành thời gian thực</div>
        </div>
        <div style={{ textAlign: 'right', opacity: 0.85 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.3px' }}>{dateStr}</div>
          {slaRisk > 0 && (
            <div style={{
              marginTop: 8, background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(8px)', borderRadius: 99,
              padding: '4px 12px', fontSize: 12, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <AlertTriangle size={12} />
              {slaRisk} đơn sắp trễ SLA
            </div>
          )}
        </div>
      </div>

      {/* ── 6 KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatCard
          label="Khách hàng"
          value={fmt(totalCustomers)}
          hint="Tổng tài khoản CUSTOMER"
          icon={<Users size={20} strokeWidth={2} />}
          bar="linear-gradient(90deg, #0ea5e9, #8b5cf6)"
          iconBg="rgba(14,165,233,0.12)"
          iconColor="var(--cyan)"
          loading={customersQuery.isLoading}
        />
        <StatCard
          label="Khuyến mãi đang chạy"
          value={fmt(activePromotions)}
          hint="Xem chiến dịch"
          icon={<Tag size={20} strokeWidth={2} />}
          bar="linear-gradient(90deg, #ec4899, #f97316)"
          iconBg="rgba(236,72,153,0.12)"
          iconColor="var(--pink)"
          loading={promotionsQuery.isLoading}
          to="/supply/promotions"
        />
        <StatCard
          label="Phiếu nhập nháp"
          value={fmt(draftPoCount)}
          hint="Xem phiếu nhập"
          icon={<ClipboardList size={20} strokeWidth={2} />}
          bar="linear-gradient(90deg, #8b5cf6, #0ea5e9)"
          iconBg="rgba(139,92,246,0.12)"
          iconColor="var(--purple)"
          loading={purchaseOrdersQuery.isLoading}
          to="/supply/purchase-orders"
        />
        <StatCard
          label="Sắp trễ SLA"
          value={fmt(slaRisk)}
          hint="≤ 15 phút đến deadline"
          icon={<AlertTriangle size={20} strokeWidth={2} />}
          bar="linear-gradient(90deg, #ef4444, #f97316)"
          iconBg="rgba(239,68,68,0.12)"
          iconColor="var(--danger)"
          valueColor={slaRisk > 0 ? 'var(--danger)' : undefined}
          loading={opsQuery.isLoading}
        />
        <StatCard
          label="Tồn kho thấp"
          value={fmt(lowStockItems.length)}
          hint="Variants < 10 đơn vị"
          icon={<Package size={20} strokeWidth={2} />}
          bar="linear-gradient(90deg, #f59e0b, #84cc16)"
          iconBg="rgba(245,158,11,0.12)"
          iconColor="var(--warn)"
          valueColor={lowStockItems.length > 0 ? 'var(--warn)' : undefined}
          loading={inventoryQuery.isLoading}
        />
        <StatCard
          label="Ca làm chờ duyệt"
          value={fmt(pendingShiftsCount)}
          hint="Xem lịch làm việc"
          icon={<CalendarClock size={20} strokeWidth={2} />}
          bar="linear-gradient(90deg, #10b981, #0ea5e9)"
          iconBg="rgba(16,185,129,0.12)"
          iconColor="var(--emerald)"
          valueColor={pendingShiftsCount > 0 ? 'var(--emerald)' : undefined}
          loading={pendingShiftsQuery.isLoading}
          to="/staff-management"
        />
      </div>

      {/* ── Nhân sự hôm nay ── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Nhân sự hôm nay</span>
          {!approvedShiftsQuery.isLoading && (
            <span style={{
              background: 'rgba(16,185,129,0.12)', color: 'var(--emerald)',
              fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
            }}>
              {todayWorkingStaff.length} người đang làm
            </span>
          )}
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>
        <div style={{
          background: 'var(--panel)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)', padding: '16px 20px',
          boxShadow: '0 2px 12px -4px rgba(60,20,80,0.07)',
        }}>
          {approvedShiftsQuery.isLoading ? (
            <div className="muted" style={{ fontSize: 13 }}>Đang tải…</div>
          ) : todayWorkingStaff.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', fontSize: 13 }}>
              <CalendarClock size={16} />
              Chưa có ca nào được duyệt cho hôm nay.{' '}
              <Link to="/staff-management" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                Xem lịch làm việc →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {todayWorkingStaff.map(r => {
                const st = SHIFT_STYLE[r.shiftType] ?? SHIFT_STYLE['S'];
                const initial = (r.staffName ?? '?').trim().split(' ').at(-1)?.slice(0, 1).toUpperCase() ?? '?';
                return (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px',
                    border: `1px solid ${st.border}`,
                    borderRadius: 'var(--radius-lg)',
                    background: st.bg,
                    minWidth: 180, flex: '0 0 auto',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 11,
                      background: st.color,
                      display: 'grid', placeItems: 'center',
                      fontWeight: 900, fontSize: 14, color: '#fff',
                      flexShrink: 0,
                    }}>
                      {initial}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.staffName ?? '-'}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        {SHIFT_LABELS[r.shiftType] ?? r.shiftType}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Cảnh báo & SLA ── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Cảnh báo & Kho</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Low stock */}
          <div style={{
            background: 'var(--panel)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)', overflow: 'hidden',
            boxShadow: '0 2px 12px -4px rgba(60,20,80,0.07)',
          }}>
            <div style={{
              padding: '14px 18px 12px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9,
                background: 'rgba(245,158,11,0.12)',
                display: 'grid', placeItems: 'center',
                color: 'var(--warn)',
              }}>
                <Package size={15} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Cảnh báo tồn kho thấp</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Variants còn &lt; 10 đơn vị</div>
              </div>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {inventoryQuery.isLoading ? (
                <div className="muted" style={{ fontSize: 13 }}>Đang tải…</div>
              ) : lowStockItems.length === 0 ? (
                <div style={{ color: 'var(--emerald)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  ✓ Tất cả hàng đang đủ tồn kho
                </div>
              ) : lowStockItems.map(it => (
                <div key={it.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '7px 11px', borderRadius: 10,
                  border: `1px solid ${it.availableQuantity === 0 ? 'rgba(239,68,68,0.25)' : 'var(--border)'}`,
                  background: it.availableQuantity === 0 ? 'rgba(239,68,68,0.05)' : 'var(--panel-2)',
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{it.productName}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                      {it.variantName} · {it.warehouseName}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                    background: it.availableQuantity === 0 ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                    color: it.availableQuantity === 0 ? 'var(--danger)' : 'var(--warn)',
                    whiteSpace: 'nowrap',
                  }}>
                    {it.availableQuantity} còn
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SLA risk */}
          <div style={{
            background: 'var(--panel)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)', overflow: 'hidden',
            boxShadow: '0 2px 12px -4px rgba(60,20,80,0.07)',
          }}>
            <div style={{
              padding: '14px 18px 12px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9,
                background: 'rgba(239,68,68,0.12)',
                display: 'grid', placeItems: 'center',
                color: 'var(--danger)',
              }}>
                <AlertTriangle size={15} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Đơn chờ lâu (SLA risk)</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Top 10 đơn sắp trễ deadline</div>
              </div>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {opsQuery.isLoading ? (
                <div className="muted" style={{ fontSize: 13 }}>Đang tải…</div>
              ) : stagnantOrders.length === 0 ? (
                <div style={{ color: 'var(--emerald)', fontSize: 13 }}>
                  ✓ Không có đơn nào sắp trễ SLA
                </div>
              ) : stagnantOrders.slice(0, 10).map(o => (
                <div key={o.orderId} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '7px 11px', borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--panel-2)',
                }}>
                  <div style={{ fontWeight: 600, fontSize: 12, fontFamily: 'monospace' }}>
                    #{o.orderNumber || o.orderId}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                    background: 'rgba(239,68,68,0.1)', color: 'var(--danger)',
                  }}>
                    {o.minutesToSla != null ? `còn ${o.minutesToSla}m` : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
