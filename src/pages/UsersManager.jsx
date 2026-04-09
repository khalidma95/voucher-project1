import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar.jsx";
import {
  getUsers, addUser, updateUser, deleteUser,
  adminResetPassword, ROLES
} from "../store/usersDB.js";
import { addAuditLog } from "../store/auditLog.js";

const EMPTY_FORM = { username:'', password:'', name:'', role:'voucher', source:'' };

function RoleBadge({ role }) {
  const r = ROLES.find(x => x.value === role);
  if (!r) return <span className="text-th-muted text-[13px]">{role}</span>;
  return (
    <span className="px-2 py-0.5 rounded-full text-[13px] font-bold whitespace-nowrap"
      style={{ background:`${r.color}22`, color:r.color, border:`1px solid ${r.color}44` }}>
      {r.label}
    </span>
  );
}

export default function UsersManager({ user, onLogout, theme, toggleTheme, onUserUpdate }) {
  const [users,       setUsers]       = useState([]);
  const [search,      setSearch]      = useState('');
  const [filterRole,  setFilterRole]  = useState('');
  const [roleOpen,    setRoleOpen]    = useState(false);
  const [formRoleOpen, setFormRoleOpen] = useState(false);
  const roleRef     = useRef();
  const formRoleRef = useRef();

  // modal إضافة/تعديل
  const [modal,     setModal]     = useState(null); // null | 'add' | 'edit'
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [formErr,   setFormErr]   = useState('');
  const [showPass,  setShowPass]  = useState(false);

  // modal تغيير كلمة المرور
  const [pwModal,   setPwModal]   = useState(null); // null | userId
  const [newPw,     setNewPw]     = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwErr,     setPwErr]     = useState('');

  // إغلاق dropdowns عند النقر خارجها
  useEffect(() => {
    const close = (e) => {
      if (roleRef.current && !roleRef.current.contains(e.target)) setRoleOpen(false);
      if (formRoleRef.current && !formRoleRef.current.contains(e.target)) setFormRoleOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const load = async () => setUsers(await getUsers());
  useEffect(() => { load(); }, []);

  const filtered = users.filter(u => {
    if (filterRole && u.role !== filterRole) return false;
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      return u.name?.toLowerCase().includes(s) || u.username?.toLowerCase().includes(s);
    }
    return true;
  });

  // ── فتح نموذج الإضافة ──
  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormErr('');
    setShowPass(false);
    setEditId(null);
    setModal('add');
  };

  // ── فتح نموذج التعديل ──
  const openEdit = (u) => {
    setForm({ username: u.username, password: u.password, name: u.name, role: u.role, source: u.source || '' });
    setFormErr('');
    setShowPass(false);
    setEditId(u.id);
    setModal('edit');
  };

  // ── حفظ (إضافة أو تعديل) ──
  const handleSave = async () => {
    if (!form.username.trim()) return setFormErr('اسم المستخدم مطلوب');
    if (!form.password.trim()) return setFormErr('كلمة المرور مطلوبة');
    if (form.password.trim().length < 4) return setFormErr('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
    if (!form.name.trim()) return setFormErr('الاسم الكامل مطلوب');
    if (!form.role) return setFormErr('يرجى اختيار الدور');

    if (modal === 'add') {
      const res = await addUser(form);
      if (res.error) return setFormErr(res.error);
      addAuditLog({ user, action:'create', entity:'user', detail:`إضافة مستخدم: ${form.name} (${form.username})` });
    } else {
      const res = await updateUser(editId, form);
      if (res.error) return setFormErr(res.error);
      addAuditLog({ user, action:'update', entity:'user', detail:`تعديل مستخدم: ${form.name} (${form.username})` });
      if (editId === user.id && onUserUpdate) {
        onUserUpdate({ ...user, ...form });
      }
    }
    load();
    setModal(null);
  };

  // ── حذف ──
  const handleDelete = async (u) => {
    if (u.id === user.id) return alert('لا يمكنك حذف حسابك الخاص');
    if (!confirm(`هل تريد حذف المستخدم "${u.name}"؟`)) return;
    await deleteUser(u.id);
    addAuditLog({ user, action:'delete', entity:'user', detail:`حذف مستخدم: ${u.name} (${u.username})` });
    load();
  };

  // ── إعادة تعيين كلمة المرور ──
  const openResetPw = (u) => {
    setPwModal(u.id);
    setNewPw('');
    setPwErr('');
    setShowNewPw(false);
  };

  const handleResetPw = async () => {
    const target = users.find(u => u.id === pwModal);
    const res = await adminResetPassword(pwModal, newPw);
    if (res.error) return setPwErr(res.error);
    addAuditLog({ user, action:'update', entity:'user', detail:`إعادة تعيين كلمة المرور للمستخدم: ${target?.name}` });
    load();
    setPwModal(null);
  };

  const thStyle = {
    background:'#1a3a5c', color:'#fff',
    padding:'8px 14px', textAlign:'right',
    fontSize:15, fontWeight:700,
    borderBottom:'2px solid var(--th-border)',
    whiteSpace:'nowrap',
  };

  const inputCls = "input-field w-full py-2 px-3 text-[15px] text-right";

  return (
    <div className="page-bg flex font-arabic">
      <Sidebar user={user} theme={theme} toggleTheme={toggleTheme} onLogout={onLogout}/>
      <div className="flex-1 overflow-auto">
        <div className="px-3 md:px-6 pt-16 md:pt-[40px] pb-6">

          {/* ── الهيدر ── */}
          <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
            <div>
              <div className="text-[22px] font-bold text-th-text">🔐 إدارة المستخدمين</div>
              <div className="text-[14px] text-th-muted mt-0.5">{filtered.length} مستخدم</div>
            </div>
            <button onClick={openAdd}
              className="px-4 py-2 rounded-lg text-[15px] font-bold cursor-pointer"
              style={{ background:'rgba(52,211,153,0.15)', border:'1px solid rgba(52,211,153,0.4)', color:'#34d399' }}>
              ＋ إضافة مستخدم
            </button>
          </div>

          {/* ── فلاتر ── */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 بحث بالاسم أو اسم المستخدم..."
              className="input-field py-2 px-3 text-[15px] text-right w-[230px]"/>

            {/* فلتر الدور */}
            <div className="relative" ref={roleRef}>
              <button onClick={() => setRoleOpen(v => !v)}
                className="input-field py-2 px-3 text-[15px] flex items-center gap-2 cursor-pointer min-w-[150px] justify-between">
                {filterRole ? (
                  <span style={{ color: ROLES.find(r=>r.value===filterRole)?.color }}>
                    {ROLES.find(r=>r.value===filterRole)?.label}
                  </span>
                ) : <span className="text-th-muted">كل الأدوار</span>}
                <span className="text-th-muted text-[12px]">▼</span>
              </button>
              {roleOpen && (
                <div className="absolute top-full mt-1 right-0 z-50 rounded-xl border border-th-border shadow-xl min-w-[160px] overflow-hidden"
                  style={{ background:'var(--th-surface)' }}>
                  <div onClick={() => { setFilterRole(''); setRoleOpen(false); }}
                    className="px-4 py-2.5 text-[15px] cursor-pointer hover:bg-[rgba(129,140,248,0.1)] text-th-muted">
                    كل الأدوار
                  </div>
                  {ROLES.map(r => (
                    <div key={r.value}
                      onClick={() => { setFilterRole(r.value); setRoleOpen(false); }}
                      className="px-4 py-2.5 text-[15px] cursor-pointer"
                      style={{
                        background: filterRole===r.value ? `${r.color}15` : 'transparent',
                        color: r.color, fontWeight: filterRole===r.value ? 700 : 400
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = `${r.color}10`}
                      onMouseLeave={e => e.currentTarget.style.background = filterRole===r.value ? `${r.color}15` : 'transparent'}>
                      {r.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(search || filterRole) && (
              <button onClick={() => { setSearch(''); setFilterRole(''); }}
                className="px-3 py-2 rounded-lg text-[14px] cursor-pointer btn-secondary">
                ✕ إلغاء الفلتر
              </button>
            )}
          </div>

          {/* ── الجدول ── */}
          <div className="rounded-2xl border border-th-border overflow-hidden"
            style={{ background:'var(--th-card-bg)' }}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-arabic">
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width:40 }}>#</th>
                    <th style={thStyle}>الاسم الكامل</th>
                    <th style={thStyle}>اسم المستخدم</th>
                    <th style={{ ...thStyle, width:130 }}>الدور</th>
                    <th style={{ ...thStyle, width:150 }}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-16 text-base text-th-muted">
                        لا يوجد مستخدمون
                      </td>
                    </tr>
                  ) : filtered.map((u, i) => (
                    <tr key={u.id} className={i%2===0?'tr-even':'tr-odd'}>
                      <td className="px-3 py-1.5 text-[14px] text-th-muted text-center">{i+1}</td>
                      <td className="px-3 py-1.5">
                        <div className="text-[15px] font-bold text-th-text">{u.name}</div>
                        {u.source && <div className="text-[12px] text-th-muted">{u.source}</div>}
                      </td>
                      <td className="px-3 py-1.5 text-[14px] text-th-muted font-mono">{u.username}</td>
                      <td className="px-3 py-1.5"><RoleBadge role={u.role}/></td>
                      <td className="px-2 py-1.5">
                        <div className="flex gap-1 items-center">
                          <button onClick={() => openEdit(u)} title="تعديل"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[16px] cursor-pointer"
                            style={{ background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.3)' }}>
                            ✏️
                          </button>
                          <button onClick={() => openResetPw(u)} title="إعادة تعيين كلمة المرور"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[16px] cursor-pointer"
                            style={{ background:'rgba(129,140,248,0.12)', border:'1px solid rgba(129,140,248,0.3)' }}>
                            🔑
                          </button>
                          {u.id !== user.id && (
                            <button onClick={() => handleDelete(u)} title="حذف"
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-[16px] cursor-pointer"
                              style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)' }}>
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Modal إضافة/تعديل ══ */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)' }}>
          <div className="rounded-2xl border border-th-border shadow-2xl w-full max-w-md mx-4"
            style={{ background:'var(--th-surface)', direction:'rtl' }}>
            <div className="flex items-center justify-between p-5 border-b border-th-border">
              <div className="text-[18px] font-bold text-th-text">
                {modal === 'add' ? '➕ إضافة مستخدم' : '✏️ تعديل مستخدم'}
              </div>
              <button onClick={() => setModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-th-muted hover:text-th-text"
                style={{ background:'rgba(255,255,255,0.06)' }}>✕</button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              {/* الاسم الكامل */}
              <div>
                <label className="block text-[14px] text-th-muted mb-1">الاسم الكامل *</label>
                <input className={inputCls} value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="الاسم الكامل"/>
              </div>
              {/* اسم المستخدم */}
              <div>
                <label className="block text-[14px] text-th-muted mb-1">اسم المستخدم *</label>
                <input className={inputCls} value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="username"/>
              </div>
              {/* كلمة المرور */}
              <div>
                <label className="block text-[14px] text-th-muted mb-1">كلمة المرور *</label>
                <div className="relative">
                  <input className={inputCls} type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="4 أحرف على الأقل"
                    autoComplete="new-password"/>
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-th-muted cursor-pointer text-[13px]">
                    {showPass ? '🔒' : '👁'}
                  </button>
                </div>
              </div>
              {/* الدور */}
              <div>
                <label className="block text-[14px] text-th-muted mb-1">الدور *</label>
                <div className="relative" ref={formRoleRef}>
                  <button type="button"
                    onClick={() => setFormRoleOpen(v => !v)}
                    className="input-field w-full py-2 px-3 text-[15px] flex items-center justify-between cursor-pointer"
                    style={{ textAlign:'right' }}>
                    {(() => {
                      const r = ROLES.find(x => x.value === form.role);
                      return r ? (
                        <span className="px-2 py-0.5 rounded-full text-[13px] font-bold"
                          style={{ background:`${r.color}22`, color:r.color, border:`1px solid ${r.color}44` }}>
                          {r.label}
                        </span>
                      ) : <span className="text-th-muted">اختر الدور</span>;
                    })()}
                    <span className="text-th-muted text-[12px] mr-2">▼</span>
                  </button>
                  {formRoleOpen && (
                    <div className="absolute top-full mt-1 right-0 left-0 z-[60] rounded-xl border border-th-border shadow-xl overflow-hidden"
                      style={{ background:'var(--th-surface)' }}>
                      {ROLES.map(r => (
                        <div key={r.value}
                          onClick={() => { setForm(f => ({ ...f, role: r.value })); setFormRoleOpen(false); }}
                          className="px-4 py-2.5 cursor-pointer flex items-center gap-2.5"
                          style={{
                            background: form.role===r.value ? `${r.color}15` : 'transparent',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = `${r.color}10`}
                          onMouseLeave={e => e.currentTarget.style.background = form.role===r.value ? `${r.color}15` : 'transparent'}>
                          <span className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ background: r.color }}/>
                          <span style={{ color: r.color, fontWeight: form.role===r.value ? 700 : 400, fontSize:15 }}>
                            {r.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* المصدر */}
              <div>
                <label className="block text-[14px] text-th-muted mb-1">ملاحظة / المصدر</label>
                <input className={inputCls} value={form.source}
                  onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  placeholder="اختياري"/>
              </div>

              {formErr && (
                <div className="text-[14px] text-center py-2 rounded-lg"
                  style={{ background:'rgba(239,68,68,0.1)', color:'#fca5a5', border:'1px solid rgba(239,68,68,0.3)' }}>
                  {formErr}
                </div>
              )}
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl text-[15px] font-bold cursor-pointer"
                style={{ background:'rgba(52,211,153,0.15)', border:'1px solid rgba(52,211,153,0.4)', color:'#34d399' }}>
                💾 حفظ
              </button>
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-xl text-[15px] font-bold cursor-pointer btn-secondary">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal إعادة تعيين كلمة المرور ══ */}
      {pwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)' }}>
          <div className="rounded-2xl border border-th-border shadow-2xl w-full max-w-sm mx-4"
            style={{ background:'var(--th-surface)', direction:'rtl' }}>
            <div className="flex items-center justify-between p-5 border-b border-th-border">
              <div className="text-[17px] font-bold text-th-text">🔑 إعادة تعيين كلمة المرور</div>
              <button onClick={() => setPwModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-th-muted"
                style={{ background:'rgba(255,255,255,0.06)' }}>✕</button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div className="text-[14px] text-th-muted text-center">
                المستخدم: <span className="font-bold text-th-text">
                  {users.find(u => u.id === pwModal)?.name}
                </span>
              </div>
              <div>
                <label className="block text-[14px] text-th-muted mb-1">كلمة المرور الجديدة *</label>
                <div className="relative">
                  <input className={inputCls} type={showNewPw ? 'text' : 'password'}
                    value={newPw} onChange={e => setNewPw(e.target.value)}
                    placeholder="4 أحرف على الأقل"
                    autoComplete="new-password"/>
                  <button type="button" onClick={() => setShowNewPw(v => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-th-muted cursor-pointer text-[13px]">
                    {showNewPw ? '🔒' : '👁'}
                  </button>
                </div>
              </div>
              {pwErr && (
                <div className="text-[14px] text-center py-2 rounded-lg"
                  style={{ background:'rgba(239,68,68,0.1)', color:'#fca5a5', border:'1px solid rgba(239,68,68,0.3)' }}>
                  {pwErr}
                </div>
              )}
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={handleResetPw}
                className="flex-1 py-2.5 rounded-xl text-[15px] font-bold cursor-pointer"
                style={{ background:'rgba(129,140,248,0.15)', border:'1px solid rgba(129,140,248,0.4)', color:'#818cf8' }}>
                🔑 تغيير كلمة المرور
              </button>
              <button onClick={() => setPwModal(null)}
                className="flex-1 py-2.5 rounded-xl text-[15px] font-bold cursor-pointer btn-secondary">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
