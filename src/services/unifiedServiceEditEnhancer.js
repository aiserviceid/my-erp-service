import { apiService } from './api';
import { supabase } from './supabase';
import { normalizeCustomerName, normalizeCustomerPhone } from '../utils/customerDirectory';

const getTenantCode = () => String(localStorage.getItem('TENANT_CODE') || '').trim();
const nameKey = (value = '') => normalizeCustomerName(value).toLocaleLowerCase('id-ID');
const localPhone = (value = '') => {
  const phone = normalizeCustomerPhone(value);
  return phone.startsWith('62') ? `0${phone.slice(2)}` : phone;
};
const money = (value) => {
  const parsed = parseInt(String(value ?? '').replace(/[^\d]/g, ''), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};
const formatMoney = (value) => Number(value || 0).toLocaleString('id-ID');
const serviceDiscount = (issue = '') => {
  const match = String(issue || '').match(/\[Diskon: Rp (.*?)\]/);
  return match ? money(match[1]) : 0;
};
const cleanIssue = (issue = '') => String(issue || '').replace(/\n?\[Diskon: Rp .*?\]/g, '').trim();
const issueWithDiscount = (issue = '', discount = 0) => {
  const clean = cleanIssue(issue);
  return discount > 0 ? `${clean}\n[Diskon: Rp ${discount}]`.trim() : clean;
};

const sameCustomer = (service, base) => {
  const basePhone = normalizeCustomerPhone(base?.customer_phone);
  const phone = normalizeCustomerPhone(service?.customer_phone);
  if (basePhone && phone === basePhone) return true;

  const baseName = nameKey(base?.customer_name);
  const currentName = nameKey(service?.customer_name);
  if (!baseName || currentName !== baseName) return false;
  return !basePhone || !phone || phone === basePhone;
};

const extractResi = (button) => {
  // Never infer a resi from the surrounding card text. On small screens the
  // status and device label can be adjacent to the resi, turning for example
  // `TRX-...-01` into `TRX-...-01SELESAILAPTOP`.
  const resi = String(button?.dataset?.serviceResi || '').trim().toUpperCase();
  return /^TRX-[A-Z0-9_-]+$/i.test(resi) ? resi : '';
};

const buttonStyle = (active = false, danger = false) => [
  'border:0',
  'border-radius:10px',
  'padding:9px 12px',
  'font-weight:900',
  'cursor:pointer',
  active ? (danger ? 'background:#be123c;color:#fff' : 'background:#0f766e;color:#fff') : 'background:#e2e8f0;color:#475569',
].join(';');

const fieldStyle = 'width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;background:#fff;color:#0f172a;font:inherit;';
const labelStyle = 'display:block;font-size:12px;font-weight:900;color:#334155;margin:0 0 5px;';

const loadEditorData = async (resi) => {
  const tenantCode = getTenantCode();
  if (!tenantCode) throw new Error('Sesi toko tidak ditemukan.');

  const { data: baseService, error: baseError } = await supabase
    .from('services')
    .select('*')
    .eq('tenant_code', tenantCode)
    .eq('resi', resi)
    .maybeSingle();
  if (baseError) throw baseError;
  if (!baseService) throw new Error(`Servis ${resi} tidak ditemukan.`);

  const { data: allServices, error: allError } = await supabase
    .from('services')
    .select('*')
    .eq('tenant_code', tenantCode)
    .order('created_at', { ascending: false });
  if (allError) throw allError;

  const related = (allServices || []).filter((service) => sameCustomer(service, baseService));
  return {
    tenantCode,
    baseService,
    allServices: allServices || [],
    related: related.length ? related : [baseService],
  };
};

const openUnifiedEditor = async (resi) => {
  if (!resi || document.querySelector('[data-unitpro-unified-editor="1"]')) return;

  const overlay = document.createElement('div');
  overlay.dataset.unitproUnifiedEditor = '1';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:1800;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;padding:14px;';
  overlay.innerHTML = `
    <section style="width:min(94vw,560px);max-height:90vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.35);color:#0f172a;">
      <header style="position:sticky;top:0;z-index:2;background:#fff;border-bottom:1px solid #e2e8f0;padding:16px 18px 13px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
        <div><h3 style="margin:0;font-size:18px;font-weight:950;">Edit Data Servis</h3><div data-editor-resi style="margin-top:3px;font-size:12px;color:#64748b;font-weight:800;">${resi}</div></div>
        <button type="button" data-editor-close aria-label="Tutup" style="border:0;background:#f1f5f9;border-radius:10px;width:36px;height:36px;font-size:22px;cursor:pointer;color:#475569;">×</button>
      </header>
      <div style="padding:14px 18px 18px;">
        <div data-editor-tabs style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">
          <button type="button" data-editor-tab="customer">Pelanggan</button>
          <button type="button" data-editor-tab="nota">Nota</button>
          <button type="button" data-editor-tab="delete">Hapus</button>
        </div>
        <div data-editor-body><div style="padding:26px;text-align:center;color:#64748b;font-weight:800;">Memuat data...</div></div>
      </div>
    </section>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('[data-editor-close]')?.addEventListener('click', close);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
  const onKey = (event) => {
    if (event.key === 'Escape' && document.body.contains(overlay)) {
      close();
      document.removeEventListener('keydown', onKey);
    }
  };
  document.addEventListener('keydown', onKey);

  const body = overlay.querySelector('[data-editor-body]');
  const tabButtons = [...overlay.querySelectorAll('[data-editor-tab]')];
  let state;
  try {
    state = await loadEditorData(resi);
  } catch (error) {
    body.innerHTML = `<div style="padding:18px;border-radius:12px;background:#fff7ed;color:#9a3412;font-weight:800;">${error?.message || 'Gagal memuat data servis.'}</div>`;
    return;
  }

  const setTabVisual = (tab) => {
    tabButtons.forEach((button) => {
      const active = button.dataset.editorTab === tab;
      const danger = button.dataset.editorTab === 'delete';
      button.style.cssText = buttonStyle(active, danger);
    });
  };

  const renderCustomer = () => {
    setTabVisual('customer');
    const base = state.baseService;
    body.innerHTML = `
      <div style="padding:13px;border:1px solid #dbeafe;background:#f8fbff;border-radius:13px;margin-bottom:13px;font-size:12px;line-height:1.5;color:#475569;">
        Perubahan nama atau nomor akan disinkronkan ke <strong>${state.related.length} nota/riwayat servis</strong> milik pelanggan yang sama.
      </div>
      <label style="${labelStyle}">Nama pelanggan</label>
      <input data-edit-customer-name style="${fieldStyle}" value="">
      <label style="${labelStyle}margin-top:11px;">Nomor WhatsApp</label>
      <input data-edit-customer-phone type="tel" inputmode="tel" style="${fieldStyle}" value="">
      <button type="button" data-save-customer style="width:100%;margin-top:14px;border:0;border-radius:11px;padding:11px 14px;background:#0f766e;color:#fff;font-weight:950;cursor:pointer;">Simpan Data Pelanggan</button>
    `;
    const nameInput = body.querySelector('[data-edit-customer-name]');
    const phoneInput = body.querySelector('[data-edit-customer-phone]');
    nameInput.value = base.customer_name || '';
    phoneInput.value = localPhone(base.customer_phone || '');

    body.querySelector('[data-save-customer]')?.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      const newName = normalizeCustomerName(nameInput.value);
      const newPhone = normalizeCustomerPhone(phoneInput.value);
      if (!newName) return window.alert('Nama pelanggan wajib diisi.');
      if (!/^628\d{7,12}$/.test(newPhone)) return window.alert('Nomor WhatsApp tidak valid. Contoh: 081234567890.');

      let targets = [...state.related];
      const currentResis = new Set(targets.map((service) => service.resi));
      const matches = state.allServices.filter((service) => normalizeCustomerPhone(service.customer_phone) === newPhone && !currentResis.has(service.resi));
      if (matches.length) {
        const merge = window.confirm(`Nomor ${localPhone(newPhone)} sudah dipakai pelanggan lain.\n\nGabungkan semua riwayat dengan nomor tersebut menjadi satu pelanggan?`);
        if (!merge) return;
        targets = [...targets, ...matches];
      }
      targets = [...new Map(targets.map((service) => [service.resi, service])).values()];

      button.disabled = true;
      button.textContent = 'Menyimpan...';
      try {
        const resis = targets.map((service) => service.resi).filter(Boolean);
        const { error } = await supabase
          .from('services')
          .update({ customer_name: newName, customer_phone: newPhone })
          .eq('tenant_code', state.tenantCode)
          .in('resi', resis);
        if (error) throw error;
        window.alert(`Data pelanggan berhasil diperbarui pada ${resis.length} nota/riwayat servis.`);
        window.location.reload();
      } catch (error) {
        window.alert(error?.message || 'Gagal memperbarui data pelanggan.');
        button.disabled = false;
        button.textContent = 'Simpan Data Pelanggan';
      }
    });
  };

  const renderNota = () => {
    setTabVisual('nota');
    const base = state.baseService;
    const discount = serviceDiscount(base.issue);
    body.innerHTML = `
      <div style="padding:13px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:13px;margin-bottom:13px;font-size:12px;line-height:1.5;color:#475569;">
        Edit nota hanya mengubah servis <strong>${base.resi}</strong>, tidak mengubah nota servis lain milik pelanggan ini.
      </div>
      <label style="${labelStyle}">Keterangan / rincian perbaikan</label>
      <textarea data-edit-note rows="4" style="${fieldStyle}resize:vertical;"></textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:11px;">
        <div><label style="${labelStyle}">Biaya sparepart</label><input data-edit-part inputmode="numeric" style="${fieldStyle}"></div>
        <div><label style="${labelStyle}">Biaya jasa</label><input data-edit-jasa inputmode="numeric" style="${fieldStyle}"></div>
      </div>
      <label style="${labelStyle}margin-top:11px;">Diskon</label>
      <input data-edit-discount inputmode="numeric" style="${fieldStyle}">
      <button type="button" data-save-nota style="width:100%;margin-top:14px;border:0;border-radius:11px;padding:11px 14px;background:#0ea5e9;color:#fff;font-weight:950;cursor:pointer;">Simpan Nota</button>
    `;
    const note = body.querySelector('[data-edit-note]');
    const part = body.querySelector('[data-edit-part]');
    const jasa = body.querySelector('[data-edit-jasa]');
    const disc = body.querySelector('[data-edit-discount]');
    note.value = cleanIssue(base.issue);
    part.value = formatMoney(base.part_fee);
    jasa.value = formatMoney(base.jasa_fee);
    disc.value = formatMoney(discount);

    [part, jasa, disc].forEach((input) => input.addEventListener('input', () => {
      input.value = String(input.value || '').replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }));

    body.querySelector('[data-save-nota]')?.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      const partFee = money(part.value);
      const jasaFee = money(jasa.value);
      const discountValue = money(disc.value);
      if (discountValue > partFee + jasaFee) return window.alert('Diskon tidak boleh lebih besar dari total biaya.');

      button.disabled = true;
      button.textContent = 'Menyimpan...';
      try {
        await apiService.post('/services/update', {
          resi: base.resi,
          tenant_code: state.tenantCode,
          part_fee: partFee,
          jasa_fee: jasaFee,
          issue: issueWithDiscount(note.value || base.issue || '', discountValue),
        });
        window.alert('Nota servis berhasil diperbarui.');
        window.location.reload();
      } catch (error) {
        window.alert(error?.message || 'Gagal menyimpan nota servis.');
        button.disabled = false;
        button.textContent = 'Simpan Nota';
      }
    });
  };

  const renderDelete = () => {
    setTabVisual('delete');
    const resis = state.related.map((service) => service.resi).filter(Boolean);
    body.innerHTML = `
      <div style="padding:14px;border:1px solid #fecdd3;background:#fff1f2;border-radius:13px;color:#9f1239;line-height:1.55;">
        <strong style="display:block;font-size:14px;margin-bottom:5px;">Hapus pelanggan beserta nota</strong>
        Tindakan ini akan menghapus data pelanggan <strong>${state.baseService.customer_name || 'ini'}</strong> dan <strong>${resis.length} nota/riwayat servis terkait</strong> secara permanen.
      </div>
      <div style="margin-top:10px;padding:11px;border:1px solid #e2e8f0;border-radius:11px;background:#f8fafc;font-size:12px;color:#64748b;max-height:120px;overflow:auto;">${resis.join(' • ')}</div>
      <button type="button" data-delete-all style="width:100%;margin-top:14px;border:0;border-radius:11px;padding:12px 14px;background:#be123c;color:#fff;font-weight:950;cursor:pointer;">Hapus Pelanggan + ${resis.length} Nota</button>
    `;
    body.querySelector('[data-delete-all]')?.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      const customerName = state.baseService.customer_name || 'pelanggan ini';
      const confirmed = window.UnitProConfirm
        ? await window.UnitProConfirm({
            title: 'Hapus pelanggan dan seluruh nota?',
            message: `${customerName} dan ${resis.length} nota/riwayat servis terkait akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`,
            confirmText: 'Hapus Permanen',
            tone: 'warning',
          })
        : window.confirm(`Hapus ${customerName} beserta ${resis.length} nota/riwayat servis terkait secara permanen?\n\nTindakan ini tidak dapat dibatalkan.`);
      if (!confirmed) return;

      button.disabled = true;
      button.textContent = 'Menghapus...';
      try {
        const { error } = await supabase
          .from('services')
          .delete()
          .eq('tenant_code', state.tenantCode)
          .in('resi', resis);
        if (error) throw error;
        window.alert(`Pelanggan dan ${resis.length} nota/riwayat servis berhasil dihapus.`);
        window.location.reload();
      } catch (error) {
        window.alert(error?.message || 'Gagal menghapus pelanggan dan nota.');
        button.disabled = false;
        button.textContent = `Hapus Pelanggan + ${resis.length} Nota`;
      }
    });
  };

  const render = (tab) => {
    if (tab === 'nota') renderNota();
    else if (tab === 'delete') renderDelete();
    else renderCustomer();
  };

  tabButtons.forEach((button) => button.addEventListener('click', () => render(button.dataset.editorTab)));
  render('customer');
};

const cleanLegacyButtons = () => {
  document.querySelectorAll('button').forEach((button) => {
    const text = String(button.textContent || '').trim();
    if (/^(?:👤\s*)?Edit Pelanggan$/i.test(text) || /^(?:🗑\s*)?Hapus Pelanggan$/i.test(text)) {
      const parentText = button.parentElement?.textContent || '';
      if (/Edit Nota|Cetak Nota|Stiker|Kirim WA|Edit Pelanggan|Hapus Pelanggan/i.test(parentText)) button.remove();
    }
  });
};

const enhanceEditButtons = () => {
  cleanLegacyButtons();
  const candidates = [...document.querySelectorAll('button')].filter((button) => {
    if (button.closest('.modal-backdrop')) return false;
    return Boolean(button.dataset.serviceResi) && /Edit Nota/i.test(button.textContent || '');
  });

  candidates.forEach((button) => {
    if (button.dataset.unitproUnifiedEditReady !== '1') {
      button.dataset.unitproUnifiedEditReady = '1';
      button.addEventListener('click', (event) => {
        const resi = extractResi(button);
        if (!resi) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openUnifiedEditor(resi).catch((error) => window.alert(error?.message || 'Gagal membuka menu Edit.'));
      }, true);
    }
    button.textContent = '✏️ Edit';
    button.style.color = '#0f766e';
    button.style.fontWeight = '800';
  });
};

if (typeof window !== 'undefined' && !window.__UNITPRO_UNIFIED_SERVICE_EDIT__) {
  window.__UNITPRO_UNIFIED_SERVICE_EDIT__ = true;
  const observer = new MutationObserver(enhanceEditButtons);
  const start = () => {
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    enhanceEditButtons();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
