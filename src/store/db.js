// ══════════════════════════════════════════════════════
// قاعدة البيانات — API (PostgreSQL عبر Express)
// ══════════════════════════════════════════════════════
import api from '../api/client.js';

export function initDB() { /* لا حاجة — الباك اند يتولى التهيئة */ }

// ── تسجيل الدخول ──────────────────────────────────────
export async function login(username, password) {
  const { data } = await api.post('/auth/login', { username, password });
  localStorage.setItem('token', data.token);
  return data.user;
}

// ── التخصيصات ─────────────────────────────────────────
export async function getAllocations() {
  const { data } = await api.get('/allocations');
  return data;
}

export async function updateAllocation(source, total) {
  await api.put(`/allocations/${encodeURIComponent(source)}`, { total });
}

// ── أبواب الصرف ───────────────────────────────────────
export async function getBabAllocations(source) {
  const { data } = await api.get('/allocations/bab', { params: source ? { source } : {} });
  return data;
}

export async function getBabAllocation(source, bab) {
  const map = await getBabAllocations(source);
  return map[`${source}__${bab}`] || { source, bab, total: 0, spent: 0 };
}

export async function updateBabAllocation(source, bab, total) {
  await api.put(`/allocations/bab/${encodeURIComponent(source)}/${encodeURIComponent(bab)}`, { total });
}

// ── المعاملات ─────────────────────────────────────────
function normalizeVoucher(v) {
  return {
    ...v,
    chkAmt:      v.chk_amt      ?? v.chkAmt      ?? 0,
    chkNo:       v.chk_no       ?? v.chkNo        ?? '',
    docNo:       v.doc_no       ?? v.docNo        ?? '',
    docDate:     v.doc_date     ?? v.docDate      ?? '',
    savedBy:     v.saved_by     ?? v.savedBy      ?? '',
    createdBy:   v.created_by   ?? v.createdBy    ?? '',
    archiveImg:  v.archive_img  ?? v.archiveImg   ?? null,
    auditorName: v.auditor_name ?? v.auditorName  ?? '',
    auditedAt:   v.audited_at   ?? v.auditedAt    ?? null,
    createdAt:   v.created_at   ?? v.createdAt    ?? null,
  };
}

export async function getVouchers(source) {
  const { data } = await api.get('/vouchers', { params: source ? { source } : {} });
  return data.map(normalizeVoucher);
}

export async function getSarfVouchers() {
  const { data } = await api.get('/vouchers/sarf');
  return data.map(normalizeVoucher);
}

export async function saveVoucher(voucher) {
  const { data } = await api.post('/vouchers', voucher);
  return normalizeVoucher(data);
}

export async function deleteVoucher(id) {
  await api.delete(`/vouchers/${id}`);
}

export async function setAuditStatus(voucherId, audited, auditorName) {
  await api.patch(`/vouchers/${voucherId}/audit`, { audited, auditor_name: auditorName });
}

export function repairBabAllocations() { /* الباك اند يدير الأرقام تلقائياً */ }

// ── سجل السلف (من مستند الصرف) ──────────────────────
async function appendRowsToRecord(endpoint, rows, createdBy) {
  if (!rows.length) return;
  // جلب السجل الحالي أو إنشاء جديد
  const { data: list } = await api.get(`/records/${endpoint}`);
  const rec = list[0] || null;
  const newRows = rows.map(r => ({
    fils: '', dinar: (r.dinar || '').replace(/,/g, ''),
    tafasil: r.tafasil || '', raqm: r.raqm || '',
    tarikh: r.tarikh || '', mulahazat: '',
  }));
  if (rec) {
    await api.post(`/records/${endpoint}`, {
      id: rec.id,
      rows: [...(rec.rows || []), ...newRows],
      created_by: rec.created_by || createdBy,
      date: rec.date || '',
    });
  } else {
    await api.post(`/records/${endpoint}`, {
      id: Date.now(),
      rows: newRows,
      created_by: createdBy,
      date: new Date().toLocaleDateString('ar-IQ'),
    });
  }
}

export async function saveSalfFromVoucher(voucher) {
  const newRows = (voucher.rows || [])
    .filter(r => (r.tafasil || '').startsWith('من') && r.m3)
    .map(r => ({ dinar: (r.m3 || ''), tafasil: r.tafasil || '', raqm: voucher.docNo || '', tarikh: voucher.docDate || '' }));
  await appendRowsToRecord('khazain', newRows, voucher.savedBy || '');
}

export async function saveSalfIlaFromVoucher(voucher) {
  const newRows = (voucher.rows || [])
    .filter(r => (r.tafasil || '').startsWith('الى') && (r.d3 || r.d4 || r.m3 || r.m4))
    .map(r => ({ dinar: (r.d3 || r.d4 || r.m3 || r.m4 || ''), tafasil: r.tafasil || '', raqm: voucher.docNo || '', tarikh: voucher.docDate || '' }));
  await appendRowsToRecord('khazain-ila', newRows, voucher.savedBy || '');
}

