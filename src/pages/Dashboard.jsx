import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { buildDocHTML, TafasilInput } from "./VoucherApp.jsx";
import api from "../api/client.js";
import {
  getAllocations, getVouchers, deleteVoucher,
  updateAllocation, getBabAllocations, updateBabAllocation,
  getSarfVouchers
} from "../store/db.js";
import AdminDashboard from "../components/dashboard/AdminDashboard.jsx";
import AccountantDashboard from "../components/dashboard/AccountantDashboard.jsx";
import AdminVouchers from "../components/dashboard/AdminVouchers.jsx";
import AccountantVouchers from "../components/dashboard/AccountantVouchers.jsx";
import ModalEditItem from "../components/dashboard/ModalEditItem.jsx";
import ModalEditAlloc from "../components/dashboard/ModalEditAlloc.jsx";
import ModalBabs from "../components/dashboard/ModalBabs.jsx";
import ModalEditBab from "../components/dashboard/ModalEditBab.jsx";
import ModalArchive from "../components/dashboard/ModalArchive.jsx";
import ModalViewArchive from "../components/dashboard/ModalViewArchive.jsx";
import Sidebar from "../components/Sidebar.jsx";

export default function Dashboard({ user, onLogout, theme, toggleTheme, defaultTab }) {
  const [allocs, setAllocs] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const location = useLocation();
  const [tab, setTab] = useState(location.state?.tab || defaultTab || 'dashboard');
  const [editAlloc, setEditAlloc] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [babAllocs, setBabAllocs] = useState({});
  const [editBabAlloc, setEditBabAlloc] = useState(null);
  const [expandedSrc, setExpandedSrc] = useState(null);
  const [archiveItem, setArchiveItem] = useState(null);
  const [archiveImg, setArchiveImg] = useState(null);
  const [viewArchive, setViewArchive] = useState(null);
  const [sarfVouchers, setSarfVouchers] = useState([]);
  const [editSarf, setEditSarf] = useState(null);

  const load = async () => {
    const [a, v, ba] = await Promise.all([
      getAllocations(),
      user.role === 'admin' ? getVouchers() : getVouchers(user.source),
      getBabAllocations(),
    ]);
    setAllocs(a);
    setVouchers(v);
    setBabAllocs(ba);
    if (user.role === 'voucher') setSarfVouchers(await getSarfVouchers());
  };
  useEffect(() => { load(); }, []);

  const handleSaveAlloc = async () => {
    await updateAllocation(editAlloc.source, editAlloc.value);
    setEditAlloc(null); load();
  };

  const handleSaveBabAlloc = async () => {
    await updateBabAllocation(editBabAlloc.source, editBabAlloc.bab, editBabAlloc.value);
    setEditBabAlloc(null); load();
  };

  const handleDelete = async (id) => {
    if (!confirm('هل تريد حذف هذه المعاملة؟')) return;
    await deleteVoucher(id); load();
  };

  const handleSaveItem = async (updated) => {
    await api.put(`/vouchers/${updated.id}`, {
      chk_amt:  updated.chkAmt,
      chk_no:   updated.chkNo,
      doc_no:   updated.docNo,
      doc_date: updated.docDate,
      details:  updated.details,
      payee:    updated.payee,
      notes:    updated.notes,
      rows:     updated.rows,
    });
    setEditItem(null); load();
  };

  const handleArchiveSave = async () => {
    await api.patch(`/vouchers/${archiveItem.id}/archive`, { archive_img: archiveImg });
    setArchiveItem(null); setArchiveImg(null); load();
  };

  const handleDeleteSarf = async (id) => {
    if (!confirm('هل تريد حذف هذا المستند؟')) return;
    await deleteVoucher(id); load();
  };

  const handleSaveSarf = async () => {
    await api.put(`/vouchers/${editSarf.id}`, {
      chk_amt:  editSarf.chkAmt,
      chk_no:   editSarf.chkNo,
      doc_no:   editSarf.docNo,
      doc_date: editSarf.docDate,
      details:  editSarf.details,
      payee:    editSarf.payee,
      notes:    editSarf.notes,
    });
    setEditSarf(null); load();
  };

  return (
    <div className="page-bg flex font-arabic">

      <Sidebar user={user} theme={theme} toggleTheme={toggleTheme}
        onLogout={onLogout} tab={tab} setTab={setTab} />

      <div className="flex-1 min-h-screen overflow-auto z-10">
        <div className="px-3 md:px-7 pt-16 md:pt-[28px] pb-6">

          {/* ── داشبورد الإحصائيات ── */}
          {tab === 'dashboard' && (
            <div>
              {user.role === 'admin' ? (
                <AdminDashboard
                  user={user} allocs={allocs} vouchers={vouchers}
                  babAllocs={babAllocs} theme={theme} toggleTheme={toggleTheme}
                  onEditAlloc={setEditAlloc}
                  onExpandBabs={src => setExpandedSrc(prev => prev === src ? null : src)}
                  onRefresh={load} />
              ) : user.role === 'accountant' ? (
                <AccountantDashboard
                  user={user} allocs={allocs} vouchers={vouchers}
                  babAllocs={babAllocs} theme={theme}
                  onEditAlloc={setEditAlloc}
                  onExpandBabs={src => setExpandedSrc(prev => prev === src ? null : src)} />
              ) : null}
            </div>
          )}

          {/* ── داشبورد يوزر الصرف ── */}
          {user.role === 'voucher' && (
            <div>
              <div className="text-[22px] font-bold mb-5 font-arabic"
                style={{ color: 'var(--th-accent)' }}>
                📄 مستندات الصرف
              </div>
              {sarfVouchers.length === 0 ? (
                <div className="text-center py-16 text-sm font-arabic"
                  style={{ color: 'var(--th-text-muted)' }}>
                  لا توجد مستندات صرف بعد
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm font-arabic">
                    <thead>
                      <tr style={{
                        background: 'color-mix(in srgb, var(--th-accent) 15%, transparent)',
                        borderBottom: '1px solid color-mix(in srgb, var(--th-accent) 30%, transparent)',
                      }}>
                        {['رقم المستند', 'تاريخ المستند', 'المستلم', 'المبلغ الكلي', 'تاريخ الإضافة', 'الإجراءات'].map(h => (
                          <th key={h} className="px-3.5 py-3 text-right font-semibold"
                            style={{ color: 'var(--th-accent)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sarfVouchers.slice().reverse().map((v, i) => (
                        <tr key={v.id} className={i % 2 === 0 ? 'tr-even' : 'tr-odd'}
                          style={{ borderBottom: '1px solid var(--th-border)' }}>
                          <td className="px-3.5 py-2.5 text-[11px]" style={{ color: 'var(--th-text-sub)' }}>
                            {v.docNo || '-'}
                          </td>
                          <td className="px-3.5 py-2.5" style={{ color: 'var(--th-text)' }}>{v.docDate || '-'}</td>
                          <td className="px-3.5 py-2.5" style={{ color: 'var(--th-text)' }}>{v.mustalam || '-'}</td>
                          <td className="px-3.5 py-2.5 font-bold" style={{ color: 'var(--th-accent)' }}>
                            {v.chkAmt ? Number(v.chkAmt).toLocaleString('en-US') : '-'}
                          </td>
                          <td className="px-3.5 py-2.5 text-[11px]" style={{ color: 'var(--th-text-muted)' }}>
                            {v.docDate || '-'}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <div className="flex gap-1.5">
                              <button onClick={() => setEditSarf({ ...v })}
                                className="rounded-md px-2.5 py-1 text-xs cursor-pointer transition-all font-arabic"
                                style={{
                                  background: 'color-mix(in srgb, var(--th-accent) 20%, transparent)',
                                  border: '1px solid color-mix(in srgb, var(--th-accent) 50%, transparent)',
                                  color: 'var(--th-accent)',
                                }}>✏️ تعديل</button>
                              <button onClick={() => handleDeleteSarf(v.id)}
                                className="rounded-md px-2.5 py-1 text-xs cursor-pointer transition-all font-arabic"
                                style={{
                                  background: 'rgba(239,68,68,0.1)',
                                  border: '1px solid rgba(239,68,68,0.3)',
                                  color: 'var(--th-red-text)',
                                }}>🗑️ حذف</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── المعاملات ── */}
          {tab === 'vouchers' && (
            user.role === 'admin'
              ? <AdminVouchers vouchers={vouchers} theme={theme} />
              : <AccountantVouchers vouchers={vouchers} theme={theme}
                onEdit={setEditItem}
                onDelete={handleDelete}
                onArchive={v => { setArchiveItem(v); setArchiveImg(null); }}
                onViewArchive={setViewArchive} />
          )}
        </div>

        {/* ── Modals ── */}
        {editItem && <ModalEditItem item={editItem} theme={theme} onChange={setEditItem} onSave={() => handleSaveItem(editItem)} onClose={() => setEditItem(null)} />}
        {editAlloc && <ModalEditAlloc alloc={editAlloc} theme={theme} onChange={setEditAlloc} onSave={handleSaveAlloc} isAdmin={user.role === 'admin'} user={user.name} onClose={() => setEditAlloc(null)} />}
        {expandedSrc && <ModalBabs source={expandedSrc} theme={theme} babAllocs={babAllocs} onEditBab={v => setEditBabAlloc({ ...v, user: user.name })} onClose={() => setExpandedSrc(null)} canEdit={user.role === 'accountant' || user.role === 'admin'} />}
        {editBabAlloc && <ModalEditBab editBabAlloc={editBabAlloc} theme={theme} onChange={setEditBabAlloc} onSave={user.role === 'admin' ? handleSaveBabAlloc : undefined} isAdmin={user.role === 'admin'} onClose={() => setEditBabAlloc(null)} />}
        {archiveItem && <ModalArchive item={archiveItem} theme={theme} archiveImg={archiveImg} onImgChange={setArchiveImg} onSave={handleArchiveSave} onClose={() => { setArchiveItem(null); setArchiveImg(null); }} />}
        {viewArchive && <ModalViewArchive item={viewArchive} theme={theme} onReplace={() => { setArchiveItem(viewArchive); setArchiveImg(viewArchive.archiveImg); setViewArchive(null); }} onClose={() => setViewArchive(null)} />}

        {/* ── Modal تعديل مستند الصرف ── */}
        {editSarf && (
          <div className="modal-overlay">
            <div className="modal-card font-arabic" style={{ width: '96vw', maxWidth: 1080, maxHeight: '93vh', overflowY: 'auto' }}>

              {/* رأس الـ modal */}
              <div className="modal-header">
                <div className="text-base font-bold" style={{ color: 'var(--th-accent)' }}>✏️ تعديل مستند الصرف</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const docHTML = buildDocHTML(editSarf, editSarf.rows || []);
                      const w = window.open('', '_blank');
                      w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head>
                        <meta charset="UTF-8">
                        <link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
                        <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Naskh Arabic',serif;direction:rtl;background:#fff}@page{size:A4;margin:8mm 10mm}</style>
                      </head><body>${docHTML}</body></html>`);
                      w.document.close();
                      setTimeout(() => w.print(), 700);
                    }}
                    className="rounded-lg px-3.5 py-2 text-xs font-bold cursor-pointer font-arabic"
                    style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.4)', color: '#60a5fa' }}>
                    🖨️ عرض وطباعة
                  </button>
                  <button onClick={() => setEditSarf(null)} className="btn-close">✕</button>
                </div>
              </div>

              <div className="px-4 py-4">
                {/* المستند بشكل الوثيقة */}
                <div className="rounded-xl overflow-hidden mb-4" style={{ border: '2px solid var(--th-border)', background: 'var(--th-card-bg)' }}>

                  {/* هيدر 3 أعمدة */}
                  <div className="grid" style={{ gridTemplateColumns: '1fr auto 1fr', borderBottom: '1.5px solid var(--th-border)' }}>

                    {/* يمين */}
                    <div className="px-4 py-3" style={{ borderLeft: '1px solid var(--th-border)' }}>
                      <div className="text-xs mb-2 font-bold" style={{ color: 'var(--th-text-sub)' }}>اسم الدائرة: فحص وتصديق البذور</div>
                      {[['رقم المستند', 'docNo', 'text'], ['التاريخ', 'docDate', 'date']].map(([lbl, k, t]) => (
                        <div key={k} className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs whitespace-nowrap" style={{ color: 'var(--th-text-sub)' }}>{lbl}:</span>
                          <input type={t} value={editSarf[k] || ''} onChange={e => setEditSarf(v => ({ ...v, [k]: e.target.value }))}
                            className="flex-1 outline-none rounded text-center input-field" style={{ padding: '4px 6px', fontSize: 12 }} />
                        </div>
                      ))}
                    </div>

                    {/* وسط */}
                    <div className="flex flex-col items-center justify-center px-8 py-3 text-center">
                      <div className="text-2xl font-bold" style={{ color: 'var(--th-accent)', fontFamily: "'Noto Naskh Arabic',serif" }}>مستند صرف</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--th-text-sub)' }}>امانات صندوق دعم البذور</div>
                    </div>

                    {/* يسار */}
                    <div className="px-4 py-3" style={{ borderRight: '1px solid var(--th-border)' }}>
                      {[['رقم الصك', 'chkNo', 'text'], ['مبلغ الصك', 'chkAmt', 'text'], ['التاريخ', 'chkDate', 'date']].map(([lbl, k, t]) => (
                        <div key={k} className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs whitespace-nowrap" style={{ color: 'var(--th-text-sub)' }}>{lbl}:</span>
                          <input type={t} value={editSarf[k] || ''}
                            onChange={e => {
                              if (k === 'chkAmt') {
                                const raw = e.target.value.replace(/,/g, '');
                                if (raw === '' || /^\d*$/.test(raw)) {
                                  const formatted = raw ? Number(raw).toLocaleString('en-US') : '';
                                  setEditSarf(v => ({ ...v, chkAmt: formatted }));
                                }
                              } else {
                                setEditSarf(v => ({ ...v, [k]: e.target.value }));
                              }
                            }}
                            className="flex-1 outline-none rounded text-center input-field" style={{ padding: '4px 6px', fontSize: 12 }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* نصادق */}
                  <div className="text-center py-2 text-sm font-bold font-arabic"
                    style={{ background: 'var(--th-surface-alt)', borderBottom: '1px solid var(--th-border)', color: 'var(--th-text)' }}>
                    نصادق على صرف المبلغ المبين تفاصيله ادناه
                  </div>

                  {/* الجدول */}
                  <div className="overflow-x-auto">
                    <table className="border-collapse text-xs font-arabic" style={{ width: '100%', minWidth: 700 }}>
                      <colgroup>
                        <col style={{ width: 90 }} /><col style={{ width: 90 }} />
                        <col style={{ width: 90 }} /><col style={{ width: 90 }} />
                        <col style={{ width: 160 }} />
                        <col style={{ width: 36 }} /><col style={{ width: 36 }} /><col style={{ width: 36 }} />
                      </colgroup>
                      <thead>
                        <tr style={{ background: '#1a3a5c' }}>
                          <th colSpan={2} className="px-2 py-2 text-center text-white border" style={{ borderColor: 'var(--th-border)' }}>٣</th>
                          <th colSpan={2} className="px-2 py-2 text-center text-white border" style={{ borderColor: 'var(--th-border)' }}>٤</th>
                          <th rowSpan={2} className="px-2 py-2 text-center text-white border" style={{ borderColor: 'var(--th-border)' }}>التفاصيل</th>
                          <th colSpan={3} className="px-2 py-2 text-center text-white border" style={{ borderColor: 'var(--th-border)' }}>الدليل المحاسبي</th>
                        </tr>
                        <tr style={{ background: '#2a5a8c' }}>
                          {['مدين', 'دائن', 'مدين', 'دائن'].map((h, i) => (
                            <th key={i} className="px-2 py-1.5 text-center text-white border" style={{ borderColor: 'var(--th-border)' }}>{h}</th>
                          ))}
                          {['٣', '٤', '٥'].map(h => (
                            <th key={h} className="px-2 py-1.5 text-center text-white border" style={{ borderColor: 'var(--th-border)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(editSarf.rows || []).map((rawRow, i) => {
                          const row = 'tafasil' in rawRow ? rawRow : {
                            m3: rawRow.type !== 'credit' ? (rawRow.m3 || '') : '',
                            d3: rawRow.type === 'credit' ? (rawRow.d3 || '') : '',
                            m4: rawRow.type !== 'credit' ? (rawRow.m4 || '') : '',
                            d4: rawRow.type === 'credit' ? (rawRow.d4 || '') : '',
                            tafasil: rawRow.type !== 'credit' ? (rawRow.from || '') : (rawRow.to || ''),
                            dal3: '', dal4: '', dal5: '',
                          };
                          const upd = (fld, val) => {
                            const rows = (editSarf.rows || []).map((r, idx) => idx === i ? { ...row, [fld]: val } : r);
                            setEditSarf(v => ({ ...v, rows }));
                          };
                          const cellStyle = { background: 'var(--th-input-bg)', border: '1px solid var(--th-input-border)', color: 'var(--th-text)', padding: '5px 3px', fontSize: 12, width: '100%', outline: 'none', borderRadius: 3 };
                          return (
                            <tr key={i} className={i % 2 === 0 ? 'tr-even' : 'tr-odd'}>
                              {['m3', 'd3', 'm4', 'd4'].map(f => (
                                <td key={f} className="p-0.5 border" style={{ borderColor: 'var(--th-border)' }}>
                                  <input value={row[f] || ''} onChange={e => upd(f, e.target.value)} style={{ ...cellStyle, textAlign: 'center' }} />
                                </td>
                              ))}
                              <td className="p-0.5 border" style={{ borderColor: 'var(--th-border)' }}>
                                <TafasilInput value={row.tafasil || ''} onChange={v => upd('tafasil', v)} />
                              </td>
                              {['dal3', 'dal4', 'dal5'].map(f => (
                                <td key={f} className="p-0.5 border" style={{ borderColor: 'var(--th-border)' }}>
                                  <input value={row[f] || ''} onChange={e => upd(f, e.target.value)} style={{ ...cellStyle, textAlign: 'center', fontSize: 11, padding: '4px 2px' }} />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* التواقيع — 4 أعمدة */}
                  <div className="grid grid-cols-4 font-arabic" style={{ borderTop: '2px solid var(--th-border)' }}>
                    <div className="px-3 py-3 flex flex-col gap-3" style={{ borderLeft: '1px solid var(--th-border)' }}>
                      {[['munazzim', 'المنظم'], ['mustalam', 'توقيع المستلم'], ['ism', 'الاسم']].map(([k, lbl]) => (
                        <div key={k}>
                          <div className="text-[11px] font-bold mb-1" style={{ color: 'var(--th-text-sub)' }}>{lbl}:</div>
                          <input value={editSarf[k] || ''} onChange={e => setEditSarf(v => ({ ...v, [k]: e.target.value }))} className="w-full outline-none"
                            style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--th-border)', color: 'var(--th-text)', padding: '3px 2px', fontSize: 12 }} />
                        </div>
                      ))}
                    </div>
                    <div className="px-3 py-3 flex flex-col gap-3" style={{ borderLeft: '1px solid var(--th-border)' }}>
                      {[['muhasib', 'المحاسب'], ['mudaqqiq', 'المدقق']].map(([k, lbl]) => (
                        <div key={k}>
                          <div className="text-[11px] font-bold mb-1" style={{ color: 'var(--th-text-sub)' }}>{lbl}:</div>
                          <input value={editSarf[k] || ''} onChange={e => setEditSarf(v => ({ ...v, [k]: e.target.value }))} className="w-full outline-none"
                            style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--th-border)', color: 'var(--th-text)', padding: '3px 2px', fontSize: 12 }} />
                        </div>
                      ))}
                    </div>
                    <div className="px-3 py-3 flex flex-col gap-3" style={{ borderLeft: '1px solid var(--th-border)' }}>
                      {[['dirHisabat', 'مدير الحسابات'], ['dirTadqiq', 'مدير التدقيق']].map(([k, lbl]) => (
                        <div key={k}>
                          <div className="text-[11px] font-bold mb-1" style={{ color: 'var(--th-text-sub)' }}>{lbl}:</div>
                          <input value={editSarf[k] || ''} onChange={e => setEditSarf(v => ({ ...v, [k]: e.target.value }))} className="w-full outline-none"
                            style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--th-border)', color: 'var(--th-text)', padding: '3px 2px', fontSize: 12 }} />
                        </div>
                      ))}
                    </div>
                    <div className="px-3 py-3 flex flex-col gap-3">
                      {[['raees', 'رئيس الدائرة']].map(([k, lbl]) => (
                        <div key={k}>
                          <div className="text-[11px] font-bold mb-1" style={{ color: 'var(--th-text-sub)' }}>{lbl}:</div>
                          <input value={editSarf[k] || ''} onChange={e => setEditSarf(v => ({ ...v, [k]: e.target.value }))} className="w-full outline-none"
                            style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--th-border)', color: 'var(--th-text)', padding: '3px 2px', fontSize: 12 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* أزرار */}
                <div className="flex gap-2.5">
                  <button onClick={handleSaveSarf}
                    className="flex-[2] py-3 rounded-lg text-sm font-bold cursor-pointer border-none text-white font-arabic"
                    style={{ background: 'linear-gradient(135deg,var(--th-green),#059669)' }}>
                    💾 حفظ التعديلات
                  </button>
                  <button onClick={() => setEditSarf(null)} className="btn-secondary flex-1 py-3 text-sm rounded-lg font-arabic">
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
