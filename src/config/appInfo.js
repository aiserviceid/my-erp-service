import packageJson from '../../package.json';
import { supabase } from '../services/supabase';
import { sendWhatsAppNotification } from '../services/notificationService';

export const APP_VERSION = packageJson.version;
export const APK_FILE_NAME = `UnitPro-Android-v${APP_VERSION}.apk`;
export const APK_DOWNLOAD_PATH = `/downloads/${APK_FILE_NAME}`;
export const APK_RELEASE_URL = `https://github.com/aiserviceid/my-erp-service/releases/download/v${APP_VERSION}/${APK_FILE_NAME}`;
export const APK_PUBLIC_URL = import.meta.env.VITE_APK_PUBLIC_URL || APK_RELEASE_URL;

const PICKUP_DEFAULT_DAYS = 15;
const PICKUP_DEFAULT_MESSAGE = 'Barang yang telah selesai harap diambil maksimal 15 hari. Setelah melewati batas tersebut, risiko kehilangan atau kerusakan barang di luar tanggung jawab toko.';
const COMPLETION_META_RE = /\n?\[(?:Garansi Servis|Batas Pengambilan|Peringatan Pengambilan):[^\]]*\]/gi;

const safeInlineText = (value = '') => String(value || '').replace(/[\[\]\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
const stripCompletionMeta = (issue = '') => String(issue || '').replace(COMPLETION_META_RE, '').trim();
const formatDateId = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};
const addDaysDateKey = (days) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + Math.max(0, Number(days || 0)));
  return date.toISOString().slice(0, 10);
};
const parseCompletionMeta = (issue = '') => {
  const text = String(issue || '');
  const warrantyMatch = text.match(/\[Garansi Servis:\s*([^\]|]+?)(?:\s*\|\s*berlaku sampai\s*([^\]]+))?\]/i);
  const pickupMatch = text.match(/\[Batas Pengambilan:\s*(\d+)\s*hari(?:\s*\|\s*maksimal\s*([^\]]+))?\]/i);
  const warningMatch = text.match(/\[Peringatan Pengambilan:\s*([^\]]+)\]/i);
  let warrantyMode = 'none';
  let warrantyEnd = '';
  if (warrantyMatch) {
    const warrantyLabel = String(warrantyMatch[1] || '').trim();
    const daysMatch = warrantyLabel.match(/(\d+)\s*hari/i);
    warrantyMode = daysMatch ? daysMatch[1] : 'custom';
    warrantyEnd = String(warrantyMatch[2] || '').trim();
  }
  return {
    warrantyMode,
    warrantyEnd,
    pickupEnabled: Boolean(pickupMatch || warningMatch),
    pickupDays: pickupMatch ? Number(pickupMatch[1]) : PICKUP_DEFAULT_DAYS,
    pickupMessage: warningMatch ? String(warningMatch[1]).trim() : PICKUP_DEFAULT_MESSAGE,
  };
};
const buildCompletionIssue = (issue = '', meta = {}) => {
  const clean = stripCompletionMeta(issue);
  const lines = [];
  const warrantyMode = String(meta.warrantyMode || 'none');
  if (warrantyMode !== 'none') {
    const warrantyEndKey = warrantyMode === 'custom' ? meta.warrantyEnd : addDaysDateKey(Number(warrantyMode));
    const warrantyLabel = warrantyMode === 'custom' ? 'Tanggal khusus' : `${Number(warrantyMode)} hari`;
    lines.push(`[Garansi Servis: ${warrantyLabel}${warrantyEndKey ? ` | berlaku sampai ${formatDateId(warrantyEndKey)}` : ''}]`);
  }
  if (meta.pickupEnabled) {
    const pickupDays = Math.max(1, Number(meta.pickupDays || PICKUP_DEFAULT_DAYS));
    const pickupEnd = addDaysDateKey(pickupDays);
    const warning = safeInlineText(meta.pickupMessage || PICKUP_DEFAULT_MESSAGE.replace('15 hari', `${pickupDays} hari`));
    lines.push(`[Batas Pengambilan: ${pickupDays} hari | maksimal ${formatDateId(pickupEnd)}]`);
    if (warning) lines.push(`[Peringatan Pengambilan: ${warning}]`);
  }
  return [clean, ...lines].filter(Boolean).join('\n').trim();
};

