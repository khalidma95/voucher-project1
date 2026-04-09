import { useState } from "react";
import { fmt, SOURCE_COLORS, getSC } from './constants.js';

export default function AdminVouchers({ vouchers, theme }) {
  const [search, setSearch] = useState('');

  const q = search.trim().toLowerCase();

  return (
    <div className="flex flex-col gap-6 font-arabic">

      {/* ── شريط البحث ── */}
      <div className="flex items-center gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 بحث بالتفاصيل، رقم المستند، باب الصرف..."
          className="input-field py-2 px-4 text-[15px] text-right flex-1"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="px-3 py-2 rounded-lg text-[14px] cursor-pointer btn-secondary">
            ✕
          </button>
        )}
      </div>

      {Object.entries(SOURCE_COLORS).map(([source]) => {
        const sc   = getSC(source, theme.name);
        const srcV = vouchers
          .filter(v => v.source === source)
          .filter(v => !q || (
            (v.docNo    || '').toLowerCase().includes(q) ||
            (v.details  || '').toLowerCase().includes(q) ||
            (v.bab      || '').toLowerCase().includes(q) ||
            (v.docDate  || '').includes(q)
          ));
        const srcTotal = srcV.reduce((s, v) => s + Number(v.chkAmt || 0), 0);

        // عند البحث أخفِ الأقسام الفارغة
        if (q && srcV.length === 0) return null;

        return (
          <div key={source} className="rounded-xl overflow-hidden"
            style={{
              background: 'var(--th-card-bg)',
              border:     `1px solid ${sc.border}`,
              boxShadow:  theme.name === 'light' ? '0 2px 12px rgba(0,0,0,0.08)' : 'none',
            }}>

            {/* رأس */}
            <div className="flex justify-between items-center px-5 py-3.5"
              style={{ background: sc.bg }}>
              <div className="text-[15px] font-bold" style={{ color: sc.color }}>{sc.icon} {source}</div>
              <div className="flex gap-5 text-xs">
                <span className="text-th-muted">عدد: <span className="font-bold" style={{ color: sc.color }}>{srcV.length}</span></span>
                <span className="text-th-muted">الإجمالي: <span className="font-bold" style={{ color: sc.color }}>{fmt(srcTotal)}</span></span>
              </div>
            </div>

            {srcV.length === 0 ? (
              <div className="text-center text-th-muted py-6 text-[13px]">لا توجد معاملات</div>
            ) : (
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-th-border">
                    {['رقم المستند', 'التاريخ', 'التفاصيل', 'باب الصرف', 'المبلغ', 'التدقيق'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-right text-xs font-semibold" style={{ color: sc.color }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {srcV.slice().reverse().map((v, i) => (
                    <tr key={v.id} className={i % 2 === 0 ? 'tr-even' : 'tr-odd'}
                      style={{ borderBottom: '1px solid var(--th-border)' }}>
                      <td className="px-4 py-2.5 text-[11px] text-th-sub">{v.docNo || '-'}</td>
                      <td className="px-4 py-2.5 text-th-sub">{v.docDate || '-'}</td>
                      <td className="px-4 py-2.5 text-th-text max-w-[240px]">
                        {q ? (
                          // تمييز نص البحث
                          <span dangerouslySetInnerHTML={{
                            __html: (v.details || '-').replace(
                              new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                              '<mark style="background:rgba(245,158,11,0.35);color:inherit;border-radius:2px">$1</mark>'
                            )
                          }}/>
                        ) : (v.details || '-')}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] text-th-sub"
                          style={{ background: 'var(--th-surface-alt)' }}>{v.bab || '-'}</span>
                      </td>
                      <td className="px-4 py-2.5 font-bold" style={{ color: sc.color }}>{fmt(v.chkAmt)}</td>
                      <td className="px-4 py-2.5">
                        {v.audited === true ? (
                          <div>
                            <span className="text-[11px] px-2 py-0.5 rounded-full font-bold inline-block"
                              style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>✅ مُدقَّق</span>
                            <div className="text-[10px] text-th-muted mt-0.5">{v.auditorName}</div>
                          </div>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>⏳ لم يُدقَّق</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2" style={{ borderColor: sc.border, background: sc.bg }}>
                    <td colSpan={5} className="px-4 py-2.5 font-bold text-right" style={{ color: sc.color }}>الإجمالي</td>
                    <td className="px-4 py-2.5 font-bold text-sm" style={{ color: sc.color }}>{fmt(srcTotal)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}
