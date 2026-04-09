import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getNotifications, markAllNotificationsRead, clearNotifications, getUnreadCount } from "../store/db.js";

function timeAgo(iso) {
  const d    = new Date(iso);
  const now  = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)    return 'الآن';
  if (diff < 3600)  return `منذ ${Math.floor(diff/60)} د`;
  if (diff < 86400) return `منذ ${Math.floor(diff/3600)} س`;
  return d.toLocaleDateString('ar-IQ');
}

const TYPE_BG = {
  voucher:  'rgba(96,165,250,0.15)',
  transfer: 'rgba(245,158,11,0.15)',
  bab:      'rgba(168,85,247,0.15)',
  audit:    'rgba(52,211,153,0.15)',
  alloc:    'rgba(245,158,11,0.15)',
};

export default function NotificationBell({ theme }) {
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread,        setUnread]        = useState(0);
  const btnRef  = useRef(null);
  const dropRef = useRef(null);
  const [pos,   setPos]   = useState({ bottom: 0, left: 0 });

  const refresh = async () => {
    const [notifs, count] = await Promise.all([getNotifications(), getUnreadCount()]);
    setNotifications(notifs);
    setUnread(count);
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (dropRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      // يظهر تحت الزر، محاذاة لليمين
      const left = Math.max(8, r.right - 360);
      setPos({ top: r.bottom + 8, left });
    }
    setOpen(!open);
    if (!open && unread > 0) {
      markAllNotificationsRead().then(refresh);
    }
  };

  const handleClear = async () => { await clearNotifications(); await refresh(); };
  const sorted = [...notifications].reverse();

  const dropdown = open ? createPortal(
    <div
      ref={dropRef}
      className="fixed font-arabic overflow-hidden"
      style={{
        top:  pos.top,
        left: pos.left,
        width:  360,
        maxHeight: 480,
        background:   'var(--th-modal-bg)',
        border:       '1px solid var(--th-border)',
        borderRadius: 14,
        boxShadow:    '0 16px 48px rgba(0,0,0,0.5)',
        zIndex:       99999,
        direction:    'rtl',
      }}>

      {/* رأس */}
      <div className="flex justify-between items-center px-4 py-3.5"
        style={{ borderBottom: '1px solid var(--th-border)' }}>
        <div className="text-sm font-bold" style={{ color: 'var(--th-accent)' }}>
          الإشعارات
        </div>
        {notifications.length > 0 && (
          <button
            onClick={handleClear}
            className="btn-danger text-xs px-2.5 py-1 rounded-md cursor-pointer">
            مسح الكل
          </button>
        )}
      </div>

      {/* القائمة */}
      <div className="overflow-y-auto" style={{ maxHeight: 400 }}>
        {sorted.length === 0 ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--th-text-muted)' }}>
            لا توجد إشعارات
          </div>
        ) : (
          sorted.map(n => (
            <div
              key={n.id}
              className="flex gap-3 items-start px-4 py-3"
              style={{
                borderBottom: '1px solid var(--th-border)',
                background:   n.read ? 'transparent' : 'rgba(245,158,11,0.04)',
              }}>
              <div
                className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-base"
                style={{ background: TYPE_BG[n.type] || 'rgba(255,255,255,0.08)' }}>
                {n.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold" style={{ color: 'var(--th-text)' }}>
                  {n.title}
                </div>
                {n.detail && (
                  <div className="text-[11px] mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{ color: 'var(--th-text-muted)' }}>
                    {n.detail}
                  </div>
                )}
                <div className="flex gap-2 text-[10px] mt-1" style={{ color: 'var(--th-text-muted)' }}>
                  <span>{timeAgo(n.time || n.created_at)}</span>
                  {n.user && <span>· {n.user}</span>}
                </div>
              </div>
              {!n.read && (
                <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                  style={{ background: '#f59e0b' }} />
              )}
            </div>
          ))
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer text-base transition-all duration-200"
        style={{
          background:  unread > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.08)',
          border: `1px solid ${unread > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)'}`,
        }}>
        🔔
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 font-arabic text-white font-bold flex items-center justify-center"
            style={{
              fontSize: 9, minWidth: 16, height: 16,
              borderRadius: 8, padding: '0 4px',
              background: '#ef4444',
            }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {dropdown}
    </>
  );
}
