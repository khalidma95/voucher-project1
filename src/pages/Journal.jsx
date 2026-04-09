import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar.jsx";
import api from "../api/client.js";
import { addAuditLog } from "../store/auditLog.js";
import ModalArchive from "../components/dashboard/ModalArchive.jsx";
import ModalViewArchive from "../components/dashboard/ModalViewArchive.jsx";

const NROWS   = 20;
const emptyRow = () => ({
  bayan:'', m3:'', d3:'', fari4:'',
  dal3:'', dal4:'', dal5:'',
  kulf5:'', kulf6:'', kulf7:'', kulf8:'', kulf9:'',
});

const J_SIG_KEYS = ['munazzim','muhasib','dirHisabat','mudaqqiq','musadaqa'];
let _sigDefaults = {};
const loadSigDefaults = async () => {
  try { const {data} = await api.get('/journal/sig-defaults'); _sigDefaults = data || {}; } catch {}
};
const saveSigDefaultsAPI = async (d) => { _sigDefaults = d; await api.put('/journal/sig-defaults', d).catch(()=>{}); };
const blankSigs = () => J_SIG_KEYS.reduce((o,k) => ({ ...o, [k]: _sigDefaults[k]||'' }), {});

const getJournals   = async ()  => { const {data} = await api.get('/journal/vouchers'); return data; };
const saveJournal   = async (e) => { await api.post('/journal/vouchers', e); };
const deleteJournal = async (id)=> { await api.delete(`/journal/vouchers/${id}`); };

function CellInput({ value, onChange, right = false, small = false }) {
  return (
    <input
      value={value}
      onChange={onChange}
      className="w-full outline-none text-center rounded"
      style={{
        background:  'var(--th-input-bg)',
        border:      '1px solid var(--th-input-border)',
        color:       'var(--th-text)',
        padding:     small ? '4px 3px' : '6px 4px',
        fontSize:    small ? 11 : 12,
        colorScheme: 'var(--th-color-scheme)',
        textAlign:   right ? 'right' : 'center',
        fontFamily:  "'Noto Naskh Arabic','Times New Roman',serif",
      }}
    />
  );
}

