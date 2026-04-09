import { useState, useEffect } from "react";
import { getBabAllocations, getTransfers, requestTransfer, cancelTransfer } from "../../store/db.js";
import { getBabs, fmt } from "./constants.js";

// ── Dropdown مخصص ──
function BabSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <div className="relative w-full">
      <div onClick={() => setOpen(p => !p)}
        className="rounded-lg px-3 py-2.5 cursor-pointer flex justify-between items-center select-none transition-all"
        style={{
          background:  'var(--th-input-bg)',
          border:      `1px solid ${open ? '#818cf8' : 'var(--th-input-border)'}`,
          color:       value ? 'var(--th-text)' : 'var(--th-text-muted)',
          fontSize:    13,
        }}>
        <span className="font-arabic">{selected ? selected.label : placeholder}</span>
        <span className="text-[10px] transition-transform duration-200" style={{ color:'#818cf8', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </div>
      {open && (
        <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-[9999] rounded-xl overflow-hidden"
          style={{
            background:  'var(--th-modal-bg)',
            border:      '1px solid rgba(129,140,248,0.4)',
            boxShadow:   '0 8px 32px rgba(0,0,0,0.4)',
          }}>
          {options.map(o => (
            <div key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
              className="px-4 py-2.5 cursor-pointer font-arabic border-b border-th-border"
              style={{
                background: value===o.value ? 'rgba(129,140,248,0.15)' : 'transparent',
                color:      value===o.value ? '#818cf8' : 'var(--th-text)',
                fontSize:   13,
                fontWeight: value===o.value ? 700 : 400,
              }}
              onMouseEnter={e => { if(value!==o.value) e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { if(value!==o.value) e.currentTarget.style.background='transparent'; }}>
              <div>{o.label}</div>
              {o.sub && <div className="text-[10px] mt-0.5" style={{ color: value===o.value ? '#818cf8' : 'var(--th-text-muted)' }}>{o.sub}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS = {
  pending:  { label:'⏳ بانتظار الموافقة', color:'#f59e0b', bg:'rgba(245,158,11,0.12)' },
  approved: { label:'✅ تمت الموافقة',      color:'#34d399', bg:'rgba(52,211,153,0.12)' },
  rejected: { label:'❌ مرفوضة',            color:'#ef4444', bg:'rgba(239,68,68,0.12)'  },
};

const emptyLine = () => ({ fromBab:'', toBab:'', amount:'' });

export default function ModalTransfer({ user, onClose, onSaved }) {
  const [tab,       setTab]       = useState('new');
  const [lines,     setLines]     = useState([emptyLine()]);
  const [date,      setDate]      = useState(new Date().toISOString().split('T')[0]);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const [babAllocs, setBabAllocs] = useState({});
  const [transfers, setTransfers] = useState([]);

  const load = async () => {
    const [ba, t] = await Promise.all([getBabAllocations(), getTransfers(user.source)]);
    setBabAllocs(ba); setTransfers(t);
  };
  useEffect(() => { load(); }, []);

  const getBab = bab => {
    const key = `${user.source}__${bab}`;
    const ba  = babAllocs[key] || { total:0, spent:0 };
    return { ...ba, rem: ba.total - ba.spent };
  };

  const pendingCount = transfers.filter(t => t.status === 'pending').length;

  const updateLine = (i, field, val) => {
    setLines(prev => prev.map((l, idx) => idx===i ? {...l, [field]:val} : l));
    setError('');
  };

  const addLine    = () => setLines(prev => [...prev, emptyLine()]);
  const removeLine = i  => setLines(prev => prev.filter((_,idx) => idx!==i));

  const handleRequest = async () => {
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.fromBab)  { setError(`السطر ${i+1}: اختر باب المناقلة منه`);  return; }
      if (!l.toBab)    { setError(`السطر ${i+1}: اختر باب المناقلة إليه`); return; }
      if (l.fromBab === l.toBab) { setError(`السطر ${i+1}: لا يمكن المناقلة لنفس الباب`); return; }
      if (!l.amount || Number(l.amount) <= 0) { setError(`السطر ${i+1}: أدخل مبلغاً صحيحاً`); return; }
      const from = getBab(l.fromBab);
      if (Number(l.amount) > from.total) {
        setError(`السطر ${i+1}: المبلغ يتجاوز اعتماد "${l.fromBab}" — المتاح: ${fmt(from.total)}`);
        return;
      }
    }

    for (const l of lines) {
      await requestTransfer({ source:user.source, fromBab:l.fromBab, toBab:l.toBab,
        amount:l.amount, note:'', date, user:user.name });
    }

    setLines([emptyLine()]); setError('');
    setSuccess(`✅ تم إرسال ${lines.length} طلب مناقلة — بانتظار موافقة الأدمن`);
    await load(); onSaved && onSaved();
    setTimeout(() => { setSuccess(''); setTab('history'); }, 1800);
  };

  const handleCancel = async (id) => {
    if (!confirm('هل تريد إلغاء هذا الطلب؟')) return;
    await cancelTransfer(id); await load(); onSaved && onSaved();
  };

  return (
    <div className="modal-overlay" style={{ padding:20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="modal-card w-full max-w-[860px] max-h-[92vh] min-h-[700px] flex flex-col p-0 font-arabic">

        {/* رأس */}
        <div className="flex justify-between items-center px-7 py-5 border-b border-th-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="text-lg font-bold" style={{ color:'#818cf8' }}>🔄 طلب مناقلة</div>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                style={{ background:'rgba(245,158,11,0.2)', color:'#f59e0b' }}>
                {pendingCount} بانتظار الموافقة
              </span>
            )}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-base border border-th-border text-th-muted"
            style={{ background:'rgba(255,255,255,0.06)' }}>✕</button>
        </div>

        {/* تبويبات */}
        <div className="flex border-b border-th-border flex-shrink-0">
          {[['new','➕ طلب جديد'],['history','📋 سجل الطلبات']].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              className="px-6 py-3 border-none bg-transparent cursor-pointer text-sm font-semibold font-arabic"
              style={{
                color:        tab===id ? '#818cf8' : 'var(--th-text-muted)',
                borderBottom: tab===id ? '2px solid #818cf8' : '2px solid transparent',
              }}>
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-6">

          {/* طلب جديد */}
          {tab === 'new' && (
            <div>
              {success && <div className="alert-success mb-4">{success}</div>}

              {/* رأس الأعمدة */}
              <div className="grid gap-2 mb-2 px-0.5" style={{ gridTemplateColumns:'1fr 40px 1fr 140px 36px' }}>
                <div className="text-[13px] text-th-muted text-right">من باب الصرف</div>
                <div/>
                <div className="text-[13px] text-th-muted text-right">إلى باب الصرف</div>
                <div className="text-[13px] text-th-muted text-center">المبلغ (دينار)</div>
                <div/>
              </div>

              {/* أسطر المناقلة */}
              <div className="flex flex-col gap-2.5 mb-4">
                {lines.map((l, i) => {
                  const fromBa = l.fromBab ? getBab(l.fromBab) : null;
                  const toBa   = l.toBab   ? getBab(l.toBab)   : null;
                  return (
                    <div key={i}>
                      <div className="grid gap-2 items-center"
                        style={{ gridTemplateColumns:'1fr 40px 1fr 140px 36px' }}>
                        <BabSelect
                          value={l.fromBab}
                          onChange={v => updateLine(i,'fromBab',v)}
                          placeholder="-- اختر --"
                          options={getBabs(user.source).map(b => ({
                            value:b, label:b,
                            sub: `${fmt(getBab(b).total)} كلي · ${fmt(getBab(b).rem)} متبقي`
                          }))}/>

                        <div className="text-center text-lg font-bold" style={{ color:'#818cf8' }}>→</div>

                        <BabSelect
                          value={l.toBab}
                          onChange={v => updateLine(i,'toBab',v)}
                          placeholder="-- اختر --"
                          options={getBabs(user.source).filter(b => b !== l.fromBab).map(b => ({
                            value:b, label:b,
                            sub: `${fmt(getBab(b).total)} كلي`
                          }))}/>

                        <input type="number" value={l.amount} placeholder="0"
                          onChange={e => updateLine(i,'amount',e.target.value)}
                          className="input-field text-center font-bold w-full"/>

                        {lines.length > 1 ? (
                          <button onClick={() => removeLine(i)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-sm"
                            style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5' }}>✕</button>
                        ) : <div/>}
                      </div>

                      {(l.fromBab || l.toBab) && (
                        <div className="grid gap-2 mt-1" style={{ gridTemplateColumns:'1fr 40px 1fr 140px 36px' }}>
                          <div className="text-[10px] text-th-muted pr-1">
                            {fromBa && <>
                              <span style={{ color:'#f59e0b' }}>{fmt(fromBa.total)}</span> كلي ·{' '}
                              <span style={{ color:'#34d399' }}>{fmt(fromBa.rem)}</span> متبقي
                            </>}
                          </div>
                          <div/>
                          <div className="text-[10px] text-th-muted pr-1">
                            {toBa && <><span style={{ color:'#818cf8' }}>{fmt(toBa.total)}</span> كلي حالياً</>}
                          </div>
                          <div className="text-[10px] text-th-muted text-center">
                            {l.amount && !isNaN(Number(l.amount)) && Number(l.amount)>0 &&
                              <span style={{ color:'#818cf8' }}>{fmt(l.amount)} IQD</span>}
                          </div>
                          <div/>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* زر إضافة سطر */}
              <button onClick={addLine}
                className="w-full py-3 rounded-lg text-sm font-semibold cursor-pointer font-arabic mb-4"
                style={{ background:'rgba(129,140,248,0.08)', border:'1px dashed rgba(129,140,248,0.4)', color:'#818cf8' }}>
                ＋ إضافة مناقلة أخرى
              </button>

              {/* التاريخ */}
              <div className="mb-4">
                <div className="field-label">تاريخ الطلب</div>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="input-field w-full"/>
              </div>

              {/* ملخص */}
              {lines.some(l => l.fromBab && l.toBab && Number(l.amount)>0) && (
                <div className="rounded-lg p-[12px_16px] mb-4"
                  style={{ background:'rgba(129,140,248,0.08)', border:'1px solid rgba(129,140,248,0.25)' }}>
                  <div className="text-sm font-bold mb-2" style={{ color:'#818cf8' }}>ملخص الطلب</div>
                  {lines.filter(l => l.fromBab && l.toBab && Number(l.amount)>0).map((l,i) => (
                    <div key={i} className="text-[13px] text-th-text mb-1">
                      {i+1}. نقل <span className="font-bold" style={{ color:'#f59e0b' }}>{fmt(l.amount)} IQD</span>
                      {' '}من <span className="font-bold" style={{ color:'#ef4444' }}>{l.fromBab}</span>
                      {' '}إلى <span className="font-bold" style={{ color:'#34d399' }}>{l.toBab}</span>
                    </div>
                  ))}
                  <div className="text-[11px] text-th-muted mt-2 border-t border-th-border pt-2">
                    ⚠️ سيتم تنفيذ المناقلات بعد موافقة الأدمن
                  </div>
                </div>
              )}

              {error && <div className="alert-error mb-4">{error}</div>}

              <div className="flex gap-2.5 mt-6">
                <button onClick={onClose} className="btn-secondary flex-1 py-4 rounded-lg font-bold text-[15px]">إلغاء</button>
                <button onClick={handleRequest}
                  className="flex-[2] py-4 rounded-lg text-[15px] font-bold cursor-pointer font-arabic"
                  style={{ background:'linear-gradient(135deg,#818cf8,#6366f1)', color:'#fff', border:'none' }}>
                  📤 إرسال {lines.length > 1 ? `${lines.length} طلبات` : 'الطلب'}
                </button>
              </div>
            </div>
          )}

          {/* سجل الطلبات */}
          {tab === 'history' && (
            transfers.length === 0 ? (
              <div className="text-center py-12 text-sm text-th-muted">لا توجد طلبات مناقلة</div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {transfers.slice().reverse().map(t => {
                  const st = STATUS[t.status] || STATUS.pending;
                  return (
                    <div key={t.id} className="rounded-lg p-[14px_16px]"
                      style={{ background:'var(--th-surface-alt)', border:`1px solid ${st.color}30` }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-[13px] font-bold text-th-text">
                            <span style={{ color:'#ef4444' }}>{t.fromBab}</span>
                            <span className="mx-2" style={{ color:'#818cf8' }}>→</span>
                            <span style={{ color:'#34d399' }}>{t.toBab}</span>
                          </div>
                          <div className="text-[11px] text-th-muted mt-0.5">{t.date} · {t.user}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-[13px] font-bold" style={{ color:'#818cf8' }}>{fmt(t.amount)} IQD</div>
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold"
                            style={{ background:st.bg, color:st.color }}>{st.label}</span>
                          {t.status === 'pending' && (
                            <button onClick={() => handleCancel(t.id)}
                              className="px-2.5 py-1 rounded text-[11px] cursor-pointer font-arabic"
                              style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5' }}>
                              إلغاء
                            </button>
                          )}
                        </div>
                      </div>
                      {t.status === 'rejected' && t.rejectNote && (
                        <div className="text-xs mt-1.5" style={{ color:'#fca5a5' }}>سبب الرفض: {t.rejectNote}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
