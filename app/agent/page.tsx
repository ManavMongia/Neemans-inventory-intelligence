'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, Bot, Clock, Activity, ChevronDown, ChevronUp,
  AlertTriangle, TrendingUp, ArrowRightLeft, Package2, Sparkles, MapPin
} from 'lucide-react';
import SyncHistoryTable from '@/components/SyncHistoryTable';
import InsightsPanel from '@/components/InsightsPanel';
import {
  fetchSyncHistory, fetchInsights, fetchAgentStatus, triggerSync,
  fetchStockoutPrevention, fetchDemandTrends,
  fetchTransferRecommendations, fetchLiquidationOpportunities,
} from '@/lib/api';

// ─── Small helper components ──────────────────────────────────────────────────

function Section({
  id, icon: Icon, title, subtitle, badge, badgeColor, children, defaultOpen = false,
}: {
  id: string; icon: any; title: string; subtitle?: string;
  badge?: string | number; badgeColor?: string;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
      <div
        className="card-header"
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen(v => !v)}
      >
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={15} style={{ color: 'var(--text-300)' }} />
          {title}
          {badge !== undefined && (
            <span style={{
              marginLeft: 2, fontSize: 11, fontWeight: 700,
              background: badgeColor ? `${badgeColor}18` : 'var(--surface-2)',
              color: badgeColor || 'var(--text-300)',
              border: `1px solid ${badgeColor ? `${badgeColor}33` : 'var(--border)'}`,
              borderRadius: 999, padding: '1px 8px',
            }}>{badge}</span>
          )}
          {subtitle && (
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-400)', marginLeft: 4 }}>{subtitle}</span>
          )}
        </div>
        <button className="card-action">
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>
      {open && children}
    </div>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    high:     { bg: '#fee2e2', color: '#b91c1c' },
    medium:   { bg: '#fef3c7', color: '#b45309' },
    low:      { bg: '#dcfce7', color: '#15803d' },
    urgent:   { bg: '#fee2e2', color: '#b91c1c' },
    recommended: { bg: '#dbeafe', color: '#1d4ed8' },
  };
  const s = map[urgency] || map.low;
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 8px', borderRadius: 999,
      fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color,
      textTransform: 'capitalize',
    }}>{urgency}</span>
  );
}

function TrendBadge({ trend }: { trend: string }) {
  const map: Record<string, { bg: string; color: string; icon: string }> = {
    Rising:   { bg: '#dcfce7', color: '#15803d', icon: '↑' },
    Stable:   { bg: '#f3f4f6', color: '#4b5563', icon: '→' },
    Declining:{ bg: '#fee2e2', color: '#b91c1c', icon: '↓' },
  };
  const s = map[trend] || map.Stable;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color,
    }}>{s.icon} {trend}</span>
  );
}

