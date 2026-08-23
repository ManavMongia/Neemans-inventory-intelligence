'use client';
import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { fetchSyncHistory, fetchAgentStatus, triggerSync } from '@/lib/api';

function StatusIcon({ status }: { status: string }) {
  if (status === 'success') return <CheckCircle size={14} style={{ color: '#16a34a' }} />;
  if (status === 'error')   return <XCircle size={14} style={{ color: '#dc2626' }} />;
  return <AlertCircle size={14} style={{ color: '#d97706' }} />;
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function SyncPage() {
  const [history, setHistory]       = useState<any[]>([]);
  const [agentStatus, setStatus]    = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [syncing, setSyncing]       = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const [h, s] = await Promise.all([
        fetchSyncHistory(),
        fetchAgentStatus().catch(() => null),
      ]);
      setHistory(h);
      setStatus(s);
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

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-title">Sync History</div>
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
              ? `✓ Sync complete — ${syncResult.records_processed} records processed in ${syncResult.duration_seconds?.toFixed(1)}s · ${syncResult.new_alerts} new alerts`
              : `✕ Sync failed: ${syncResult.message}`}
          </div>
        )}

        {/* Status cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
          {[
            {
              label: 'Total Syncs',
              value: agentStatus?.total_syncs ?? '—',
              sub: 'Lifetime runs',
            },
            {
              label: 'Last Sync',
              value: agentStatus?.last_sync
                ? new Date(agentStatus.last_sync).toLocaleTimeString('en-IN', { timeStyle: 'short' })
                : 'Never',
              sub: agentStatus?.last_sync_status ?? '—',
            },
            {
              label: 'Last AI Insight',
              value: agentStatus?.last_insight
                ? new Date(agentStatus.last_insight).toLocaleTimeString('en-IN', { timeStyle: 'short' })
                : 'None',
              sub: 'Claude analysis',
            },
          ].map(({ label, value, sub }) => (
            <div key={label} className="kpi-card">
              <div className="kpi-card-header">
                <div className="kpi-label">{label}</div>
                <Clock size={14} style={{ color: 'var(--text-400)' }} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-100)', letterSpacing: '-0.3px', lineHeight: 1, marginBottom: 4 }}>
                {loading ? <div className="skel" style={{ width: 60, height: 22 }} /> : value}
              </div>
              <div className="kpi-sub">{sub}</div>
            </div>
          ))}
        </div>

        {/* Sync history table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={14} />
              Sync Runs
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-400)' }}>Last 20 runs · most recent first</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Triggered</th>
                <th>Trigger</th>
                <th>Status</th>
                <th>Records</th>
                <th>Updated</th>
                <th>New Alerts</th>
                <th>Duration</th>
                <th>Sources</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j}><div className="skel" style={{ height: 16, width: j === 1 ? 120 : 50 }} /></td>
                    ))}
                  </tr>
                ))
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      <div className="empty-icon">📋</div>
                      No sync runs yet — click Sync Now to start
                    </div>
                  </td>
                </tr>
              ) : history.map(run => (
                <tr key={run.id}>
                  <td className="td-mono" style={{ color: 'var(--text-400)' }}>#{run.id}</td>
                  <td style={{ color: 'var(--text-300)', fontSize: 12 }}>{fmt(run.run_at)}</td>
                  <td>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                      background: run.trigger === 'manual' ? '#dbeafe' : 'var(--surface-2)',
                      color: run.trigger === 'manual' ? '#1d4ed8' : 'var(--text-400)',
                    }}>{run.trigger}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <StatusIcon status={run.status} />
                      <span style={{
                        fontSize: 12, fontWeight: 500,
                        color: run.status === 'success' ? '#16a34a' : run.status === 'error' ? '#dc2626' : '#d97706',
                      }}>{run.status}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-200)' }}>{run.records_processed.toLocaleString()}</td>
                  <td style={{ color: 'var(--text-300)' }}>{run.records_updated.toLocaleString()}</td>
                  <td>
                    {run.new_alerts > 0
                      ? <span style={{ color: '#dc2626', fontWeight: 600 }}>+{run.new_alerts}</span>
                      : <span style={{ color: 'var(--text-400)' }}>—</span>}
                  </td>
                  <td style={{ color: 'var(--text-300)', fontSize: 12 }}>
                    {run.duration_seconds != null ? `${run.duration_seconds.toFixed(2)}s` : '—'}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-400)' }}>
                    {run.sources_synced
                      ? (run.sources_synced as any[]).map((s: any) => `${s.name} (${s.rows})`).join(', ')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
