import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import Sidebar from "../components/Sidebar.jsx";
import { getChartRows, saveChartRows, initAccountsIfNeeded } from "../store/accountsDB.js";
import { addAuditLog } from "../store/auditLog.js";

// أعمدة الأكواد
const CODE_COLS = [
  { key:'c1', label:'نوع الاستمارة', w: 100 },
  { key:'c2', label:'العدد',         w: 75  },
  { key:'c3', label:'المادة',        w: 75  },
  { key:'c4', label:'النوع',         w: 70  },
  { key:'c5', label:'',              w: 70  },
  { key:'c6', label:'',              w: 70  },
];

// تحديد مستوى الصف بناءً على آخر كود مملوء
function getLevel(row) {
  if (row.c5) return 4;
  if (row.c4) return 3;
  if (row.c3) return 2;
  if (row.c2) return 1;
  return 0;
}

export default function AccountsManager({ user, onLogout, theme, toggleTheme }) {
  const [rows,       setRows]       = useState([]);
  const [search,     setSearch]     = useState('');
  const [editId,     setEditId]     = useState(null);
  const [editData,   setEditData]   = useState({});
  const [delConfirm, setDelConfirm] = useState(null);
  const [addingRow,  setAddingRow]  = useState(null); // صف الإضافة
  const addRef = useRef();

  useEffect(() => { getChartRows().then(setRows).catch(()=>{}); }, []);

  const save = async (r) => { setRows(r); await saveChartRows(r); };

  // ── بحث ──
  const filtered = search.trim().length >= 1
    ? rows.filter(r => r.name.includes(search.trim()) ||
        [r.c1,r.c2,r.c3,r.c4,r.c5].some(c => c && c.includes(search.trim())))
    : rows;

  // ── بدء التعديل ──
  const startEdit = (row) => {
    setEditId(row.id);
    setEditData({ c1:row.c1||'', c2:row.c2||'', c3:row.c3||'', c4:row.c4||'', c5:row.c5||'', name:row.name||'' });
    setAddingRow(null);
  };

  // ── حفظ التعديل ──
  const saveEdit = async () => {
    if (!editData.name.trim()) return;
    const old = rows.find(r => r.id === editId);
    await save(rows.map(r => r.id === editId ? { ...r, ...editData } : r));
    addAuditLog({ user, action:'update', entity:'account', detail:`تعديل حساب: ${old?.name||''} ← ${editData.name}` });
    setEditId(null);
  };

  // ── حذف ──
  const handleDelete = async (id) => {
    const row = rows.find(r => r.id === id);
    await save(rows.filter(r => r.id !== id));
    addAuditLog({ user, action:'delete', entity:'account', detail:`حذف حساب: ${row?.name||''}` });
    setDelConfirm(null);
  };

  // ── إضافة صف جديد ──
  const startAddRow = () => {
    const newId = Date.now();
    setAddingRow({ id: newId, c1:'', c2:'', c3:'', c4:'', c5:'', name:'' });
    setEditId(null);
    setTimeout(() => addRef.current?.focus(), 50);
  };

  const saveAddRow = async () => {
    if (!addingRow?.name?.trim()) { setAddingRow(null); return; }
    await save([...rows, addingRow]);
    addAuditLog({ user, action:'create', entity:'account', detail:`إضافة حساب: ${addingRow.name}` });
    setAddingRow(null);
  };

  // ── طباعة ──
  const handlePrint = () => {
    const th = 'border:1px solid #999;padding:4px 6px;background:#e8f0e8;font-weight:700;text-align:center;font-size:8pt;white-space:nowrap';
    const td = (lvl, isCode) => `border:1px solid #ccc;padding:3px 6px;text-align:${isCode?'center':'right'};font-size:8pt;${lvl===0?'font-weight:700;background:#f0f4f0;':lvl===1?'font-style:italic;font-weight:600;':''}`;
    const headers = [...CODE_COLS].reverse().map(c => `<th style="${th}">${c.label}</th>`).join('') + `<th style="${th}">اسم الحساب</th>`;
    const body = filtered.map(r => {
      const lvl = getLevel(r);
      const codes = [...CODE_COLS].reverse().map(c => `<td style="${td(lvl, true)}">${r[c.key]||''}</td>`).join('');
      return `<tr>${codes}<td style="${td(lvl, false)}">${r.name}</td></tr>`;
    }).join('');
    const w = window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600;700&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Naskh Arabic',serif;direction:rtl;padding:20px}@page{size:A4 landscape;margin:10mm}table{width:100%;border-collapse:collapse}h2{text-align:center;font-size:14pt;margin-bottom:12px}</style></head><body><h2>الدليل المحاسبي</h2><table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table></body></html>`);
    w.document.close(); setTimeout(() => w.print(), 600);
  };

  // ── تصدير Excel ──
  const handleExportExcel = () => {
    const headers = [...CODE_COLS.map(c => c.label), 'اسم الحساب'];
    const data = rows.map(r => [...CODE_COLS.map(c => r[c.key]||''), r.name||'']);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    ws['!cols'] = [100,80,80,80,80,200].map(w => ({ wch: Math.round(w/7) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الدليل المحاسبي');
    XLSX.writeFile(wb, 'chart_of_accounts.xlsx');
    addAuditLog({ user, action:'export', entity:'account', detail:`تصدير الدليل المحاسبي (${rows.length} حساب)` });
  };

  // ── استيراد Excel ──
  const importRef = useRef();
  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb   = XLSX.read(ev.target.result, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        // تجاوز السطر الأول (العناوين)
        const nameIdx = CODE_COLS.length;
        const imported = data.slice(1)
          .filter(row => row.some(cell => String(cell).trim()))
          .map((row, i) => {
            const entry = { id: Date.now() + i, name: String(row[nameIdx]||'').trim() };
            CODE_COLS.forEach((c, ci) => { entry[c.key] = String(row[ci]||'').trim(); });
            return entry;
          });
        if (!imported.length) { alert('الملف فارغ أو غير صحيح'); return; }
        if (!confirm(`سيتم استيراد ${imported.length} حساب. هل أنت متأكد؟`)) return;
        save(imported);
        addAuditLog({ user, action:'import', entity:'account', detail:`استيراد الدليل المحاسبي (${imported.length} حساب)` });
        alert(`✅ تم استيراد ${imported.length} حساب بنجاح`);
      } catch {
        alert('خطأ في قراءة الملف — تأكد أنه Excel صحيح');
      }
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  // ── إعادة تعيين ──
  const handleReset = async () => {
    if (!confirm('سيتم إعادة تعيين الدليل للإعداد الافتراضي. هل أنت متأكد؟')) return;
    await saveChartRows([]);
    setRows([]);
    setEditId(null); setAddingRow(null);
  };

  const thStyle = {
    border:'1px solid var(--th-border)',
    background:'#1a3a5c',
    color:'#fff',
    padding:'6px 8px',
    textAlign:'center',
    fontSize:13,
    fontWeight:700,
    whiteSpace:'nowrap',
  };
  const tdStyle = (lvl, isCode=false) => ({
    border:'1px solid var(--th-border)',
    padding:'3px 6px',
    textAlign: isCode ? 'center' : 'right',
    fontSize:13,
    color:'var(--th-text)',
    fontWeight: lvl===0 ? 700 : lvl===1 ? 600 : 400,
    fontStyle: lvl===1 ? 'italic' : 'normal',
    background: lvl===0 ? 'rgba(129,140,248,0.12)' : lvl===1 ? 'rgba(129,140,248,0.05)' : 'transparent',
  });

  const inputStyle = {
    background:'var(--th-input-bg)',
    border:'1px solid #818cf8',
    borderRadius:4,
    color:'var(--th-text)',
    padding:'2px 6px',
    fontSize:12,
    width:'100%',
    textAlign:'center',
    outline:'none',
  };

  return (
    <div className="page-bg flex font-arabic">
      <Sidebar user={user} theme={theme} toggleTheme={toggleTheme} onLogout={onLogout}/>
      <div className="flex-1 overflow-auto">
        <div className="px-3 md:px-6 pt-16 md:pt-[40px] pb-6">

          {/* ── الهيدر ── */}
          <div className="flex justify-between items-center mb-5">
            <div>
              <div className="text-[20px] font-bold text-th-text">📚 الدليل المحاسبي</div>
              <div className="text-[12px] text-th-muted mt-0.5">{rows.length} حساب</div>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="🔍 بحث بالاسم أو الرمز..."
                className="input-field py-2 px-4 text-[13px] w-[220px] text-right"
              />
              <button onClick={startAddRow}
                className="btn-primary px-4 py-2 text-[13px]">＋ إضافة حساب</button>
              <button onClick={handleExportExcel}
                className="px-4 py-2 rounded-lg text-[13px] font-bold cursor-pointer font-arabic"
                style={{ background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.3)', color:'#34d399' }}>
                ⬇️ تصدير Excel
              </button>
              <label className="px-4 py-2 rounded-lg text-[13px] font-bold cursor-pointer font-arabic"
                style={{ background:'rgba(96,165,250,0.1)', border:'1px solid rgba(96,165,250,0.3)', color:'#60a5fa' }}>
                📂 استيراد Excel
                <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel}/>
              </label>
              <button onClick={handlePrint}
                className="px-4 py-2 rounded-lg text-[13px] font-bold cursor-pointer font-arabic"
                style={{ background:'rgba(96,165,250,0.1)', border:'1px solid rgba(96,165,250,0.3)', color:'#60a5fa' }}>
                🖨️ طباعة
              </button>
              <button onClick={handleReset}
                className="px-4 py-2 rounded-lg text-[12px] font-bold cursor-pointer font-arabic"
                style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5' }}>
                ↺ إعادة تعيين
              </button>
            </div>
          </div>

          {/* ── الجدول ── */}
          <div className="rounded-2xl border border-th-border overflow-hidden"
            style={{ background:'var(--th-card-bg)' }}>
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight:'calc(100vh - 180px)' }}>
              <table className="w-full border-collapse font-arabic" style={{ minWidth:700 }}>
                <thead style={{ position:'sticky', top:0, zIndex:10 }}>
                  <tr>
                    {/* الأعمدة RTL — نعكس الترتيب بـ CSS direction */}
                    <th style={{ ...thStyle, width:40 }}>#</th>
                    {CODE_COLS.map(c => (
                      <th key={c.key} style={{ ...thStyle, width: c.w }}>{c.label}</th>
                    ))}
                    <th style={{ ...thStyle }}>اسم الحساب</th>
                    <th style={{ ...thStyle, width:80 }}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, idx) => {
                    const lvl = getLevel(row);
                    const isEditing = editId === row.id;
                    return (
                      <tr key={row.id}
                        className={idx%2===0 ? 'tr-even' : 'tr-odd'}
                        onDoubleClick={() => !isEditing && startEdit(row)}>

                        {/* رقم الصف */}
                        <td style={{ ...tdStyle(lvl,true), color:'var(--th-text-muted)', fontSize:11, width:40 }}>
                          {idx+1}
                        </td>

                        {/* أعمدة الأكواد */}
                        {CODE_COLS.map(c => (
                          <td key={c.key} style={{ ...tdStyle(lvl,true), width:c.w }}>
                            {isEditing ? (
                              <input value={editData[c.key]} onChange={e=>setEditData(p=>({...p,[c.key]:e.target.value}))}
                                onKeyDown={e=>{if(e.key==='Enter')saveEdit();if(e.key==='Escape')setEditId(null);}}
                                style={{ ...inputStyle, width: c.w-12 }}/>
                            ) : (row[c.key] || '')}
                          </td>
                        ))}

                        {/* اسم الحساب */}
                        <td style={{ ...tdStyle(lvl), paddingRight: 8 + lvl*16, minWidth:200 }}>
                          {isEditing ? (
                            <input value={editData.name} onChange={e=>setEditData(p=>({...p,name:e.target.value}))}
                              onKeyDown={e=>{if(e.key==='Enter')saveEdit();if(e.key==='Escape')setEditId(null);}}
                              style={{ ...inputStyle, textAlign:'right' }} autoFocus/>
                          ) : row.name}
                        </td>

                        {/* إجراءات */}
                        <td style={{ ...tdStyle(lvl,true), width:80 }}>
                          {isEditing ? (
                            <div className="flex gap-1 justify-center">
                              <button onClick={saveEdit}
                                className="px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer"
                                style={{ background:'#818cf8', color:'#fff' }}>✓</button>
                              <button onClick={()=>setEditId(null)}
                                className="px-2 py-0.5 rounded text-[11px] cursor-pointer btn-secondary">✕</button>
                            </div>
                          ) : (
                            <div className="flex gap-1 justify-center">
                              <button onClick={()=>startEdit(row)} title="تعديل"
                                className="px-1.5 py-0.5 rounded text-[11px] cursor-pointer"
                                style={{ background:'rgba(245,158,11,0.15)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.3)' }}>✏️</button>
                              <button onClick={()=>setDelConfirm(row)} title="حذف"
                                className="px-1.5 py-0.5 rounded text-[11px] cursor-pointer"
                                style={{ background:'rgba(239,68,68,0.1)', color:'#fca5a5', border:'1px solid rgba(239,68,68,0.3)' }}>🗑️</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {/* صف الإضافة */}
                  {addingRow && (
                    <tr style={{ background:'rgba(129,140,248,0.1)' }}>
                      <td style={{ ...tdStyle(0,true), fontSize:11, color:'var(--th-text-muted)' }}>*</td>
                      {CODE_COLS.map(c => (
                        <td key={c.key} style={{ ...tdStyle(0,true) }}>
                          <input ref={c.key==='c1' ? addRef : null} value={addingRow[c.key]}
                            onChange={e=>setAddingRow(p=>({...p,[c.key]:e.target.value}))}
                            onKeyDown={e=>{if(e.key==='Enter')saveAddRow();if(e.key==='Escape')setAddingRow(null);}}
                            style={{ ...inputStyle, width: c.w-12 }}/>
                        </td>
                      ))}
                      <td style={{ ...tdStyle(0) }}>
                        <input value={addingRow.name}
                          onChange={e=>setAddingRow(p=>({...p,name:e.target.value}))}
                          onKeyDown={e=>{if(e.key==='Enter')saveAddRow();if(e.key==='Escape')setAddingRow(null);}}
                          placeholder="اسم الحساب..."
                          style={{ ...inputStyle, textAlign:'right' }}/>
                      </td>
                      <td style={{ ...tdStyle(0,true) }}>
                        <div className="flex gap-1 justify-center">
                          <button onClick={saveAddRow}
                            className="px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer"
                            style={{ background:'#818cf8', color:'#fff' }}>✓</button>
                          <button onClick={()=>setAddingRow(null)}
                            className="px-2 py-0.5 rounded text-[11px] cursor-pointer btn-secondary">✕</button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {filtered.length === 0 && !addingRow && (
                    <tr>
                      <td colSpan={CODE_COLS.length+3}
                        className="text-center py-16 text-sm text-th-muted">
                        لا توجد نتائج
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-[11px] text-th-muted mt-2 text-center">
            💡 انقر مرتين على أي صف للتعديل · اضغط Enter للحفظ · Escape للإلغاء
          </div>
        </div>
      </div>

      {/* ── Modal تأكيد الحذف ── */}
      {delConfirm && (
        <div className="modal-overlay" style={{ zIndex:99999 }}>
          <div className="modal-card max-w-[400px] w-[90%] p-[32px_36px] text-center font-arabic">
            <div className="text-[36px] mb-4">🗑️</div>
            <div className="text-base font-bold text-th-text mb-2">حذف الحساب</div>
            <div className="text-[13px] text-th-muted mb-6">
              هل تريد حذف <strong style={{color:'#818cf8'}}>"{delConfirm.name}"</strong>؟
            </div>
            <div className="flex gap-2.5 justify-center">
              <button onClick={()=>handleDelete(delConfirm.id)} className="btn-danger px-7 py-2.5 rounded-lg font-bold">نعم، احذف</button>
              <button onClick={()=>setDelConfirm(null)} className="btn-secondary px-7 py-2.5 rounded-lg">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
