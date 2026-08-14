import { supabase } from './supabase';
import {
  buildCustomerDirectory,
  findCustomerSuggestions,
  normalizeCustomerName,
  normalizeCustomerPhone,
} from '../utils/customerDirectory';

const CACHE_TTL = 30000;
let cache = { tenantCode: '', loadedAt: 0, services: [], customers: [] };

const getTenantCode = () => {
  if (typeof window === 'undefined') return '';
  return String(localStorage.getItem('TENANT_CODE') || '').trim();
};

const localPhone = (value = '') => {
  const phone = normalizeCustomerPhone(value);
  return phone.startsWith('62') ? `0${phone.slice(2)}` : phone;
};

const nameKey = (value = '') => normalizeCustomerName(value).toLocaleLowerCase('id-ID');

const loadCustomerData = async (force = false) => {
  const tenantCode = getTenantCode();
  if (!tenantCode) return { services: [], customers: [] };
  const fresh = !force && cache.tenantCode === tenantCode && Date.now() - cache.loadedAt < CACHE_TTL;
  if (fresh) return cache;

  const { data, error } = await supabase
    .from('services')
    .select('resi, tenant_code, customer_name, customer_phone, device_name, status, created_at, updated_at')
    .eq('tenant_code', tenantCode)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const services = data || [];
  cache = {
    tenantCode,
    loadedAt: Date.now(),
    services,
    customers: buildCustomerDirectory(services),
  };
  return cache;
};

const invalidateCustomerCache = () => {
  cache.loadedAt = 0;
};

const applyCustomerToAdminForm = (form, customer) => {
  const nameInput = form.querySelector('input[name="name"]');
  const phoneInput = form.querySelector('input[name="phone"]');
  if (!nameInput || !phoneInput || !customer) return;
  nameInput.value = customer.name || '';
  phoneInput.value = localPhone(customer.phone || '');
  form.dataset.customerKey = customer.key || '';
};

const findExactCustomer = (customers, name, phone) => {
  const normalizedPhone = normalizeCustomerPhone(phone);
  if (normalizedPhone) {
    const byPhone = customers.find((customer) => customer.phone === normalizedPhone);
    if (byPhone) return byPhone;
  }

  const normalizedName = nameKey(name);
  if (!normalizedName) return null;
  const byName = customers.filter((customer) => customer.normalizedName === normalizedName || nameKey(customer.name) === normalizedName);
  return byName.length === 1 ? byName[0] : null;
};

const createSuggestionPanel = () => {
  const panel = document.createElement('div');
  panel.className = 'service-registration-wide unitpro-customer-suggestions';
  panel.style.cssText = 'display:none;border:1px solid #bae6fd;background:#f0f9ff;border-radius:14px;padding:10px;margin-top:-2px;grid-column:1/-1;';
  return panel;
};

const renderSuggestions = (form, panel, customers, query) => {
  const suggestions = findCustomerSuggestions(customers, query, 6);
  if (!suggestions.length) {
    panel.style.display = 'none';
    panel.innerHTML = '';
    return;
  }

  panel.innerHTML = `
    <div style="font-size:12px;font-weight:900;color:#075985;margin-bottom:7px">Pelanggan lama ditemukan</div>
    <div data-customer-results style="display:grid;gap:6px"></div>
  `;
  const list = panel.querySelector('[data-customer-results]');
  suggestions.forEach((customer) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.style.cssText = 'width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;background:#fff;border:1px solid #dbeafe;border-radius:11px;padding:10px 11px;color:#0f172a;';
    button.innerHTML = `<span><strong style="display:block;font-size:13px">${customer.name || 'Pelanggan'}</strong><span style="font-size:12px;color:#64748b">${localPhone(customer.phone) || 'Nomor belum tersedia'}</span></span><small style="color:#0369a1;font-weight:800;white-space:nowrap">${customer.serviceCount} servis</small>`;
    button.addEventListener('click', () => {
      applyCustomerToAdminForm(form, customer);
      panel.innerHTML = `<div style="font-size:12px;font-weight:800;color:#047857">✓ Pelanggan lama dipilih. Nama dan nomor memakai data yang sudah ada.</div>`;
      panel.style.display = 'block';
    });
    list.appendChild(button);
  });
  panel.style.display = 'block';
};

