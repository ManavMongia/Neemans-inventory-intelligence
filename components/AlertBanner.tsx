interface AlertItemProps {
  narrative: string;
  severity: 'critical' | 'warning' | 'info';
  skuId: string;
  productName: string;
  warehouse: string;
  daysOfCover?: number | null;
  qtyOnHand: number;
}

const SEV_COLORS: Record<string, string> = {
  critical: '#dc2626',
  warning:  '#d97706',
  info:     '#7c3aed',
};

export default function AlertBanner({ narrative, severity, skuId, productName, warehouse, daysOfCover }: AlertItemProps) {
  return (
    <div className="alert-row">
      <div className="alert-sev-dot" style={{ background: SEV_COLORS[severity] }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="alert-product">{productName}</div>
        <div className="alert-body">{narrative}</div>
      </div>
      <div className="alert-meta">
        {daysOfCover != null && <span>{daysOfCover}d cover</span>}
        <div style={{ fontSize: 11, color: 'var(--text-400)', marginTop: 2 }}>{skuId}</div>
      </div>
    </div>
  );
}
