import { apiService } from './api';
import {
  buildCustomerDirectory,
  findCustomerSuggestions,
  normalizeCustomerName,
  normalizeCustomerPhone,
} from '../utils/customerDirectory';

const tenantCode = () => String(localStorage.getItem('TENANT_CODE') || '').trim();
const localPhone = (value = '') => {
  const phone = normalizeCustomerPhone(value);
  return phone.startsWith('62') ? `0${phone.slice(2)}` : phone;
};

const mergedSuggestions = (customers, nameValue, phoneValue) => {
  const nameQuery = normalizeCustomerName(nameValue);
  const phoneQuery = String(phoneValue || '').trim();
  const fromName = nameQuery.length >= 2 ? findCustomerSuggestions(customers, nameQuery, 8) : [];
  const fromPhone = phoneQuery.replace(/\D/g, '').length >= 3 ? findCustomerSuggestions(customers, phoneQuery, 8) : [];
  const byKey = new Map();
  [...fromName, ...fromPhone].forEach((customer) => {
    if (!byKey.has(customer.key)) byKey.set(customer.key, customer);
  });
  return [...byKey.values()].slice(0, 8);
};

const exactNameMatches = (customers, nameValue) => {
  const key = normalizeCustomerName(nameValue).toLocaleLowerCase('id-ID');
  if (!key) return [];
  return customers.filter((customer) => {
    const names = [customer.name, ...(customer.aliases || [])]
      .map((value) => normalizeCustomerName(value).toLocaleLowerCase('id-ID'));
    return names.includes(key);
  });
};

const applyCustomer = (form, customer) => {
  const nameInput = form.querySelector('input[name="name"]');
  const phoneInput = form.querySelector('input[name="phone"]');
  if (!nameInput || !phoneInput || !customer) return;
  nameInput.value = customer.name || '';
  phoneInput.value = localPhone(customer.phone || '');
  form.dataset.customerKey = customer.key || '';
  nameInput.dispatchEvent(new Event('input', { bubbles: true }));
  phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
};

const createPanel = () => {
  const panel = document.createElement('div');
  panel.className = 'service-registration-wide unitpro-customer-suggestions-v2';
  panel.style.cssText = [
    'display:none',
    'grid-column:1/-1',
    'border:1px solid #bae6fd',
    'background:#f0f9ff',
    'border-radius:14px',
    'padding:10px',
    'margin-top:-2px',
    'position:relative',
    'z-index:20',
  ].join(';');
  return panel;
};

const renderPanel = (form, panel, customers, loading = false, error = '') => {
  const nameInput = form.querySelector('input[name="name"]');
  const phoneInput = form.querySelector('input[name="phone"]');
  if (!nameInput || !phoneInput) return;

  const nameValue = String(nameInput.value || '').trim();
  const phoneValue = String(phoneInput.value || '').trim();
  const hasQuery = nameValue.length >= 2 || phoneValue.replace(/\D/g, '').length >= 3;
  if (!hasQuery) {
    panel.style.display = 'none';
    panel.innerHTML = '';
    return;
  }

  panel.style.display = 'block';
  if (loading) {
    panel.innerHTML = '<div style="font-size:12px;font-weight:800;color:#0369a1">Mencari pelanggan lama...</div>';
    return;
  }
  if (error) {
    panel.innerHTML = `<div style="font-size:12px;font-weight:800;color:#b45309">Data pelanggan belum dapat dimuat. ${error}</div>`;
    return;
  }

  const suggestions = mergedSuggestions(customers, nameValue, phoneValue);
  if (!suggestions.length) {
    panel.innerHTML = '<div style="font-size:12px;font-weight:800;color:#64748b">Belum ada pelanggan lama yang cocok dengan nama atau nomor ini.</div>';
    return;
  }

  panel.innerHTML = '<div style="font-size:12px;font-weight:900;color:#075985;margin-bottom:7px">Pelanggan lama ditemukan — pilih agar tidak membuat data ganda</div><div data-results style="display:grid;gap:6px"></div>';
  const list = panel.querySelector('[data-results]');
  suggestions.forEach((customer) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.style.cssText = 'width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;background:#fff;border:1px solid #dbeafe;border-radius:11px;padding:10px 11px;color:#0f172a;';
    button.innerHTML = `<span style="min-width:0"><strong style="display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${customer.name || 'Pelanggan'}</strong><span style="font-size:12px;color:#64748b">${localPhone(customer.phone) || 'Nomor belum tersedia'}</span></span><small style="color:#0369a1;font-weight:800;white-space:nowrap">${customer.serviceCount} servis</small>`;
    button.addEventListener('click', () => {
      applyCustomer(form, customer);
      panel.innerHTML = `<div style="font-size:12px;font-weight:900;color:#047857">✓ Pelanggan lama dipilih: ${customer.name} — ${localPhone(customer.phone) || 'tanpa nomor'}</div>`;
      panel.style.display = 'block';
    });
    list.appendChild(button);
  });
};

