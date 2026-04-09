// كاش أسماء الأبواب — يُحمَّل مرة واحدة عند بدء التطبيق
import { create } from 'zustand';
import api from '../api/client.js';

const BABS_BY_SOURCE_DEFAULT = {
  'برنامج تطوير المختبرات': ['الات ومعدات','وسائل نقل','متنوعة','مكافآت','ايفادات','لوازم وسلع','بناء وانشاءات'],
  'برنامج صيانة الاصناف':   ['الات ومعدات','وسائل نقل','متنوعة','مكافآت','ايفادات','لوازم وسلع','بناء وانشاءات'],
  'حملة الدعم': ['اجور نقل','اخرى متنوعة','الوقود / اخرى','صيانة السيارات والات والمعدات والاجهزة والمستلزمات الاخرى','الايفادات','الاطعام للعاملين في حملة الدعم والساندين','مكافأت','الساعات الاضافية'],
};
const BABS_DEFAULT = ['الات ومعدات','وسائل نقل','متنوعة','مكافآت','ايفادات','لوازم وسلع','بناء وانشاءات'];

export const useBabNamesStore = create((set, get) => ({
  map: { ...BABS_BY_SOURCE_DEFAULT },

  load: async () => {
    try {
      const { data } = await api.get('/bab-names');
      set({ map: { ...BABS_BY_SOURCE_DEFAULT, ...data } });
    } catch {}
  },

  getBabs: (source) => {
    const m = get().map;
    return m[source] || BABS_BY_SOURCE_DEFAULT[source] || BABS_DEFAULT;
  },
}));
