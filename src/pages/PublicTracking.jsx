import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Package, Clock, CheckCircle, AlertTriangle, ArrowLeft, Sparkles, Phone } from 'lucide-react';
import { apiService } from '../services/api';
import { SERVICE_STATUSES, getStatusInfo } from '../config/tierLimits';
import { getTenantLogoUrl } from '../utils/branding';

export default function PublicTracking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [resi, setResi] = useState('');
  const [result, setResult] = useState(null);
  const [tenantInfo, setTenantInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const executeSearch = async (targetResi) => {
    const cleanResi = sanitizePublicResi(targetResi);
    if (!cleanResi) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await apiService.trackService(cleanResi);
      setResult(data);
      if (data.tenant_code) {
        apiService.getTenantPublic(data.tenant_code).then(info => {
          if (info) setTenantInfo(info);
        }).catch(() => {});
      }
    } catch (e) {
      setError('Nomor Resi tidak ditemukan. Pastikan nomor resi sudah benar.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    executeSearch(resi);
  };

  // Auto-search if ?resi=TRX-XXXXX query parameter exists in URL!
  useEffect(() => {
    const resiFromUrl = searchParams.get('resi');
    if (resiFromUrl) {
      setResi(resiFromUrl);
      executeSearch(resiFromUrl);
    }
  }, [searchParams]);

  // Get status index for timeline
  const getStatusIndex = (status) => {
    // Map legacy statuses
    const statusMap = {
      'DITERIMA': 0, 'DICEK': 1, 'SEDANG_DICEK': 1,
      'DIKERJAKAN': 2, 'SEDANG_DIKERJAKAN': 2,
      'MENUNGGU_PART': 3, 'MENUNGGU PART': 3,
      'SELESAI': 4, 'DIAMBIL': 5, 'DI AMBIL': 5, 'DI_AMBIL': 5,
      'DIBATALKAN': 6, 'BATAL': 6,
    };
    return statusMap[status] ?? 0;
  };

  const currentStatusIdx = result ? getStatusIndex(result.status) : -1;
  const isCancelled = result && (result.status === 'DIBATALKAN' || result.status === 'BATAL');
  const isCompleted = result && (result.status === 'SELESAI' || result.status === 'DIAMBIL' || result.status === 'DI AMBIL' || result.status === 'DI_AMBIL');

  const sanitizePublicResi = (value = '') => String(value || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40);

  const maskCustomerName = (name = '') => {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '-';
    if (parts.length === 1) return parts[0].length <= 2 ? parts[0] : parts[0].slice(0, 1) + '***';
    return parts.map((part, index) => index === 0 ? part : part.slice(0, 1) + '.').join(' ');
  };

  const cleanPublicIssue = (issue = '') => String(issue || '')
    .replace(/\[[^\]]*?\]/g, '')
    .replace(/\| Kelengkapan:.*/i, '')
    .replace(/(?:\+?62|0)8\d{7,12}/g, '[nomor disembunyikan]')
    .trim();

  const buildStoreWhatsAppUrl = (phone = '', resiValue = '') => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';
    const target = digits.startsWith('62') ? digits : digits.startsWith('0') ? '62' + digits.slice(1) : digits.startsWith('8') ? '62' + digits : digits;
    return 'https://wa.me/' + target + '?text=' + encodeURIComponent('Halo, saya ingin menanyakan status servis resi ' + sanitizePublicResi(resiValue));
  };

  // Timeline statuses (excluding DIBATALKAN from normal flow)
  const timelineStatuses = SERVICE_STATUSES.filter(s => s.id !== 'DIBATALKAN');

  const tenantSettings = tenantInfo?.settings 
    ? (typeof tenantInfo.settings === 'string' ? JSON.parse(tenantInfo.settings) : tenantInfo.settings)
    : {};
  const tenantTier = tenantInfo?.tier || 'free';
  const tenantLogoUrl = getTenantLogoUrl(tenantTier, tenantSettings);
  const tenantLogoOpacity = 1;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f0f9ff 0%, #f8fafc 30%, #ffffff 100%)',
      fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif",
    }}>
      {/* ── HEADER ── */}
      <header style={{
        padding: '16px 20px',
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(12px)', backgroundColor: 'rgba(255,255,255,0.92)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={tenantLogoUrl} alt="Logo" style={{ height: '36px', maxWidth: '126px', objectFit: 'contain', opacity: tenantLogoOpacity }} />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
              {tenantSettings.storeName || tenantInfo?.name || 'UnitPro'}
            </h2>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '600' }}>
              Lacak Status Servis
            </span>
          </div>
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            background: '#f1f5f9', border: 'none', borderRadius: '10px',
            padding: '8px 14px', cursor: 'pointer', color: '#475569',
            fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          <ArrowLeft size={16} /> Kembali
        </button>
      </header>

      <main style={{ padding: '24px 16px', maxWidth: '600px', margin: '0 auto' }}>
        {/* ── SEARCH CARD ── */}
        <div style={{
          background: 'white', borderRadius: '20px', padding: '28px 24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0',
          marginBottom: '24px', textAlign: 'center',
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Package size={28} color="#0284c7" />
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: '1.5rem', fontWeight: '900', color: '#0f172a' }}>
            Lacak Status Servis
          </h1>
          <p style={{ color: '#64748b', margin: '0 0 24px', fontSize: '0.9rem', lineHeight: '1.5' }}>
            Masukkan nomor resi yang tertera pada tanda terima servis Anda.
          </p>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                placeholder="Contoh: TRX-1722790000000"
                value={resi}
                onChange={(e) => setResi(sanitizePublicResi(e.target.value))}
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: '14px',
                  border: '2px solid #e2e8f0', fontSize: '1rem', fontWeight: '600',
                  textAlign: 'center', letterSpacing: '1px', outline: 'none',
                  background: '#f8fafc', transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#0284c7'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                color: 'white', border: 'none', borderRadius: '14px',
                padding: '0 20px', cursor: loading ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(2,132,199,0.3)',
                minWidth: '52px',
              }}
            >
              {loading ? (
                <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <Search size={22} />
              )}
            </button>
          </form>
        </div>

        {/* ── ERROR ── */}
        {error && (
          <div style={{
            padding: '16px 20px', borderRadius: '14px',
            background: '#fef2f2', border: '1px solid #fecaca',
            display: 'flex', alignItems: 'center', gap: '12px',
            marginBottom: '24px', animation: 'fadeIn 0.3s ease-out',
          }}>
            <AlertTriangle size={22} color="#ef4444" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: '700', color: '#dc2626', fontSize: '0.9rem' }}>Resi Tidak Ditemukan</div>
              <div style={{ color: '#991b1b', fontSize: '0.82rem', marginTop: '2px' }}>{error}</div>
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {result && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            
            {/* Status Hero Card */}
            <div style={{
              borderRadius: '20px', overflow: 'hidden', marginBottom: '16px',
              background: isCancelled ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                : isCompleted ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: `1px solid ${isCancelled ? '#fecaca' : isCompleted ? '#bbf7d0' : '#fde68a'}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            }}>
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>
                  {getStatusInfo(result.status)?.icon || '📦'}
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '6px 16px', borderRadius: '100px',
                  background: getStatusInfo(result.status)?.bg || '#f1f5f9',
                  color: getStatusInfo(result.status)?.color || '#64748b',
                  fontWeight: '800', fontSize: '0.9rem', textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {!isCancelled && !isCompleted && (
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', animation: 'pulse 2s infinite' }} />
                  )}
                  {getStatusInfo(result.status)?.label || result.status.replace(/_/g, ' ')}
                </div>
                <p style={{ margin: '10px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  {getStatusInfo(result.status)?.description || ''}
                </p>
                {isCompleted && result.jasa_fee !== undefined && (
                  <div style={{
                    marginTop: '14px', padding: '12px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.06)',
                  }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Total Biaya Servis</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0f172a' }}>
                      Rp {((result.jasa_fee || 0) + (result.part_fee || 0)).toLocaleString('id-ID')}
                    </div>
                    {Number(result.jasa_fee || 0) > 0 && Number(result.part_fee || 0) > 0 && (
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                        Jasa: Rp {Number(result.jasa_fee || 0).toLocaleString('id-ID')} | Part: Rp {Number(result.part_fee || 0).toLocaleString('id-ID')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── TIMELINE ── */}
            {!isCancelled && (
              <div style={{
                background: 'white', borderRadius: '20px', padding: '24px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0',
                marginBottom: '16px',
              }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
                  📍 Progress Servis
                </h3>
                <div style={{ position: 'relative', paddingLeft: '32px' }}>
                  {timelineStatuses.map((status, idx) => {
                    const isPast = idx <= currentStatusIdx;
                    const isCurrent = idx === currentStatusIdx;
                    const isFuture = idx > currentStatusIdx;
                    const isLast = idx === timelineStatuses.length - 1;

                    return (
                      <div key={status.id} style={{ 
                        position: 'relative', paddingBottom: isLast ? 0 : '24px',
                        opacity: isFuture ? 0.4 : 1,
                      }}>
                        {/* Vertical line */}
                        {!isLast && (
                          <div style={{
                            position: 'absolute', left: '-20px', top: '24px',
                            width: '2px', height: 'calc(100% - 8px)',
                            background: isPast && idx < currentStatusIdx ? status.color : '#e2e8f0',
                            transition: 'background 0.5s',
                          }} />
                        )}
                        {/* Circle indicator */}
                        <div style={{
                          position: 'absolute', left: '-27px', top: '2px',
                          width: isCurrent ? '18px' : '14px',
                          height: isCurrent ? '18px' : '14px',
                          borderRadius: '50%',
                          background: isPast ? status.color : '#e2e8f0',
                          border: isCurrent ? `3px solid ${status.color}40` : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.3s',
                          boxShadow: isCurrent ? `0 0 0 4px ${status.color}15` : 'none',
                        }}>
                          {isPast && !isCurrent && (
                            <CheckCircle size={10} color="white" />
                          )}
                          {isCurrent && (
                            <div style={{
                              width: '6px', height: '6px', borderRadius: '50%',
                              background: 'white',
                            }} />
                          )}
                        </div>
                        {/* Content */}
                        <div>
                          <div style={{
                            fontSize: '0.88rem',
                            fontWeight: isCurrent ? '800' : isPast ? '600' : '500',
                            color: isCurrent ? status.color : isPast ? '#0f172a' : '#94a3b8',
                          }}>
                            {status.icon} {status.label}
                          </div>
                          {isCurrent && (
                            <div style={{
                              fontSize: '0.78rem', color: '#64748b', marginTop: '4px',
                              lineHeight: '1.4',
                            }}>
                              {status.description}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── DETAIL INFO ── */}
            <div style={{
              background: 'white', borderRadius: '20px', padding: '24px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0',
              marginBottom: '16px',
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
                📋 Detail Servis
              </h3>
              <div style={{ display: 'grid', gap: '14px' }}>
                {[
                  { label: 'No. Resi', value: result.resi, bold: true, color: '#0284c7' },
                  { label: 'Pelanggan', value: maskCustomerName(result.customer_name) },
                  { label: 'Perangkat', value: result.device_name },
                  { label: 'Keluhan', value: cleanPublicIssue(result.issue) },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600', flexShrink: 0, minWidth: '90px' }}>
                      {item.label}
                    </span>
                    <span style={{
                      fontSize: '0.85rem', fontWeight: item.bold ? '800' : '500',
                      color: item.color || '#0f172a', textAlign: 'right',
                      wordBreak: 'break-word',
                    }}>
                      {item.value || '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── CONTACT STORE ── */}
            {tenantInfo && (
              <div style={{
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                borderRadius: '16px', padding: '16px 20px', border: '1px solid #bae6fd',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '12px', flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0369a1' }}>
                    Ada pertanyaan?
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Hubungi {tenantSettings.storeName || tenantInfo.name}
                  </div>
                </div>
                {tenantSettings.store_wa && (
                  <a
                    href={buildStoreWhatsAppUrl(tenantSettings.store_wa, result.resi)}
                    target="_blank" rel="noreferrer"
                    style={{
                      padding: '10px 18px', borderRadius: '10px',
                      background: '#25D366', color: 'white', textDecoration: 'none',
                      fontWeight: '700', fontSize: '0.85rem',
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}
                  >
                    <Phone size={16} /> WhatsApp
                  </a>
                )}
              </div>
            )}

            {/* ── PROMO BANNER TOKO (Paket Pro & Trial) ── */}
            {tenantInfo && ((tenantInfo.tier && tenantInfo.tier.toLowerCase() !== 'free') || tenantInfo.isTrial || tenantSettings.isTrial || String(tenantInfo.tier || '').toLowerCase().includes('promo') || String(tenantInfo.tier || '').toLowerCase().includes('trial')) && ((tenantSettings.promoBanners || tenantSettings.ads || []).filter(b => b && b.title && b.isActive !== false).length > 0) && (
              <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: '20px', padding: '20px', color: 'white',
                marginTop: '16px', border: '1px solid #334155',
                boxShadow: '0 10px 25px rgba(15, 23, 42, 0.25)'
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                  🔥 Promo & Penawaran Spesial Toko
                </div>
                {(tenantSettings.promoBanners || tenantSettings.ads || []).filter(b => b && b.title && b.isActive !== false).slice(0, 3).map((banner, i) => (
                  <div key={banner.id || i} style={{ borderTop: i > 0 ? '1px solid #334155' : 'none', paddingTop: i > 0 ? '14px' : 0, marginTop: i > 0 ? '14px' : 0 }}>
                    {banner.imageUrl && (
                      <img src={banner.imageUrl} alt={banner.title} style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '12px', marginBottom: '10px', border: '1px solid #334155' }} />
                    )}
                    {banner.badge && (
                      <span style={{ background: '#fbbf24', color: '#78350f', padding: '2px 8px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', display: 'inline-block', marginBottom: '6px' }}>
                        {banner.badge}
                      </span>
                    )}
                    <div style={{ fontWeight: '800', fontSize: '1.05rem', color: '#ffffff', marginBottom: '4px' }}>
                      {banner.title}
                    </div>
                    {banner.description && (
                      <div style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: '1.5', marginBottom: '10px' }}>
                        {banner.description}
                      </div>
                    )}
                    {tenantSettings.store_wa && (
                      <a
                        href={`https://wa.me/${(tenantSettings.store_wa || '').replace(/\D/g,'')}?text=${encodeURIComponent(`Halo ${tenantInfo.name || 'Toko'}, saya melacak resi ${result.resi} dan tertarik promo: ${banner.title}`)}`}
                        target="_blank" rel="noreferrer"
                        style={{
                          fontSize: '0.82rem', color: '#ffffff', background: '#0284c7', padding: '6px 14px', borderRadius: '8px',
                          fontWeight: '800', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px'
                        }}
                      >
                        💬 Tanya / Klaim Promo Ini →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!result && !error && !loading && (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
            <Package size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Masukkan nomor resi untuk melihat status servis Anda</p>
          </div>
        )}
      </main>

      {/* ── VIRAL GROWTH LOOP FOOTER ── */}
      <footer style={{
        padding: '28px 16px', textAlign: 'center',
        borderTop: '1px solid #e2e8f0', marginTop: '40px', background: '#ffffff'
      }}>
        <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#64748b' }}>
          &copy; {new Date().getFullYear()} {tenantSettings.storeName || tenantInfo?.name || 'UnitPro'} • Dilayani dengan Sistem Operasional Digital
        </p>
        <div 
          onClick={() => navigate('/login', { state: { tab: 'register' } })}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 18px', borderRadius: '100px', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '1px solid #bae6fd', fontSize: '0.82rem', color: '#0369a1', fontWeight: '800',
            boxShadow: '0 2px 10px rgba(2, 132, 199, 0.1)', cursor: 'pointer', transition: 'all 0.2s ease'
          }}
        >
          <Sparkles size={14} color="#0284c7" />
          <span>Mau toko servis Anda punya tracking digital kayak gini? <strong>Daftar Gratis ➔</strong></span>
        </div>
      </footer>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