export async function saveMadininFromVoucher(voucher) {
  const newRows = (voucher.rows || [])
    .filter(r => (r.tafasil || '').startsWith('من') && r.m3)
    .map(r => ({ dinar: (r.m3 || ''), tafasil: r.tafasil || '', raqm: voucher.docNo || '', tarikh: voucher.docDate || '' }));
  await appendRowsToRecord('madinin', newRows, voucher.savedBy || '');
}

export async function saveDainunFromVoucher(voucher) {
  const newRows = (voucher.rows || [])
    .filter(r => (r.tafasil || '').startsWith('الى') && (r.d3 || r.d4 || r.m3 || r.m4))
    .map(r => ({ dinar: (r.d3 || r.d4 || r.m3 || r.m4 || ''), tafasil: r.tafasil || '', raqm: voucher.docNo || '', tarikh: voucher.docDate || '' }));
  await appendRowsToRecord('dainun', newRows, voucher.savedBy || '');
}

// ── المناقلات ─────────────────────────────────────────
function normalizeTransfer(t) {
  return {
    ...t,
    fromBab:    t.from_bab    ?? t.fromBab    ?? '',
    toBab:      t.to_bab      ?? t.toBab      ?? '',
    user:       t.requested_by ?? t.user      ?? '',
    approvedBy: t.approved_by  ?? t.approvedBy ?? '',
    rejectedBy: t.rejected_by  ?? t.rejectedBy ?? '',
    rejectNote: t.reject_note  ?? t.rejectNote ?? '',
  };
}

export async function getTransfers(source) {
  const { data } = await api.get('/transfers', { params: source ? { source } : {} });
  return data.map(normalizeTransfer);
}

export async function getAllTransfers() {
  const { data } = await api.get('/transfers');
  return data.map(normalizeTransfer);
}

export async function requestTransfer({ source, fromBab, toBab, amount, note, date, user }) {
  const { data } = await api.post('/transfers', {
    source, from_bab: fromBab, to_bab: toBab, amount, note, date, requested_by: user,
  });
  return data;
}

export async function approveTransfer(id, adminName) {
  await api.patch(`/transfers/${id}/approve`, { admin_name: adminName });
}

export async function rejectTransfer(id, adminName, rejectNote) {
  await api.patch(`/transfers/${id}/reject`, { admin_name: adminName, reject_note: rejectNote });
}

export async function cancelTransfer(id) {
  await api.delete(`/transfers/${id}`);
}

export async function deleteTransfer(id) {
  await api.delete(`/transfers/${id}`);
}

// ── طلبات تعديل الأبواب ───────────────────────────────
function normalizeBabRequest(r) {
  return {
    ...r,
    oldValue:   r.old_value    ?? r.oldValue   ?? 0,
    newValue:   r.new_value    ?? r.newValue   ?? 0,
    user:       r.requested_by ?? r.user       ?? '',
    approvedBy: r.approved_by  ?? r.approvedBy ?? '',
    rejectedBy: r.rejected_by  ?? r.rejectedBy ?? '',
    rejectNote: r.reject_note  ?? r.rejectNote ?? '',
  };
}

export async function getBabRequests(source) {
  const { data } = await api.get('/bab-requests', { params: source ? { source } : {} });
  return data.map(normalizeBabRequest);
}

export async function getAllBabRequests() {
  const { data } = await api.get('/bab-requests');
  return data.map(normalizeBabRequest);
}

export async function requestBabEdit({ source, bab, oldValue, newValue, note, user }) {
  const { data } = await api.post('/bab-requests', {
    source, bab, old_value: oldValue, new_value: newValue, note, requested_by: user,
  });
  return data;
}

export async function approveBabRequest(id, adminName) {
  await api.patch(`/bab-requests/${id}/approve`, { admin_name: adminName });
}

export async function rejectBabRequest(id, adminName, rejectNote) {
  await api.patch(`/bab-requests/${id}/reject`, { admin_name: adminName, reject_note: rejectNote });
}

export async function cancelBabRequest(id) {
  await api.delete(`/bab-requests/${id}`);
}

// ── أسماء الأبواب ─────────────────────────────────────
export async function getBabNamesForSource(source) {
  const { data } = await api.get('/bab-names', { params: { source } });
  return data;
}

export async function addBab(source, babName) {
  await api.post('/bab-names', { source, bab: babName });
  return true;
}

export async function renameBab(source, oldName, newName) {
  await api.put('/bab-names/rename', { source, oldName, newName });
}

// ── الإشعارات ─────────────────────────────────────────
export async function getNotifications() {
  const { data } = await api.get('/notifications');
  return data.map(n => ({ ...n, read: n.is_read ?? n.read ?? false }));
}

export async function addNotification({ type, icon, title, detail, user }) {
  // الباك اند يضيف الإشعارات داخلياً — هذه للاستخدام من الفرونت اند مباشرة
  await api.post('/notifications', { type, icon, title, detail, username: user || '' }).catch(() => {});
}

export async function markNotificationRead(id) {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  await api.patch('/notifications/read-all');
}

export async function clearNotifications() {
  await api.delete('/notifications');
}

export async function getUnreadCount() {
  const { data } = await api.get('/notifications/unread-count');
  return data.count;
}