if (typeof window !== 'undefined') {
  window.__UNITPRO_SERVICE_COMPLETION_META__ = window.__UNITPRO_SERVICE_COMPLETION_META__ || {};
}

// Admin service modal enhancement: one customer can register up to 10 units at once.
if (typeof window !== 'undefined' && !window.__UNITPRO_ADMIN_MULTI_UNIT__) {
  window.__UNITPRO_ADMIN_MULTI_UNIT__ = true;

  const makeUnitCard = (index) => {
    const card = document.createElement('div');
    card.className = 'service-unit-card unitpro-admin-extra-unit';
    card.dataset.unitIndex = String(index);
    card.innerHTML = `
      <div class="service-unit-card__header">
        <strong>Unit ${index}</strong>
        <button type="button" class="service-unit-remove">Hapus unit</button>
      </div>
      <div class="service-registration-form-grid">
        <label class="label">Perangkat *<input data-unit-field="device" class="input-field" placeholder="Contoh: iPhone 13 / Laptop ASUS" required /></label>
        <label class="label">Kelengkapan unit *<input data-unit-field="kelengkapan" class="input-field" placeholder="Contoh: Charger, tas / Tidak ada" required /></label>
        <label class="label service-registration-wide">Keluhan atau kerusakan *<textarea data-unit-field="issue" class="input-field" placeholder="Jelaskan keluhan yang disampaikan pelanggan" rows="3" required></textarea></label>
        <label class="label">Estimasi biaya <input data-unit-field="estimasi_biaya" type="text" class="input-field" placeholder="Opsional, dalam Rupiah" inputmode="numeric" /></label>
        <label class="label">Estimasi selesai <input data-unit-field="estimasi_waktu" class="input-field" placeholder="Opsional, misal: 3 hari" /></label>
        <label class="label service-registration-wide">Tugaskan kepada teknisi *<select data-unit-field="technician_id" class="input-field" required></select></label>
      </div>`;
    return card;
  };

  const enhanceServiceForm = (form) => {
    if (!form || form.dataset.multiUnitReady === '1') return;
    form.dataset.multiUnitReady = '1';
    const grid = form.querySelector('.service-registration-form-grid');
    const submit = form.querySelector('.service-registration-submit');
    const technician = form.querySelector('select[name="technician_id"]');
    if (!grid || !submit || !technician) return;

    const firstDevice = form.querySelector('input[name="device"]');
    if (firstDevice) {
      const firstLabel = firstDevice.closest('label');
      if (firstLabel) firstLabel.insertAdjacentHTML('beforebegin', '<div class="service-registration-wide" style="font-weight:800;color:#0f172a;margin-top:4px">Unit 1</div>');
    }

    const extras = document.createElement('div');
    extras.className = 'service-registration-wide';
    extras.dataset.extraUnits = '1';
    grid.appendChild(extras);

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'btn service-add-unit service-registration-wide';
    addButton.innerHTML = '+ Tambah Unit <span style="font-weight:600">(maks. 10)</span>';
    grid.appendChild(addButton);

    const renumber = () => {
      extras.querySelectorAll('.unitpro-admin-extra-unit').forEach((card, idx) => {
        card.dataset.unitIndex = String(idx + 2);
        const title = card.querySelector('.service-unit-card__header strong');
        if (title) title.textContent = `Unit ${idx + 2}`;
      });
    };

    addButton.addEventListener('click', () => {
      const count = extras.querySelectorAll('.unitpro-admin-extra-unit').length + 1;
      if (count >= 10) return window.alert('Maksimal 10 unit untuk satu pelanggan dalam satu penerimaan.');
      const card = makeUnitCard(count + 1);
      const clonedSelect = card.querySelector('[data-unit-field="technician_id"]');
      clonedSelect.innerHTML = technician.innerHTML;
      clonedSelect.value = technician.value || '';
      card.querySelector('.service-unit-remove').addEventListener('click', () => { card.remove(); renumber(); });
      extras.appendChild(card);
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    form.addEventListener('submit', async (event) => {
      const cards = [...extras.querySelectorAll('.unitpro-admin-extra-unit')];
      if (!cards.length || form.dataset.multiUnitSubmitting === '1') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!form.reportValidity()) return;

      form.dataset.multiUnitSubmitting = '1';
      submit.disabled = true;
      const originalSubmitHtml = submit.innerHTML;
      submit.textContent = 'Menyimpan semua unit...';

      const fd = new FormData(form);
      const customerName = String(fd.get('name') || '').trim();
      const phone = String(fd.get('phone') || '').replace(/\s/g, '');
      if (!/^(?:\+?62|0)8\d{7,12}$/.test(phone)) {
        window.alert('Masukkan nomor WhatsApp yang valid, contoh: 081234567890.');
        form.dataset.multiUnitSubmitting = '0'; submit.disabled = false; submit.innerHTML = originalSubmitHtml; return;
      }
      const normalizedPhone = phone.replace(/^\+/, '').replace(/^0/, '62');
      const money = (value) => Number(String(value || '').replace(/\D/g, '')) || 0;
      const makeIssue = (issue, kelengkapan, waktu, biaya) => `${issue} | Kelengkapan: ${kelengkapan || '-'}${waktu ? ` | Est. Waktu: ${waktu}` : ''}${biaya ? ` | Est. Biaya: Rp ${money(biaya).toLocaleString('id-ID')}` : ''}`;
      const units = [{
        device: fd.get('device'), kelengkapan: fd.get('kelengkapan'), issue: fd.get('issue'),
        estimasi_biaya: fd.get('estimasi_biaya'), estimasi_waktu: fd.get('estimasi_waktu'), technician_id: fd.get('technician_id')
      }, ...cards.map((card) => {
        const get = (field) => card.querySelector(`[data-unit-field="${field}"]`)?.value || '';
        return { device: get('device'), kelengkapan: get('kelengkapan'), issue: get('issue'), estimasi_biaya: get('estimasi_biaya'), estimasi_waktu: get('estimasi_waktu'), technician_id: get('technician_id') };
      })];

      const tenantCode = localStorage.getItem('TENANT_CODE');
      const batchId = Date.now();
      const saved = [];
      try {
        if (!tenantCode) throw new Error('Sesi toko tidak ditemukan. Silakan masuk ulang.');
        for (let i = 0; i < units.length; i += 1) {
          const unit = units[i];
          const resi = `TRX-${batchId}-${String(i + 1).padStart(2, '0')}`;
          const payload = {
            tenant_code: tenantCode,
            resi,
            customer_name: customerName,
            customer_phone: normalizedPhone,
            device_name: String(unit.device || '').trim(),
            issue: makeIssue(unit.issue, unit.kelengkapan, unit.estimasi_waktu, unit.estimasi_biaya),
            technician_id: unit.technician_id,
            status: 'PROSES'
          };
          const { data, error } = await supabase.from('services').insert(payload).select().single();
          if (error) throw new Error(`Unit ${i + 1} gagal disimpan: ${error.message || 'database menolak data'}`);
          saved.push(data || payload);
        }
        window.alert(`${saved.length} unit berhasil didaftarkan dan ditugaskan untuk ${customerName}.\n\nResi:\n${saved.map(item => item.resi).join('\n')}`);
        window.location.reload();
      } catch (error) {
        window.alert(`${error.message || 'Gagal menyimpan semua unit.'}${saved.length ? `\n\n${saved.length} unit sudah berhasil tersimpan. Jangan input ulang unit tersebut.` : ''}`);
        form.dataset.multiUnitSubmitting = '0'; submit.disabled = false; submit.innerHTML = originalSubmitHtml;
      }
    }, true);
  };

  const observer = new MutationObserver(() => {
    document.querySelectorAll('form.service-registration-form').forEach(enhanceServiceForm);
  });
  const start = () => {
    observer.observe(document.documentElement, { childList: true, subtree: true });
    document.querySelectorAll('form.service-registration-form').forEach(enhanceServiceForm);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

// Completion/warranty enhancement shared by Admin, technician portal and cashier portal.
if (typeof window !== 'undefined' && !window.__UNITPRO_COMPLETION_ENHANCER__) {
  window.__UNITPRO_COMPLETION_ENHANCER__ = true;
  const completionMetaStore = window.__UNITPRO_SERVICE_COMPLETION_META__;
  const promptGuard = new Map();

  const extractResi = (root) => {
    const text = root?.textContent || '';
    const match = text.match(/(?:Resi\s*:?\s*)?(TRX-[A-Z0-9_-]+)/i);
    return match ? match[1].toUpperCase() : '';
  };

  const makeCompletionFields = (initialMeta = {}) => {
    const meta = { warrantyMode: 'none', warrantyEnd: '', pickupEnabled: false, pickupDays: PICKUP_DEFAULT_DAYS, pickupMessage: PICKUP_DEFAULT_MESSAGE, ...initialMeta };
    const box = document.createElement('div');
    box.className = 'unitpro-completion-options';
    box.style.cssText = 'grid-column:1/-1;margin-top:14px;padding:14px;border:1px solid #dbeafe;border-radius:14px;background:#f8fbff;color:#0f172a;';
    box.innerHTML = `
      <div style="font-weight:900;font-size:14px;margin-bottom:4px;color:#0f172a">Garansi & Aturan Pengambilan</div>
      <div style="font-size:12px;line-height:1.5;color:#475569;margin-bottom:12px">Semua pengaturan di bawah bersifat opsional. QR/barcode garansi pada nota tetap digunakan.</div>
      <label style="display:block;font-size:12px;font-weight:800;color:#1e293b;margin-bottom:5px">Garansi servis</label>
      <select data-completion="warranty-mode" class="input-field" style="width:100%;margin-bottom:9px;background:#fff;color:#0f172a">
        <option value="none">Tanpa garansi</option>
        <option value="7">7 hari</option>
        <option value="14">14 hari</option>
        <option value="30">30 hari</option>
        <option value="60">60 hari</option>
        <option value="90">90 hari</option>
        <option value="custom">Tanggal khusus</option>
      </select>
      <div data-completion="warranty-custom-wrap" style="display:none;margin-bottom:10px">
        <label style="display:block;font-size:12px;font-weight:800;color:#1e293b;margin-bottom:5px">Tanggal akhir garansi</label>
        <input data-completion="warranty-end" type="date" class="input-field" style="width:100%;background:#fff;color:#0f172a" />
      </div>
      <label style="display:flex;align-items:flex-start;gap:9px;padding:10px;border-radius:10px;background:#fff;border:1px solid #e2e8f0;cursor:pointer;color:#0f172a">
        <input data-completion="pickup-enabled" type="checkbox" style="margin-top:2px;width:18px;height:18px" />
        <span><strong style="display:block;font-size:13px">Aktifkan aturan batas pengambilan</strong><small style="display:block;color:#64748b;margin-top:2px;line-height:1.4">Default 15 hari dan dapat diubah.</small></span>
      </label>
      <div data-completion="pickup-wrap" style="display:none;margin-top:10px">
        <label style="display:block;font-size:12px;font-weight:800;color:#1e293b;margin-bottom:5px">Batas pengambilan (hari)</label>
        <input data-completion="pickup-days" type="number" min="1" max="365" class="input-field" value="${Number(meta.pickupDays || PICKUP_DEFAULT_DAYS)}" style="width:100%;margin-bottom:9px;background:#fff;color:#0f172a" />
        <label style="display:block;font-size:12px;font-weight:800;color:#1e293b;margin-bottom:5px">Pesan peringatan ke pelanggan</label>
        <textarea data-completion="pickup-message" class="input-field" rows="3" style="width:100%;resize:vertical;background:#fff;color:#0f172a;line-height:1.45">${safeInlineText(meta.pickupMessage || PICKUP_DEFAULT_MESSAGE)}</textarea>
      </div>`;

    const mode = box.querySelector('[data-completion="warranty-mode"]');
    const customWrap = box.querySelector('[data-completion="warranty-custom-wrap"]');
    const endInput = box.querySelector('[data-completion="warranty-end"]');
    const pickupEnabled = box.querySelector('[data-completion="pickup-enabled"]');
    const pickupWrap = box.querySelector('[data-completion="pickup-wrap"]');
    const pickupDays = box.querySelector('[data-completion="pickup-days"]');
    const pickupMessage = box.querySelector('[data-completion="pickup-message"]');

    mode.value = String(meta.warrantyMode || 'none');
    endInput.value = /^\d{4}-\d{2}-\d{2}$/.test(String(meta.warrantyEnd || '')) ? meta.warrantyEnd : '';
    pickupEnabled.checked = Boolean(meta.pickupEnabled);
    const refresh = () => {
      customWrap.style.display = mode.value === 'custom' ? 'block' : 'none';
      pickupWrap.style.display = pickupEnabled.checked ? 'block' : 'none';
    };
    mode.addEventListener('change', refresh);
    pickupEnabled.addEventListener('change', refresh);
    pickupDays.addEventListener('change', () => {
      if (pickupMessage.value.trim() === PICKUP_DEFAULT_MESSAGE) {
        pickupMessage.value = PICKUP_DEFAULT_MESSAGE.replace('15 hari', `${Math.max(1, Number(pickupDays.value || PICKUP_DEFAULT_DAYS))} hari`);
      }
    });
    refresh();
    return box;
  };

  const collectCompletionMeta = (box) => {
    const warrantyMode = box.querySelector('[data-completion="warranty-mode"]')?.value || 'none';
    const warrantyEnd = box.querySelector('[data-completion="warranty-end"]')?.value || '';
    const pickupEnabled = Boolean(box.querySelector('[data-completion="pickup-enabled"]')?.checked);
    const pickupDays = Math.max(1, Number(box.querySelector('[data-completion="pickup-days"]')?.value || PICKUP_DEFAULT_DAYS));
    let pickupMessage = safeInlineText(box.querySelector('[data-completion="pickup-message"]')?.value || '');
    if (!pickupMessage) pickupMessage = PICKUP_DEFAULT_MESSAGE.replace('15 hari', `${pickupDays} hari`);
    return { warrantyMode, warrantyEnd, pickupEnabled, pickupDays, pickupMessage };
  };

  const syncCompletionMetadata = async (resi, meta, attempt = 0) => {
    if (!resi || attempt > 4) return;
    try {
      const { data: service, error } = await supabase.from('services').select('resi,issue,status').eq('resi', resi).maybeSingle();
      if (error || !service) throw error || new Error('Servis belum tersedia');
      if (!['SELESAI', 'DIAMBIL', 'DI AMBIL'].includes(String(service.status || '').toUpperCase()) && attempt < 4) {
        window.setTimeout(() => syncCompletionMetadata(resi, meta, attempt + 1), 500 + (attempt * 350));
        return;
      }
      const nextIssue = buildCompletionIssue(service.issue || '', meta);
      if (nextIssue !== service.issue) {
        await supabase.from('services').update({ issue: nextIssue }).eq('resi', resi);
      }
    } catch (error) {
      if (attempt < 4) window.setTimeout(() => syncCompletionMetadata(resi, meta, attempt + 1), 650 + (attempt * 400));
      else console.warn('Sinkronisasi metadata garansi gagal:', error);
    }
  };

  const completionMessage = (service, meta) => {
    const total = Math.max(0, Number(service.part_fee || 0) + Number(service.jasa_fee || 0));
    const lines = [
      `Halo ${service.customer_name || 'Kak'},`,
      '',
      `Servis perangkat ${service.device_name || ''} Anda (Resi: ${service.resi}) telah *SELESAI*.`,
      total > 0 ? `Total Tagihan: Rp ${total.toLocaleString('id-ID')}.` : '',
    ].filter(Boolean);
    if (String(meta.warrantyMode || 'none') !== 'none') {
      const endKey = meta.warrantyMode === 'custom' ? meta.warrantyEnd : addDaysDateKey(Number(meta.warrantyMode));
      const label = meta.warrantyMode === 'custom' ? 'sesuai tanggal yang ditentukan' : `${meta.warrantyMode} hari`;
      lines.push('', `Garansi servis: *${label}*${endKey ? ` (sampai ${formatDateId(endKey)})` : ''}.`);
    }
    if (meta.pickupEnabled) lines.push('', `⚠️ ${meta.pickupMessage}`);
    lines.push('', 'Silakan diambil di toko kami. Terima kasih!');
    return lines.join('\n');
  };

  const maybeSendAdminCompletionWa = async (resi, meta) => {
    if (!resi) return;
    const lastPrompt = promptGuard.get(resi) || 0;
    if (Date.now() - lastPrompt < 10000) return;
    promptGuard.set(resi, Date.now());
    window.setTimeout(async () => {
      const { data: service } = await supabase.from('services').select('*').eq('resi', resi).maybeSingle();
      if (!service || String(service.status || '').toUpperCase() !== 'SELESAI' || !service.customer_phone) return;
      const confirmed = window.UnitProConfirm
        ? await window.UnitProConfirm({ title: 'Kirim status Selesai?', message: 'Rincian servis sudah tersimpan. Kirim status, garansi, dan aturan pengambilan (jika aktif) ke WhatsApp pelanggan?', confirmText: 'Kirim WA', tone: 'success' })
        : window.confirm('Kirim status Selesai ke WhatsApp pelanggan sekarang?');
      if (!confirmed) return;
      await sendWhatsAppNotification({
        tenant: { code: service.tenant_code, settings: JSON.parse(localStorage.getItem('TENANT_SETTINGS') || '{}'), token: localStorage.getItem('TENANT_TOKEN') || '' },
        target: service.customer_phone,
        message: completionMessage(service, meta),
        openManual: true,
      });
    }, 900);
  };

  const enhanceCompletionForm = async (form) => {
    if (!form || form.dataset.completionEnhanced === '1') return;
    const submitText = form.querySelector('button[type="submit"]')?.textContent || '';
    const isEmployeeFinish = /Simpan\s*&?\s*Tandai\s*Selesai/i.test(submitText);
    const isAdminNote = Boolean(form.querySelector('textarea[name="note"]')) && /Simpan\s*Koreksi\s*Nota/i.test(submitText);
    if (!isEmployeeFinish && !isAdminNote) return;

    form.dataset.completionEnhanced = '1';
    const panel = form.closest('.glass-panel') || form;
    panel.style.background = '#ffffff';
    panel.style.color = '#0f172a';
    panel.style.maxHeight = '92dvh';
    panel.style.overflowY = 'auto';
    panel.style.border = '1px solid #e2e8f0';
    panel.style.boxShadow = '0 22px 55px rgba(15,23,42,.28)';
    form.querySelectorAll('label').forEach((label) => { label.style.color = '#1e293b'; label.style.fontWeight = '800'; });
    form.querySelectorAll('.input-field').forEach((field) => { field.style.background = '#fff'; field.style.color = '#0f172a'; field.style.borderColor = '#cbd5e1'; });

    const resi = extractResi(panel);
    let initialMeta = {};
    const note = form.querySelector('textarea[name="note"]');
    if (note) initialMeta = parseCompletionMeta(note.value || '');
    else if (resi) {
      const { data: service } = await supabase.from('services').select('issue').eq('resi', resi).maybeSingle();
      if (service?.issue) initialMeta = parseCompletionMeta(service.issue);
    }
    const box = makeCompletionFields(initialMeta);
    const submit = form.querySelector('button[type="submit"]');
    submit.parentNode.insertBefore(box, submit);

    form.addEventListener('submit', (event) => {
      const meta = collectCompletionMeta(box);
      if (meta.warrantyMode === 'custom' && !meta.warrantyEnd) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.alert('Pilih tanggal akhir garansi atau ubah pilihan menjadi Tanpa Garansi.');
        return;
      }
      const serviceResi = extractResi(panel) || resi;
      if (serviceResi) completionMetaStore[serviceResi] = meta;
      if (note) {
        note.value = buildCompletionIssue(note.value || '', meta);
        note.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (serviceResi) {
        window.setTimeout(() => syncCompletionMetadata(serviceResi, meta), 550);
        if (isAdminNote) maybeSendAdminCompletionWa(serviceResi, meta);
      }
    }, true);
  };

  const openCashierFinishModal = async (resi) => {
    const { data: service, error } = await supabase.from('services').select('*').eq('resi', resi).maybeSingle();
    if (error || !service) return window.alert('Data servis tidak ditemukan. Muat ulang halaman lalu coba lagi.');
    const existingMeta = parseCompletionMeta(service.issue || '');
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.72);display:flex;align-items:center;justify-content:center;padding:14px;';
    const panel = document.createElement('div');
    panel.style.cssText = 'width:100%;max-width:620px;max-height:92dvh;overflow-y:auto;background:#fff;color:#0f172a;border-radius:18px;padding:18px;box-shadow:0 25px 60px rgba(15,23,42,.35);';
    panel.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px">
        <div><div style="font-size:11px;font-weight:900;color:#0f766e;letter-spacing:.08em">PORTAL KASIR</div><h3 style="margin:3px 0 3px;color:#0f172a">Selesaikan Servis</h3><div style="font-size:12px;color:#64748b">${service.resi} • ${safeInlineText(service.customer_name)} • ${safeInlineText(service.device_name)}</div></div>
        <button type="button" data-close style="border:0;background:#f1f5f9;border-radius:9px;width:34px;height:34px;font-size:20px;cursor:pointer">×</button>
      </div>
      <form data-cashier-finish>
        <label style="display:block;font-size:12px;font-weight:800;margin-bottom:5px;color:#1e293b">Catatan hasil perbaikan</label>
        <textarea name="repair_note" class="input-field" rows="3" placeholder="Contoh: Ganti LCD, cleaning konektor, unit normal kembali" style="width:100%;margin-bottom:10px;background:#fff;color:#0f172a"></textarea>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <label style="font-size:12px;font-weight:800;color:#1e293b">Biaya sparepart (Rp)<input name="part_fee" inputmode="numeric" class="input-field" value="${Number(service.part_fee || 0)}" style="width:100%;margin-top:5px;background:#fff;color:#0f172a" /></label>
          <label style="font-size:12px;font-weight:800;color:#1e293b">Biaya jasa (Rp)<input name="jasa_fee" inputmode="numeric" class="input-field" value="${Number(service.jasa_fee || 0)}" style="width:100%;margin-top:5px;background:#fff;color:#0f172a" /></label>
          <label style="grid-column:1/-1;font-size:12px;font-weight:800;color:#1e293b">Diskon (Rp)<input name="discount" inputmode="numeric" class="input-field" value="0" style="width:100%;margin-top:5px;background:#fff;color:#0f172a" /></label>
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%;margin-top:14px;min-height:46px;font-weight:900">Simpan & Tandai Selesai</button>
      </form>`;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    const form = panel.querySelector('[data-cashier-finish]');
    const options = makeCompletionFields(existingMeta);
    form.insertBefore(options, form.querySelector('button[type="submit"]'));
    const close = () => overlay.remove();
    panel.querySelector('[data-close]').addEventListener('click', close);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      const fd = new FormData(form);
      const money = (value) => Number(String(value || '').replace(/\D/g, '')) || 0;
      const partFee = money(fd.get('part_fee'));
      const jasaFee = money(fd.get('jasa_fee'));
      const discount = money(fd.get('discount'));
      if (discount > partFee + jasaFee) return window.alert('Diskon tidak boleh lebih besar dari total biaya.');
      const meta = collectCompletionMeta(options);
      if (meta.warrantyMode === 'custom' && !meta.warrantyEnd) return window.alert('Pilih tanggal akhir garansi.');
      const repairNote = safeInlineText(fd.get('repair_note') || '');
      let issue = stripCompletionMeta(service.issue || '').replace(/\n?\[Diskon: Rp .*?\]/g, '').trim();
      if (repairNote) issue = `${issue}\n[Hasil Perbaikan: ${repairNote}]`.trim();
      if (discount > 0) issue = `${issue}\n[Diskon: Rp ${discount}]`.trim();
      issue = buildCompletionIssue(issue, meta);
      completionMetaStore[service.resi] = meta;
      submit.disabled = true;
      submit.textContent = 'Menyimpan...';
      try {
        const { data: updated, error: updateError } = await supabase.from('services').update({ status: 'SELESAI', part_fee: partFee, jasa_fee: jasaFee, issue }).eq('resi', service.resi).select().single();
        if (updateError) throw updateError;
        const shouldSend = window.UnitProConfirm
          ? await window.UnitProConfirm({ title: 'Kirim WhatsApp pelanggan?', message: 'Servis sudah ditandai Selesai. Kirim tagihan, garansi, dan aturan pengambilan (jika aktif)?', confirmText: 'Kirim WA', tone: 'success' })
          : window.confirm('Servis selesai. Kirim WhatsApp pelanggan sekarang?');
        if (shouldSend && updated?.customer_phone) {
          await sendWhatsAppNotification({
            tenant: { code: updated.tenant_code, settings: JSON.parse(localStorage.getItem('TENANT_SETTINGS') || '{}'), token: localStorage.getItem('EMPLOYEE_TOKEN') || localStorage.getItem('TENANT_TOKEN') || '' },
            target: updated.customer_phone,
            message: completionMessage(updated, meta),
            openManual: true,
          });
        }
        window.alert('Servis berhasil ditandai Selesai. Garansi dan aturan pengambilan sudah tersimpan.');
        close();
        window.location.reload();
      } catch (saveError) {
        console.error(saveError);
        window.alert(`Gagal menyimpan status Selesai: ${saveError?.message || 'periksa koneksi lalu coba lagi.'}`);
        submit.disabled = false;
        submit.textContent = 'Simpan & Tandai Selesai';
      }
    });
  };

  const enhanceCashierCards = () => {
    document.querySelectorAll('.cashier-recent-service').forEach((card) => {
      if (card.dataset.completionCashierReady === '1') return;
      card.dataset.completionCashierReady = '1';
      const status = String(card.querySelector('.badge')?.textContent || '').trim().toUpperCase();
      if (['SELESAI', 'DIAMBIL', 'DI AMBIL', 'DIBATALKAN', 'BATAL'].includes(status)) return;
      const resi = String(card.querySelector('.cashier-service-title span')?.textContent || '').trim().toUpperCase();
      const actions = card.querySelector('.cashier-service-actions');
      if (!resi || !actions) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-primary unitpro-cashier-finish';
      button.style.cssText = 'font-size:12px;padding:7px 10px;font-weight:850;';
      button.textContent = '✓ Selesai + Garansi';
      button.addEventListener('click', () => openCashierFinishModal(resi));
      actions.prepend(button);
    });
  };

  const scanCompletionUi = () => {
    document.querySelectorAll('form').forEach((form) => enhanceCompletionForm(form));
    enhanceCashierCards();
  };
  const completionObserver = new MutationObserver(scanCompletionUi);
  const startCompletionEnhancer = () => {
    completionObserver.observe(document.documentElement, { childList: true, subtree: true });
    scanCompletionUi();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startCompletionEnhancer, { once: true });
  else startCompletionEnhancer();
}
