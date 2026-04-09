import { useState } from 'react';
import { fmt } from './constants.js';

export default function AccountantVouchers({ vouchers, onEdit, onDelete, onArchive, onViewArchive }) {
  const [search, setSearch] = useState('');

  const filtered = vouchers.slice().reverse().filter(v =>
    !search ||
    (v.details||'').includes(search) ||
    (v.bab||'').includes(search) ||
    (v.docNo||'').includes(search) ||
    (v.chkAmt||'').toString().includes(search)
  );

  return (
    <div className="font-arabic">
      {/* شريط البحث */}
      <div className="flex gap-3 items-center mb-4">
        <div className="flex-1 relative">
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base pointer-events-none">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ابحث بالتفاصيل أو باب الصرف أو رقم المستند..."
            className="input-field pr-10"/>
        </div>
        {search && (
          <button onClick={() => setSearch('')}
            className="px-4 py-2.5 rounded-lg text-xs cursor-pointer font-arabic border border-th-border text-th-muted"
            style={{ background:'var(--th-surface-alt)' }}>
            ✕ مسح
          </button>
        )}
      </div>

      {/* عداد */}
      <div className="text-sm text-th-muted mb-4">
        {search
          ? <span>نتائج البحث: <span className="font-bold text-th-accent">{filtered.length}</span> من {vouchers.length}</span>
          : <span>إجمالي المعاملات: <span className="font-bold text-th-accent">{vouchers.length}</span></span>
        }
      </div>

      {/* الجدول */}
      {filtered.length === 0 ? (
        <div className="text-center text-th-muted py-[60px] text-sm">
          {search ? `لا توجد نتائج لـ "${search}"` : 'لا توجد معاملات بعد'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-th-border"
                style={{ background:'color-mix(in srgb, var(--th-accent) 10%, transparent)' }}>
                {['رقم المستند','التاريخ','التفاصيل','باب الصرف','المبلغ','التدقيق','أرشفة','الإجراءات'].map(h => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-th-accent">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v,i) => (
                <tr key={v.id} className={i%2===0 ? 'tr-even' : 'tr-odd'}
                  style={{ borderBottom:'1px solid var(--th-border)' }}>
                  <td className="px-4 py-3 text-th-sub text-[11px]">{v.docNo||'-'}</td>
                  <td className="px-4 py-3 text-th-sub">{v.docDate||'-'}</td>
                  <td className="px-4 py-3 text-th-text max-w-[200px]">{v.details||'-'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] text-th-sub"
                      style={{ background:'var(--th-surface-alt)' }}>{v.bab||'-'}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-th-green">{fmt(v.chkAmt)}</td>
                  <td className="px-4 py-3">
                    {v.audited === true ? (
                      <div>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold inline-block"
                          style={{ background:'rgba(52,211,153,0.15)', color:'#34d399' }}>✅ مُدقَّق</span>
                        <div className="text-[10px] text-th-muted mt-0.5">{v.auditorName}</div>
                      </div>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full"
                        style={{ background:'rgba(245,158,11,0.1)', color:'#f59e0b' }}>⏳ لم يُدقَّق</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {v.archiveImg ? (
                      <span title="تم الأرشفة - اضغط للعرض"
                        onClick={() => onViewArchive(v)}
                        className="cursor-pointer text-xl">📎</span>
                    ) : (
                      <button onClick={() => onArchive(v)}
                        className="px-2.5 py-1 rounded text-[11px] cursor-pointer font-arabic"
                        style={{ background:'rgba(96,165,250,0.15)', border:'1px solid rgba(96,165,250,0.3)', color:'#60a5fa' }}>
                        📷 أرشفة
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => onEdit(v)}
                        className="px-2.5 py-1 rounded text-xs cursor-pointer font-arabic"
                        style={{ background:'color-mix(in srgb, var(--th-accent) 15%, transparent)', border:'1px solid color-mix(in srgb, var(--th-accent) 40%, transparent)', color:'var(--th-accent)' }}>
                        ✏️ تعديل
                      </button>
                      <button onClick={() => onDelete(v.id)}
                        className="px-2.5 py-1 rounded text-xs cursor-pointer font-arabic"
                        style={{ background:'color-mix(in srgb, var(--th-red) 15%, transparent)', border:'1px solid color-mix(in srgb, var(--th-red) 40%, transparent)', color:'var(--th-red-text)' }}>
                        🗑️ حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
