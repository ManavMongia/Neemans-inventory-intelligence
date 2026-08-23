interface StatusBadgeProps { status: string }

const CONFIG: Record<string, { cls: string; color: string }> = {
  Critical: { cls: 'badge-critical', color: '#dc2626' },
  Low:      { cls: 'badge-low',      color: '#d97706' },
  Healthy:  { cls: 'badge-healthy',  color: '#16a34a' },
  Overstock:{ cls: 'badge-overstock',color: '#7c3aed' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { cls, color } = CONFIG[status] || CONFIG['Healthy'];
  return (
    <span className={`badge ${cls}`}>
      <span className="badge-dot" style={{ background: color }} />
      {status}
    </span>
  );
}
