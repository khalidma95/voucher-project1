import { useState, useEffect } from "react";
import { useNavigate }         from "react-router-dom";
import Sidebar                from "../components/Sidebar.jsx";
import api from "../api/client.js";
import { addAuditLog }        from "../store/auditLog.js";

const SOURCES = [
  { name:'برنامج تطوير المختبرات', color:'#f59e0b', icon:'🔬' },
  { name:'برنامج صيانة الاصناف',   color:'#34d399', icon:'🌱' },
  { name:'حملة الدعم',              color:'#60a5fa', icon:'🤝' },
];
const fmt  = n => Number(n||0).toLocaleString('en-US');

// ── دوال API للسجلات ──
async function getJournalEntries() { const {data} = await api.get('/journal/entries'); return data; }
async function getVouchers()       { const {data} = await api.get('/vouchers'); return data; }

// ── سجل الايرادات ──
async function getIradatRecords()    { const {data} = await api.get('/records/iradat'); return data; }
async function saveIradatRecord(rec) { await api.post('/records/iradat', { ...rec, created_by: rec.createdBy||'' }); }
async function updateIradatRecord(u) { await api.post('/records/iradat', { ...u,   created_by: u.createdBy||'' }); }
async function deleteIradatRecord(id){ await api.delete(`/records/iradat/${id}`); }

// ── سجل الخزائن ──
async function getKhazainRecords()    { const {data} = await api.get('/records/khazain');     return data; }
async function getKhazainIlaRecords() { const {data} = await api.get('/records/khazain-ila'); return data; }
async function saveKhazainRecord(rec) { await api.post('/records/khazain', { ...rec, created_by: rec.createdBy||'' }); }
async function updateKhazainRecord(u) { await api.post('/records/khazain', { ...u,   created_by: u.createdBy||'' }); }
async function deleteKhazainRecord(id){ await api.delete(`/records/khazain/${id}`); }

// ── خريطة مفاتيح localStorage → API endpoints (سجل عام) ──
const SIJIL_ENDPOINT = {
  'amanat_records':      '/records/amanat',
  'amanat_ila_records':  '/records/amanat-ila',
  'madinin_records':     '/records/madinin',
  'madinin_ila_records': '/records/madinin-ila',
  'dainun_records':      '/records/dainun',
  'dainun_ila_records':  '/records/dainun-ila',
};

