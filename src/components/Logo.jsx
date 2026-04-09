export const LOGO_SRC = '/logo.png';

export function AppLogo({ size = 60, className = '' }) {
  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      <img
        src={LOGO_SRC}
        alt="شعار الدائرة"
        className="w-full h-full object-contain"
        onError={e => {
          e.target.style.display = 'none';
          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
        }}
      />
      <div
        className="absolute inset-0 hidden items-center justify-center rounded-full text-xl font-bold"
        style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b', display: 'none' }}>
        🌱
      </div>
    </div>
  );
}
