import { useEffect } from "react";
import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login       from "./pages/Login.jsx";
import Dashboard   from "./pages/Dashboard.jsx";
import Transaction from "./pages/Transaction.jsx";
import Reports     from "./pages/Reports.jsx";
import VoucherApp  from "./pages/VoucherApp.jsx";
import Records     from "./pages/Records.jsx";
import Auditor     from "./pages/Auditor.jsx";
import Babs        from "./pages/Babs.jsx";
import Journal         from "./pages/Journal.jsx";
import AccountsManager from "./pages/AccountsManager.jsx";
import AuditLog        from "./pages/AuditLog.jsx";
import UsersManager    from "./pages/UsersManager.jsx";
import { addAuditLog } from "./store/auditLog.js";
import { getTheme, saveTheme, THEMES } from "./store/theme.js";
import { useAuthStore } from "./store/authStore.js";
import { useBabNamesStore } from "./store/babNamesStore.js";

function AppRoutes() {
  const { user, setAuth, clearAuth, updateUser } = useAuthStore();
  const loadBabNames = useBabNamesStore(s => s.load);
  const [theme, setTheme] = useState(getTheme());
  const navigate = useNavigate();

  useEffect(() => {
    if (user) loadBabNames();
  }, [user]);

  useEffect(() => {
    if (theme.name === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const next = theme.name === 'dark' ? THEMES.light : THEMES.dark;
    saveTheme(next.name);
    setTheme(next);
  };

  const handleLogin = (u) => {
    // token already saved by login() in db.js
    setAuth(u, localStorage.getItem('token'));
    addAuditLog({ user: u, action: 'login', entity: 'session', detail: `تسجيل دخول — ${u.name}` });
    loadBabNames();
    navigate(
      u.role === 'records' ? '/records' :
      u.role === 'auditor' ? '/auditor' :
      u.role === 'journal' ? '/journal' :
      '/dashboard',
      { replace: true }
    );
  };

  const handleLogout = () => {
    if (user) addAuditLog({ user, action: 'logout', entity: 'session', detail: `تسجيل خروج — ${user.name}` });
    clearAuth();
    navigate('/login', { replace: true });
  };

  const handleUserUpdate = (updatedUser) => {
    updateUser(updatedUser);
  };

  const props = { user, theme, toggleTheme, onLogout: handleLogout, onUserUpdate: handleUserUpdate };

  return (
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to="/dashboard" replace/> : <Login onLogin={handleLogin} theme={theme} toggleTheme={toggleTheme}/>
      }/>

      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace/>}/>
      <Route path="/dashboard" element={
        !user ? <Navigate to="/login" replace/> :
        user.role === 'auditor' ? <Navigate to="/auditor" replace/> :
        user.role === 'records' ? <Navigate to="/records" replace/> :
        <Dashboard {...props}/>
      }/>

      <Route path="/vouchers" element={
        !user ? <Navigate to="/login" replace/> :
        user.role === 'admin' ? <Dashboard {...props} defaultTab="vouchers"/> :
        <Navigate to="/dashboard" replace/>
      }/>

      <Route path="/transaction" element={
        !user ? <Navigate to="/login" replace/> :
        user.role === 'accountant' ? <Transaction {...props}/> :
        <Navigate to="/dashboard" replace/>
      }/>
      <Route path="/reports" element={
        !user ? <Navigate to="/login" replace/> :
        user.role === 'accountant' ? <Reports {...props}/> :
        <Navigate to="/dashboard" replace/>
      }/>

      <Route path="/voucher" element={
        !user ? <Navigate to="/login" replace/> :
        (user.role === 'voucher' || user.role === 'admin') ? <VoucherApp {...props}/> :
        <Navigate to="/dashboard" replace/>
      }/>

      <Route path="/auditor" element={
        !user ? <Navigate to="/login" replace/> :
        user.role === 'auditor' ? <Auditor {...props}/> :
        <Navigate to="/dashboard" replace/>
      }/>

      <Route path="/records" element={
        !user ? <Navigate to="/login" replace/> :
        (user.role === 'records' || user.role === 'admin') ? <Records {...props}/> :
        <Navigate to="/dashboard" replace/>
      }/>

      <Route path="/babs" element={
        !user ? <Navigate to="/login" replace/> :
        (user.role === 'admin' || user.role === 'accountant') ? <Babs {...props}/> :
        <Navigate to="/dashboard" replace/>
      }/>

      <Route path="/journal" element={
        !user ? <Navigate to="/login" replace/> :
        (user.role === 'journal' || user.role === 'admin') ? <Journal {...props}/> :
        <Navigate to="/dashboard" replace/>
      }/>

      <Route path="/accounts-manager" element={
        !user ? <Navigate to="/login" replace/> :
        user.role === 'admin' ? <AccountsManager {...props}/> :
        <Navigate to="/dashboard" replace/>
      }/>

      <Route path="/audit-log" element={
        !user ? <Navigate to="/login" replace/> : <AuditLog {...props}/>
      }/>

      <Route path="/users-manager" element={
        !user ? <Navigate to="/login" replace/> :
        user.role === 'admin' ? <UsersManager {...props}/> :
        <Navigate to="/dashboard" replace/>
      }/>

      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace/>}/>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRoutes/>
    </BrowserRouter>
  );
}
