import { useMemo, useState, useEffect, useRef } from "react";
import { getAllTransfers, getAllBabRequests } from "../../store/db.js";
import ModalApproveTransfer from "./ModalApproveTransfer.jsx";
import ModalRenameBabs from "./ModalRenameBabs.jsx";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from "recharts";
import { fmt, getSC, getBabs, SOURCE_COLORS } from "./constants.js";
import ThemeToggle from "../ThemeToggle.jsx";
import NotificationBell from "../NotificationBell.jsx";

const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

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

const SRC_COLORS_DARK  = ['#818cf8','#34d399','#60a5fa'];
const SRC_COLORS_LIGHT = ['#6366f1','#059669','#2563eb'];
const sourceKeys = Object.keys(SOURCE_COLORS);

// ── بطاقة إحصائية ──
function StatCard({ label, rawValue, sub, color, icon, trend, isMoney = true, onMouseEnter, onMouseLeave }) {
  const counted = useCountUp(rawValue);
  const display = isMoney ? fmt(counted) : counted.toLocaleString('en-US');
  return (
    <div className="rounded-2xl p-[22px_24px] relative"
      style={{
        background:  `linear-gradient(135deg,${color}18,${color}06)`,
        border:      `1px solid ${color}30`,
        boxShadow:   `0 0 18px ${color}22`,
        transition:  'transform 0.2s ease, box-shadow 0.2s ease',
        cursor:      'default',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-5px)'; e.currentTarget.style.boxShadow=`0 14px 32px ${color}55`; onMouseEnter?.(); }}
      onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)';    e.currentTarget.style.boxShadow=`0 0 18px ${color}22`; onMouseLeave?.(); }}>
      <div className="absolute -top-7 -right-7 w-24 h-24 rounded-full pointer-events-none"
        style={{ background:`${color}20`, filter:'blur(30px)' }}/>
      <div className="flex justify-between items-start mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
          style={{ background:`${color}20`, border:`1px solid ${color}30` }}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: trend>=0 ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)',
              color:      trend>=0 ? '#34d399' : '#ef4444',
            }}>
            {trend>=0?'↑':'↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-[28px] font-extrabold tracking-tight font-arabic" style={{ color }}>{display}</div>
      <div className="text-sm text-th-muted font-arabic mt-1">{label}</div>
      {sub && <div className="text-xs font-arabic mt-0.5" style={{ color:'var(--th-text-muted)' }}>{sub}</div>}
    </div>
  );
}

// ── Tooltip مخصص ──
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-[10px_16px] font-arabic"
      style={{ direction:'rtl', background:'rgba(10,14,35,0.97)', border:'1px solid rgba(255,255,255,0.08)', boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
      <div className="text-[11px] mb-2" style={{ color:'rgba(255,255,255,0.5)' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:p.color }}/>
          <span className="text-xs" style={{ color:'rgba(255,255,255,0.7)' }}>{p.name}:</span>
          <span className="text-xs font-bold" style={{ color:p.color }}>{Number(p.value).toLocaleString('en-US')} IQD</span>
        </div>
      ))}
    </div>
  );
}

