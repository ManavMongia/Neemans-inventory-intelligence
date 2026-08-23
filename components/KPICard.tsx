'use client';
import { type LucideIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  icon: LucideIcon;
}

export default function KPICard({ label, value, sub, color, icon: Icon }: KPICardProps) {
  return (
    <div className="kpi-card" style={{ '--kpi-color': color } as React.CSSProperties}>
      <div className="kpi-icon">
        <Icon size={18} />
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
