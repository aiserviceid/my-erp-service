import React, { useMemo } from 'react';
import { Users, MessageCircle, Clock, CheckCircle, ShoppingCart, Crown } from 'lucide-react';

const normalizePhone = (value = '') => String(value || '').replace(/[^0-9+]/g, '').replace(/^0/, '62');

const parsePosCustomer = (tx = {}) => {
  const desc = tx.description || '';
  const custMatch = desc.match(/\| Cust: ([^|]+)/);
  const waMatch = desc.match(/\| WA: ([^|]+)/);
  if (!custMatch && !waMatch) return null;
  return {
    name: custMatch ? custMatch[1].trim() : 'Pelanggan POS',
    phone: waMatch ? waMatch[1].trim() : '',
    source: 'POS',
    status: 'SELESAI',
    device: 'Pembelian Kasir',
    created_at: tx.created_at,
    amount: Number(tx.amount || 0),
  };
};

export default function CustomerCRMInsights({ services = [], transactions = [], tenant, settings = {} }) {
  const crm = useMemo(() => {
    const map = new Map();
    const touch = (entry) => {
      const phone = normalizePhone(entry.phone || entry.customer_phone);
      const key = phone || String(entry.name || entry.customer_name || 'Tanpa Nama').trim().toLowerCase();
      if (!key) return;
      const prev = map.get(key) || {
        name: entry.name || entry.customer_name || 'Pelanggan',
        phone,
        lastAt: entry.created_at || new Date().toISOString(),
        serviceCount: 0,
        posCount: 0,
        totalSpent: 0,
        readyPickup: 0,
        devices: new Set(),
        statuses: new Set(),
      };
      const currentDate = new Date(entry.created_at || Date.now()).getTime();
      const prevDate = new Date(prev.lastAt || 0).getTime();
      if (currentDate >= prevDate) prev.lastAt = entry.created_at || prev.lastAt;
      if (entry.source === 'POS') prev.posCount += 1;
      else prev.serviceCount += 1;
      if (entry.amount) prev.totalSpent += Number(entry.amount || 0);
      const status = String(entry.status || '').toUpperCase();
      if (status) prev.statuses.add(status);
      if (status === 'SELESAI') prev.readyPickup += 1;
      const device = entry.device || entry.device_name;
      if (device) prev.devices.add(device);
      if (phone && !prev.phone) prev.phone = phone;
      map.set(key, prev);
    };

    services.forEach((service) => touch({ ...service, source: 'SERVIS' }));
    transactions.filter((tx) => tx.type === 'POS_SALES').map(parsePosCustomer).filter(Boolean).forEach(touch);

    const customers = Array.from(map.values()).map((item) => ({ ...item, devices: Array.from(item.devices), statuses: Array.from(item.statuses) }));
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    return {
      customers,
      total: customers.length,
      withPhone: customers.filter((c) => c.phone).length,
      active30: customers.filter((c) => now - new Date(c.lastAt || now).getTime() <= 30 * day).length,
      dormant60: customers.filter((c) => c.phone && now - new Date(c.lastAt || now).getTime() > 60 * day).length,
      repeat: customers.filter((c) => (c.serviceCount + c.posCount) > 1).length,
      readyPickup: customers.filter((c) => c.readyPickup > 0).length,
      posBuyer: customers.filter((c) => c.posCount > 0).length,
    };
  }, [services, transactions]);

  const storeName = settings.storeName || tenant?.name || 'Toko Servis';
  const segments = [
    { key: 'ready', icon: CheckCircle, label: 'Siap Diambil', count: crm.readyPickup, hint: 'Follow-up barang selesai agar cepat diambil.' },
    { key: 'active', icon: MessageCircle, label: 'Aktif 30 Hari', count: crm.active30, hint: 'Pelanggan hangat untuk update layanan.' },
    { key: 'dormant', icon: Clock, label: 'Lama Tidak Datang', count: crm.dormant60, hint: 'Cocok untuk promo servis berkala.' },
    { key: 'pos', icon: ShoppingCart, label: 'Pembeli POS', count: crm.posBuyer, hint: 'Target promo aksesoris dan sparepart.' },
  ];

  const copySegmentPhones = async (key) => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const selected = crm.customers.filter((c) => {
      const last = new Date(c.lastAt || now).getTime();
      if (!c.phone) return false;
      if (key === 'ready') return c.readyPickup > 0;
      if (key === 'active') return now - last <= 30 * day;
      if (key === 'dormant') return now - last > 60 * day;
      if (key === 'pos') return c.posCount > 0;
      return false;
    });
    const phones = selected.map((c) => c.phone).filter(Boolean).join(', ');
    if (!phones) return alert('Belum ada nomor WA di segment ini.');
    await navigator.clipboard.writeText(phones);
    alert(`Nomor segment berhasil disalin (${selected.length} pelanggan).`);
  };

  return (
    <div className="customer-crm-insights">
      <div className="customer-crm-hero">
        <div>
          <p>CRM PELANGGAN</p>
          <h3>Pelanggan yang bisa difollow-up hari ini</h3>
          <span>Data otomatis dari servis dan kasir. Gunakan ini untuk menjaga pelanggan lama tetap kembali ke {storeName}.</span>
        </div>
        <div className="customer-crm-pro-badge"><Crown size={15} /> WhatsApp Marketing Pro</div>
      </div>

      <div className="customer-crm-metrics">
        <div><span>Total Pelanggan</span><strong>{crm.total}</strong><small>Servis + POS</small></div>
        <div><span>Nomor WA</span><strong>{crm.withPhone}</strong><small>Siap dihubungi</small></div>
        <div><span>Repeat</span><strong>{crm.repeat}</strong><small>Lebih dari 1 transaksi</small></div>
        <div><span>Perlu Follow-up</span><strong>{crm.readyPickup + crm.dormant60}</strong><small>Siap diambil / lama tidak datang</small></div>
      </div>

      <div className="customer-segment-grid">
        {segments.map((segment) => {
          const Icon = segment.icon;
          return (
            <button key={segment.key} type="button" className="customer-segment-card" onClick={() => copySegmentPhones(segment.key)}>
              <span><Icon size={18} /></span>
              <strong>{segment.label}</strong>
              <b>{segment.count} pelanggan</b>
              <small>{segment.hint}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}