const enhanceRegistration = (form) => {
  if (!form || form.dataset.customerLookupV2Ready === '1') return;
  const nameInput = form.querySelector('input[name="name"]');
  const phoneInput = form.querySelector('input[name="phone"]');
  const grid = form.querySelector('.service-registration-form-grid');
  if (!nameInput || !phoneInput || !grid) return;

  form.dataset.customerLookupV2Ready = '1';
  // Mencegah enhancer versi lama menempelkan lookup kedua pada form yang sama.
  form.dataset.customerLookupReady = '1';
  form.querySelectorAll('.unitpro-customer-suggestions').forEach((node) => node.remove());

  const panel = createPanel();
  const phoneLabel = phoneInput.closest('label');
  if (phoneLabel) phoneLabel.insertAdjacentElement('afterend', panel);
  else grid.prepend(panel);

  let customers = [];
  let loaded = false;
  let loadError = '';
  let loadPromise = null;

  const load = async (force = false) => {
    if (loaded && !force) return;
    if (loadPromise && !force) return loadPromise;
    loadError = '';
    loadPromise = (async () => {
      const code = tenantCode();
      if (!code) throw new Error('Sesi toko tidak ditemukan.');
      const services = await apiService.getServices(code);
      customers = buildCustomerDirectory(Array.isArray(services) ? services : []);
      loaded = true;
      if (!customers.length) loadError = 'Belum ada riwayat servis pelanggan pada toko ini.';
    })().catch((error) => {
      loaded = true;
      loadError = error?.message || 'Gagal membaca database pelanggan.';
    }).finally(() => {
      loadPromise = null;
    });
    return loadPromise;
  };

  const refresh = async () => {
    const nameValue = String(nameInput.value || '');
    const phoneValue = String(phoneInput.value || '');
    const hasQuery = nameValue.trim().length >= 2 || phoneValue.replace(/\D/g, '').length >= 3;
    if (!hasQuery) {
      renderPanel(form, panel, customers);
      return;
    }
    if (!loaded) {
      renderPanel(form, panel, customers, true);
      await load();
    }
    renderPanel(form, panel, customers, false, loadError);

    // Jika nama sudah cocok tepat dan hanya ada satu pelanggan dengan nama itu,
    // tampilkan data lama tanpa memaksa nomor yang sedang diketik pengguna.
    const exactNames = exactNameMatches(customers, nameInput.value);
    if (exactNames.length === 1 && !String(phoneInput.value || '').trim() && exactNames[0].phone) {
      phoneInput.value = localPhone(exactNames[0].phone);
      form.dataset.customerKey = exactNames[0].key || '';
      renderPanel(form, panel, customers);
    }
  };

  ['input', 'focus'].forEach((eventName) => {
    nameInput.addEventListener(eventName, refresh);
    phoneInput.addEventListener(eventName, refresh);
  });

  form.addEventListener('submit', () => {
    const phone = normalizeCustomerPhone(phoneInput.value);
    const exactByPhone = customers.find((customer) => customer.phone && customer.phone === phone);
    if (exactByPhone) {
      applyCustomer(form, exactByPhone);
      return;
    }
    const exactNames = exactNameMatches(customers, nameInput.value);
    if (exactNames.length === 1 && exactNames[0].phone && !phone) applyCustomer(form, exactNames[0]);
  }, true);
};

const addDirectCustomerEditButtons = () => {
  const candidates = [...document.querySelectorAll('button')].filter((button) => /^\s*✏️?\s*Edit Nota\s*$/i.test(button.textContent || '') || /Edit Nota/i.test(button.textContent || ''));
  candidates.forEach((editNotaButton) => {
    if (editNotaButton.dataset.customerShortcutReady === '1') return;
    const parent = editNotaButton.parentElement;
    if (!parent) return;
    editNotaButton.dataset.customerShortcutReady = '1';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = editNotaButton.className || 'btn btn-ghost';
    button.textContent = '👤 Edit Pelanggan';
    button.style.color = '#0f766e';
    button.style.fontWeight = '800';
    button.addEventListener('click', () => {
      editNotaButton.click();
      const focusCustomer = (attempt = 0) => {
        const input = document.querySelector('[data-customer-edit="name"]');
        if (input) {
          const modal = input.closest('form');
          const heading = modal?.querySelector('h3');
          if (heading && /Edit Nota Servis/i.test(heading.textContent || '')) heading.textContent = 'Edit Data Pelanggan & Nota';
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          input.focus();
          return;
        }
        if (attempt < 8) setTimeout(() => focusCustomer(attempt + 1), 120);
      };
      setTimeout(() => focusCustomer(), 60);
    });
    parent.insertBefore(button, editNotaButton);
  });
};

if (typeof window !== 'undefined' && !window.__UNITPRO_ADMIN_CUSTOMER_LOOKUP_V2__) {
  window.__UNITPRO_ADMIN_CUSTOMER_LOOKUP_V2__ = true;
  const scan = () => {
    document.querySelectorAll('form.service-registration-form').forEach(enhanceRegistration);
    addDirectCustomerEditButtons();
  };
  const observer = new MutationObserver(scan);
  const start = () => {
    observer.observe(document.documentElement, { childList: true, subtree: true });
    scan();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
