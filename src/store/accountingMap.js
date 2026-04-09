// ══════════════════════════════════════════════════════
// ربط أبواب الصرف بدليل الحسابات — API
// ══════════════════════════════════════════════════════
import api from '../api/client.js';

export const BAB_ACCOUNT_MAP = {
  'الات ومعدات': {
    debit:  { code: '2-01-05-03', name: 'الأثاث والآلات والمعدات والأجهزة' },
    credit: { code: '4-1-1',      name: 'البنك / سحب على المكشوف' },
  },
  'وسائل نقل': {
    debit:  { code: '2-01-05-02', name: 'وسائط نقل' },
    credit: { code: '4-1-1',      name: 'البنك / سحب على المكشوف' },
  },
  'متنوعة': {
    debit:  { code: '2-01-02-27', name: 'خدمات أخرى (متنوعة)' },
    credit: { code: '4-1-1',      name: 'البنك / سحب على المكشوف' },
  },
  'مكافآت': {
    debit:  { code: '2-01-01-02', name: 'المكافآت للمنتسبين' },
    credit: { code: '4-1-1',      name: 'البنك / سحب على المكشوف' },
  },
  'ايفادات': {
    debit:  { code: '2-01-02-01', name: 'نفقات السفر' },
    credit: { code: '4-1-1',      name: 'البنك / سحب على المكشوف' },
  },
  'لوازم وسلع': {
    debit:  { code: '2-01-03-09', name: 'المواد واللوازم' },
    credit: { code: '4-1-1',      name: 'البنك / سحب على المكشوف' },
  },
  'بناء وانشاءات': {
    debit:  { code: '2-01-05-01', name: 'مبانٍ وإنشاءات' },
    credit: { code: '4-1-1',      name: 'البنك / سحب على المكشوف' },
  },
};

export function generateJournalEntry(voucher) {
  const map = BAB_ACCOUNT_MAP[voucher.bab];
  if (!map) return null;
  return {
    voucher_id: voucher.id,
    date:       voucher.doc_date || voucher.docDate || new Date().toLocaleDateString('en-US'),
    ref:        voucher.doc_no   || voucher.docNo   || '',
    narration:  `${voucher.details || ''} - ${voucher.bab} - ${voucher.source}`,
    source:     voucher.source,
    status:     'مرحّل',
    lines: [
      { account: map.debit.code,  account_name: map.debit.name,  bab: voucher.bab, debit: Number(voucher.chk_amt || voucher.chkAmt || 0), credit: 0 },
      { account: map.credit.code, account_name: map.credit.name, bab: '',          debit: 0, credit: Number(voucher.chk_amt || voucher.chkAmt || 0) },
    ],
  };
}

export async function getJournalEntries(source) {
  const { data } = await api.get('/journal/entries', { params: source ? { source } : {} });
  return data;
}

export async function saveJournalEntry(entry) {
  await api.post('/journal/entries', entry);
}

export async function deleteJournalEntry(voucherId) {
  await api.delete(`/journal/entries/${voucherId}`);
}
