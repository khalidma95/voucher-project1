// ══════════════════════════════════════════════════════
// سجل العمليات — API
// ══════════════════════════════════════════════════════
import api from '../api/client.js';

export async function addAuditLog({ user, action, entity, detail, entityId = null }) {
  await api.post('/audit-log', {
    user_name:  user?.name  || 'غير معروف',
    user_role:  user?.role  || '',
    action, entity, detail,
    entity_id: entityId ? String(entityId) : null,
  }).catch(() => {}); // لا نوقف التطبيق بسبب فشل سجل العمليات
}

export async function getAllAuditLogs() {
  const { data } = await api.get('/audit-log');
  return data;
}

export async function getUserAuditLogs(userName) {
  const { data } = await api.get('/audit-log', { params: { user: userName } });
  return data;
}

export async function clearAuditLogs() {
  await api.delete('/audit-log');
}
