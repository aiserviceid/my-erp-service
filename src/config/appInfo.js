import packageJson from '../../package.json';
import { supabase } from '../services/supabase';

export const APP_VERSION = packageJson.version;
export const APK_FILE_NAME = `UnitPro-Android-v${APP_VERSION}.apk`;
export const APK_DOWNLOAD_PATH = `/downloads/${APK_FILE_NAME}`;
export const APK_RELEASE_URL = `https://github.com/aiserviceid/my-erp-service/releases/download/v${APP_VERSION}/${APK_FILE_NAME}`;
export const APK_PUBLIC_URL = import.meta.env.VITE_APK_PUBLIC_URL || APK_RELEASE_URL;

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