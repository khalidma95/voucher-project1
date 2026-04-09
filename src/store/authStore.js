import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user:  JSON.parse(localStorage.getItem('currentUser') || 'null'),
  token: localStorage.getItem('token') || null,

  setAuth: (user, token) => {
    localStorage.setItem('token',       token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    set({ user, token });
  },

  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    set({ user: null, token: null });
  },

  updateUser: (user) => {
    localStorage.setItem('currentUser', JSON.stringify(user));
    set({ user });
  },
}));