function EmptyRow({ msg }: { msg: string }) {
  return (
    <div style={{ padding: '28px 22px', textAlign: 'center', color: 'var(--text-400)', fontSize: 13 }}>
      ✅ {msg}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AgentPage() {
  const [history, setHistory]       = useState<any[]>([]);
  const [insights, setInsights]     = useState<any>(null);
  const [agentStatus, setStatus]    = useState<any>(null);
  const [stockout, setStockout]     = useState<any[]>([]);
  const [trends, setTrends]         = useState<any>(null);
  const [transfers, setTransfers]   = useState<any[]>([]);
  const [liquidation, setLiquidation] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [syncing, setSyncing]       = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [showInsights, setShowInsights] = useState(false);

  const load = useCallback(async () => {
    try {
      const [h, i, s, sp, dt, tr, lo] = await Promise.all([
        fetchSyncHistory(),
        fetchInsights().catch(() => null),
        fetchAgentStatus().catch(() => null),
        fetchStockoutPrevention().catch(() => []),
        fetchDemandTrends().catch(() => null),
        fetchTransferRecommendations().catch(() => []),
        fetchLiquidationOpportunities().catch(() => []),
      ]);
      setHistory(h);
      setInsights(i);
      setStatus(s);
      setStockout(sp);
      setTrends(dt);
      setTransfers(tr);
      setLiquidation(lo);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const r = await triggerSync();
      setSyncResult({ ...r, ok: true });
      await load();
    } catch (e: any) {
      setSyncResult({ ok: false, message: e.message });
    } finally { setSyncing(false); }
  };

  const trendSummary = trends?.summary || { rising: 0, stable: 0, declining: 0 };
  const highUrgency  = stockout.filter(s => s.urgency === 'high').length;

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-title">AI Agent</div>
        <div className="topbar-right">
          <button id="sync-now-btn" className="btn btn-primary" onClick={handleSync} disabled={syncing}>
            {syncing ? <><span className="spinner" />Syncing...</> : <><RefreshCw size={13} />Sync Now</>}
          </button>
          <div className="topbar-avatar">NM</div>
        </div>
      </div>

      <div className="page-content">
        {/* Sync banner */}
        {syncResult && (
          <div className={`banner ${syncResult.ok ? 'success' : 'error'}`}>
            {syncResult.ok
              ? `✓ Sync complete — ${syncResult.records_processed} records in ${syncResult.duration_seconds?.toFixed(1)}s · ${syncResult.new_alerts} new alerts`
              : `✕ Sync error: ${syncResult.message}`}
          </div>
        )}

        {/* ── Status Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Total Syncs',      value: agentStatus?.total_syncs ?? '—', icon: Activity, note: 'Lifetime runs' },
            { label: 'Last Sync',        value: agentStatus?.last_sync ? new Date(agentStatus.last_sync).toLocaleTimeString('en-IN', { timeStyle: 'short' }) : 'Never', icon: Clock, note: agentStatus?.last_sync_status ?? '—' },
            { label: 'At-Risk SKUs',     value: loading ? '—' : stockout.length, icon: AlertTriangle, note: `${highUrgency} high urgency`, accent: stockout.length > 0 ? '#dc2626' : undefined },
            { label: 'Transfer Opps.',   value: loading ? '—' : transfers.length, icon: ArrowRightLeft, note: 'Cross-location moves' },
          ].map(({ label, value, icon: Icon, note, accent }) => (
            <div key={label} className="kpi-card">
              <div className="kpi-card-header">
                <div className="kpi-label">{label}</div>
                <Icon size={15} style={{ color: accent || 'var(--text-400)' }} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: accent || 'var(--text-100)', letterSpacing: '-0.3px', lineHeight: 1, marginBottom: 4 }}>
                {loading ? <div className="skel" style={{ width: 50, height: 22 }} /> : value}
              </div>
              <div className="kpi-sub">{note}</div>
            </div>
          ))}
        </div>

        {/* ── 1. STOCKOUT PREVENTION ── */}
        <Section
          id="stockout-prevention"
          icon={AlertTriangle}
          title="Stockout Prevention"
          subtitle="SKUs heading toward stockout in 7–21 days"
          badge={loading ? '…' : stockout.length}
          badgeColor="#dc2626"
          defaultOpen={true}
        >
          {loading ? (
            <div style={{ padding: 20 }}><div className="skel" style={{ height: 120 }} /></div>
          ) : stockout.length === 0 ? (
            <EmptyRow msg="No SKUs at risk of stockout in the next 21 days" />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Location</th>
                  <th>Qty</th>
                  <th>Days Cover</th>
                  <th>Daily Sales</th>
                  <th>Urgency</th>
                  <th>Incoming</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {stockout.map((s, i) => (
                  <tr key={i} onClick={() => window.location.href = `/inventory/${s.sku_id}`}>
                    <td className="td-mono">{s.sku_id}</td>
                    <td className="td-primary">{s.product_name}</td>
                    <td style={{ color: 'var(--text-300)' }}>{s.warehouse}</td>
                    <td style={{ color: s.qty_on_hand < s.reorder_point ? 'var(--amber)' : 'var(--text-200)', fontWeight: 500 }}>{s.qty_on_hand}</td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: s.days_of_cover <= 10 ? 'var(--red)' : s.days_of_cover <= 15 ? 'var(--amber)' : 'var(--text-200)',
                      }}>{s.days_of_cover}d</span>
                    </td>
                    <td style={{ color: 'var(--text-300)' }}>{s.avg_daily_sales}/day</td>
                    <td><UrgencyBadge urgency={s.urgency} /></td>
                    <td>
                      {s.has_incoming
                        ? <span style={{ color: 'var(--green)', fontWeight: 500, fontSize: 12 }}>+{s.incoming_stock_qty} on {s.incoming_stock_date}</span>
                        : <span style={{ color: 'var(--red)', fontSize: 12 }}>None scheduled</span>}
                    </td>
                    <td style={{ maxWidth: 220, whiteSpace: 'normal', fontSize: 12, color: 'var(--text-300)', lineHeight: 1.4 }}>{s.recommended_action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* ── 2. DEMAND TREND ANALYSIS ── */}
        <Section
          id="demand-trends"
          icon={TrendingUp}
          title="Demand Trend Analysis"
          subtitle="Velocity and sell-through trends across the catalog"
          defaultOpen={true}
        >
          {loading || !trends ? (
            <div style={{ padding: 20 }}><div className="skel" style={{ height: 120 }} /></div>
          ) : (
            <div>
              {/* Summary bar */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                borderBottom: '1px solid var(--border)',
              }}>
                {[
                  { label: 'Rising',    value: trendSummary.rising,   color: '#16a34a', bg: '#dcfce7' },
                  { label: 'Stable',    value: trendSummary.stable,   color: '#4b5563', bg: '#f3f4f6' },
                  { label: 'Declining', value: trendSummary.declining, color: '#dc2626', bg: '#fee2e2' },
                ].map(t => (
                  <div key={t.label} style={{ padding: '16px 22px', borderRight: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: t.color, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>{t.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-100)', letterSpacing: '-0.5px', lineHeight: 1 }}>{t.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-400)', marginTop: 3 }}>SKU-location rows</div>
                  </div>
                ))}
              </div>

              {/* Category trends */}
              <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-300)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>By Category</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(trends.category_trends || []).map((cat: any) => (
                    <div key={cat.category} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', borderRadius: 8,
                      border: '1px solid var(--border)', background: 'var(--surface-2)',
                      fontSize: 13,
                    }}>
                      <TrendBadge trend={cat.trend} />
                      <span style={{ fontWeight: 500, color: 'var(--text-100)' }}>{cat.category.replace('Socks - ', '')}</span>
                      <span style={{ color: 'var(--text-400)', fontSize: 12 }}>{cat.avg_sell_through}% ST · {cat.sku_count} SKUs</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fastest & Slowest movers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div style={{ padding: '14px 22px', borderRight: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-300)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>⚡ Fastest Movers</div>
                  {(trends.fastest_movers || []).slice(0, 5).map((s: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <div>
                        <span style={{ fontWeight: 500, color: 'var(--text-100)' }}>{s.product_name}</span>
                        <span style={{ color: 'var(--text-400)', fontSize: 11, marginLeft: 6 }}>{s.warehouse}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--green)', fontWeight: 600 }}>{s.avg_daily_sales}/day</span>
                        <TrendBadge trend={s.trend} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '14px 22px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-300)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>🐌 Slowest Movers</div>
                  {(trends.slowest_movers || []).slice(0, 5).map((s: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <div>
                        <span style={{ fontWeight: 500, color: 'var(--text-100)' }}>{s.product_name}</span>
                        <span style={{ color: 'var(--text-400)', fontSize: 11, marginLeft: 6 }}>{s.warehouse}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--red)', fontWeight: 500 }}>{s.avg_daily_sales}/day</span>
                        <TrendBadge trend={s.trend} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* ── 3. STOCK TRANSFER RECOMMENDATIONS ── */}
        <Section
          id="transfer-recommendations"
          icon={ArrowRightLeft}
          title="Stock Transfer Recommendations"
          subtitle="Move surplus stock from healthy locations to critical ones"
          badge={loading ? '…' : transfers.length}
          badgeColor="#2563eb"
        >
          {loading ? (
            <div style={{ padding: 20 }}><div className="skel" style={{ height: 100 }} /></div>
          ) : transfers.length === 0 ? (
            <EmptyRow msg="No transfer opportunities found — no SKU has both a surplus and a deficit location simultaneously" />
          ) : (
            <div>
              {transfers.map((t, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '14px 22px', borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <UrgencyBadge urgency={t.priority} />
                      <span style={{ fontWeight: 600, color: 'var(--text-100)', fontSize: 13 }}>{t.product_name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-400)' }}>{t.sku_id}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <MapPin size={11} style={{ color: 'var(--text-400)' }} />
                      <span style={{ color: 'var(--green)', fontWeight: 500 }}>{t.from_warehouse}</span>
                      <span style={{ color: 'var(--text-400)' }}>({t.from_qty} units)</span>
                      <span style={{ color: 'var(--text-300)' }}>→</span>
                      <span style={{ color: 'var(--red)', fontWeight: 500 }}>{t.to_warehouse}</span>
                      <span style={{ color: 'var(--text-400)' }}>({t.to_qty} units · {t.dest_days_cover}d cover)</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-100)', letterSpacing: '-0.3px' }}>{t.transfer_qty}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-400)' }}>units to move</div>
                  </div>
                  <div style={{
                    background: '#dcfce7', color: '#15803d',
                    borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, flexShrink: 0,
                  }}>+{t.impact_days_added}d cover</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── 4. LIQUIDATION OPPORTUNITIES ── */}
        <Section
          id="liquidation"
          icon={Package2}
          title="Liquidation Opportunities"
          subtitle="Overstocked items with low sell-through tying up capital"
          badge={loading ? '…' : liquidation.length}
          badgeColor="#7c3aed"
        >
          {loading ? (
            <div style={{ padding: 20 }}><div className="skel" style={{ height: 100 }} /></div>
          ) : liquidation.length === 0 ? (
            <EmptyRow msg="No liquidation candidates identified — all overstock items have acceptable sell-through rates" />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Location</th>
                  <th>Stock</th>
                  <th>Excess Units</th>
                  <th>Sell-Through</th>
                  <th>Days to Clear</th>
                  <th>Suggested Discount</th>
                  <th>Strategy</th>
                </tr>
              </thead>
              <tbody>
                {liquidation.map((liq, i) => (
                  <tr key={i} onClick={() => window.location.href = `/inventory/${liq.sku_id}`}>
                    <td className="td-mono">{liq.sku_id}</td>
                    <td className="td-primary">{liq.product_name}</td>
                    <td style={{ color: 'var(--text-300)' }}>{liq.warehouse}</td>
                    <td>{liq.qty_on_hand}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--purple)' }}>{liq.excess_units}</span>
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 600,
                        color: liq.sell_through_rate < 20 ? 'var(--red)' : liq.sell_through_rate < 35 ? 'var(--amber)' : 'var(--text-200)',
                      }}>{liq.sell_through_rate}%</span>
                    </td>
                    <td style={{ color: liq.days_to_clear > 90 ? 'var(--red)' : 'var(--text-300)' }}>
                      {liq.days_to_clear ? `${liq.days_to_clear}d` : '—'}
                    </td>
                    <td>
                      <span style={{
                        background: '#ede9fe', color: '#6d28d9',
                        padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      }}>-{liq.suggested_discount_pct}%</span>
                    </td>
                    <td style={{ maxWidth: 220, whiteSpace: 'normal', fontSize: 12, color: 'var(--text-300)', lineHeight: 1.4 }}>{liq.strategy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* ── 5. AI REASONING / RECOMMENDATIONS ── */}
        <Section
          id="ai-reasoning"
          icon={Sparkles}
          title="AI Reasoning & Recommendations"
          subtitle="Claude's structured analysis of all intelligence modules"
        >
          <div style={{ padding: '16px 22px' }}>
            {insights?.model_used && insights.model_used !== 'none (no API key)' ? (
              <InsightsPanel
                summary={insights.executive_summary}
                generatedAt={insights.generated_at}
                modelUsed={insights.model_used}
                stockoutReasoning={insights.stockout_reasoning}
                demandReasoning={insights.demand_reasoning}
                transferReasoning={insights.transfer_reasoning}
                liquidationReasoning={insights.liquidation_reasoning}
              />
            ) : (
              <div style={{
                background: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: 10, padding: '16px 18px',
              }}>
                <div style={{ fontWeight: 600, color: '#92400e', marginBottom: 8, fontSize: 13 }}>
                  🔑 API Key Required for AI Reasoning
                </div>
                <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>
                  Add your Anthropic API key to <code style={{ background: '#fef3c7', padding: '1px 5px', borderRadius: 4 }}>backend/.env</code>:
                  <pre style={{ background: '#fef3c7', padding: '8px 12px', borderRadius: 6, marginTop: 8, fontSize: 12 }}>ANTHROPIC_API_KEY=sk-ant-...</pre>
                  Then click <strong>Sync Now</strong> — Claude will analyze all 5 intelligence modules and return:
                  <ul style={{ marginTop: 8, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <li>Executive summary of overall inventory health</li>
                    <li>Stockout prevention action plan with revenue impact</li>
                    <li>Demand trend interpretation and category focus areas</li>
                    <li>Priority transfer queue with expected outcomes</li>
                    <li>Liquidation campaign recommendations with capital recovery estimate</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* ── Sync History ── */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={14} />
              Sync History
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-400)' }}>Last 20 runs</span>
          </div>
          {loading
            ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-400)', fontSize: 13 }}>Loading...</div>
            : <SyncHistoryTable runs={history} />}
        </div>
      </div>
    </>
  );
}
