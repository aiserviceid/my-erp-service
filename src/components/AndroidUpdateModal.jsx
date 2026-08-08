import React from 'react';
import { Smartphone, Download, X, Sparkles, CheckCircle } from 'lucide-react';
import { APP_VERSION, APK_PUBLIC_URL } from '../config/appInfo';

export default function AndroidUpdateModal({ updateInfo, onClose }) {
  if (!updateInfo) return null;

  const handleDownload = () => {
    const targetUrl = updateInfo.apkUrl || APK_PUBLIC_URL;
    window.open(targetUrl, '_blank');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '16px'
    }}>
      <div style={{
        background: 'white', borderRadius: '24px', width: '100%', maxWidth: '480px',
        padding: '1.8rem', boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        animation: 'fadeIn 0.3s ease-out', position: 'relative'
      }}>
        {!updateInfo.forceUpdate && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              background: '#f1f5f9', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px', cursor: 'pointer',
              fontSize: '1rem', fontWeight: '800', color: '#64748b'
            }}
          >
            ×
          </button>
        )}

        <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '20px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0f766e 100%)',
            color: 'white', display: 'grid', placeItems: 'center',
            margin: '0 auto 1rem auto', boxShadow: '0 10px 20px rgba(2, 132, 199, 0.3)'
          }}>
            <Smartphone size={32} />
          </div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', fontWeight: '900', color: '#0f172a' }}>
            🚀 Pembaruan Aplikasi Tersedia!
          </h3>
          <span style={{ fontSize: '0.82rem', color: '#0369a1', background: '#e0f2fe', padding: '4px 12px', borderRadius: '100px', fontWeight: '800' }}>
            Versi Baru: v{updateInfo.version || '1.2.0'} (Versi Anda: v{APP_VERSION})
          </span>
        </div>

        {/* CHANGELOG */}
        <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1.2rem', border: '1px solid #e2e8f0', marginBottom: '1.4rem' }}>
          <strong style={{ fontSize: '0.82rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Sparkles size={15} color="#d97706" /> Apa yang Baru di Versi Ini:
          </strong>
          <div style={{ display: 'grid', gap: '6px' }}>
            {(updateInfo.changelog || [
              'Peningkatan performa & pembaruan fitur terbaru UnitPro.'
            ]).map((item, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: '#475569', lineHeight: '1.4' }}>
                <CheckCircle size={14} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: 'grid', gap: '8px' }}>
          <button
            onClick={handleDownload}
            style={{
              width: '100%', padding: '14px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white', border: 'none', fontWeight: '900', fontSize: '1rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 6px 20px rgba(16,185,129,0.35)'
            }}
          >
            <Download size={18} /> Unduh & Update APK Sekarang
          </button>
          {!updateInfo.forceUpdate && (
            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '10px', borderRadius: '10px',
                background: 'transparent', color: '#64748b', border: 'none',
                fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer'
              }}
            >
              Nanti Saja
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
