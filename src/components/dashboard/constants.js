import { useBabNamesStore } from '../../store/babNamesStore.js';

export const FONT = "'Noto Naskh Arabic', 'Times New Roman', serif";
export const fmt  = n => Number(n||0).toLocaleString('en-US');

export const BABS = [
  'الات ومعدات','وسائل نقل','متنوعة',
  'مكافآت','ايفادات','لوازم وسلع','بناء وانشاءات'
];

export const BABS_BY_SOURCE = {
  'برنامج تطوير المختبرات': [
    'الات ومعدات','وسائل نقل','متنوعة',
    'مكافآت','ايفادات','لوازم وسلع','بناء وانشاءات'
  ],
  'برنامج صيانة الاصناف': [
    'الات ومعدات','وسائل نقل','متنوعة',
    'مكافآت','ايفادات','لوازم وسلع','بناء وانشاءات'
  ],
  'حملة الدعم': [
    'اجور نقل',
    'اخرى متنوعة',
    'الوقود / اخرى',
    'صيانة السيارات والات والمعدات والاجهزة والمستلزمات الاخرى',
    'الايفادات',
    'الاطعام للعاملين في حملة الدعم والساندين',
    'مكافأت',
    'الساعات الاضافية',
  ],
};

export const getBabs = (source) => {
  return useBabNamesStore.getState().getBabs(source);
};

export const ROLE_LABELS = { admin:'أدمن', accountant:'محاسب', auditor:'مدقق', voucher:'صرف' };
export const ROLE_COLORS = { admin:'#f59e0b', accountant:'#34d399', auditor:'#60a5fa', voucher:'#c084fc' };

export const SOURCE_COLORS = {
  'برنامج تطوير المختبرات': {
    bg:'rgba(245,158,11,0.1)', border:'rgba(245,158,11,0.3)', color:'#d97706', icon:'🔬',
    bgLight:'#fffbeb', borderLight:'#fcd34d', colorLight:'#b45309'
  },
  'برنامج صيانة الاصناف': {
    bg:'rgba(52,211,153,0.1)', border:'rgba(52,211,153,0.3)', color:'#34d399', icon:'🌱',
    bgLight:'#f0fdf4', borderLight:'#86efac', colorLight:'#15803d'
  },
  'حملة الدعم': {
    bg:'rgba(96,165,250,0.1)', border:'rgba(96,165,250,0.3)', color:'#60a5fa', icon:'🤝',
    bgLight:'#eff6ff', borderLight:'#93c5fd', colorLight:'#1d4ed8'
  },
};

export const getSC = (source, themeName) => {
  const s = SOURCE_COLORS[source] || SOURCE_COLORS['حملة الدعم'];
  return themeName === 'light'
    ? { bg:s.bgLight, border:s.borderLight, color:s.colorLight, icon:s.icon }
    : { bg:s.bg,      border:s.border,      color:s.color,      icon:s.icon };
};