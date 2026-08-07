import React, { useMemo, useState } from 'react';
import { Users, MessageCircle, Clock, CheckCircle, ShoppingCart, Crown, Smartphone, Laptop, Star, Copy, Send, Gift, Zap } from 'lucide-react';

const normalizePhone = (value = '') => String(value || '').replace(/[^0-9+]/g, '').replace(/^0/, '62');
const dayMs = 24 * 60 * 60 * 1000;
const money = (value = 0) => Number(value || 0).toLocaleString('id-ID');

const getDateValue = (value) => {
  const parsed = new Date(value || Date.now()).getTime();
  return Number.isFinite(parsed) ? parsed : Date.now();
};

const getServiceAmount = (service = {}) => {
  return Number(service.total || 0) || Number(service.amount || 0) || Number(service.jasa_fee || 0) + Number(service.part_fee || 0) || 0;
};

const getDeviceType = (value = '') => {
  const text = String(value || '').toLowerCase();
  if (/iphone|android|samsung|oppo|vivo|xiaomi|redmi|realme|hp\b|handphone|smartphone|tablet|ipad/.test(text)) return 'HP';
  if (/laptop|notebook|macbook|asus|acer|lenovo|thinkpad|pc\b|komputer|windows/.test(text)) return 'LAPTOP';
  return 'LAINNYA';
};

const parsePosCustomer = (tx = {}) => {
  const desc = tx.description || '';
  const custMatch = desc.match(/\| Cust: ([^|]+)/);
  const waMatch = desc.match(/\| WA: ([^|]+)/);
  if (!custMatch && !waMatch) return null;
  return {
    id: tx.id,
    name: custMatch ? custMatch[1].trim() : 'Pelanggan POS',
    phone: waMatch ? waMatch[1].trim() : '',
    source: 'POS',
    status: 'SELESAI',
    device: 'Pembelian Kasir',
    created_at: tx.created_at,
    amount: Number(tx.amount || 0),
    rawDescription: desc,
  };
};

const buildTemplateText = ({ templateKey, storeName, segmentLabel, customerName = 'Kak' }) => {
  const templates = {
    ready: `Halo ${customerName}, servis perangkat Anda di ${storeName} sudah selesai dan siap diambil. Silakan datang ke toko saat sempat ya. Terima kasih.`,
    dormant: `Halo ${customerName}, salam dari ${storeName}. Sudah lama tidak servis perangkat. Minggu ini kami ada promo cek kondisi, cleaning, dan perawatan agar perangkat tetap awet.`,
    laptop: `Halo ${customerName}, ${storeName} ada layanan cleaning laptop, ganti thermal paste, install ulang, upgrade SSD/RAM, dan pengecekan performa. Mau kami bantu cek perangkatnya?`,
    hp: `Halo ${customerName}, ${storeName} siap bantu servis HP seperti ganti LCD, baterai, software, dan pengecekan kerusakan. Konsultasi dulu juga boleh.`,
    pos: `Halo ${customerName}, terima kasih sudah belanja di ${storeName}. Ada promo aksesoris, charger, sparepart, dan perlengkapan servis minggu ini.`,
    highValue: `Halo ${customerName}, terima kasih sudah menjadi pelanggan prioritas ${storeName}. Kami siapkan layanan prioritas untuk servis/perawatan berikutnya.`,
    general: `Halo ${customerName}, salam dari ${storeName}. Kami ingin mengabari promo dan layanan terbaru untuk pelanggan ${segmentLabel}.`,
  };
  return templates[templateKey] || templates.general;
};

