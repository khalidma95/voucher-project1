import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { AppLogo } from "../components/Logo.jsx";

const ROLE_LABELS = { admin:'أدمن', accountant:'محاسب', auditor:'مدقق', voucher:'صرف' };
const ROLE_COLORS = { admin:'#f59e0b', accountant:'#34d399', auditor:'#60a5fa', voucher:'#c084fc' };
const ROLE_BG     = {
  admin:      'rgba(245,158,11,0.12)',
  accountant: 'rgba(52,211,153,0.12)',
  auditor:    'rgba(96,165,250,0.12)',
  voucher:    'rgba(192,132,252,0.12)',
};

const NAV_ICONS = {
  '/dashboard':   '⬡',
  '/transaction': '＋',
  '/reports':     '≡',
  '/vouchers':    '❐',
  '/voucher':     '❐',
};

const NAV = {
  accountant: [
    { path:'/dashboard',   label:'الإحصائيات'   },
    { path:'/transaction', label:'معاملة جديدة' },
    { path:'/reports',     label:'التقارير'     },
  ],
  admin: [
    { path:'/dashboard',   label:'الإحصائيات'   },
    { path:'/vouchers',    label:'المعاملات'    },
  ],
  auditor: [
    { path:'/dashboard',   label:'الإحصائيات'   },
  ],
  voucher: [
    { path:'/voucher',     label:'مستند الصرف'  },
  ],
};

function NavButton({ item, isActive, onClick, accentColor }) {
  const [hovered, setHovered] = useState(false);
  const icon = NAV_ICONS[item.path] || '•';
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center gap-1.5 h-10 px-4 rounded-[10px] border-none cursor-pointer font-arabic text-sm font-semibold whitespace-nowrap transition-all duration-200"
      style={{
        background: isActive
          ? `linear-gradient(135deg,${accentColor}22,${accentColor}11)`
          : hovered ? 'rgba(255,255,255,0.07)' : 'transparent',
        color:     isActive ? accentColor : hovered ? '#fff' : 'rgba(255,255,255,0.65)',
        boxShadow: isActive ? `0 0 0 1px ${accentColor}40,inset 0 1px 0 ${accentColor}20` : 'none',
      }}>
      <span className="text-[11px] opacity-70">{icon}</span>
      {item.label}
      {isActive && (
        <span
          className="absolute bottom-0 right-1/2 translate-x-1/2 h-0.5 rounded-sm"
          style={{
            width: '40%',
            background: `linear-gradient(90deg,transparent,${accentColor},transparent)`,
          }}
        />
      )}
    </button>
  );
}

export default function MainLayout({ user, onLogout, theme, toggleTheme, children }) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const navItems   = NAV[user.role] || [];
  const roleColor  = ROLE_COLORS[user.role] || '#f59e0b';
  const roleBg     = ROLE_BG[user.role]     || 'rgba(245,158,11,0.12)';
  const initials   = user.name ? user.name.trim().slice(0, 1) : '؟';
  const accentColor = theme.name === 'dark' ? '#f59e0b' : 'var(--th-accent)';

  return (
    <div className="page-bg font-arabic">

      {/* ── شريط التنقل ── */}
      <nav className="topnav">

        {/* يمين: اللوجو والعنوان */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          <div className="w-px h-7 bg-white/10" />
          <AppLogo size={38} />
          <div className="text-right leading-tight">
            <div className="text-sm font-extrabold tracking-wide" style={{ color: '#f59e0b' }}>
              فحص وتصديق البذور
            </div>
            <div className="text-[10px] font-normal" style={{ color: 'rgba(255,255,255,0.35)' }}>
              نظام إدارة المستندات
            </div>
          </div>
        </div>

        {/* وسط: التنقل */}
        <div
          className="flex items-center gap-1 rounded-[14px] px-2 py-1.5"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border:     '1px solid rgba(255,255,255,0.07)',
          }}>
          {navItems.map(item => {
            const active = location.pathname === item.path ||
              (item.path === '/dashboard' && location.pathname === '/');
            return (
              <NavButton
                key={item.path}
                item={item}
                isActive={active}
                onClick={() => navigate(item.path)}
                accentColor={accentColor}
              />
            );
          })}
        </div>

        {/* يسار: معلومات المستخدم + خروج */}
        <div className="flex items-center gap-2.5 flex-shrink-0">

          {/* بطاقة المستخدم */}
          <div
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-1.5"
            style={{
              background: roleBg,
              border:     `1px solid ${roleColor}30`,
            }}>
            <div
              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-extrabold"
              style={{
                background: `linear-gradient(135deg,${roleColor}60,${roleColor}30)`,
                border:     `1.5px solid ${roleColor}60`,
                color:      roleColor,
              }}>
              {initials}
            </div>
            <div className="leading-tight">
              <div
                className="text-sm font-bold max-w-[110px] overflow-hidden text-ellipsis whitespace-nowrap"
                style={{ color: '#fff' }}>
                {user.name}
              </div>
              <div className="flex items-center gap-1">
                <span
                  className="text-[10px] font-semibold rounded px-1.5 py-px"
                  style={{
                    color:      roleColor,
                    background: `${roleColor}18`,
                  }}>
                  {ROLE_LABELS[user.role]}
                </span>
                {user.source && (
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {user.source}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* زر الخروج */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-xs font-bold cursor-pointer whitespace-nowrap transition-all duration-200 font-arabic"
            style={{
              background:  'rgba(239,68,68,0.1)',
              border:      '1px solid rgba(239,68,68,0.25)',
              color:       '#fca5a5',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background   = 'rgba(239,68,68,0.25)';
              e.currentTarget.style.borderColor  = 'rgba(239,68,68,0.5)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background   = 'rgba(239,68,68,0.1)';
              e.currentTarget.style.borderColor  = 'rgba(239,68,68,0.25)';
            }}>
            <span className="text-sm">⏻</span>
            خروج
          </button>
        </div>
      </nav>

      {/* ── المحتوى ── */}
      <div className="px-6 py-7">
        {children}
      </div>
    </div>
  );
}
