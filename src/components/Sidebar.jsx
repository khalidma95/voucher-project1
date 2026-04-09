import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppLogo } from "./Logo.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import NotificationBell from "./NotificationBell.jsx";

const NAV = {
  admin: [
    { label: 'الصفحة الرئيسية', icon: '📊', path: '/dashboard', tab: 'dashboard' },
    { label: 'المعاملات', icon: '📄', path: '/dashboard', tab: 'vouchers' },
    { label: 'أبواب الصرف', icon: '📂', path: '/babs' },
    { label: 'سندات الصرف', icon: '📋', path: '/voucher' },
    { label: 'السجلات', icon: '📁', path: '/records' },
    { label: 'سند القيد', icon: '📒', path: '/journal' },
    { label: 'الدليل المحاسبي', icon: '📚', path: '/accounts-manager' },
    { label: 'إدارة المستخدمين', icon: '🔐', path: '/users-manager' },
    { label: 'سجل العمليات', icon: '📋', path: '/audit-log' },
  ],
  accountant: [
    { label: 'الصفحة الرئيسية', icon: '📊', path: '/dashboard', tab: 'dashboard' },
    { label: 'المعاملات', icon: '📄', path: '/dashboard', tab: 'vouchers' },
    { label: 'إضافة معاملة', icon: '➕', path: '/transaction' },
    { label: 'التقارير', icon: '📈', path: '/reports' },
    { label: 'أبواب الصرف', icon: '📂', path: '/babs' },
    { label: 'سجل العمليات', icon: '📋', path: '/audit-log' },
  ],
  voucher: [
    { label: 'الصفحة الرئيسية', icon: '📊', path: '/dashboard', tab: 'dashboard' },
    { label: 'مستند صرف', icon: '📋', path: '/voucher' },
    { label: 'سجل العمليات', icon: '📋', path: '/audit-log' },
  ],
  auditor: [
    { label: 'التدقيق', icon: '✅', path: '/auditor' },
    { label: 'سجل العمليات', icon: '📋', path: '/audit-log' },
  ],
  records: [
    { label: 'السجلات', icon: '📁', path: '/records' },
    { label: 'سجل العمليات', icon: '📋', path: '/audit-log' },
  ],
  journal: [
    { label: 'سند القيد', icon: '📒', path: '/journal' },
    { label: 'سجل العمليات', icon: '📋', path: '/audit-log' },
  ],
};

const ROLE_LABELS = {
  admin: 'مدير النظام', accountant: 'محاسب',
  voucher: 'مستخدم الصرف', auditor: 'مدقق', records: 'سجلات',
};

