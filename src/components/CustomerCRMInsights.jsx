import React, { useMemo, useState } from 'react';
import { Users, MessageCircle, Clock, CheckCircle, ShoppingCart, Crown, Smartphone, Laptop, Star, Copy, Send, Gift, Zap, Play, Check, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { CAMPAIGN_TEMPLATES, renderCampaignTemplate } from '../config/waTemplates';

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

  // Batch 28: Campaign Template Library States
  const [selectedCampaignId, setSelectedCampaignId] = useState('promo_lcd');
  const [customMsgOverride, setCustomMsgOverride] = useState('');

  // Batch 24: WA Broadcast Automation Engine States
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState(0);
  const [broadcastLogs, setBroadcastLogs] = useState([]);
  const [broadcastBatchSize, setBroadcastBatchSize] = useState(20);
  const [broadcastDelaySec, setBroadcastDelaySec] = useState(3);

  const activeCampaignObj = CAMPAIGN_TEMPLATES.find((t) => t.id === selectedCampaignId) || CAMPAIGN_TEMPLATES[0];

  const currentPreviewData = {
    nama_pelanggan: previewCustomer?.name || 'Budi Santoso',
    nama_toko: storeName,
    resi: previewCustomer?.id || 'SRV-88219',
    perangkat: previewCustomer?.device || 'iPhone 13 Pro',
    biaya: previewCustomer?.totalSpent || 350000,
  };

  const activeTemplateRendered = renderCampaignTemplate(
    customMsgOverride || activeCampaignObj.template,
    currentPreviewData
  );

  const handleStartBroadcast = async () => {
    const validTargets = selectedCustomers.filter((c) => c.phone);
    if (validTargets.length === 0) {
      return alert('Tidak ada pelanggan dengan nomor WhatsApp valid di segment ini!');
    }

    const batchTargets = validTargets.slice(0, broadcastBatchSize);
    if (!window.confirm(`Mulai pengiriman WA Broadcast massal ke ${batchTargets.length} pelanggan?\n\nJeda waktu: ${broadcastDelaySec} detik/pesan (Batas Batch: ${broadcastBatchSize} nomor per siklus).`)) {
      return;
    }

    setIsBroadcasting(true);
    setBroadcastProgress(0);
    setBroadcastLogs([]);

    for (let i = 0; i < batchTargets.length; i++) {
      const cust = batchTargets[i];
      const msg = renderCampaignTemplate(customMsgOverride || activeCampaignObj.template, {
        nama_pelanggan: cust.name,
        nama_toko: storeName,
        resi: cust.id || 'SRV-88219',
        perangkat: Array.from(cust.devices || [])[0] || 'Perangkat',
      });

      const logId = 'LOG_' + Date.now() + '_' + i;
      const initialLog = {
        id: logId,
        customerName: cust.name,
        phone: cust.phone,
        status: 'PENDING',
        time: new Date().toLocaleTimeString('id-ID'),
        messageSnippet: msg.slice(0, 45) + '...',
      };

      setBroadcastLogs((prev) => [initialLog, ...prev]);

      // Rate limiter delay to prevent WhatsApp blocking
      await new Promise((r) => setTimeout(r, broadcastDelaySec * 1000));

      try {
        window.open(`https://wa.me/${cust.phone}?text=${encodeURIComponent(msg)}`, '_blank');
        setBroadcastLogs((prev) => prev.map((l) => (l.id === logId ? { ...l, status: 'SUCCESS' } : l)));
      } catch (err) {
        setBroadcastLogs((prev) => prev.map((l) => (l.id === logId ? { ...l, status: 'FAILED' } : l)));
      }

      setBroadcastProgress(Math.round(((i + 1) / batchTargets.length) * 100));
    }

    setIsBroadcasting(false);
    alert(`🎉 WA Broadcast Selesai! Berhasil memproses ${batchTargets.length} pesan.`);
  };

  return (
    <div className="customer-crm-insights">
      <div className="customer-crm-hero">
        <div>
          <p>CRM PELANGGAN & WA MARKETING AUTOMATION</p>
          <h3>Pelanggan yang bisa difollow-up hari ini</h3>
          <span>Segmentasi otomatis dari status servis, tanggal transaksi terakhir, riwayat POS, dan jenis perangkat di {storeName}.</span>
        </div>
        <div className="customer-crm-pro-badge"><Crown size={15} /> WhatsApp Marketing Pro (Fonnte)</div>
      </div>

      <div className="customer-crm-metrics">
        <div><span>Total Pelanggan</span><strong>{crm.total}</strong><small>Servis + POS</small></div>
        <div><span>Nomor WA</span><strong>{crm.withPhone}</strong><small>Siap dihubungi</small></div>
        <div><span>Repeat</span><strong>{crm.repeat}</strong><small>Lebih dari 1 aktivitas</small></div>
        <div><span>Perlu Follow-up</span><strong>{crm.readyPickup + crm.dormant60}</strong><small>Siap diambil / lama tidak datang</small></div>
      </div>

      {/* SMART FOLLOW-UP RULES ENGINE (Batch 27) */}
      <div style={{
        marginTop: '1.2rem', marginBottom: '1.2rem', padding: '1.2rem',
        borderRadius: '18px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: 'white', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>🧠</span>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '900', color: '#38bdf8' }}>
                Smart Follow-up Rules Engine (Rekomendasi Harian Otomatis)
              </h4>
              <small style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                Aturan kecerdasan buatan untuk memaksimalkan repeat order & penyelesaian servis.
              </small>
            </div>
          </div>
          <span style={{ background: '#0284c7', color: 'white', padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: '800' }}>
            4 Smart Rules Active
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {/* Rule 1 */}
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#ef4444', textTransform: 'uppercase', marginBottom: '4px' }}>
              🚨 Rule 1: Reminder Unit Selesai
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fff' }}>{crm.readyPickup} Pelanggan</div>
            <p style={{ margin: '4px 0 10px 0', fontSize: '0.76rem', color: '#cbd5e1' }}>Servis selesai namun belum diambil.</p>
            <button
              type="button"
              className="btn"
              style={{ padding: '6px 10px', fontSize: '0.76rem', background: '#ef4444', color: 'white', border: 'none', fontWeight: '800', width: '100%' }}
              onClick={() => {
                setSelectedSegment('ready');
                setSelectedCampaignId('reminder_pengambilan');
                const found = CAMPAIGN_TEMPLATES.find((t) => t.id === 'reminder_pengambilan');
                if (found) setCustomMsgOverride(found.template);
              }}
            >
              Eksekusi Rule 1 →
            </button>
          </div>

          {/* Rule 2 */}
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#f59e0b', textTransform: 'uppercase', marginBottom: '4px' }}>
              🕒 Rule 2: Re-aktivasi Dorman (&gt;60hr)
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fff' }}>{crm.dormant60} Pelanggan</div>
            <p style={{ margin: '4px 0 10px 0', fontSize: '0.76rem', color: '#cbd5e1' }}>Tidak ada transaksi &gt;60 hari.</p>
            <button
              type="button"
              className="btn"
              style={{ padding: '6px 10px', fontSize: '0.76rem', background: '#f59e0b', color: 'white', border: 'none', fontWeight: '800', width: '100%' }}
              onClick={() => {
                setSelectedSegment('dormant');
                setSelectedCampaignId('followup_lama');
                const found = CAMPAIGN_TEMPLATES.find((t) => t.id === 'followup_lama');
                if (found) setCustomMsgOverride(found.template);
              }}
            >
              Eksekusi Rule 2 →
            </button>
          </div>

          {/* Rule 3 */}
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', marginBottom: '4px' }}>
              💻 Rule 3: Maintenance Laptop
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fff' }}>{crm.bySegment.laptop?.length || 0} Pelanggan</div>
            <p style={{ margin: '4px 0 10px 0', fontSize: '0.76rem', color: '#cbd5e1' }}>Promo Thermal Paste & Upgrade RAM/SSD.</p>
            <button
              type="button"
              className="btn"
              style={{ padding: '6px 10px', fontSize: '0.76rem', background: '#0284c7', color: 'white', border: 'none', fontWeight: '800', width: '100%' }}
              onClick={() => {
                setSelectedSegment('laptop');
                setSelectedCampaignId('promo_cleaning_laptop');
                const found = CAMPAIGN_TEMPLATES.find((t) => t.id === 'promo_cleaning_laptop');
                if (found) setCustomMsgOverride(found.template);
              }}
            >
              Eksekusi Rule 3 →
            </button>
          </div>

          {/* Rule 4 */}
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#4ade80', textTransform: 'uppercase', marginBottom: '4px' }}>
              📱 Rule 4: Sparepart HP
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fff' }}>{crm.bySegment.hp?.length || 0} Pelanggan</div>
            <p style={{ margin: '4px 0 10px 0', fontSize: '0.76rem', color: '#cbd5e1' }}>Promo Baterai Awet & LCD Original.</p>
            <button
              type="button"
              className="btn"
              style={{ padding: '6px 10px', fontSize: '0.76rem', background: '#16a34a', color: 'white', border: 'none', fontWeight: '800', width: '100%' }}
              onClick={() => {
                setSelectedSegment('hp');
                setSelectedCampaignId('promo_lcd');
                const found = CAMPAIGN_TEMPLATES.find((t) => t.id === 'promo_lcd');
                if (found) setCustomMsgOverride(found.template);
              }}
            >
              Eksekusi Rule 4 →
            </button>
          </div>
        </div>
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

      {/* PANEL 1: REKOMENDASI SEGMENT & BATCH BROADCAST */}
      <div className="customer-wa-pro-panel" style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'minmax(260px, 0.9fr) minmax(320px, 1.1fr)', gap: '14px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #dbeafe', borderRadius: '18px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#075985', fontWeight: '900' }}>
            <Zap size={17} /> Target Pelanggan ({selectedCustomers.length})
          </div>
          <p style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: '0.84rem', lineHeight: 1.5 }}>
            Segment aktif: <strong>{activeSegment.label}</strong>. Sistem memilih pelanggan berdasarkan tanggal terakhir, status servis, jenis perangkat, dan riwayat pembelian.
          </p>
          <div style={{ display: 'grid', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
            {selectedCustomers.map((customer) => (
              <div key={`${customer.phone}-${customer.name}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '10px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div>
                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.88rem' }}>{customer.name}</strong>
                  <small style={{ color: '#64748b' }}>{customer.phone || 'Tanpa WA'} • {customer.daysFromLast} hari lalu</small>
                </div>
                <small style={{ color: '#0f766e', fontWeight: '800', whiteSpace: 'nowrap' }}>Rp {money(customer.totalSpent)}</small>
              </div>
            ))}
            {selectedCustomers.length === 0 && <div style={{ padding: '12px', borderRadius: '12px', background: '#f8fafc', color: '#64748b', fontSize: '0.86rem' }}>Belum ada pelanggan di segment ini.</div>}
          </div>
        </div>

        {/* BATCH 28: CAMPAIGN TEMPLATE LIBRARY & BATCH 24: BROADCAST AUTOMATION */}
        <div style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #eff6ff 100%)', border: '1px solid #bbf7d0', borderRadius: '18px', padding: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: '900', fontSize: '1rem' }}>
              <Layers size={18} /> Library Campaign Template (Batch 28)
            </div>
            <span style={{ fontSize: '0.76rem', fontWeight: '800', color: '#0f766e', background: '#ccfbf1', padding: '5px 10px', borderRadius: '999px' }}>
              {selectedCustomers.filter((c) => c.phone).length} WA Aktif Target
            </span>
          </div>

          {/* TEMPLATE PICKER DROPDOWN */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#166534', marginBottom: '4px' }}>Pilih Template Pesan Campaign:</label>
            <select
              className="input-field"
              value={selectedCampaignId}
              onChange={(e) => {
                setSelectedCampaignId(e.target.value);
                const found = CAMPAIGN_TEMPLATES.find((t) => t.id === e.target.value);
                if (found) setCustomMsgOverride(found.template);
              }}
              style={{ fontWeight: '700', background: '#fff' }}
            >
              {CAMPAIGN_TEMPLATES.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.title} ({tmpl.badge})
                </option>
              ))}
            </select>
          </div>

          {/* PREVIEW PESAN DENGAN VARIABEL DINAMIS */}
          <div style={{ background: '#ffffff', border: '1px solid #dcfce7', borderRadius: '14px', padding: '12px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <small style={{ color: '#16a34a', fontWeight: '900' }}>Pratinjau Pesan (Variabel Dinamis Terisi Automatic)</small>
              <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                {activeCampaignObj.badge}
              </span>
            </div>
            <p style={{ margin: 0, color: '#0f172a', fontSize: '0.88rem', lineHeight: 1.55, whiteSpace: 'pre-wrap', fontFamily: 'sans-serif' }}>
              {activeTemplateRendered}
            </p>
          </div>

          {/* BATCH 24: WA BROADCAST CONTROLS & SAFE RATE LIMITER */}
          <div style={{ background: '#ffffff', borderRadius: '14px', padding: '12px', border: '1px solid #cbd5e1', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={15} color="#d97706" /> Pengaturan Anti-Ban Rate Limiter (Batch 24)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>Maks Kontak per Batch:</label>
                <select
                  className="input-field"
                  value={broadcastBatchSize}
                  onChange={(e) => setBroadcastBatchSize(Number(e.target.value))}
                  style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                >
                  <option value={10}>10 Kontak / Siklus</option>
                  <option value={20}>20 Kontak / Siklus (Maks Aman)</option>
                  <option value={50}>50 Kontak (Resiko Tinggi)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>Jeda Waktu Aman per Pesan:</label>
                <select
                  className="input-field"
                  value={broadcastDelaySec}
                  onChange={(e) => setBroadcastDelaySec(Number(e.target.value))}
                  style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                >
                  <option value={3}>3 Detik (Aman Standard)</option>
                  <option value={5}>5 Detik (Sangat Aman)</option>
                </select>
              </div>
            </div>
          </div>

          {/* BROADCAST PROGRESS & LOG TABLE */}
          {isBroadcasting && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '10px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '800', color: '#166534', marginBottom: '4px' }}>
                <span>🚀 Mengirim Broadcast Massal...</span>
                <span>{broadcastProgress}%</span>
              </div>
              <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '100px', overflow: 'hidden' }}>
                <div style={{ width: `${broadcastProgress}%`, height: '100%', background: '#22c55e', transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" className="btn" style={{ background: '#e2e8f0', color: '#334155', fontWeight: '800', fontSize: '0.82rem' }} onClick={() => copySegmentPhones()}>
              <Copy size={15} /> Salin Nomor WA ({selectedCustomers.filter((c) => c.phone).length})
            </button>
            <button type="button" className="btn" style={{ background: '#22c55e', color: '#ffffff', fontWeight: '900', fontSize: '0.82rem' }} onClick={openFirstWhatsApp}>
              <Send size={15} /> Buka WA 1-Klik
            </button>
            <button
              type="button"
              className="btn"
              disabled={isBroadcasting}
              style={{ background: isBroadcasting ? '#cbd5e1' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', fontWeight: '900', fontSize: '0.82rem' }}
              onClick={handleStartBroadcast}
            >
              <Play size={15} /> {isBroadcasting ? 'Pengiriman Berjalan...' : 'Mulai Broadcast Massal Fonnte 🚀'}
            </button>
          </div>

          {/* LOG PROSES BROADCAST REALTIME */}
          {broadcastLogs.length > 0 && (
            <div style={{ marginTop: '12px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '10px' }}>
              <strong style={{ fontSize: '0.78rem', color: '#334155', display: 'block', marginBottom: '6px' }}>📋 Log Status Pengiriman Broadcast:</strong>
              <div style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '0.78rem' }}>
                {broadcastLogs.map((log) => (
                  <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>{log.customerName} ({log.phone})</span>
                    <span style={{ fontWeight: '800', color: log.status === 'SUCCESS' ? '#16a34a' : log.status === 'FAILED' ? '#dc2626' : '#d97706' }}>
                      {log.status === 'SUCCESS' ? '🟢 Sukses' : log.status === 'FAILED' ? '🔴 Gagal' : '⏳ Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
