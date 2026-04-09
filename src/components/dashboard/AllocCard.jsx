import { fmt, getSC } from './constants.js';

export default function AllocCard({ a, theme, onEditAlloc, onExpandBabs, user }) {
  const sc  = getSC(a.source, theme.name);
  const p   = a.total > 0 ? Math.min(100, Math.round((a.spent/a.total)*100)) : 0;
  const rem = a.total - a.spent;

  return (
    <div className="rounded-xl"
      style={{
        background:  sc.bg,
        border:      `1px solid ${sc.border}`,
        boxShadow:   theme.name==='light' ? '0 2px 12px rgba(0,0,0,0.08)' : 'none',
        transition:  'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-5px)'; e.currentTarget.style.boxShadow=`0 14px 30px ${sc.border}`; }}
      onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)';    e.currentTarget.style.boxShadow=theme.name==='light'?'0 2px 12px rgba(0,0,0,0.08)':'none'; }}>
      <div className="p-[20px_22px]">

        {/* رأس البطاقة */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-[11px] mb-1" style={{ color:'var(--th-text-muted)' }}>مصدر التمويل</div>
            <div className="text-[15px] font-bold" style={{ color:sc.color }}>
              {sc.icon} {a.source}
              {user.role === 'admin' && (
                <button onClick={() => onExpandBabs(a.source)}
                  className="bg-transparent border-none text-[11px] cursor-pointer font-arabic mr-2"
                  style={{ color:'var(--th-text-muted)' }}>
                  📂 أبواب الصرف
                </button>
              )}
            </div>
          </div>
          {user.role === 'admin' && (
            <button onClick={() => onEditAlloc({ source:a.source, value:a.total })}
              className="rounded px-2.5 py-1.5 text-[11px] cursor-pointer font-arabic border border-th-border"
              style={{ background:'var(--th-surface-alt)', color:'var(--th-text-sub)' }}>
              ✏️ تعديل التخصيص
            </button>
          )}
        </div>

        {/* شريط التقدم */}
        <div className="progress-track mb-3">
          <div className="h-full rounded-full transition-[width] duration-500"
            style={{ width:`${p}%`, background:sc.color }}/>
        </div>

        {/* الأرقام */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {[
            ['الإجمالي', fmt(a.total),   'var(--th-text-sub)'],
            ['المصروف',  fmt(a.spent),   'var(--th-red)'],
            ['المتبقي',  fmt(rem),        rem < 0 ? 'var(--th-red)' : sc.color],
          ].map(([lbl,val,col]) => (
            <div key={lbl} className="rounded-lg p-[8px_10px] text-center"
              style={{ background:'rgba(0,0,0,0.18)' }}>
              <div className="text-[10px] mb-0.5" style={{ color:'var(--th-text-muted)' }}>{lbl}</div>
              <div className="text-xs font-bold" style={{ color:col }}>{val}</div>
            </div>
          ))}
        </div>
        <div className="text-left mt-2 text-[11px]" style={{ color:'var(--th-text-muted)' }}>{p}% مصروف</div>
      </div>
    </div>
  );
}
