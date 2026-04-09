import { useState, useMemo, useEffect, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";
import { fmt, getSC } from "./constants.js";

// ── Count-up hook ──
function useCountUp(target, duration = 1100) {
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const n = Number(target) || 0;
    if (n === 0) { setVal(0); return; }
    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(ease * n));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return val;
}
import ModalTransfer from "./ModalTransfer.jsx";
import TransferHistory from "./TransferHistory.jsx";

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

// ── بطاقة إحصائية ──
function StatCard({ label, rawValue, sub, color, icon, isMoney = true }) {
  const counted = useCountUp(rawValue);
  const display = isMoney ? fmt(counted) : counted.toLocaleString('en-US');
  return (
    <div className="rounded-2xl p-[22px_24px] relative"
      style={{
        background: `linear-gradient(135deg,${color}18,${color}06)`,
        border:     `1px solid ${color}30`,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor:     'default',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-5px)'; e.currentTarget.style.boxShadow=`0 12px 28px ${color}30`; }}
      onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)';    e.currentTarget.style.boxShadow='none'; }}>
      <div className="absolute -top-7 -right-7 w-24 h-24 rounded-full pointer-events-none"
        style={{ background:`${color}15`, filter:'blur(30px)' }}/>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-3"
        style={{ background:`${color}20`, border:`1px solid ${color}30` }}>
        {icon}
      </div>
      <div className="text-[26px] font-extrabold tracking-tight font-arabic" style={{ color }}>{display}</div>
      <div className="text-sm text-th-muted font-arabic mt-1">{label}</div>
      {sub && <div className="text-xs font-arabic mt-0.5" style={{ color:'var(--th-text-muted)' }}>{sub}</div>}
    </div>
  );
}

// ── Tooltip مخصص ──
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-[10px_16px] font-arabic" style={{ direction:'rtl',
      background:'rgba(10,14,35,0.97)', border:'1px solid rgba(255,255,255,0.08)' }}>
      <div className="text-[11px] mb-1.5" style={{ color:'rgba(255,255,255,0.5)' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="text-xs font-bold" style={{ color:p.color }}>
          {p.name}: {Number(p.value).toLocaleString('en-US')} IQD
        </div>
      ))}
    </div>
  );
}

