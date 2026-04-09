import { fmt, getBabs, getSC } from './constants.js';

export default function ModalBabs({ source, babAllocs, theme, onEditBab, onClose, canEdit=false }) {
  const sc = getSC(source, theme.name);
  return (
    <div className="modal-overlay" style={{ zIndex:9998, padding:20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="rounded-2xl w-[95%] max-w-[1100px] max-h-[90vh] overflow-auto font-arabic"
        style={{ background:'var(--th-modal-bg)', border:`1px solid ${sc.border}` }}>

        {/* رأس */}
        <div className="flex justify-between items-center px-6 py-[18px] rounded-t-2xl border-b border-th-border"
          style={{ background:sc.bg }}>
          <div className="text-base font-bold" style={{ color:sc.color }}>
            {sc.icon} {source} — أبواب الصرف
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center cursor-pointer text-base"
            style={{ background:'rgba(255,255,255,0.1)', border:'none', color:'var(--th-text)' }}>✕</button>
        </div>

        {/* الأبواب */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-5">
            {getBabs(source).map(bab => {
              const key = `${source}__${bab}`;
              const ba  = babAllocs[key] || { total:0, spent:0 };
              const rem = ba.total - ba.spent;
              const p   = ba.total > 0 ? Math.min(100, Math.round((ba.spent/ba.total)*100)) : 0;
              return (
                <div key={bab} className="rounded-xl p-5"
                  style={{ background:'var(--th-surface-alt)', border:`1px solid ${sc.border}` }}>
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-[15px] font-bold text-th-text">{bab}</div>
                    {canEdit && (
                      <button onClick={() => onEditBab({ source, bab, value:ba.total })}
                        className="px-2 py-0.5 rounded text-[11px] cursor-pointer font-arabic border border-th-border"
                        style={{ background:'var(--th-surface-alt)', color:'var(--th-text-muted)' }}>
                        ✏️ تعديل
                      </button>
                    )}
                  </div>
                  <div className="progress-track mb-4">
                    <div className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width:      `${p}%`,
                        background: ba.total===0 ? '#475569' : rem<0 ? 'var(--th-red)' : sc.color,
                      }}/>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      ['الكلي',   ba.total>0 ? fmt(ba.total) : 'غير محدد', 'var(--th-text-sub)'],
                      ['المصروف', fmt(ba.spent),                             'var(--th-red)'],
                      ['المتبقي', ba.total>0 ? fmt(rem) : '—',               rem<0 ? 'var(--th-red)' : sc.color],
                    ].map(([lbl,val,col]) => (
                      <div key={lbl} className="text-center rounded-lg p-[10px_6px]"
                        style={{ background:'rgba(0,0,0,0.15)' }}>
                        <div className="text-[11px] mb-1.5" style={{ color:'var(--th-text-muted)' }}>{lbl}</div>
                        <div className="text-[13px] font-bold" style={{ color:col }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
