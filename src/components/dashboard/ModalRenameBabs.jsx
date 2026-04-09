import { useState, useEffect, useRef } from "react";
import { getBabNamesForSource, renameBab, addBab } from "../../store/db.js";
import { getSC } from "./constants.js";

export default function ModalRenameBabs({ source, theme, onClose, onSaved }) {
  const sc = getSC(source, theme.name);
  const initialNamesRef = useRef([]);

  const [names,    setNames]    = useState([]);
  const [newBab,   setNewBab]   = useState('');
  const [addError, setAddError] = useState('');
  const [saved,    setSaved]    = useState(false);

  useEffect(() => {
    getBabNamesForSource(source).then(n => {
      initialNamesRef.current = [...n];
      setNames([...n]);
    });
  }, [source]);

  const handleAddBab = () => {
    const trimmed = newBab.trim();
    if (!trimmed) return;
    if (names.includes(trimmed)) { setAddError('هذا الاسم موجود مسبقاً'); return; }
    setNames(prev => [...prev, trimmed]);
    setNewBab('');
    setAddError('');
  };

  const handleSave = async () => {
    const initialNames = initialNamesRef.current;
    for (let i = 0; i < names.length; i++) {
      const newName = names[i];
      if (i < initialNames.length) {
        const oldName = initialNames[i];
        if (newName.trim() && newName.trim() !== oldName) await renameBab(source, oldName, newName.trim());
      } else {
        await addBab(source, newName);
      }
    }
    setSaved(true);
    setTimeout(() => { onSaved(); onClose(); }, 700);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999, padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="rounded-2xl w-[95%] max-w-[560px] font-arabic"
        style={{ background: 'var(--th-modal-bg)', border: `1px solid ${sc.border}` }}>

        {/* رأس */}
        <div className="flex justify-between items-center px-6 py-[18px] rounded-t-2xl border-b border-th-border"
          style={{ background: sc.bg }}>
          <div className="text-base font-bold" style={{ color: sc.color }}>
            {sc.icon} إدارة أبواب الصرف — {source}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center cursor-pointer text-base border-none"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--th-text)' }}>✕</button>
        </div>

        <div className="p-6 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">

          {/* قائمة الأبواب الحالية */}
          <div className="flex flex-col gap-2.5">
            <div className="text-xs font-bold text-th-muted mb-1">الأبواب الحالية</div>
            {names.map((name, i) => {
              const isNew = i >= initialNamesRef.current.length;
              const isChanged = !isNew && initialNamesRef.current[i] !== name;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="text-xs text-th-muted w-5 text-center flex-shrink-0 font-arabic">{i + 1}</div>
                  <input
                    value={name}
                    onChange={e => {
                      const updated = [...names];
                      updated[i] = e.target.value;
                      setNames(updated);
                    }}
                    className="flex-1 rounded-lg px-4 py-2.5 text-sm font-arabic"
                    style={{
                      background: 'var(--th-surface-alt)',
                      border: `1px solid ${isNew ? '#34d399' : isChanged ? sc.color : 'var(--th-border)'}`,
                      color: 'var(--th-text)',
                      outline: 'none',
                      direction: 'rtl',
                    }}
                  />
                  {isNew && (
                    <div className="text-[10px] flex-shrink-0 font-arabic" style={{ color: '#34d399' }}>جديد</div>
                  )}
                  {isChanged && (
                    <div className="text-[10px] flex-shrink-0 font-arabic" style={{ color: sc.color }}>معدّل</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* إضافة باب جديد */}
          <div className="border-t border-th-border pt-4">
            <div className="text-xs font-bold text-th-muted mb-2">إضافة باب جديد</div>
            <div className="flex gap-2">
              <input
                value={newBab}
                onChange={e => { setNewBab(e.target.value); setAddError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleAddBab()}
                placeholder="اسم الباب الجديد..."
                className="flex-1 rounded-lg px-4 py-2.5 text-sm font-arabic"
                style={{
                  background: 'var(--th-surface-alt)',
                  border: `1px solid ${addError ? '#ef4444' : 'var(--th-border)'}`,
                  color: 'var(--th-text)',
                  outline: 'none',
                  direction: 'rtl',
                }}
              />
              <button onClick={handleAddBab}
                className="px-4 py-2.5 rounded-lg text-sm font-bold cursor-pointer font-arabic flex-shrink-0"
                style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)', color: '#34d399' }}>
                + إضافة
              </button>
            </div>
            {addError && (
              <div className="text-xs mt-1.5 font-arabic" style={{ color: '#ef4444' }}>{addError}</div>
            )}
          </div>
        </div>

        {/* أزرار الحفظ */}
        <div className="flex justify-end gap-3 px-6 pb-6 border-t border-th-border pt-4">
          <button onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm cursor-pointer font-arabic"
            style={{ background: 'var(--th-surface-alt)', border: '1px solid var(--th-border)', color: 'var(--th-text-muted)' }}>
            إلغاء
          </button>
          <button onClick={handleSave}
            className="px-5 py-2 rounded-lg text-sm font-bold cursor-pointer font-arabic"
            style={{
              background: saved ? 'rgba(52,211,153,0.2)' : `${sc.color}22`,
              border: `1px solid ${saved ? '#34d399' : sc.color}`,
              color: saved ? '#34d399' : sc.color,
            }}>
            {saved ? '✅ تم الحفظ' : '💾 حفظ التعديلات'}
          </button>
        </div>
      </div>
    </div>
  );
}
