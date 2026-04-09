import { useState, useEffect } from "react";
import { getAllTransfers, approveTransfer, rejectTransfer, deleteTransfer,
         getAllBabRequests, approveBabRequest, rejectBabRequest } from "../../store/db.js";
import { fmt } from "./constants.js";

const STATUS = {
  pending:  { label:'⏳ بانتظار الموافقة', color:'#f59e0b', bg:'rgba(245,158,11,0.12)' },
  approved: { label:'✅ تمت الموافقة',      color:'#34d399', bg:'rgba(52,211,153,0.12)' },
  rejected: { label:'❌ مرفوضة',            color:'#ef4444', bg:'rgba(239,68,68,0.12)'  },
};

export default function ModalApproveTransfer({ user, onClose, onSaved }) {
  const [transfers,  setTransfers]  = useState([]);
  const [babReqs,    setBabReqs]    = useState([]);
  const [tab,        setTab]        = useState('pending');
  const [rejectId,   setRejectId]   = useState(null);
  const [rejectNote, setRejectNote] = useState('');

  const load = async () => {
    const [t, b] = await Promise.all([getAllTransfers(), getAllBabRequests()]);
    setTransfers(t); setBabReqs(b);
  };
  useEffect(() => { load(); }, []);

  const pending      = transfers.filter(t => t.status === 'pending');
  const babPending   = babReqs.filter(r => r.status === 'pending');
  const totalPending = pending.length + babPending.length;
  const history      = transfers.filter(t => t.status !== 'pending');

  const handleApprove = async (id) => { await approveTransfer(id, user.name); await load(); onSaved && onSaved(); };
  const handleReject  = async () => {
    await rejectTransfer(rejectId, user.name, rejectNote);
    setRejectId(null); setRejectNote('');
    await load(); onSaved && onSaved();
  };
  const handleDelete = async (id) => {
    if (!confirm('حذف هذه المناقلة وعكسها؟')) return;
    await deleteTransfer(id); await load(); onSaved && onSaved();
  };

  const TransferCard = ({ t, showActions }) => {
    const st = STATUS[t.status] || STATUS.pending;
    return (
      <div className="rounded-xl p-[16px_18px] border font-arabic"
        style={{ background:'var(--th-surface-alt)', borderColor:`${st.color}30` }}>
        <div className="flex justify-between items-start mb-2.5">
          <div>
            <div className="text-base font-bold mb-1">
              <span style={{ color:'#ef4444' }}>{t.fromBab}</span>
              <span className="mx-2.5 text-xl" style={{ color:'#818cf8' }}>→</span>
              <span style={{ color:'#34d399' }}>{t.toBab}</span>
            </div>
            <div className="text-sm text-th-muted">{t.source} · {t.date} · طلب من: {t.user}</div>
          </div>
          <div className="text-left">
            <div className="text-lg font-bold mb-1" style={{ color:'#818cf8' }}>{fmt(t.amount)} IQD</div>
            <span className="text-sm px-2.5 py-0.5 rounded-full font-bold"
              style={{ background:st.bg, color:st.color }}>{st.label}</span>
          </div>
        </div>

        {t.note && (
          <div className="text-sm text-th-muted rounded-lg p-[8px_12px] mb-2.5"
            style={{ background:'rgba(0,0,0,0.15)' }}>📝 {t.note}</div>
        )}
        {t.status === 'rejected' && t.rejectNote && (
          <div className="text-sm rounded-lg p-[8px_12px] mb-2.5"
            style={{ color:'#fca5a5', background:'rgba(239,68,68,0.08)' }}>
            سبب الرفض: {t.rejectNote}
          </div>
        )}

        {showActions && t.status === 'pending' && (
          <div className="flex gap-2 mt-2">
            <button onClick={() => handleApprove(t.id)}
              className="flex-1 py-2.5 rounded-lg text-base font-bold cursor-pointer font-arabic"
              style={{ background:'rgba(52,211,153,0.15)', border:'1px solid rgba(52,211,153,0.4)', color:'#34d399' }}>
              ✅ موافقة
            </button>
            <button onClick={() => { setRejectId(t.id); setRejectNote(''); }}
              className="flex-1 py-2.5 rounded-lg text-base font-bold cursor-pointer font-arabic"
              style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.35)', color:'#fca5a5' }}>
              ❌ رفض
            </button>
          </div>
        )}
        {showActions && t.status === 'approved' && (
          <div className="flex justify-end mt-2">
            <button onClick={() => handleDelete(t.id)}
              className="px-4 py-2 rounded-lg text-xs cursor-pointer font-arabic"
              style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5' }}>
              🗑️ إلغاء وعكس
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="modal-overlay" style={{ background:'rgba(0,0,0,0.75)', padding:20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="modal-card w-full max-w-[660px] max-h-[90vh] flex flex-col font-arabic p-0">

        {/* رأس */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-th-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="text-xl font-bold" style={{ color:'#f59e0b' }}>🔄 طلبات المناقلة</div>
            {totalPending > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-sm font-bold"
                style={{ background:'rgba(245,158,11,0.2)', color:'#f59e0b' }}>
                {totalPending} طلب جديد
              </span>
            )}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-base border border-th-border text-th-muted"
            style={{ background:'rgba(255,255,255,0.06)' }}>✕</button>
        </div>

        {/* تبويبات */}
        <div className="flex border-b border-th-border flex-shrink-0">
          {[
            ['pending', `⏳ مناقلات (${pending.length})`],
            ['bab',     `📂 أبواب الصرف (${babPending.length})`],
            ['history', '📋 السجل'],
          ].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              className="px-5 py-2.5 border-none bg-transparent cursor-pointer text-base font-semibold font-arabic"
              style={{
                color:        tab===id ? '#f59e0b' : 'var(--th-text-muted)',
                borderBottom: tab===id ? '2px solid #f59e0b' : '2px solid transparent',
              }}>
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-6">

          {tab === 'pending' && (
            pending.length === 0 ? (
              <div className="text-center py-12 text-sm text-th-muted">لا توجد طلبات بانتظار الموافقة</div>
            ) : (
              <div className="flex flex-col gap-3">
                {pending.map(t => <TransferCard key={t.id} t={t} showActions={true}/>)}
              </div>
            )
          )}

          {tab === 'bab' && (
            babPending.length === 0 ? (
              <div className="text-center py-12 text-sm text-th-muted">لا توجد طلبات تعديل أبواب صرف</div>
            ) : (
              <div className="flex flex-col gap-3">
                {babPending.map(r => (
                  <div key={r.id} className="rounded-xl p-[16px_18px]"
                    style={{ background:'var(--th-surface-alt)', border:'1px solid rgba(129,140,248,0.3)' }}>
                    <div className="flex justify-between items-start mb-2.5">
                      <div>
                        <div className="text-base font-bold mb-1" style={{ color:'#818cf8' }}>
                          {r.bab === '__total__' ? '🏦 التخصيص الكلي' : `📂 ${r.bab}`}
                        </div>
                        <div className="text-sm text-th-muted">{r.source} · طلب من: {r.user}</div>
                      </div>
                      <div className="text-left">
                        <div className="text-sm text-th-muted mb-1">
                          {fmt(r.oldValue)} ← <span className="font-bold" style={{ color:'#818cf8' }}>{fmt(r.newValue)}</span>
                        </div>
                        <div className="text-sm"
                          style={{ color: r.newValue > r.oldValue ? '#34d399' : '#f59e0b' }}>
                          {r.newValue > r.oldValue
                            ? `▲ زيادة ${fmt(r.newValue - r.oldValue)}`
                            : `▼ تخفيض ${fmt(r.oldValue - r.newValue)}`} IQD
                        </div>
                      </div>
                    </div>
                    {r.note && (
                      <div className="text-sm text-th-muted rounded-lg p-[8px_12px] mb-2.5"
                        style={{ background:'rgba(0,0,0,0.15)' }}>📝 {r.note}</div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={async () => { await approveBabRequest(r.id, user.name); await load(); onSaved&&onSaved(); }}
                        className="flex-1 py-2.5 rounded-lg text-base font-bold cursor-pointer font-arabic"
                        style={{ background:'rgba(52,211,153,0.15)', border:'1px solid rgba(52,211,153,0.4)', color:'#34d399' }}>
                        ✅ موافقة
                      </button>
                      <button onClick={async () => { await rejectBabRequest(r.id, user.name, ''); await load(); onSaved&&onSaved(); }}
                        className="flex-1 py-2.5 rounded-lg text-base font-bold cursor-pointer font-arabic"
                        style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.35)', color:'#fca5a5' }}>
                        ❌ رفض
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'history' && (
            history.length === 0 ? (
              <div className="text-center py-12 text-sm text-th-muted">لا يوجد سجل بعد</div>
            ) : (
              <div className="flex flex-col gap-3">
                {history.slice().reverse().map(t => <TransferCard key={t.id} t={t} showActions={true}/>)}
              </div>
            )
          )}
        </div>
      </div>

      {/* Modal رفض */}
      {rejectId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50" style={{ zIndex:10000 }}
          onClick={() => setRejectId(null)}>
          <div onClick={e => e.stopPropagation()}
            className="modal-card w-[400px] p-6 font-arabic">
            <div className="text-lg font-bold mb-4" style={{ color:'#fca5a5' }}>❌ سبب الرفض</div>
            <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
              placeholder="أدخل سبب الرفض (اختياري)..." rows={3}
              className="textarea-field mb-4"/>
            <div className="flex gap-2.5">
              <button onClick={() => setRejectId(null)} className="btn-secondary flex-1 py-2.5 rounded-lg">إلغاء</button>
              <button onClick={handleReject} className="btn-danger flex-1 py-2.5 rounded-lg font-bold">تأكيد الرفض</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
