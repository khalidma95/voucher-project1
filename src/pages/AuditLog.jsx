import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar.jsx";
import { getAllAuditLogs, getUserAuditLogs, clearAuditLogs } from "../store/auditLog.js";
import { ROLES } from "../store/usersDB.js";

const ACTION_META = {
  login:   { label:'تسجيل دخول', color:'#60a5fa',  icon:'🔑' },
  logout:  { label:'تسجيل خروج', color:'#94a3b8',  icon:'🚪' },
  create:  { label:'إضافة',       color:'#34d399',  icon:'➕' },
  update:  { label:'تعديل',       color:'#f59e0b',  icon:'✏️' },
  delete:  { label:'حذف',         color:'#f87171',  icon:'🗑️' },
  import:  { label:'استيراد',     color:'#a78bfa',  icon:'📂' },
  export:  { label:'تصدير',       color:'#818cf8',  icon:'⬇️' },
  print:   { label:'طباعة',       color:'#fb923c',  icon:'🖨️' },
  save:    { label:'حفظ',         color:'#34d399',  icon:'💾' },
};

const ENTITY_LABELS = {
  session:    'الجلسة',
  voucher:    'مستند صرف',
  record:     'سجل',
  iradat:     'سجل إيرادات',
  khazain:    'سجل السلف',
  sijil:      'سجل',
  account:    'الدليل المحاسبي',
  journal:    'سند القيد',
};

function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('ar-IQ') + ' ' + d.toLocaleTimeString('ar-IQ', { hour:'2-digit', minute:'2-digit' });
}

