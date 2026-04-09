export default function ModalViewArchive({ item, onReplace, onClose }) {
  const img = item.archiveImg;
  return (
    <div className="modal-overlay" style={{ zIndex:10000, background:'rgba(0,0,0,0.85)', padding:20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="modal-card w-[90%] max-w-[800px] p-6 font-arabic">

        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="text-[15px] font-bold" style={{ color:'#60a5fa' }}>📎 عرض المستند المؤرشف</div>
            <div className="text-[11px] text-th-muted mt-0.5">{item.docNo} — {item.details}</div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-base border border-th-border text-th-muted"
            style={{ background:'rgba(255,255,255,0.06)' }}>✕</button>
        </div>

        {img?.startsWith('data:application/pdf') ? (
          <div className="rounded-xl overflow-hidden" style={{ background:'var(--th-surface-alt)' }}>
            <iframe src={img} style={{ width:'100%', height:'65vh', border:'none', display:'block' }} title="PDF مؤرشف"/>
          </div>
        ) : img ? (
          <div className="flex justify-center rounded-xl overflow-hidden" style={{ background:'var(--th-surface-alt)' }}>
            <img src={img} alt="مستند مؤرشف" style={{ maxWidth:'100%', maxHeight:'70vh', objectFit:'contain', display:'block' }}/>
          </div>
        ) : (
          <div className="text-center rounded-xl p-[40px_20px] text-th-muted" style={{ background:'var(--th-surface-alt)' }}>
            لا يوجد مستند مؤرشف
          </div>
        )}

        <div className="flex gap-2.5 mt-4 justify-between">
          <button onClick={onReplace}
            className="px-5 py-2.5 rounded-lg text-[13px] font-bold cursor-pointer font-arabic"
            style={{ background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)', color:'#f59e0b' }}>
            🔄 استبدال الملف
          </button>
          {img && (
            <button onClick={() => {
                const w = window.open('', '_blank');
                if (img.startsWith('data:application/pdf')) {
                  w.document.write(`<html><body style="margin:0"><iframe src="${img}" style="width:100%;height:100vh;border:none"/></body></html>`);
                } else {
                  w.document.write(`<html><body style="margin:0;background:#000"><img src="${img}" style="max-width:100%;display:block;margin:auto"/></body></html>`);
                }
                w.document.close();
              }}
              className="px-5 py-2.5 rounded-lg text-[13px] font-bold cursor-pointer font-arabic"
              style={{ background:'rgba(96,165,250,0.15)', border:'1px solid rgba(96,165,250,0.3)', color:'#60a5fa' }}>
              🔗 فتح في تبويب جديد
            </button>
          )}
          <button onClick={onClose}
            className="btn-secondary px-5 py-2.5 rounded-lg font-bold text-[13px]">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
