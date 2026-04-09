import { useState, useEffect } from "react";
import { getTransfers, getBabRequests } from "../../store/db.js";
import { fmt } from "./constants.js";

const STATUS = {
  pending:  { label:'⏳ بانتظار',   color:'#f59e0b', bg:'rgba(245,158,11,0.12)' },
  approved: { label:'✅ مُنفَّذة',   color:'#34d399', bg:'rgba(52,211,153,0.12)' },
  rejected: { label:'❌ مرفوضة',    color:'#ef4444', bg:'rgba(239,68,68,0.12)'  },
};

export default function TransferHistory({ user, theme }) {
  const [tab,       setTab]       = useState('transfers');
  const [transfers, setTransfers] = useState([]);
  const [babReqs,   setBabReqs]   = useState([]);

  useEffect(() => {
    Promise.all([getTransfers(user.source), getBabRequests(user.source)]).then(([t, b]) => {
      setTransfers(t); setBabReqs(b);
    });
  }, []);

  return (
    <div className="font-arabic" style={{ direction:'rtl' }}>

      {/* تبويبات */}
      <div className="flex gap-1 border-b border-th-border mb-5">
        {[
          ['transfers', `🔄 سجل المناقلات (${transfers.length})`],
          ['bab',       `📂 طلبات أبواب الصرف (${babReqs.length})`],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className="px-5 py-2.5 border-none bg-transparent cursor-pointer text-[13px] font-semibold font-arabic"
            style={{
              color:        tab===id ? 'var(--th-accent)' : 'var(--th-text-muted)',
              borderBottom: tab===id ? '2px solid var(--th-accent)' : '2px solid transparent',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* سجل المناقلات */}
      {tab === 'transfers' && (
        transfers.length === 0 ? (
          <div className="text-center py-[60px] text-sm text-th-muted">لا توجد مناقلات بعد</div>
        ) : (
          <div className="rounded-[14px] overflow-hidden border border-th-border" style={{ background:'var(--th-card-bg)' }}>
            <table className="w-full border-collapse text-[13px] font-arabic">
              <thead>
                <tr className="border-b border-th-border" style={{ background:'var(--th-surface-alt)' }}>
                  {['التاريخ','من','إلى','المبلغ (IQD)','الحالة','بواسطة'].map(h => (
                    <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-th-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transfers.slice().reverse().map((t, i) => {
                  const st = STATUS[t.status] || STATUS.pending;
                  return (
                    <tr key={t.id} className={i%2===0 ? 'tr-even' : 'tr-odd'}
                      style={{ borderBottom:'1px solid var(--th-border)' }}>
                      <td className="px-4 py-2.5 text-th-sub">{t.date}</td>
                      <td className="px-4 py-2.5 font-semibold" style={{ color:'#ef4444' }}>{t.fromBab}</td>
                      <td className="px-4 py-2.5 font-semibold" style={{ color:'#34d399' }}>{t.toBab}</td>
                      <td className="px-4 py-2.5 font-bold" style={{ color:'#818cf8' }}>{fmt(t.amount)}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold"
                          style={{ background:st.bg, color:st.color }}>{st.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-th-muted text-[11px]">{t.approvedBy || t.user}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* طلبات أبواب الصرف */}
      {tab === 'bab' && (
        babReqs.length === 0 ? (
          <div className="text-center py-[60px] text-sm text-th-muted">لا توجد طلبات تعديل أبواب صرف</div>
        ) : (
          <div className="rounded-[14px] overflow-hidden border border-th-border" style={{ background:'var(--th-card-bg)' }}>
            <table className="w-full border-collapse text-[13px] font-arabic">
              <thead>
                <tr className="border-b border-th-border" style={{ background:'var(--th-surface-alt)' }}>
                  {['باب الصرف','من','إلى','الفرق','الحالة','المراجع'].map(h => (
                    <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-th-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {babReqs.slice().reverse().map((r, i) => {
                  const st   = STATUS[r.status] || STATUS.pending;
                  const diff = r.newValue - r.oldValue;
                  return (
                    <tr key={r.id} className={i%2===0 ? 'tr-even' : 'tr-odd'}
                      style={{ borderBottom:'1px solid var(--th-border)' }}>
                      <td className="px-4 py-2.5 font-semibold" style={{ color:'#818cf8' }}>{r.bab}</td>
                      <td className="px-4 py-2.5 text-th-sub">{fmt(r.oldValue)}</td>
                      <td className="px-4 py-2.5 font-bold" style={{ color:'#818cf8' }}>{fmt(r.newValue)}</td>
                      <td className="px-4 py-2.5 font-bold"
                        style={{ color: diff >= 0 ? '#34d399' : '#f59e0b' }}>
                        {diff >= 0 ? '▲' : '▼'} {fmt(Math.abs(diff))}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold"
                          style={{ background:st.bg, color:st.color }}>{st.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-th-muted text-[11px]">{r.approvedBy || r.rejectedBy || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
