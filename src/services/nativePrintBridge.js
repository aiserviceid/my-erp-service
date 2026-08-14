import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

let lastServiceResi = '';

const extractResi = (node) => {
  let current = node;
  for (let depth = 0; current && depth < 10; depth += 1, current = current.parentElement) {
    const text = String(current.textContent || '');
    const match = text.match(/TRX-[A-Z0-9_-]+/i);
    if (match) return match[0].toUpperCase();
  }
  return '';
};

const rememberResi = (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const resi = extractResi(target);
  if (resi) lastServiceResi = resi;
};

const openNativePrintPage = (button) => {
  if (!Capacitor.isNativePlatform()) return false;
  const modal = button.closest('.modal-backdrop');
  if (!modal) return false;

  const label = String(button.textContent || '').trim();
  if (!/Thermal|A4/i.test(label)) return false;

  const modalText = String(modal.textContent || '');
  const resi = lastServiceResi || extractResi(modal);
  if (!resi) {
    window.alert('Nomor nota tidak terbaca. Tutup popup lalu tekan Nota lagi.');
    return true;
  }

  const format = /Thermal/i.test(label) ? 'thermal' : 'a4';
  const type = /Pengambilan|Pelunasan/i.test(modalText) ? 'pickup' : 'registration';
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
    rememberResi(event);
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button) return;
    openNativePrintPage(button);
  }, true);

  document.addEventListener('change', rememberResi, true);
}
