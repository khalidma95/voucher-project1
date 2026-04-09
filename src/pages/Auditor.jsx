import { useState, useEffect } from "react";
import { getVouchers, setAuditStatus } from "../store/db.js";
import Sidebar from "../components/Sidebar.jsx";

const fmt = n => Number(n||0).toLocaleString('en-US');

const SOURCES = [
  { name:'برنامج تطوير المختبرات', color:'#f59e0b', icon:'🔬' },
  { name:'برنامج صيانة الاصناف',   color:'#34d399', icon:'🌱' },
  { name:'حملة الدعم',              color:'#60a5fa', icon:'🤝' },
];

export default function Auditor({ user, onLogout, theme, toggleTheme }) {
  const [vouchers, setVouchers] = useState([]);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');

  const load = async () => setVouchers(await getVouchers());
  useEffect(() => { load(); }, []);

  const handleAudit = async (id, status) => { await setAuditStatus(id, status, user.name); load(); };

  const auditedCount = vouchers.filter(v => v.audited === true).length;
  const pendingCount = vouchers.filter(v => !v.audited).length;

  const filterVouchers = (list) => list.filter(v => {
    const matchSearch = !search ||
      (v.details||'').includes(search) ||
      (v.bab||'').includes(search)     ||
      (v.docNo||'').includes(search);
    const matchFilter =
      filter === 'all'     ? true :
      filter === 'audited' ? v.audited === true :
      !v.audited;
    return matchSearch && matchFilter;
  }).slice().reverse();

  const VoucherTable = ({ list, color }) => (
    list.length === 0 ? (
      <div className="text-center py-7 text-sm font-arabic" style={{ color:'var(--th-text-muted)' }}>
        لا توجد معاملات
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm font-arabic">
          <thead>
            <tr style={{
              background:  `color-mix(in srgb, ${color} 15%, transparent)`,
              borderBottom:'1px solid var(--th-border)',
            }}>
              {['رقم المستند','التاريخ','التفاصيل','باب الصرف','المبلغ (IQD)','حالة التدقيق','إجراء'].map(h => (
                <th key={h} className="px-3.5 py-2.5 text-right text-xs font-semibold"
                  style={{ color }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((v, i) => {
              const isAudited = v.audited === true;
              return (
                <tr key={v.id} className={i%2===0 ? 'tr-even' : 'tr-odd'}
                  style={{ borderBottom:'1px solid var(--th-border)' }}>
                  <td className="px-3.5 py-2.5 text-[11px]" style={{ color:'var(--th-text-muted)' }}>
                    {v.docNo||'-'}
                  </td>
                  <td className="px-3.5 py-2.5" style={{ color:'var(--th-text-sub)' }}>{v.docDate||'-'}</td>
                  <td className="px-3.5 py-2.5 max-w-[200px]" style={{ color:'var(--th-text)' }}>
                    {v.details||'-'}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full"
                      style={{ background:`color-mix(in srgb, ${color} 15%, transparent)`, color }}>
                      {v.bab||'-'}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 font-bold" style={{ color:'var(--th-green)' }}>
                    {fmt(v.chkAmt)}
                  </td>
                  <td className="px-3.5 py-2.5">
                    {isAudited ? (
                      <div>
                        <span className="text-[11px] px-2.5 py-1 rounded-full font-bold inline-block"
                          style={{ background:'rgba(52,211,153,0.15)', color:'#34d399' }}>
                          ✅ تم التدقيق
                        </span>
                        <div className="text-[10px] mt-0.5" style={{ color:'var(--th-text-muted)' }}>
                          {v.auditorName}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] px-2.5 py-1 rounded-full font-bold"
                        style={{ background:'rgba(245,158,11,0.1)', color:'#f59e0b' }}>
                        ⏳ لم يُدقَّق
                      </span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex gap-1.5">
                      <button onClick={() => handleAudit(v.id, true)} disabled={isAudited}
                        className="px-3 py-1 rounded-md text-xs font-semibold font-arabic cursor-pointer transition-all"
                        style={{
                          background: isAudited ? 'rgba(52,211,153,0.05)' : 'rgba(52,211,153,0.15)',
                          border: `1px solid ${isAudited ? 'rgba(52,211,153,0.15)' : 'rgba(52,211,153,0.4)'}`,
                          color:  isAudited ? 'rgba(52,211,153,0.3)' : '#34d399',
                          opacity: isAudited ? 0.5 : 1,
                          cursor:  isAudited ? 'default' : 'pointer',
                        }}>نعم</button>
                      <button onClick={() => handleAudit(v.id, false)} disabled={!isAudited}
                        className="px-3 py-1 rounded-md text-xs font-semibold font-arabic cursor-pointer transition-all"
                        style={{
                          background: !isAudited ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.15)',
                          border: `1px solid ${!isAudited ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.4)'}`,
                          color:  !isAudited ? 'rgba(239,68,68,0.3)' : '#fca5a5',
                          opacity: !isAudited ? 0.5 : 1,
                          cursor:  !isAudited ? 'default' : 'pointer',
                        }}>لا</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )
  );

  return (
    <div className="page-bg flex font-arabic">
      <Sidebar user={user} theme={theme} toggleTheme={toggleTheme} onLogout={onLogout} />

      <div className="flex-1 overflow-auto">
        <div className="px-7 pt-[68px] pb-6">

          {/* إحصائيات */}
          <div className="flex gap-4 mb-6">
            {[
              { label:'إجمالي المعاملات', value:vouchers.length, color:'#60a5fa' },
              { label:'تم التدقيق',       value:auditedCount,    color:'#34d399' },
              { label:'بانتظار التدقيق',  value:pendingCount,    color:'#f59e0b' },
            ].map(s => (
              <div key={s.label}
                className="flex items-center gap-3.5 rounded-xl px-5 py-3.5"
                style={{
                  background: `color-mix(in srgb, ${s.color} 12%, transparent)`,
                  border:     `1px solid color-mix(in srgb, ${s.color} 40%, transparent)`,
                }}>
                <div className="text-2xl font-extrabold" style={{ color:s.color }}>{s.value}</div>
                <div className="text-xs" style={{ color:'var(--th-text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* بحث وفلتر */}
          <div className="flex gap-2.5 mb-6 items-center">
            <div className="flex-1 relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
                style={{ color:'var(--th-text-muted)' }}>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ابحث بالتفاصيل أو باب الصرف أو رقم المستند..."
                className="input-field pr-9"
              />
            </div>
            <div className="flex gap-1.5">
              {[['all','الكل'],['pending','⏳ بانتظار'],['audited','✅ مُدقَّق']].map(([id, label]) => {
                const active = filter === id;
                return (
                  <button key={id} onClick={() => setFilter(id)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer font-arabic transition-all"
                    style={{
                      background: active ? 'rgba(96,165,250,0.2)' : 'var(--th-surface-alt)',
                      border:     active ? '1px solid rgba(96,165,250,0.6)' : '1px solid var(--th-border)',
                      color:      active ? '#60a5fa' : 'var(--th-text-sub)',
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* المعاملات */}
          <div className="flex flex-col gap-6">
            {SOURCES.map(src => {
              const srcVouchers = filterVouchers(vouchers.filter(v => v.source === src.name));
              const srcTotal    = vouchers.filter(v => v.source === src.name);
              const srcAudited  = srcTotal.filter(v => v.audited === true).length;

              return (
                <div key={src.name} className="rounded-[14px] overflow-hidden"
                  style={{
                    border:     `1px solid color-mix(in srgb, ${src.color} 35%, transparent)`,
                    background: 'var(--th-card-bg)',
                  }}>
                  {/* رأس المصدر */}
                  <div className="flex justify-between items-center px-5 py-3.5"
                    style={{
                      background:  `color-mix(in srgb, ${src.color} 12%, transparent)`,
                      borderBottom:`1px solid color-mix(in srgb, ${src.color} 25%, transparent)`,
                    }}>
                    <div className="text-sm font-bold font-arabic" style={{ color:src.color }}>
                      {src.icon} {src.name}
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span style={{ color:'var(--th-text-muted)' }}>
                        الكل: <span className="font-bold" style={{ color:src.color }}>{srcTotal.length}</span>
                      </span>
                      <span style={{ color:'var(--th-text-muted)' }}>
                        مُدقَّق: <span className="font-bold" style={{ color:'#34d399' }}>{srcAudited}</span>
                      </span>
                      <span style={{ color:'var(--th-text-muted)' }}>
                        بانتظار: <span className="font-bold" style={{ color:'#f59e0b' }}>{srcTotal.length - srcAudited}</span>
                      </span>
                    </div>
                  </div>
                  <VoucherTable list={srcVouchers} color={src.color} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
