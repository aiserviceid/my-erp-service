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

const addPrintablePickupReceipt = (message, resi) => {
  const printUrl = `${window.location.origin}/print-nota?resi=${encodeURIComponent(resi)}&format=a4&type=pickup`;
  const printLine = `🖨 *Nota Fisik / Cetak:* ${printUrl}`;
  const warrantyMarker = /\n(🔗\s*\*Link Garansi:\*)/i;

  if (warrantyMarker.test(message)) {
    return message.replace(warrantyMarker, `\n${printLine}\n\n$1`);
  }
  return `${message}\n\n${printLine}`;
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
        const prepared = await prepareServiceWhatsAppDelivery({
          tenant,
          message: fallbackMessage,
        });

        let finalMessage = prepared.message || fallbackMessage;
        if (prepared.type === 'completion' && prepared.urlMedia && !finalMessage.includes(prepared.urlMedia)) {
          finalMessage = `${finalMessage}\n\nQRIS Pembayaran: ${prepared.urlMedia}`;
        }
        if (prepared.type === 'pickup') {
          finalMessage = addPrintablePickupReceipt(finalMessage, prepared.resi || resi);
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