const enhanceAdminRegistration = async (form) => {
  if (!form || form.dataset.customerLookupReady === '1') return;
  const nameInput = form.querySelector('input[name="name"]');
  const phoneInput = form.querySelector('input[name="phone"]');
  const grid = form.querySelector('.service-registration-form-grid');
  if (!nameInput || !phoneInput || !grid) return;

  form.dataset.customerLookupReady = '1';
  const panel = createSuggestionPanel();
  const phoneLabel = phoneInput.closest('label');
  if (phoneLabel) phoneLabel.insertAdjacentElement('afterend', panel);
  else grid.prepend(panel);

  let customers = [];
  try {
    customers = (await loadCustomerData()).customers;
  } catch (error) {
    console.warn('Customer lookup unavailable:', error);
  }

  const refresh = (event) => {
    const input = event.currentTarget;
    renderSuggestions(form, panel, customers, input.value || '');
    const exact = findExactCustomer(customers, nameInput.value, phoneInput.value);
    if (exact && normalizeCustomerPhone(phoneInput.value) === exact.phone) {
      nameInput.value = exact.name || nameInput.value;
      form.dataset.customerKey = exact.key || '';
    } else if (exact && !String(phoneInput.value || '').trim() && exact.phone) {
      phoneInput.value = localPhone(exact.phone);
      form.dataset.customerKey = exact.key || '';
    }
  };

  nameInput.addEventListener('input', refresh);
  nameInput.addEventListener('focus', refresh);
  phoneInput.addEventListener('input', refresh);
  phoneInput.addEventListener('focus', refresh);

  // Jalankan sebelum handler multi-unit / handler React. Bila nama atau nomor
  // cocok tepat dengan pelanggan lama, gunakan data kanonik agar tidak membuat
  // variasi pelanggan baru hanya karena format nomor atau kapitalisasi nama.
  form.addEventListener('submit', () => {
    const exact = findExactCustomer(customers, nameInput.value, phoneInput.value);
    if (exact) applyCustomerToAdminForm(form, exact);
  }, true);
};

const extractResiFromEditNota = (form) => {
  const text = form?.textContent || '';
  return text.match(/(?:Resi\s*:?\s*)?(TRX-[A-Z0-9_-]+)/i)?.[1]?.toUpperCase() || '';
};

const relatedCustomerServices = (services, baseService) => {
  const oldPhone = normalizeCustomerPhone(baseService?.customer_phone);
  const oldName = nameKey(baseService?.customer_name);
  return services.filter((service) => {
    const phone = normalizeCustomerPhone(service.customer_phone);
    const name = nameKey(service.customer_name);
    if (oldPhone && phone === oldPhone) return true;
    if (oldName && name === oldName && (!oldPhone || !phone || phone === oldPhone)) return true;
    return false;
  });
};

const updateCustomerHistory = async ({ baseService, newName, newPhone }) => {
  const tenantCode = getTenantCode() || baseService?.tenant_code || '';
  if (!tenantCode) throw new Error('Sesi toko tidak ditemukan.');
  const cleanName = normalizeCustomerName(newName);
  const cleanPhone = normalizeCustomerPhone(newPhone);
  if (!cleanName) throw new Error('Nama pelanggan wajib diisi.');
  if (!/^628\d{7,12}$/.test(cleanPhone)) throw new Error('Nomor WhatsApp tidak valid. Contoh: 081234567890.');

  const data = await loadCustomerData(true);
  let related = relatedCustomerServices(data.services, baseService);
  if (!related.length) related = [baseService];

  const relatedResi = new Set(related.map((service) => service.resi));
  const targetPhoneMatches = data.services.filter(
    (service) => normalizeCustomerPhone(service.customer_phone) === cleanPhone && !relatedResi.has(service.resi),
  );

  if (targetPhoneMatches.length) {
    const otherName = targetPhoneMatches[0]?.customer_name || 'pelanggan lain';
    const shouldMerge = window.confirm(
      `Nomor ${localPhone(cleanPhone)} sudah ada pada data ${otherName}.\n\nGabungkan riwayat tersebut menjadi satu pelanggan?`,
    );
    if (!shouldMerge) throw new Error('Penyimpanan dibatalkan agar data pelanggan tidak tertukar.');
    related = [...related, ...targetPhoneMatches];
  }

  const unique = [...new Map(related.filter(Boolean).map((service) => [service.resi, service])).values()];
  for (const service of unique) {
    const { error } = await supabase
      .from('services')
      .update({ customer_name: cleanName, customer_phone: cleanPhone })
      .eq('tenant_code', tenantCode)
      .eq('resi', service.resi);
    if (error) throw error;
  }
  invalidateCustomerCache();
  return unique.length;
};

