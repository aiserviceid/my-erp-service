import React, { useMemo } from 'react';
import { ShieldCheck, Database, KeyRound, UserCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function SecurityReadinessPanel({ tenant, users = [], products = [], services = [], transactions = [] }) {
  const checks = useMemo(() => {
    const hasTenant = Boolean(tenant?.code);
    const hasTeamRoles = users.every((user) => Boolean(user.role));
    const hasTechnicianPhone = users.filter((user) => ['TEKNISI', 'Teknisi'].includes(user.role)).every((user) => Boolean(user.phone));
    const hasProductSchemaData = products.every((product) => Object.prototype.hasOwnProperty.call(product, 'category') || Object.prototype.hasOwnProperty.call(product, 'image_url') || Object.prototype.hasOwnProperty.call(product, 'imageUrl'));
    const hasTenantTransactions = transactions.every((tx) => !tx.tenant_code || tx.tenant_code === tenant?.code);
    const hasTenantServices = services.every((service) => !service.tenant_code || service.tenant_code === tenant?.code);
    return [
      { key: 'tenant', label: 'Tenant aktif', desc: 'Aplikasi berjalan memakai kode toko/tenant.', done: hasTenant, icon: ShieldCheck },
      { key: 'roles', label: 'Role tim jelas', desc: 'Semua user punya role kasir/teknisi/owner.', done: hasTeamRoles, icon: UserCheck },
      { key: 'phone', label: 'WA teknisi siap', desc: 'Nomor teknisi dibutuhkan untuk notifikasi tugas.', done: users.filter((u) => ['TEKNISI', 'Teknisi'].includes(u.role)).length === 0 ? false : hasTechnicianPhone, icon: KeyRound },
      { key: 'schema', label: 'Schema produk siap', desc: 'Produk punya kategori/foto untuk lintas perangkat.', done: hasProductSchemaData, icon: Database },
      { key: 'dataScope', label: 'Data tenant aman', desc: 'Servis/transaksi tidak bercampur tenant lain.', done: hasTenantTransactions && hasTenantServices, icon: ShieldCheck },
    ];
  }, [tenant, users, products, services, transactions]);

  const passed = checks.filter((item) => item.done).length;
  const percent = Math.round((passed / checks.length) * 100);
  const needsAttention = checks.filter((item) => !item.done);

  return (
    <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '1.1rem', marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <p style={{ margin: '0 0 5px', color: '#7c3aed', fontSize: '.72rem', letterSpacing: '.08em', fontWeight: 900 }}>DATABASE & SECURITY READY</p>
          <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 900 }}>Kesiapan sebelum jual massal</h3>
          <span style={{ display: 'block', color: '#64748b', fontSize: '.86rem', marginTop: 5 }}>Panel ini mengecek sinyal penting multi-tenant, role, schema, dan data operasional.</span>
        </div>
        <div style={{ minWidth: 150, padding: '10px 14px', borderRadius: 16, background: percent >= 80 ? '#f0fdf4' : '#fffbeb', color: percent >= 80 ? '#166534' : '#92400e', border: `1px solid ${percent >= 80 ? '#bbf7d0' : '#fde68a'}`, fontWeight: 900, textAlign: 'center' }}>
          {percent}% siap
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
        {checks.map((check) => {
          const Icon = check.icon;
          return (
            <div key={check.key} style={{ border: `1px solid ${check.done ? '#bbf7d0' : '#fed7aa'}`, background: check.done ? '#f0fdf4' : '#fff7ed', borderRadius: 15, padding: 12 }}>
              <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ width: 30, height: 30, borderRadius: 11, display: 'grid', placeItems: 'center', background: check.done ? '#dcfce7' : '#ffedd5', color: check.done ? '#047857' : '#c2410c' }}>{check.done ? <CheckCircle2 size={17} /> : <Icon size={17} />}</span>
                <strong style={{ color: '#0f172a', fontSize: '.88rem' }}>{check.label}</strong>
              </div>
              <small style={{ color: '#64748b', lineHeight: 1.4 }}>{check.desc}</small>
            </div>
          );
        })}
      </div>

      {needsAttention.length > 0 && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 15, background: '#fffbeb', color: '#92400e', fontSize: '.84rem', lineHeight: 1.5 }}>
          <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Perlu dicek: {needsAttention.map((item) => item.label).join(', ')}. Gunakan SQL readiness dan checklist final sebelum merge ke production.
        </div>
      )}
    </section>
  );
}
