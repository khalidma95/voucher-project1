export default function ModalArchive({ item, archiveImg, onImgChange, onSave, onClose }) {
  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('يرجى رفع صورة PNG أو JPG أو PDF فقط'); return;
    }
    const reader = new FileReader();
    reader.onload = ev => onImgChange(ev.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="modal-overlay" style={{ direction:'rtl', padding:20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="modal-card w-[520px] p-7 font-arabic">

        <div className="text-base font-bold mb-1.5" style={{ color:'#60a5fa' }}>📎 أرشفة المستند</div>
        <div className="text-xs text-th-muted mb-5">{item.docNo} — {item.details}</div>

        {!archiveImg ? (
          <div
            onClick={() => document.getElementById('archiveFileInput').click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            className="rounded-xl p-[40px_20px] text-center cursor-pointer border-2 border-dashed border-th-border"
            style={{ background:'var(--th-surface-alt)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor='#60a5fa'}
            onMouseLeave={e => e.currentTarget.style.borderColor=''}>
            <div className="text-[48px] mb-3">📷</div>
            <div className="text-sm font-bold text-th-text mb-1.5">اسحب الملف هنا أو اضغط للاختيار</div>
            <div className="text-[11px] text-th-muted">PNG / JPG / PDF</div>
            <input id="archiveFileInput" type="file" accept="image/png,image/jpeg,application/pdf"
              className="hidden"
              onChange={e => handleFile(e.target.files[0])}
              onClick={e => e.target.value = null}/>
          </div>
        ) : (
          <div>
            <div className="rounded-lg overflow-hidden mb-4 text-center border border-th-border flex justify-center"
              style={{
                background: 'var(--th-surface-alt)',
                padding:    archiveImg.startsWith('pdf::') ? '30px' : 0,
              }}>
              {archiveImg.startsWith('data:application/pdf') ? (
                <div className="w-full">
                  <div className="text-[32px] mb-1.5 text-center">📄</div>
                  <div className="text-sm font-bold text-center mb-2" style={{ color:'#60a5fa' }}>ملف PDF</div>
                  <iframe src={archiveImg} style={{ width:'100%', height:240, border:'none' }} title="PDF"/>
                </div>
              ) : (
                <img src={archiveImg} alt="مستند" style={{ maxWidth:'100%', maxHeight:280, objectFit:'contain', display:'block' }}/>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => {
                  const w = window.open('', '_blank');
                  if (archiveImg.startsWith('data:application/pdf')) {
                    w.document.write(`<html><body style="margin:0"><iframe src="${archiveImg}" style="width:100%;height:100vh;border:none"/></body></html>`);
                  } else {
                    w.document.write(`<html><body style="margin:0;background:#000"><img src="${archiveImg}" style="max-width:100%;display:block;margin:auto"/></body></html>`);
                  }
                  w.document.close();
                }}
                className="px-4 py-2 rounded-lg text-xs cursor-pointer font-arabic"
                style={{ background:'rgba(96,165,250,0.15)', border:'1px solid rgba(96,165,250,0.3)', color:'#60a5fa' }}>
                👁️ عرض
              </button>
              <button onClick={() => onImgChange(null)}
                className="px-4 py-2 rounded-lg text-xs cursor-pointer font-arabic"
                style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5' }}>
                🗑️ إزالة
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2.5 mt-5">
          <button onClick={onClose} className="btn-secondary flex-1 py-2.5 rounded-lg font-bold">إلغاء</button>
          <button onClick={onSave} disabled={!archiveImg}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold font-arabic"
            style={{
              background: archiveImg ? 'rgba(96,165,250,0.2)' : 'var(--th-surface-alt)',
              border:     archiveImg ? '1px solid rgba(96,165,250,0.5)' : '1px solid var(--th-border)',
              color:      archiveImg ? '#60a5fa' : 'var(--th-text-muted)',
              cursor:     archiveImg ? 'pointer' : 'not-allowed',
            }}>
            💾 حفظ الأرشفة
          </button>
        </div>
      </div>
    </div>
  );
}
