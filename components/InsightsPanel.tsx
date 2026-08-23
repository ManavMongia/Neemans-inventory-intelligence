'use client';
import ReactMarkdown from 'react-markdown';
import { Sparkles, AlertTriangle, TrendingUp, ArrowRightLeft, Package2 } from 'lucide-react';

interface ReasoningSection {
  summary?: string;
  [key: string]: any;
}

interface InsightsPanelProps {
  summary: string;
  loading?: boolean;
  generatedAt?: string;
  modelUsed?: string;
  stockoutReasoning?: ReasoningSection;
  demandReasoning?: ReasoningSection;
  transferReasoning?: ReasoningSection;
  liquidationReasoning?: ReasoningSection;
}

function ReasoningCard({ icon: Icon, title, color, data }: {
  icon: any; title: string; color: string; data: ReasoningSection;
}) {
  if (!data || !data.summary) return null;
  const listFields = Object.entries(data).filter(([k, v]) =>
    k !== 'summary' && Array.isArray(v)
  );
  const strFields = Object.entries(data).filter(([k, v]) =>
    k !== 'summary' && typeof v === 'string'
  );
  return (
    <div style={{
      border: `1px solid ${color}22`, borderRadius: 10,
      background: `${color}08`, padding: '14px 16px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <Icon size={13} style={{ color }} />
        <span style={{ fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          {title}
        </span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-200)', lineHeight: 1.6, margin: '0 0 8px' }}>{data.summary}</p>
      {listFields.map(([key, arr]) => (
        <div key={key} style={{ marginTop: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-400)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4 }}>
            {key.replace(/_/g, ' ')}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {(arr as string[]).map((item, i) => (
              <li key={i} style={{ fontSize: 12.5, color: 'var(--text-300)', lineHeight: 1.5 }}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
      {strFields.map(([key, val]) => (
        <div key={key} style={{ marginTop: 6, fontSize: 12.5, color: 'var(--text-400)' }}>
          <strong style={{ color: 'var(--text-300)' }}>{key.replace(/_/g, ' ')}: </strong>{val}
        </div>
      ))}
    </div>
  );
}

export default function InsightsPanel({
  summary, loading, generatedAt, modelUsed,
  stockoutReasoning, demandReasoning, transferReasoning, liquidationReasoning,
}: InsightsPanelProps) {
  const hasModel = modelUsed && modelUsed !== 'none' && modelUsed !== 'none (no API key)';
  const hasReasoning = stockoutReasoning || demandReasoning || transferReasoning || liquidationReasoning;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[90, 75, 85, 60, 80].map((w, i) => (
          <div key={i} className="skel" style={{ height: 14, width: `${w}%` }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      {generatedAt && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Sparkles size={13} style={{ color: '#6366f1' }} />
          <span style={{ fontSize: 12, color: 'var(--text-400)' }}>
            {hasModel && <><span className="tag" style={{ marginRight: 6 }}>{modelUsed}</span></>}
            Generated {new Date(generatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        </div>
      )}
      <div className="insights-body" style={{ marginBottom: hasReasoning ? 16 : 0 }}>
        <ReactMarkdown>{summary}</ReactMarkdown>
      </div>
      {hasReasoning && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            Detailed Reasoning by Module
          </div>
          {stockoutReasoning && <ReasoningCard icon={AlertTriangle}   title="Stockout Prevention"  color="#dc2626" data={stockoutReasoning} />}
          {demandReasoning    && <ReasoningCard icon={TrendingUp}      title="Demand Trends"        color="#2563eb" data={demandReasoning} />}
          {transferReasoning  && <ReasoningCard icon={ArrowRightLeft}  title="Stock Transfers"      color="#16a34a" data={transferReasoning} />}
          {liquidationReasoning && <ReasoningCard icon={Package2}      title="Liquidation"          color="#7c3aed" data={liquidationReasoning} />}
        </div>
      )}
    </div>
  );
}
