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

  const [campaignImageUrl, setCampaignImageUrl] = useState('');
  const [disabledPhones, setDisabledPhones] = useState(new Set());
  const [broadcastBatchSize, setBroadcastBatchSize] = useState(10);
  const [broadcastDelaySec, setBroadcastDelaySec] = useState(5);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState(0);
  const [broadcastLogs, setBroadcastLogs] = useState([]);
  const [savedTemplates, setSavedTemplates] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('UNITPRO_WA_SAVED_TEMPLATES') || '[]');
    } catch {
      return [];
    }
  });

  const handleSaveCurrentTemplate = () => {
    if (!campaignMessage.trim()) return alert('Tulis pesan draf terlebih dahulu sebelum menyimpan.');
    const title = window.prompt('Masukkan Nama/Judul Template Toko Anda:', `Template Promo ${new Date().toLocaleDateString('id-ID')}`);
    if (!title) return;
    const newTpl = { id: Date.now(), title, message: campaignMessage, imageUrl: campaignImageUrl };
    const updated = [newTpl, ...savedTemplates];
    setSavedTemplates(updated);
    localStorage.setItem('UNITPRO_WA_SAVED_TEMPLATES', JSON.stringify(updated));
    alert('✅ Template promo toko berhasil disimpan!');
  };

  const handleDeleteSavedTemplate = (id) => {
    if (!window.confirm('Hapus template tersimpan ini?')) return;
    const updated = savedTemplates.filter((t) => t.id !== id);
    setSavedTemplates(updated);
    localStorage.setItem('UNITPRO_WA_SAVED_TEMPLATES', JSON.stringify(updated));
  };

  const togglePhoneTarget = (phone) => {
    if (!phone) return;
    setDisabledPhones((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  };

  const toggleAllTargets = () => {
    const allValid = (crm.bySegment[selectedSegment] || []).map((c) => c.phone).filter(Boolean);
    if (disabledPhones.size === allValid.length) {
      setDisabledPhones(new Set());
    } else {
      setDisabledPhones(new Set(allValid));
    }
  };

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
    const confirmed = await (window.UnitProConfirm
      ? window.UnitProConfirm({
          title: 'Kirim Broadcast WhatsApp?',
          message: `Kirim pesan ke ${batchTargets.length} pelanggan di segmen "${activeSegment.label}" melalui WhatsApp Gateway.\n\nJeda antar pesan: ${broadcastDelaySec} detik.`,
          confirmText: 'Mulai Broadcast',
          tone: 'info',
        })
      : Promise.resolve(window.confirm(`Kirim broadcast ke ${batchTargets.length} pelanggan melalui WhatsApp Gateway?\n\nJeda antar pesan: ${broadcastDelaySec} detik.`)));
    if (!confirmed) return;

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
      <div className="customer-crm-hero" style={{ position: 'relative', overflow: 'hidden' }}>
        <div>
          <p style={{ letterSpacing: '0.08em', fontWeight: '900' }}>CRM PELANGGAN & WHATSAPP MARKETING PRO</p>
          <h3 style={{ fontSize: '1.5rem', margin: '4px 0 8px 0' }}>AI Agent + Campaign Cerdas Toko Anda</h3>
          <span style={{ fontSize: '0.88rem', opacity: 0.9 }}>Balas WhatsApp otomatis, buat promo barang/jasa, follow-up CRM, dan personalisasi pesan cukup dengan bahasa sehari-hari.</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <div className="customer-crm-pro-badge"><Crown size={15} /> WhatsApp Marketing Pro</div>
          {/* GATEWAY STATUS BADGE */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '999px',
            fontSize: '0.78rem',
            fontWeight: '800',
            background: senderConfig.mode === 'CUSTOM' ? (senderConfig.token ? 'rgba(22, 163, 74, 0.2)' : 'rgba(245, 158, 11, 0.2)') : 'rgba(2, 132, 199, 0.2)',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.3)',
            backdropFilter: 'blur(4px)'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: gatewayTestStatus === 'success' ? '#4ade80' : senderConfig.mode === 'CUSTOM' && !senderConfig.token ? '#fde047' : '#38bdf8',
              boxShadow: '0 0 8px currentColor'
            }} />
            {gatewayLabel}
          </div>
        </div>
      </div>

      <div className="customer-crm-metrics">
        <div><span>Total Pelanggan</span><strong>{crm.total}</strong><small>Servis + POS</small></div>
        <div><span>Nomor WA Valid</span><strong>{crm.withPhone}</strong><small>Siap dihubungi</small></div>
        <div><span>Repeat Order</span><strong>{crm.repeat}</strong><small>Lebih dari 1 transaksi</small></div>
        <div><span>Perlu Follow-up</span><strong>{crm.readyPickup + crm.dormant60}</strong><small>Siap diambil / pasif &gt; 60 hari</small></div>
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap', background: '#f8fafc', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: gatewayTestStatus === 'success' ? '#16a34a' : senderConfig.mode === 'CUSTOM' && !senderConfig.token ? '#f59e0b' : '#0284c7' }} />
          <strong style={{ fontSize: '0.86rem', color: '#334155' }}>Mode WA: {gatewayLabel}</strong>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost" onClick={() => setShowGuide((value) => !value)} style={{ fontWeight: '800', fontSize: '0.8rem' }}>
            ❓ Panduan 1 Menit
          </button>
          <button type="button" className="btn btn-ghost" disabled={gatewayTestStatus === 'testing'} onClick={handleTestGateway} style={{ fontWeight: '800', fontSize: '0.8rem', background: '#ffffff', border: '1px solid #cbd5e1' }}>
            <RefreshCw size={14} className={gatewayTestStatus === 'testing' ? 'animate-spin' : ''} /> {gatewayTestStatus === 'testing' ? 'Menguji...' : 'Tes Koneksi Gateway'}
          </button>
        </div>
      </div>

      {showGuide && (
        <div style={{ marginTop: '10px', padding: '16px', borderRadius: '14px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', animation: 'fadeIn 0.3s ease-out' }}>
          <strong style={{ display: 'block', marginBottom: '8px', fontSize: '0.95rem' }}>📖 Panduan Lengkap UnitPro AI + WhatsApp Marketing</strong>
          <div style={{ display: 'grid', gap: '6px', fontSize: '0.84rem', lineHeight: 1.5 }}>
            <span><b>1.</b> Buka <b>Pengaturan → WhatsApp Gateway</b> untuk memasukkan Token Fonnte/Custom Anda jika menggunakan server pribadi.</span>
            <span><b>2.</b> Aktifkan <b>AI Agent</b> di bawah. AI otomatis menjawab status servis, invoice, harga barang/jasa, dan lokasi toko 24/7.</span>
            <span><b>3.</b> Pilih salah satu <b>Segmen Pelanggan</b> di bawah. UnitPro memilah pelanggan secara otomatis.</span>
            <span><b>4.</b> Klik <b>Tombol Preset Cepat</b> atau tulis perintah ke AI Copywriter Gemini untuk memuat draf promosi.</span>
            <span><b>5.</b> Cek simulasi tampilan gelembung chat WhatsApp di sebelah kanan, lalu jalankan <b>Broadcast Gateway</b> secara aman.</span>
          </div>
        </div>
      )}

      {/* AI AGENT CONTROL PANEL */}
      <div style={{ marginTop: '1rem', padding: '1.2rem', borderRadius: '18px', background: agentEnabled ? 'linear-gradient(135deg,#ecfdf5 0%,#eff6ff 100%)' : '#f8fafc', border: `1px solid ${agentEnabled ? '#86efac' : '#cbd5e1'}`, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, display: 'grid', placeItems: 'center', background: agentEnabled ? '#16a34a' : '#64748b', color: '#fff', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)' }}><Bot size={24} /></div>
            <div>
              <strong style={{ display: 'block', color: '#0f172a', fontSize: '1rem' }}>UnitPro AI Auto-Reply Agent</strong>
              <small style={{ color: '#64748b', fontSize: '0.82rem' }}>{agentEnabled ? (agentPausedUntil > Date.now() ? '⏸️ Dipause sementara' : '🟢 Membalas WhatsApp otomatis 24/7 dengan data servis & stok toko') : '⚫ OFF — Pelanggan ditangani manual'}</small>
            </div>
          </div>
          <button type="button" disabled={agentBusy} onClick={handleToggleAgent} style={{ minWidth: 120, border: 'none', borderRadius: 999, padding: '10px 18px', cursor: agentBusy ? 'wait' : 'pointer', background: agentEnabled ? '#16a34a' : '#334155', color: '#fff', fontWeight: 900, boxShadow: agentEnabled ? '0 4px 12px rgba(22, 163, 74, 0.3)' : 'none' }}>
            {agentBusy ? 'Memproses...' : agentEnabled ? '🟢 AI ON' : '⚫ AI OFF'}
          </button>
        </div>
        {agentEnabled && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {agentPausedUntil > Date.now()
            ? <button type="button" className="btn btn-ghost" onClick={handleResumeAgent} style={{ background: '#fff', border: '1px solid #bbf7d0', fontSize: '0.78rem' }}><Play size={14} /> Aktifkan Sekarang</button>
            : <button type="button" className="btn btn-ghost" onClick={handlePauseAgent} style={{ background: '#fff', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}><Pause size={14} /> Pause 1 Jam</button>}
          <button type="button" className="btn btn-ghost" onClick={handleToggleAgentChats} style={{ background: '#fff', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}>👤 {showAgentChats ? 'Tutup Percakapan' : 'Ambil Alih Chat Human'}</button>
        </div>}
        {agentStatus && <div style={{ marginTop: 10, fontSize: '0.82rem', fontWeight: 700, color: agentStatus.startsWith('❌') ? '#b91c1c' : '#166534' }}>{agentStatus}</div>}
      </div>

      {showAgentChats && (
        <div style={{ marginTop: '10px', padding: '14px', borderRadius: '16px', background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div>
              <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.95rem' }}>Percakapan AI Agent & Human Handoff</strong>
              <small style={{ color: '#64748b' }}>Ambil alih chat kapan saja. AI berhenti membalas nomor yang ditangani staf manusia.</small>
            </div>
            <button type="button" className="btn btn-ghost" onClick={loadAgentConversations} disabled={loadingAgentChats} style={{ fontSize: '0.78rem' }}><RefreshCw size={13} /> Refresh</button>
          </div>
          {loadingAgentChats ? <div style={{ color: '#64748b', fontSize: '0.82rem', padding: '10px' }}>Memuat percakapan...</div> : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {agentConversations.slice(0, 15).map((conversation) => (
                <div key={conversation.phone} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '12px', background: conversation.human_takeover ? '#fff7ed' : '#f8fafc', border: `1px solid ${conversation.human_takeover ? '#fed7aa' : '#e2e8f0'}` }}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: '#0f172a' }}>{conversation.name || conversation.phone}</strong>
                    <small style={{ color: '#64748b', display: 'block', maxWidth: '520px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conversation.last_message || 'Belum ada preview pesan'}</small>
                    <small style={{ color: conversation.human_takeover ? '#c2410c' : '#16a34a', fontWeight: 800 }}>{conversation.human_takeover ? '👤 Handling Staf Manusia' : '🤖 AI Agent Handling'}</small>
                  </div>
                  <button type="button" className="btn btn-ghost" onClick={() => handleConversationTakeover(conversation, !conversation.human_takeover)} style={{ whiteSpace: 'nowrap', fontSize: '0.74rem', background: '#fff', border: '1px solid #cbd5e1' }}>
                    {conversation.human_takeover ? '🤖 Kembalikan ke AI' : '👤 Ambil Alih'}
                  </button>
                </div>
              ))}
              {agentConversations.length === 0 && <div style={{ color: '#64748b', fontSize: '0.82rem', padding: '10px' }}>Belum ada percakapan AI Agent yang tersimpan.</div>}
            </div>
          )}
        </div>
      )}

      {/* SEGMENT SELECTOR CARDS WITH LIVE BADGES */}
      <div className="customer-segment-grid" style={{ marginTop: '1.2rem' }}>
        {segments.map((segment) => {
          const Icon = segment.icon;
          const active = selectedSegment === segment.key;
          return (
            <button key={segment.key} type="button" className={`customer-segment-card ${active ? 'active' : ''}`} onClick={() => selectSegment(segment.key)} style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '6px' }}>
                <span><Icon size={18} /></span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: '900',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: active ? '#ffffff' : (segment.count > 0 ? (segment.key === 'ready' ? '#fef2f2' : '#f0fdf4') : '#f1f5f9'),
                  color: active ? 'var(--primary)' : (segment.count > 0 ? (segment.key === 'ready' ? '#ef4444' : '#16a34a') : '#94a3b8'),
                  border: active ? 'none' : '1px solid rgba(0,0,0,0.06)'
                }}>
                  {segment.count}
                </span>
              </div>
              <strong style={{ fontSize: '0.9rem', marginBottom: '2px' }}>{segment.label}</strong>
              <small style={{ fontSize: '0.75rem', opacity: 0.85 }}>{segment.hint}</small>
            </button>
          );
        })}
      </div>

      <div className="customer-wa-pro-panel" style={{ marginTop: '1.2rem', display: 'grid', gridTemplateColumns: 'minmax(250px, 0.85fr) minmax(360px, 1.15fr)', gap: '16px' }}>
        {/* TARGET CUSTOMER LIST WITH CHECKBOX SELECTOR */}
        <div style={{ background: '#ffffff', border: '1px solid #dbeafe', borderRadius: '18px', padding: '1.2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', color: '#075985', fontWeight: '900', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={17} /> Target Pelanggan</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button type="button" className="btn btn-ghost" onClick={toggleAllTargets} style={{ fontSize: '0.7rem', padding: '2px 8px', background: '#f1f5f9', border: '1px solid #cbd5e1' }}>
                {disabledPhones.size > 0 ? '☑️ Pilih Semua' : '☐ Batal Semua'}
              </button>
              <span style={{ fontSize: '0.75rem', background: '#e0f2fe', padding: '3px 10px', borderRadius: '999px', color: '#0369a1', fontWeight: '800' }}>
                {selectedCustomers.filter(c => c.phone && !disabledPhones.has(c.phone)).length} / {selectedCustomers.length} Orang
              </span>
            </div>
          </div>
          <p style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: '0.82rem', lineHeight: 1.5 }}>
            Segmen: <strong>{activeSegment.label}</strong>. Centang/hapus centang kontak sesuai kebutuhan promo toko Anda.
          </p>
          <div style={{ display: 'grid', gap: '8px', maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
            {selectedCustomers.map((customer) => {
              const isDisabled = Boolean(customer.phone && disabledPhones.has(customer.phone));
              return (
                <div key={`${customer.phone}-${customer.name}`} onClick={() => customer.phone && togglePhoneTarget(customer.phone)} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: isDisabled ? '#f1f5f9' : '#f8fafc',
                  border: `1px solid ${isDisabled ? '#cbd5e1' : '#e2e8f0'}`,
                  opacity: isDisabled ? 0.6 : 1,
                  cursor: customer.phone ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={!isDisabled && Boolean(customer.phone)}
                    disabled={!customer.phone}
                    onChange={() => togglePhoneTarget(customer.phone)}
                    style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: 'block', color: isDisabled ? '#64748b' : '#0f172a', fontSize: '0.86rem', textDecoration: isDisabled ? 'line-through' : 'none' }}>{customer.name}</strong>
                    <small style={{ color: '#64748b', fontSize: '0.75rem' }}>{customer.phone || 'Tanpa WA'} • {customer.daysFromLast} hari lalu</small>
                  </div>
                  <small style={{ color: '#0f766e', fontWeight: '800', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>Rp {money(customer.totalSpent)}</small>
                </div>
              );
            })}
            {selectedCustomers.length === 0 && <div style={{ padding: '16px', textAlign: 'center', borderRadius: '12px', background: '#f8fafc', color: '#64748b', fontSize: '0.84rem' }}>Belum ada pelanggan di segment ini.</div>}
          </div>
        </div>

        {/* AI COPYWRITER & WHATSAPP CHAT BUBBLE PREVIEW */}
        <div style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #eff6ff 100%)', border: '1px solid #bbf7d0', borderRadius: '18px', padding: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: '#5b21b6', fontWeight: '900', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Sparkles size={18} /> AI WhatsApp Copywriter</div>
              <small style={{ color: '#64748b', fontSize: '0.8rem' }}>Gemini mengurus gaya bahasa, variabel dinamis & struktur penawaran.</small>
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0f766e', background: '#ccfbf1', padding: '5px 12px', borderRadius: '999px', border: '1px solid #99f6e4' }}>
              {selectedCustomers.filter((c) => c.phone && !disabledPhones.has(c.phone)).length} Target Tercentang
            </span>
          </div>

          {/* STORE SAVED TEMPLATE MANAGER */}
          {savedTemplates.length > 0 && (
            <div style={{ marginTop: '10px', padding: '10px', borderRadius: '12px', background: '#ffffff', border: '1px solid #c4b5fd' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: '800', color: '#5b21b6', display: 'block', marginBottom: '6px' }}>⭐ Template Tersimpan Toko Anda:</span>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {savedTemplates.map((tpl) => (
                  <div key={tpl.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '4px 8px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    <button type="button" onClick={() => { setCampaignMessage(tpl.message); if (tpl.imageUrl) setCampaignImageUrl(tpl.imageUrl); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '800', color: '#6d28d9' }}>
                      {tpl.title}
                    </button>
                    <button type="button" onClick={() => handleDeleteSavedTemplate(tpl.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold' }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI INSTRUCTION BOX */}
          <div style={{ marginTop: '12px', background: '#fff', border: '1px solid #ddd6fe', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ padding: '10px 14px', background: '#faf5ff', borderBottom: '1px solid #ede9fe', fontSize: '0.8rem', color: '#5b21b6', fontWeight: '700' }}>
              🤖 Perintah ke AI Gemini Copywriter:
            </div>
            <div style={{ padding: '12px' }}>
              <textarea className="input-field" value={campaignGoal} onChange={(e) => setCampaignGoal(e.target.value)} rows={3} placeholder="Contoh: Buat promo cleaning laptop ramah & singkat..." style={{ resize: 'vertical', lineHeight: 1.45, fontSize: '0.86rem' }} />
              
              {/* QUICK PRESETS */}
              <div style={{ marginTop: '8px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>⚡ Presets Cepat Instant:</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setCampaignGoal(DEFAULT_GOALS.ready)} style={{ fontSize: '0.72rem', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>⚡ Pengingat Servis Selesai</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setCampaignGoal(DEFAULT_GOALS.laptop)} style={{ fontSize: '0.72rem', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af' }}>🧹 Maintenance Laptop</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setCampaignGoal(DEFAULT_GOALS.hp)} style={{ fontSize: '0.72rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>📱 Pengecekan / Servis HP</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setCampaignGoal(DEFAULT_GOALS.pos)} style={{ fontSize: '0.72rem', background: '#fffbeb', border: '1px solid #fef08a', color: '#854d0e' }}>🛍️ Follow-up Kasir POS</button>
                </div>
              </div>

              <button type="button" className="btn" onClick={() => handleGenerateCopy('')} disabled={isGeneratingCopy} style={{ marginTop: '10px', width: '100%', background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)', color: '#fff', fontWeight: '900', padding: '10px' }}>
                <Sparkles size={16} /> {isGeneratingCopy ? 'AI sedang menulis draf...' : 'Buat Pesan dengan AI ✨'}
              </button>
            </div>
          </div>

          {/* DRAFT MESSAGE TEXTAREA & IMAGE URL ATTACHMENT */}
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '900', color: '#166534' }}>📝 Pesan WhatsApp (Bebas Edit)</label>
              <button type="button" className="btn btn-ghost" onClick={handleSaveCurrentTemplate} style={{ fontSize: '0.72rem', background: '#fff', border: '1px solid #cbd5e1', padding: '3px 8px' }}>
                💾 Simpan Jadi Template Toko
              </button>
            </div>
            <textarea ref={messageRef} className="input-field" value={campaignMessage} onChange={(e) => setCampaignMessage(e.target.value)} rows={6} placeholder={'Halo Kak {nama_pelanggan}, ...'} style={{ resize: 'vertical', lineHeight: 1.5, background: '#fff', fontSize: '0.86rem' }} />
            
            {/* IMAGE ATTACHMENT URL INPUT */}
            <div style={{ marginTop: '8px' }}>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '800', color: '#0369a1', marginBottom: '3px' }}>🖼️ Link URL Brosur Gambar Promo (Opsional)</label>
              <input
                type="url"
                className="input-field"
                placeholder="https://contoh.com/brosur-promo.jpg"
                value={campaignImageUrl}
                onChange={(e) => setCampaignImageUrl(e.target.value)}
                style={{ background: '#fff', fontSize: '0.82rem' }}
              />
            </div>

            {campaignMessage && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => handleGenerateCopy('Buat lebih singkat dan langsung ke inti')} disabled={isGeneratingCopy} style={{ fontSize: '0.72rem' }}>✂️ Lebih Singkat</button>
                <button type="button" className="btn btn-ghost" onClick={() => handleGenerateCopy('Buat lebih ramah dan natural seperti CS toko Indonesia')} disabled={isGeneratingCopy} style={{ fontSize: '0.72rem' }}>😊 Lebih Ramah</button>
                <button type="button" className="btn btn-ghost" onClick={() => handleGenerateCopy('Perbaiki copywriting tanpa mengubah fakta')} disabled={isGeneratingCopy} style={{ fontSize: '0.72rem' }}>✨ Polish AI</button>
              </div>
            )}

            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {CAMPAIGN_VARIABLES.map((variable) => (
                <button key={variable.token} type="button" className="btn btn-ghost" onClick={() => insertVariable(variable.token)} style={{ padding: '4px 8px', fontSize: '0.7rem', background: '#fff', border: '1px solid #cbd5e1' }} title={`${variable.label} → ${variable.example}`}>
                  {variable.token}
                </button>
              ))}
            </div>
            {unknownVariables.length > 0 && (
              <div style={{ marginTop: '6px', padding: '8px 10px', borderRadius: '10px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', fontSize: '0.78rem' }}>
                <AlertCircle size={14} style={{ display: 'inline', marginRight: 5 }} /> Variabel tidak dikenal: {unknownVariables.join(', ')}
              </div>
            )}
          </div>

          {/* REALISTIC WHATSAPP CHAT BUBBLE SIMULATION */}
          <div style={{ marginTop: '14px', borderRadius: '16px', overflow: 'hidden', border: '1px solid #bbf7d0', boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}>
            {/* WA Header */}
            <div style={{ background: '#075e54', padding: '10px 14px', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#128c7e', display: 'grid', placeItems: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                {storeName.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{storeName}</div>
                <div style={{ fontSize: '0.68rem', opacity: 0.85 }}>Online • Simulasi Tampilan WhatsApp</div>
              </div>
              <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '999px' }}>Preview</span>
            </div>

            {/* WA Chat Body */}
            <div style={{ background: '#efeae2', padding: '14px', minHeight: '110px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{
                maxWidth: '85%',
                alignSelf: 'flex-start',
                background: '#ffffff',
                padding: '10px 12px 6px 12px',
                borderRadius: '0px 12px 12px 12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                position: 'relative',
                wordBreak: 'break-word'
              }}>
                {campaignImageUrl && (
                  <div style={{ marginBottom: '8px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', maxHeight: '180px', background: '#f1f5f9' }}>
                    <img
                      src={campaignImageUrl}
                      alt="Brosur Promo"
                      onError={(e) => { e.target.style.display = 'none'; }}
                      style={{ width: '100%', objectFit: 'cover', display: 'block', maxHeight: '180px' }}
                    />
                  </div>
                )}
                <div style={{ fontSize: '0.84rem', color: '#111b21', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                  {activePreview}
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.65rem', color: '#667781', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                  <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span style={{ color: '#53bdeb', fontWeight: 'bold' }}>✓✓</span>
                </div>
              </div>
            </div>
          </div>

          {/* BATCH CONTROL */}
          <div style={{ marginTop: '14px', background: '#ffffff', borderRadius: '14px', padding: '12px', border: '1px solid #cbd5e1' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>⚡ Kontrol Jeda Pengiriman Anti-Spam</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>Kontak per Batch</label>
                <select className="input-field" value={broadcastBatchSize} onChange={(e) => setBroadcastBatchSize(Number(e.target.value))} style={{ fontSize: '0.82rem' }}>
                  <option value={10}>10 kontak</option>
                  <option value={20}>20 kontak</option>
                  <option value={50}>50 kontak</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>Jeda antar Pesan</label>
                <select className="input-field" value={broadcastDelaySec} onChange={(e) => setBroadcastDelaySec(Number(e.target.value))} style={{ fontSize: '0.82rem' }}>
                  <option value={3}>3 detik</option>
                  <option value={5}>5 detik</option>
                  <option value={10}>10 detik</option>
                </select>
              </div>
            </div>
            <small style={{ display: 'block', marginTop: '7px', color: '#64748b', lineHeight: 1.4 }}>Gunakan sesuai limit provider dan kebijakan WhatsApp. UnitPro tidak menjanjikan akun bebas pembatasan.</small>
          </div>

          {/* BROADCAST PROGRESS BAR */}
          {isBroadcasting && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '14px', padding: '12px', marginTop: '12px', animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: '800', color: '#166534', marginBottom: '6px' }}>
                <span>🚀 Mengirim via WhatsApp Gateway...</span><span>{broadcastProgress}%</span>
              </div>
              <div style={{ height: 10, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${broadcastProgress}%`, height: '100%', background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)', transition: 'width 0.3s ease-in-out' }} />
              </div>
              <div style={{ height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}><div style={{ width: `${broadcastProgress}%`, height: '100%', background: '#22c55e', transition: 'width 0.3s' }} /></div>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
            <button type="button" className="btn" style={{ background: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', fontWeight: '800', fontSize: '0.82rem' }} onClick={copySegmentPhones}>
              <Copy size={15} /> Salin Nomor ({selectedCustomers.filter((c) => c.phone).length})
            </button>
            <button type="button" className="btn" style={{ background: '#16a34a', color: '#fff', fontWeight: '900', fontSize: '0.82rem' }} onClick={sendOneCustomer}>
              <Send size={15} /> Kirim Tes ke 1 Orang
            </button>
            <button type="button" className="btn" disabled={isBroadcasting} style={{ background: isBroadcasting ? '#cbd5e1' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', fontWeight: '900', fontSize: '0.82rem', boxShadow: isBroadcasting ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.25)' }} onClick={handleStartBroadcast}>
              <Play size={15} /> {isBroadcasting ? 'Pengiriman Berjalan...' : 'Mulai Broadcast Gateway 🚀'}
            </button>
          </div>

          {/* LOGS */}
          {broadcastLogs.length > 0 && (
            <div style={{ marginTop: '14px', background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '12px' }}>
              <strong style={{ fontSize: '0.8rem', color: '#334155', display: 'block', marginBottom: '8px' }}>📋 Log Pengiriman Real-time</strong>
              <div style={{ maxHeight: '160px', overflowY: 'auto', fontSize: '0.78rem', paddingRight: '4px' }}>
                {broadcastLogs.map((log) => (
                  <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
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

      <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '7px', color: '#64748b', fontSize: '0.78rem' }}>
        <Users size={14} /> Data target berasal dari database toko sendiri. Jaga privasi dan gunakan pesan yang bermanfaat untuk pelanggan.
      </div>
    </div>
  );
}
