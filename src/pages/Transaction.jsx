import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from "react";
import { saveVoucher, getAllocations } from "../store/db.js";
import { getBabs } from "../components/dashboard/constants.js";
import { generateJournalEntry, saveJournalEntry } from "../store/accountingMap.js";
import Sidebar from "../components/Sidebar.jsx";
import { addAuditLog } from "../store/auditLog.js";

// ── صفحة وضع النص على الورقة ──────────────────────────
function PrintPositioner({ bab, onBack }) {
  const pageRef                       = useRef(null);
  const [pos,      setPos]            = useState({ x: 50, y: 50 });
  const [fontSize, setFontSize]       = useState(14);
  const [dragging, setDragging]       = useState(false);
  const [offset,   setOffset]         = useState({ x: 0, y: 0 });

  const sentence = `نؤيد توفر الاعتماد على فقرة ${bab}`;

  const onMouseDown = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragging(true);
  };
  const onMouseMove = (e) => {
    if (!dragging || !pageRef.current) return;
    const r  = pageRef.current.getBoundingClientRect();
    const nx = ((e.clientX - r.left - offset.x) / r.width)  * 100;
    const ny = ((e.clientY - r.top  - offset.y) / r.height) * 100;
    setPos({ x: Math.max(0, Math.min(90, nx)), y: Math.max(0, Math.min(95, ny)) });
  };
  const onMouseUp = () => setDragging(false);

  const handlePrint = () => {
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Noto Naskh Arabic',serif;background:#fff}
        @page{size:A4;margin:0}
        .page{width:210mm;height:297mm;position:relative}
        .sentence{position:absolute;left:${pos.x}%;top:${pos.y}%;font-size:${fontSize}pt;font-weight:600;direction:rtl;white-space:nowrap}
      </style>
    </head><body><div class="page"><div class="sentence">${sentence}</div></div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div className="min-h-screen flex flex-col font-arabic"
      style={{ background:'linear-gradient(135deg,#0f172a 0%,#1a2744 50%,#0f172a 100%)', direction:'rtl' }}>

      {/* شريط العنوان */}
      <div className="flex justify-between items-center px-7 py-3.5"
        style={{
          background:    'rgba(0,0,0,0.5)',
          borderBottom:  '1px solid rgba(245,158,11,0.2)',
          backdropFilter:'blur(10px)',
        }}>
        <div className="flex items-center gap-3.5">
          <button onClick={onBack}
            className="rounded-lg px-3.5 py-2 text-sm cursor-pointer font-arabic transition-all"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border:     '1px solid rgba(255,255,255,0.12)',
              color:      '#94a3b8',
            }}>
            ← رجوع
          </button>
          <div>
            <div className="text-base font-bold" style={{ color:'#f59e0b' }}>تحديد موضع الطباعة</div>
            <div className="text-[11px]" style={{ color:'#475569' }}>اسحب النص إلى المكان المطلوب</div>
          </div>
        </div>
        <button onClick={handlePrint}
          className="rounded-lg px-6 py-2.5 text-sm font-bold cursor-pointer border-none font-arabic"
          style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#0f172a' }}>
          🖨️ طباعة
        </button>
      </div>

      {/* شريط التحكم */}
      <div className="flex items-center justify-center gap-5 px-7 py-3"
        style={{
          background:   'rgba(0,0,0,0.3)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
        <div className="text-xs" style={{ color:'#64748b' }}>📌 اسحب الجملة إلى المكان الصحيح</div>
        <div className="flex items-center gap-2.5 rounded-lg px-3.5 py-1.5"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border:     '1px solid rgba(255,255,255,0.1)',
          }}>
          <span className="text-xs" style={{ color:'#94a3b8' }}>حجم الخط:</span>
          {[['−', -1], ['＋', +1]].map(([lbl, delta]) => (
            <button key={lbl}
              onClick={() => setFontSize(s => Math.max(8, Math.min(36, s + delta)))}
              className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer text-base font-bold transition-all"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border:     '1px solid rgba(255,255,255,0.1)',
                color:      '#f1f5f9',
              }}>
              {lbl}
            </button>
          ))}
          <span className="font-bold text-sm min-w-[30px] text-center" style={{ color:'#f59e0b' }}>{fontSize}</span>
          <input type="range" min="8" max="36" value={fontSize}
            onChange={e => setFontSize(Number(e.target.value))}
            className="w-24 cursor-pointer"
            style={{ accentColor:'#f59e0b' }} />
        </div>
      </div>

      {/* منطقة الورقة */}
      <div className="flex-1 flex justify-center items-start overflow-y-auto px-5 pb-5">
        <div
          ref={pageRef}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          className="relative select-none"
          style={{
            width:'210mm', minHeight:'297mm',
            background:'#fff',
            boxShadow:'0 8px 40px rgba(0,0,0,0.5)',
            cursor: dragging ? 'grabbing' : 'default',
            border:'1px solid rgba(255,255,255,0.1)',
          }}>

          <div
            onMouseDown={onMouseDown}
            className="absolute font-arabic font-semibold whitespace-nowrap rounded-md px-3 py-1.5 transition-shadow"
            style={{
              left:       `${pos.x}%`,
              top:        `${pos.y}%`,
              cursor:     dragging ? 'grabbing' : 'grab',
              fontSize:   `${fontSize}pt`,
              color:      '#000',
              background: 'rgba(245,158,11,0.15)',
              border:     '2px dashed rgba(245,158,11,0.6)',
              zIndex:     10,
              direction:  'rtl',
              boxShadow:  dragging ? '0 4px 20px rgba(245,158,11,0.4)' : 'none',
            }}>
            {sentence}
          </div>

          <div className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 37px,rgba(0,0,0,0.03) 37px,rgba(0,0,0,0.03) 38px)',
            }} />
        </div>
      </div>

      <div className="text-center py-2 text-[11px]" style={{ color:'#475569' }}>
        الموضع: يسار {Math.round(pos.x)}% · أعلى {Math.round(pos.y)}%
      </div>
    </div>
  );
}

