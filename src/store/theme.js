// ══════════════════════════════════════════════════════
// نظام الثيم - داكن / فاتح
// ══════════════════════════════════════════════════════

export const THEMES = {
  dark: {
    name: 'dark',
    bg:         'linear-gradient(135deg,#0f172a 0%,#1a2744 50%,#0f172a 100%)',
    surface:    'rgba(10,15,30,0.97)',
    surfaceAlt: 'rgba(255,255,255,0.04)',
    border:     'rgba(255,255,255,0.08)',
    borderAccent:'rgba(245,158,11,0.2)',
    navBg:      'rgba(0,0,0,0.5)',
    navText:    '#f1f5f9',
    text:       '#f1f5f9',
    textSub:    '#94a3b8',
    textMuted:  '#475569',
    inputBg:    'rgba(255,255,255,0.07)',
    inputBorder:'rgba(255,255,255,0.12)',
    rowEven:    'rgba(255,255,255,0.02)',
    rowOdd:     'transparent',
    cardBg:     'rgba(255,255,255,0.03)',
    modalBg:    '#1e293b',
    accent:     '#f59e0b',
    green:      '#34d399',
    blue:       '#60a5fa',
    red:        '#ef4444',
    redText:    '#fca5a5',
    colorScheme:'dark',
  },
  light: {
    name: 'light',
    bg:          'linear-gradient(135deg,#cbd5e1 0%,#dde3ed 50%,#cbd5e1 100%)',
    surface:     '#e8edf5',
    surfaceAlt:  '#dde3ed',
    border:      '#b0bcd0',
    borderAccent:'rgba(99,102,241,0.4)',
    navBg:       'linear-gradient(135deg,#1e2d5f,#2d3f7f)',
    navText:     '#f1f5f9',
    text:        '#0f172a',
    textSub:     '#1e293b',
    textMuted:   '#475569',
    inputBg:     '#edf1f7',
    inputBorder: '#9aadca',
    rowEven:     '#dde3ed',
    rowOdd:      '#e8edf5',
    cardBg:      'rgba(99,102,241,0.06)',
    modalBg:     '#e8edf5',
    accent:      '#6366f1',
    green:       '#059669',
    blue:        '#3b82f6',
    red:         '#dc2626',
    redText:     '#dc2626',
    colorScheme: 'light',
  }
};

export function getTheme() {
  const saved = localStorage.getItem('app_theme') || 'dark';
  return THEMES[saved] || THEMES.dark;
}

export function saveTheme(name) {
  localStorage.setItem('app_theme', name);
}