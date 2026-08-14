import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

let lastServiceResi = '';
let lastServiceStatus = '';

const extractContext = (node) => {
  let current = node;
  let foundResi = '';
  let foundStatus = '';

  for (let depth = 0; current && depth < 10; depth += 1, current = current.parentElement) {
    const text = String(current.textContent || '');
    if (!foundResi) {
      const match = text.match(/TRX-[A-Z0-9_-]+/i);
      if (match) foundResi = match[0].toUpperCase();
    }
    if (!foundStatus) {
      if (/DI\s*[_ ]?AMBIL/i.test(text)) foundStatus = 'DIAMBIL';
      else if (/\bSELESAI\b/i.test(text)) foundStatus = 'SELESAI';
      else if (/\bDITERIMA\b/i.test(text)) foundStatus = 'DITERIMA';
      else if (/\bPROSES\b|DIKERJAKAN|DICEK|MENUNGGU_PART/i.test(text)) foundStatus = 'PROSES';
    }
    if (foundResi && foundStatus) break;
  }

  return { resi: foundResi, status: foundStatus };
};

const rememberContext = (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const context = extractContext(target);
  if (context.resi) lastServiceResi = context.resi;
  if (context.status) lastServiceStatus = context.status;
};

const openNativePrintPage = (button) => {
  if (!Capacitor.isNativePlatform()) return false;
  const modal = button.closest('.modal-backdrop');
  if (!modal) return false;

  const label = String(button.textContent || '').trim();
  if (!/Thermal|A4/i.test(label)) return false;

  const modalText = String(modal.textContent || '');
  const modalContext = extractContext(modal);
  const resi = lastServiceResi || modalContext.resi;
  const status = lastServiceStatus || modalContext.status;

  if (!resi) {
    window.alert('Nomor nota tidak terbaca. Tutup popup lalu tekan Nota lagi.');
    return true;
  }

  const format = /Thermal/i.test(label) ? 'thermal' : 'a4';
  let type = 'registration';
  if (status === 'DIAMBIL') type = 'pickup';
  else if (status === 'SELESAI') type = 'completion';
  else if (/Pengambilan|Pelunasan/i.test(modalText)) type = 'pickup';

  const url = `${window.location.origin}/print-nota?resi=${encodeURIComponent(resi)}&format=${format}&type=${type}&autoprint=1`;

  Browser.open({ url }).catch((error) => {
    console.warn('Native print browser gagal dibuka:', error);
    window.open(url, '_blank', 'noopener,noreferrer');
  });
  return true;
};

if (typeof window !== 'undefined' && !window.__UNITPRO_NATIVE_PRINT_BRIDGE__) {
  window.__UNITPRO_NATIVE_PRINT_BRIDGE__ = true;

  document.addEventListener('click', (event) => {
    rememberContext(event);
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button) return;
    openNativePrintPage(button);
  }, true);

  document.addEventListener('change', rememberContext, true);
}
