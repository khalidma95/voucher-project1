import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Sidebar from "../components/Sidebar.jsx";
import api from "../api/client.js";
import { saveVoucher, getSarfVouchers, deleteVoucher, saveSalfFromVoucher, saveSalfIlaFromVoucher, saveMadininFromVoucher, saveDainunFromVoucher } from "../store/db.js";
import { getAccounts } from "../store/accountsDB.js";
import { addAuditLog } from "../store/auditLog.js";
import ModalArchive from "../components/dashboard/ModalArchive.jsx";
import ModalViewArchive from "../components/dashboard/ModalViewArchive.jsx";

const NROWS = 20;

function numToWords(n) {
  n = Math.round(parseFloat(n) || 0);
  if (!n) return '';
  const ones = ['','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة','أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر'];
  const tens = ['','عشرة','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون'];
  const hunds = ['','مئة','مئتان','ثلاثمئة','أربعمئة','خمسمئة','ستمئة','سبعمئة','ثمانمئة','تسعمئة'];
  function b(x) {
    if (!x) return '';
    if (x < 20) return ones[x];
    if (x < 100) { const t = Math.floor(x/10), o = x%10; return o ? ones[o]+' و'+tens[t] : tens[t]; }
    const h = Math.floor(x/100), r = x%100; return r ? hunds[h]+' و'+b(r) : hunds[h];
  }
  if (n < 1000) return b(n)+' دينار';
  if (n < 1000000) {
    const t = Math.floor(n/1000), r = n%1000;
    const ts = t===1?'ألف':t===2?'ألفان':t<=10?b(t)+' آلاف':b(t)+' ألف';
    return r ? ts+' و'+b(r)+' دينار' : ts+' دينار';
  }
  const m = Math.floor(n/1000000), r = n%1000000;
  const ms = m===1?'مليون':b(m)+' مليون';
  return r ? ms+' و'+numToWords(r) : ms+' دينار';
}

const emptyRow = () => ({ tafasil:'', m3:'', d3:'', m4:'', d4:'', dal3:'', dal4:'', dal5:'' });

const SIG_KEYS = ['munazzim','mustalam','ism','muhasib','mudaqqiq','dirHisabat','dirTadqiq','raees'];
let _sarfSigDefaults = {};
const getSigDefaults = () => _sarfSigDefaults;
const saveSigDefaults = async (d) => {
  _sarfSigDefaults = d;
  await api.put('/settings/sarfSigDefaults', { value: d });
};
const blankDoc = () => ({
  docNo:'', docDate:'', details:'', chkNo:'', chkAmt:'', chkDate:'',
  ...SIG_KEYS.reduce((o,k) => ({ ...o, [k]: getSigDefaults()[k]||'' }), {}),
});

const normalizeRow = row => {
  if ('tafasil' in row) return row;
  const isDebit = row.type !== 'credit';
  return {
    tafasil: isDebit ? (row.from||'') : (row.to||''),
    m3: isDebit ? (row.m3||'') : '',
    d3: isDebit ? '' : (row.d3||''),
    m4: isDebit ? (row.m4||'') : '',
    d4: isDebit ? '' : (row.d4||''),
    dal3: row.dal3||'', dal4: row.dal4||'', dal5: row.dal5||'',
  };
};

const fmtNum = val => {
  const raw = String(val).replace(/,/g,'');
  if (raw==='' || /^\d*$/.test(raw)) return raw ? Number(raw).toLocaleString('en-US') : '';
  return val;
};

