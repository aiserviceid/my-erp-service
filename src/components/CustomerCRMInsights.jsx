import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Users,
  MessageCircle,
  Clock,
  CheckCircle,
  ShoppingCart,
  Crown,
  Smartphone,
  Laptop,
  Star,
  Copy,
  Send,
  Zap,
  Play,
  AlertCircle,
  RefreshCw,
  Bot,
  Pause,
  Sparkles,
} from 'lucide-react';
import { apiService } from '../services/api';
import { getWhatsAppSenderConfig, sendWhatsAppNotification } from '../services/notificationService';
import { CAMPAIGN_VARIABLES, findUnknownCampaignVariables, renderCampaignTemplate } from '../config/waTemplates';

const normalizePhone = (value = '') => String(value || '').replace(/[^0-9+]/g, '').replace(/^0/, '62');
const dayMs = 24 * 60 * 60 * 1000;
const money = (value = 0) => Number(value || 0).toLocaleString('id-ID');

const getDateValue = (value) => {
  const parsed = new Date(value || Date.now()).getTime();
  return Number.isFinite(parsed) ? parsed : Date.now();
};

const getServiceAmount = (service = {}) => (
  Number(service.total || 0)
  || Number(service.amount || 0)
  || Number(service.jasa_fee || 0) + Number(service.part_fee || 0)
  || 0
);

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
  };
};

const DEFAULT_GOALS = {
  ready: 'Ingatkan pelanggan bahwa servis sudah selesai dan siap diambil. Gunakan nada ramah, singkat, dan ajak pelanggan mengecek tracking bila perlu.',
  dormant: 'Ajak pelanggan yang sudah lama tidak datang untuk kembali melakukan pengecekan atau perawatan perangkat tanpa membuat klaim promo yang tidak diberikan toko.',
  laptop: 'Tawarkan layanan maintenance laptop seperti cleaning, thermal paste, pengecekan performa, atau upgrade secara konsultatif.',
  hp: 'Tawarkan layanan servis dan pengecekan HP secara konsultatif, tanpa mengarang diskon atau harga.',
  pos: 'Follow-up pembeli POS dengan ucapan terima kasih dan ajakan kembali bila membutuhkan aksesori atau sparepart.',
  highValue: 'Berikan ucapan apresiasi untuk pelanggan prioritas dan ajak menghubungi toko bila membutuhkan servis berikutnya.',
  active: 'Jaga hubungan dengan pelanggan aktif dan informasikan bahwa toko siap membantu kebutuhan servis atau perawatan berikutnya.',
};

