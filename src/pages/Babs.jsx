import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar.jsx";
import { addAuditLog } from "../store/auditLog.js";
import {
  getBabAllocations, updateBabAllocation, getBabRequests,
  requestBabEdit, approveBabRequest, rejectBabRequest
} from "../store/db.js";
import { getBabs, fmt, getSC } from "../components/dashboard/constants.js";

const SOURCES = [
  { name:'برنامج تطوير المختبرات', icon:'🔬' },
  { name:'برنامج صيانة الاصناف',   icon:'🌱' },
  { name:'حملة الدعم',              icon:'🤝' },
];

export default function Babs({ user, onLogout, theme, toggleTheme }) {
  const isAdmin = user.role === 'admin';

  const [babAllocs,   setBabAllocs]   = useState({});
  const [editKey,     setEditKey]     = useState(null);
  const [editVal,     setEditVal]     = useState('');
  const [pendingReqs, setPendingReqs] = useState([]);
  const [rejectId,    setRejectId]    = useState(null);
  const [rejectNote,  setRejectNote]  = useState('');
  const [success,     setSuccess]     = useState('');

  const load = async () => {
    const [ba, reqs] = await Promise.all([getBabAllocations(), getBabRequests()]);
    setBabAllocs(ba);
    setPendingReqs(reqs);
  };
  useEffect(() => { load(); }, []);

  const getBa = (source, bab) => babAllocs[`${source}__${bab}`] || { total:0, spent:0 };

  const handleSave = async (source, bab) => {
    const val = Number(editVal);
    if (isNaN(val)) return;
    if (isAdmin) {
      await updateBabAllocation(source, bab, val);
      await addAuditLog({ user, action:'update', entity:'bab', detail:`تعديل اعتماد باب "${bab}" — ${source} — القيمة: ${val.toLocaleString('en-US')} دينار` });
      setSuccess('✅ تم الحفظ');
    } else {
      const ba = getBa(source, bab);
      await requestBabEdit({ source, bab, oldValue:ba.total, newValue:val, user:user.name });
      await addAuditLog({ user, action:'update', entity:'bab', detail:`طلب تعديل باب "${bab}" — ${source} — من ${ba.total} إلى ${val}` });
      setSuccess('✅ تم إرسال الطلب للأدمن');
    }
    setEditKey(null); setEditVal('');
    setTimeout(() => setSuccess(''), 2000);
    load();
  };

  const handleApprove = async (id) => { await approveBabRequest(id, user.name); load(); };
  const handleReject  = async ()    => {
    await rejectBabRequest(rejectId, user.name, rejectNote);
    setRejectId(null); setRejectNote('');
    load();
  };

  const visibleSources = isAdmin ? SOURCES : SOURCES.filter(s => s.name === user.source);
  const pendingCount   = pendingReqs.filter(r => r.status === 'pending').length;

  return (
    <div className="page-bg flex font-arabic">
      <Sidebar user={user} theme={theme} toggleTheme={toggleTheme} onLogout={onLogout} />

      <div className="flex-1 overflow-auto px-8 pt-[68px] pb-7">

        {/* رأس */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="text-xl font-bold" style={{ color:'var(--th-accent)' }}>📂 أبواب الصرف</div>
            <div className="text-xs mt-1" style={{ color:'var(--th-text-muted)' }}>
              {isAdmin ? 'جميع المصادر' : user.source}
            </div>
          </div>
          {isAdmin && pendingCount > 0 && (
            <div className="flex items-center gap-2.5 rounded-[10px] px-5 py-2.5"
              style={{
                background: 'rgba(245,158,11,0.15)',
                border:     '1px solid rgba(245,158,11,0.4)',
              }}>
              <span className="text-sm font-bold" style={{ color:'#f59e0b' }}>
                ⏳ {pendingCount} طلب تعديل بانتظار الموافقة
              </span>
            </div>
          )}
        </div>

        {/* نجاح */}
        {success && <div className="alert-success">{success}</div>}

        {/* طلبات الأدمن */}
        {isAdmin && pendingCount > 0 && (
          <div className="rounded-[14px] p-5 mb-7"
            style={{
              background: 'var(--th-card-bg)',
              border:     '1px solid rgba(245,158,11,0.3)',
            }}>
            <div className="text-sm font-bold mb-4" style={{ color:'#f59e0b' }}>
              ⏳ طلبات تعديل بانتظار الموافقة
            </div>
            <div className="flex flex-col gap-2.5">
              {pendingReqs.filter(r => r.status==='pending').map(r => (
                <div key={r.id} className="flex justify-between items-center rounded-[10px] px-4 py-3"
                  style={{
                    background: 'var(--th-surface-alt)',
                    border:     '1px solid var(--th-border)',
                  }}>
                  <div>
                    <div className="text-sm font-semibold" style={{ color:'var(--th-text)' }}>
                      {r.source} — {r.bab}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color:'var(--th-text-muted)' }}>
                      {fmt(r.oldValue)} ← <span className="font-bold" style={{ color:'#818cf8' }}>{fmt(r.newValue)}</span>
                      {' · '}{r.user}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(r.id)}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer font-arabic"
                      style={{
                        background: 'rgba(52,211,153,0.15)',
                        border:     '1px solid rgba(52,211,153,0.4)',
                        color:      '#34d399',
                      }}>✅ موافقة</button>
                    <button onClick={() => { setRejectId(r.id); setRejectNote(''); }}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer font-arabic"
                      style={{
                        background: 'rgba(239,68,68,0.1)',
                        border:     '1px solid rgba(239,68,68,0.3)',
                        color:      '#fca5a5',
                      }}>❌ رفض</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* المصادر */}
        <div className="flex flex-col gap-7">
          {visibleSources.map(src => {
            const sc   = getSC(src.name, theme.name);
            const babs = getBabs(src.name);
            return (
              <div key={src.name} className="rounded-2xl overflow-hidden"
                style={{
                  background: 'var(--th-card-bg)',
                  border:     `1px solid color-mix(in srgb, ${sc.color} 30%, transparent)`,
                }}>

                {/* رأس المصدر */}
                <div className="flex items-center gap-2.5 px-5 py-3.5"
                  style={{
                    background:  `color-mix(in srgb, ${sc.color} 12%, transparent)`,
                    borderBottom:`1px solid color-mix(in srgb, ${sc.color} 20%, transparent)`,
                  }}>
                  <div className="text-base font-bold" style={{ color:sc.color }}>{src.icon} {src.name}</div>
                  <span className="text-[11px]" style={{ color:'var(--th-text-muted)' }}>{babs.length} باب</span>
                </div>

                {/* شبكة الأبواب */}
                <div className="grid gap-3.5 p-4.5"
                  style={{ gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', padding:'18px' }}>
                  {babs.map(bab => {
                    const key    = `${src.name}__${bab}`;
                    const ba     = getBa(src.name, bab);
                    const rem    = ba.total - ba.spent;
                    const pct    = ba.total > 0 ? Math.min(100, Math.round((ba.spent/ba.total)*100)) : 0;
                    const isEdit = editKey === key;
                    const barColor = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : sc.color;

                    return (
                      <div key={bab} className="rounded-xl p-4 transition-all"
                        style={{
                          background: 'var(--th-surface-alt)',
                          border:     `1px solid ${isEdit ? sc.color : 'var(--th-border)'}`,
                        }}>

                        <div className="text-sm font-bold mb-2.5 leading-snug" style={{ color:sc.color }}>
                          {bab}
                        </div>

                        {/* شريط التقدم */}
                        <div className="progress-track mb-2.5">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width:      `${pct}%`,
                              background: ba.total === 0 ? '#334155' : barColor,
                            }} />
                        </div>

                        {/* الأرقام */}
                        <div className="grid grid-cols-3 gap-1.5 mb-3">
                          {[
                            ['الكلي',   ba.total>0 ? fmt(ba.total) : 'غير محدد', 'var(--th-text-sub)'],
                            ['المصروف', fmt(ba.spent), '#f59e0b'],
                            ['المتبقي', ba.total>0 ? fmt(rem) : '—', rem<0?'#ef4444':sc.color],
                          ].map(([lbl, val, col]) => (
                            <div key={lbl} className="text-center rounded-md py-1.5"
                              style={{ background: 'var(--th-surface-alt)' }}>
                              <div className="text-[9px] mb-0.5" style={{ color:'var(--th-text-muted)' }}>{lbl}</div>
                              <div className="text-[10px] font-bold" style={{ color:col }}>{val}</div>
                            </div>
                          ))}
                        </div>

                        {/* تعديل */}
                        {isEdit ? (
                          <div>
                            <input
                              type="number"
                              value={editVal}
                              autoFocus
                              onChange={e => setEditVal(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter')  handleSave(src.name, bab);
                                if (e.key === 'Escape') setEditKey(null);
                              }}
                              placeholder="المبلغ الجديد"
                              className="input-field text-center mb-2"
                            />
                            <div className="flex gap-1.5">
                              <button onClick={() => handleSave(src.name, bab)}
                                className="flex-1 py-1.5 rounded-md text-xs font-bold cursor-pointer font-arabic"
                                style={{
                                  background: `color-mix(in srgb, ${sc.color} 20%, transparent)`,
                                  border:     `1px solid color-mix(in srgb, ${sc.color} 50%, transparent)`,
                                  color:      sc.color,
                                }}>
                                {isAdmin ? '💾 حفظ' : '📤 إرسال'}
                              </button>
                              <button onClick={() => setEditKey(null)}
                                className="btn-close px-2.5">✕</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditKey(key); setEditVal(ba.total||''); }}
                            className="w-full py-1.5 rounded-md text-xs font-semibold cursor-pointer font-arabic transition-all"
                            style={{
                              background: `color-mix(in srgb, ${sc.color} 12%, transparent)`,
                              border:     `1px solid color-mix(in srgb, ${sc.color} 30%, transparent)`,
                              color:      sc.color,
                            }}>
                            ✏️ {isAdmin ? 'تعديل' : 'طلب تعديل'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal رفض */}
      {rejectId && (
        <div className="modal-overlay" onClick={() => setRejectId(null)}>
          <div className="modal-card w-[400px] p-6 font-arabic" onClick={e => e.stopPropagation()}>
            <div className="text-sm font-bold mb-3.5" style={{ color:'#fca5a5' }}>❌ سبب الرفض</div>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="سبب الرفض (اختياري)..."
              rows={3}
              className="textarea-field mb-3.5"
            />
            <div className="flex gap-2.5">
              <button onClick={() => setRejectId(null)} className="btn-secondary flex-1 py-2.5 rounded-lg">
                إلغاء
              </button>
              <button onClick={handleReject}
                className="btn-danger flex-1 py-2.5 rounded-lg font-bold">
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
