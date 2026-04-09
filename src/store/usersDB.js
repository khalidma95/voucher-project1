// ══════════════════════════════════════════════════════
// إدارة المستخدمين — API
// ══════════════════════════════════════════════════════
import api from '../api/client.js';

export const ROLES = [
  { value:'admin',      label:'مدير النظام',   color:'#f59e0b' },
  { value:'accountant', label:'محاسب',          color:'#34d399' },
  { value:'voucher',    label:'مستخدم الصرف',  color:'#818cf8' },
  { value:'auditor',    label:'مدقق',           color:'#60a5fa' },
  { value:'records',    label:'سجلات',          color:'#f97316' },
  { value:'journal',    label:'سند القيد',      color:'#a78bfa' },
];

export async function getUsers() {
  const { data } = await api.get('/users');
  return data;
}

export async function addUser(userData) {
  try {
    const { data } = await api.post('/users', userData);
    return { success: true, user: data };
  } catch (err) {
    return { error: err.response?.data?.error || 'خطأ في الخادم' };
  }
}

export async function updateUser(id, userData) {
  try {
    const { data } = await api.put(`/users/${id}`, userData);
    return { success: true, user: data };
  } catch (err) {
    return { error: err.response?.data?.error || 'خطأ في الخادم' };
  }
}

export async function deleteUser(id) {
  await api.delete(`/users/${id}`);
}

export async function changePassword(id, oldPassword, newPassword) {
  try {
    await api.post('/auth/change-password', { oldPassword, newPassword });
    return { success: true };
  } catch (err) {
    return { error: err.response?.data?.error || 'خطأ في الخادم' };
  }
}

export async function adminResetPassword(id, newPassword) {
  try {
    await api.post(`/users/${id}/reset-password`, { newPassword });
    return { success: true };
  } catch (err) {
    return { error: err.response?.data?.error || 'خطأ في الخادم' };
  }
}
