import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { apiService } from '../services/api';
import { Gift, Copy, CheckCircle, TrendingUp, Users, DollarSign, Clock, Share2, ExternalLink } from 'lucide-react';
import { copyText } from '../utils/clipboard';

const tierLabels = { pro: 'Pro', enterprise: 'Enterprise', free: 'Starter Gratis' };
const tierColors = { pro: '#0284c7', enterprise: '#7c3aed', free: '#64748b' };

export default function AffiliatePortal() {
  const tenant = useStore(s => s.tenant);
  const [data, setData] = useState({ affiliate: null, commissions: [] });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [affiliateSettings, setAffiliateSettings] = useState({ first_payment_rate: 0.20, pro_price: 99000, enterprise_price: 299000 });

  const loadData = async () => {
    setLoading(true);
    try {
      const [result, settings] = await Promise.all([
        apiService.getAffiliateData(tenant.code),
        apiService.getAffiliateSettings()
      ]);
      setData(result);
      setAffiliateSettings(settings);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (tenant?.code) loadData();
  }, [tenant?.code]);

  const referralUrl = data.affiliate
    ? `${window.location.origin}/login?ref=${data.affiliate.affiliate_code}`
    : '';

  const commissionRate = Math.round(Number(affiliateSettings.first_payment_rate || 0.20) * 100);
  const proCommission = Math.floor(Number(affiliateSettings.pro_price || 99000) * Number(affiliateSettings.first_payment_rate || 0.20));
  const enterpriseCommission = Math.floor(Number(affiliateSettings.enterprise_price || 299000) * Number(affiliateSettings.first_payment_rate || 0.20));

  const copyCode = async () => {
    if (!data.affiliate?.affiliate_code) return;
    if (!await copyText(data.affiliate.affiliate_code)) return alert('Kode tidak dapat disalin. Coba tekan lama pada kode.');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyUrl = async () => {
    if (!referralUrl) return;
    if (!await copyText(referralUrl)) return alert('Link tidak dapat disalin. Coba tekan lama pada link.');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWA = () => {
    const msg = `Halo, saya menggunakan *UnitPro* untuk mengelola operasional toko servis.

Bisa mulai dari paket Gratis atau menggunakan paket Pro sesuai kebutuhan toko.

Daftar pakai kode afiliasi saya *${data.affiliate?.affiliate_code}* atau klik link ini:
👉 ${referralUrl}

Fitur utama: servis, kasir, stok, tim, laporan, tracking pelanggan, dan WhatsApp.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const totalEarned = data.affiliate?.total_earned || 0;
  const totalPending = data.affiliate?.total_pending || 0;
  const totalReferrals = data.affiliate?.total_referrals || 0;
  const paidCount = data.commissions.filter(c => c.status === 'PAID').length;
  const pendingCount = data.commissions.filter(c => c.status === 'PENDING').length;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
      <div style={{ textAlign: 'center', color: '#64748b' }}>Memuat data afiliasi...</div>
    </div>
  );

  return (
    <div style={{ maxWidth: '900px' }}>

      {/* HERO BOX */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #0284c7 100%)',
        borderRadius: '20px', padding: '2rem', color: 'white', marginBottom: '24px',
        boxShadow: '0 15px 40px rgba(2, 132, 199, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <Gift size={32} />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: 'white' }}>Program Afiliasi UnitPro</h2>
            <p style={{ margin: '2px 0 0 0', color: '#bae6fd', fontSize: '0.9rem' }}>Dapatkan komisi <strong style={{ color: '#fef08a', fontSize: '1.1rem' }}>{commissionRate}%</strong> dari pembayaran pertama toko yang bergabung melalui link Anda.</p>
          </div>
        </div>

        {/* Cara Kerja */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
          {[
            { icon: '🔗', title: 'Bagikan Kode', desc: 'Share kode/link afiliasi ke teman teknisi & pemilik bengkel' },
            { icon: '💳', title: 'Mereka Berlangganan', desc: 'Referral membeli paket Pro atau Enterprise' },
            { icon: '💰', title: `Dapat Komisi ${commissionRate}%`, desc: `Pro = Rp ${proCommission.toLocaleString('id-ID')} | Enterprise = Rp ${enterpriseCommission.toLocaleString('id-ID')}` },
            { icon: '🏦', title: 'Tarik ke Rekening', desc: 'Saldo masuk ke dompet, tarik via BCA/BRI/DANA kapan saja' },
          ].map((s, i) => (
            <div key={i} style={{ flex: '1 1 160px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{s.icon}</div>
              <div style={{ fontWeight: '800', fontSize: '0.88rem' }}>{s.title}</div>
              <div style={{ color: '#bae6fd', fontSize: '0.78rem', marginTop: '3px', lineHeight: '1.4' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.4rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px' }}><Users size={16} /> TOTAL REFERRAL</div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#0f172a' }}>{totalReferrals}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{paidCount} disetujui · {pendingCount} menunggu</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.4rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px' }}><Clock size={16} /> KOMISI MENUNGGU</div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#d97706' }}>Rp {totalPending.toLocaleString('id-ID')}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Diproses admin 1x24 jam</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.4rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px' }}><DollarSign size={16} /> TOTAL DITERIMA</div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#059669' }}>Rp {totalEarned.toLocaleString('id-ID')}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Sudah masuk ke dompet</div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', borderRadius: '16px', padding: '1.4rem', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a7f3d0', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px' }}><TrendingUp size={16} /> POTENSI / REFERRAL</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '900', color: 'white' }}>Rp {proCommission.toLocaleString('id-ID')} – {enterpriseCommission.toLocaleString('id-ID')}</div>
          <div style={{ fontSize: '0.75rem', color: '#a7f3d0', marginTop: '2px' }}>Per 1 toko yang bergabung</div>
        </div>
      </div>

      {/* KODE & LINK AFILIASI */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '1.8rem', marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '900', color: '#0f172a' }}>🔑 Kode & Link Afiliasi Anda</h3>

        {/* Kode */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>KODE AFILIASI UNIK ANDA</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{
              flex: 1, background: '#f1f5f9', border: '2px solid #0284c7', borderRadius: '12px',
              padding: '12px 16px', fontWeight: '900', fontSize: '1.3rem', color: '#0284c7',
              letterSpacing: '2px', fontFamily: 'monospace'
            }}>
              {data.affiliate?.affiliate_code || 'Memuat...'}
            </div>
            <button onClick={copyCode} style={{
              padding: '12px 18px', borderRadius: '12px', border: 'none', fontWeight: '800',
              background: copied ? '#059669' : '#0284c7', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem',
              transition: 'all 0.2s'
            }}>
              {copied ? <><CheckCircle size={18} /> Disalin!</> : <><Copy size={18} /> Salin Kode</>}
            </button>
          </div>
        </div>

        {/* Link */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>LINK PENDAFTARAN (Bagikan ke Calon Mitra)</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{
              flex: 1, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px',
              padding: '10px 14px', fontSize: '0.88rem', color: '#334155', fontFamily: 'monospace',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              {referralUrl}
            </div>
            <button onClick={copyUrl} style={{
              padding: '10px 16px', borderRadius: '12px', border: '1px solid #cbd5e1',
              background: '#f8fafc', color: '#334155', cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <Copy size={16} /> Salin Link
            </button>
          </div>
        </div>

        {/* Share Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={shareWA} style={{
            padding: '10px 20px', borderRadius: '12px', border: 'none', fontWeight: '800',
            background: '#25D366', color: 'white', cursor: 'pointer', fontSize: '0.9rem',
            display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
          }}>
            <Share2 size={18} /> Share via WhatsApp
          </button>
          <a href={referralUrl} target="_blank" rel="noreferrer" style={{
            padding: '10px 20px', borderRadius: '12px', border: '1px solid #cbd5e1',
            background: '#f8fafc', color: '#334155', fontWeight: '700', fontSize: '0.9rem',
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <ExternalLink size={16} /> Buka Link
          </a>
        </div>
      </div>

      {/* TABEL KOMISI */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '1.8rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '900', color: '#0f172a' }}>📊 Riwayat Komisi Afiliasi</h3>

        {data.commissions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
            <Gift size={48} style={{ margin: '0 auto 12px auto', display: 'block', opacity: 0.4 }} />
            <p style={{ fontWeight: '700' }}>Belum ada komisi masuk.</p>
            <p style={{ fontSize: '0.88rem' }}>Bagikan kode afiliasi kepada pemilik toko servis yang membutuhkan UnitPro.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: '800' }}>Toko Referral</th>
                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: '800' }}>Paket</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontWeight: '800' }}>Harga Toko</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontWeight: '800' }}>Komisi Anda</th>
                  <th style={{ padding: '10px', textAlign: 'center', fontWeight: '800' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.commissions.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px' }}>
                      <strong>{c.referred_tenant_name || c.referred_tenant_code}</strong>
                      <br /><span style={{ fontSize: '0.78rem', color: '#64748b' }}>{c.referred_tenant_code}</span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ background: c.tier_purchased === 'enterprise' ? '#f3e8ff' : '#e0f2fe', color: tierColors[c.tier_purchased], padding: '3px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700' }}>
                        {tierLabels[c.tier_purchased] || c.tier_purchased}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#64748b' }}>
                      Rp {(c.base_amount || 0).toLocaleString('id-ID')}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: '900', fontSize: '1rem', color: '#059669' }}>
                      Rp {(c.commission_amount || 0).toLocaleString('id-ID')}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800',
                        background: c.status === 'PAID' ? '#dcfce7' : '#fef3c7',
                        color: c.status === 'PAID' ? '#15803d' : '#b45309'
                      }}>
                        {c.status === 'PAID' ? '✅ Dibayar' : '⏳ Menunggu'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Catatan penting */}
        <div style={{ marginTop: '16px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 14px', fontSize: '0.85rem', color: '#78350f' }}>
          <strong>⚠️ Ketentuan Program Afiliasi:</strong><br />
          • Komisi <strong>{commissionRate}% hanya berlaku untuk pembayaran pertama</strong> toko yang Anda referensikan.<br />
          • Perpanjangan langganan bulanan berikutnya <strong>tidak</strong> menghasilkan komisi tambahan.<br />
          • Paket Starter Gratis tidak menghasilkan komisi (tidak ada pembayaran).<br />
          • Pencairan komisi diproses admin dalam <strong>1×24 jam</strong> setelah diverifikasi.
        </div>
      </div>

    </div>
  );
}