// ── بطاقة السجل ──
function SijilCard({ label, icon, count, color, active, onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-4 rounded-[14px] p-[18px_20px] cursor-pointer transition-all font-arabic text-right w-full"
      style={{
        background: active ? `linear-gradient(135deg,${color}30,${color}15)` : 'var(--th-card-bg)',
        border: `1px solid ${active ? color : 'var(--th-border)'}`,
      }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[22px] flex-shrink-0"
        style={{ background:`${color}20`, border:`1px solid ${color}30` }}>{icon}</div>
      <div>
        <div className="text-[17px] font-bold" style={{ color: active ? color : 'var(--th-text)' }}>{label}</div>
        <div className="text-[15px] mt-0.5" style={{ color:'var(--th-text-muted)' }}>{count} سجل</div>
      </div>
    </button>
  );
}

// ── جدول عام ──
function Table({ columns, rows, emptyMsg }) {
  if (!rows.length) return (
    <div className="text-center py-[60px] text-sm text-th-muted font-arabic">{emptyMsg}</div>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[17px] font-arabic">
        <thead>
          <tr className="border-b border-th-border" style={{ background:'var(--th-surface-alt)' }}>
            {columns.map(col => (
              <th key={col.key} className="px-4 py-3 text-right text-sm font-semibold" style={{ color:'var(--th-text-muted)' }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i%2===0 ? 'tr-even' : 'tr-odd'} style={{ borderBottom:'1px solid var(--th-border)' }}>
              {columns.map(col => (
                <td key={col.key} className="px-4 py-[11px]"
                  style={{
                    color: col.color ? col.color(row[col.key]) : 'var(--th-text)',
                    fontWeight: col.bold ? 700 : 400,
                  }}>
                  {col.render ? col.render(row) : (row[col.key] || '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── طباعة عامة ──
function printTable(title, columns, rows) {
  const headers = columns.map(c => `<th>${c.label}</th>`).join('');
  const body = rows.map((row, i) => `<tr class="${i%2===0?'even':''}">${columns.map(c => `<td>${c.render ? c.render(row) : (row[c.key]||'—')}</td>`).join('')}</tr>`).join('');
  const w = window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600;700&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Naskh Arabic',serif;direction:rtl;padding:30px}@page{size:A4 landscape;margin:15mm}h2{text-align:center;font-size:18px;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#1a3a5c;color:#fff;padding:9px 10px;text-align:right}td{padding:8px 10px;border:1px solid #ddd}tr.even td{background:#f5f5f5}</style></head><body><h2>${title}</h2><table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table></body></html>`);
  w.document.close(); setTimeout(() => w.print(), 600);
}

// ═══════════════════════════════════════════
// سجل الايرادات — كمبوننت فرعي
// ═══════════════════════════════════════════
const NUM_TYPES = 8;
const IRADAT_ROWS = 25;
const emptyIradatRow = () => {
  const c = {};
  for (let i = 1; i <= NUM_TYPES; i++) { c[`t${i}_dinar`] = ''; c[`t${i}_fils`] = ''; }
  return c;
};

function IradatRegister({ user, readOnly = false }) {
  const [subView, setSubView] = useState('list');
  const [records, setRecords] = useState([]);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [adad, setAdad] = useState('');
  const [mada, setMada] = useState('');
  const [muhasaba, setMuhasaba] = useState('٦');
  const [typeNames, setTypeNames] = useState(Array.from({length:NUM_TYPES}, () => ''));
  const [rows, setRows] = useState(Array.from({length:IRADAT_ROWS}, emptyIradatRow));
  const [visRows, setVisRows] = useState(5);

  const load = () => setRecords(getIradatRecords());
  useEffect(() => { load(); }, []);

  const updateRow = (i, f, v) => setRows(p => p.map((r, idx) => idx === i ? { ...r, [f]: v } : r));
  const updateTypeName = (i, v) => setTypeNames(p => p.map((n, idx) => idx === i ? v : n));

  const resetForm = () => {
    setAdad(''); setMada(''); setMuhasaba('٦');
    setTypeNames(Array.from({length:NUM_TYPES}, () => ''));
    setRows(Array.from({length:IRADAT_ROWS}, emptyIradatRow));
    setVisRows(5); setEditId(null);
  };

  const colTotals = [];
  for (let c = 1; c <= NUM_TYPES; c++) {
    colTotals.push({
      dinar: rows.slice(0, visRows).reduce((s, r) => s + (parseFloat(r[`t${c}_dinar`]) || 0), 0),
      fils:  rows.slice(0, visRows).reduce((s, r) => s + (parseFloat(r[`t${c}_fils`]) || 0), 0),
    });
  }

  const handleSave = () => {
    const filled = rows.filter(r => { for (let c=1;c<=NUM_TYPES;c++) if(r[`t${c}_dinar`]||r[`t${c}_fils`]) return true; return false; });
    if (!filled.length) { alert('أدخل بيانات أولاً'); return; }
    const entry = { id: editId || Date.now(), adad, mada, muhasaba, typeNames:[...typeNames], rows:filled, createdBy:user.name, date:new Date().toLocaleDateString('ar-IQ'), ...(editId ? {updatedAt:new Date().toISOString()} : {}) };
    if (editId) { updateIradatRecord(entry); addAuditLog({ user, action:'update', entity:'iradat', detail:`تعديل سجل إيرادات — العدد: ${adad} · المادة: ${mada}` }); }
    else        { saveIradatRecord(entry);   addAuditLog({ user, action:'create', entity:'iradat', detail:`إضافة سجل إيرادات — العدد: ${adad} · المادة: ${mada}` }); }
    resetForm(); load(); setSubView('list');
  };

  const handleEdit = (rec) => {
    setEditId(rec.id); setAdad(rec.adad||''); setMada(rec.mada||''); setMuhasaba(rec.muhasaba||'٦');
    setTypeNames(rec.typeNames || Array.from({length:NUM_TYPES}, () => ''));
    const lr = [...(rec.rows||[])]; while(lr.length < IRADAT_ROWS) lr.push(emptyIradatRow());
    setRows(lr); setVisRows(Math.max(5, (rec.rows||[]).length + 1)); setSubView('edit');
  };

  const filteredRecs = records.filter(r => { if(!search.trim()) return true; const s=search.trim().toLowerCase(); return (r.adad||'').includes(s)||(r.mada||'').includes(s)||(r.date||'').includes(s)||(r.createdBy||'').toLowerCase().includes(s); });

  const printIradat = (rec) => {
    const filled = rec.rows || [];
    const PR = 30; const allRows = [...filled]; while(allRows.length < PR) allRows.push(emptyIradatRow());
    const names = rec.typeNames || [];
    const tots = [];
    for (let c=1;c<=NUM_TYPES;c++) tots.push({ dinar:filled.reduce((s,r)=>s+(parseFloat(r[`t${c}_dinar`])||0),0), fils:filled.reduce((s,r)=>s+(parseFloat(r[`t${c}_fils`])||0),0) });
    const th='border:1px solid #000;text-align:center;padding:2px 2px;background:#f0f0f0;font-weight:700;font-size:7.5pt';
    const td='border:1px solid #000;text-align:center;padding:0px 1px;height:16px;font-size:7.5pt';
    let hCols='', shCols='';
    for(let c=1;c<=NUM_TYPES;c++){
      hCols+=`<th colspan="2" style="${th}">${names[c-1]||'النوع'}</th>`;
      shCols+=`<th style="${th};font-size:6.5pt;width:22px">فلس</th><th style="${th}">دينار</th>`;
    }
    const rHTML = allRows.map(row => { let cells=''; for(let c=1;c<=NUM_TYPES;c++){ cells+=`<td style="${td};width:18px">${row[`t${c}_fils`]||''}</td><td style="${td}">${row[`t${c}_dinar`]||''}</td>`; } return `<tr>${cells}</tr>`; }).join('');
    let tCells='';
    for(let c=1;c<=NUM_TYPES;c++){ tCells+=`<td style="${td};font-weight:700;border-top:2px solid #000">${tots[c-1].fils>0?tots[c-1].fils.toLocaleString('en-US'):''}</td><td style="${td};font-weight:700;border-top:2px solid #000">${tots[c-1].dinar>0?tots[c-1].dinar.toLocaleString('en-US'):''}</td>`; }
    const w = window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600;700&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Naskh Arabic','Times New Roman',serif;direction:rtl;background:#fff;color:#000}@page{size:A4 portrait;margin:8mm 6mm}@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}table{width:100%;border-collapse:collapse;table-layout:fixed}</style></head><body>
    <div style="text-align:center;margin-bottom:6px"><div style="font-size:14pt;font-weight:700">سجل الايرادات معاملات الموازنة</div><div style="font-size:11pt;font-weight:600;margin-top:2px">((الايرادات النهائية))</div></div>
    <div style="display:flex;justify-content:space-between;font-size:9pt;margin-bottom:6px"><div style="text-align:right"><div>العـدد (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${rec.adad||''}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</div><div>المـادة (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${rec.mada||''}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</div></div><div>محاسبة / ${rec.muhasaba||'٦'}</div></div>
    <table><thead><tr>${hCols}</tr><tr>${shCols}</tr></thead><tbody>${rHTML}<tr>${tCells}</tr></tbody></table>
    </body></html>`);
    w.document.close(); setTimeout(()=>w.print(),700);
  };

  const thTd = { border:'1px solid var(--th-border)', textAlign:'center' };

  const PreviewModal = () => {
    if (!preview) return null;
    const rec = preview; const filled = rec.rows || []; const names = rec.typeNames || [];
    const tots = []; for(let c=1;c<=NUM_TYPES;c++) tots.push({ dinar:filled.reduce((s,r)=>s+(parseFloat(r[`t${c}_dinar`])||0),0), fils:filled.reduce((s,r)=>s+(parseFloat(r[`t${c}_fils`])||0),0) });
    return (
      <div className="modal-overlay" onClick={()=>setPreview(null)}>
        <div className="modal-card w-[96%] max-w-[1200px] max-h-[92vh] overflow-auto p-7 font-arabic" onClick={e=>e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-[19px] font-bold text-th-accent">سجل الايرادات معاملات الموازنة</div>
              <div className="text-sm text-th-muted mt-1">العدد: {rec.adad||'—'} · المادة: {rec.mada||'—'} · محاسبة/{rec.muhasaba||'٦'} · {rec.date}</div>
            </div>
            <div className="flex gap-2">
              {!readOnly && (
                <button onClick={()=>{setPreview(null);handleEdit(rec)}}
                  className="px-4 py-2 rounded-lg text-sm font-bold cursor-pointer font-arabic"
                  style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', color:'#f59e0b' }}>✏️ تعديل</button>
              )}
              <button onClick={()=>printIradat(rec)}
                className="px-4 py-2 rounded-lg text-sm font-bold cursor-pointer font-arabic"
                style={{ background:'rgba(96,165,250,0.15)', border:'1px solid rgba(96,165,250,0.4)', color:'#60a5fa' }}>🖨️ طباعة</button>
              <button onClick={()=>setPreview(null)} className="btn-close text-[22px]">✕</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-arabic" style={{ minWidth:900 }}>
              <thead>
                <tr style={{ background:'#1a3a5c' }}>{Array.from({length:NUM_TYPES}).map((_,c)=><th key={c} colSpan={2} style={{ ...thTd, padding:'5px 6px', color:'#fff', fontSize:14, fontWeight:700 }}>{names[c]||'النوع'}</th>)}</tr>
                <tr style={{ background:'#2a5a8c' }}>{Array.from({length:NUM_TYPES}).map((_,c)=>[<th key={`f${c}`} style={{ ...thTd, padding:'5px 6px', color:'#fff', fontSize:12 }}>فلس</th>,<th key={`d${c}`} style={{ ...thTd, padding:'5px 6px', color:'#fff', fontSize:13 }}>دينار</th>])}</tr>
              </thead>
              <tbody>
                {filled.map((row,i)=>(
                  <tr key={i} className={i%2===0 ? 'tr-even' : 'tr-odd'}>
                    {Array.from({length:NUM_TYPES}).map((_,c)=>[
                      <td key={`f${c}`} style={{ ...thTd, padding:'4px 5px', fontSize:13, color:'var(--th-text)' }}>{row[`t${c+1}_fils`]||''}</td>,
                      <td key={`d${c}`} style={{ ...thTd, padding:'4px 5px', fontSize:14, color:'var(--th-text)' }}>{row[`t${c+1}_dinar`]||''}</td>
                    ])}
                  </tr>
                ))}
                <tr style={{ background:'rgba(96,165,250,0.08)', borderTop:'2px solid var(--th-accent)' }}>
                  {Array.from({length:NUM_TYPES}).map((_,c)=>[
                    <td key={`f${c}`} style={{ ...thTd, padding:'4px 5px', fontWeight:700, color:'var(--th-accent)', fontSize:13 }}>{tots[c].fils>0?tots[c].fils.toLocaleString('en-US'):''}</td>,
                    <td key={`d${c}`} style={{ ...thTd, padding:'4px 5px', fontWeight:700, color:'var(--th-accent)' }}>{tots[c].dinar>0?tots[c].dinar.toLocaleString('en-US'):''}</td>
                  ])}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const DeleteModal = () => {
    if (!delConfirm) return null;
    return (
      <div className="modal-overlay" style={{ zIndex:99999 }}>
        <div className="modal-card max-w-[420px] w-[90%] p-[32px_36px] text-center font-arabic">
          <div className="text-[40px] mb-4">⚠️</div>
          <div className="text-base font-bold text-th-text mb-2">تأكيد الحذف</div>
          <div className="text-[17px] text-th-muted mb-6">هل أنت متأكد من حذف سجل العدد "{delConfirm.adad||'—'}"؟</div>
          <div className="flex gap-2.5 justify-center">
            <button onClick={()=>{deleteIradatRecord(delConfirm.id);addAuditLog({user,action:'delete',entity:'iradat',detail:`حذف سجل إيرادات — العدد: ${delConfirm.adad||''}`});load();setDelConfirm(null)}} className="btn-danger px-7 py-2.5 rounded-lg font-bold">نعم، احذف</button>
            <button onClick={()=>setDelConfirm(null)} className="btn-secondary px-7 py-2.5 rounded-lg">إلغاء</button>
          </div>
        </div>
      </div>
    );
  };

  const entryFormJSX = (
    <div>
      <div className="flex gap-4 mb-4 flex-wrap items-end">
        <div>
          <div className="field-label">العدد</div>
          <input value={adad} onChange={e=>setAdad(e.target.value)} placeholder="العدد" className="input-field text-right" style={{ width:100 }}/>
        </div>
        <div>
          <div className="field-label">المادة</div>
          <input value={mada} onChange={e=>setMada(e.target.value)} placeholder="المادة" className="input-field text-right" style={{ width:100 }}/>
        </div>
        <div>
          <div className="field-label">محاسبة /</div>
          <input value={muhasaba} onChange={e=>setMuhasaba(e.target.value)} className="input-field text-center" style={{ width:60 }}/>
        </div>
        <div className="text-sm text-th-muted">{new Date().toLocaleDateString('ar-IQ')}</div>
        {editId && (
          <div className="px-3 py-1 rounded text-[15px] font-bold"
            style={{ background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)', color:'#f59e0b' }}>
            ✏️ وضع التعديل
          </div>
        )}
      </div>
      <div className="grid gap-1 mb-2" style={{ gridTemplateColumns:`repeat(${NUM_TYPES},1fr)` }}>
        {typeNames.map((name, i) => (
          <input key={i} value={name} onChange={e=>updateTypeName(i,e.target.value)} placeholder={`النوع ${i+1}`}
            className="input-field text-center" style={{ fontSize:14, padding:'4px 3px' }}/>
        ))}
      </div>
      <div className="overflow-x-auto mb-4">
        <table className="w-full border-collapse font-arabic" style={{ minWidth:850 }}>
          <thead>
            <tr style={{ background:'#1a3a5c' }}>
              <th style={{ ...thTd, padding:5, color:'#fff', width:30, fontSize:14 }}>#</th>
              {typeNames.map((name,c)=>(
                <th key={c} colSpan={2} style={{ ...thTd, padding:'5px 3px', color:'#fff', fontSize:14, fontWeight:700 }}>{name||'النوع'}</th>
              ))}
            </tr>
            <tr style={{ background:'#2a5a8c' }}>
              <th style={{ ...thTd }}></th>
              {Array.from({length:NUM_TYPES}).map((_,c)=>[
                <th key={`f${c}`} style={{ ...thTd, padding:3, color:'#fff', fontSize:12, width:28 }}>فلس</th>,
                <th key={`d${c}`} style={{ ...thTd, padding:3, color:'#fff', fontSize:13 }}>دينار</th>
              ])}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0,visRows).map((row,i)=>(
              <tr key={i} className={i%2===0 ? 'tr-even' : 'tr-odd'}>
                <td style={{ ...thTd, fontSize:13, color:'var(--th-text-muted)', fontWeight:600, width:30 }}>{i+1}</td>
                {Array.from({length:NUM_TYPES}).map((_,c)=>[
                  <td key={`f${c}`} style={{ ...thTd, padding:1, width:28 }}>
                    <input value={row[`t${c+1}_fils`]||''} onChange={e=>updateRow(i,`t${c+1}_fils`,e.target.value)}
                      className="input-field text-center" style={{ fontSize:13, padding:'3px 1px', width:26 }}/>
                  </td>,
                  <td key={`d${c}`} style={{ ...thTd, padding:1 }}>
                    <input value={row[`t${c+1}_dinar`]||''} onChange={e=>updateRow(i,`t${c+1}_dinar`,e.target.value)}
                      className="input-field text-center" style={{ fontSize:14, padding:'3px 2px' }}/>
                  </td>
                ])}
              </tr>
            ))}
            <tr style={{ background:'rgba(96,165,250,0.08)', borderTop:'2px solid var(--th-accent)' }}>
              <td style={{ ...thTd, textAlign:'center', fontSize:14, fontWeight:700, color:'var(--th-accent)' }}>Σ</td>
              {colTotals.map((tot,c)=>[
                <td key={`f${c}`} style={{ ...thTd, textAlign:'center', fontSize:13, fontWeight:700, color:'var(--th-accent)' }}>{tot.fils>0?tot.fils.toLocaleString('en-US'):''}</td>,
                <td key={`d${c}`} style={{ ...thTd, textAlign:'center', fontSize:14, fontWeight:700, color:'var(--th-accent)' }}>{tot.dinar>0?tot.dinar.toLocaleString('en-US'):''}</td>
              ])}
            </tr>
          </tbody>
        </table>
      </div>
      {visRows < IRADAT_ROWS && (
        <button onClick={()=>setVisRows(v=>v+1)}
          className="w-full mb-4 py-2 rounded-lg text-sm font-bold cursor-pointer font-arabic"
          style={{ background:'rgba(245,158,11,0.08)', border:'2px dashed rgba(245,158,11,0.4)', color:'#f59e0b' }}>
          ＋ إضافة صف ({visRows}/{IRADAT_ROWS})
        </button>
      )}
      <div className="flex gap-2.5">
        <button onClick={handleSave} className="btn-primary flex-[2] py-3">{editId?'💾 حفظ التعديلات':'💾 حفظ السجل'}</button>
        <button onClick={()=>printIradat({adad,mada,muhasaba,typeNames,rows:rows.filter(r=>{for(let c=1;c<=NUM_TYPES;c++)if(r[`t${c}_dinar`]||r[`t${c}_fils`])return true;return false})})}
          className="flex-1 py-3 rounded-lg text-[17px] font-bold cursor-pointer font-arabic"
          style={{ background:'rgba(96,165,250,0.15)', border:'1px solid rgba(96,165,250,0.4)', color:'#60a5fa' }}>
          🖨️ طباعة
        </button>
        <button onClick={()=>{resetForm();setSubView('list')}} className="btn-secondary flex-1 py-3 rounded-lg">إلغاء</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div className="text-base font-bold font-arabic" style={{ color:'#e879f9' }}>💰 سجل الايرادات — الايرادات النهائية</div>
        {subView==='list' && !readOnly && (
          <button onClick={()=>{resetForm();setSubView('new')}} className="btn-primary px-5 py-2.5">➕ سجل جديد</button>
        )}
        {(subView==='new'||subView==='edit') && (
          <div className="text-sm text-th-muted font-arabic">{subView==='edit'?'✏️ تعديل سجل':'إدخال سجل جديد'}</div>
        )}
      </div>
      {(subView==='new'||subView==='edit') && entryFormJSX}
      {subView==='list' && (
        <>
          <div className="flex gap-3 mb-4 items-center">
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="🔍 بحث بالعدد أو المادة أو التاريخ..."
              className="input-field flex-1 text-right py-2.5 px-4 text-sm"/>
            <div className="px-4 py-2 rounded-lg text-sm text-th-muted border border-th-border font-arabic"
              style={{ background:'var(--th-surface-alt)' }}>
              إجمالي: <span className="font-bold" style={{ color:'#e879f9' }}>{records.length}</span> سجل
            </div>
          </div>
          {filteredRecs.length===0 ? (
            <div className="text-center py-[60px] text-sm text-th-muted font-arabic">
              {records.length===0?'لا توجد سجلات — اضغط "سجل جديد" للبدء':'لا توجد نتائج تطابق البحث'}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredRecs.slice().reverse().map(rec=>(
                <div key={rec.id}
                  className="rounded-xl p-[14px_18px] flex justify-between items-center cursor-pointer border border-th-border"
                  style={{ background:'var(--th-card-bg)' }}
                  onClick={()=>setPreview(rec)}>
                  <div className="flex-1">
                    <div className="flex gap-3 items-center mb-1">
                      <span className="text-[17px] font-bold font-arabic" style={{ color:'#e879f9' }}>
                        العدد: {rec.adad||'—'} · المادة: {rec.mada||'—'}
                      </span>
                      {rec.updatedAt && (
                        <span className="text-[14px] px-2 py-0.5 rounded font-arabic"
                          style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)', color:'#f59e0b' }}>
                          معدّل
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 text-[15px] text-th-muted font-arabic">
                      <span>📅 {rec.date}</span><span>📝 {(rec.rows||[]).length} صف</span><span>👤 {rec.createdBy}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5" onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>setPreview(rec)} className="px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer font-arabic"
                      style={{ background:'rgba(232,121,249,0.1)', border:'1px solid rgba(232,121,249,0.2)', color:'#e879f9' }}>👁️</button>
                    {!readOnly && (
                      <button onClick={()=>handleEdit(rec)} className="px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer font-arabic"
                        style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', color:'#f59e0b' }}>✏️</button>
                    )}
                    <button onClick={()=>printIradat(rec)} className="px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer font-arabic"
                      style={{ background:'rgba(96,165,250,0.15)', border:'1px solid rgba(96,165,250,0.4)', color:'#60a5fa' }}>🖨️</button>
                    {!readOnly && (
                      <button onClick={()=>setDelConfirm(rec)} className="px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer font-arabic"
                        style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5' }}>🗑️</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <PreviewModal/>
      <DeleteModal/>
    </div>
  );
}

// ═══════════════════════════════════════════
// جدول معاملات الخزائن — كمبوننت فرعي
// ═══════════════════════════════════════════
const KHAZAIN_ROWS = 30;
const emptyKhazainRow = () => ({ fils:'', dinar:'', tafasil:'', raqm:'', tarikh:'', mulahazat:'' });

function KhazainRegister({ user, readOnly = false }) {
  const [subView, setSubView] = useState('list');
  const [records, setRecords] = useState([]);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [muhasaba, setMuhasaba] = useState('٤');
  const [madfuat, setMadfuat] = useState('');
  const [muhafaza, setMuhafaza] = useState('');
  const [shahr, setShahr] = useState('');
  const [rows, setRows] = useState(Array.from({length:KHAZAIN_ROWS}, emptyKhazainRow));
  const [visRows, setVisRows] = useState(5);

  const [ilaRecords, setIlaRecords] = useState([]);
  const load = async () => {
    const [recs, ilaRecs] = await Promise.all([getKhazainRecords(), getKhazainIlaRecords()]);
    setRecords(recs); setIlaRecords(ilaRecs);
  };
  useEffect(() => { load(); }, []);

  const updateRow = (i, f, v) => setRows(p => p.map((r, idx) => idx === i ? { ...r, [f]: v } : r));

  const resetForm = () => {
    setMuhasaba('٤'); setMadfuat(''); setMuhafaza(''); setShahr('');
    setRows(Array.from({length:KHAZAIN_ROWS}, emptyKhazainRow));
    setVisRows(5); setEditId(null);
  };

  const totalDinar = rows.slice(0,visRows).reduce((s,r) => s+(parseFloat(r.dinar)||0), 0);
  const totalFils  = rows.slice(0,visRows).reduce((s,r) => s+(parseFloat(r.fils)||0), 0);

  const handleSave = async () => {
    const filled = rows.filter(r => r.dinar||r.fils||r.tafasil||r.raqm||r.tarikh||r.mulahazat);
    if (!filled.length) { alert('أدخل بيانات أولاً'); return; }
    const entry = { id:editId||Date.now(), muhasaba, madfuat, muhafaza, shahr, rows:filled, createdBy:user.name, date:new Date().toLocaleDateString('ar-IQ'), ...(editId?{updatedAt:new Date().toISOString()}:{}) };
    if (editId) { await updateKhazainRecord(entry); await addAuditLog({ user, action:'update', entity:'khazain', detail:`تعديل سجل سلف — ${madfuat}` }); }
    else        { await saveKhazainRecord(entry);   await addAuditLog({ user, action:'create', entity:'khazain', detail:`إضافة سجل سلف — ${madfuat}` }); }
    resetForm(); await load(); setSubView('list');
  };

  const handleEdit = (rec) => {
    setEditId(rec.id); setMuhasaba(rec.muhasaba||'٤'); setMadfuat(rec.madfuat||''); setMuhafaza(rec.muhafaza||''); setShahr(rec.shahr||'');
    const lr=[...(rec.rows||[])]; while(lr.length<KHAZAIN_ROWS) lr.push(emptyKhazainRow());
    setRows(lr); setVisRows(Math.max(5,(rec.rows||[]).length+1)); setSubView('edit');
  };

  const filteredRecs = records.filter(r => { if(!search.trim()) return true; const s=search.trim().toLowerCase(); return (r.madfuat||'').toLowerCase().includes(s)||(r.muhafaza||'').toLowerCase().includes(s)||(r.shahr||'').includes(s)||(r.date||'').includes(s); });

  const printKhazain = (rec) => {
    const filled = rec.rows||[]; const PR=35; const allRows=[...filled]; while(allRows.length<PR) allRows.push(emptyKhazainRow());
    const tD = filled.reduce((s,r)=>s+(parseFloat(r.dinar)||0),0);
    const tF = filled.reduce((s,r)=>s+(parseFloat(r.fils)||0),0);
    const th='border:1px solid #000;text-align:center;padding:3px 4px;background:#f0f0f0;font-weight:700;font-size:8pt';
    const td='border:1px solid #000;text-align:center;padding:1px 3px;height:16px;font-size:8pt';
    const rHTML = allRows.map(row=>`<tr><td style="${td};width:40px">${row.fils||''}</td><td style="${td}">${row.dinar||''}</td><td style="${td};text-align:right;padding-right:6px">${row.tafasil||''}</td><td style="${td}">${row.raqm||''}</td><td style="${td}">${row.tarikh||''}</td><td style="${td}">${row.mulahazat||''}</td></tr>`).join('');
    const w=window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600;700&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Naskh Arabic','Times New Roman',serif;direction:rtl;background:#fff;color:#000}@page{size:A4 portrait;margin:8mm 6mm}@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}table{width:100%;border-collapse:collapse}</style></head><body>
    <div style="display:flex;justify-content:space-between;font-size:9pt;margin-bottom:4px"><div style="text-align:right"><div style="font-size:11pt;font-weight:700">جدول معاملات الخزائن</div></div><div>محاسبة / ${rec.muhasaba||'٤'}</div></div>
    <div style="display:flex;justify-content:space-between;font-size:9pt;margin-bottom:6px"><div>المدفوعات لحساب ${rec.madfuat||''}</div><div>في محافظة ${rec.muhafaza||''}</div><div>لشهر ${rec.shahr||''}</div></div>
    <table>
    <colgroup><col style="width:40px"/><col style="width:70px"/><col/><col style="width:60px"/><col style="width:80px"/><col style="width:120px"/></colgroup>
    <thead>
    <tr><th colspan="2" style="${th}">المبلغ</th><th rowspan="2" style="${th}">التفاصيل</th><th colspan="2" style="${th}">المستندات</th><th rowspan="2" style="${th}">الملاحظات (نوع السلفة)</th></tr>
    <tr><th style="${th};font-size:7pt">فلس</th><th style="${th}">دينار</th><th style="${th}">رقمها</th><th style="${th}">تاريخها</th></tr>
    </thead>
    <tbody>${rHTML}
    <tr style="border-top:2px solid #000"><td style="${td};font-weight:700">${tF>0?tF.toLocaleString('en-US'):''}</td><td style="${td};font-weight:700">${tD>0?tD.toLocaleString('en-US'):''}</td><td style="${td}"></td><td style="${td}"></td><td style="${td}"></td><td style="${td}"></td></tr>
    </tbody></table></body></html>`);
    w.document.close(); setTimeout(()=>w.print(),700);
  };

  const thTd = { border:'1px solid var(--th-border)', textAlign:'center' };

  const PreviewModal = () => {
    if (!preview) return null;
    const rec=preview; const filled=rec.rows||[];
    const pD=filled.reduce((s,r)=>s+(parseFloat(r.dinar)||0),0);
    const pF=filled.reduce((s,r)=>s+(parseFloat(r.fils)||0),0);
    return (
      <div className="modal-overlay" onClick={()=>setPreview(null)}>
        <div className="modal-card w-[95%] max-w-[1000px] max-h-[92vh] overflow-auto p-7 font-arabic" onClick={e=>e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-[19px] font-bold text-th-accent">جدول معاملات الخزائن</div>
              <div className="text-sm text-th-muted mt-1">المدفوعات لحساب: {rec.madfuat||'—'} · محافظة: {rec.muhafaza||'—'} · شهر: {rec.shahr||'—'} · {rec.date}</div>
            </div>
            <div className="flex gap-2">
              {!readOnly && (
                <button onClick={()=>{setPreview(null);handleEdit(rec)}}
                  className="px-4 py-2 rounded-lg text-sm font-bold cursor-pointer font-arabic"
                  style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', color:'#f59e0b' }}>✏️ تعديل</button>
              )}
              <button onClick={()=>printKhazain(rec)}
                className="px-4 py-2 rounded-lg text-sm font-bold cursor-pointer font-arabic"
                style={{ background:'rgba(96,165,250,0.15)', border:'1px solid rgba(96,165,250,0.4)', color:'#60a5fa' }}>🖨️ طباعة</button>
              <button onClick={()=>setPreview(null)} className="btn-close text-[22px]">✕</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-arabic">
              <thead>
                <tr style={{ background:'#1a3a5c' }}>
                  <th colSpan={2} style={{ ...thTd, padding:'6px 8px', color:'#fff', fontSize:15, fontWeight:700 }}>المبلغ</th>
                  <th rowSpan={2} style={{ ...thTd, padding:'6px 8px', color:'#fff', fontSize:15, fontWeight:700, width:220 }}>التفاصيل</th>
                  <th colSpan={2} style={{ ...thTd, padding:'6px 8px', color:'#fff', fontSize:15, fontWeight:700 }}>المستندات</th>
                  <th rowSpan={2} style={{ ...thTd, padding:'6px 8px', color:'#fff', fontSize:15, fontWeight:700 }}>الملاحظات (نوع السلفة)</th>
                </tr>
                <tr style={{ background:'#2a5a8c' }}>
                  <th style={{ ...thTd, padding:'6px 8px', color:'#fff', fontSize:13 }}>فلس</th>
                  <th style={{ ...thTd, padding:'6px 8px', color:'#fff', fontSize:15 }}>دينار</th>
                  <th style={{ ...thTd, padding:'6px 8px', color:'#fff', fontSize:15 }}>رقمها</th>
                  <th style={{ ...thTd, padding:'6px 8px', color:'#fff', fontSize:15 }}>تاريخها</th>
                </tr>
              </thead>
              <tbody>
                {filled.map((row,i)=>(
                  <tr key={i} className={i%2===0 ? 'tr-even' : 'tr-odd'}>
                    <td style={{ ...thTd, padding:'5px 6px', fontSize:14, color:'var(--th-text)' }}>{row.fils||''}</td>
                    <td style={{ ...thTd, padding:'5px 6px', fontSize:15, color:'var(--th-text)' }}>{row.dinar||''}</td>
                    <td style={{ ...thTd, padding:'5px 6px', textAlign:'right', paddingRight:8, color:'var(--th-text)' }}>{row.tafasil||''}</td>
                    <td style={{ ...thTd, padding:'5px 6px', color:'var(--th-text)' }}>{row.raqm||''}</td>
                    <td style={{ ...thTd, padding:'5px 6px', color:'var(--th-text)' }}>{row.tarikh||''}</td>
                    <td style={{ ...thTd, padding:'5px 6px', color:'var(--th-text)' }}>{row.mulahazat||''}</td>
                  </tr>
                ))}
                <tr style={{ background:'rgba(96,165,250,0.08)', borderTop:'2px solid var(--th-accent)' }}>
                  <td style={{ ...thTd, padding:'5px 6px', fontWeight:700, color:'var(--th-accent)' }}>{pF>0?pF.toLocaleString('en-US'):''}</td>
                  <td style={{ ...thTd, padding:'5px 6px', fontWeight:700, color:'var(--th-accent)' }}>{pD>0?pD.toLocaleString('en-US'):''}</td>
                  <td colSpan={4} style={{ ...thTd }}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const DeleteModal = () => {
    if (!delConfirm) return null;
    return (
      <div className="modal-overlay" style={{ zIndex:99999 }}>
        <div className="modal-card max-w-[420px] w-[90%] p-[32px_36px] text-center font-arabic">
          <div className="text-[40px] mb-4">⚠️</div>
          <div className="text-base font-bold text-th-text mb-2">تأكيد الحذف</div>
          <div className="text-[17px] text-th-muted mb-6">هل أنت متأكد من حذف هذا السجل؟</div>
          <div className="flex gap-2.5 justify-center">
            <button onClick={async()=>{await deleteKhazainRecord(delConfirm.id);await addAuditLog({user,action:'delete',entity:'khazain',detail:`حذف سجل سلف — ${delConfirm.madfuat||''}`});await load();setDelConfirm(null)}} className="btn-danger px-7 py-2.5 rounded-lg font-bold">نعم، احذف</button>
            <button onClick={()=>setDelConfirm(null)} className="btn-secondary px-7 py-2.5 rounded-lg">إلغاء</button>
          </div>
        </div>
      </div>
    );
  };

  const entryFormJSX = (
    <div>
      <div className="flex gap-4 mb-4 flex-wrap items-end">
        <div>
          <div className="field-label">محاسبة /</div>
          <input value={muhasaba} onChange={e=>setMuhasaba(e.target.value)} className="input-field text-center" style={{ width:50 }}/>
        </div>
        <div>
          <div className="field-label">المدفوعات لحساب</div>
          <input value={madfuat} onChange={e=>setMadfuat(e.target.value)} className="input-field text-right" style={{ width:160 }}/>
        </div>
        <div>
          <div className="field-label">في محافظة</div>
          <input value={muhafaza} onChange={e=>setMuhafaza(e.target.value)} className="input-field text-right" style={{ width:130 }}/>
        </div>
        <div>
          <div className="field-label">لشهر</div>
          <input value={shahr} onChange={e=>setShahr(e.target.value)} className="input-field text-right" style={{ width:120 }}/>
        </div>
        {editId && (
          <div className="px-3 py-1 rounded text-[15px] font-bold"
            style={{ background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)', color:'#f59e0b' }}>
            ✏️ وضع التعديل
          </div>
        )}
      </div>
      <div className="flex gap-3 mb-4">
        <div className="px-4 py-2 rounded-lg flex gap-2 items-center border border-th-border font-arabic"
          style={{ background:'var(--th-surface-alt)' }}>
          <span className="text-[15px] text-th-muted">دينار:</span>
          <span className="text-sm font-bold" style={{ color: totalDinar>0 ? 'var(--th-green)' : 'var(--th-text-muted)' }}>
            {totalDinar>0?totalDinar.toLocaleString('en-US'):'0'}
          </span>
        </div>
        <div className="px-4 py-2 rounded-lg flex gap-2 items-center border border-th-border font-arabic"
          style={{ background:'var(--th-surface-alt)' }}>
          <span className="text-[15px] text-th-muted">فلس:</span>
          <span className="text-sm font-bold" style={{ color: totalFils>0 ? '#60a5fa' : 'var(--th-text-muted)' }}>
            {totalFils>0?totalFils.toLocaleString('en-US'):'0'}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto mb-4">
        <table className="w-full border-collapse font-arabic">
          <thead>
            <tr style={{ background:'#1a3a5c' }}>
              <th style={{ ...thTd, padding:6, color:'#fff', width:30, fontSize:14 }}>#</th>
              <th colSpan={2} style={{ ...thTd, padding:6, color:'#fff', fontSize:15 }}>المبلغ</th>
              <th rowSpan={2} style={{ ...thTd, padding:6, color:'#fff', fontSize:15, width:200 }}>التفاصيل</th>
              <th colSpan={2} style={{ ...thTd, padding:6, color:'#fff', fontSize:15 }}>المستندات</th>
              <th rowSpan={2} style={{ ...thTd, padding:6, color:'#fff', fontSize:15 }}>الملاحظات (نوع السلفة)</th>
            </tr>
            <tr style={{ background:'#2a5a8c' }}>
              <th style={{ ...thTd }}></th>
              <th style={{ ...thTd, padding:4, color:'#fff', fontSize:13, width:45 }}>فلس</th>
              <th style={{ ...thTd, padding:4, color:'#fff', fontSize:14 }}>دينار</th>
              <th style={{ ...thTd, padding:4, color:'#fff', fontSize:14 }}>رقمها</th>
              <th style={{ ...thTd, padding:4, color:'#fff', fontSize:14 }}>تاريخها</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0,visRows).map((row,i)=>(
              <tr key={i} className={i%2===0 ? 'tr-even' : 'tr-odd'}>
                <td style={{ ...thTd, fontSize:13, color:'var(--th-text-muted)', fontWeight:600 }}>{i+1}</td>
                <td style={{ ...thTd, padding:2, width:45 }}><input value={row.fils||''} onChange={e=>updateRow(i,'fils',e.target.value)} className="input-field text-center" style={{ fontSize:14, width:42 }}/></td>
                <td style={{ ...thTd, padding:2 }}><input value={row.dinar||''} onChange={e=>updateRow(i,'dinar',e.target.value)} className="input-field text-center" style={{ fontSize:15 }}/></td>
                <td style={{ ...thTd, padding:2 }}><input value={row.tafasil||''} onChange={e=>updateRow(i,'tafasil',e.target.value)} className="input-field text-right" style={{ fontSize:15 }}/></td>
                <td style={{ ...thTd, padding:2 }}><input value={row.raqm||''} onChange={e=>updateRow(i,'raqm',e.target.value)} className="input-field text-center" style={{ fontSize:15 }}/></td>
                <td style={{ ...thTd, padding:2 }}><input value={row.tarikh||''} onChange={e=>updateRow(i,'tarikh',e.target.value)} className="input-field text-center" style={{ fontSize:15 }}/></td>
                <td style={{ ...thTd, padding:2 }}><input value={row.mulahazat||''} onChange={e=>updateRow(i,'mulahazat',e.target.value)} className="input-field text-right" style={{ fontSize:15 }}/></td>
              </tr>
            ))}
            <tr style={{ background:'rgba(96,165,250,0.08)', borderTop:'2px solid var(--th-accent)' }}>
              <td style={{ ...thTd }}></td>
              <td style={{ ...thTd, textAlign:'center', fontSize:15, fontWeight:700, color:'var(--th-accent)' }}>{totalFils>0?totalFils.toLocaleString('en-US'):''}</td>
              <td style={{ ...thTd, textAlign:'center', fontSize:16, fontWeight:700, color:'var(--th-accent)' }}>{totalDinar>0?totalDinar.toLocaleString('en-US'):''}</td>
              <td colSpan={4} style={{ ...thTd }}></td>
            </tr>
          </tbody>
        </table>
      </div>
      {visRows<KHAZAIN_ROWS && (
        <button onClick={()=>setVisRows(v=>v+1)}
          className="w-full mb-4 py-2 rounded-lg text-sm font-bold cursor-pointer font-arabic"
          style={{ background:'rgba(245,158,11,0.08)', border:'2px dashed rgba(245,158,11,0.4)', color:'#f59e0b' }}>
          ＋ إضافة صف ({visRows}/{KHAZAIN_ROWS})
        </button>
      )}
      <div className="flex gap-2.5">
        <button onClick={handleSave} className="btn-primary flex-[2] py-3">{editId?'💾 حفظ التعديلات':'💾 حفظ السجل'}</button>
        <button onClick={()=>printKhazain({muhasaba,madfuat,muhafaza,shahr,rows:rows.filter(r=>r.dinar||r.fils||r.tafasil||r.raqm||r.tarikh||r.mulahazat)})}
          className="flex-1 py-3 rounded-lg text-[17px] font-bold cursor-pointer font-arabic"
          style={{ background:'rgba(96,165,250,0.15)', border:'1px solid rgba(96,165,250,0.4)', color:'#60a5fa' }}>
          🖨️ طباعة
        </button>
        <button onClick={()=>{resetForm();setSubView('list')}} className="btn-secondary flex-1 py-3 rounded-lg">إلغاء</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div className="text-base font-bold font-arabic" style={{ color:'#f97316' }}>🏦 جدول معاملات الخزائن</div>
        {subView==='list' && !readOnly && (
          <button onClick={()=>{resetForm();setSubView('new')}} className="btn-primary px-5 py-2.5">➕ سجل جديد</button>
        )}
        {(subView==='new'||subView==='edit') && (
          <div className="text-sm text-th-muted font-arabic">{subView==='edit'?'✏️ تعديل سجل':'إدخال سجل جديد'}</div>
        )}
      </div>
      {(subView==='new'||subView==='edit') && entryFormJSX}
      {subView==='list' && (
        <>
          {/* ── دفتر السلف — قسمان جنباً لجنب ── */}
          {(() => {
            const minRows = records[0]?.rows || [];
            const ilaRows = ilaRecords[0]?.rows || [];
            if (!minRows.length && !ilaRows.length) return null;
            const maxLen = Math.max(minRows.length, ilaRows.length);
            const thTd2 = { border:'1px solid var(--th-border)', textAlign:'center' };
            return (
              <div className="mb-6 rounded-xl overflow-hidden border border-th-border">
                <div className="text-center text-sm font-bold py-2 font-arabic"
                  style={{ background:'var(--th-surface-alt)', borderBottom:'1px solid var(--th-border)', color:'#818cf8' }}>
                  📒 دفتر السلف
                </div>
                <div className="grid grid-cols-2 divide-x divide-th-border overflow-x-auto">
                  {/* يمين — من */}
                  <div>
                    <div className="text-center text-sm font-bold py-1.5 font-arabic"
                      style={{ background:'rgba(249,115,22,0.08)', color:'#f97316', borderBottom:'1px solid var(--th-border)' }}>
                      من
                    </div>
                    <table className="w-full border-collapse font-arabic text-[15px]">
                      <thead>
                        <tr style={{ background:'#1a3a5c' }}>
                          <th style={{ ...thTd2, padding:'4px 3px', color:'#fff', fontSize:13 }}>فلس</th>
                          <th style={{ ...thTd2, padding:'4px 3px', color:'#fff', fontSize:14 }}>دينار</th>
                          <th style={{ ...thTd2, padding:'4px 6px', color:'#fff', fontSize:14, textAlign:'right' }}>التفاصيل</th>
                          <th style={{ ...thTd2, padding:'4px 3px', color:'#fff', fontSize:14 }}>رقم المستند</th>
                          <th style={{ ...thTd2, padding:'4px 3px', color:'#fff', fontSize:14 }}>التاريخ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: maxLen }).map((_, i) => {
                          const r = minRows[i];
                          return (
                            <tr key={i} className={i%2===0 ? 'tr-even' : 'tr-odd'}>
                              <td style={{ ...thTd2, padding:'4px 3px', color:'var(--th-text)' }}>{r?.fils||''}</td>
                              <td style={{ ...thTd2, padding:'4px 3px', fontWeight: r?.dinar ? 600 : 400, color: r?.dinar ? '#f97316' : 'var(--th-text)' }}>{r?.dinar||''}</td>
                              <td style={{ ...thTd2, padding:'4px 6px', textAlign:'right', color:'var(--th-text)' }}>{r?.tafasil||''}</td>
                              <td style={{ ...thTd2, padding:'4px 3px', color:'var(--th-text)' }}>{r?.raqm||''}</td>
                              <td style={{ ...thTd2, padding:'4px 3px', color:'var(--th-text)' }}>{r?.tarikh||''}</td>
                            </tr>
                          );
                        })}
                        <tr style={{ background:'rgba(249,115,22,0.08)', borderTop:'2px solid var(--th-border)' }}>
                          <td style={{ ...thTd2, fontWeight:700, color:'#f97316', fontSize:14 }}>{minRows.reduce((s,r)=>s+(parseFloat((r.fils||'').replace(/,/g,''))||0),0)||''}</td>
                          <td style={{ ...thTd2, fontWeight:700, color:'#f97316', fontSize:15 }}>{minRows.reduce((s,r)=>s+(parseFloat((r.dinar||'').replace(/,/g,''))||0),0).toLocaleString('en-US')||''}</td>
                          <td colSpan={3} style={{ ...thTd2 }}></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {/* يسار — الى */}
                  <div>
                    <div className="text-center text-sm font-bold py-1.5 font-arabic"
                      style={{ background:'rgba(52,211,153,0.08)', color:'#34d399', borderBottom:'1px solid var(--th-border)' }}>
                      الى
                    </div>
                    <table className="w-full border-collapse font-arabic text-[15px]">
                      <thead>
                        <tr style={{ background:'#1a3a5c' }}>
                          <th style={{ ...thTd2, padding:'4px 3px', color:'#fff', fontSize:13 }}>فلس</th>
                          <th style={{ ...thTd2, padding:'4px 3px', color:'#fff', fontSize:14 }}>دينار</th>
                          <th style={{ ...thTd2, padding:'4px 6px', color:'#fff', fontSize:14, textAlign:'right' }}>التفاصيل</th>
                          <th style={{ ...thTd2, padding:'4px 3px', color:'#fff', fontSize:14 }}>رقم المستند</th>
                          <th style={{ ...thTd2, padding:'4px 3px', color:'#fff', fontSize:14 }}>التاريخ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: maxLen }).map((_, i) => {
                          const r = ilaRows[i];
                          return (
                            <tr key={i} className={i%2===0 ? 'tr-even' : 'tr-odd'}>
                              <td style={{ ...thTd2, padding:'4px 3px', color:'var(--th-text)' }}>{r?.fils||''}</td>
                              <td style={{ ...thTd2, padding:'4px 3px', fontWeight: r?.dinar ? 600 : 400, color: r?.dinar ? '#34d399' : 'var(--th-text)' }}>{r?.dinar||''}</td>
                              <td style={{ ...thTd2, padding:'4px 6px', textAlign:'right', color:'var(--th-text)' }}>{r?.tafasil||''}</td>
                              <td style={{ ...thTd2, padding:'4px 3px', color:'var(--th-text)' }}>{r?.raqm||''}</td>
                              <td style={{ ...thTd2, padding:'4px 3px', color:'var(--th-text)' }}>{r?.tarikh||''}</td>
                            </tr>
                          );
                        })}
                        <tr style={{ background:'rgba(52,211,153,0.08)', borderTop:'2px solid var(--th-border)' }}>
                          <td style={{ ...thTd2, fontWeight:700, color:'#34d399', fontSize:14 }}>{ilaRows.reduce((s,r)=>s+(parseFloat((r.fils||'').replace(/,/g,''))||0),0)||''}</td>
                          <td style={{ ...thTd2, fontWeight:700, color:'#34d399', fontSize:15 }}>{ilaRows.reduce((s,r)=>s+(parseFloat((r.dinar||'').replace(/,/g,''))||0),0).toLocaleString('en-US')||''}</td>
                          <td colSpan={3} style={{ ...thTd2 }}></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="flex gap-3 mb-4 items-center">
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="🔍 بحث بالحساب أو المحافظة أو الشهر..."
              className="input-field flex-1 text-right py-2.5 px-4 text-sm"/>
            <div className="px-4 py-2 rounded-lg text-sm text-th-muted border border-th-border font-arabic"
              style={{ background:'var(--th-surface-alt)' }}>
              إجمالي: <span className="font-bold" style={{ color:'#f97316' }}>{records.length}</span> سجل
            </div>
          </div>
          {filteredRecs.length===0 ? (
            <div className="text-center py-[60px] text-sm text-th-muted font-arabic">
              {records.length===0?'لا توجد سجلات — اضغط "سجل جديد" للبدء':'لا توجد نتائج'}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredRecs.slice().reverse().map(rec=>{
                const rD=(rec.rows||[]).reduce((s,r)=>s+(parseFloat(r.dinar)||0),0);
                return (
                  <div key={rec.id}
                    className="rounded-xl p-[14px_18px] flex justify-between items-center cursor-pointer border border-th-border"
                    style={{ background:'var(--th-card-bg)' }}
                    onClick={()=>setPreview(rec)}>
                    <div className="flex-1">
                      <div className="flex gap-3 items-center mb-1">
                        <span className="text-[17px] font-bold font-arabic" style={{ color:'#f97316' }}>
                          المدفوعات لحساب: {rec.madfuat||'—'}
                        </span>
                        {rec.updatedAt && (
                          <span className="text-[14px] px-2 py-0.5 rounded font-arabic"
                            style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)', color:'#f59e0b' }}>
                            معدّل
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 text-[15px] text-th-muted font-arabic">
                        <span>📅 {rec.date}</span>
                        <span>🏙️ {rec.muhafaza||'—'}</span>
                        <span>📆 {rec.shahr||'—'}</span>
                        <span>📝 {(rec.rows||[]).length} صف</span>
                        {rD>0 && <span style={{ color:'var(--th-green)' }}>دينار: {rD.toLocaleString('en-US')}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5" onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>setPreview(rec)} className="px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer font-arabic"
                        style={{ background:'rgba(249,115,22,0.1)', border:'1px solid rgba(249,115,22,0.2)', color:'#f97316' }}>👁️</button>
                      {!readOnly && (
                        <button onClick={()=>handleEdit(rec)} className="px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer font-arabic"
                          style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', color:'#f59e0b' }}>✏️</button>
                      )}
                      <button onClick={()=>printKhazain(rec)} className="px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer font-arabic"
                        style={{ background:'rgba(96,165,250,0.15)', border:'1px solid rgba(96,165,250,0.4)', color:'#60a5fa' }}>🖨️</button>
                      {!readOnly && (
                        <button onClick={()=>setDelConfirm(rec)} className="px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer font-arabic"
                          style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5' }}>🗑️</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      <PreviewModal/>
      <DeleteModal/>
    </div>
  );
}

// ═══════════════════════════════════════════
// سجل عام — امانات / مدينون / دائنون
// ═══════════════════════════════════════════
function SijilRegister({ user, readOnly = false, mainKey, ilaKey, title, color = '#818cf8', side = 'both' }) {
  const mainEp = SIJIL_ENDPOINT[mainKey] || `/records/${mainKey.replace('_records','').replace(/_/g,'-')}`;
  const ilaEp  = SIJIL_ENDPOINT[ilaKey]  || `/records/${ilaKey.replace('_records','').replace(/_/g,'-')}`;

  const [subView,    setSubView]    = useState('list');
  const [records,    setRecords]    = useState([]);
  const [ilaRecs,    setIlaRecs]    = useState([]);
  const [editId,     setEditId]     = useState(null);
  const [search,     setSearch]     = useState('');
  const [delConfirm, setDelConfirm] = useState(null);
  const [bayan,      setBayan]      = useState('');
  const [mulHdr,     setMulHdr]     = useState('');
  const [rows,       setRows]       = useState(Array.from({ length: KHAZAIN_ROWS }, emptyKhazainRow));
  const [visRows,    setVisRows]    = useState(5);

  const load = async () => {
    const [recs, ilaR] = await Promise.all([
      api.get(mainEp).then(r => r.data),
      api.get(ilaEp).then(r => r.data),
    ]);
    setRecords(recs); setIlaRecs(ilaR);
  };
  useEffect(() => { load(); }, [mainKey]);

  const updateRow = (i, f, v) => setRows(p => p.map((r, idx) => idx === i ? { ...r, [f]: v } : r));

  const resetForm = () => {
    setBayan(''); setMulHdr('');
    setRows(Array.from({ length: KHAZAIN_ROWS }, emptyKhazainRow));
    setVisRows(5); setEditId(null);
  };

  const totalDinar = rows.slice(0, visRows).reduce((s, r) => s + (parseFloat(r.dinar) || 0), 0);
  const totalFils  = rows.slice(0, visRows).reduce((s, r) => s + (parseFloat(r.fils)  || 0), 0);

  const handleSave = async () => {
    const filled = rows.filter(r => r.dinar || r.fils || r.tafasil || r.raqm || r.tarikh || r.mulahazat);
    if (!filled.length) { alert('أدخل بيانات أولاً'); return; }
    const entry = {
      id: editId || Date.now(),
      bayan, mulHdr, rows: filled,
      created_by: user.name,
      date: new Date().toLocaleDateString('ar-IQ'),
    };
    await api.post(mainEp, entry);
    await addAuditLog({ user, action: editId ? 'update' : 'create', entity: 'sijil', detail: `${editId ? 'تعديل' : 'إضافة'} ${title} — ${bayan || ''}` });
    resetForm(); await load(); setSubView('list');
  };

  const handleEdit = rec => {
    setEditId(rec.id); setBayan(rec.bayan || ''); setMulHdr(rec.mulHdr || '');
    const lr = [...(rec.rows || [])];
    while (lr.length < KHAZAIN_ROWS) lr.push(emptyKhazainRow());
    setRows(lr); setVisRows(Math.max(5, (rec.rows || []).length + 1)); setSubView('edit');
  };

  const handleDelete = async (id) => {
    const rec = records.find(r => r.id === id);
    await api.delete(`${mainEp}/${id}`);
    await addAuditLog({ user, action: 'delete', entity: 'sijil', detail: `حذف ${title} — ${rec?.bayan || ''}` });
    await load(); setDelConfirm(null);
  };

  const filteredRecs = records.filter(r => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (r.bayan || '').toLowerCase().includes(s) || (r.date || '').includes(s) || (r.createdBy || '').toLowerCase().includes(s);
  });

  const thTd = { border: '1px solid var(--th-border)', textAlign: 'center' };

  // ── الدفتر — قسمان ──
  const minRows = records[0]?.rows || [];
  const ilaRows = ilaRecs[0]?.rows  || [];
  const maxLen  = Math.max(minRows.length, ilaRows.length);
  const allSides = [{ label: 'من', rows: minRows, c: '#f97316' }, { label: 'الى', rows: ilaRows, c: '#34d399' }];
  const sides    = side === 'min' ? [allSides[0]] : side === 'ila' ? [allSides[1]] : allSides;
  const isSingle = sides.length === 1;

  const printSijil = () => {
    const activeSide = sides[0];
    const rows2 = activeSide.rows;
    if (!rows2.length) { alert('لا توجد بيانات للطباعة'); return; }
    const PR = 35; const allR = [...rows2]; while (allR.length < PR) allR.push({});
    const tD = rows2.reduce((s,r)=>s+(parseFloat((r.dinar||'').replace(/,/g,''))||0),0);
    const tF = rows2.reduce((s,r)=>s+(parseFloat((r.fils||'').replace(/,/g,''))||0),0);
    const th='border:1px solid #000;text-align:center;padding:3px 4px;background:#f0f0f0;font-weight:700;font-size:8pt';
    const td='border:1px solid #000;text-align:center;padding:1px 3px;height:16px;font-size:8pt';
    const rHTML = allR.map(r=>`<tr><td style="${td};width:40px">${r.fils||''}</td><td style="${td}">${r.dinar||''}</td><td style="${td};text-align:right;padding-right:6px">${r.tafasil||''}</td><td style="${td}">${r.raqm||''}</td><td style="${td}">${r.tarikh||''}</td></tr>`).join('');
    const w=window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600;700&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Naskh Arabic','Times New Roman',serif;direction:rtl;background:#fff;color:#000}@page{size:A4 portrait;margin:8mm 6mm}@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}table{width:100%;border-collapse:collapse}</style></head><body>
    <div style="text-align:center;font-size:13pt;font-weight:700;margin-bottom:8px">${title}</div>
    <div style="text-align:center;font-size:9pt;margin-bottom:6px;color:#555">حقل: ${activeSide.label} &nbsp;|&nbsp; ${new Date().toLocaleDateString('ar-IQ')}</div>
    <table>
    <colgroup><col style="width:40px"/><col style="width:80px"/><col/><col style="width:70px"/><col style="width:90px"/></colgroup>
    <thead>
    <tr><th style="${th};font-size:7pt">فلس</th><th style="${th}">دينار</th><th style="${th}">التفاصيل</th><th style="${th}">رقم المستند</th><th style="${th}">التاريخ</th></tr>
    </thead>
    <tbody>${rHTML}
    <tr style="border-top:2px solid #000"><td style="${td};font-weight:700">${tF>0?tF.toLocaleString('en-US'):''}</td><td style="${td};font-weight:700">${tD>0?tD.toLocaleString('en-US'):''}</td><td style="${td}"></td><td style="${td}"></td><td style="${td}"></td></tr>
    </tbody></table></body></html>`);
    w.document.close(); setTimeout(()=>w.print(),700);
  };

  const dualLedger = (minRows.length > 0 || ilaRows.length > 0) ? (
    <div className={`mb-6 rounded-xl overflow-hidden border border-th-border ${isSingle ? 'max-w-2xl mx-auto' : ''}`}>
      <div className="text-center text-sm font-bold py-2 font-arabic"
        style={{ background: 'var(--th-surface-alt)', borderBottom: '1px solid var(--th-border)', color }}>
        📒 {title}
      </div>
      <div className={`${isSingle ? '' : 'grid grid-cols-2 divide-x divide-th-border'} overflow-x-auto`}>
        {sides.map(side => (
          <div key={side.label}>
            <div className="text-center text-sm font-bold py-1.5 font-arabic"
              style={{ background: `${side.c}14`, color: side.c, borderBottom: '1px solid var(--th-border)' }}>
              {side.label}
            </div>
            <table className="w-full border-collapse font-arabic text-[15px]">
              <thead>
                <tr style={{ background: '#1a3a5c' }}>
                  {['فلس','دينار','التفاصيل','رقم المستند','التاريخ'].map(h => (
                    <th key={h} style={{ ...thTd, padding: '4px 3px', color: '#fff', fontSize: 10, textAlign: h === 'التفاصيل' ? 'right' : 'center' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: maxLen }).map((_, i) => {
                  const r = side.rows[i];
                  return (
                    <tr key={i} className={i % 2 === 0 ? 'tr-even' : 'tr-odd'}>
                      <td style={{ ...thTd, padding: '4px 3px', color: 'var(--th-text)' }}>{r?.fils || ''}</td>
                      <td style={{ ...thTd, padding: '4px 3px', fontWeight: r?.dinar ? 600 : 400, color: r?.dinar ? side.c : 'var(--th-text)' }}>{r?.dinar || ''}</td>
                      <td style={{ ...thTd, padding: '4px 6px', textAlign: 'right', color: 'var(--th-text)' }}>{r?.tafasil || ''}</td>
                      <td style={{ ...thTd, padding: '4px 3px', color: 'var(--th-text)' }}>{r?.raqm || ''}</td>
                      <td style={{ ...thTd, padding: '4px 3px', color: 'var(--th-text)' }}>{r?.tarikh || ''}</td>
                    </tr>
                  );
                })}
                <tr style={{ background: `${side.c}14`, borderTop: '2px solid var(--th-border)' }}>
                  <td style={{ ...thTd, fontWeight: 700, color: side.c, fontSize: 10 }}>{side.rows.reduce((s, r) => s + (parseFloat((r.fils   || '').replace(/,/g,'')) || 0), 0) || ''}</td>
                  <td style={{ ...thTd, fontWeight: 700, color: side.c, fontSize: 11 }}>{side.rows.reduce((s, r) => s + (parseFloat((r.dinar  || '').replace(/,/g,'')) || 0), 0).toLocaleString('en-US') || ''}</td>
                  <td colSpan={3} style={{ ...thTd }}></td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  // ── نموذج الإدخال ──
  const entryFormJSX = (
    <div>
      <div className="flex gap-4 mb-4 flex-wrap items-end">
        <div>
          <div className="field-label">البيان</div>
          <input value={bayan} onChange={e => setBayan(e.target.value)} className="input-field text-right" style={{ width: 200 }} />
        </div>
        <div>
          <div className="field-label">ملاحظات</div>
          <input value={mulHdr} onChange={e => setMulHdr(e.target.value)} className="input-field text-right" style={{ width: 160 }} />
        </div>
        {editId && (
          <div className="px-3 py-1 rounded text-[15px] font-bold"
            style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
            ✏️ وضع التعديل
          </div>
        )}
      </div>
      <div className="overflow-x-auto mb-4">
        <table className="w-full border-collapse font-arabic">
          <thead>
            <tr style={{ background: '#1a3a5c' }}>
              <th style={{ ...thTd, padding: 6, color: '#fff', width: 30, fontSize: 10 }}>#</th>
              <th colSpan={2} style={{ ...thTd, padding: 6, color: '#fff', fontSize: 11 }}>المبلغ</th>
              <th rowSpan={2} style={{ ...thTd, padding: 6, color: '#fff', fontSize: 11, width: 200 }}>التفاصيل</th>
              <th colSpan={2} style={{ ...thTd, padding: 6, color: '#fff', fontSize: 11 }}>المستندات</th>
              <th rowSpan={2} style={{ ...thTd, padding: 6, color: '#fff', fontSize: 11 }}>ملاحظات</th>
            </tr>
            <tr style={{ background: '#2a5a8c' }}>
              <th style={{ ...thTd }}></th>
              <th style={{ ...thTd, padding: 4, color: '#fff', fontSize: 9, width: 45 }}>فلس</th>
              <th style={{ ...thTd, padding: 4, color: '#fff', fontSize: 10 }}>دينار</th>
              <th style={{ ...thTd, padding: 4, color: '#fff', fontSize: 10 }}>رقمها</th>
              <th style={{ ...thTd, padding: 4, color: '#fff', fontSize: 10 }}>تاريخها</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, visRows).map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'tr-even' : 'tr-odd'}>
                <td style={{ ...thTd, fontSize: 9, color: 'var(--th-text-muted)', fontWeight: 600 }}>{i + 1}</td>
                <td style={{ ...thTd, padding: 2, width: 45 }}><input value={row.fils || ''} onChange={e => updateRow(i, 'fils', e.target.value)} className="input-field text-center" style={{ fontSize: 10, width: 42 }} /></td>
                <td style={{ ...thTd, padding: 2 }}><input value={row.dinar || ''} onChange={e => updateRow(i, 'dinar', e.target.value)} className="input-field text-center" style={{ fontSize: 11 }} /></td>
                <td style={{ ...thTd, padding: 2 }}><input value={row.tafasil || ''} onChange={e => updateRow(i, 'tafasil', e.target.value)} className="input-field text-right" style={{ fontSize: 11 }} /></td>
                <td style={{ ...thTd, padding: 2 }}><input value={row.raqm || ''} onChange={e => updateRow(i, 'raqm', e.target.value)} className="input-field text-center" style={{ fontSize: 11 }} /></td>
                <td style={{ ...thTd, padding: 2 }}><input value={row.tarikh || ''} onChange={e => updateRow(i, 'tarikh', e.target.value)} className="input-field text-center" style={{ fontSize: 11 }} /></td>
                <td style={{ ...thTd, padding: 2 }}><input value={row.mulahazat || ''} onChange={e => updateRow(i, 'mulahazat', e.target.value)} className="input-field text-right" style={{ fontSize: 11 }} /></td>
              </tr>
            ))}
            <tr style={{ background: 'rgba(96,165,250,0.08)', borderTop: '2px solid var(--th-accent)' }}>
              <td style={{ ...thTd }}></td>
              <td style={{ ...thTd, textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--th-accent)' }}>{totalFils > 0 ? totalFils.toLocaleString('en-US') : ''}</td>
              <td style={{ ...thTd, textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--th-accent)' }}>{totalDinar > 0 ? totalDinar.toLocaleString('en-US') : ''}</td>
              <td colSpan={4} style={{ ...thTd }}></td>
            </tr>
          </tbody>
        </table>
      </div>
      {visRows < KHAZAIN_ROWS && (
        <button onClick={() => setVisRows(v => v + 1)}
          className="w-full mb-4 py-2 rounded-lg text-sm font-bold cursor-pointer font-arabic"
          style={{ background: 'rgba(245,158,11,0.08)', border: '2px dashed rgba(245,158,11,0.4)', color: '#f59e0b' }}>
          ＋ إضافة صف ({visRows}/{KHAZAIN_ROWS})
        </button>
      )}
      <div className="flex gap-2.5">
        <button onClick={handleSave} className="btn-primary flex-[2] py-3">{editId ? '💾 حفظ التعديلات' : '💾 حفظ السجل'}</button>
        <button onClick={() => { resetForm(); setSubView('list'); }} className="btn-secondary flex-1 py-3 rounded-lg">إلغاء</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div className="text-base font-bold font-arabic" style={{ color }}>{title}</div>
        <div className="flex gap-2">
          {subView === 'list' && (
            <button onClick={printSijil}
              className="px-4 py-2 rounded-lg text-sm font-bold cursor-pointer font-arabic"
              style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa' }}>
              🖨️ طباعة
            </button>
          )}
          {subView === 'list' && !readOnly && (
            <button onClick={() => { resetForm(); setSubView('new'); }} className="btn-primary px-5 py-2.5">➕ سجل جديد</button>
          )}
        </div>
        {(subView === 'new' || subView === 'edit') && (
          <div className="text-sm text-th-muted font-arabic">{subView === 'edit' ? '✏️ تعديل سجل' : 'إدخال سجل جديد'}</div>
        )}
      </div>
      {(subView === 'new' || subView === 'edit') && entryFormJSX}
      {subView === 'list' && (
        <>
          {dualLedger}
          <div className="flex gap-3 mb-4 items-center">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 بحث..."
              className="input-field flex-1 text-right py-2.5 px-4 text-sm" />
            <div className="px-4 py-2 rounded-lg text-sm text-th-muted border border-th-border font-arabic"
              style={{ background: 'var(--th-surface-alt)' }}>
              إجمالي: <span className="font-bold" style={{ color }}>{records.length}</span> سجل
            </div>
          </div>
          {filteredRecs.length === 0 ? (
            <div className="text-center py-[60px] text-sm text-th-muted font-arabic">
              {records.length === 0 ? 'لا توجد سجلات — اضغط "سجل جديد" للبدء' : 'لا توجد نتائج'}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredRecs.slice().reverse().map(rec => {
                const rD = (rec.rows || []).reduce((s, r) => s + (parseFloat(r.dinar) || 0), 0);
                return (
                  <div key={rec.id}
                    className="rounded-xl p-[14px_18px] flex justify-between items-center border border-th-border"
                    style={{ background: 'var(--th-card-bg)' }}>
                    <div className="flex-1">
                      <div className="flex gap-3 items-center mb-1">
                        <span className="text-[17px] font-bold font-arabic" style={{ color }}>{rec.bayan || '— سجل —'}</span>
                        {rec.updatedAt && (
                          <span className="text-[14px] px-2 py-0.5 rounded font-arabic"
                            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>معدّل</span>
                        )}
                      </div>
                      <div className="flex gap-4 text-[15px] text-th-muted font-arabic">
                        <span>📅 {rec.date}</span>
                        <span>📝 {(rec.rows || []).length} صف</span>
                        {rD > 0 && <span style={{ color: 'var(--th-green)' }}>دينار: {rD.toLocaleString('en-US')}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {!readOnly && (
                        <button onClick={() => handleEdit(rec)} className="px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer font-arabic"
                          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>✏️</button>
                      )}
                      {!readOnly && (
                        <button onClick={() => setDelConfirm(rec)} className="px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer font-arabic"
                          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>🗑️</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {delConfirm && (
            <div className="modal-overlay" style={{ zIndex: 99999 }}>
              <div className="modal-card max-w-[420px] w-[90%] p-[32px_36px] text-center font-arabic">
                <div className="text-[40px] mb-4">⚠️</div>
                <div className="text-base font-bold text-th-text mb-2">تأكيد الحذف</div>
                <div className="text-[17px] text-th-muted mb-6">هل أنت متأكد من حذف هذا السجل؟</div>
                <div className="flex gap-2.5 justify-center">
                  <button onClick={() => handleDelete(delConfirm.id)} className="btn-danger px-7 py-2.5 rounded-lg font-bold">نعم، احذف</button>
                  <button onClick={() => setDelConfirm(null)} className="btn-secondary px-7 py-2.5 rounded-lg">إلغاء</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// الصفحة الرئيسية — السجلات
// ═══════════════════════════════════════════
export default function Records({ user, onLogout, theme, toggleTheme }) {
  const navigate = useNavigate();
  const [active, setActive] = useState('sulaf');
  const [search, setSearch] = useState('');
  const [data,   setData]   = useState({ journal:[] });
  const [counts, setCounts] = useState({ sulaf:0, amanat:0, madinin:0, dainun:0, journal:0, iradat:0 });

  useEffect(() => {
    getJournalEntries().then(j => {
      setData({ journal: j });
      setCounts(c => ({ ...c, journal: j.length }));
    });
    api.get('/records/khazain').then(r => setCounts(c => ({ ...c, sulaf:   r.data.length })));
    api.get('/records/amanat') .then(r => setCounts(c => ({ ...c, amanat:  r.data.length })));
    api.get('/records/madinin').then(r => setCounts(c => ({ ...c, madinin: r.data.length })));
    api.get('/records/dainun-ila').then(r => setCounts(c => ({ ...c, dainun: r.data.length })));
    api.get('/records/iradat') .then(r => setCounts(c => ({ ...c, iradat:  r.data.length })));
  }, []);

  const SIJILAT = [
    { id:'sulaf',   label:'سجل السلف',    icon:'💳', color:'#818cf8' },
    { id:'amanat',  label:'سجل امانات',   icon:'🔐', color:'#60a5fa' },
    { id:'madinin', label:'سجل مدينون',   icon:'📤', color:'#f97316' },
    { id:'dainun',  label:'سجل دائنون',   icon:'📥', color:'#34d399' },
    { id:'journal', label:'سجل اليومية',  icon:'📒', color:'#a78bfa', rows:data.journal },
    { id:'iradat',  label:'سجل الايرادات',icon:'💰', color:'#e879f9' },
  ];
  const current = SIJILAT.find(s => s.id === active);

  const COLUMNS = {
    journal: [
      { key:'date',        label:'التاريخ' },
      { key:'voucherId',   label:'رقم القيد', render:r=>String(r.voucherId||'').slice(-6) },
      { key:'description', label:'البيان',    color:()=>'var(--th-text)' },
      { key:'debit',  label:'مدين (IQD)',  bold:true, color:v=>v>0?'#34d399':'var(--th-text-muted)', render:r=>r.debit>0?fmt(r.debit):'—' },
      { key:'credit', label:'دائن (IQD)', bold:true, color:v=>v>0?'#f59e0b':'var(--th-text-muted)', render:r=>r.credit>0?fmt(r.credit):'—' },
    ],
  };

  const cols     = COLUMNS[active] || [];
  const allRows  = current?.rows || [];
  const filtered = allRows.filter(row => !search || Object.values(row).some(v => String(v||'').toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="page-bg flex font-arabic text-[19px]">
      <Sidebar user={user} theme={theme} toggleTheme={toggleTheme} onLogout={onLogout}/>
      <div className="flex-1 overflow-auto">
        <div className="px-3 md:px-7 pt-16 md:pt-[44px] pb-6">

          {/* بطاقات السجلات */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {SIJILAT.map(s => (
              <SijilCard
                key={s.id}
                label={s.label}
                icon={s.icon}
                count={counts[s.id] || 0}
                color={s.color}
                active={active===s.id}
                onClick={()=>{ setActive(s.id); setSearch(''); }}
              />
            ))}
          </div>

          {/* المحتوى */}
          {active==='iradat' ? (
            <div className="rounded-2xl p-[20px_24px] border border-th-border" style={{ background:'var(--th-card-bg)' }}>
              <IradatRegister user={user} readOnly={user?.role === 'admin'}/>
            </div>
          ) : active==='sulaf' ? (
            <div className="rounded-2xl p-[20px_24px] border border-th-border" style={{ background:'var(--th-card-bg)' }}>
              <KhazainRegister user={user} readOnly={user?.role === 'admin'}/>
            </div>
          ) : active==='amanat' ? (
            <div className="rounded-2xl p-[20px_24px] border border-th-border" style={{ background:'var(--th-card-bg)' }}>
              <SijilRegister user={user} readOnly={user?.role === 'admin'} mainKey="amanat_records" ilaKey="amanat_ila_records" title="سجل امانات" color="#60a5fa"/>
            </div>
          ) : active==='madinin' ? (
            <div className="rounded-2xl p-[20px_24px] border border-th-border" style={{ background:'var(--th-card-bg)' }}>
              <SijilRegister user={user} readOnly={user?.role === 'admin'} mainKey="madinin_records" ilaKey="madinin_ila_records" title="سجل مدينون" color="#f97316" side="min"/>
            </div>
          ) : active==='dainun' ? (
            <div className="rounded-2xl p-[20px_24px] border border-th-border" style={{ background:'var(--th-card-bg)' }}>
              <SijilRegister user={user} readOnly={user?.role === 'admin'} mainKey="dainun_records" ilaKey="dainun_ila_records" title="سجل دائنون" color="#34d399" side="ila"/>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-th-border" style={{ background:'var(--th-card-bg)' }}>
              {/* رأس الجدول */}
              <div className="flex justify-between items-center px-5 py-4 border-b border-th-border">
                <div className="flex items-center gap-3">
                  <div className="text-[17px] font-bold" style={{ color:current?.color }}>{current?.icon} {current?.label}</div>
                  <span className="text-[15px] px-2.5 py-0.5 rounded-full"
                    style={{ background:`${current?.color}20`, color:current?.color }}>
                    {filtered.length} سجل
                  </span>
                </div>
                <div className="flex gap-2.5 items-center">
                  <div className="relative">
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none text-th-muted">🔍</span>
                    <input value={search} onChange={e=>setSearch(e.target.value)}
                      placeholder="بحث..."
                      className="input-field pr-8 pl-3 py-2 text-sm w-[200px]"/>
                  </div>
                  <button onClick={()=>printTable(current?.label,cols,filtered)}
                    className="px-4 py-2 rounded-lg text-sm font-bold cursor-pointer font-arabic"
                    style={{ background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)', color:'#f59e0b' }}>
                    🖨️ طباعة
                  </button>
                </div>
              </div>

              <Table columns={cols} rows={filtered} emptyMsg={`لا توجد بيانات في ${current?.label}`}/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
