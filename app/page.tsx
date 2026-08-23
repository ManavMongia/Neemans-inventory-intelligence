'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Calendar, ChevronDown, Bell, RefreshCw, ArrowUp, ArrowDown, X } from 'lucide-react';
import AlertBanner from '@/components/AlertBanner';
import InsightsPanel from '@/components/InsightsPanel';
import { fetchKPIs, fetchAlerts, fetchInsights, fetchInventory, fetchWarehouses } from '@/lib/api';
import Link from 'next/link';

const DATE_OPTIONS = [
  { label: 'Last 7 days',  days: 7  },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

function Dropdown({ label, icon: Icon, options, value, onChange }: {
  label: string; icon?: any;
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const selected = options.find(o => o.value === value);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="topbar-filter" onClick={() => setOpen(v => !v)}>
        {Icon && <Icon size={13} />}
        {selected?.label || label}
        <ChevronDown size={12} style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          minWidth: 160, zIndex: 100, overflow: 'hidden',
        }}>
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '9px 14px', fontSize: 13,
                background: o.value === value ? 'var(--surface-2)' : 'none',
                color: o.value === value ? 'var(--text-100)' : 'var(--text-300)',
                fontWeight: o.value === value ? 600 : 400,
                border: 'none', cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = o.value === value ? 'var(--surface-2)' : 'none')}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const DONUT_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#7c3aed'];
const DONUT_LABELS = ['Critical', 'Low', 'Healthy', 'Overstock'];

// Simulated "previous period" multiplier for trend lines
function buildTrendData(skus: any[], days: number = 14) {
  const now = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    const base = skus.reduce((a: number, s: any) => a + s.qty_on_hand, 0);
    const noise = () => (Math.random() - 0.5) * base * 0.08;
    const current  = Math.round(Math.max(0, base * (0.85 + i * 0.01) + noise()));
    const previous = Math.round(Math.max(0, base * (0.80 + i * 0.008) + noise()));
    return { label, current, previous };
  });
}

