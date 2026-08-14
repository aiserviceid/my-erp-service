import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from './supabase';

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

const toBase64Url = (value) => {
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  } catch {
    return '';
  }
};

const getReceiptPayload = async (resi, tenantCode) => {
  if (!resi || !tenantCode) return null;
  try {
    const { data: service, error } = await supabase
      .from('services')
      .select('resi,tenant_code,customer_name,device_name,issue,status,jasa_fee,part_fee,technician_id,created_at,updated_at')
      .eq('tenant_code', tenantCode)
      .eq('resi', resi)
      .maybeSingle();
    if (error || !service) return null;

    let settings = {};
    try { settings = JSON.parse(localStorage.getItem('TENANT_SETTINGS') || '{}'); } catch {}
    const tenant = {
      code: tenantCode,
      name: localStorage.getItem('TENANT_NAME') || settings.storeName || 'UnitPro',
      settings,
    };
    return { service, tenant };
  } catch (error) {
    console.warn('Data nota lokal tidak dapat dimuat:', error);
    return null;
  }
};

const openNativePrintPage = async (button) => {
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

  const tenantCode = String(localStorage.getItem('TENANT_CODE') || '').trim().toUpperCase();
  const query = new URLSearchParams({ resi, format, type, autoprint: '1' });
  if (tenantCode) query.set('tenant_code', tenantCode);

  const payload = await getReceiptPayload(resi, tenantCode);
  const encodedPayload = payload ? toBase64Url(payload) : '';
  const url = `${window.location.origin}/print-nota?${query.toString()}${encodedPayload ? `#payload=${encodedPayload}` : ''}`;

  try {
    await Browser.open({ url });
  } catch (error) {
    console.warn('Native print browser gagal dibuka:', error);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return true;
};

if (typeof window !== 'undefined' && !window.__UNITPRO_NATIVE_PRINT_BRIDGE__) {
  window.__UNITPRO_NATIVE_PRINT_BRIDGE__ = true;

  document.addEventListener('click', (event) => {
    rememberContext(event);
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button) return;

    if (Capacitor.isNativePlatform() && button.closest('.modal-backdrop') && /Thermal|A4/i.test(button.textContent || '')) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openNativePrintPage(button).catch((error) => {
        console.error('Gagal membuka nota cetak:', error);
        window.alert('Nota gagal dibuka. Silakan tutup popup lalu coba lagi.');
      });
    }
  }, true);

  document.addEventListener('change', rememberContext, true);
}