export default function CustomerCRMInsights({ services = [], transactions = [], tenant, settings = {} }) {
  const storeName = settings.storeName || tenant?.name || 'Toko Servis';
  const [selectedSegment, setSelectedSegment] = useState('ready');
  const [selectedTemplate, setSelectedTemplate] = useState('ready');

  const crm = useMemo(() => {
    const map = new Map();

    const touch = (entry) => {
      const phone = normalizePhone(entry.phone || entry.customer_phone);
      const name = entry.name || entry.customer_name || 'Pelanggan';
      const key = phone || String(name || 'Tanpa Nama').trim().toLowerCase();
      if (!key) return;

      const createdAt = entry.created_at || new Date().toISOString();
      const createdTime = getDateValue(createdAt);
      const status = String(entry.status || '').toUpperCase().replace(/\s+/g, '_');
      const source = entry.source || 'SERVIS';
      const device = entry.device || entry.device_name || '';
      const deviceType = source === 'SERVIS' ? getDeviceType(device) : 'POS';
      const amount = source === 'POS' ? Number(entry.amount || 0) : getServiceAmount(entry);
      const isReadyPickup = source === 'SERVIS' && status === 'SELESAI';
      const isTaken = source === 'SERVIS' && (status === 'DIAMBIL' || status === 'DI_AMBIL');

      const prev = map.get(key) || {
        name,
        phone,
        lastAt: createdAt,
        lastSource: source,
        serviceCount: 0,
        posCount: 0,
        totalSpent: 0,
        readyPickupCount: 0,
        takenCount: 0,
        laptopCount: 0,
        hpCount: 0,
        posBuyerCount: 0,
        devices: new Set(),
        statuses: new Set(),
        latestStatus: '',
      };

      if (createdTime >= getDateValue(prev.lastAt)) {
        prev.lastAt = createdAt;
        prev.lastSource = source;
        prev.latestStatus = status;
      }

      if (source === 'POS') {
        prev.posCount += 1;
        prev.posBuyerCount += 1;
      } else {
        prev.serviceCount += 1;
      }

      if (deviceType === 'LAPTOP') prev.laptopCount += 1;
      if (deviceType === 'HP') prev.hpCount += 1;
      if (amount) prev.totalSpent += amount;
      if (status) prev.statuses.add(status);
      if (isReadyPickup) prev.readyPickupCount += 1;
      if (isTaken) prev.takenCount += 1;
      if (device) prev.devices.add(device);
      if (phone && !prev.phone) prev.phone = phone;
      map.set(key, prev);
    };

    services.forEach((service) => touch({ ...service, source: 'SERVIS' }));
    transactions.filter((tx) => tx.type === 'POS_SALES').map(parsePosCustomer).filter(Boolean).forEach(touch);

    const now = Date.now();
    const customers = Array.from(map.values()).map((item) => {
      const lastTime = getDateValue(item.lastAt);
      const daysFromLast = Math.max(0, Math.floor((now - lastTime) / dayMs));
      const readyPickup = Math.max(0, item.readyPickupCount - item.takenCount);
      const totalActivity = item.serviceCount + item.posCount;
      return {
        ...item,
        daysFromLast,
        readyPickup,
        totalActivity,
        devices: Array.from(item.devices),
        statuses: Array.from(item.statuses),
        isActive30: daysFromLast <= 30,
        isDormant60: Boolean(item.phone) && daysFromLast > 60,
        isHighValue: item.totalSpent >= 500000 || totalActivity >= 3,
      };
    });

    const bySegment = {
      ready: customers.filter((c) => c.phone && c.readyPickup > 0),
      active: customers.filter((c) => c.phone && c.isActive30),
      dormant: customers.filter((c) => c.isDormant60),
      laptop: customers.filter((c) => c.phone && c.laptopCount > 0),
      hp: customers.filter((c) => c.phone && c.hpCount > 0),
      pos: customers.filter((c) => c.phone && c.posBuyerCount > 0),
      highValue: customers.filter((c) => c.phone && c.isHighValue),
    };

    return {
      customers,
      bySegment,
      total: customers.length,
      withPhone: customers.filter((c) => c.phone).length,
      active30: bySegment.active.length,
      dormant60: bySegment.dormant.length,
      repeat: customers.filter((c) => c.totalActivity > 1).length,
      readyPickup: bySegment.ready.length,
      posBuyer: bySegment.pos.length,
      highValue: bySegment.highValue.length,
    };
  }, [services, transactions]);

  const segments = [
    { key: 'ready', template: 'ready', icon: CheckCircle, label: 'Siap Diambil', count: crm.readyPickup, hint: 'Status SELESAI tapi belum DIAMBIL.' },
    { key: 'active', template: 'general', icon: MessageCircle, label: 'Aktif 30 Hari', count: crm.active30, hint: 'Transaksi/servis terakhir maksimal 30 hari.' },
    { key: 'dormant', template: 'dormant', icon: Clock, label: 'Lama Tidak Datang', count: crm.dormant60, hint: 'Lebih dari 60 hari tidak kembali.' },
    { key: 'laptop', template: 'laptop', icon: Laptop, label: 'Servis Laptop', count: crm.bySegment.laptop?.length || 0, hint: 'Pelanggan dengan riwayat laptop/PC.' },
    { key: 'hp', template: 'hp', icon: Smartphone, label: 'Servis HP', count: crm.bySegment.hp?.length || 0, hint: 'Pelanggan dengan riwayat HP/tablet.' },
    { key: 'pos', template: 'pos', icon: ShoppingCart, label: 'Pembeli POS', count: crm.posBuyer, hint: 'Target promo aksesoris/sparepart.' },
    { key: 'highValue', template: 'highValue', icon: Star, label: 'Pelanggan Prioritas', count: crm.highValue, hint: 'Omzet tinggi atau sering transaksi.' },
  ];

  const activeSegment = segments.find((segment) => segment.key === selectedSegment) || segments[0];
  const selectedCustomers = crm.bySegment[selectedSegment] || [];
  const previewCustomer = selectedCustomers[0];
  const previewMessage = buildTemplateText({
    templateKey: selectedTemplate,
    storeName,
    segmentLabel: activeSegment.label,
    customerName: previewCustomer?.name || 'Kak',
  });

  const copySegmentPhones = async (key = selectedSegment) => {
    const selected = crm.bySegment[key] || [];
    const phones = selected.map((c) => c.phone).filter(Boolean).join(', ');
    if (!phones) return alert('Belum ada nomor WA di segment ini.');
    await navigator.clipboard.writeText(phones);
    alert(`Nomor segment berhasil disalin (${selected.length} pelanggan).`);
  };

  const openFirstWhatsApp = () => {
    const first = selectedCustomers.find((c) => c.phone);
    if (!first) return alert('Belum ada pelanggan dengan nomor WA di segment ini.');
    const msg = buildTemplateText({ templateKey: selectedTemplate, storeName, segmentLabel: activeSegment.label, customerName: first.name || 'Kak' });
    window.open(`https://wa.me/${first.phone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="customer-crm-insights">
      <div className="customer-crm-hero">
        <div>
          <p>CRM PELANGGAN</p>
          <h3>Pelanggan yang bisa difollow-up hari ini</h3>
          <span>Segmentasi otomatis dari status servis, tanggal transaksi terakhir, riwayat POS, dan jenis perangkat di {storeName}.</span>
        </div>
        <div className="customer-crm-pro-badge"><Crown size={15} /> WhatsApp Marketing Pro</div>
      </div>

      <div className="customer-crm-metrics">
        <div><span>Total Pelanggan</span><strong>{crm.total}</strong><small>Servis + POS</small></div>
        <div><span>Nomor WA</span><strong>{crm.withPhone}</strong><small>Siap dihubungi</small></div>
        <div><span>Repeat</span><strong>{crm.repeat}</strong><small>Lebih dari 1 aktivitas</small></div>
        <div><span>Perlu Follow-up</span><strong>{crm.readyPickup + crm.dormant60}</strong><small>Siap diambil / lama tidak datang</small></div>
      </div>

      <div className="customer-segment-grid">
        {segments.map((segment) => {
          const Icon = segment.icon;
          const active = selectedSegment === segment.key;
          return (
            <button
              key={segment.key}
              type="button"
              className={`customer-segment-card ${active ? 'active' : ''}`}
              onClick={() => {
                setSelectedSegment(segment.key);
                setSelectedTemplate(segment.template);
              }}
            >
              <span><Icon size={18} /></span>
              <strong>{segment.label}</strong>
              <b>{segment.count} pelanggan</b>
              <small>{segment.hint}</small>
            </button>
          );
        })}
      </div>

      <div className="customer-wa-pro-panel" style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'minmax(260px, 0.9fr) minmax(320px, 1.1fr)', gap: '14px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #dbeafe', borderRadius: '18px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#075985', fontWeight: '900' }}>
            <Zap size={17} /> Rekomendasi Follow-up
          </div>
          <p style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: '0.84rem', lineHeight: 1.5 }}>
            Segment aktif: <strong>{activeSegment.label}</strong>. Sistem memilih pelanggan berdasarkan aturan tanggal terakhir, status servis, jenis perangkat, dan riwayat pembelian.
          </p>
          <div style={{ display: 'grid', gap: '8px' }}>
            {selectedCustomers.slice(0, 4).map((customer) => (
              <div key={`${customer.phone}-${customer.name}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '10px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div>
                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.88rem' }}>{customer.name}</strong>
                  <small style={{ color: '#64748b' }}>{customer.daysFromLast} hari lalu • Rp {money(customer.totalSpent)}</small>
                </div>
                <small style={{ color: '#0f766e', fontWeight: '800', whiteSpace: 'nowrap' }}>{customer.totalActivity}x</small>
              </div>
            ))}
            {selectedCustomers.length === 0 && <div style={{ padding: '12px', borderRadius: '12px', background: '#f8fafc', color: '#64748b', fontSize: '0.86rem' }}>Belum ada pelanggan di segment ini.</div>}
          </div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #eff6ff 100%)', border: '1px solid #bbf7d0', borderRadius: '18px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: '900' }}>
              <Gift size={17} /> Campaign WhatsApp Pro
            </div>
            <span style={{ fontSize: '0.76rem', fontWeight: '800', color: '#0f766e', background: '#ccfbf1', padding: '5px 10px', borderRadius: '999px' }}>{selectedCustomers.length} target</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <select className="input-field" value={selectedSegment} onChange={(e) => {
              const segment = segments.find((item) => item.key === e.target.value);
              setSelectedSegment(e.target.value);
              setSelectedTemplate(segment?.template || 'general');
            }}>
              {segments.map((segment) => <option key={segment.key} value={segment.key}>{segment.label}</option>)}
            </select>
            <select className="input-field" value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>
              <option value="ready">Reminder Siap Diambil</option>
              <option value="dormant">Promo Pelanggan Lama</option>
              <option value="laptop">Promo Servis Laptop</option>
              <option value="hp">Promo Servis HP</option>
              <option value="pos">Promo Aksesoris/POS</option>
              <option value="highValue">Pelanggan Prioritas</option>
              <option value="general">Info Layanan Umum</option>
            </select>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #dcfce7', borderRadius: '14px', padding: '12px', marginBottom: '10px' }}>
            <small style={{ display: 'block', color: '#16a34a', fontWeight: '900', marginBottom: '6px' }}>Preview pesan</small>
            <p style={{ margin: 0, color: '#0f172a', fontSize: '0.9rem', lineHeight: 1.55 }}>{previewMessage}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="btn" style={{ background: '#e2e8f0', color: '#334155', fontWeight: '800' }} onClick={() => copySegmentPhones()}>
              <Copy size={16} /> Salin Nomor Segment
            </button>
            <button type="button" className="btn" style={{ background: '#22c55e', color: '#ffffff', fontWeight: '900' }} onClick={openFirstWhatsApp}>
              <Send size={16} /> Buka WA Target Pertama
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