// ── بطاقة قسم ──
function Card({ children, title, extra }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-th-border" style={{ background:'var(--th-card-bg)' }}>
      {title && (
        <div className="flex justify-between items-center px-5 py-4 border-b border-th-border">
          <div className="text-[15px] font-extrabold font-arabic" style={{ color:'var(--th-text)', letterSpacing:'-0.01em' }}>{title}</div>
          {extra}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function AdminDashboard({ user, allocs, vouchers, babAllocs, theme, toggleTheme, onEditAlloc, onExpandBabs, onRefresh }) {
  const isLight    = theme.name === 'light';
  const SRC_COLORS = isLight ? SRC_COLORS_LIGHT : SRC_COLORS_DARK;

  const [showApprove,    setShowApprove]    = useState(false);
  const [pendingCount,   setPendingCount]   = useState(0);
  const [activeCard,     setActiveCard]     = useState(null);
  const [renameSource,   setRenameSource]   = useState(null);
  const [babsKey,        setBabsKey]        = useState(0); // لإعادة رسم الأبواب بعد التسمية

  useEffect(() => {
    Promise.all([getAllTransfers(), getAllBabRequests()]).then(([t, b]) => {
      setPendingCount(
        t.filter(x => x.status === 'pending').length +
        b.filter(x => x.status === 'pending').length
      );
    });
  }, [showApprove]);

  const monthlyData = useMemo(() => {
    const now  = new Date();
    const data = Array.from({ length:6 }, (_, i) => {
      const month = (now.getMonth() - 5 + i + 12) % 12;
      return { name:MONTHS[month], ...Object.fromEntries(sourceKeys.map(s => [s, 0])) };
    });
    vouchers.forEach(v => {
      if (!v.docDate) return;
      const d    = new Date(v.docDate);
      const diff = now.getMonth() - d.getMonth() + (now.getFullYear() - d.getFullYear()) * 12;
      if (diff < 0 || diff > 5) return;
      const idx = 5 - diff;
      if (data[idx] && v.source && data[idx][v.source] !== undefined)
        data[idx][v.source] += Number(v.chkAmt || 0);
    });
    return data;
  }, [vouchers]);

  const totalAlloc = allocs.reduce((s, a) => s + a.total, 0);
  const totalSpent = allocs.reduce((s, a) => s + a.spent, 0);
  const totalRem   = totalAlloc - totalSpent;
  const pct        = totalAlloc > 0 ? Math.round((totalSpent/totalAlloc)*100) : 0;
  const recent     = vouchers.slice().reverse().slice(0, 6);

  const sourceData = allocs.map(a => ({
    name:    a.source.replace('برنامج ', ''),
    التخصيص: a.total,
    المصروف: a.spent,
    المتبقي: a.total - a.spent,
  }));

  const chartTitle = {
    alloc: '🏦 التخصيصات مقابل المصروف لكل مصدر',
    spent: '📤 المصروف الشهري — آخر 6 أشهر',
    rem:   '💰 المتبقي لكل مصدر',
    count: '📈 الصرف الشهري — آخر 6 أشهر',
  }[activeCard] || '📈 الصرف الشهري — آخر 6 أشهر';

  return (
    <div className="font-arabic" style={{ direction:'rtl' }}>

      {/* شريط الأدوات العلوي */}
      <div className="flex justify-end items-center gap-2 mb-5">
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        <NotificationBell theme={theme} />
        <button onClick={() => setShowApprove(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-bold cursor-pointer font-arabic"
          style={{
            background: pendingCount>0 ? 'rgba(245,158,11,0.2)' : 'var(--th-surface-alt)',
            border:     pendingCount>0 ? '1px solid rgba(245,158,11,0.5)' : '1px solid var(--th-border)',
            color:      pendingCount>0 ? '#f59e0b' : 'var(--th-text-sub)',
          }}>
          🔄 طلبات المناقلة
          {pendingCount > 0 && (
            <span className="rounded-full px-2 py-0.5 text-[11px] font-bold"
              style={{ background:'#f59e0b', color:'#0f172a' }}>{pendingCount}</span>
          )}
        </button>
      </div>

      {/* بطاقات إحصائية */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5" style={{ padding:'6px 4px' }}>
        <StatCard icon="🏦" label="إجمالي التخصيصات" rawValue={totalAlloc}    sub="دينار عراقي"               color="#818cf8" onMouseEnter={()=>setActiveCard('alloc')}  onMouseLeave={()=>setActiveCard(null)}/>
        <StatCard icon="📤" label="إجمالي المصروف"   rawValue={totalSpent}    sub={`${pct}% من الإجمالي`}     color="#f59e0b" trend={pct} onMouseEnter={()=>setActiveCard('spent')} onMouseLeave={()=>setActiveCard(null)}/>
        <StatCard icon="💰" label="إجمالي المتبقي"   rawValue={totalRem}      sub={`${100-pct}% متبقي`}       color="#34d399" onMouseEnter={()=>setActiveCard('rem')}   onMouseLeave={()=>setActiveCard(null)}/>
        <StatCard icon="📋" label="عدد المعاملات"    rawValue={vouchers.length} isMoney={false} sub={`${sourceKeys.length} مصادر تمويل`} color="#60a5fa" onMouseEnter={()=>setActiveCard('count')} onMouseLeave={()=>setActiveCard(null)}/>
      </div>

      {/* الرسم البياني + آخر المعاملات */}
      <div className="grid gap-4 mb-5 grid-cols-1 lg:grid-cols-[1fr_360px]">

        <Card title={chartTitle}>
          <ResponsiveContainer width="100%" height={230}>
            {(activeCard === 'alloc' || activeCard === 'rem') ? (
              <BarChart data={sourceData} margin={{ top:5, right:5, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--th-border)"/>
                <XAxis dataKey="name" tick={{ fill:'var(--th-text-muted)', fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:'var(--th-text-muted)', fontSize:10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v>=1e9?`${(v/1e9).toFixed(1)} مليار`:v>=1e6?`${(v/1e6).toFixed(0)} مليون`:v>=1e3?`${(v/1e3).toFixed(0)} ألف`:'٠'}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Legend wrapperStyle={{ fontSize:11, paddingTop:12 }}
                  formatter={v => <span style={{ color:'var(--th-text-sub)' }} className="font-arabic">{v}</span>}/>
                {activeCard === 'alloc' && <Bar dataKey="التخصيص" fill="#818cf8" radius={[5,5,0,0]} isAnimationActive animationBegin={0} animationDuration={700} animationEasing="ease-out"/>}
                {activeCard === 'alloc' && <Bar dataKey="المصروف"  fill="#f59e0b" radius={[5,5,0,0]} isAnimationActive animationBegin={80} animationDuration={700} animationEasing="ease-out"/>}
                {activeCard === 'rem'   && <Bar dataKey="المتبقي"  fill="#34d399" radius={[5,5,0,0]} isAnimationActive animationBegin={0} animationDuration={700} animationEasing="ease-out"/>}
                {activeCard === 'rem'   && <Bar dataKey="المصروف"  fill="#f59e0b" radius={[5,5,0,0]} isAnimationActive animationBegin={80} animationDuration={700} animationEasing="ease-out"/>}
              </BarChart>
            ) : (
              <AreaChart data={monthlyData} margin={{ top:5, right:5, left:0, bottom:0 }}>
                <defs>
                  {sourceKeys.map((src, i) => (
                    <linearGradient key={src} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={SRC_COLORS[i]} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={SRC_COLORS[i]} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--th-border)"/>
                <XAxis dataKey="name" tick={{ fill:'var(--th-text-muted)', fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:'var(--th-text-muted)', fontSize:10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v>=1e9?`${(v/1e9).toFixed(1)} مليار`:v>=1e6?`${(v/1e6).toFixed(0)} مليون`:v>=1e3?`${(v/1e3).toFixed(0)} ألف`:'٠'}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Legend wrapperStyle={{ fontSize:11, paddingTop:12 }}
                  formatter={v => <span style={{ color:'var(--th-text-sub)' }} className="font-arabic">{v}</span>}/>
                {sourceKeys.map((src, i) => (
                  <Area key={src} type="monotone" dataKey={src} name={src}
                    stroke={SRC_COLORS[i]} strokeWidth={activeCard === 'spent' ? 3.5 : 2.5}
                    dot={{ fill:SRC_COLORS[i], r: activeCard === 'spent' ? 4 : 3 }}
                    fill={`url(#g${i})`}
                    fillOpacity={activeCard === 'spent' ? 1.5 : 1}/>
                ))}
              </AreaChart>
            )}
          </ResponsiveContainer>
        </Card>

        <Card title="🕐 آخر المعاملات">
          {recent.length === 0 ? (
            <div className="text-center py-8 text-[13px] text-th-muted font-arabic">لا توجد معاملات</div>
          ) : (
            <div className="flex flex-col gap-2">
              {recent.map(v => {
                const sc = getSC(v.source, 'dark');
                return (
                  <div key={v.id} className="flex justify-between items-center p-[9px_12px] rounded-xl"
                    style={{ background:'var(--th-surface-alt)', borderRight:`3px solid ${sc.color}` }}>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-th-text font-arabic truncate max-w-[160px]">{v.details||'-'}</div>
                      <div className="text-[10px] text-th-muted mt-0.5 font-arabic">
                        {v.docDate} · <span style={{ color:sc.color }}>{v.bab||'-'}</span>
                      </div>
                    </div>
                    <div className="text-xs font-bold flex-shrink-0 mr-2 font-arabic" style={{ color:sc.color }}>
                      {fmt(v.chkAmt)} IQD
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* مصادر التمويل */}
      <div key={babsKey} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ padding:'6px 4px' }}>
        {allocs.map((a, ai) => {
          const sc  = getSC(a.source, 'dark');
          const p   = a.total > 0 ? Math.min(100, Math.round((a.spent/a.total)*100)) : 0;
          const rem = a.total - a.spent;
          const clr = SRC_COLORS[ai % SRC_COLORS.length];

          return (
            <div key={a.id} className="rounded-2xl p-5"
              style={{
                background: `linear-gradient(145deg,${clr}10,rgba(255,255,255,0.02))`,
                border:     `1px solid ${clr}30`,
                boxShadow:  `0 0 18px ${clr}20`,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-5px)'; e.currentTarget.style.boxShadow=`0 14px 32px ${clr}50`; }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)';    e.currentTarget.style.boxShadow=`0 0 18px ${clr}20`; }}>

              {/* رأس */}
              <div className="flex justify-between items-center mb-4">
                <div className="text-[13px] font-bold font-arabic" style={{ color:clr }}>
                  {sc.icon} {a.source}
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => onExpandBabs(a.source)}
                    className="px-2.5 py-1 rounded-lg text-[11px] cursor-pointer font-arabic"
                    style={{ background:`${clr}15`, border:`1px solid ${clr}30`, color:clr }}>
                    📂 الأبواب
                  </button>
                  <button onClick={() => setRenameSource(a.source)}
                    className="px-2.5 py-1 rounded-lg text-[11px] cursor-pointer font-arabic"
                    style={{ background:'rgba(96,165,250,0.12)', border:'1px solid rgba(96,165,250,0.3)', color:'#60a5fa' }}>
                    🏷️ الأسماء
                  </button>
                  <button onClick={() => onEditAlloc({ source:a.source, value:a.total })}
                    className="px-2.5 py-1 rounded-lg text-[11px] cursor-pointer font-arabic"
                    style={{ background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.3)', color:'#f59e0b' }}>
                    ✏️ تعديل
                  </button>
                </div>
              </div>

              {/* شريط + نسبة */}
              <div className="flex items-center gap-3 mb-4">
                {/* دائرة SVG */}
                <div className="relative w-[60px] h-[60px] flex-shrink-0">
                  <svg width="60" height="60" style={{ transform:'rotate(-90deg)' }}>
                    <circle cx="30" cy="30" r="24" fill="none"
                      stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
                    <circle cx="30" cy="30" r="24" fill="none"
                      stroke={clr} strokeWidth="5"
                      strokeDasharray={`${2*Math.PI*24}`}
                      strokeDashoffset={`${2*Math.PI*24*(1-p/100)}`}
                      strokeLinecap="round"
                      style={{ transition:'stroke-dashoffset 0.6s ease' }}/>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold font-arabic"
                    style={{ color:clr }}>{p}%</div>
                </div>

                {/* أرقام */}
                <div className="flex-1 grid grid-cols-2 gap-1.5">
                  {[
                    ['الكلي',   fmt(a.total), 'var(--th-text-sub)'],
                    ['المصروف', fmt(a.spent),  '#d97706'],
                    ['المتبقي', fmt(rem),       rem<0?'#ef4444':clr],
                  ].map(([lbl,val,col]) => (
                    <div key={lbl} className="rounded-lg p-[6px_8px] text-center"
                      style={{ background:'rgba(0,0,0,0.2)' }}>
                      <div className="text-[9px] text-th-muted mb-0.5 font-arabic">{lbl}</div>
                      <div className="text-[10px] font-bold font-arabic" style={{ color:col }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* أبواب الصرف مصغرة */}
              <div className="border-t border-white/5 pt-3">
                <div className="text-[10px] text-th-muted mb-2 font-arabic">أبواب الصرف</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
                  {getBabs(a.source).map(bab => {
                    const key = `${a.source}__${bab}`;
                    const ba  = babAllocs[key] || { total:0, spent:0 };
                    const bp  = ba.total > 0 ? Math.min(100, Math.round((ba.spent/ba.total)*100)) : 0;
                    const bc  = bp>90 ? '#ef4444' : bp>70 ? '#f59e0b' : clr;
                    return (
                      <div key={bab} title={`${bab}: ${bp}%`}
                        className="rounded px-1 py-1.5 text-center"
                        style={{ background:'rgba(0,0,0,0.25)' }}>
                        <div className="text-[8px] text-th-muted mb-0.5 truncate font-arabic">{bab}</div>
                        <div className="h-0.5 rounded-full overflow-hidden mb-0.5"
                          style={{ background:'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full transition-[width] duration-500"
                            style={{ width:`${bp}%`, background: ba.total===0?'#1e293b':bc }}/>
                        </div>
                        <div className="text-[8px] font-bold font-arabic" style={{ color:bc }}>
                          {ba.total > 0 ? `${bp}%` : '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showApprove && (
        <ModalApproveTransfer
          user={user}
          onClose={() => setShowApprove(false)}
          onSaved={() => {
            Promise.all([getAllTransfers(), getAllBabRequests()]).then(([t, b]) => {
              setPendingCount(
                t.filter(x => x.status === 'pending').length +
                b.filter(x => x.status === 'pending').length
              );
            });
            onRefresh?.();
          }}/>
      )}

      {renameSource && (
        <ModalRenameBabs
          source={renameSource}
          theme={theme}
          onClose={() => setRenameSource(null)}
          onSaved={() => { setRenameSource(null); setBabsKey(k => k + 1); }}
        />
      )}
    </div>
  );
}