export default function AuditLog({ user, onLogout, theme, toggleTheme }) {
  const isAdmin = user?.role === 'admin';

  const [logs,        setLogs]        = useState([]);
  const [actionOpen,  setActionOpen]  = useState(false);
  const [userOpen,    setUserOpen]    = useState(false);
  const actionRef = useRef();
  const userRef   = useRef();
  const [filterAction,setFilterAction]= useState('');
  const [filterUser,  setFilterUser]  = useState('');
  const [filterDate,  setFilterDate]  = useState('');
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);
  const PER_PAGE = 50;

  useEffect(() => {
    const close = (e) => {
      if (actionRef.current && !actionRef.current.contains(e.target)) setActionOpen(false);
      if (userRef.current   && !userRef.current.contains(e.target))   setUserOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const load = async () => {
    const all = await (isAdmin ? getAllAuditLogs() : getUserAuditLogs(user?.name));
    // تطبيع حقول الباك اند → نفس شكل localStorage
    const normalized = all.map(l => ({
      ...l,
      user:      { name: l.user_name || l.user?.name || '', role: l.user_role || l.user?.role || '' },
      timestamp: l.created_at || l.timestamp || '',
    }));
    setLogs([...normalized].reverse());
  };

  useEffect(() => { load(); }, []);

  // بناء قائمة المستخدمين مع أدوارهم
  const userRoleMap = {};
  logs.forEach(l => { if (l.user?.name) userRoleMap[l.user.name] = l.user.role; });
  const allUsers = [...new Set(logs.map(l => l.user?.name).filter(Boolean))];

  const filtered = logs.filter(l => {
    if (filterAction && l.action !== filterAction) return false;
    if (filterUser   && l.user?.name !== filterUser) return false;
    if (filterDate   && !l.timestamp.startsWith(filterDate)) return false;
    if (search.trim()) {
      const s = search.trim();
      return (l.detail||'').includes(s) || (l.entity||'').includes(s) || (l.user?.name||'').includes(s);
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged      = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const handleClear = async () => {
    if (!confirm('هل تريد مسح كل سجل العمليات؟')) return;
    await clearAuditLogs(); load();
  };

  const thStyle = {
    background:'#1a3a5c', color:'#fff',
    padding:'8px 12px', textAlign:'right',
    fontSize:15, fontWeight:700,
    borderBottom:'2px solid var(--th-border)',
    whiteSpace:'nowrap',
  };

  return (
    <div className="page-bg flex font-arabic">
      <Sidebar user={user} theme={theme} toggleTheme={toggleTheme} onLogout={onLogout}/>
      <div className="flex-1 overflow-auto">
        <div className="px-3 md:px-6 pt-16 md:pt-[40px] pb-6">

          {/* ── الهيدر ── */}
          <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
            <div>
              <div className="text-[22px] font-bold text-th-text">📋 سجل العمليات</div>
              <div className="text-[14px] text-th-muted mt-0.5">
                {filtered.length} عملية {!isAdmin && `· ${user?.name}`}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {isAdmin && (
                <button onClick={handleClear}
                  className="px-4 py-2 rounded-lg text-[14px] font-bold cursor-pointer font-arabic"
                  style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5' }}>
                  🗑️ مسح السجل
                </button>
              )}
            </div>
          </div>

          {/* ── فلاتر ── */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
              placeholder="🔍 بحث..."
              className="input-field py-2 px-3 text-[15px] text-right w-[180px]"/>

            {/* ── فلتر العمليات بألوان ── */}
            <div className="relative" ref={actionRef}>
              <button onClick={() => setActionOpen(v => !v)}
                className="input-field py-2 px-3 text-[15px] flex items-center gap-2 cursor-pointer min-w-[140px] justify-between">
                {filterAction ? (
                  <span className="flex items-center gap-1.5">
                    <span>{ACTION_META[filterAction]?.icon}</span>
                    <span style={{ color: ACTION_META[filterAction]?.color }}>{ACTION_META[filterAction]?.label}</span>
                  </span>
                ) : <span className="text-th-muted">كل العمليات</span>}
                <span className="text-th-muted text-[12px]">▼</span>
              </button>
              {actionOpen && (
                <div className="absolute top-full mt-1 right-0 z-50 rounded-xl border border-th-border shadow-xl min-w-[160px] overflow-hidden"
                  style={{ background:'var(--th-surface)' }}>
                  <div onClick={() => { setFilterAction(''); setPage(1); setActionOpen(false); }}
                    className="px-4 py-2.5 text-[15px] cursor-pointer hover:bg-[rgba(129,140,248,0.1)] text-th-muted">
                    كل العمليات
                  </div>
                  {Object.entries(ACTION_META).map(([k, v]) => (
                    <div key={k}
                      onClick={() => { setFilterAction(k); setPage(1); setActionOpen(false); }}
                      className="px-4 py-2.5 text-[15px] cursor-pointer flex items-center gap-2"
                      style={{ background: filterAction===k ? `${v.color}15` : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = `${v.color}10`}
                      onMouseLeave={e => e.currentTarget.style.background = filterAction===k ? `${v.color}15` : 'transparent'}>
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[13px]"
                        style={{ background:`${v.color}25`, border:`1px solid ${v.color}50` }}>
                        {v.icon}
                      </span>
                      <span style={{ color: v.color, fontWeight: filterAction===k ? 700 : 400 }}>{v.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="relative" ref={userRef}>
                <button onClick={() => setUserOpen(v => !v)}
                  className="input-field py-2 px-3 text-[15px] flex items-center gap-2 cursor-pointer min-w-[160px] justify-between">
                  {filterUser ? (() => {
                    const role = userRoleMap[filterUser];
                    const r    = ROLES.find(x => x.value === role);
                    return (
                      <span className="flex items-center gap-1.5">
                        {r && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.color }}/>}
                        <span style={{ color: r?.color || 'var(--th-text)' }}>{filterUser}</span>
                      </span>
                    );
                  })() : <span className="text-th-muted">كل المستخدمين</span>}
                  <span className="text-th-muted text-[12px]">▼</span>
                </button>
                {userOpen && (
                  <div className="absolute top-full mt-1 right-0 z-50 rounded-xl border border-th-border shadow-xl min-w-[190px] overflow-hidden"
                    style={{ background:'var(--th-surface)' }}>
                    <div onClick={() => { setFilterUser(''); setPage(1); setUserOpen(false); }}
                      className="px-4 py-2.5 text-[15px] cursor-pointer hover:bg-[rgba(129,140,248,0.1)] text-th-muted">
                      كل المستخدمين
                    </div>
                    {allUsers.map(name => {
                      const role = userRoleMap[name];
                      const r    = ROLES.find(x => x.value === role);
                      return (
                        <div key={name}
                          onClick={() => { setFilterUser(name); setPage(1); setUserOpen(false); }}
                          className="px-4 py-2.5 text-[15px] cursor-pointer flex items-center gap-2.5"
                          style={{ background: filterUser===name ? `${r?.color || '#818cf8'}15` : 'transparent' }}
                          onMouseEnter={e => e.currentTarget.style.background = `${r?.color || '#818cf8'}10`}
                          onMouseLeave={e => e.currentTarget.style.background = filterUser===name ? `${r?.color || '#818cf8'}15` : 'transparent'}>
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: r?.color || '#94a3b8' }}/>
                          <div>
                            <div style={{ color: r?.color || 'var(--th-text)', fontWeight: filterUser===name ? 700 : 400 }}>{name}</div>
                            {r && <div style={{ color: r.color, fontSize:12, opacity:0.7 }}>{r.label}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <input type="date" value={filterDate} onChange={e=>{setFilterDate(e.target.value);setPage(1);}}
              className="input-field py-2 px-3 text-[15px]"/>

            {(filterAction||filterUser||filterDate||search) && (
              <button onClick={()=>{setFilterAction('');setFilterUser('');setFilterDate('');setSearch('');setPage(1);}}
                className="px-3 py-2 rounded-lg text-[14px] cursor-pointer btn-secondary">
                ✕ إلغاء الفلتر
              </button>
            )}
          </div>

          {/* ── الجدول ── */}
          <div className="rounded-2xl border border-th-border overflow-hidden"
            style={{ background:'var(--th-card-bg)' }}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-arabic">
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width:160 }}>التاريخ والوقت</th>
                    {isAdmin && <th style={{ ...thStyle, width:130 }}>المستخدم</th>}
                    <th style={{ ...thStyle, width:100 }}>العملية</th>
                    <th style={{ ...thStyle, width:110 }}>القسم</th>
                    <th style={thStyle}>التفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 5 : 4}
                        className="text-center py-16 text-base text-th-muted">
                        لا توجد عمليات مسجّلة
                      </td>
                    </tr>
                  ) : paged.map((log, i) => {
                    const meta = ACTION_META[log.action] || { label: log.action, color:'#94a3b8', icon:'•' };
                    return (
                      <tr key={log.id} className={i%2===0?'tr-even':'tr-odd'}>
                        <td className="px-3 py-2.5 text-[14px] text-th-muted whitespace-nowrap">
                          {fmt(log.timestamp)}
                        </td>
                        {isAdmin && (
                          <td className="px-3 py-2.5">
                            <div className="text-[15px] font-bold text-th-text">{log.user?.name||'—'}</div>
                            <div className="text-[13px] text-th-muted">{log.user?.role||''}</div>
                          </td>
                        )}
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[14px] font-bold whitespace-nowrap"
                            style={{ background:`${meta.color}20`, color:meta.color, border:`1px solid ${meta.color}40` }}>
                            {meta.icon} {meta.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[15px] text-th-muted whitespace-nowrap">
                          {ENTITY_LABELS[log.entity] || log.entity || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-[15px] text-th-text">
                          {log.detail || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── تصفّح الصفحات ── */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 py-3 border-t border-th-border">
                <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                  className="px-3 py-1 rounded text-[14px] btn-secondary disabled:opacity-40 cursor-pointer">
                  ‹ السابق
                </button>
                <span className="text-[15px] text-th-muted">
                  {page} / {totalPages}
                </span>
                <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                  className="px-3 py-1 rounded text-[14px] btn-secondary disabled:opacity-40 cursor-pointer">
                  التالي ›
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