const enhanceEditNota = async (form) => {
  if (!form || form.dataset.customerEditReady === '1') return;
  const heading = [...form.querySelectorAll('h1,h2,h3,h4')].find((node) => /Edit Nota Servis/i.test(node.textContent || ''));
  if (!heading) return;
  const resi = extractResiFromEditNota(form);
  if (!resi) return;
  form.dataset.customerEditReady = '1';

  let baseService = null;
  try {
    const tenantCode = getTenantCode();
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('tenant_code', tenantCode)
      .eq('resi', resi)
      .maybeSingle();
    if (error) throw error;
    baseService = data;
  } catch (error) {
    console.warn('Customer edit load failed:', error);
    return;
  }
  if (!baseService) return;

  const section = document.createElement('div');
  section.style.cssText = 'margin:0 0 16px;padding:14px;border:1px solid #dbeafe;border-radius:14px;background:#f8fbff;color:#0f172a;';
  section.innerHTML = `
    <div style="font-size:14px;font-weight:900;margin-bottom:4px">👤 Data Pelanggan</div>
    <div style="font-size:11.5px;line-height:1.45;color:#64748b;margin-bottom:10px">Perbaiki nama atau nomor di sini. Riwayat servis pelanggan yang sama akan ikut disinkronkan agar tidak bertumpuk.</div>
    <label style="display:block;font-size:12px;font-weight:800;margin-bottom:4px">Nama pelanggan</label>
    <input data-customer-edit="name" class="input-field" style="width:100%;margin-bottom:9px;background:#fff" />
    <label style="display:block;font-size:12px;font-weight:800;margin-bottom:4px">Nomor WhatsApp</label>
    <input data-customer-edit="phone" type="tel" inputmode="tel" class="input-field" style="width:100%;margin-bottom:10px;background:#fff" />
    <button data-customer-edit="save" type="button" class="btn" style="width:100%;background:#0ea5e9;color:#fff;font-weight:900">Simpan Data Pelanggan</button>
  `;

  const resiLine = [...form.querySelectorAll('p')].find((node) => /Resi/i.test(node.textContent || ''));
  if (resiLine) resiLine.insertAdjacentElement('afterend', section);
  else heading.parentElement?.insertAdjacentElement('afterend', section);

  const nameInput = section.querySelector('[data-customer-edit="name"]');
  const phoneInput = section.querySelector('[data-customer-edit="phone"]');
  const saveButton = section.querySelector('[data-customer-edit="save"]');
  nameInput.value = baseService.customer_name || '';
  phoneInput.value = localPhone(baseService.customer_phone || '');

  saveButton.addEventListener('click', async () => {
    const original = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.textContent = 'Menyimpan...';
    try {
      const updatedCount = await updateCustomerHistory({
        baseService,
        newName: nameInput.value,
        newPhone: phoneInput.value,
      });
      window.alert(`Data pelanggan berhasil diperbarui pada ${updatedCount} riwayat servis.\n\nNama dan nomor sekarang memakai satu data yang sama.`);
      window.location.reload();
    } catch (error) {
      window.alert(error?.message || 'Gagal memperbarui data pelanggan.');
      saveButton.disabled = false;
      saveButton.textContent = original;
    }
  });
};

if (typeof window !== 'undefined' && !window.__UNITPRO_CUSTOMER_DATA_ENHANCER__) {
  window.__UNITPRO_CUSTOMER_DATA_ENHANCER__ = true;

  const scan = () => {
    document.querySelectorAll('form.service-registration-form').forEach((form) => {
      enhanceAdminRegistration(form).catch((error) => console.warn('Customer form enhancement failed:', error));
    });
    document.querySelectorAll('.modal-backdrop form').forEach((form) => {
      enhanceEditNota(form).catch((error) => console.warn('Customer edit enhancement failed:', error));
    });
  };

  const observer = new MutationObserver(scan);
  const start = () => {
    observer.observe(document.documentElement, { childList: true, subtree: true });
    scan();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
