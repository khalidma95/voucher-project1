import { useState, useEffect } from "react";
import { getBabAllocations, requestBabEdit } from "../../store/db.js";
import { fmt } from "./constants.js";

export default function ModalEditBab({ editBabAlloc, onChange, onSave, isAdmin=false, onClose }) {
  const [success,   setSuccess]   = useState('');
  const [error,     setError]     = useState('');
  const [babAllocs, setBabAllocs] = useState({});

  useEffect(() => { getBabAllocations().then(setBabAllocs); }, []);

  const key     = `${editBabAlloc.source}__${editBabAlloc.bab}`;
  const current = babAllocs[key] || { total:0, spent:0 };

  const validate = () => {
    const val = Number(editBabAlloc.value);
    if (!editBabAlloc.value && editBabAlloc.value !== 0) {
      setError('يرجى إدخال مبلغ الاعتماد الجديد'); return false;
    }
    if (isNaN(val) || val < 0) {
      setError('يجب أن يكون المبلغ رقماً صحيحاً موجباً'); return false;
    }
    if (val === current.total) {
      setError('الاعتماد الجديد مطابق للاعتماد الحالي — لا يوجد تغيير'); return false;
    }
    if (val < current.spent) {
      setError(`لا يمكن تحديد اعتماد أقل من المبلغ المصروف (${fmt(current.spent)})`); return false;
    }
    setError(''); return true;
  };

  const handleDirect = () => {
    if (!validate()) return;
    onSave && onSave(editBabAlloc);
    onClose();
  };

  const handleRequest = async () => {
    if (!validate()) return;
    await requestBabEdit({
      source:   editBabAlloc.source,
      bab:      editBabAlloc.bab,
      oldValue: current.total,
      newValue: editBabAlloc.value,
      user:     editBabAlloc.user || '',
    });
    setSuccess('✅ تم إرسال طلب التعديل — بانتظار موافقة الأدمن');
    setTimeout(() => { setSuccess(''); onClose(); }, 1800);
  };

  const diff = Number(editBabAlloc.value) - current.total;

  return (
    <div className="modal-overlay" style={{ direction:'rtl' }}>
      <div className="modal-card w-[400px] p-[28px_26px] font-arabic">

        <div className="text-base font-bold mb-1"
          style={{ color: isAdmin ? 'var(--th-accent)' : '#818cf8' }}>
          {isAdmin ? '✏️ تعديل باب الصرف' : '📤 طلب تعديل باب الصرف'}
        </div>
        <div className="text-xs text-th-muted mb-1">{editBabAlloc.source}</div>
        <div className="text-[13px] font-semibold text-th-text mb-5 rounded px-3 py-1.5 inline-block"
          style={{ background:'var(--th-surface-alt)' }}>
          {editBabAlloc.bab}
        </div>

        {/* القيم */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <div className="rounded-lg p-2.5 text-center" style={{ background:'rgba(0,0,0,0.15)' }}>
            <div className="text-[10px] text-th-muted mb-1">الاعتماد الحالي</div>
            <div className="text-[13px] font-bold text-th-sub">{fmt(current.total)}</div>
          </div>
          <div className="rounded-lg p-2.5 text-center"
            style={{ background:'rgba(129,140,248,0.1)', border:'1px solid rgba(129,140,248,0.2)' }}>
            <div className="text-[10px] text-th-muted mb-1">الاعتماد الجديد</div>
            <div className="text-[13px] font-bold" style={{ color:'#818cf8' }}>
              {editBabAlloc.value ? fmt(editBabAlloc.value) : '—'}
            </div>
          </div>
        </div>

        {/* الحقل */}
        <div className="mb-4">
          <div className="field-label">الاعتماد الجديد (دينار)</div>
          <input type="number" value={editBabAlloc.value || ''} placeholder="0"
            onChange={e => { setError(''); onChange({...editBabAlloc, value:e.target.value}); }}
            className="input-field text-center text-[15px]"
            style={{ border: error ? '1px solid #f87171' : undefined }}/>
          {error && (
            <div className="text-[11px] text-center font-semibold mt-1" style={{ color:'#f87171' }}>
              ⚠️ {error}
            </div>
          )}
          {!error && editBabAlloc.value && diff !== 0 && (
            <div className="text-[11px] text-center mt-1"
              style={{ color: diff > 0 ? '#34d399' : '#f59e0b' }}>
              {diff > 0
                ? `▲ زيادة ${fmt(diff)} دينار`
                : `▼ تخفيض ${fmt(-diff)} دينار`}
            </div>
          )}
        </div>

        {success && <div className="alert-success mb-4">{success}</div>}

        <div className="flex gap-2.5">
          <button onClick={onClose} className="btn-secondary flex-1 py-3 rounded-lg font-bold">إلغاء</button>
          <button onClick={isAdmin ? handleDirect : handleRequest}
            className="flex-[2] py-3 rounded-lg text-sm font-bold cursor-pointer font-arabic"
            style={{ background:'linear-gradient(135deg,#818cf8,#6366f1)', color:'#fff', border:'none' }}>
            {isAdmin ? '✅ موافق' : '📤 إرسال الطلب للأدمن'}
          </button>
        </div>
      </div>
    </div>
  );
}
