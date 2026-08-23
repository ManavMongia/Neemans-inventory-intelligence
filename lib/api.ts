const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchKPIs() {
  const res = await fetch(`${API_BASE}/api/inventory/kpis`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch KPIs');
  return res.json();
}

export async function fetchAlerts() {
  const res = await fetch(`${API_BASE}/api/inventory/alerts`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function fetchInventory(params?: {
  category?: string;
  warehouse?: string;
  status?: string;
  search?: string;
  sort_by?: string;
  order?: string;
}) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
  }
  const res = await fetch(`${API_BASE}/api/inventory?${query}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch inventory');
  return res.json();
}

export async function fetchSKU(skuId: string) {
  const res = await fetch(`${API_BASE}/api/inventory/${skuId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch SKU');
  return res.json();
}

export async function fetchSKUTrend(skuId: string) {
  const res = await fetch(`${API_BASE}/api/inventory/${skuId}/trend`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch trend');
  return res.json();
}

export async function fetchInsights() {
  const res = await fetch(`${API_BASE}/api/agent/insights`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch insights');
  return res.json();
}

export async function fetchSyncHistory() {
  const res = await fetch(`${API_BASE}/api/agent/history`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch sync history');
  return res.json();
}

export async function fetchAgentStatus() {
  const res = await fetch(`${API_BASE}/api/agent/status`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch agent status');
  return res.json();
}

export async function triggerSync() {
  const res = await fetch(`${API_BASE}/api/agent/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Sync failed');
  return res.json();
}

export async function fetchCategories() {
  const res = await fetch(`${API_BASE}/api/inventory/categories`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchWarehouses() {
  const res = await fetch(`${API_BASE}/api/inventory/warehouses`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchStockoutPrevention() {
  const res = await fetch(`${API_BASE}/api/agent/stockout-prevention`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch stockout prevention data');
  return res.json();
}

export async function fetchDemandTrends() {
  const res = await fetch(`${API_BASE}/api/agent/demand-trends`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch demand trends');
  return res.json();
}

export async function fetchTransferRecommendations() {
  const res = await fetch(`${API_BASE}/api/agent/transfer-recommendations`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch transfer recommendations');
  return res.json();
}

export async function fetchLiquidationOpportunities() {
  const res = await fetch(`${API_BASE}/api/agent/liquidation-opportunities`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch liquidation opportunities');
  return res.json();
}

