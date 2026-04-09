import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from "react";
import { getVouchers, getAllocations } from "../store/db.js";
import Sidebar from "../components/Sidebar.jsx";
import { getBabs } from "../components/dashboard/constants.js";

const fmt = n => Number(n||0).toLocaleString('en-US');

export default function Reports({ user, onLogout, theme, toggleTheme }) {
  const navigate = useNavigate();
  const [vouchers,   setVouchers]   = useState([]);
  const [filterBab,  setFilterBab]  = useState('الكل');
  const [totalAlloc, setTotalAlloc] = useState(0);

  useEffect(() => {
    (async () => {
      const [v, allocs] = await Promise.all([getVouchers(user.source), getAllocations()]);
      setVouchers(v);
      const a = allocs.find(a => a.source === user.source);
      setTotalAlloc(a?.total || 0);
    })();
  }, []);

  const BABS     = ['الكل', ...getBabs(user.source)];
  const filtered = filterBab === 'الكل' ? vouchers : vouchers.filter(v => v.bab === filterBab);

  const handlePrint = () => {
    const totalSpent   = filtered.reduce((s,v) => s + Number(v.chkAmt||0), 0);
    const totalRemain  = totalAlloc - vouchers.reduce((s,v) => s + Number(v.chkAmt||0), 0);

    const rows = filtered.map(v => `
      <tr>
        <td>${v.chkAmt ? Number(v.chkAmt).toLocaleString('en-US') : '—'}</td>
        <td>${v.creditDate || '—'}</td>
        <td>${v.details || '—'}</td>
        <td>${v.bab || '—'}</td>
      </tr>`).join('');

    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Noto Naskh Arabic',serif;direction:rtl;padding:30px;background:#fff;color:#000}
  @page{size:A4 portrait;margin:15mm 12mm}
  h2{text-align:center;font-size:20px;font-weight:700;margin-bottom:20px}
  .meta{display:flex;justify-content:space-between;margin-bottom:16px;font-size:13px}
  .meta span{border-bottom:1px dotted #333;min-width:200px;display:inline-block;padding-bottom:2px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#1a3a5c;color:#fff;padding:10px 8px;text-align:center;font-weight:700;border:1px solid #1a3a5c}
  td{padding:8px;text-align:center;border:1px solid #aaa}
  tr:nth-child(even) td{background:#f5f5f5}
  .total-row td{font-weight:700;background:#fff3cd;border-top:2px solid #1a3a5c;text-align:right;padding:10px 14px}
  .summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;margin-top:16px;border:1.5px solid #1a3a5c;border-radius:6px;overflow:hidden}
  .summary-box{padding:12px 16px;text-align:center}
  .summary-box .lbl{font-size:11px;color:#555;margin-bottom:4px}
  .summary-box .val{font-size:15px;font-weight:700}
  .summary-box.alloc{background:#e8f0fe}
  .summary-box.spent{background:#fff3cd}
  .summary-box.remain{background:${totalRemain >= 0 ? '#e8f8e8' : '#fde8e8'}}
  .remain-val{color:${totalRemain >= 0 ? '#166534' : '#991b1b'}}
</style></head><body>
<h2>سجل التخصيصات وتوفر الاعتماد</h2>
<div class="meta">
  <div>المصدر : <span>${user.source}</span></div>
  <div>المادة : <span>${filterBab === 'الكل' ? 'الكل' : filterBab}</span></div>
</div>
<table>
  <thead><tr><th>المبلغ (دينار)</th><th>تاريخ توفر الاعتماد</th><th>التفاصيل</th><th>باب الصرف</th></tr></thead>
  <tbody>
    ${rows}
    <tr class="total-row">
      <td colspan="4">
        إجمالي المعروض: ${fmt(totalSpent)} دينار &nbsp;|&nbsp; عدد المعاملات: ${filtered.length}
      </td>
    </tr>
  </tbody>
</table>
<div class="summary">
  <div class="summary-box alloc">
    <div class="lbl">إجمالي التخصيص</div>
    <div class="val">${fmt(totalAlloc)} <small style="font-size:11px">دينار</small></div>
  </div>
  <div class="summary-box spent">
    <div class="lbl">إجمالي المصروف</div>
    <div class="val">${fmt(vouchers.reduce((s,v)=>s+Number(v.chkAmt||0),0))} <small style="font-size:11px">دينار</small></div>
  </div>
  <div class="summary-box remain">
    <div class="lbl">الباقي</div>
    <div class="val remain-val">${fmt(Math.abs(totalRemain))} <small style="font-size:11px">دينار${totalRemain < 0 ? ' (تجاوز)' : ''}</small></div>
  </div>
</div>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  return (
    <div className="page-bg flex font-arabic">
      <Sidebar user={user} theme={theme} toggleTheme={toggleTheme} onLogout={onLogout} />

      <div className="flex-1 overflow-auto px-7 pt-[68px] pb-6" style={{ color:'var(--th-text)' }}>

        {/* رأس */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-2xl font-bold" style={{ color:'var(--th-accent)' }}>
            📋 سجل التخصيصات وتوفر الاعتماد
          </div>
          <div className="flex gap-2.5">
            <button onClick={handlePrint}
              className="rounded-lg px-4 py-2.5 text-sm font-bold cursor-pointer font-arabic transition-all"
              style={{
                background: 'rgba(245,158,11,0.15)',
                border:     '1px solid rgba(245,158,11,0.4)',
                color:      '#f59e0b',
              }}>
              🖨️ طباعة التقرير
            </button>
            <button onClick={() => navigate('/dashboard')}
              className="btn-secondary rounded-lg px-4 py-2.5 text-sm font-arabic">
              ← رجوع
            </button>
          </div>
        </div>

        {/* معلومات المصدر */}
        <div className="flex gap-8 items-center rounded-xl px-5 py-3.5 mb-5"
          style={{
            background: 'var(--th-card-bg)',
            border:     '1px solid var(--th-border)',
          }}>
          <div>
            <div className="text-xs mb-0.5" style={{ color:'var(--th-text-muted)' }}>التخصيص الأجمالي</div>
            <div className="text-base font-bold" style={{ color:'var(--th-accent)' }}>{user.source}</div>
          </div>
          <div className="w-px h-9" style={{ background:'var(--th-border)' }} />
          <div>
            <div className="text-xs mb-0.5" style={{ color:'var(--th-text-muted)' }}>عدد المعاملات</div>
            <div className="text-base font-bold" style={{ color:'var(--th-text)' }}>{filtered.length}</div>
          </div>
          <div className="w-px h-9" style={{ background:'var(--th-border)' }} />
          <div>
            <div className="text-xs mb-0.5" style={{ color:'var(--th-text-muted)' }}>إجمالي المصروف</div>
            <div className="text-base font-bold" style={{ color:'var(--th-red)' }}>
              {fmt(filtered.reduce((s,v) => s+Number(v.chkAmt||0), 0))} دينار
            </div>
            {totalAlloc > 0 && (
              <div className="text-xs mt-0.5" style={{ color:'var(--th-text-muted)' }}>
                من أصل <span style={{ color:'var(--th-accent)', fontWeight:700 }}>{fmt(totalAlloc)}</span> دينار
              </div>
            )}
          </div>
        </div>

        {/* فلتر أبواب الصرف */}
        <div className="flex gap-2 flex-wrap mb-5">
          {BABS.map(b => {
            const active = filterBab === b;
            return (
              <button key={b} onClick={() => setFilterBab(b)}
                className="px-4 py-2 rounded-full text-sm cursor-pointer font-arabic transition-all"
                style={{
                  fontWeight:  active ? 700 : 400,
                  background:  active ? 'rgba(245,158,11,0.2)' : 'var(--th-surface-alt)',
                  border:      active ? '1px solid rgba(245,158,11,0.6)' : '1px solid var(--th-border)',
                  color:       active ? '#f59e0b' : 'var(--th-text-sub)',
                }}>
                {b}
              </button>
            );
          })}
        </div>

        {/* الجدول */}
        <div className="rounded-xl overflow-hidden"
          style={{
            background: 'var(--th-card-bg)',
            border:     '1px solid var(--th-border)',
          }}>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color:'var(--th-text-muted)' }}>
              لا توجد معاملات
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-arabic">
                <thead>
                  <tr style={{ background:'#1a3a5c' }}>
                    {['التخصيص','تاريخ توفر الاعتماد','التفاصيل','باب الصرف'].map(h => (
                      <th key={h} className="px-4 py-3.5 text-center text-sm font-bold"
                        style={{
                          color:      '#fff',
                          borderLeft: '1px solid rgba(255,255,255,0.1)',
                        }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v, i) => (
                    <tr key={v.id} className={i%2===0 ? 'tr-even' : 'tr-odd'}
                      style={{ borderBottom:'1px solid var(--th-border)' }}>
                      <td className="px-4 py-3 text-center text-sm font-bold" style={{ color:'var(--th-accent)' }}>
                        {v.chkAmt ? Number(v.chkAmt).toLocaleString('en-US') : '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm" style={{ color:'var(--th-text-sub)' }}>
                        {v.creditDate || '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm" style={{ color:'var(--th-text)' }}>
                        {v.details || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm px-3 py-1 rounded-full font-semibold"
                          style={{
                            background: 'rgba(245,158,11,0.12)',
                            color:      'var(--th-accent)',
                            border:     '1px solid rgba(245,158,11,0.3)',
                          }}>
                          {v.bab || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* الإجمالي */}
                  <tr style={{
                    background:  'rgba(245,158,11,0.08)',
                    borderTop:   '2px solid var(--th-border-accent)',
                  }}>
                    <td className="px-4 py-3 text-center text-base font-bold" style={{ color:'var(--th-accent)' }}>
                      {fmt(filtered.reduce((s,v)=>s+Number(v.chkAmt||0),0))}
                    </td>
                    <td colSpan={3} className="px-4 py-3 text-right text-sm font-bold"
                      style={{ color:'var(--th-text-sub)' }}>
                      الإجمالي — {filtered.length} معاملة
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
