// ══════════════════════════════════════════════════════
// الدليل المحاسبي — API
// ══════════════════════════════════════════════════════
import api from '../api/client.js';

export async function getChartRows() {
  try {
    const { data } = await api.get('/accounts');
    return data;
  } catch {
    return [];
  }
}

export async function saveChartRows(rows) {
  await api.put('/accounts', { rows });
}

export function initAccountsIfNeeded() { /* الباك اند يتولى ذلك */ }

export async function getAccounts() {
  const rows = await getChartRows();
  return rows.map(r => r.name).filter(Boolean);
}
