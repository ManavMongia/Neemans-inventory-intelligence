'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ArrowLeft, MapPin, ShoppingCart } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { fetchSKU, fetchSKUTrend } from '@/lib/api';

const SKU_EMOJI = (cat: string) => {
  if (cat.includes('Running'))   return '🏃';
  if (cat.includes('Cushioned')) return '🥾';
  if (cat.includes('Kids'))      return '🧒';
  if (cat.includes('Gift'))      return '🎁';
  if (cat.includes('Compress'))  return '💪';
  return '🧦';
};

export default function SKUDetailPage() {
  const router = useRouter();
  const { sku_id } = useParams() as { sku_id: string };

  const [rows, setRows]   = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchSKU(sku_id), fetchSKUTrend(sku_id)])
      .then(([r, t]) => { setRows(r); setTrend(t); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sku_id]);

  if (loading) {
    return (
      <>
        <div className="topbar"><div className="topbar-title">SKU Detail</div></div>
        <div className="page-content">
          <button onClick={() => router.back()} className="back-link"><ArrowLeft size={14} />Back</button>
          <div className="skel" style={{ height: 32, width: '35%', marginBottom: 20 }} />
          <div className="sku-metrics-grid">
            {[1,2,3,4].map(i => <div key={i} className="metric-tile"><div className="skel" style={{ height: 48 }} /></div>)}
          </div>
        </div>
      </>
    );
  }

  if (!rows.length) {
    return (
      <>
        <div className="topbar"><div className="topbar-title">SKU Detail</div></div>
        <div className="page-content">
          <button onClick={() => router.back()} className="back-link"><ArrowLeft size={14} />Back</button>
          <div className="empty-state"><div className="empty-icon">🔍</div>SKU not found</div>
        </div>
      </>
    );
  }

  const primary    = rows[0];
  const totalQty   = rows.reduce((a, s) => a + s.qty_on_hand, 0);
  const totalSales = rows.reduce((a, s) => a + s.avg_daily_sales, 0);
  const avgDoc     = totalSales > 0 ? (totalQty / totalSales).toFixed(1) : null;
  const reorderQty = rows.reduce((a, s) => a + (s.reorder_recommendation_qty || 0), 0);
  const worstStatus = ['Critical', 'Low', 'Overstock', 'Healthy'].find(s => rows.some(r => r.status === s)) || 'Healthy';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', boxShadow: 'var(--shadow)', fontSize: 12 }}>
        <div style={{ color: 'var(--text-300)', marginBottom: 3 }}>{label}</div>
        <div style={{ fontWeight: 600, color: 'var(--text-100)' }}>{payload[0].value} units</div>
      </div>
    );
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">SKU Detail</div>
        <div className="topbar-right">
          <StatusBadge status={worstStatus} />
        </div>
      </div>

      <div className="page-content">
        <button onClick={() => router.back()} className="back-link">
          <ArrowLeft size={14} /> Back to Inventory
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 22 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, flexShrink: 0,
          }}>
            {SKU_EMOJI(primary.category)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <code style={{
                fontSize: 11.5, background: 'var(--surface-2)',
                border: '1px solid var(--border)', borderRadius: 5,
                padding: '2px 8px', color: 'var(--text-300)',
              }}>{sku_id}</code>
              <span className="tag">{primary.category}</span>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-100)', letterSpacing: '-0.3px' }}>
              {primary.product_name}
            </h1>
          </div>
        </div>

        {/* Metric Tiles */}
        <div className="sku-metrics-grid">
          <div className="metric-tile">
            <div className="metric-label">Total Qty on Hand</div>
            <div className="metric-value" style={{ color: totalQty === 0 ? 'var(--red)' : 'var(--text-100)' }}>
              {totalQty === 0 ? '⚠ 0' : totalQty}
            </div>
            <div className="metric-unit">{rows.length} location{rows.length > 1 ? 's' : ''}</div>
          </div>
          <div className="metric-tile">
            <div className="metric-label">Days of Cover</div>
            <div className="metric-value" style={{ color: Number(avgDoc) < 7 ? 'var(--red)' : 'var(--text-100)' }}>
              {avgDoc ?? '—'}
            </div>
            <div className="metric-unit">days remaining</div>
          </div>
          <div className="metric-tile">
            <div className="metric-label">Avg Daily Sales</div>
            <div className="metric-value">{totalSales.toFixed(1)}</div>
            <div className="metric-unit">units / day</div>
          </div>
          <div className="metric-tile">
            <div className="metric-label">Sell-Through</div>
            <div className="metric-value">{primary.sell_through_rate != null ? `${primary.sell_through_rate}%` : '—'}</div>
            <div className="metric-unit">30-day estimate</div>
          </div>
        </div>

        {/* Two-column: Chart + Reorder */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 16 }}>
          {/* Trend Chart */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">30-day stock trend</div>
              <span style={{ fontSize: 12, color: 'var(--text-400)' }}>Simulated</span>
            </div>
            <div style={{ padding: '16px 22px 20px' }}>
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false} interval={6} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={primary.reorder_point} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.6}
                      label={{ value: 'Reorder', fill: '#d97706', fontSize: 10, position: 'insideTopLeft' }} />
                    <Line type="monotone" dataKey="qty_on_hand" stroke="#111827" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: '#111827' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Reorder Recommendation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reorderQty > 0 ? (
              <div className="reorder-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: 'var(--amber)' }}>
                  <ShoppingCart size={14} />
                  Reorder Recommendation
                </div>
                <div className="reorder-qty">{Math.round(reorderQty)}</div>
                <div style={{ fontSize: 12, color: 'var(--amber-text)', marginBottom: 10 }}>units recommended</div>
                <div style={{ fontSize: 12.5, color: '#92400e', lineHeight: 1.6 }}>
                  Based on {totalSales.toFixed(1)} units/day across {rows.length} location{rows.length > 1 ? 's' : ''}.
                  Covers 30 days demand + safety buffer.
                </div>
              </div>
            ) : (
              <div className="card card-pad" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>Stock healthy</div>
                <div style={{ fontSize: 12, color: 'var(--text-400)', marginTop: 4 }}>No reorder needed</div>
              </div>
            )}
          </div>
        </div>

        {/* Per-location table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <MapPin size={14} />
              By Location
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Location</th>
                <th>Qty on Hand</th>
                <th>Reorder Pt.</th>
                <th>Days Cover</th>
                <th>Incoming</th>
                <th>Status</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="td-primary">{r.warehouse}</td>
                  <td className={r.qty_on_hand === 0 ? 'td-danger' : r.qty_on_hand < r.reorder_point ? 'td-warn' : ''}>
                    {r.qty_on_hand === 0 ? '⚠ 0' : r.qty_on_hand}
                  </td>
                  <td style={{ color: 'var(--text-400)' }}>{r.reorder_point}</td>
                  <td style={{ color: r.days_of_cover < 7 ? 'var(--red)' : 'var(--text-200)', fontWeight: r.days_of_cover < 7 ? 600 : 400 }}>
                    {r.days_of_cover != null ? `${r.days_of_cover}d` : '—'}
                  </td>
                  <td style={{ color: r.incoming_stock_qty > 0 ? 'var(--green)' : 'var(--text-400)' }}>
                    {r.incoming_stock_qty > 0 ? `+${r.incoming_stock_qty} · ${r.incoming_stock_date}` : '—'}
                  </td>
                  <td><StatusBadge status={r.status} /></td>
                  <td><span className="tag">{r.source}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