// ── بطاقة قسم ──
function Card({ children, title }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-th-border" style={{ background:'var(--th-card-bg)' }}>
      {title && (
        <div className="px-5 py-3.5 border-b border-th-border">
          <div className="text-base font-bold text-th-text font-arabic">{title}</div>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function AccountantDashboard({ user, allocs, vouchers, theme, onEditAlloc }) {
  const sc = getSC(user.source, theme.name);
  const COLOR = sc.color;

  const [showTransfer, setShowTransfer] = useState(false);
  const [activeTab,    setActiveTab]    = useState('dashboard');

  const alloc  = allocs.find(a => a.source === user.source) || { total:0, spent:0 };
  const rem    = alloc.total - alloc.spent;
  const pct    = alloc.total > 0 ? Math.min(100, Math.round((alloc.spent/alloc.total)*100)) : 0;
  const recent = vouchers.slice().reverse().slice(0, 6);

  const monthlyData = useMemo(() => {
    const now  = new Date();
    const data = Array.from({ length:6 }, (_, i) => {
      const month = (now.getMonth() - 5 + i + 12) % 12;
      return { name:MONTHS[month], مصروف:0 };
    });
    vouchers.forEach(v => {
      if (!v.docDate) return;
      const d    = new Date(v.docDate);
      const diff = now.getMonth() - d.getMonth() + (now.getFullYear() - d.getFullYear()) * 12;
      if (diff < 0 || diff > 5) return;
      data[5 - diff].مصروف += Number(v.chkAmt || 0);
    });
    return data;
  }, [vouchers]);

  return (
    <div className="font-arabic" style={{ direction:'rtl' }}>

      {/* ترحيب */}
      <div className="mb-1.5 p-[16px_20px] rounded-2xl"
        style={{ background:`linear-gradient(135deg,${COLOR}20,${COLOR}08)`, border:`1px solid ${COLOR}30` }}>
        <div className="text-[22px] font-bold font-arabic" style={{ color:COLOR }}>👋 مرحباً {user.name}</div>
        <div className="text-sm text-th-muted mt-1 font-arabic">{user.source} · {new Date().toLocaleDateString('ar-IQ')}</div>
      </div>

      {/* تبويبات */}
      <div className="flex gap-1 border-b border-th-border mb-5">
        {[['dashboard','📊 الإحصائيات'],['history','📋 سجل المناقلات']].map(([id,label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className="px-5 py-2.5 border-none bg-transparent cursor-pointer text-[13px] font-semibold font-arabic"
            style={{
              color:        activeTab===id ? 'var(--th-accent)' : 'var(--th-text-muted)',
              borderBottom: activeTab===id ? '2px solid var(--th-accent)' : '2px solid transparent',
            }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'history' && <TransferHistory user={user} theme={theme}/>}

      {activeTab === 'dashboard' && (
        <div>
          {/* أزرار */}
          <div className="flex gap-2.5 mb-4">
            <button onClick={() => onEditAlloc && onEditAlloc({ source:user.source, value:alloc.total })}
              className="px-5 py-2.5 rounded-lg text-[13px] font-bold cursor-pointer font-arabic"
              style={{ background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)', color:'#f59e0b' }}>
              ✏️ تعديل التخصيص الكلي
            </button>
            <button onClick={() => setShowTransfer(true)}
              className="px-5 py-2.5 rounded-lg text-[13px] font-bold cursor-pointer font-arabic"
              style={{ background:'rgba(129,140,248,0.15)', border:'1px solid rgba(129,140,248,0.3)', color:'#818cf8' }}>
              🔄 مناقلة
            </button>
          </div>

          {/* بطاقات إحصائية */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2.5">
            <StatCard icon="🏦" label="إجمالي التخصيص"  rawValue={alloc.total}    sub="دينار عراقي"             color={COLOR}/>
            <StatCard icon="📤" label="إجمالي المصروف"  rawValue={alloc.spent}    sub={`${pct}% من الإجمالي`}  color="#f59e0b"/>
            <StatCard icon="💰" label="المتبقي"          rawValue={rem}            sub={`${100-pct}% متبقي`}    color={rem<0?'#ef4444':'#34d399'}/>
            <StatCard icon="📋" label="عدد المعاملات"   rawValue={vouchers.length} sub="معاملة مدخلة"          color="#818cf8" isMoney={false}/>
          </div>

          {/* الرسم البياني + آخر المعاملات */}
          <div className="grid gap-4" style={{ gridTemplateColumns:'1fr 360px' }}>
            <Card title="📈 الصرف الشهري — آخر 6 أشهر">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyData} margin={{ top:5, right:5, left:0, bottom:0 }}>
                  <defs>
                    <linearGradient id="acGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={COLOR} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLOR} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--th-border)"/>
                  <XAxis dataKey="name" tick={{ fill:'var(--th-text-muted)', fontSize:11 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill:'var(--th-text-muted)', fontSize:10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => v>=1e9?`${(v/1e9).toFixed(1)}B`:v>=1e6?`${(v/1e6).toFixed(0)}M`:`${(v/1e3).toFixed(0)}K`}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Area type="monotone" dataKey="مصروف" stroke={COLOR} strokeWidth={2.5} fill="url(#acGrad)" dot={{ fill:COLOR, r:3 }}/>
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card title="🕐 آخر المعاملات">
              {recent.length === 0 ? (
                <div className="text-center py-8 text-[13px] text-th-muted font-arabic">لا توجد معاملات بعد</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {recent.map(v => (
                    <div key={v.id} className="flex justify-between items-center p-[9px_12px] rounded-xl"
                      style={{
                        background:   'var(--th-surface-alt)',
                        borderRight:  `3px solid ${COLOR}`,
                      }}>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-th-text font-arabic truncate max-w-[160px]">
                          {v.details || '-'}
                        </div>
                        <div className="text-[10px] text-th-muted mt-0.5 font-arabic">
                          {v.docDate} · <span style={{ color:COLOR }}>{v.bab || '-'}</span>
                        </div>
                      </div>
                      <div className="text-[11px] font-bold flex-shrink-0 mr-2 font-arabic" style={{ color:COLOR }}>
                        {fmt(v.chkAmt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {showTransfer && (
        <ModalTransfer user={user}
          onClose={() => setShowTransfer(false)}
          onSaved={() => setShowTransfer(false)}/>
      )}
    </div>
  );
}
