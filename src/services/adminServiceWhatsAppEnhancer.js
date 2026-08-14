import { buildManualWhatsAppUrl, prepareServiceWhatsAppDelivery } from './notificationService';

const getRuntimeTenant = () => {
  let settings = {};
  try {
    settings = JSON.parse(localStorage.getItem('TENANT_SETTINGS') || '{}');
  } catch {
    settings = {};
  }

  return {
    code: localStorage.getItem('TENANT_CODE') || '',
    tenant_code: localStorage.getItem('TENANT_CODE') || '',
    name: localStorage.getItem('TENANT_NAME') || '',
    token: localStorage.getItem('TENANT_TOKEN') || '',
    settings,
  };
};

const isAdminPage = () => window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/');

const extractResi = (element) => {
  let node = element;
  for (let depth = 0; node && depth < 9; depth += 1, node = node.parentElement) {
    const match = String(node.textContent || '').match(/TRX-[A-Z0-9_-]+/i);
    if (match) return match[0].toUpperCase();
  }
  return '';
};

const parseWhatsAppHref = (href = '') => {
  try {
    const url = new URL(href, window.location.origin);
    const host = url.hostname.toLowerCase();
    if (host !== 'wa.me' && host !== 'api.whatsapp.com' && host !== 'web.whatsapp.com') return null;

    let phone = '';
    if (host === 'wa.me') phone = url.pathname.replace(/^\/+/, '').split('/')[0] || '';
    else phone = url.searchParams.get('phone') || '';

    return {
      phone: String(phone || '').replace(/\D/g, ''),
      message: url.searchParams.get('text') || '',
    };
  } catch {
    return null;
  }
};

const stripMarkdown = (value = '') => String(value || '').replace(/^\*+|\*+$/g, '').trim();
const lineValue = (message = '', label = '') => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(message || '').match(new RegExp(`^\\*?${escaped}\\*?\\s*:\\s*(.*?)$`, 'mi'));
  return match ? stripMarkdown(match[1]) : '';
};
const findValue = (message = '', pattern) => stripMarkdown(String(message || '').match(pattern)?.[1] || '');
const receiptLine = '━━━━━━━━━━━━━━━━━━━━';

