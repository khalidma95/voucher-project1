import { useState } from 'react';
import { requestBabEdit } from '../../store/db.js';
import { fmt } from './constants.js';

export default function ModalEditAlloc({ alloc, onChange, onSave, onClose, isAdmin=false, user='' }) {
  const [success, setSuccess] = useState('');

  const handleRequest = async () => {
    await requestBabEdit({
      source:   alloc.source,
      bab:      '__total__',
      oldValue: 0,
      newValue: alloc.value,
      user,
    });
    setSuccess('✅ تم إرسال الطلب — بانتظار موافقة الأدمن');
    setTimeout(() => { setSuccess(''); onClose(); }, 1800);
  };

  return (
    <div className="modal-overlay" style={{ direction:'rtl' }}>
      <div className="modal-card w-[380px] p-[32px_28px] font-arabic">

        <div className="text-base font-bold mb-1.5"
          style={{ color: isAdmin ? 'var(--th-accent)' : '#818cf8' }}>
          {isAdmin ? '✏️ تعديل التخصيص' : '📤 طلب تعديل التخصيص'}
        </div>
        <div className="text-xs text-th-muted mb-5">{alloc.source}</div>

        <div className="mb-5">
          <div className="field-label">المبلغ الكلي (دينار)</div>
          <input type="number" value={alloc.value}
            onChange={e => onChange({...alloc, value:e.target.value})}
            className="input-field text-center text-[15px]"/>
          {Number(alloc.value) > 0 && (
            <div className="text-[11px] text-th-muted mt-1.5 text-center">
              {fmt(alloc.value)} دينار
            </div>
          )}
        </div>

        {!isAdmin && (
          <div className="text-[11px] text-center rounded-lg p-[8px_12px] mb-4"
            style={{ color:'#818cf8', background:'rgba(129,140,248,0.1)', border:'1px solid rgba(129,140,248,0.2)' }}>
            ⚠️ سيتم تطبيق التعديل بعد موافقة الأدمن
          </div>
        )}

        {success && <div className="alert-success mb-4">{success}</div>}

        <div className="flex gap-2.5">
          {isAdmin ? (
            <button onClick={onSave} className="btn-primary flex-1 py-3">💾 حفظ</button>
          ) : (
            <button onClick={handleRequest}
              className="flex-[2] py-3 rounded-lg text-sm font-bold cursor-pointer font-arabic"
              style={{ background:'linear-gradient(135deg,#818cf8,#6366f1)', color:'#fff', border:'none' }}>
              📤 إرسال الطلب للأدمن
            </button>
          )}
          <button onClick={onClose} className="btn-secondary flex-1 py-3 rounded-lg">إلغاء</button>
        </div>
      </div>
    </div>
  );
}