export function buildDocHTML(data, rows) {
  const normalizedRows = (rows||[]).map(normalizeRow);
  const filled = normalizedRows.filter(r => r.m3||r.d3||r.m4||r.d4||r.tafasil);
  const PRINT_ROWS = 20;
  const allRows = [...filled];
  while (allRows.length < PRINT_ROWS) allRows.push(emptyRow());

  const chkAmtNum = parseFloat((data.chkAmt||'').replace(/,/g,'')) || 0;
  const totalStr  = chkAmtNum > 0 ? chkAmtNum.toLocaleString('ar-IQ') : '';
  const totalWords = numToWords(chkAmtNum);

  const th = 'border:0.7px solid #000;text-align:center;padding:2px 3px;font-weight:700;background:#f5f5f5;font-size:9pt';
  const td = 'border:0.7px solid #000;text-align:center;padding:1px 2px;height:18px;font-size:8.5pt;overflow:hidden;white-space:nowrap';
  const ul = v => `<span style="border-bottom:1px solid #333;min-width:80px;display:inline-block;padding-right:2px">${v||''}</span>`;

  const tableRows = allRows.map(row =>
    `<tr>
      <td style="${td}">${row.m3||''}</td>
      <td style="${td}">${row.d3||''}</td>
      <td style="${td}">${row.m4||''}</td>
      <td style="${td}">${row.d4||''}</td>
      <td style="${td};text-align:right;padding-right:4px;white-space:normal">${row.tafasil||''}</td>
      <td style="${td}">${row.dal3||''}</td>
      <td style="${td}">${row.dal4||''}</td>
      <td style="${td}">${row.dal5||''}</td>
    </tr>`
  ).join('');

  const footerCols = [
    [['المنظم',data.munazzim],['توقيع المستلم',data.mustalam],['الاسم',data.ism]],
    [['المحاسب',data.muhasib],['المدقق',data.mudaqqiq]],
    [['مدير الحسابات',data.dirHisabat],['مدير التدقيق',data.dirTadqiq]],
    [['رئيس الدائرة',data.raees]],
  ].map(col => `<div style="display:flex;flex-direction:column;gap:11px">${
    col.map(([lbl,val]) =>
      `<div style="display:flex;flex-direction:column;gap:1px">
        <span style="font-weight:600;font-size:9.5pt">${lbl} :</span>
        <span style="border-bottom:1px solid #333;min-height:16px;display:block;font-size:9pt">${val||''}</span>
      </div>`
    ).join('')
  }</div>`).join('');

  return `<div style="background:#fff;width:190mm;margin:0 auto;padding:8mm 10mm;font-family:'Noto Naskh Arabic','Times New Roman',serif;direction:rtl;color:#000;font-size:9.5pt;box-sizing:border-box">
    <div style="display:grid;grid-template-columns:1fr 130px 1fr;gap:4px;margin-bottom:4px;align-items:start">
      <div style="text-align:right;font-size:9.5pt;line-height:2.1">
        <div>اسم الدائرة : فحص وتصديق البذور</div>
        <div>رقم المستند : ${ul(data.docNo)}</div>
        <div>التاريخ : ${ul(data.docDate)}</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:18pt;font-weight:700;line-height:1.3">مستند صرف</div>
        <div style="font-size:9.5pt">امانات صندوق دعم البذور</div>
      </div>
      <div style="text-align:right;font-size:9.5pt;line-height:2.1">
        <div>رقم الصك : ${ul(data.chkNo)}</div>
        <div>مبلغ الصك : ${ul(data.chkAmt)}</div>
        <div>التاريخ : ${ul(data.chkDate)}</div>
      </div>
    </div>
    <div style="border-top:1.5px solid #000;padding-top:4px;margin-bottom:2px;text-align:center;font-size:11pt;font-weight:700">نصادق على صرف المبلغ المبين تفاصيله ادناه</div>
    <table style="width:100%;border-collapse:collapse;font-size:9pt;table-layout:fixed">
      <colgroup>
        <col style="width:75px"/><col style="width:75px"/>
        <col style="width:75px"/><col style="width:75px"/>
        <col/>
        <col style="width:28px"/><col style="width:28px"/><col style="width:28px"/>
      </colgroup>
      <thead>
        <tr>
          <th colspan="2" style="${th}">٣</th>
          <th colspan="2" style="${th}">٤</th>
          <th rowspan="2" style="${th}">التفاصيل</th>
          <th colspan="3" style="${th}">الدليل المحاسبي</th>
        </tr>
        <tr>
          <th style="${th}">مدين</th><th style="${th}">دائن</th>
          <th style="${th}">مدين</th><th style="${th}">دائن</th>
          <th style="${th}">٣</th><th style="${th}">٤</th><th style="${th}">٥</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
        <tr>
          <td style="${td};font-weight:700;background:#f9f9f9;text-align:center">المجموع</td>
          <td style="${td};font-weight:700;background:#f9f9f9">${totalStr}</td>
          <td colspan="6" style="${td};text-align:right;padding-right:8px;font-weight:600;font-size:8.5pt;background:#f9f9f9">${totalWords}</td>
        </tr>
      </tbody>
    </table>
    <div style="border-top:1.5px solid #000;margin-top:3px;padding-top:5px;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px 10px;font-size:9.5pt">${footerCols}</div>
  </div>`;
}

