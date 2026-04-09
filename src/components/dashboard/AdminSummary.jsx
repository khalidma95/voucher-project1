import { fmt } from './constants.js';

export default function AdminSummary({ allocs }) {
  return (
    <div className="rounded-xl p-[20px_24px] border border-th-border font-arabic"
      style={{ background:'var(--th-card-bg)' }}>
      <div className="text-sm font-bold text-th-accent mb-4">📈 الملخص الإجمالي</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          ['إجمالي التخصيصات', allocs.reduce((s,a)=>s+a.total,0), 'var(--th-accent)'],
          ['إجمالي المصروف',   allocs.reduce((s,a)=>s+a.spent,0), 'var(--th-red)'],
          ['إجمالي المتبقي',   allocs.reduce((s,a)=>s+(a.total-a.spent),0), 'var(--th-green)'],
        ].map(([lbl,val,col]) => (
          <div key={lbl} className="text-center rounded-lg p-4" style={{ background:'rgba(0,0,0,0.1)' }}>
            <div className="text-[11px] text-th-muted mb-1.5">{lbl}</div>
            <div className="text-base font-bold" style={{ color:col }}>{fmt(val)}</div>
            <div className="text-[10px] text-th-muted mt-0.5">دينار</div>
          </div>
        ))}
      </div>
    </div>
  );
}
