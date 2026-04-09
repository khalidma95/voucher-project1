export default function ThemeToggle({ theme, toggleTheme }) {
  const isDark = theme.name === 'dark';
  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'تحويل للوضع الفاتح' : 'تحويل للوضع الداكن'}
      className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer text-lg transition-all duration-200 hover:scale-110 border border-th-border"
      style={{ background: 'var(--th-surface-alt)' }}>
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
