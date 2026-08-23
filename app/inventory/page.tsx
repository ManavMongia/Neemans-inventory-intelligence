'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ArrowUpDown, ChevronUp, ChevronDown, Calendar } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { fetchInventory, fetchCategories, fetchWarehouses } from '@/lib/api';

const STATUS_LIST = ['', 'Critical', 'Low', 'Healthy', 'Overstock'] as const;
const PILL_STYLES: Record<string, string> = {
  '':         '',
  'Critical': 'active-red',
  'Low':      'active-amber',
  'Healthy':  'active-green',
  'Overstock':'active-purple',
};

const SKU_EMOJI = (cat: string) => {
  if (cat.includes('Running'))   return '🏃';
  if (cat.includes('Cushioned')) return '🥾';
  if (cat.includes('Kids'))      return '🧒';
  if (cat.includes('Gift'))      return '🎁';
  if (cat.includes('Compress'))  return '💪';
  if (cat.includes('No-Show'))   return '👟';
  if (cat.includes('Loafer'))    return '👞';
  if (cat.includes('Ankle'))     return '🦶';
  return '🧦';
};

function InventoryContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [skus, setSkus]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState(searchParams.get('category') || '');
  const [warehouse, setWarehouse] = useState('');
  const [status, setStatus]       = useState(searchParams.get('status') || '');
  const [sortBy, setSortBy]       = useState('status');
  const [order, setOrder]         = useState('asc');
  const [categories, setCategories] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, cats, whs] = await Promise.all([
        fetchInventory({ category, warehouse, status, search, sort_by: sortBy, order }),
        categories.length ? Promise.resolve(null) : fetchCategories(),
        warehouses.length ? Promise.resolve(null) : fetchWarehouses(),
      ]);
      setSkus(data);
      if (cats?.length) setCategories(cats);
      if (whs?.length)  setWarehouses(whs);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, category, warehouse, status, sortBy, order]);

  useEffect(() => { load(); }, [load]);

  const handleSort = (col: string) => {
    if (sortBy === col) setOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setOrder('asc'); }
  };

  const SortIcon = ({ col }: { col: string }) =>
    sortBy !== col
      ? <ArrowUpDown size={10} style={{ opacity: 0.3, marginLeft: 4, verticalAlign: 'middle' }} />
      : order === 'asc'
        ? <ChevronUp size={11} style={{ marginLeft: 4, color: '#111827', verticalAlign: 'middle' }} />
        : <ChevronDown size={11} style={{ marginLeft: 4, color: '#111827', verticalAlign: 'middle' }} />;

  const counts = STATUS_LIST.reduce((acc, s) => {
    acc[s] = s === '' ? skus.length : skus.filter(x => x.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Inventory</div>
        <div className="topbar-right">
          <div className="topbar-avatar" title="Neeman's Inventory Manager">NM</div>
        </div>
      </div>

      <div className="page-content">
        {/* Filter bar */}
        <div className="filter-bar">
          {/* Search */}
          <div className="input-wrap">
            <Search size={13} className="input-icon" />
            <input
              id="inventory-search"
              className="input has-icon"
              style={{ width: 240 }}
              placeholder="Search SKU or product..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Status pills */}
          {STATUS_LIST.map(s => (
            <button
              key={s || 'all'}
              className={`filter-pill ${status === s ? (s ? PILL_STYLES[s] : 'active') : ''}`}
              onClick={() => setStatus(status === s && s !== '' ? '' : s)}
            >
              {s || 'All'}
              {s !== '' && counts[s] > 0 && (
                <span style={{
                  marginLeft: 2,
                  fontSize: 10,
                  fontWeight: 700,
                  opacity: 0.8,
                }}>
                  {counts[s]}
                </span>
              )}
            </button>
          ))}

          {/* Category */}
          <select
            id="filter-category"
            className="select"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Warehouse */}
          <select
            id="filter-warehouse"
            className="select"
            value={warehouse}
            onChange={e => setWarehouse(e.target.value)}
          >
            <option value="">All Locations</option>
            {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
          </select>

          {(search || category || warehouse || status) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setSearch(''); setCategory(''); setWarehouse(''); setStatus(''); }}
            >
              Clear
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-400)' }}>
            {skus.length} results
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('sku_id')}>SKU <SortIcon col="sku_id" /></th>
                <th onClick={() => handleSort('product_name')}>Product <SortIcon col="product_name" /></th>
                <th onClick={() => handleSort('warehouse')}>Location <SortIcon col="warehouse" /></th>
                <th onClick={() => handleSort('qty_on_hand')}>Qty on Hand <SortIcon col="qty_on_hand" /></th>
                <th onClick={() => handleSort('reorder_point')}>Reorder Pt. <SortIcon col="reorder_point" /></th>
                <th onClick={() => handleSort('days_of_cover')}>Days Cover <SortIcon col="days_of_cover" /></th>
                <th>Sell-Through</th>
                <th onClick={() => handleSort('avg_daily_sales')}>Avg Sales/day <SortIcon col="avg_daily_sales" /></th>
                <th onClick={() => handleSort('status')}>Status <SortIcon col="status" /></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j}><div className="skel" style={{ height: 16, width: j === 1 ? 160 : 60 }} /></td>
                    ))}
                  </tr>
                ))
              ) : skus.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      <div className="empty-icon">📦</div>
                      No SKUs match the selected filters
                    </div>
                  </td>
                </tr>
              ) : skus.map(sku => (
                <tr
                  key={`${sku.sku_id}-${sku.warehouse}`}
                  onClick={() => router.push(`/inventory/${sku.sku_id}`)}
                >
                  <td className="td-mono">{sku.sku_id}</td>
                  <td>
                    <div className="sku-cell">
                      <div className="sku-icon">{SKU_EMOJI(sku.category)}</div>
                      <div>
                        <div className="td-primary" style={{ fontSize: 13 }}>{sku.product_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-400)' }}>{sku.category}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-300)' }}>{sku.warehouse}</td>
                  <td className={sku.qty_on_hand === 0 ? 'td-danger' : sku.qty_on_hand < sku.reorder_point ? 'td-warn' : 'td-primary'}>
                    {sku.qty_on_hand === 0 ? '⚠ 0' : sku.qty_on_hand}
                  </td>
                  <td style={{ color: 'var(--text-400)' }}>{sku.reorder_point}</td>
                  <td>
                    {sku.days_of_cover != null ? (
                      <span style={{
                        color: sku.days_of_cover < 7 ? 'var(--red)' : sku.days_of_cover < 14 ? 'var(--amber)' : 'var(--text-200)',
                        fontWeight: sku.days_of_cover < 7 ? 700 : 400,
                      }}>
                        {sku.days_of_cover}d
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ color: 'var(--text-300)' }}>
                    {sku.sell_through_rate != null ? `${sku.sell_through_rate}%` : '—'}
                  </td>
                  <td style={{ color: 'var(--text-200)' }}>{sku.avg_daily_sales}</td>
                  <td><StatusBadge status={sku.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-400)' }}>Loading...</div>
    }>
      <InventoryContent />
    </Suspense>
  );
}