export default function Journal({ user, onLogout, theme, toggleTheme }) {
  const readOnly = user?.role === 'admin';
  const [view,     setView]    = useState('list');
  const [search,   setSearch]  = useState('');
  const [journals, setJournals]= useState([]);
  const [rows,     setRows]    = useState(Array.from({ length: NROWS }, emptyRow));
  const [visRows,  setVisRows] = useState(3);
  const [pageNo,   setPageNo]  = useState('');
  const [sigs,          setSigs]          = useState(blankSigs);
  const [showDefaults,  setShowDefaults]  = useState(false);
  const [draftDefaults, setDraftDefaults] = useState({});
  const [preview,     setPreview]     = useState(null);
  const [archiveItem, setArchiveItem] = useState(null);
  const [archiveImg,  setArchiveImg]  = useState(null);
  const [viewArchive, setViewArchive] = useState(null);

  const load = async () => setJournals(await getJournals());
  useEffect(() => { loadSigDefaults().then(() => setSigs(blankSigs())); load(); }, []);

  const handleArchiveSave = async () => {
    if (archiveItem) await api.patch(`/journal/vouchers/${archiveItem.id}/archive`, { archive_img: archiveImg }).catch(()=>{});
    setArchiveItem(null); setArchiveImg(null); load();
  };

  const updateRow = (i, f, v) => setRows(p => p.map((r, idx) => idx === i ? { ...r, [f]:v } : r));

  const handleSave = async () => {
    const filledRows = rows.filter(r => r.bayan || r.m3 || r.d3 || r.fari4);
    if (!filledRows.length) { alert('أدخل بيانات أولاً'); return; }
    if (!pageNo)            { alert('أدخل رقم صفحة اليومية'); return; }
    await saveJournal({ page_no: pageNo, rows: filledRows, sigs, created_by: user.name });
    await addAuditLog({ user, action:'create', entity:'journal', detail:`إضافة سند قيد — صفحة رقم ${pageNo}` });
    setRows(Array.from({ length: NROWS }, emptyRow));
    setSigs(blankSigs());
    setPageNo(''); setVisRows(3); load(); setView('list');
  };

  const buildPrintHTML = (entry) => {
    const filled = entry.rows || [];
    const PRINT_ROWS = 25;
    const allRows = [...filled];
    while (allRows.length < PRINT_ROWS) allRows.push(emptyRow());

    const totalM3    = filled.reduce((s,x) => s + (parseFloat(x.m3)    || 0), 0);
    const totalD3    = filled.reduce((s,x) => s + (parseFloat(x.d3)    || 0), 0);
    const totalFari4 = filled.reduce((s,x) => s + (parseFloat(x.fari4) || 0), 0);

    const th = 'border:0.7px solid #000;text-align:center;padding:3px 4px;background:#f0f0f0;font-weight:700;font-size:9pt';
    const td = 'border:0.7px solid #000;text-align:center;padding:1px 3px;height:20px;font-size:9pt';

    const rowsHTML = allRows.map(row =>
      `<tr>
        <td style="${td}">${row.m3||''}</td>
        <td style="${td}">${row.d3||''}</td>
        <td style="${td}">${row.fari4||''}</td>
        <td style="${td};text-align:right;padding-right:6px">${row.bayan||''}</td>
        <td style="${td}">${row.dal3||''}</td>
        <td style="${td}">${row.dal4||''}</td>
        <td style="${td}">${row.dal5||''}</td>
        <td style="${td}">${row.kulf5||''}</td>
        <td style="${td}">${row.kulf6||''}</td>
        <td style="${td}">${row.kulf7||''}</td>
        <td style="${td}">${row.kulf8||''}</td>
        <td style="${td}">${row.kulf9||''}</td>
      </tr>`
    ).join('');

    const s = entry.sigs || {};
    const sigsHTML = [
      ['اسم وتوقيع المنظم',s.munazzim||''],
      ['اسم وتوقيع المحاسب',s.muhasib||''],
      ['مدير الحسابات',s.dirHisabat||''],
      ['اسم وتوقيع المدقق',s.mudaqqiq||''],
      ['المصادقة',s.musadaqa||''],
    ].map(([lbl, val]) =>
      `<div style="text-align:center">
        <div style="font-weight:700;font-size:9.5pt;margin-bottom:6px">${lbl}</div>
        <div style="border-bottom:1.5px solid #000;min-height:20px;font-size:9pt">${val}</div>
      </div>`
    ).join('');

    return `<!DOCTYPE html><html lang="ar" dir="rtl"><head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:"Noto Naskh Arabic","Times New Roman",serif;direction:rtl;background:#fff;color:#000}
  @page{size:A4 portrait;margin:12mm 10mm}
  @media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  table{width:100%;border-collapse:collapse}
</style></head><body>
<div style="text-align:center;margin-bottom:10px">
  <span style="font-size:17pt;font-weight:700;border:2px solid #000;padding:4px 28px">سند قيد يومية</span>
</div>
<div style="text-align:right;font-size:10pt;margin-bottom:6px">رقم صفحة يومية: <strong>${entry.pageNo||''}</strong></div>
<table>
  <colgroup>
    <col style="width:55px"/><col style="width:55px"/><col style="width:55px"/>
    <col/>
    <col style="width:28px"/><col style="width:28px"/><col style="width:28px"/>
    <col style="width:28px"/><col style="width:28px"/><col style="width:28px"/><col style="width:28px"/><col style="width:28px"/>
  </colgroup>
  <thead>
    <tr>
      <th colspan="2" style="${th}">٣</th>
      <th style="${th}">٤</th>
      <th rowspan="3" style="${th}">البيـــان</th>
      <th colspan="3" style="${th}">الدليل المحاسبي</th>
      <th colspan="5" style="${th}">مركز الكلفة</th>
    </tr>
    <tr>
      <th style="${th}">منه</th><th style="${th}">له</th><th style="${th}">فرعي</th>
      <th style="${th}">٣</th><th style="${th}">٤</th><th style="${th}">٥</th>
      <th style="${th}">٥</th><th style="${th}">٦</th><th style="${th}">٧</th><th style="${th}">٨</th><th style="${th}">٩</th>
    </tr>
    <tr>
      <th style="${th}">دينار</th><th style="${th}">دينار</th><th style="${th}">دينار</th>
      <th colspan="3" style="${th}"></th><th colspan="5" style="${th}"></th>
    </tr>
  </thead>
  <tbody>
    ${rowsHTML}
    <tr style="border-top:2px solid #000">
      <td style="${td};font-weight:700;border-top:2px solid #000">${totalM3>0?totalM3.toLocaleString('en-US'):''}</td>
      <td style="${td};font-weight:700;border-top:2px solid #000">${totalD3>0?totalD3.toLocaleString('en-US'):''}</td>
      <td style="${td};font-weight:700;border-top:2px solid #000">${totalFari4>0?totalFari4.toLocaleString('en-US'):''}</td>
      <td style="${td};text-align:right;padding-right:8px;font-weight:700;border-top:2px solid #000">المجموع فقط</td>
      <td colspan="8" style="${td};border-top:2px solid #000"></td>
    </tr>
  </tbody>
</table>
<div style="margin-top:18px;display:grid;grid-template-columns:repeat(5,1fr);gap:14px">${sigsHTML}</div>
</body></html>`;
  };

  const handlePrint = (entry) => {
    const win = window.open('', '_blank');
    if (!win) { alert('يرجى السماح بالنوافذ المنبثقة'); return; }
    win.document.write(buildPrintHTML(entry));
    win.document.close();
    setTimeout(() => win.print(), 700);
  };


  /* ── واجهة الإدخال ── */
  const newEntryJSX = (
    <div>
      {/* رقم الصفحة */}
      <div className="flex gap-4 mb-5 items-center">
        <div className="flex gap-2.5 items-center">
          <div className="text-sm" style={{ color:'var(--th-text-sub)' }}>رقم صفحة اليومية:</div>
          <input
            value={pageNo}
            onChange={e => setPageNo(e.target.value)}
            placeholder="مثال: 1"
            className="input-field text-center"
            style={{ width: 100 }}
          />
        </div>
        <div className="text-xs" style={{ color:'var(--th-text-muted)' }}>
          {new Date().toLocaleDateString('ar-IQ')}
        </div>
      </div>

      {/* الجدول */}
      <div className="overflow-x-auto mb-5">
        <table className="border-collapse text-xs font-arabic" style={{ width:'100%', minWidth:900 }}>
          <thead>
            <tr style={{ background:'#1a3a5c' }}>
              <th colSpan={3} className="px-2 py-2 text-center text-white border" style={{ borderColor:'var(--th-border)' }}>٣</th>
              <th rowSpan={3} className="px-2 py-2 text-center text-white border" style={{ borderColor:'var(--th-border)', width:220 }}>البيـــان</th>
              <th colSpan={3} className="px-2 py-2 text-center text-white border" style={{ borderColor:'var(--th-border)' }}>الدليل المحاسبي</th>
              <th colSpan={5} className="px-2 py-2 text-center text-white border" style={{ borderColor:'var(--th-border)' }}>مركز الكلفة</th>
            </tr>
            <tr style={{ background:'#1a3a5c' }}>
              {['منه','له','٤ فرعي'].map(h => (
                <th key={h} className="px-2 py-1.5 text-center text-white border" style={{ borderColor:'var(--th-border)' }}>{h}</th>
              ))}
              {['٣','٤','٥'].map(h => (
                <th key={h} className="px-2 py-1.5 text-center text-white border" style={{ borderColor:'var(--th-border)' }}>{h}</th>
              ))}
              {['٥','٦','٧','٨','٩'].map(h => (
                <th key={h} className="px-2 py-1.5 text-center text-white border" style={{ borderColor:'var(--th-border)' }}>{h}</th>
              ))}
            </tr>
            <tr style={{ background:'#2a5a8c' }}>
              {['دينار','دينار','دينار'].map((h, i) => (
                <th key={i} className="px-2 py-1 text-center text-white border text-[11px]" style={{ borderColor:'var(--th-border)' }}>{h}</th>
              ))}
              <th colSpan={3} className="border" style={{ borderColor:'var(--th-border)' }} />
              <th colSpan={5} className="border" style={{ borderColor:'var(--th-border)' }} />
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, visRows).map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'tr-even' : 'tr-odd'}>
                {(['m3','d3','fari4']).map(f => (
                  <td key={f} className="p-0.5 border" style={{ borderColor:'var(--th-border)' }}>
                    <CellInput value={row[f]||''} onChange={e => updateRow(i, f, e.target.value)} />
                  </td>
                ))}
                <td className="p-0.5 border" style={{ borderColor:'var(--th-border)' }}>
                  <CellInput value={row.bayan||''} onChange={e => updateRow(i, 'bayan', e.target.value)} right />
                </td>
                {(['dal3','dal4','dal5','kulf5','kulf6','kulf7','kulf8','kulf9']).map(f => (
                  <td key={f} className="p-0.5 border" style={{ borderColor:'var(--th-border)' }}>
                    <CellInput value={row[f]||''} onChange={e => updateRow(i, f, e.target.value)} small />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* زر إضافة صف */}
      {visRows < NROWS && (
        <button
          onClick={() => setVisRows(v => v + 1)}
          className="w-full mb-4 py-2.5 rounded-lg text-sm font-bold cursor-pointer font-arabic transition-all"
          style={{
            background: 'rgba(245,158,11,0.08)',
            border:     '2px dashed rgba(245,158,11,0.4)',
            color:      '#f59e0b',
          }}>
          ＋ إضافة صف ({visRows}/{NROWS})
        </button>
      )}

      {/* التواقيع */}
      <div className="rounded-xl px-5 py-4 mb-5"
        style={{
          background: 'var(--th-surface-alt)',
          border:     '1px solid var(--th-border)',
        }}>
        <div className="flex justify-between items-center mb-3">
          <div className="text-sm font-bold" style={{ color:'var(--th-accent)' }}>✍️ التواقيع</div>
          <button
            onClick={() => { setDraftDefaults({..._sigDefaults}); setShowDefaults(true); }}
            className="text-xs px-3 py-1 rounded cursor-pointer font-arabic"
            style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', color:'#f59e0b' }}>
            ⚙️ تعيين أسماء افتراضية
          </button>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {[
            ['munazzim','اسم وتوقيع المنظم'],
            ['muhasib','اسم وتوقيع المحاسب'],
            ['dirHisabat','مدير الحسابات'],
            ['mudaqqiq','اسم وتوقيع المدقق'],
            ['musadaqa','المصادقة'],
          ].map(([k, lbl]) => (
            <div key={k}>
              <div className="field-label">{lbl}</div>
              <input
                value={sigs[k]}
                onChange={e => setSigs(s => ({ ...s, [k]:e.target.value }))}
                className="input-field"
              />
            </div>
          ))}
        </div>
      </div>

      {/* أزرار */}
      <div className="flex gap-2.5">
        <button onClick={handleSave}
          className="flex-[2] py-3 rounded-lg text-sm font-bold cursor-pointer border-none text-white font-arabic"
          style={{ background:'linear-gradient(135deg,var(--th-green),#059669)' }}>
          💾 حفظ السند
        </button>
        <button onClick={() => handlePrint({ pageNo, rows:rows.filter(r=>r.bayan||r.m3||r.d3||r.fari4), sigs })}
          className="flex-1 py-3 rounded-lg text-sm font-bold cursor-pointer font-arabic"
          style={{
            background: 'rgba(96,165,250,0.15)',
            border:     '1px solid rgba(96,165,250,0.4)',
            color:      '#60a5fa',
          }}>
          🖨️ طباعة
        </button>
        <button onClick={() => setView('list')} className="btn-secondary flex-1 py-3 rounded-lg text-sm font-arabic">
          إلغاء
        </button>
      </div>
    </div>
  );

  return (
    <div className="page-bg flex font-arabic">
      <Sidebar user={user} theme={theme} toggleTheme={toggleTheme} onLogout={onLogout} />

      <div className="flex-1 overflow-auto px-8 py-7 mt-7">

        {/* رأس */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-xl font-bold" style={{ color:'var(--th-accent)' }}>📒 سند قيد يومية</div>
          {view === 'list' && !readOnly && (
            <button onClick={() => setView('new')}
              className="rounded-lg px-5 py-2.5 text-sm font-bold cursor-pointer border-none text-white font-arabic"
              style={{ background:'linear-gradient(135deg,var(--th-green),#059669)' }}>
              ➕ سند جديد
            </button>
          )}
          {view === 'new' && (
            <div className="text-sm" style={{ color:'var(--th-text-muted)' }}>إدخال سند جديد</div>
          )}
        </div>

        {view === 'new' && newEntryJSX}

        {view === 'list' && (
          <>
          {journals.length > 0 && (
            <div className="mb-4">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="🔍 ابحث برقم الصفحة أو التاريخ أو اسم المنظم..."
                className="w-full outline-none rounded-xl px-4 py-3 text-sm font-arabic text-right"
                style={{
                  background: 'var(--th-card-bg)',
                  border:     '1px solid var(--th-border)',
                  color:      'var(--th-text)',
                  direction:  'rtl',
                }}
              />
            </div>
          )}
          {(() => {
            const q = search.trim().toLowerCase();
            const filtered = journals.slice().reverse().filter(j =>
              !q ||
              (j.pageNo||'').toString().includes(q) ||
              (j.date||'').includes(q) ||
              (j.createdBy||'').toLowerCase().includes(q)
            );
            return filtered.length === 0 ? (
              <div className="text-center py-20 text-sm" style={{ color:'var(--th-text-muted)' }}>
                {journals.length === 0 ? 'لا توجد سندات بعد — اضغط "سند جديد" للبدء' : 'لا توجد نتائج للبحث'}
              </div>
            ) : (
            <div className="flex flex-col gap-3">
              {filtered.map(j => (
                <div key={j.id}
                  className="flex justify-between items-center rounded-xl px-5 py-4"
                  style={{
                    background: 'var(--th-card-bg)',
                    border:     '1px solid var(--th-border)',
                  }}>
                  <div>
                    <div className="text-base font-bold" style={{ color:'var(--th-accent)' }}>
                      صفحة يومية رقم: {j.pageNo}
                    </div>
                    <div className="text-sm mt-1" style={{ color:'var(--th-text-muted)' }}>
                      {j.date} · {j.rows.length} صف · بواسطة: {j.createdBy}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handlePrint(j)}
                      className="px-4 py-2 rounded-lg text-xs font-bold cursor-pointer font-arabic"
                      style={{ background:'rgba(96,165,250,0.15)', border:'1px solid rgba(96,165,250,0.4)', color:'#60a5fa' }}>
                      🖨️ طباعة
                    </button>
                    {!readOnly && (
                      j.archiveImg ? (
                        <span title="تم الأرشفة - اضغط للعرض"
                          onClick={() => setViewArchive(j)}
                          className="px-4 py-2 rounded-lg text-xs font-bold cursor-pointer font-arabic"
                          style={{ background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.4)', color:'#10b981' }}>
                          ✅ مؤرشف
                        </span>
                      ) : (
                        <button onClick={() => { setArchiveItem(j); setArchiveImg(null); }}
                          className="px-4 py-2 rounded-lg text-xs font-bold cursor-pointer font-arabic"
                          style={{ background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.35)', color:'#f59e0b' }}>
                          📷 أرشفة
                        </button>
                      )
                    )}
                    {!readOnly && (
                      <button
                        onClick={async () => { if (confirm('حذف هذا السند؟')) { await deleteJournal(j.id); await addAuditLog({ user, action:'delete', entity:'journal', detail:`حذف سند قيد — صفحة رقم ${j.page_no||''}` }); load(); } }}
                        className="btn-danger px-4 py-2 rounded-lg text-xs font-arabic">
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            );
          })()}
          </>
        )}
      </div>

      {showDefaults && (
        <div className="modal-overlay">
          <div className="modal-card font-arabic" style={{ width:480 }}>
            <div className="modal-header">
              <div className="text-sm font-bold" style={{ color:'var(--th-accent)' }}>⚙️ الأسماء الافتراضية للتواقيع</div>
              <button onClick={() => setShowDefaults(false)} className="btn-close">✕</button>
            </div>
            <div className="px-5 py-4">
              <div className="text-xs mb-4" style={{ color:'var(--th-text-muted)' }}>
                هذه الأسماء تُملأ تلقائياً عند إنشاء سند قيد جديد، ويمكن تعديلها في أي وقت.
              </div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  ['munazzim','اسم وتوقيع المنظم'],
                  ['muhasib','اسم وتوقيع المحاسب'],
                  ['dirHisabat','مدير الحسابات'],
                  ['mudaqqiq','اسم وتوقيع المدقق'],
                  ['musadaqa','المصادقة'],
                ].map(([k, lbl]) => (
                  <div key={k}>
                    <div className="field-label">{lbl}</div>
                    <input
                      value={draftDefaults[k]||''}
                      onChange={e => setDraftDefaults(d => ({ ...d, [k]:e.target.value }))}
                      className="input-field"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    saveSigDefaultsAPI(draftDefaults);
                    setSigs(s => ({ ...s, ...Object.fromEntries(J_SIG_KEYS.map(k => [k, draftDefaults[k]||s[k]])) }));
                    setShowDefaults(false);
                  }}
                  className="flex-[2] py-2.5 rounded-lg text-sm font-bold cursor-pointer border-none text-white font-arabic"
                  style={{ background:'linear-gradient(135deg,var(--th-green),#059669)' }}>
                  💾 حفظ كافتراضي
                </button>
                <button onClick={() => setShowDefaults(false)} className="btn-secondary flex-1 py-2.5 rounded-lg text-sm font-arabic">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {archiveItem && (
        <ModalArchive
          item={archiveItem}
          archiveImg={archiveImg}
          onImgChange={setArchiveImg}
          onSave={handleArchiveSave}
          onClose={() => { setArchiveItem(null); setArchiveImg(null); }}
        />
      )}
      {viewArchive && (
        <ModalViewArchive
          item={viewArchive}
          onReplace={() => { setArchiveItem(viewArchive); setArchiveImg(viewArchive.archiveImg); setViewArchive(null); }}
          onClose={() => setViewArchive(null)}
        />
      )}
    </div>
  );
}
