import { useState } from "react";
import { login } from "../store/db.js";
import { AppLogo } from "../components/Logo.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";

export default function Login({ onLogin, theme, toggleTheme }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) { setError('يرجى إدخال اسم المستخدم وكلمة المرور'); return; }
    setLoading(true);
    try {
      const user = await login(username, password);
      onLogin(user);
    } catch (err) {
      setError(err.response?.data?.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
      setLoading(false);
    }
  };

  const demos = [
    { username: 'admin', password: 'admin123', label: 'أدمن', color: 'text-amber-400' },
    { username: 'ibrahim', password: 'ibrahim123', label: 'محاسب ١', color: 'text-emerald-400' },
    { username: 'ali', password: 'ali123', label: 'محاسب ٢', color: 'text-emerald-400' },
    { username: 'anas', password: 'anas123', label: 'محاسب ٣', color: 'text-emerald-400' },
    { username: 'auditor1', password: 'audit123', label: 'مدقق ١', color: 'text-blue-400' },
    { username: 'sarf', password: 'sarf123', label: 'صرف', color: 'text-purple-400' },
    { username: 'sijilat', password: 'sijilat123', label: 'سجلات', color: 'text-teal-400' },
    { username: 'sanad', password: 'sanad123', label: 'سند قيد', color: 'text-cyan-400' },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center relative font-arabic"
      style={{
        backgroundImage: 'url(/background1.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        direction: 'rtl',
      }}>

      {/* طبقة تظليل */}
      <div className="fixed inset-0 z-0" style={{ background: 'rgba(0,0,0,0.55)' }} />

      {/* زر الثيم */}
      <div className="fixed top-4 left-4 z-10">
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>

      {/* البطاقة */}
      <div
        className="relative z-10 w-full max-w-md rounded-2xl p-10 shadow-2xl"
        style={{
          background: 'var(--th-surface)',
          border: '1px solid var(--th-border-accent)',
        }}>

        {/* شعار */}
        <div className="text-center mb-7">
          <div className="flex justify-center mb-4">
            <AppLogo size={90} />
          </div>
          <h1 className="text-lg font-bold mb-1" style={{ color: 'var(--th-accent)' }}>
            دائرة فحص وتصديق البذور
          </h1>
          <p className="text-xs mb-1" style={{ color: 'var(--th-text-sub)' }}>
            نظام إدارة المستندات المالية
          </p>
          <div
            className="mx-auto mt-2 rounded-full"
            style={{ width: 40, height: 2, background: 'var(--th-accent)' }}
          />
        </div>

        {/* اسم المستخدم */}
        <div className="mb-4">
          <label className="field-label">اسم المستخدم</label>
          <input
            value={username}
            onChange={e => { setUsername(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="أدخل اسم المستخدم"
            className="input-field"
          />
        </div>

        {/* كلمة المرور */}
        <div className="mb-5">
          <label className="field-label">كلمة المرور</label>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="أدخل كلمة المرور"
            className="input-field"
          />
        </div>

        {/* خطأ */}
        {error && <div className="alert-error">{error}</div>}

        {/* زر الدخول */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full rounded-lg py-3 text-base font-bold transition-opacity duration-200 cursor-pointer border-none"
          style={{
            background: `linear-gradient(135deg, var(--th-accent), #d97706)`,
            color: '#0f172a',
            opacity: loading ? 0.7 : 1,
          }}>
          {loading ? '...جاري الدخول' : '🔐 تسجيل الدخول'}
        </button>

        {/* حسابات تجريبية */}
        <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--th-border)' }}>
          <p className="text-xs text-center mb-3" style={{ color: 'var(--th-text-muted)' }}>
            حسابات تجريبية
          </p>
          <div className="flex gap-2 flex-wrap">
            {demos.map(d => (
              <button
                key={d.username}
                onClick={() => { setUsername(d.username); setPassword(d.password); setError(''); }}
                className={`flex-1 rounded-md py-2 text-xs font-semibold cursor-pointer transition-all duration-150 hover:opacity-80 border border-current ${d.color}`}
                style={{
                  background: 'var(--th-surface-alt)',
                  opacity: 0.9,
                }}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}