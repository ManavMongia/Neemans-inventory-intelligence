'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Bot, TrendingUp, Users, Settings, HelpCircle, GitBranch, RefreshCw, X, Database, ExternalLink, Mail, Copy, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchKPIs } from '@/lib/api';

const nav = [
  {
    group: 'Analytics',
    items: [
      { href: '/',          label: 'Overview',      icon: LayoutDashboard },
      { href: '/inventory', label: 'Inventory',     icon: TrendingUp },
    ],
  },
  {
    group: 'Operations',
    items: [
      { href: '/agent', label: 'AI Agent',      icon: Bot },
      { href: '/sync',  label: 'Sync History',  icon: RefreshCw },
    ],
  },
];

// ── Generic modal shell ───────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '24px 28px', width: 440, maxWidth: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-100)' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-400)', padding: 4, borderRadius: 6, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Sources modal ─────────────────────────────────────────────────────────────
function SourcesModal({ onClose }: { onClose: () => void }) {
  const sources = [
    { name: 'Email Export (CSV)', file: 'inventory_email_export.csv', rows: 30, status: 'active', icon: '📧', desc: 'Simulates email attachment ingestion from supplier.' },
    { name: 'Sheets Export (CSV)', file: 'inventory_sheets_export.csv', rows: 35, status: 'active', icon: '📊', desc: 'Simulates Google Sheets sync from warehouse team.' },
  ];
  return (
    <Modal title="Data Sources" onClose={onClose}>
      <p style={{ fontSize: 13, color: 'var(--text-400)', marginBottom: 16, lineHeight: 1.6 }}>
        This project uses two simulated data sources. In production these would connect via Gmail OAuth and Google Sheets API.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sources.map(s => (
          <div key={s.name} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-100)' }}>{s.name}</div>
                <code style={{ fontSize: 11, color: 'var(--text-400)', background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4 }}>{s.file}</code>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 999 }}>
                ● {s.status}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-400)', margin: '6px 0 0', lineHeight: 1.5 }}>{s.desc} · <strong>{s.rows} rows</strong></p>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
        💡 Data syncs automatically every 30 min. Click <strong>Sync Now</strong> on the Agent page for an immediate refresh.
      </div>
    </Modal>
  );
}

// ── Settings modal ────────────────────────────────────────────────────────────
function SettingsModal({ onClose }: { onClose: () => void }) {
  const [interval, setInterval] = useState('30');
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Modal title="Settings" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-300)', display: 'block', marginBottom: 8 }}>
            SYNC INTERVAL
          </label>
          <select
            value={interval}
            onChange={e => setInterval(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: 'var(--surface)', color: 'var(--text-100)', cursor: 'pointer' }}
          >
            <option value="5">Every 5 minutes</option>
            <option value="15">Every 15 minutes</option>
            <option value="30">Every 30 minutes (default)</option>
            <option value="60">Every hour</option>
          </select>
          <p style={{ fontSize: 11, color: 'var(--text-400)', marginTop: 6 }}>Set via SYNC_INTERVAL_MINUTES in backend/.env</p>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-300)', display: 'block', marginBottom: 8 }}>
            API ENDPOINT
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{ flex: 1, padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-300)' }}>
              http://localhost:8000
            </code>
            <button
              onClick={() => navigator.clipboard.writeText('http://localhost:8000')}
              style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', cursor: 'pointer', display: 'flex', color: 'var(--text-400)' }}
            >
              <Copy size={13} />
            </button>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-300)', display: 'block', marginBottom: 8 }}>
            AI MODEL
          </label>
          <div style={{ padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-200)' }}>
            Claude 3.5 Haiku · claude-3-5-haiku-20241022
          </div>
        </div>

        <button
          onClick={save}
          style={{
            width: '100%', padding: '10px', borderRadius: 8, border: 'none',
            background: saved ? '#16a34a' : '#111827', color: '#fff',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'background 0.2s',
          }}
        >
          {saved ? <><Check size={14} /> Saved!</> : 'Save Settings'}
        </button>
      </div>
    </Modal>
  );
}

// ── Invite modal ──────────────────────────────────────────────────────────────
function InviteModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const send = () => {
    if (!email.includes('@')) return;
    setSent(true);
    setTimeout(() => { setSent(false); setEmail(''); }, 2500);
  };

  return (
    <Modal title="Invite Team Member" onClose={onClose}>
      <p style={{ fontSize: 13, color: 'var(--text-400)', marginBottom: 16, lineHeight: 1.6 }}>
        Share access to the Neeman's Inventory Intelligence dashboard.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-300)', display: 'block', marginBottom: 6 }}>EMAIL ADDRESS</label>
          <input
            type="email"
            placeholder="colleague@neemans.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send(); }}
            style={{
              width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
              borderRadius: 8, fontSize: 13, background: 'var(--surface)', color: 'var(--text-100)',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <button
          onClick={send}
          style={{
            width: '100%', padding: '10px', borderRadius: 8, border: 'none',
            background: sent ? '#16a34a' : '#111827', color: '#fff',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'background 0.2s',
          }}
        >
          {sent ? <><Check size={14} /> Invite sent!</> : <><Mail size={14} /> Send Invite</>}
        </button>
      </div>
      <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14, fontSize: 12, color: 'var(--text-400)' }}>
        Or share this link:
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <code style={{ flex: 1, padding: '6px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, color: 'var(--text-300)' }}>
            http://localhost:3000
          </code>
          <button
            onClick={() => navigator.clipboard.writeText('http://localhost:3000')}
            style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', cursor: 'pointer', display: 'flex', color: 'var(--text-400)' }}
          >
            <Copy size={12} />
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const [criticalCount, setCriticalCount] = useState<number | null>(null);
  const [modal, setModal] = useState<'sources' | 'settings' | 'invite' | null>(null);

  useEffect(() => {
    fetchKPIs().then(d => setCriticalCount(d.critical_count)).catch(() => {});
  }, []);

  return (
    <>
      <nav className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">🧦</div>
          <div className="sidebar-brand-name">Neeman&apos;s</div>
        </div>

        <div className="sidebar-body">
          {nav.map(({ group, items }) => (
            <div key={group}>
              <div className="nav-group-label">{group}</div>
              <div className="nav-group">
                {items.map(({ href, label, icon: Icon }) => {
                  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                  return (
                    <Link key={href} href={href} className={`nav-item ${active ? 'active' : ''}`}>
                      <Icon className="nav-icon" />
                      {label}
                      {label === 'Inventory' && criticalCount !== null && criticalCount > 0 && (
                        <span className="nav-badge">{criticalCount}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <div className="nav-group-label">System</div>
            <div className="nav-group">
              <button className="nav-item" onClick={() => setModal('sources')} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}>
                <Database className="nav-icon" /> Sources
              </button>
              <button className="nav-item" onClick={() => setModal('settings')} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}>
                <Settings className="nav-icon" /> Settings
              </button>
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-item"
                style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'inherit' }}
              >
                <HelpCircle className="nav-icon" /> Help center
                <ExternalLink size={10} style={{ marginLeft: 'auto', opacity: 0.4 }} />
              </a>
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="invite-btn" onClick={() => setModal('invite')}>
            <Users size={14} />
            Invite team
          </button>
          <div className="sidebar-version">Version 1.0</div>
        </div>
      </nav>

      {modal === 'sources'  && <SourcesModal  onClose={() => setModal(null)} />}
      {modal === 'settings' && <SettingsModal onClose={() => setModal(null)} />}
      {modal === 'invite'   && <InviteModal   onClose={() => setModal(null)} />}
    </>
  );
}

