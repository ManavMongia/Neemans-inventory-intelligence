interface SyncRun {
  id: number; run_at: string; trigger: string; status: string;
  duration_seconds: number | null; records_processed: number;
  records_updated: number; new_alerts: number; resolved_alerts: number; new_stockouts: number;
}

export default function SyncHistoryTable({ runs }: { runs: SyncRun[] }) {
  if (!runs.length) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        No sync runs yet — click Sync Now to start
      </div>
    );
  }
  return (
    <table>
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>Trigger</th>
          <th>Status</th>
          <th>Duration</th>
          <th>Records</th>
          <th>New Alerts</th>
          <th>Resolved</th>
          <th>Stockouts</th>
        </tr>
      </thead>
      <tbody>
        {runs.map(run => (
          <tr key={run.id}>
            <td className="td-primary" style={{ fontSize: 12.5 }}>
              {new Date(run.run_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </td>
            <td><span className="tag" style={{ textTransform: 'capitalize' }}>{run.trigger}</span></td>
            <td><span className={`sync-badge ${run.status}`}>{run.status}</span></td>
            <td style={{ color: 'var(--text-300)' }}>{run.duration_seconds != null ? `${run.duration_seconds.toFixed(1)}s` : '—'}</td>
            <td>{run.records_processed}</td>
            <td>{run.new_alerts > 0 ? <span style={{ color: 'var(--amber)', fontWeight: 600 }}>+{run.new_alerts}</span> : '—'}</td>
            <td>{run.resolved_alerts > 0 ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>-{run.resolved_alerts}</span> : '—'}</td>
            <td>{run.new_stockouts > 0 ? <span style={{ color: 'var(--red)', fontWeight: 600 }}>{run.new_stockouts}</span> : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