export default function CustomerCRMInsights({ services = [], transactions = [], tenant, settings = {} }) {
  const storeName = settings.storeName || tenant?.name || 'Toko Servis';
  const [selectedSegment, setSelectedSegment] = useState('ready');
  const [campaignGoal, setCampaignGoal] = useState(DEFAULT_GOALS.ready);
  const [campaignTone, setCampaignTone] = useState('Ramah, singkat, profesional');
  const [campaignCta, setCampaignCta] = useState('Ajak pelanggan membalas WhatsApp bila ingin konsultasi atau konfirmasi.');
  const [campaignMessage, setCampaignMessage] = useState('');
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [gatewayTestStatus, setGatewayTestStatus] = useState('idle');
  const messageRef = useRef(null);
  const [agentEnabled, setAgentEnabled] = useState(Boolean(settings.ai_agent_enabled));
  const [agentPausedUntil, setAgentPausedUntil] = useState(Number(settings.ai_agent_paused_until || 0));
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentStatus, setAgentStatus] = useState('');
  const [showAgentChats, setShowAgentChats] = useState(false);
  const [agentConversations, setAgentConversations] = useState([]);
  const [loadingAgentChats, setLoadingAgentChats] = useState(false);

  useEffect(() => {
    setAgentEnabled(Boolean(settings.ai_agent_enabled));
    setAgentPausedUntil(Number(settings.ai_agent_paused_until || 0));
  }, [settings.ai_agent_enabled, settings.ai_agent_paused_until]);

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState(0);
  const [broadcastLogs, setBroadcastLogs] = useState([]);
  const [broadcastBatchSize, setBroadcastBatchSize] = useState(20);
  const [broadcastDelaySec, setBroadcastDelaySec] = useState(3);

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
        latestResi: '',
        latestDevice: '',
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
        prev.latestResi = entry.resi || entry.id || prev.latestResi || '';
        prev.latestDevice = device || prev.latestDevice || '';
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
    { key: 'ready', icon: CheckCircle, label: 'Siap Diambil', count: crm.readyPickup, hint: 'Status SELESAI tapi belum DIAMBIL.' },
    { key: 'active', icon: MessageCircle, label: 'Aktif 30 Hari', count: crm.active30, hint: 'Aktivitas terakhir maksimal 30 hari.' },
    { key: 'dormant', icon: Clock, label: 'Lama Tidak Datang', count: crm.dormant60, hint: 'Lebih dari 60 hari tidak kembali.' },
    { key: 'laptop', icon: Laptop, label: 'Servis Laptop', count: crm.bySegment.laptop?.length || 0, hint: 'Riwayat laptop/PC.' },
    { key: 'hp', icon: Smartphone, label: 'Servis HP', count: crm.bySegment.hp?.length || 0, hint: 'Riwayat HP/tablet.' },
    { key: 'pos', icon: ShoppingCart, label: 'Pembeli POS', count: crm.posBuyer, hint: 'Pembeli aksesoris/sparepart.' },
    { key: 'highValue', icon: Star, label: 'Pelanggan Prioritas', count: crm.highValue, hint: 'Omzet tinggi atau sering transaksi.' },
  ];

  const activeSegment = segments.find((segment) => segment.key === selectedSegment) || segments[0];
  const selectedCustomers = crm.bySegment[selectedSegment] || [];
  const previewCustomer = selectedCustomers[0];
  const senderConfig = getWhatsAppSenderConfig(tenant);
  const hasCustomGatewayToken = senderConfig.mode === 'CUSTOM' && Boolean(senderConfig.token);
  const gatewayLabel = senderConfig.mode === 'CUSTOM'
    ? (hasCustomGatewayToken ? 'Gateway Custom Siap' : 'Token Gateway Belum Diisi')
    : 'Mode Gateway Sistem';

  const buildRenderData = (customer = {}) => {
    const resi = customer.latestResi || '-';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return {
      nama_pelanggan: customer.name || 'Pelanggan',
      nama_toko: storeName,
      resi,
      perangkat: customer.latestDevice || customer.devices?.[0] || 'Perangkat',
      biaya: customer.totalSpent || 0,
      link_tracking: resi && resi !== '-' && origin ? `${origin}/tracking?resi=${encodeURIComponent(resi)}` : '',
      hari_sejak_terakhir: customer.daysFromLast || 0,
      jumlah_transaksi: customer.totalActivity || 0,
    };
  };

  const activePreview = campaignMessage
    ? renderCampaignTemplate(campaignMessage, buildRenderData(previewCustomer || {}))
    : 'Tulis pesan sendiri atau gunakan tombol “Buat dengan Gemini”. Pratinjau personalisasi akan muncul di sini.';
  const unknownVariables = findUnknownCampaignVariables(campaignMessage);

  const selectSegment = (segmentKey) => {
    setSelectedSegment(segmentKey);
    setCampaignGoal(DEFAULT_GOALS[segmentKey] || DEFAULT_GOALS.active);
  };

  const insertVariable = (token) => {
    const textarea = messageRef.current;
    if (!textarea) {
      setCampaignMessage((current) => `${current}${current ? ' ' : ''}${token}`);
      return;
    }
    const start = textarea.selectionStart ?? campaignMessage.length;
    const end = textarea.selectionEnd ?? campaignMessage.length;
    const next = `${campaignMessage.slice(0, start)}${token}${campaignMessage.slice(end)}`;
    setCampaignMessage(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + token.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const handleGenerateCopy = async (instruction = '') => {
    if (!campaignGoal.trim()) return alert('Tulis permintaan untuk AI terlebih dahulu.');
    setIsGeneratingCopy(true);
    try {
      const result = await apiService.post('/ai/copywriting', {
        tenant_code: tenant?.code,
        prompt: campaignGoal.trim(),
        segment_key: selectedSegment,
        segment_label: activeSegment.label,
        current_message: campaignMessage,
        instruction,
      });
      if (result?.error) throw new Error(result.error);
      const text = String(result?.text || '').trim();
      if (!text) throw new Error('Gemini tidak mengembalikan teks.');
      setCampaignMessage(text);
    } catch (error) {
      alert(`Gagal membuat pesan: ${error?.message || 'layanan Gemini belum siap'}`);
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  const saveAgentSettings = async (patch) => {
    const nextSettings = { ...settings, ai_agent_enabled: agentEnabled, ai_agent_paused_until: agentPausedUntil, ...patch };
    await apiService.updateTenantSettings(tenant.code, nextSettings);
    return nextSettings;
  };

  const handleToggleAgent = async () => {
    if (!tenant?.code) return;
    const nextEnabled = !agentEnabled;
    if (nextEnabled && !(senderConfig.mode === 'CUSTOM' && senderConfig.token)) {
      return alert('AI Agent otomatis membutuhkan mode CUSTOM + Token Fonnte. Isi di Pengaturan → WhatsApp Gateway terlebih dahulu.');
    }
    setAgentBusy(true);
    setAgentStatus('');
    try {
      if (nextEnabled) {
        await saveAgentSettings({ ai_agent_enabled: true, ai_agent_paused_until: 0 });
        const setup = await apiService.post('/whatsapp/setup-agent', { tenant_code: tenant.code });
        if (setup?.error) throw new Error(setup.error);
        setAgentEnabled(true);
        setAgentPausedUntil(0);
        setAgentStatus(`✅ AI Agent aktif. Webhook Fonnte dipasang otomatis${setup?.device ? ` pada ${setup.device}` : ''}.`);
      } else {
        await saveAgentSettings({ ai_agent_enabled: false });
        setAgentEnabled(false);
        setAgentStatus('AI Agent OFF — chat pelanggan tidak dibalas otomatis.');
      }
    } catch (error) {
      if (nextEnabled) {
        try { await saveAgentSettings({ ai_agent_enabled: false }); } catch { /* best effort rollback */ }
        setAgentEnabled(false);
      }
      setAgentStatus(`❌ ${error?.message || 'Gagal mengatur AI Agent.'}`);
    } finally {
      setAgentBusy(false);
    }
  };

  const handlePauseAgent = async () => {
    const pausedUntil = Date.now() + (60 * 60 * 1000);
    setAgentBusy(true);
    try {
      await saveAgentSettings({ ai_agent_paused_until: pausedUntil });
      setAgentPausedUntil(pausedUntil);
      setAgentStatus('⏸️ AI Agent dipause 1 jam.');
    } catch (error) {
      setAgentStatus(`❌ ${error.message}`);
    } finally {
      setAgentBusy(false);
    }
  };

  const handleResumeAgent = async () => {
    setAgentBusy(true);
    try {
      await saveAgentSettings({ ai_agent_paused_until: 0 });
      setAgentPausedUntil(0);
      setAgentStatus('✅ AI Agent aktif kembali.');
    } catch (error) {
      setAgentStatus(`❌ ${error.message}`);
    } finally {
      setAgentBusy(false);
    }
  };

  const loadAgentConversations = async () => {
    if (!tenant?.code) return;
    setLoadingAgentChats(true);
    try {
      const result = await apiService.get(`/ai-agent/conversations/${tenant.code}`);
      setAgentConversations(Array.isArray(result) ? result : (result?.conversations || []));
    } catch (error) {
      setAgentStatus(`❌ Gagal memuat percakapan: ${error?.message || 'unknown error'}`);
    } finally {
      setLoadingAgentChats(false);
    }
  };

  const handleToggleAgentChats = async () => {
    const next = !showAgentChats;
    setShowAgentChats(next);
    if (next) await loadAgentConversations();
  };

  const handleConversationTakeover = async (conversation, takeover) => {
    try {
      const result = await apiService.post('/ai-agent/conversations/takeover', {
        tenant_code: tenant.code,
        phone: conversation.phone,
        takeover,
      });
      if (result?.error) throw new Error(result.error);
      setAgentStatus(takeover
        ? `👤 Chat ${conversation.name || conversation.phone} sekarang ditangani manusia.`
        : `🤖 Chat ${conversation.name || conversation.phone} dikembalikan ke AI Agent.`);
      await loadAgentConversations();
    } catch (error) {
      setAgentStatus(`❌ Gagal mengubah kontrol chat: ${error?.message || 'unknown error'}`);
    }
  };

  const copySegmentPhones = async () => {
    const phones = selectedCustomers.map((c) => c.phone).filter(Boolean).join(', ');
    if (!phones) return alert('Belum ada nomor WA di segment ini.');
    await navigator.clipboard.writeText(phones);
    alert(`Nomor segment berhasil disalin (${selectedCustomers.filter((c) => c.phone).length} pelanggan).`);
  };

  const sendOneCustomer = async () => {
    const first = selectedCustomers.find((c) => c.phone);
    if (!first) return alert('Belum ada pelanggan dengan nomor WA di segment ini.');
    if (!campaignMessage.trim()) return alert('Tulis atau buat pesan campaign terlebih dahulu.');
    if (unknownVariables.length > 0) return alert(`Perbaiki variabel yang tidak dikenal: ${unknownVariables.join(', ')}`);

    const result = await sendWhatsAppNotification({
      tenant,
      target: first.phone,
      message: renderCampaignTemplate(campaignMessage, buildRenderData(first)),
      openManual: true,
    });
    if (result.status === 'sent') alert(`Pesan berhasil dikirim ke ${first.name} melalui gateway.`);
    if (result.status === 'failed') alert(`Gateway gagal: ${result.error?.message || 'periksa token dan koneksi gateway.'}`);
  };

  const handleTestGateway = async () => {
    const target = settings.store_wa || tenant?.phone || '';
    if (!target) return alert('Isi nomor WhatsApp toko di Pengaturan > Kontak & Rekening terlebih dahulu.');
    setGatewayTestStatus('testing');
    const result = await sendWhatsAppNotification({
      tenant,
      target,
      message: `Tes koneksi WhatsApp Gateway UnitPro untuk ${storeName}. Jika pesan ini diterima, gateway sudah aktif.`,
      openManual: false,
    });
    if (result.status === 'sent') {
      setGatewayTestStatus('success');
      alert('Gateway aktif. Pesan tes berhasil dikirim ke nomor WhatsApp toko.');
    } else {
      setGatewayTestStatus('failed');
      alert(`Gateway belum berhasil: ${result.error?.message || 'periksa mode, token, dan koneksi provider.'}`);
    }
  };

  const handleStartBroadcast = async () => {
    const validTargets = selectedCustomers.filter((c) => c.phone);
    if (!campaignMessage.trim()) return alert('Tulis atau buat pesan campaign terlebih dahulu.');
    if (unknownVariables.length > 0) return alert(`Perbaiki variabel yang tidak dikenal: ${unknownVariables.join(', ')}`);
    if (validTargets.length === 0) return alert('Tidak ada pelanggan dengan nomor WhatsApp valid di segment ini.');
    if (senderConfig.mode === 'CUSTOM' && !senderConfig.token) {
      return alert('Mode CUSTOM aktif tetapi token WhatsApp Gateway belum diisi. Buka Pengaturan > WhatsApp Gateway dan simpan token terlebih dahulu.');
    }

    const batchTargets = validTargets.slice(0, broadcastBatchSize);
    if (!window.confirm(`Kirim broadcast ke ${batchTargets.length} pelanggan melalui WhatsApp Gateway?\n\nJeda antar pesan: ${broadcastDelaySec} detik.`)) return;

    setIsBroadcasting(true);
    setBroadcastProgress(0);
    setBroadcastLogs([]);

    for (let i = 0; i < batchTargets.length; i += 1) {
      const customer = batchTargets[i];
      const message = renderCampaignTemplate(campaignMessage, buildRenderData(customer));
      const logId = `LOG_${Date.now()}_${i}`;
      setBroadcastLogs((prev) => [{
        id: logId,
        customerName: customer.name,
        phone: customer.phone,
        status: 'PENDING',
        time: new Date().toLocaleTimeString('id-ID'),
      }, ...prev]);

      if (i > 0) await new Promise((resolve) => setTimeout(resolve, broadcastDelaySec * 1000));

      try {
        const result = await sendWhatsAppNotification({
          tenant,
          target: customer.phone,
          message,
          openManual: false,
        });
        if (result.status !== 'sent') throw result.error || new Error('Gateway tidak mengonfirmasi pengiriman.');
        setBroadcastLogs((prev) => prev.map((log) => (log.id === logId ? { ...log, status: 'SUCCESS' } : log)));
      } catch (error) {
        setBroadcastLogs((prev) => prev.map((log) => (log.id === logId ? { ...log, status: 'FAILED', error: error?.message || 'Gagal' } : log)));
      }
      setBroadcastProgress(Math.round(((i + 1) / batchTargets.length) * 100));
    }

    setIsBroadcasting(false);
  };

  return (
    <div className="customer-crm-insights">
      <div className="customer-crm-hero">
        <div>
          <p>CRM PELANGGAN & WHATSAPP MARKETING</p>
          <h3>AI Agent + Campaign yang memahami data toko</h3>
          <span>Balas WhatsApp otomatis, buat promo barang/jasa, follow-up CRM, dan personalisasi pesan cukup dengan bahasa sehari-hari.</span>
        </div>
        <div className="customer-crm-pro-badge"><Crown size={15} /> WhatsApp Marketing Pro</div>
      </div>

      <div className="customer-crm-metrics">
        <div><span>Total Pelanggan</span><strong>{crm.total}</strong><small>Servis + POS</small></div>
        <div><span>Nomor WA</span><strong>{crm.withPhone}</strong><small>Siap dihubungi</small></div>
        <div><span>Repeat</span><strong>{crm.repeat}</strong><small>Lebih dari 1 aktivitas</small></div>
        <div><span>Perlu Follow-up</span><strong>{crm.readyPickup + crm.dormant60}</strong><small>Siap diambil / lama tidak datang</small></div>
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: gatewayTestStatus === 'success' ? '#16a34a' : senderConfig.mode === 'CUSTOM' && !senderConfig.token ? '#f59e0b' : '#0284c7' }} />
          <strong style={{ fontSize: '0.86rem', color: '#334155' }}>{gatewayLabel}</strong>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost" onClick={() => setShowGuide((value) => !value)} style={{ fontWeight: '800' }}>
            ❓ Tutorial 1 Menit
          </button>
          <button type="button" className="btn btn-ghost" disabled={gatewayTestStatus === 'testing'} onClick={handleTestGateway} style={{ fontWeight: '800' }}>
            <RefreshCw size={15} /> {gatewayTestStatus === 'testing' ? 'Menguji...' : 'Tes Gateway'}
          </button>
        </div>
      </div>

      {showGuide && (
        <div style={{ marginTop: '10px', padding: '14px', borderRadius: '14px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a' }}>
          <strong style={{ display: 'block', marginBottom: '8px' }}>Tutorial UnitPro AI + WhatsApp</strong>
          <div style={{ display: 'grid', gap: '6px', fontSize: '0.84rem', lineHeight: 1.5 }}>
            <span><b>1.</b> Pengaturan → WhatsApp Gateway → CUSTOM → isi Token Fonnte → Simpan → Tes Gateway.</span>
            <span><b>2.</b> Aktifkan <b>AI Agent</b>. UnitPro otomatis memasang webhook Fonnte dan auto-read chat personal.</span>
            <span><b>3.</b> AI menjawab status servis, tracking, informasi toko, serta barang/jasa dari data UnitPro. Jika tidak yakin atau ada komplain serius, AI melakukan human handoff.</span>
            <span><b>4.</b> Untuk campaign, pilih target lalu ketik seperti chat: <i>“Buat promo cleaning laptop untuk pelanggan lama.”</i></span>
            <span><b>5.</b> Gemini otomatis menulis copywriting dan memilih variabel personalisasi. Cek preview, edit bila perlu, kirim 1 tes, lalu broadcast.</span>
            <span><b>6.</b> Owner dapat mematikan atau pause AI Agent kapan saja.</span>
          </div>
        </div>
      )}

      <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '18px', background: agentEnabled ? 'linear-gradient(135deg,#ecfdf5,#eff6ff)' : '#f8fafc', border: `1px solid ${agentEnabled ? '#86efac' : '#cbd5e1'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, display: 'grid', placeItems: 'center', background: agentEnabled ? '#16a34a' : '#64748b', color: '#fff' }}><Bot size={22} /></div>
            <div>
              <strong style={{ display: 'block', color: '#0f172a' }}>UnitPro AI Agent</strong>
              <small style={{ color: '#64748b' }}>{agentEnabled ? (agentPausedUntil > Date.now() ? 'Dipause sementara' : 'Membalas WhatsApp otomatis dengan konteks servis & CRM') : 'OFF — pelanggan ditangani manual'}</small>
            </div>
          </div>
          <button type="button" disabled={agentBusy} onClick={handleToggleAgent} style={{ minWidth: 115, border: 'none', borderRadius: 999, padding: '9px 14px', cursor: agentBusy ? 'wait' : 'pointer', background: agentEnabled ? '#16a34a' : '#334155', color: '#fff', fontWeight: 900 }}>
            {agentBusy ? 'Memproses...' : agentEnabled ? '🟢 AI ON' : '⚫ AI OFF'}
          </button>
        </div>
        {agentEnabled && <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 9 }}>
          {agentPausedUntil > Date.now()
            ? <button type="button" className="btn btn-ghost" onClick={handleResumeAgent}><Play size={14} /> Aktifkan Sekarang</button>
            : <button type="button" className="btn btn-ghost" onClick={handlePauseAgent}><Pause size={14} /> Pause 1 Jam</button>}
          <button type="button" className="btn btn-ghost" onClick={handleToggleAgentChats}>👤 {showAgentChats ? 'Tutup Percakapan' : 'Ambil Alih Chat'}</button>
        </div>}
        {agentStatus && <div style={{ marginTop: 8, fontSize: '0.8rem', fontWeight: 700, color: agentStatus.startsWith('❌') ? '#b91c1c' : '#166534' }}>{agentStatus}</div>}
      </div>

      {showAgentChats && (
        <div style={{ marginTop: '10px', padding: '12px', borderRadius: '14px', background: '#fff', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div>
              <strong style={{ display: 'block', color: '#0f172a' }}>Percakapan AI Agent</strong>
              <small style={{ color: '#64748b' }}>Ambil alih chat kapan saja. AI berhenti membalas chat yang berstatus ditangani manusia.</small>
            </div>
            <button type="button" className="btn btn-ghost" onClick={loadAgentConversations} disabled={loadingAgentChats}><RefreshCw size={13} /> Refresh</button>
          </div>
          {loadingAgentChats ? <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Memuat percakapan...</div> : (
            <div style={{ display: 'grid', gap: '7px' }}>
              {agentConversations.slice(0, 15).map((conversation) => (
                <div key={conversation.phone} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '11px', background: conversation.human_takeover ? '#fff7ed' : '#f8fafc', border: `1px solid ${conversation.human_takeover ? '#fed7aa' : '#e2e8f0'}` }}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: '0.83rem', color: '#0f172a' }}>{conversation.name || conversation.phone}</strong>
                    <small style={{ color: '#64748b', display: 'block', maxWidth: '520px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conversation.last_message || 'Belum ada preview pesan'}</small>
                    <small style={{ color: conversation.human_takeover ? '#c2410c' : '#16a34a', fontWeight: 800 }}>{conversation.human_takeover ? '👤 Butuh/Admin Handling' : '🤖 AI Handling'}</small>
                  </div>
                  <button type="button" className="btn btn-ghost" onClick={() => handleConversationTakeover(conversation, !conversation.human_takeover)} style={{ whiteSpace: 'nowrap', fontSize: '0.74rem' }}>
                    {conversation.human_takeover ? '🤖 Kembalikan ke AI' : '👤 Ambil Alih'}
                  </button>
                </div>
              ))}
              {agentConversations.length === 0 && <div style={{ color: '#64748b', fontSize: '0.8rem', padding: '8px' }}>Belum ada percakapan AI Agent yang tersimpan.</div>}
            </div>
          )}
        </div>
      )}

      <div className="customer-segment-grid" style={{ marginTop: '1rem' }}>
        {segments.map((segment) => {
          const Icon = segment.icon;
          const active = selectedSegment === segment.key;
          return (
            <button key={segment.key} type="button" className={`customer-segment-card ${active ? 'active' : ''}`} onClick={() => selectSegment(segment.key)}>
              <span><Icon size={18} /></span>
              <strong>{segment.label}</strong>
              <b>{segment.count} pelanggan</b>
              <small>{segment.hint}</small>
            </button>
          );
        })}
      </div>

      <div className="customer-wa-pro-panel" style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'minmax(260px, 0.8fr) minmax(360px, 1.2fr)', gap: '14px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #dbeafe', borderRadius: '18px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#075985', fontWeight: '900' }}>
            <Zap size={17} /> Target Pelanggan ({selectedCustomers.length})
          </div>
          <p style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: '0.84rem', lineHeight: 1.5 }}>
            Segment aktif: <strong>{activeSegment.label}</strong>. Target dipilih otomatis dari riwayat servis, POS, tanggal terakhir, dan jenis perangkat.
          </p>
          <div style={{ display: 'grid', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
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

        <div style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #eff6ff 100%)', border: '1px solid #bbf7d0', borderRadius: '18px', padding: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: '#5b21b6', fontWeight: '900', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Sparkles size={17} /> AI WhatsApp Copywriter</div>
              <small style={{ color: '#64748b' }}>Ketik seperti ngobrol dengan AI. Gemini mengurus gaya, CTA, dan variabel UnitPro.</small>
            </div>
            <span style={{ fontSize: '0.76rem', fontWeight: '800', color: '#0f766e', background: '#ccfbf1', padding: '5px 10px', borderRadius: '999px' }}>
              {selectedCustomers.filter((c) => c.phone).length} WA Target
            </span>
          </div>

          <div style={{ marginTop: '12px', background: '#fff', border: '1px solid #ddd6fe', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px', background: '#faf5ff', borderBottom: '1px solid #ede9fe', fontSize: '0.8rem', color: '#5b21b6', lineHeight: 1.45 }}>
              <b>🤖 UnitPro AI:</b> Ceritakan apa yang ingin disampaikan. Saya akan membuat pesan WhatsApp dan memilih personalisasi yang tepat otomatis.
            </div>
            <div style={{ padding: '10px' }}>
              <textarea className="input-field" value={campaignGoal} onChange={(e) => setCampaignGoal(e.target.value)} rows={4} placeholder="Contoh: Buat promo SSD 512GB untuk pelanggan laptop, ramah dan singkat..." style={{ resize: 'vertical', lineHeight: 1.45 }} />
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '7px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setCampaignGoal('Buat campaign promo barang yang stoknya tersedia dan relevan untuk target ini. Gunakan harga dan stok dari data UnitPro, jangan mengarang diskon.')} style={{ fontSize: '0.72rem' }}>📦 Promo Barang</button>
                <button type="button" className="btn btn-ghost" onClick={() => setCampaignGoal('Buat campaign jasa servis atau maintenance yang paling relevan untuk target ini berdasarkan data UnitPro.')} style={{ fontSize: '0.72rem' }}>🛠️ Promo Jasa</button>
                <button type="button" className="btn btn-ghost" onClick={() => setCampaignGoal(DEFAULT_GOALS.ready)} style={{ fontSize: '0.72rem' }}>✅ Servis Selesai</button>
                <button type="button" className="btn btn-ghost" onClick={() => setCampaignGoal(DEFAULT_GOALS.dormant)} style={{ fontSize: '0.72rem' }}>💤 Pelanggan Lama</button>
              </div>
              <button type="button" className="btn" onClick={() => handleGenerateCopy('')} disabled={isGeneratingCopy} style={{ marginTop: '9px', width: '100%', background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)', color: '#fff', fontWeight: '900' }}>
                <Sparkles size={16} /> {isGeneratingCopy ? 'AI sedang menulis...' : 'Buat Pesan ✨'}
              </button>
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '900', color: '#166534', marginBottom: '5px' }}>Pesan WhatsApp — bebas diedit</label>
            <textarea ref={messageRef} className="input-field" value={campaignMessage} onChange={(e) => setCampaignMessage(e.target.value)} rows={9} placeholder={'Contoh: Halo Kak {nama_pelanggan}, ...'} style={{ resize: 'vertical', lineHeight: 1.5, background: '#fff' }} />
            {campaignMessage && <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '7px' }}>
              <button type="button" className="btn btn-ghost" onClick={() => handleGenerateCopy('Buat lebih singkat dan langsung ke inti')} disabled={isGeneratingCopy}>Lebih Singkat</button>
              <button type="button" className="btn btn-ghost" onClick={() => handleGenerateCopy('Buat lebih ramah dan natural seperti CS toko Indonesia')} disabled={isGeneratingCopy}>Lebih Ramah</button>
              <button type="button" className="btn btn-ghost" onClick={() => handleGenerateCopy('Perbaiki copywriting tanpa mengubah fakta atau mengarang klaim baru')} disabled={isGeneratingCopy}>Perbaiki dengan AI</button>
            </div>}
            <small style={{ display: 'block', marginTop: '7px', color: '#64748b' }}>Variabel di bawah hanya untuk edit manual lanjutan. Gemini sudah memilih variabel otomatis.</small>
            <div style={{ marginTop: '7px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {CAMPAIGN_VARIABLES.map((variable) => (
                <button key={variable.token} type="button" className="btn btn-ghost" onClick={() => insertVariable(variable.token)} style={{ padding: '5px 8px', fontSize: '0.72rem', background: '#fff', border: '1px solid #cbd5e1' }} title={`${variable.label} → ${variable.example}`}>
                  {variable.token}
                </button>
              ))}
            </div>
            {unknownVariables.length > 0 && (
              <div style={{ marginTop: '7px', padding: '8px 10px', borderRadius: '10px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', fontSize: '0.78rem' }}>
                <AlertCircle size={14} style={{ display: 'inline', marginRight: 5 }} /> Variabel tidak dikenal: {unknownVariables.join(', ')}
              </div>
            )}
          </div>

          <div style={{ marginTop: '12px', background: '#ffffff', border: '1px solid #dcfce7', borderRadius: '14px', padding: '12px' }}>
            <small style={{ color: '#16a34a', fontWeight: '900', display: 'block', marginBottom: '5px' }}>Pratinjau — variabel terisi otomatis untuk pelanggan pertama</small>
            <p style={{ margin: 0, color: '#0f172a', fontSize: '0.88rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{activePreview}</p>
          </div>

          <div style={{ marginTop: '12px', background: '#ffffff', borderRadius: '14px', padding: '12px', border: '1px solid #cbd5e1' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>⚡ Kontrol Pengiriman Bertahap</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>Maks Kontak per Batch</label>
                <select className="input-field" value={broadcastBatchSize} onChange={(e) => setBroadcastBatchSize(Number(e.target.value))}>
                  <option value={10}>10 kontak</option>
                  <option value={20}>20 kontak</option>
                  <option value={50}>50 kontak</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>Jeda antar Pesan</label>
                <select className="input-field" value={broadcastDelaySec} onChange={(e) => setBroadcastDelaySec(Number(e.target.value))}>
                  <option value={3}>3 detik</option>
                  <option value={5}>5 detik</option>
                  <option value={10}>10 detik</option>
                </select>
              </div>
            </div>
            <small style={{ display: 'block', marginTop: '7px', color: '#64748b', lineHeight: 1.4 }}>Gunakan sesuai limit provider dan kebijakan WhatsApp. UnitPro tidak menjanjikan akun bebas pembatasan.</small>
          </div>

          {isBroadcasting && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '10px', marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '800', color: '#166534', marginBottom: '4px' }}>
                <span>🚀 Mengirim melalui gateway...</span><span>{broadcastProgress}%</span>
              </div>
              <div style={{ height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}><div style={{ width: `${broadcastProgress}%`, height: '100%', background: '#22c55e', transition: 'width 0.3s' }} /></div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
            <button type="button" className="btn" style={{ background: '#e2e8f0', color: '#334155', fontWeight: '800', fontSize: '0.82rem' }} onClick={copySegmentPhones}>
              <Copy size={15} /> Salin Nomor ({selectedCustomers.filter((c) => c.phone).length})
            </button>
            <button type="button" className="btn" style={{ background: '#22c55e', color: '#fff', fontWeight: '900', fontSize: '0.82rem' }} onClick={sendOneCustomer}>
              <Send size={15} /> Kirim ke 1 Pelanggan
            </button>
            <button type="button" className="btn" disabled={isBroadcasting} style={{ background: isBroadcasting ? '#cbd5e1' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', fontWeight: '900', fontSize: '0.82rem' }} onClick={handleStartBroadcast}>
              <Play size={15} /> {isBroadcasting ? 'Pengiriman Berjalan...' : 'Mulai Broadcast Gateway 🚀'}
            </button>
          </div>

          {broadcastLogs.length > 0 && (
            <div style={{ marginTop: '12px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '10px' }}>
              <strong style={{ fontSize: '0.78rem', color: '#334155', display: 'block', marginBottom: '6px' }}>📋 Log Pengiriman</strong>
              <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.78rem' }}>
                {broadcastLogs.map((log) => (
                  <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
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

      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '7px', color: '#64748b', fontSize: '0.78rem' }}>
        <Users size={14} /> Data target berasal dari data toko sendiri. Hindari mengirim pesan ke pelanggan yang tidak relevan atau tidak menginginkan promosi.
      </div>
    </div>
  );
}
