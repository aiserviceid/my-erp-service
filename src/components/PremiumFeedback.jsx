import { useEffect, useState } from 'react';

const inferTone = (message = '') => {
  const lower = String(message).toLowerCase();
  if (lower.includes('gagal') || lower.includes('error') || lower.includes('salah')) return 'error';
  if (lower.includes('berhasil') || lower.includes('sukses')) return 'success';
  if (lower.includes('peringatan') || lower.includes('tidak boleh') || lower.includes('hapus') || lower.includes('reset')) return 'warning';
  return 'info';
};

const tones = {
  success: { background: 'linear-gradient(135deg, rgba(5,150,105,.97), rgba(16,185,129,.94))', icon: '✓', accent: '#10b981' },
  error: { background: 'linear-gradient(135deg, rgba(185,28,28,.97), rgba(239,68,68,.94))', icon: '!', accent: '#ef4444' },
  warning: { background: 'linear-gradient(135deg, rgba(180,83,9,.97), rgba(245,158,11,.94))', icon: '!', accent: '#f59e0b' },
  info: { background: 'linear-gradient(135deg, rgba(15,23,42,.98), rgba(30,41,59,.95))', icon: 'i', accent: '#0284c7' },
};

export default function PremiumFeedback() {
  const [items, setItems] = useState([]);
  const [dialog, setDialog] = useState(null);

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

    const askConfirm = (options) => new Promise((resolve) => {
      const payload = typeof options === 'string'
        ? { title: 'Konfirmasi tindakan', message: options }
        : (options || {});
      setDialog({
        kind: 'confirm',
        title: payload.title || 'Konfirmasi tindakan',
        message: payload.message || payload.description || 'Lanjutkan tindakan ini?',
        tone: payload.tone || inferTone(`${payload.title || ''} ${payload.message || ''}`),
        confirmText: payload.confirmText || 'Lanjutkan',
        cancelText: payload.cancelText || 'Batal',
        resolve,
      });
    });

    const askPrompt = (options, initialValue = '') => new Promise((resolve) => {
      const payload = typeof options === 'string'
        ? { title: 'Masukkan data', message: options, initialValue }
        : (options || {});
      setDialog({
        kind: 'prompt',
        title: payload.title || 'Masukkan data',
        message: payload.message || payload.description || 'Isi kolom berikut untuk melanjutkan.',
        tone: payload.tone || inferTone(`${payload.title || ''} ${payload.message || ''}`),
        confirmText: payload.confirmText || 'Simpan',
        cancelText: payload.cancelText || 'Batal',
        inputLabel: payload.inputLabel || 'Isian',
        inputPlaceholder: payload.inputPlaceholder || '',
        inputType: payload.inputType || 'text',
        value: payload.initialValue ?? initialValue ?? '',
        resolve,
      });
    });

    window.UnitProToast = pushToast;
    window.UnitProConfirm = askConfirm;
    window.UnitProPrompt = askPrompt;
    window.alert = (message) => pushToast({ message, type: inferTone(message) });

    const listener = (event) => pushToast(event.detail);
    window.addEventListener('unitpro:toast', listener);

    return () => {
      window.alert = originalAlert;
      window.removeEventListener('unitpro:toast', listener);
      delete window.UnitProToast;
      delete window.UnitProConfirm;
      delete window.UnitProPrompt;
    };
  }, []);

  const closeDialog = (value) => {
    if (dialog?.resolve) dialog.resolve(value);
    setDialog(null);
  };

  const submitDialog = () => {
    closeDialog(dialog?.kind === 'prompt' ? (dialog.value ?? '') : true);
  };

  const dialogTone = tones[dialog?.tone] || tones.info;

  return (
    <>
      <style>{`@keyframes unitproToastIn{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}} @keyframes unitproModalIn{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
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
              <span style={{ fontSize: '.88rem', lineHeight: 1.45, fontWeight: 700, whiteSpace: 'pre-line' }}>{item.message}</span>
              <button type="button" onClick={() => setItems((current) => current.filter((next) => next.id !== item.id))} style={{ border: 0, background: 'rgba(255,255,255,.14)', color: 'white', borderRadius: 10, width: 28, height: 28, cursor: 'pointer', fontWeight: 900 }}>×</button>
            </div>
          );
        })}
      </div>

      {dialog && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog(dialog?.kind === 'prompt' ? null : false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99998,
            background: 'rgba(2, 6, 23, .58)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={dialog.title}
            style={{
              width: 'min(440px, 100%)',
              background: 'white',
              borderRadius: 24,
              boxShadow: '0 35px 90px rgba(2, 6, 23, .35)',
              border: '1px solid rgba(226, 232, 240, .9)',
              overflow: 'auto',
              maxHeight: 'min(640px, calc(100dvh - 36px))',
              animation: 'unitproModalIn 180ms ease-out',
            }}
            onSubmit={(event) => {
              event.preventDefault();
              submitDialog();
            }}
          >
            <div style={{ padding: '22px 22px 12px 22px', display: 'flex', gap: 14 }}>
              <span style={{ width: 42, height: 42, borderRadius: 16, background: `${dialogTone.accent}18`, color: dialogTone.accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem', flex: '0 0 auto' }}>
                {dialogTone.icon}
              </span>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: '#0f172a', fontWeight: 900 }}>{dialog.title}</h3>
                <p style={{ margin: 0, color: '#475569', fontSize: '.9rem', lineHeight: 1.55, whiteSpace: 'pre-line' }}>{dialog.message}</p>
                {dialog.kind === 'prompt' && (
                  <label style={{ display: 'grid', gap: 7, marginTop: 16, color: '#334155', fontSize: '.82rem', fontWeight: 800 }}>
                    {dialog.inputLabel}
                    <input
                      autoFocus
                      type={dialog.inputType}
                      value={dialog.value}
                      placeholder={dialog.inputPlaceholder}
                      onChange={(event) => setDialog((current) => ({ ...current, value: event.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${dialogTone.accent}66`, borderRadius: 12, padding: '12px 13px', color: '#0f172a', fontSize: '1rem', outline: 'none' }}
                    />
                  </label>
                )}
              </div>
            </div>
            <div style={{ padding: '14px 22px 22px 22px', display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => closeDialog(dialog.kind === 'prompt' ? null : false)} style={{ border: '1px solid #e2e8f0', background: '#f8fafc', color: '#334155', borderRadius: 12, padding: '10px 16px', fontWeight: 800, cursor: 'pointer' }}>
                {dialog.cancelText}
              </button>
              <button type="submit" style={{ border: 0, background: dialogTone.accent, color: 'white', borderRadius: 12, padding: '10px 16px', fontWeight: 900, cursor: 'pointer', boxShadow: `0 10px 22px ${dialogTone.accent}35` }}>
                {dialog.confirmText}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