/* ── CellInput ── */
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
        padding:     small ? '5px 3px' : '7px 5px',
        fontSize:    small ? 12 : 14,
        colorScheme: 'var(--th-color-scheme)',
        textAlign:   right ? 'right' : 'center',
        fontFamily:  "'Noto Naskh Arabic','Times New Roman',serif",
      }}
    />
  );
}

/* ── TafasilInput — autocomplete من/الى من accounts.js مع portal ── */
function TafasilInput({ value, onChange }) {
  const parseVal = v => {
    if ((v||'').startsWith('من '))  return { dir:'من',  text:v.slice(3) };
    if ((v||'').startsWith('الى ')) return { dir:'الى', text:v.slice(4) };
    return { dir:'', text:v||'' };
  };
  const { dir: initDir, text: initText } = parseVal(value);
  const [dir,       setDir]       = useState(initDir);
  const [search,    setSearch]    = useState(initText);
  const [open,      setOpen]      = useState(false);
  const [sel,       setSel]       = useState(-1);
  const [accounts,  setAccounts]  = useState([]);
  const inputRef = useRef(null);
  const [pos,    setPos]    = useState({ top:0, left:0, width:0 });

  useEffect(() => { getAccounts().then(setAccounts).catch(() => {}); }, []);

  const matches = search.length >= 2 ? accounts.filter(a => a.includes(search)) : [];

  const pick = acct => {
    setSearch(acct);
    onChange((dir ? dir+' ' : '')+acct);
    setOpen(false); setSel(-1);
  };
  const selectDir = d => {
    if (dir === d) {
      setDir('');
      onChange(search);
    } else {
      setDir(d);
      onChange(d+(search ? ' '+search : ''));
    }
  };
  const handleInput = e => {
    const txt = e.target.value;
    setSearch(txt); setOpen(true); setSel(-1);
    onChange((dir ? dir+' ' : '')+txt);
  };
  const onKey = e => {
    if (!open || !matches.length) return;
    if (e.key==='ArrowDown') { e.preventDefault(); setSel(s => Math.min(s+1, matches.length-1)); }
    else if (e.key==='ArrowUp') { e.preventDefault(); setSel(s => Math.max(s-1, 0)); }
    else if (e.key==='Enter' && sel>=0) { e.preventDefault(); pick(matches[sel]); }
    else if (e.key==='Escape') setOpen(false);
  };
  const onFocus = () => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 2, left: r.left + window.scrollX, width: r.width });
    }
    if (search.length >= 2) setOpen(true);
  };

  const dropdown = open && matches.length > 0 ? createPortal(
    <div style={{
      position: 'absolute',
      top:      pos.top,
      left:     pos.left,
      width:    Math.max(pos.width, 240),
      background:   '#1e293b',
      border:       '1px solid rgba(245,158,11,0.5)',
      borderRadius: 6,
      maxHeight:    200,
      overflowY:    'auto',
      zIndex:       99999,
      direction:    'rtl',
      boxShadow:    '0 8px 24px rgba(0,0,0,0.35)',
    }}>
      {matches.map((m,i) => (
        <div key={m}
          onMouseDown={e => { e.preventDefault(); pick(m); }}
          style={{
            padding:      '7px 12px',
            cursor:       'pointer',
            background:   i===sel ? '#f59e0b22' : '#1e293b',
            borderBottom: '1px solid #334155',
            color:        i===sel ? '#f59e0b' : '#e2e8f0',
            fontSize:     15,
            fontFamily:   "'Noto Naskh Arabic','Times New Roman',serif",
          }}>
          {dir && <span style={{ color:'#f59e0b', marginLeft:6 }}>{dir}</span>}
          {m}
        </div>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div style={{ display:'flex', width:'100%' }}>
      {['من','الى'].map(d => (
        <button key={d} type="button"
          onMouseDown={e => { e.preventDefault(); selectDir(d); }}
          style={{
            padding:      '6px 8px',
            fontSize:     13,
            fontWeight:   700,
            cursor:       'pointer',
            border:       '1px solid var(--th-input-border)',
            borderRight:  'none',
            background:   dir===d ? '#f59e0b' : 'var(--th-input-bg)',
            color:        dir===d ? '#0f172a' : 'var(--th-text-muted)',
            borderRadius: d==='من' ? '4px 0 0 4px' : 0,
            fontFamily:   "'Noto Naskh Arabic','Times New Roman',serif",
            whiteSpace:   'nowrap',
            flexShrink:   0,
          }}>
          {d}
        </button>
      ))}
      <input
        ref={inputRef}
        value={search}
        onChange={handleInput}
        onFocus={onFocus}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onKeyDown={onKey}
        autoComplete="off"
        placeholder={dir ? '...' : 'ابحث...'}
        style={{
          flex:         1,
          minWidth:     0,
          background:   'var(--th-input-bg)',
          border:       '1px solid var(--th-input-border)',
          borderRadius: '0 4px 4px 0',
          padding:      '6px 8px',
          color:        'var(--th-text)',
          fontSize:     13,
          outline:      'none',
          textAlign:    'right',
          direction:    'rtl',
          fontFamily:   "'Noto Naskh Arabic','Times New Roman',serif",
          colorScheme:  'var(--th-color-scheme)',
        }}
      />
      {dropdown}
    </div>
  );
}

export { TafasilInput };

/* ══════════════════════════════════════════════════════
   التطبيق الرئيسي
══════════════════════════════════════════════════════ */
export default function VoucherApp({ user, onLogout, theme, toggleTheme }) {
  const readOnly = user?.role === 'admin';

  const [view,     setView]    = useState('list');
  const [sarfList, setSarfList]= useState([]);
  const [search,   setSearch]  = useState('');
  const [data,     setData]    = useState(blankDoc);
  const [rows,     setRows]    = useState(Array.from({ length: NROWS }, emptyRow));
  const [visRows,  setVisRows] = useState(3);

  const [showDefaults,  setShowDefaults]  = useState(false);
  const [draftDefaults, setDraftDefaults] = useState({});

  const [archiveItem, setArchiveItem] = useState(null);
  const [archiveImg,  setArchiveImg]  = useState(null);
  const [viewArchive, setViewArchive] = useState(null);

  const load = async () => {
    const all = await getSarfVouchers();
    setSarfList(readOnly ? all : all.filter(v => v.source === user?.source));
  };
  useEffect(() => {
    load();
    api.get('/settings/sarfSigDefaults').then(r => {
      try { _sarfSigDefaults = (typeof r.data === 'string' ? JSON.parse(r.data) : r.data) || {}; } catch {}
    }).catch(() => {});
  }, []);

  const handleArchiveSave = async () => {
    if (archiveItem) await api.patch(`/vouchers/${archiveItem.id}/archive`, { archive_img: archiveImg });
    setArchiveItem(null); setArchiveImg(null); load();
  };

  const updateRow = (i, f, v) => setRows(p => p.map((r, idx) => idx === i ? { ...r, [f]:v } : r));

  const handleSave = async () => {
    const filledRows = rows.filter(r => r.tafasil||r.m3||r.d3||r.m4||r.d4);
    if (!filledRows.length) { alert('أدخل بيانات أولاً'); return; }
    const chkAmtNum = parseFloat((data.chkAmt||'').replace(/,/g,'')) || 0;
    const voucher = {
      type:       'sarf',
      source:     user?.source,
      doc_no:     data.docNo,
      doc_date:   data.docDate,
      chk_no:     data.chkNo,
      chk_amt:    chkAmtNum,
      details:    data.details,
      payee:      data.payee || '',
      notes:      data.notes || '',
      rows:       filledRows,
      saved_by:   user?.name,
      created_by: user?.name,
      sigs:       SIG_KEYS.reduce((o,k) => ({ ...o, [k]: data[k]||'' }), {}),
    };
    const savedV = await saveVoucher(voucher);
    await Promise.all([
      saveSalfFromVoucher(savedV),
      saveSalfIlaFromVoucher(savedV),
      saveMadininFromVoucher(savedV),
      saveDainunFromVoucher(savedV),
    ]);
    await addAuditLog({ user, action:'save', entity:'voucher', detail:`حفظ مستند صرف رقم ${savedV.id||''}`, entityId: savedV.id });
    setData(blankDoc());
    setRows(Array.from({ length: NROWS }, emptyRow));
    setVisRows(3);
    load();
    setView('list');
  };

  const handlePrint = entry => {
    const win = window.open('', '_blank');
    if (!win) { alert('يرجى السماح بالنوافذ المنبثقة'); return; }
    win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Naskh Arabic',serif;direction:rtl;background:#fff}@page{size:A4 portrait;margin:8mm 10mm}</style>
    </head><body>${buildDocHTML(entry, entry.rows||[])}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 700);
  };

  /* ── واجهة الإدخال ── */
  const newEntryJSX = (
    <div>
      {/* رأس المستند - 3 أعمدة مثل الـ PDF */}
      <div className="rounded-xl px-5 py-4 mb-4"
        style={{ background:'var(--th-surface-alt)', border:'1px solid var(--th-border)' }}>
        <div className="grid grid-cols-3 gap-4">

          {/* يمين: رقم المستند + تاريخه */}
          <div className="flex flex-col gap-2.5">
            <div>
              <div className="field-label">رقم المستند</div>
              <input value={data.docNo} onChange={e => setData(d => ({...d, docNo:e.target.value}))} className="input-field" />
            </div>
            <div>
              <div className="field-label">تاريخ المستند</div>
              <input type="date" value={data.docDate} onChange={e => setData(d => ({...d, docDate:e.target.value}))} className="input-field" />
            </div>
          </div>

          {/* وسط: عنوان */}
          <div className="flex flex-col items-center justify-center gap-1 text-center">
            <div className="text-lg font-bold font-arabic" style={{ color:'var(--th-accent)' }}>مستند صرف</div>
            <div className="text-xs" style={{ color:'var(--th-text-muted)' }}>امانات صندوق دعم البذور</div>
          </div>

          {/* يسار: رقم الصك + مبلغ + تاريخ */}
          <div className="flex flex-col gap-2.5">
            <div>
              <div className="field-label">رقم الصك</div>
              <input value={data.chkNo} onChange={e => setData(d => ({...d, chkNo:e.target.value}))} className="input-field" />
            </div>
            <div>
              <div className="field-label">مبلغ الصك</div>
              <input
                value={data.chkAmt}
                onChange={e => setData(d => ({...d, chkAmt: fmtNum(e.target.value)}))}
                className="input-field"
                placeholder="0"
              />
            </div>
            <div>
              <div className="field-label">تاريخ الصك</div>
              <input type="date" value={data.chkDate} onChange={e => setData(d => ({...d, chkDate:e.target.value}))} className="input-field" />
            </div>
          </div>
        </div>
      </div>

      {/* حقل التفاصيل */}
      <div className="rounded-xl px-5 py-3 mb-4"
        style={{ background:'var(--th-surface-alt)', border:'1px solid var(--th-border)' }}>
        <div className="field-label mb-1">التفاصيل</div>
        <input
          value={data.details||''}
          onChange={e => setData(d => ({...d, details:e.target.value}))}
          className="input-field w-full"
          placeholder="أدخل تفاصيل المستند..."
        />
      </div>

      {/* بنر نصادق */}
      <div className="text-center text-sm font-bold py-2 mb-1 font-arabic rounded"
        style={{
          borderTop:    '2px solid var(--th-border)',
          borderBottom: '2px solid var(--th-border)',
          color:        'var(--th-text)',
          background:   'var(--th-surface-alt)',
          letterSpacing: '0.02em',
        }}>
        نصادق على صرف المبلغ المبين تفاصيله ادناه
      </div>

      {/* الجدول */}
      <div className="overflow-x-auto mb-4">
        <table className="border-collapse text-sm font-arabic" style={{ width:'100%', minWidth:900 }}>
          <colgroup>
            <col style={{ width:115 }}/><col style={{ width:115 }}/>
            <col style={{ width:115 }}/><col style={{ width:115 }}/>
            <col style={{ width:160 }}/>
            <col style={{ width:42 }}/><col style={{ width:42 }}/><col style={{ width:42 }}/>
          </colgroup>
          <thead>
            <tr style={{ background:'#1a3a5c' }}>
              <th colSpan={2} className="px-2 py-2 text-center text-white border" style={{ borderColor:'var(--th-border)' }}>٣</th>
              <th colSpan={2} className="px-2 py-2 text-center text-white border" style={{ borderColor:'var(--th-border)' }}>٤</th>
              <th rowSpan={2} className="px-2 py-2 text-center text-white border" style={{ borderColor:'var(--th-border)' }}>التفاصيل</th>
              <th colSpan={3} className="px-2 py-2 text-center text-white border" style={{ borderColor:'var(--th-border)' }}>الدليل المحاسبي</th>
            </tr>
            <tr style={{ background:'#1a3a5c' }}>
              <th className="px-2 py-1.5 text-center text-white border" style={{ borderColor:'var(--th-border)' }}>مدين</th>
              <th className="px-2 py-1.5 text-center text-white border" style={{ borderColor:'var(--th-border)' }}>دائن</th>
              <th className="px-2 py-1.5 text-center text-white border" style={{ borderColor:'var(--th-border)' }}>مدين</th>
              <th className="px-2 py-1.5 text-center text-white border" style={{ borderColor:'var(--th-border)' }}>دائن</th>
              <th className="px-2 py-1.5 text-center text-white border" style={{ borderColor:'var(--th-border)' }}>٣</th>
              <th className="px-2 py-1.5 text-center text-white border" style={{ borderColor:'var(--th-border)' }}>٤</th>
              <th className="px-2 py-1.5 text-center text-white border" style={{ borderColor:'var(--th-border)' }}>٥</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, visRows).map((row, i) => (
              <tr key={i} className={i%2===0 ? 'tr-even' : 'tr-odd'}>
                {['m3','d3','m4','d4'].map(f => (
                  <td key={f} className="p-0.5 border" style={{ borderColor:'var(--th-border)' }}>
                    <CellInput value={row[f]} onChange={e => updateRow(i, f, fmtNum(e.target.value))} />
                  </td>
                ))}
                <td className="p-0.5 border" style={{ borderColor:'var(--th-border)', minWidth:160 }}>
                  <TafasilInput value={row.tafasil} onChange={v => updateRow(i, 'tafasil', v)} />
                </td>
                {['dal3','dal4','dal5'].map(f => (
                  <td key={f} className="p-0.5 border" style={{ borderColor:'var(--th-border)' }}>
                    <CellInput value={row[f]} onChange={e => updateRow(i, f, e.target.value)} small />
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
          onClick={() => setVisRows(v => v+1)}
          className="w-full mb-4 py-2.5 rounded-lg text-sm font-bold cursor-pointer font-arabic transition-all"
          style={{ background:'rgba(245,158,11,0.08)', border:'2px dashed rgba(245,158,11,0.4)', color:'#f59e0b' }}>
          ＋ إضافة صف ({visRows}/{NROWS})
        </button>
      )}

      {/* التواقيع */}
      <div className="rounded-xl px-5 py-4 mb-5"
        style={{ background:'var(--th-surface-alt)', border:'1px solid var(--th-border)' }}>
        <div className="flex justify-between items-center mb-3">
          <div className="text-sm font-bold" style={{ color:'var(--th-accent)' }}>✍️ التواقيع</div>
          <button
            onClick={() => { setDraftDefaults(getSigDefaults()); setShowDefaults(true); }}
            className="text-xs px-3 py-1 rounded cursor-pointer font-arabic"
            style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', color:'#f59e0b' }}>
            ⚙️ تعيين أسماء افتراضية
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            ['munazzim','المنظم'],
            ['muhasib','المحاسب'],
            ['dirHisabat','مدير الحسابات'],
            ['raees','رئيس الدائرة'],
            ['mustalam','توقيع المستلم'],
            ['mudaqqiq','المدقق'],
            ['dirTadqiq','مدير التدقيق'],
            ['ism','الاسم'],
          ].map(([k, lbl]) => (
            <div key={k}>
              <div className="field-label">{lbl}</div>
              <input
                value={data[k]||''}
                onChange={e => setData(d => ({...d, [k]:e.target.value}))}
                className="input-field"
              />
            </div>
          ))}
        </div>
      </div>

      {/* الأزرار */}
      <div className="flex gap-2.5">
        <button onClick={handleSave}
          className="flex-[2] py-3 rounded-lg text-sm font-bold cursor-pointer border-none text-white font-arabic"
          style={{ background:'linear-gradient(135deg,var(--th-green),#059669)' }}>
          💾 حفظ المستند
        </button>
        <button
          onClick={() => handlePrint({ ...data, rows: rows.filter(r => r.tafasil||r.m3||r.d3||r.m4||r.d4) })}
          className="flex-1 py-3 rounded-lg text-sm font-bold cursor-pointer font-arabic"
          style={{ background:'rgba(96,165,250,0.15)', border:'1px solid rgba(96,165,250,0.4)', color:'#60a5fa' }}>
          🖨️ طباعة
        </button>
        <button onClick={() => setView('list')} className="btn-secondary flex-1 py-3 rounded-lg text-sm font-arabic">
          إلغاء
        </button>
      </div>
    </div>
  );

  /* ── الصفحة الرئيسية ── */
  return (
    <div className="page-bg flex font-arabic">
      <Sidebar user={user} theme={theme} toggleTheme={toggleTheme} onLogout={onLogout} />

      <div className="flex-1 overflow-auto px-8 py-7 mt-7">

        {/* رأس الصفحة */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-xl font-bold" style={{ color:'var(--th-accent)' }}>📋 سندات الصرف</div>
          {view === 'list' && !readOnly && (
            <button
              onClick={() => { setData(blankDoc()); setRows(Array.from({length:NROWS},emptyRow)); setVisRows(3); setView('new'); }}
              className="rounded-lg px-5 py-2.5 text-sm font-bold cursor-pointer border-none text-white font-arabic"
              style={{ background:'linear-gradient(135deg,var(--th-green),#059669)' }}>
              ➕ مستند جديد
            </button>
          )}
          {view === 'new' && (
            <div className="text-sm" style={{ color:'var(--th-text-muted)' }}>إدخال مستند جديد</div>
          )}
        </div>

        {view === 'new' && newEntryJSX}

        {view === 'list' && (
          <>
            {sarfList.length > 0 && (
              <div className="mb-4">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="🔍 ابحث برقم المستند أو الصك أو التاريخ أو المنظم..."
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
              const filtered = sarfList.slice().reverse().filter(v =>
                !q ||
                (v.docNo||'').toString().includes(q) ||
                (v.chkNo||'').toString().includes(q) ||
                (v.date||'').includes(q) ||
                (v.savedBy||'').toLowerCase().includes(q)
              );
              return filtered.length === 0 ? (
                <div className="text-center py-20 text-sm" style={{ color:'var(--th-text-muted)' }}>
                  {sarfList.length === 0
                    ? 'لا توجد سندات بعد' + (readOnly ? '' : ' — اضغط "مستند جديد" للبدء')
                    : 'لا توجد نتائج للبحث'}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filtered.map(v => (
                    <div key={v.id}
                      className="flex justify-between items-center rounded-xl px-5 py-4"
                      style={{ background:'var(--th-card-bg)', border:'1px solid var(--th-border)' }}>
                      <div>
                        <div className="text-base font-bold" style={{ color:'var(--th-accent)' }}>
                          رقم المستند: {v.docNo||'—'} · {v.docDate||v.date||'—'}
                        </div>
                        <div className="text-sm mt-1" style={{ color:'var(--th-text-muted)' }}>
                          رقم الصك: {v.chkNo||'—'} · المبلغ: {v.chkAmt||'—'} · بواسطة: {v.savedBy||'—'}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handlePrint(v)}
                          className="px-4 py-2 rounded-lg text-xs font-bold cursor-pointer font-arabic"
                          style={{ background:'rgba(96,165,250,0.15)', border:'1px solid rgba(96,165,250,0.4)', color:'#60a5fa' }}>
                          🖨️ طباعة
                        </button>
                        {!readOnly && (
                          v.archiveImg ? (
                            <span
                              onClick={() => setViewArchive(v)}
                              className="px-4 py-2 rounded-lg text-xs font-bold cursor-pointer font-arabic"
                              style={{ background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.4)', color:'#10b981' }}>
                              ✅ مؤرشف
                            </span>
                          ) : (
                            <button onClick={() => { setArchiveItem(v); setArchiveImg(null); }}
                              className="px-4 py-2 rounded-lg text-xs font-bold cursor-pointer font-arabic"
                              style={{ background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.35)', color:'#f59e0b' }}>
                              📷 أرشفة
                            </button>
                          )
                        )}
                        {!readOnly && (
                          <button
                            onClick={async () => { if (confirm('حذف هذا المستند؟')) { await deleteVoucher(v.id); await addAuditLog({ user, action:'delete', entity:'voucher', detail:`حذف مستند صرف رقم ${v.id||''}`, entityId:v.id }); load(); } }}
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

      {/* مودال الأسماء الافتراضية */}
      {showDefaults && (
        <div className="modal-overlay">
          <div className="modal-card font-arabic" style={{ width:520 }}>
            <div className="modal-header">
              <div className="text-sm font-bold" style={{ color:'var(--th-accent)' }}>⚙️ الأسماء الافتراضية للتواقيع</div>
              <button onClick={() => setShowDefaults(false)} className="btn-close">✕</button>
            </div>
            <div className="px-5 py-4">
              <div className="text-xs mb-4" style={{ color:'var(--th-text-muted)' }}>
                هذه الأسماء تُملأ تلقائياً عند إنشاء مستند صرف جديد، ويمكن تعديلها في أي وقت.
              </div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  ['munazzim','المنظم'],
                  ['muhasib','المحاسب'],
                  ['dirHisabat','مدير الحسابات'],
                  ['raees','رئيس الدائرة'],
                  ['mustalam','توقيع المستلم'],
                  ['mudaqqiq','المدقق'],
                  ['dirTadqiq','مدير التدقيق'],
                  ['ism','الاسم'],
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
                  onClick={async () => {
                    await saveSigDefaults(draftDefaults);
                    setData(d => ({ ...d, ...Object.fromEntries(SIG_KEYS.map(k => [k, draftDefaults[k]||d[k]])) }));
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
