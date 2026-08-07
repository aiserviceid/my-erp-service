import { useEffect, useState } from 'react';

const inferTone = (message = '') => {
  const lower = String(message).toLowerCase();
  if (lower.includes('gagal') || lower.includes('error') || lower.includes('salah')) return 'error';
  if (lower.includes('berhasil') || lower.includes('sukses')) return 'success';
  if (lower.includes('peringatan') || lower.includes('tidak boleh')) return 'warning';
  return 'info';
};

const tones = {
  success: { background: 'linear-gradient(135deg, rgba(5,150,105,.97), rgba(16,185,129,.94))', icon: '✓' },
  error: { background: 'linear-gradient(135deg, rgba(185,28,28,.97), rgba(239,68,68,.94))', icon: '!' },
  warning: { background: 'linear-gradient(135deg, rgba(180,83,9,.97), rgba(245,158,11,.94))', icon: '!' },
  info: { background: 'linear-gradient(135deg, rgba(15,23,42,.98), rgba(30,41,59,.95))', icon: 'i' },
};

export default function PremiumFeedback() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const originalAlert = window.alert;

    const pushToast = (detail) => {
      const message = typeof detail === 'string' ? detail : detail?.message;
      if (!message) return;
      const tone = typeof detail === 'string' ? inferTone(detail) : (detail?.type || inferTone(message));
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setItems((current) => [...current.slice(-3), { id, message: String(message), tone }]);
      window.setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== id));
      }, tone === 'error' ? 5200 : 3600);
    };

    window.UnitProToast = pushToast;
    window.alert = (message) => pushToast({ message, type: inferTone(message) });

    const listener = (event) => pushToast(event.detail);
    window.addEventListener('unitpro:toast', listener);

    return () => {
      window.alert = originalAlert;
      window.removeEventListener('unitpro:toast', listener);
      delete window.UnitProToast;
    };
  }, []);

  return (
    <>
      <style>{`@keyframes unitproToastIn{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'fixed',
          right: 18,
          bottom: 18,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          width: 'min(380px, calc(100vw - 28px))',
          pointerEvents: 'none',
        }}
      >
        {items.map((item) => {
          const tone = tones[item.tone] || tones.info;
          return (
            <div
              key={item.id}
              style={{
                borderRadius: 18,
                padding: '14px 16px',
                boxShadow: '0 22px 55px rgba(15, 23, 42, 0.22)',
                border: '1px solid rgba(255,255,255,0.16)',
                color: 'white',
                pointerEvents: 'auto',
                display: 'grid',
                gridTemplateColumns: '32px 1fr auto',
                alignItems: 'center',
                gap: 12,
                animation: 'unitproToastIn 220ms ease-out',
                backdropFilter: 'blur(18px)',
                background: tone.background,
              }}
            >
              <span style={{ width: 30, height: 30, borderRadius: 12, background: 'rgba(255,255,255,.18)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{tone.icon}</span>
              <span style={{ fontSize: '.88rem', lineHeight: 1.45, fontWeight: 700 }}>{item.message}</span>
              <button type="button" onClick={() => setItems((current) => current.filter((next) => next.id !== item.id))} style={{ border: 0, background: 'rgba(255,255,255,.14)', color: 'white', borderRadius: 10, width: 28, height: 28, cursor: 'pointer', fontWeight: 900 }}>×</button>
            </div>
          );
        })}
      </div>
    </>
  );
}
