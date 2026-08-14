import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Barcode from 'react-barcode';
import { ArrowLeft, BadgeCheck, Clock3, FileCheck2, ShieldCheck, TriangleAlert } from 'lucide-react';
import { apiService } from '../services/api';
import { getTenantLogoUrl } from '../utils/branding';
import {
  calculateServiceAmounts,
  cleanPublicServiceIssue,
  getWarrantyState,
  maskPublicCustomerName,
  normalizeServiceStatus,
} from '../utils/serviceWarranty';

const money = (value = 0) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
const safeResi = (value = '') => String(value || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40);

export default function PublicWarranty() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resi = safeResi(searchParams.get('resi'));
  const [service, setService] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!resi) {
        setError('Nomor garansi/resi tidak valid.');
        setLoading(false);
        return;
      }
      try {
        const data = await apiService.trackService(resi);
        if (!active) return;
        setService(data);
        if (data?.tenant_code) {
          const tenantData = await apiService.getTenantPublic(data.tenant_code).catch(() => null);
          if (active) setTenant(tenantData);
        }
      } catch {
        if (active) setError('Data servis atau garansi tidak ditemukan.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [resi]);

  const settings = useMemo(() => {
    if (!tenant?.settings) return {};
    if (typeof tenant.settings === 'string') {
      try { return JSON.parse(tenant.settings); } catch { return {}; }
    }
    return tenant.settings;
  }, [tenant]);

  const amounts = useMemo(() => calculateServiceAmounts(service || {}), [service]);
  const warranty = useMemo(() => getWarrantyState(service || {}), [service]);
  const status = normalizeServiceStatus(service?.status);
  const storeName = settings.storeName || settings.store_name || tenant?.name || service?.tenant_name || 'UnitPro';
  const logo = getTenantLogoUrl(tenant?.tier || 'free', settings);
  const isPaid = status === 'DIAMBIL';

  const stateStyles = warranty.state === 'ACTIVE'
    ? { bg: '#ecfdf5', border: '#6ee7b7', text: '#047857', icon: <BadgeCheck size={22} /> }
    : warranty.state === 'EXPIRED'
      ? { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', icon: <TriangleAlert size={22} /> }
      : warranty.state === 'PENDING'
        ? { bg: '#fffbeb', border: '#fde68a', text: '#b45309', icon: <Clock3 size={22} /> }
        : { bg: '#f8fafc', border: '#cbd5e1', text: '#475569', icon: <ShieldCheck size={22} /> };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: "'Inter','Plus Jakarta Sans',system-ui,sans-serif" }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(255,255,255,.96)', borderBottom: '1px solid #e2e8f0', padding: '13px 16px', backdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: 620, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <img src={logo} alt="Logo toko" style={{ width: 38, height: 38, objectFit: 'contain', borderRadius: 9 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{storeName}</div>
              <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700 }}>Bukti Garansi Servis Digital</div>
            </div>
          </div>
          <button type="button" onClick={() => navigate(`/tracking?resi=${encodeURIComponent(resi)}`)} style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#334155', borderRadius: 10, padding: '8px 11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={15} /> Tracking
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 620, margin: '0 auto', padding: '20px 14px 40px' }}>
        {loading && (
          <div style={{ padding: 36, textAlign: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, fontWeight: 800, color: '#64748b' }}>Memuat data garansi...</div>
        )}

        {!loading && error && (
          <div style={{ padding: 22, background: '#fff', border: '1px solid #fecaca', borderRadius: 20 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: '#b91c1c', fontWeight: 900 }}><TriangleAlert size={21} /> Garansi Tidak Ditemukan</div>
            <p style={{ margin: '8px 0 0', color: '#64748b', lineHeight: 1.55 }}>{error}</p>
          </div>
        )}

        {!loading && service && (
          <>
            <section id="garansi" style={{ background: '#fff', border: `1px solid ${stateStyles.border}`, borderRadius: 22, overflow: 'hidden', boxShadow: '0 8px 30px rgba(15,23,42,.07)', marginBottom: 14 }}>
              <div style={{ padding: '22px 20px', background: stateStyles.bg }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ color: '#64748b', fontSize: 11, fontWeight: 900, letterSpacing: '.08em' }}>GARANSI SERVIS</div>
                    <div style={{ marginTop: 4, color: stateStyles.text, fontSize: 22, fontWeight: 950 }}>{warranty.stateLabel}</div>
                  </div>
                  <div style={{ width: 46, height: 46, borderRadius: 14, background: '#fff', display: 'grid', placeItems: 'center', color: stateStyles.text, border: `1px solid ${stateStyles.border}` }}>{stateStyles.icon}</div>
                </div>

                {warranty.hasWarranty ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
                    <div style={{ background: 'rgba(255,255,255,.85)', borderRadius: 13, padding: 12 }}>
                      <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700 }}>Durasi Garansi</div>
                      <div style={{ marginTop: 3, fontWeight: 900 }}>{warranty.label || '-'}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,.85)', borderRadius: 13, padding: 12 }}>
                      <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700 }}>Berlaku Sampai</div>
                      <div style={{ marginTop: 3, fontWeight: 900 }}>{warranty.endLabel || 'Mengikuti ketentuan toko'}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 14, padding: 12, background: 'rgba(255,255,255,.8)', borderRadius: 12, color: '#475569', lineHeight: 1.5, fontSize: 13 }}>
                    Servis ini tidak memiliki garansi tambahan yang tercatat pada data toko.
                  </div>
                )}
              </div>

              <div style={{ padding: '18px 20px 20px', textAlign: 'center' }}>
                <div style={{ color: '#64748b', fontSize: 11, fontWeight: 800, marginBottom: 10 }}>KODE GARANSI / NO. NOTA</div>
                <div style={{
                  width: '100%',
                  maxWidth: 360,
                  margin: '0 auto',
                  padding: '12px 8px 8px',
                  boxSizing: 'border-box',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  background: '#fff',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}>
                  <Barcode value={service.resi} height={52} width={1.05} fontSize={11} margin={0} displayValue />
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: '#64748b', lineHeight: 1.45 }}>Barcode dan link ini mengacu pada data servis yang sama di UnitPro.</div>
              </div>
            </section>

            <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 18, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, marginBottom: 14 }}><FileCheck2 size={19} color="#0284c7" /> Detail Servis & Pelunasan</div>
              {[
                ['No. Nota', service.resi],
                ['Pelanggan', maskPublicCustomerName(service.customer_name)],
                ['Perangkat', service.device_name || '-'],
                ['Status', isPaid ? 'SUDAH DIAMBIL / LUNAS' : String(service.status || '-').replace(/_/g, ' ')],
                ['Biaya Sparepart', money(amounts.partFee)],
                ['Biaya Jasa', money(amounts.jasaFee)],
                ...(amounts.discount > 0 ? [['Diskon', `- ${money(amounts.discount)}`]] : []),
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '9px 0', borderBottom: '1px dashed #e2e8f0' }}>
                  <span style={{ color: '#64748b', fontSize: 13, fontWeight: 700 }}>{label}</span>
                  <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 850, textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
                </div>
              ))}
              <div style={{ marginTop: 13, background: isPaid ? '#ecfdf5' : '#eff6ff', borderRadius: 14, padding: 14, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: isPaid ? '#047857' : '#1d4ed8', fontWeight: 900 }}>{isPaid ? 'TOTAL LUNAS' : 'TOTAL TAGIHAN'}</span>
                <strong style={{ fontSize: 20, color: '#0f172a' }}>{money(amounts.total)}</strong>
              </div>
            </section>

            <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 18, marginBottom: 14 }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>🛠️ Informasi Perbaikan</div>
              <div style={{ color: '#475569', lineHeight: 1.6, fontSize: 13 }}>{cleanPublicServiceIssue(service.issue) || 'Rincian perbaikan tersimpan di toko.'}</div>
            </section>

            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 11, lineHeight: 1.5, paddingTop: 8 }}>
              Data garansi, status, biaya, diskon, dan nota ditarik dari satu data servis yang sama agar tetap sinkron.
            </div>
          </>
        )}
      </main>
    </div>
  );
}