// ── صفحة المعاملة الرئيسية ──────────────────────────────
export default function Transaction({ user, onLogout, theme, toggleTheme }) {
  const navigate = useNavigate();
  const T        = theme;
  const [form, setForm]         = useState({ details:'', amount:'', bab:'', creditDate:'' });
  const [error, setError]       = useState('');
  const [saved, setSaved]       = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [babAllocsMap, setBabAllocsMap] = useState({});
  const [allocation, setAllocation]     = useState(null);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      const { getBabAllocations } = await import('../store/db.js');
      const [allocs, bm] = await Promise.all([getAllocations(), getBabAllocations(user.source)]);
      setAllocation(allocs.find(a => a.source === user.source) || null);
      setBabAllocsMap(bm);
    })();
  }, []);

  if (showPrint) {
    return <PrintPositioner bab={form.bab} onBack={() => setShowPrint(false)} />;
  }

  const handleSave = async () => {
    if (!form.details)   { setError('يرجى إدخال التفاصيل'); return; }
    if (!form.amount || isNaN(Number(form.amount))) { setError('يرجى إدخال مبلغ صحيح'); return; }
    if (!form.bab)       { setError('يرجى اختيار باب الصرف'); return; }
    if (!form.creditDate){ setError('يرجى إدخال تاريخ توفر الاعتماد'); return; }

    if (allocation && allocation.total > 0 && (Number(allocation.spent) + Number(form.amount)) > Number(allocation.total)) {
      setError('⚠️ المبلغ يتجاوز التخصيص الكلي المتبقي!'); return;
    }
    const babAlloc = babAllocsMap[`${user.source}__${form.bab}`] || { total: 0, spent: 0 };
    if (babAlloc.total > 0) {
      const babRem = Number(babAlloc.total) - Number(babAlloc.spent);
      if (Number(form.amount) > babRem) {
        setError(`⚠️ المبلغ يتجاوز اعتماد فقرة "${form.bab}"! المتبقي: ${babRem.toLocaleString('en-US')} دينار`);
        return;
      }
    }

    const voucherData = {
      doc_no:     `TRX-${Date.now()}`,
      doc_date:   new Date().toLocaleDateString('en-US'),
      chk_amt:    form.amount,
      source:     user.source,
      details:    form.details,
      bab:        form.bab,
      created_by: user.name,
      type:       'voucher',
    };
    const savedV = await saveVoucher(voucherData);
    const entry  = generateJournalEntry(savedV);
    if (entry) await saveJournalEntry(entry);
    await addAuditLog({ user, action:'create', entity:'voucher', detail:`إضافة معاملة — ${form.details} · المبلغ: ${Number(form.amount).toLocaleString('en-US')} دينار` });
    setSaved(true);
  };

  // شاشة النجاح
  if (saved) return (
    <div className="min-h-screen flex items-center justify-center font-arabic"
      style={{
        background: 'linear-gradient(135deg,#0f172a 0%,#1a2744 50%,#0f172a 100%)',
        direction: 'rtl',
      }}>
      <div className="text-center rounded-2xl px-10 py-12 w-[420px]"
        style={{
          background: 'rgba(10,15,30,0.97)',
          border:     '1px solid rgba(52,211,153,0.3)',
        }}>
        <div className="text-5xl mb-4">✅</div>
        <div className="text-xl font-bold mb-2" style={{ color:'#34d399' }}>تم حفظ المعاملة!</div>
        <div className="text-sm mb-7 leading-relaxed" style={{ color:'#64748b' }}>
          تم خصم <span className="font-bold" style={{ color:'#f59e0b' }}>
            {Number(form.amount).toLocaleString('en-US')}
          </span> دينار
          <br/>من تخصيص <span style={{ color:'#f59e0b' }}>{user.source}</span>
        </div>
        <button onClick={() => setShowPrint(true)}
          className="w-full rounded-lg py-3 text-sm font-bold cursor-pointer border-none mb-2.5 font-arabic"
          style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#0f172a' }}>
          🖨️ طباعة تأييد الاعتماد
        </button>
        <button onClick={() => navigate('/dashboard')}
          className="w-full rounded-lg py-3 text-sm cursor-pointer font-arabic"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border:     '1px solid rgba(255,255,255,0.1)',
            color:      '#94a3b8',
          }}>
          العودة للداشبورد
        </button>
      </div>
    </div>
  );

  return (
    <div className="page-bg flex font-arabic">
      <Sidebar user={user} theme={theme} toggleTheme={toggleTheme} onLogout={onLogout} />

      <div className="flex-1 overflow-auto">
        <div className="flex justify-center px-5 pt-[68px] pb-10">
          <div className="w-full max-w-[860px] rounded-2xl p-8"
            style={{
              background: 'rgba(10,15,30,0.97)',
              border:     '1px solid rgba(255,255,255,0.08)',
            }}>

            <div className="text-lg font-bold pb-2.5 mb-6"
              style={{
                color:        '#34d399',
                borderBottom: '1px solid rgba(52,211,153,0.2)',
              }}>
              📋 تفاصيل المعاملة
            </div>

            {/* التفاصيل */}
            <div className="mb-4">
              <div className="text-sm mb-1.5" style={{ color:'#94a3b8' }}>التفاصيل *</div>
              <textarea
                value={form.details}
                onChange={e => set('details')(e.target.value)}
                placeholder="أدخل تفاصيل المعاملة..."
                rows={3}
                className="textarea-field"
              />
            </div>

            {/* التاريخ + المبلغ */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <div className="text-sm mb-1.5" style={{ color:'#94a3b8' }}>تاريخ توفر الاعتماد *</div>
                <input type="date" value={form.creditDate}
                  onChange={e => set('creditDate')(e.target.value)}
                  className="input-field" />
              </div>
              <div>
                <div className="text-sm mb-1.5" style={{ color:'#94a3b8' }}>المبلغ (دينار) *</div>
                <input type="number" value={form.amount}
                  onChange={e => set('amount')(e.target.value)}
                  placeholder="0"
                  className="input-field text-center text-lg font-semibold" />
                {form.amount && !isNaN(Number(form.amount)) && (
                  <div className="text-[11px] text-center mt-1" style={{ color:'#64748b' }}>
                    {Number(form.amount).toLocaleString('en-US')} دينار
                  </div>
                )}
              </div>
            </div>

            {/* باب الصرف */}
            <div className="mb-6">
              <div className="text-sm mb-2" style={{ color:'#94a3b8' }}>باب الصرف *</div>
              <div className="grid grid-cols-4 gap-2">
                {getBabs(user.source).map(b => {
                  const ba  = babAllocsMap[`${user.source}__${b}`] || { total: 0, spent: 0 };
                  const rem = Number(ba.total) - Number(ba.spent);
                  const hasAlloc   = ba.total > 0;
                  const overBudget = hasAlloc && rem <= 0;
                  const isSelected = form.bab === b;
                  return (
                    <button key={b}
                      onClick={() => { set('bab')(b); setError(''); }}
                      className="rounded-lg px-3.5 py-2.5 cursor-pointer font-arabic text-sm font-semibold transition-all text-right"
                      style={{
                        background: isSelected  ? 'rgba(52,211,153,0.2)'
                                  : overBudget  ? 'rgba(239,68,68,0.05)'
                                  : 'rgba(255,255,255,0.04)',
                        border:     isSelected  ? '1px solid rgba(52,211,153,0.6)'
                                  : overBudget  ? '1px solid rgba(239,68,68,0.4)'
                                  : '1px solid rgba(255,255,255,0.08)',
                        color:      isSelected  ? '#34d399'
                                  : overBudget  ? '#fca5a5'
                                  : '#94a3b8',
                      }}>
                      <div>{b}</div>
                      {hasAlloc && (
                        <div className="text-[10px] mt-1 font-normal"
                          style={{
                            color: overBudget          ? '#fca5a5'
                                 : rem < ba.total*0.2  ? '#f59e0b'
                                 : '#64748b',
                          }}>
                          {overBudget ? '⚠️ تجاوز الاعتماد' : `متبقي: ${rem.toLocaleString('en-US')}`}
                        </div>
                      )}
                      {!hasAlloc && (
                        <div className="text-[10px] mt-1 font-normal" style={{ color:'#475569' }}>
                          غير محدد
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {form.bab && (
                <div className="mt-3 rounded-lg px-3.5 py-2.5"
                  style={{
                    background: 'rgba(245,158,11,0.08)',
                    border:     '1px solid rgba(245,158,11,0.2)',
                  }}>
                  <div className="text-xs mb-1" style={{ color:'#64748b' }}>معاينة جملة التأييد:</div>
                  <div className="text-sm font-semibold" style={{ color:'#f59e0b' }}>
                    نؤيد توفر الاعتماد على فقرة {form.bab}
                  </div>
                </div>
              )}
            </div>

            {/* خطأ */}
            {error && <div className="alert-error">{error}</div>}

            {/* حفظ */}
            <button onClick={handleSave}
              className="w-full rounded-lg py-3.5 text-sm font-bold cursor-pointer border-none font-arabic"
              style={{ background:'linear-gradient(135deg,#34d399,#10b981)', color:'#0f172a' }}>
              💾 حفظ المعاملة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