const getStoreNameFromPrepared = (message, tenant) => {
  const lines = String(message || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const candidate = lines.find((line, index) => index > 0 && /^\*.+\*$/.test(line) && !/TOTAL|Status/i.test(line));
  return stripMarkdown(candidate) || tenant?.settings?.storeName || tenant?.name || 'UnitPro';
};

const buildPrintUrl = (resi, tenantCode, type = 'pickup') => {
  const query = new URLSearchParams({ resi, format: 'a4', type });
  if (tenantCode) query.set('tenant_code', tenantCode);
  return `${window.location.origin}/print-nota?${query.toString()}`;
};

const formatCompletionReceipt = (message, prepared, tenant, resi) => {
  const storeName = getStoreNameFromPrepared(message, tenant);
  const noteNo = lineValue(message, 'No. Nota') || resi;
  const customer = lineValue(message, 'Pelanggan') || '-';
  const device = lineValue(message, 'Perangkat') || '-';
  const partName = lineValue(message, 'Sparepart');
  const serviceName = lineValue(message, 'Jasa');
  const result = lineValue(message, 'Hasil Perbaikan');
  const partFee = lineValue(message, 'Biaya Sparepart') || 'Rp 0';
  const serviceFee = lineValue(message, 'Biaya Jasa') || 'Rp 0';
  const discount = lineValue(message, 'Diskon');
  const total = findValue(message, /TOTAL YANG HARUS DIBAYAR:\s*([^\n*]+(?:\.[0-9]{3})*)/i) || 'Rp 0';
  const payment = lineValue(message, 'Pembayaran');
  const warranty = lineValue(message, 'Garansi Servis');
  const warning = findValue(message, /^⚠️\s*(.+)$/mi);
  const qris = prepared?.urlMedia || '';

  const details = [
    partName ? `Sparepart : ${partName}` : '',
    serviceName ? `Jasa      : ${serviceName}` : '',
    result ? `Hasil     : ${result}` : '',
  ].filter(Boolean);

  return [
    '🧾 *NOTA TAGIHAN SERVIS*',
    `*${storeName}*`,
    receiptLine,
    `No. Nota  : ${noteNo}`,
    `Pelanggan : ${customer}`,
    `Perangkat : ${device}`,
    ...(details.length ? [receiptLine, '*RINCIAN PERBAIKAN*', ...details] : []),
    receiptLine,
    '*RINCIAN BIAYA*',
    `Sparepart : ${partFee}`,
    `Jasa      : ${serviceFee}`,
    ...(discount ? [`Diskon    : ${discount}`] : []),
    receiptLine,
    '*TOTAL TAGIHAN*',
    `*${total}*`,
    receiptLine,
    'Status: *SELESAI • BELUM LUNAS*',
    '',
    ...(payment || qris ? ['*PEMBAYARAN*'] : []),
    ...(payment ? [payment] : []),
    ...(qris ? [`QRIS: ${qris}`] : []),
    ...(warranty ? ['', `Garansi: ${warranty}`] : []),
    ...(warning ? ['', `⚠️ ${warning}`] : []),
    '',
    'Silakan lakukan pembayaran atau pengambilan sesuai total tagihan di atas.',
    'Setelah lunas dan barang diambil, UnitPro akan mengirim Nota Pelunasan serta Link Garansi.',
  ].filter((line, index, array) => line !== '' || (index > 0 && array[index - 1] !== '')).join('\n').trim();
};

const formatPickupReceipt = (message, tenant, resi) => {
  const storeName = getStoreNameFromPrepared(message, tenant);
  const noteNo = lineValue(message, 'No. Nota') || resi;
  const customer = lineValue(message, 'Pelanggan') || '-';
  const device = lineValue(message, 'Perangkat') || '-';
  const partFee = lineValue(message, 'Biaya Sparepart') || 'Rp 0';
  const serviceFee = lineValue(message, 'Biaya Jasa') || 'Rp 0';
  const discount = lineValue(message, 'Diskon');
  const total = findValue(message, /TOTAL LUNAS:\s*([^\n*]+(?:\.[0-9]{3})*)/i) || 'Rp 0';
  const warranty = lineValue(message, 'Garansi Servis') || 'Sesuai ketentuan toko';
  const warrantyUrl = findValue(message, /Link Garansi:\*?\s*(https?:\/\/\S+)/i) || `${window.location.origin}/garansi?resi=${encodeURIComponent(noteNo)}`;
  const tenantCode = tenant?.code || tenant?.tenant_code || '';
  const printUrl = buildPrintUrl(noteNo, tenantCode, 'pickup');

  return [
    '🧾 *NOTA PELUNASAN SERVIS*',
    `*${storeName}*`,
    receiptLine,
    `No. Nota  : ${noteNo}`,
    `Pelanggan : ${customer}`,
    `Perangkat : ${device}`,
    receiptLine,
    '*RINCIAN BIAYA*',
    `Sparepart : ${partFee}`,
    `Jasa      : ${serviceFee}`,
    ...(discount ? [`Diskon    : ${discount}`] : []),
    receiptLine,
    '*TOTAL LUNAS*',
    `*${total}*`,
    receiptLine,
    '✅ *LUNAS • BARANG SUDAH DIAMBIL*',
    '',
    `Garansi Servis: ${warranty}`,
    '',
    `🖨 *Nota Cetak:*\n${printUrl}`,
    '',
    `🔗 *Garansi Digital:*\n${warrantyUrl}`,
    '',
    'Simpan nota ini sebagai bukti pembayaran, servis, dan garansi.',
  ].join('\n').trim();
};

const enhanceWhatsAppButtons = () => {
  if (!isAdminPage()) return;

  const anchors = [...document.querySelectorAll('a[href*="wa.me"], a[href*="api.whatsapp.com"], a[href*="web.whatsapp.com"]')]
    .filter((anchor) => /Kirim\s*WA/i.test(anchor.textContent || ''));

  anchors.forEach((anchor) => {
    if (anchor.dataset.unitproStatusAwareWa === '1') return;
    anchor.dataset.unitproStatusAwareWa = '1';

    anchor.addEventListener('click', async (event) => {
      const parsed = parseWhatsAppHref(anchor.href);
      const resi = extractResi(anchor);
      if (!parsed?.phone || !resi) return;

      event.preventDefault();
      event.stopPropagation();

      if (anchor.dataset.unitproWaBusy === '1') return;
      anchor.dataset.unitproWaBusy = '1';
      const originalText = anchor.textContent || 'Kirim WA';
      anchor.textContent = 'Menyiapkan...';

      try {
        const tenant = getRuntimeTenant();
        const fallbackMessage = parsed.message || `Resi: ${resi}`;
        const prepared = await prepareServiceWhatsAppDelivery({ tenant, message: fallbackMessage });

        let finalMessage = prepared.message || fallbackMessage;
        if (prepared.type === 'completion') {
          finalMessage = formatCompletionReceipt(finalMessage, prepared, tenant, prepared.resi || resi);
        } else if (prepared.type === 'pickup') {
          finalMessage = formatPickupReceipt(finalMessage, tenant, prepared.resi || resi);
        }

        const waUrl = buildManualWhatsAppUrl(parsed.phone, finalMessage);
        if (!waUrl) throw new Error('Nomor WhatsApp pelanggan tidak valid.');

        if (prepared.type === 'completion') anchor.textContent = 'Kirim Tagihan';
        else if (prepared.type === 'pickup') anchor.textContent = 'Kirim Nota Lunas';
        else anchor.textContent = originalText;

        window.open(waUrl, '_blank', 'noopener,noreferrer');
      } catch (error) {
        console.error('Gagal menyiapkan pesan WhatsApp servis:', error);
        anchor.textContent = originalText;
        window.open(anchor.href, '_blank', 'noopener,noreferrer');
      } finally {
        anchor.dataset.unitproWaBusy = '0';
      }
    }, true);
  });
};

if (typeof window !== 'undefined' && !window.__UNITPRO_ADMIN_STATUS_AWARE_WA__) {
  window.__UNITPRO_ADMIN_STATUS_AWARE_WA__ = true;
  let timer = null;
  const scheduleScan = () => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(enhanceWhatsAppButtons, 60);
  };

  const start = () => {
    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('popstate', scheduleScan);
    scheduleScan();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
