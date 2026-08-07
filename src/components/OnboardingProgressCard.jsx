import React, { useMemo } from 'react';
import { Store, Users, Package, Wrench, CheckCircle2, ArrowRight } from 'lucide-react';

const isDefaultStoreName = (value = '') => {
  const text = String(value || '').trim().toLowerCase();
  return !text || text.includes('aiservice.id toko') || text.includes('unitpro toko') || text === 'toko servis';
};

export default function OnboardingProgressCard({ tenant, users = [], products = [], services = [], setActiveTab }) {
  const setup = useMemo(() => {
    const storeName = tenant?.settings?.storeName || tenant?.name || '';
    const storeWa = tenant?.settings?.store_wa || tenant?.phone || '';
    const technicianCount = users.filter((user) => ['TEKNISI', 'Teknisi'].includes(user.role)).length;
    const jasaCount = products.filter((product) => String(product.category || '').toUpperCase() === 'JASA').length;
    const physicalCount = products.filter((product) => String(product.category || '').toUpperCase() !== 'JASA').length;
    const steps = [
      { key: 'store', title: 'Setup Toko', desc: 'Nama toko dan nomor WhatsApp aktif.', done: !isDefaultStoreName(storeName) && Boolean(storeWa), tab: 'pengaturan', icon: Store },
      { key: 'team', title: 'Tambah Teknisi', desc: 'Minimal 1 teknisi untuk menerima tugas.', done: technicianCount > 0, tab: 'karyawan', icon: Users },
      { key: 'catalog', title: 'Barang & Jasa', desc: 'Isi sparepart dan katalog jasa servis.', done: physicalCount > 0 && jasaCount > 0, tab: 'master', icon: Package },
      { key: 'firstService', title: 'Servis Pertama', desc: 'Buat resi pertama untuk uji flow.', done: services.length > 0, tab: 'servis', icon: Wrench },
    ];
    const doneCount = steps.filter((step) => step.done).length;
    return { steps, doneCount, percent: Math.round((doneCount / steps.length) * 100) };
  }, [tenant, users, products, services]);

  if (setup.percent >= 100 && services.length > 3) return null;

  return (
    <section style={{ background: '#ffffff', border: '1px solid #bae6fd', borderRadius: 22, padding: '1.15rem', marginBottom: '1.25rem', boxShadow: '0 12px 30px rgba(2, 132, 199, 0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <p style={{ margin: '0 0 5px', color: '#0284c7', fontWeight: 900, fontSize: '.72rem', letterSpacing: '.08em' }}>ONBOARDING TOKO BARU</p>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.15rem', fontWeight: 900 }}>Jalur cepat: setup toko → teknisi → barang/jasa → servis pertama</h3>
          <span style={{ display: 'block', marginTop: 5, color: '#64748b', fontSize: '.86rem' }}>Ikuti urutan ini supaya UnitPro langsung siap dipakai kasir dan teknisi.</span>
        </div>
        <div style={{ minWidth: 160, background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', borderRadius: 16, padding: '10px 14px', fontWeight: 900, textAlign: 'center' }}>
          {setup.percent}% siap
          <div style={{ marginTop: 8, height: 8, background: '#dbeafe', borderRadius: 99, overflow: 'hidden' }}><div style={{ width: `${setup.percent}%`, height: '100%', background: 'linear-gradient(90deg, #0284c7, #10b981)' }} /></div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
        {setup.steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <button key={step.key} type="button" onClick={() => setActiveTab?.(step.tab)} style={{ textAlign: 'left', border: `1px solid ${step.done ? '#bbf7d0' : '#e2e8f0'}`, background: step.done ? '#f0fdf4' : '#f8fafc', borderRadius: 16, padding: 12, cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ width: 34, height: 34, borderRadius: 12, background: step.done ? '#bbf7d0' : '#e0f2fe', color: step.done ? '#047857' : '#0369a1', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                {step.done ? <CheckCircle2 size={18} /> : <Icon size={18} />}
              </span>
              <span style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', color: '#0f172a', fontSize: '.9rem' }}>{index + 1}. {step.title}</strong>
                <small style={{ display: 'block', color: '#64748b', lineHeight: 1.35, marginTop: 3 }}>{step.desc}</small>
                <small style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: step.done ? '#047857' : '#0284c7', fontWeight: 900, marginTop: 7 }}>{step.done ? 'Selesai' : 'Buka menu'} {!step.done && <ArrowRight size={12} />}</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