export default function DashboardPage() {
  const [kpis, setKpis]         = useState<any>(null);
  const [alerts, setAlerts]     = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [trendData, setTrend]   = useState<any[]>([]);
  const [topSkus, setTopSkus]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [iLoading, setILoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('14');
  const [location, setLocation]   = useState('');
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [k, a, i, inv, whs] = await Promise.all([
        fetchKPIs(),
        fetchAlerts(),
        fetchInsights().catch(() => null),
        fetchInventory({ sort_by: 'avg_daily_sales', order: 'desc', warehouse: location || undefined }),
        warehouses.length ? Promise.resolve(null) : fetchWarehouses(),
      ]);
      setKpis(k);
      setAlerts(a);
      setInsights(i);
      setILoading(false);
      setTrend(buildTrendData(inv, Number(dateRange)));
      setTopSkus((inv as any[]).slice(0, 5));
      if (whs?.length) setWarehouses(whs);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [location, dateRange]);

  useEffect(() => { load(); }, [load]);

  const kpiCards = [
    {
      label: 'Total SKUs',
      value: kpis?.total_skus ?? '—',
      sub: `vs ${kpis?.total_locations ?? 0} locations`,
      pct: '+2.4%', up: true,
      dot: '#2563eb',
    },
    {
      label: 'Critical / Stockout',
      value: kpis?.critical_count ?? '—',
      sub: `${kpis?.stockout_count ?? 0} complete stockouts`,
      pct: '+12.0%', up: false,
      dot: '#ef4444',
    },
    {
      label: 'Avg Days of Cover',
      value: kpis?.avg_days_of_cover ?? '—',
      sub: 'Across all SKUs',
      pct: '-3.1%', up: false,
      dot: '#f59e0b',
    },
    {
      label: 'Healthy SKUs',
      value: kpis?.healthy_count ?? '—',
      sub: `${kpis?.overstock_count ?? 0} overstocked`,
      pct: '+4.3%', up: true,
      dot: '#16a34a',
    },
  ];

  const donutData = kpis ? [
    { name: 'Critical',  value: kpis.critical_count  || 0 },
    { name: 'Low',       value: kpis.low_stock_count  || 0 },
    { name: 'Healthy',   value: kpis.healthy_count    || 0 },
    { name: 'Overstock', value: kpis.overstock_count  || 0 },
  ] : [];
  const donutTotal = donutData.reduce((s, d) => s + d.value, 0);

  const criticalAlerts = alerts.filter(a => a.severity === 'critical').slice(0, 3);
  const lowAlerts      = alerts.filter(a => a.severity === 'warning').slice(0, 2);

  // SKU category icons
  const skuEmoji = (cat: string) => {
    if (cat.includes('Running'))    return '🏃';
    if (cat.includes('Cushioned'))  return '🥾';
    if (cat.includes('Kids'))       return '🧒';
    if (cat.includes('Gift'))       return '🎁';
    if (cat.includes('Compress'))   return '💪';
    return '🧦';
  };

  const CustomAreaTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow-md)', fontSize: 12 }}>
        <div style={{ color: 'var(--text-300)', marginBottom: 6, fontWeight: 500 }}>{label}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#111827', display: 'inline-block' }} />
            <span style={{ color: 'var(--text-100)', fontWeight: 600 }}>{payload[0]?.value?.toLocaleString()} units</span>
          </div>
          {payload[1] && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d1d5db', display: 'inline-block' }} />
              <span style={{ color: 'var(--text-300)' }}>{payload[1].value?.toLocaleString()} prev.</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-title">Overview</div>
        <div className="topbar-right">
          {/* Date range filter */}
          <Dropdown
            label="Last 14 days"
            icon={Calendar}
            options={DATE_OPTIONS.map(d => ({ label: d.label, value: String(d.days) }))}
            value={dateRange}
            onChange={setDateRange}
          />

          {/* Location filter */}
          <Dropdown
            label="All Locations"
            options={[{ label: 'All Locations', value: '' }, ...warehouses.map(w => ({ label: w, value: w }))]}
            value={location}
            onChange={setLocation}
          />

          {/* Refresh button */}
          <button
            className="topbar-bell"
            onClick={() => load(true)}
            title="Refresh data"
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.65s linear infinite' : 'none' }} />
          </button>

          {/* Bell / Alert Notifications */}
          <div style={{ position: 'relative' }}>
            <button
              className="topbar-bell"
              onClick={() => setShowAlerts(v => !v)}
              title="Alert Notifications"
              style={{ background: showAlerts ? 'var(--surface-2)' : 'var(--surface)' }}
            >
              <Bell size={14} />
              {alerts.length > 0 && <div className="topbar-bell-dot" />}
            </button>

            {showAlerts && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                width: 320, zIndex: 100, overflow: 'hidden',
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-100)' }}>Active Alerts</span>
                  <span style={{ fontSize: 11, background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                    {alerts.length} critical
                  </span>
                </div>
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {alerts.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-400)' }}>No active alerts</div>
                  ) : (
                    alerts.slice(0, 5).map((a, i) => (
                      <Link
                        key={i}
                        href={`/inventory/${a.sku_id}`}
                        onClick={() => setShowAlerts(false)}
                        style={{
                          display: 'block', padding: '10px 14px', borderBottom: '1px solid var(--border)',
                          textDecoration: 'none', transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-100)' }}>{a.product_name}</span>
                          <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700 }}>{a.status}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-400)' }}>
                          {a.warehouse} · {a.qty_on_hand} units remaining
                        </div>
                      </Link>
                    ))
                  )}
                </div>
                <Link
                  href="/inventory?status=Critical"
                  onClick={() => setShowAlerts(false)}
                  style={{
                    display: 'block', textAlign: 'center', padding: '10px', fontSize: 12,
                    fontWeight: 600, color: '#2563eb', textDecoration: 'none', background: 'var(--surface-2)',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  View all in Inventory →
                </Link>
              </div>
            )}
          </div>

          {/* User Avatar */}
          <div className="topbar-avatar" title="Neeman's Inventory Manager">NM</div>
        </div>
      </div>

      <div className="page-content">
        {/* KPI Cards */}
        <div className="kpi-grid">
          {kpiCards.map(({ label, value, sub, pct, up, dot }) => (
            <div key={label} className="kpi-card">
              <div className="kpi-card-header">
                <div className="kpi-label">{label}</div>
                <span className={`kpi-badge ${up ? 'up' : 'down'}`}>
                  {up ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                  {pct}
                </span>
              </div>
              <div className="kpi-value">
                {loading
                  ? <div className="skel" style={{ width: 80, height: 30 }} />
                  : <>{value}<span className="kpi-value-dot" style={{ background: dot }} /></>}
              </div>
              <div className="kpi-sub">{sub}</div>
            </div>
          ))}
        </div>

        {/* Row 2: Area Chart + Donut */}
        <div className="dash-row dash-row-2-1" style={{ marginBottom: 20 }}>
          {/* Stock Levels Over Time */}
          <div className="card">
            <div style={{ padding: '16px 22px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">Stock levels over time</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--text-400)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#111827', display: 'inline-block' }} />
                  Current period
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d1d5db', display: 'inline-block' }} />
                  Previous period
                </span>
              </div>
            </div>
            <div style={{ padding: '0 22px 20px' }}>
              {loading ? (
                <div className="skel" style={{ height: 220 }} />
              ) : (
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradCurr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#111827" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradPrev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#9ca3af" stopOpacity={0.08} />
                          <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomAreaTooltip />} />
                      <Area type="monotone" dataKey="previous" stroke="#d1d5db" strokeWidth={1.5} fill="url(#gradPrev)" dot={false} />
                      <Area type="monotone" dataKey="current"  stroke="#111827" strokeWidth={2}   fill="url(#gradCurr)" dot={{ r: 3, fill: '#111827', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#111827' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Status Distribution Donut */}
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom: 16 }}>Status distribution</div>
            {loading ? (
              <div className="skel" style={{ height: 220 }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} dataKey="value" startAngle={90} endAngle={-270}>
                        {donutData.map((_, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-100)', letterSpacing: '-0.5px' }}>{donutTotal}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-400)', marginTop: 1 }}>Total rows</div>
                  </div>
                </div>
                <div className="donut-legend" style={{ flex: 1 }}>
                  {donutData.map((d, i) => (
                    <div key={d.name} className="donut-legend-item">
                      <div className="donut-legend-dot" style={{ background: DONUT_COLORS[i] }} />
                      <span className="donut-legend-label">{d.name}</span>
                      <span className="donut-legend-value">{d.value}</span>
                      <span className="donut-legend-pct">({donutTotal ? Math.round(d.value / donutTotal * 100) : 0}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Active Alerts + Top SKUs by Velocity */}
        <div className="dash-row dash-row-2">
          {/* Active Alerts */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Active alerts</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link href="/inventory?status=Critical" style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none' }}>View all</Link>
                <button className="card-action">
                  <ChevronDown size={13} />
                </button>
              </div>
            </div>
            {loading ? (
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => <div key={i} className="skel" style={{ height: 56 }} />)}
              </div>
            ) : [...criticalAlerts, ...lowAlerts].length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                All inventory levels are healthy
              </div>
            ) : (
              <div>
                {[...criticalAlerts, ...lowAlerts].map((alert, i) => (
                  <AlertBanner
                    key={i}
                    narrative={alert.narrative}
                    severity={alert.severity}
                    skuId={alert.sku_id}
                    productName={alert.product_name}
                    warehouse={alert.warehouse}
                    daysOfCover={alert.days_of_cover}
                    qtyOnHand={alert.qty_on_hand}
                  />
                ))}
                {alerts.length > 5 && (
                  <Link href="/inventory?status=Critical"
                    style={{ display: 'block', textAlign: 'center', padding: '12px', fontSize: 12.5, color: '#2563eb', textDecoration: 'none', borderTop: '1px solid var(--border)' }}>
                    +{alerts.length - 5} more alerts →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Top SKUs by Daily Sales */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Top SKUs by velocity</div>
              <button className="card-action"><ChevronDown size={13} /></button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Avg Daily Sales</th>
                  <th>Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? [1,2,3,4,5].map(i => (
                      <tr key={i}>
                        <td colSpan={4}><div className="skel" style={{ height: 20 }} /></td>
                      </tr>
                    ))
                  : topSkus.map((sku, i) => (
                      <tr key={i} onClick={() => window.location.href = `/inventory/${sku.sku_id}`}>
                        <td>
                          <div className="sku-cell">
                            <div className="sku-icon">{skuEmoji(sku.category)}</div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-100)', fontSize: 13 }}>{sku.product_name.replace(' Socks', '').replace(' - ', ' ')}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-400)' }}>{sku.warehouse}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{sku.avg_daily_sales}</td>
                        <td style={{ color: sku.qty_on_hand < sku.reorder_point ? 'var(--red)' : 'var(--text-200)', fontWeight: sku.qty_on_hand < sku.reorder_point ? 600 : 400 }}>
                          {sku.qty_on_hand}
                        </td>
                        <td>
                          <span className={`badge badge-${sku.status.toLowerCase()}`}>
                            <span className="badge-dot" style={{ background: sku.status === 'Critical' ? '#dc2626' : sku.status === 'Low' ? '#d97706' : sku.status === 'Overstock' ? '#7c3aed' : '#16a34a' }} />
                            {sku.status}
                          </span>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Insights Row */}
        {!iLoading && insights && (
          <div className="card card-pad" style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div className="card-title">AI Insights</div>
              <span style={{ fontSize: 11, color: 'var(--text-400)' }}>Powered by Claude</span>
            </div>
            <InsightsPanel
              summary={insights.executive_summary}
              generatedAt={insights.generated_at}
              modelUsed={insights.model_used}
            />
          </div>
        )}
      </div>
    </>
  );
}
