import { getBabs } from './constants.js';

export default function ModalEditItem({ item, onChange, onSave, onClose }) {
  return (
    <div className="modal-overlay" style={{ direction:'rtl' }}>
      <div className="modal-card w-[460px] p-[28px_26px] font-arabic">
        <div className="text-base font-bold text-th-accent mb-5">✏️ تعديل المعاملة</div>

        <div className="mb-4">
          <div className="field-label">التفاصيل</div>
          <textarea value={item.details||''} rows={3}
            onChange={e => onChange({...item, details:e.target.value})}
            className="textarea-field" style={{ resize:'vertical', lineHeight:1.6 }}/>
        </div>

        <div className="mb-4">
          <div className="field-label">المبلغ (دينار)</div>
          <input type="number" value={item.chkAmt||''}
            onChange={e => onChange({...item, chkAmt:e.target.value})}
            className="input-field text-center font-semibold"/>
        </div>

        <div className="mb-5">
          <div className="field-label mb-2">باب الصرف</div>
          <div className="grid grid-cols-2 gap-1.5">
            {getBabs(item.source).map(b => (
              <button key={b} onClick={() => onChange({...item, bab:b})}
                className="py-2 px-3 rounded-lg cursor-pointer font-arabic text-xs font-semibold"
                style={{
                  background: item.bab===b ? 'color-mix(in srgb, var(--th-accent) 20%, transparent)' : 'var(--th-surface-alt)',
                  border:     item.bab===b ? '1px solid color-mix(in srgb, var(--th-accent) 50%, transparent)' : '1px solid var(--th-border)',
                  color:      item.bab===b ? 'var(--th-accent)' : 'var(--th-text-sub)',
                }}>
                {b}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2.5">
          <button onClick={onSave} className="btn-primary flex-1 py-3">💾 حفظ</button>
          <button onClick={onClose} className="btn-secondary flex-1 py-3 rounded-lg">إلغاء</button>
        </div>
      </div>
    </div>
  );
}