export default function Sidebar({ user, theme, toggleTheme, onLogout, tab, setTab }) {
  const [isOpen,   setIsOpen]   = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const links    = NAV[user.role] || [];

  // ── كشف حجم الشاشة ──
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsOpen(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── إغلاق عند تغيير المسار في الموبايل ──
  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (link) => {
    if (link.tab) return location.pathname === link.path && tab === link.tab;
    return location.pathname === link.path;
  };

  const handleClick = (link) => {
    if (link.tab && setTab) setTab(link.tab);
    navigate(link.path, link.tab ? { state: { tab: link.tab } } : undefined);
    if (isMobile) setMobileOpen(false);
  };

  const sidebarContent = (mobile = false) => (
    <div
      className="sidebar-bg flex flex-col h-full overflow-hidden transition-all duration-300"
      style={{
        width: mobile ? 260 : (isOpen ? 220 : 86),
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid var(--th-border)',
        direction: 'rtl',
      }}>

      {/* ── الشعار ── */}
      <div className="flex flex-col items-center transition-all duration-300 relative"
        style={{
          padding: (mobile || isOpen) ? '24px 20px 20px' : '24px 0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
        {/* زر الإخفاء/الإظهار — ديسكتوب فقط */}
        {!mobile && (
          <button onClick={() => setIsOpen(!isOpen)}
            className="absolute top-3 left-3 rounded-full w-7 h-7 flex items-center justify-center cursor-pointer font-bold text-sm transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.6)',
            }}>
            {isOpen ? '✕' : '☰'}
          </button>
        )}
        {/* زر الإغلاق في الموبايل */}
        {mobile && (
          <button onClick={() => setMobileOpen(false)}
            className="absolute top-3 left-3 rounded-full w-7 h-7 flex items-center justify-center cursor-pointer font-bold text-sm"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.6)',
            }}>✕</button>
        )}
        <AppLogo size={(mobile || isOpen) ? 70 : 44} />
        {(mobile || isOpen) && (
          <>
            <div className="font-arabic text-lg font-bold text-center whitespace-nowrap mt-3 leading-relaxed"
              style={{ color: '#f59e0b' }}>
              دائرة فحص وتصديق البذور
            </div>
            <div className="font-arabic text-sm whitespace-nowrap mt-1"
              style={{ color: 'rgba(255,255,255,0.4)' }}>
              لوحة التحكم
            </div>
          </>
        )}
      </div>

      {/* ── روابط التنقل ── */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-1 transition-all duration-300"
        style={{ padding: (mobile || isOpen) ? '16px 12px' : '16px 8px' }}>
        {(mobile || isOpen) && (
          <div className="font-arabic text-sm mb-2 px-2 tracking-wide whitespace-nowrap"
            style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>
            القائمة الرئيسية
          </div>
        )}
        {links.map((link, i) => {
          const active = isActive(link);
          return (
            <button key={i} onClick={() => handleClick(link)}
              className="flex items-center rounded-[10px] w-full border-none cursor-pointer transition-all duration-150 font-arabic"
              style={{
                gap: (mobile || isOpen) ? 12 : 0,
                padding: (mobile || isOpen) ? '11px 14px' : '16px 0',
                fontSize: 16,
                fontWeight: active ? 700 : 500,
                background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: active ? '#ffffff' : 'rgba(255,255,255,0.65)',
                borderRight: active ? '3px solid #f59e0b' : '3px solid transparent',
                textAlign: (mobile || isOpen) ? 'right' : 'center',
                justifyContent: (mobile || isOpen) ? 'flex-start' : 'center',
              }}>
              <span style={{ fontSize: 20 }}>{link.icon}</span>
              {(mobile || isOpen) && (
                <span className="whitespace-nowrap" style={{ marginRight: 12 }}>{link.label}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── معلومات المستخدم + خروج ── */}
      <div className="flex flex-col items-center"
        style={{
          padding: (mobile || isOpen) ? '16px' : '16px 0',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
        <div className="flex flex-row items-center w-full mb-2.5"
          style={{
            gap: 10,
            justifyContent: (mobile || isOpen) ? 'flex-start' : 'center',
            padding: (mobile || isOpen) ? 0 : '0 12px',
          }}>
          <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-base"
            style={{ background: 'rgba(255,255,255,0.15)' }}>👤</div>
          {(mobile || isOpen) && (
            <div className="min-w-0 flex-1 text-right">
              <div className="font-arabic text-base font-bold overflow-hidden text-ellipsis whitespace-nowrap"
                style={{ color: '#f1f5f9' }}>{user.name}</div>
              <div className="font-arabic text-sm whitespace-nowrap"
                style={{ color: '#f59e0b' }}>{ROLE_LABELS[user.role] || user.role}</div>
            </div>
          )}
        </div>
        {user.role !== 'admin' && (
          <div className="flex items-center mb-3"
            style={{ flexDirection: (mobile || isOpen) ? 'row' : 'column', gap: 8 }}>
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
        )}
        <button onClick={onLogout}
          className="flex items-center justify-center gap-2 rounded-lg font-arabic font-semibold cursor-pointer transition-all duration-300"
          style={{
            width: (mobile || isOpen) ? '100%' : '44px',
            padding: (mobile || isOpen) ? '9px' : '10px 0',
            fontSize: 15,
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#fca5a5',
          }}>
          {(mobile || isOpen) ? '→ تسجيل الخروج' : '🚪'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── ديسكتوب: السايدبار الثابت ── */}
      {!isMobile && (
        <div className="sticky top-0 h-screen flex-shrink-0" style={{ width: isOpen ? 220 : 86 }}>
          {sidebarContent(false)}
        </div>
      )}

      {/* ── موبايل: زر الفتح ── */}
      {isMobile && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-4 right-4 z-50 w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer shadow-lg"
          style={{
            background: 'rgba(245,158,11,0.9)',
            border: '1px solid rgba(245,158,11,0.5)',
            fontSize: 20,
          }}>
          ☰
        </button>
      )}

      {/* ── موبايل: overlay + drawer جميل ── */}
      {isMobile && (
        <>
          {/* overlay */}
          <div
            className="fixed inset-0 z-40 transition-all duration-300"
            style={{
              background: mobileOpen ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)',
              pointerEvents: mobileOpen ? 'auto' : 'none',
              backdropFilter: mobileOpen ? 'blur(3px)' : 'none',
            }}
            onClick={() => setMobileOpen(false)}
          />

          {/* drawer */}
          <div
            className="fixed top-0 right-0 h-full z-50 flex flex-col font-arabic"
            style={{
              width: 280,
              transform: mobileOpen ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
              background: 'linear-gradient(160deg, #0f1f3d 0%, #1a2f55 50%, #0f1f3d 100%)',
              borderLeft: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
              direction: 'rtl',
            }}>

            {/* ── هيدر الموبايل ── */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(129,140,248,0.15))',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              padding: '20px 16px 16px',
              position: 'relative',
            }}>
              {/* زر الإغلاق */}
              <button onClick={() => setMobileOpen(false)}
                className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.7)', fontSize:16, border:'1px solid rgba(255,255,255,0.15)' }}>
                ✕
              </button>

              {/* شعار + اسم الدائرة */}
              <div className="flex items-center gap-3">
                <AppLogo size={48}/>
                <div>
                  <div style={{ color:'#f59e0b', fontWeight:700, fontSize:14, lineHeight:1.4 }}>
                    دائرة فحص وتصديق البذور
                  </div>
                  <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>لوحة التحكم</div>
                </div>
              </div>

              {/* بيانات المستخدم */}
              <div className="flex items-center gap-3 mt-4 p-3 rounded-xl"
                style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background:'rgba(245,158,11,0.25)', border:'2px solid rgba(245,158,11,0.4)' }}>
                  👤
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ color:'#f1f5f9', fontWeight:700, fontSize:14 }}>{user.name}</div>
                  <div style={{ color:'#f59e0b', fontSize:12 }}>{ROLE_LABELS[user.role] || user.role}</div>
                </div>
                <ThemeToggle theme={theme} toggleTheme={toggleTheme}/>
              </div>
            </div>

            {/* ── روابط التنقل ── */}
            <div className="flex-1 overflow-y-auto py-3 px-3">
              <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, letterSpacing:2, padding:'4px 8px 10px', textTransform:'uppercase' }}>
                القائمة الرئيسية
              </div>
              {links.map((link, i) => {
                const active = isActive(link);
                return (
                  <button key={i} onClick={() => handleClick(link)}
                    className="flex items-center gap-3 w-full rounded-xl mb-1 cursor-pointer transition-all duration-150"
                    style={{
                      padding: '13px 14px',
                      background: active
                        ? 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.08))'
                        : 'transparent',
                      border: active ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent',
                      color: active ? '#ffffff' : 'rgba(255,255,255,0.6)',
                      textAlign: 'right',
                      justifyContent: 'flex-start',
                    }}>
                    {/* أيقونة ملوّنة */}
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: active ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.07)',
                        fontSize: 18,
                      }}>
                      {link.icon}
                    </div>
                    <span style={{ fontSize:15, fontWeight: active ? 700 : 400 }}>{link.label}</span>
                    {active && (
                      <div className="mr-auto w-2 h-2 rounded-full" style={{ background:'#f59e0b' }}/>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── خروج ── */}
            <div style={{ padding:'12px 16px 24px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
              <button onClick={onLogout}
                className="flex items-center justify-center gap-2 w-full rounded-xl cursor-pointer font-semibold"
                style={{
                  padding:'12px',
                  fontSize:15,
                  background:'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.08))',
                  border:'1px solid rgba(239,68,68,0.3)',
                  color:'#fca5a5',
                }}>
                🚪 تسجيل الخروج
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
