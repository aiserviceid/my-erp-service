import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getTierConfig } from '../config/tierLimits';

/**
 * UpgradePrompt — Reusable upgrade CTA component
 * 
 * Modes:
 *   "banner"  — Inline warning/info bar (for approaching limits)
 *   "card"    — Premium feature card with CTA (for locked features)  
 *   "modal"   — Fullscreen overlay block (when limit is reached)
 */
export default function UpgradePrompt({ 
  mode = 'card',         // 'banner' | 'card' | 'modal'
  featureName = '',      // e.g., "Portal Karyawan"
  featureDescription = '', // What the feature does
  currentUsage = null,   // e.g., 45
  maxUsage = null,       // e.g., 50
  usageLabel = '',       // e.g., "servis bulan ini"
  onClose = null,        // for modal mode
  icon = null,           // React element
}) {
  const navigate = useNavigate();

  const waLink = "https://wa.me/6285382535050?text=" + 
    encodeURIComponent(`Halo Admin UnitPro, saya ingin upgrade ke UnitPro Pro (Rp 99.000/bln). Kode Toko saya: `);

  // ── BANNER MODE ──
  if (mode === 'banner') {
    const percent = maxUsage ? Math.round((currentUsage / maxUsage) * 100) : 0;
    const isWarning = percent >= 80;
    const isCritical = percent >= 95;

    return (
      <div style={{
        padding: '12px 16px',
        borderRadius: '12px',
        background: isCritical ? 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)' 
                   : isWarning ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
                   : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        border: `1px solid ${isCritical ? '#fecaca' : isWarning ? '#fde68a' : '#bae6fd'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '200px' }}>
          <span style={{ fontSize: '1.3rem' }}>{isCritical ? '🚨' : isWarning ? '⚠️' : '📊'}</span>
          <div>
            <div style={{ 
              fontSize: '0.85rem', fontWeight: '700', 
              color: isCritical ? '#dc2626' : isWarning ? '#b45309' : '#0369a1' 
            }}>
              {currentUsage}/{maxUsage} {usageLabel}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
              {isCritical 
                ? 'Hampir mencapai batas! Upgrade untuk unlimited.' 
                : isWarning 
                  ? 'Mendekati batas paket Gratis.' 
                  : 'Penggunaan paket Gratis bulan ini.'}
            </div>
          </div>
        </div>
        {/* Progress Bar */}
        <div style={{ 
          width: '120px', height: '8px', background: '#e2e8f0', borderRadius: '100px', overflow: 'hidden',
          flexShrink: 0
        }}>
          <div style={{ 
            width: `${Math.min(100, percent)}%`, height: '100%', borderRadius: '100px',
            background: isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#0284c7',
            transition: 'width 0.5s ease'
          }} />
        </div>
        {isWarning && (
          <a href={waLink} target="_blank" rel="noreferrer" style={{
            padding: '6px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', color: 'white',
            textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {/* Harga lama disembunyikan agar konsisten dengan paket UnitPro. */}
            Upgrade UnitPro Pro - Rp 99.000/bln
            {/*
            Upgrade Pro ⚡
            */}
          </a>
        )}
      </div>
    );
  }

  // ── CARD MODE ──
  if (mode === 'card') {
    return (
      <div style={{
        padding: '2.5rem 2rem',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #f0fdf4 100%)',
        border: '2px solid #bae6fd',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative gradient orb */}
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '150px', height: '150px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(2,132,199,0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Pro Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '4px 14px', borderRadius: '100px',
          background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
          color: 'white', fontSize: '0.72rem', fontWeight: '900',
          letterSpacing: '1.5px', textTransform: 'uppercase',
          marginBottom: '1.2rem', boxShadow: '0 4px 12px rgba(2,132,199,0.3)'
        }}>
          ⭐ FITUR PRO TITAN
        </div>

        {/* Icon */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '18px',
          background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.2rem auto', color: '#0284c7',
        }}>
          {icon || <span style={{ fontSize: '1.8rem' }}>✨</span>}
        </div>

        <h3 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a', margin: '0 0 8px 0' }}>
          {featureName || 'Fitur Premium'}
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: '1.6', maxWidth: '450px', margin: '0 auto 2rem auto' }}>
          {featureDescription || 'Upgrade ke Paket UnitPro Pro untuk mengakses fitur ini dan tingkatkan produktivitas toko Anda.'}
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href={waLink} target="_blank" rel="noreferrer" style={{
            padding: '12px 28px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: '800',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', color: 'white',
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 4px 18px rgba(2,132,199,0.35)', transition: 'all 0.2s',
          }}>
            Upgrade Pro — Rp 49.000/bln ⚡
          </a>
        </div>

        <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '1rem' }}>
          Aktivasi instan via WhatsApp. Bisa coba gratis 7 hari!
        </p>
      </div>
    );
  }

  // ── MODAL MODE ──
  if (mode === 'modal') {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '1rem',
      }} onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
        <div style={{
          background: 'white', borderRadius: '24px', padding: '2.5rem 2rem',
          maxWidth: '420px', width: '100%', textAlign: 'center',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          animation: 'fadeIn 0.3s ease-out',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: '900', color: '#0f172a', margin: '0 0 8px 0' }}>
            Batas Paket Gratis Tercapai
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            Anda sudah menggunakan <strong>{currentUsage}/{maxUsage} {usageLabel}</strong>. 
            Upgrade ke UnitPro Pro untuk <strong>UNLIMITED</strong> akses.
          </p>

          <div style={{
            padding: '1rem', borderRadius: '12px', background: '#f0f9ff', border: '1px solid #bae6fd',
            marginBottom: '1.5rem', textAlign: 'left',
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0369a1', marginBottom: '8px' }}>
              ✅ Yang didapat di UnitPro Pro:
            </div>
            <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: '1.8' }}>
              • UNLIMITED Servis & Transaksi POS<br/>
              • Portal Karyawan (PIN Login)<br/>
              • Notifikasi WhatsApp Otomatis<br/>
              • Laporan Lengkap + Export Excel<br/>
              • Custom Branding & Katalog Digital
            </div>
          </div>

          <a href={waLink} target="_blank" rel="noreferrer" style={{
            display: 'block', padding: '14px', borderRadius: '12px', fontSize: '1rem', fontWeight: '800',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', color: 'white',
            textDecoration: 'none', textAlign: 'center',
            boxShadow: '0 4px 18px rgba(2,132,199,0.4)', marginBottom: '10px',
          }}>
            Upgrade UnitPro Pro - Rp 99.000/bln
          </a>

          {onClose && (
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem',
              cursor: 'pointer', padding: '8px', width: '100%',
            }}>
              Nanti saja
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
