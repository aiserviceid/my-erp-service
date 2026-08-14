import { supabase } from './supabase';
import { normalizeCustomerName, normalizeCustomerPhone } from '../utils/customerDirectory';

const getTenantCode = () => String(localStorage.getItem('TENANT_CODE') || '').trim();
const nameKey = (value = '') => normalizeCustomerName(value).toLocaleLowerCase('id-ID');
const finalStatuses = new Set(['DIAMBIL', 'DI AMBIL', 'SUDAH DIAMBIL', 'LUNAS', 'BATAL', 'DIBATALKAN']);

const extractResi = (form) => {
  const text = form?.textContent || '';
  return text.match(/(?:Resi\s*:?\s*)?(TRX-[A-Z0-9_-]+)/i)?.[1]?.toUpperCase() || '';
};

const isSameCustomer = (service, base) => {
  const basePhone = normalizeCustomerPhone(base?.customer_phone);
  const servicePhone = normalizeCustomerPhone(service?.customer_phone);
  if (basePhone && servicePhone === basePhone) return true;

  const baseName = nameKey(base?.customer_name);
  const serviceName = nameKey(service?.customer_name);
  if (!baseName || baseName !== serviceName) return false;

  // Nama sama hanya digabung bila nomor tidak bertentangan.
  return !basePhone || !servicePhone || servicePhone === basePhone;
};

const deleteCustomerFromDirectory = async (baseService) => {
  const tenantCode = getTenantCode() || baseService?.tenant_code || '';
  if (!tenantCode || !baseService?.resi) throw new Error('Data pelanggan tidak dapat dikenali.');

  const { data, error } = await supabase
    .from('services')
    .select('resi,tenant_code,customer_name,customer_phone,status')
    .eq('tenant_code', tenantCode);
  if (error) throw error;

  const related = (data || []).filter((service) => isSameCustomer(service, baseService));
  if (!related.length) throw new Error('Riwayat pelanggan tidak ditemukan.');

  const active = related.filter((service) => !finalStatuses.has(String(service.status || '').trim().toUpperCase()));
  if (active.length) {
    const sample = active.slice(0, 3).map((service) => `${service.resi} (${service.status || 'aktif'})`).join(', ');
    throw new Error(`Pelanggan masih memiliki ${active.length} servis yang belum benar-benar selesai/diambil: ${sample}.\n\nUntuk keamanan, selesaikan atau batalkan servis aktif terlebih dahulu. Gunakan Edit Pelanggan bila tujuannya hanya menggabungkan data ganda.`);
  }

  const label = normalizeCustomerName(baseService.customer_name) || 'pelanggan ini';
  const confirmed = window.confirm(
    `Hapus ${label} dari daftar pelanggan?\n\n${related.length} riwayat servis TIDAK akan dihapus. Nama dan nomor WhatsApp akan dikosongkan pada riwayat tersebut sehingga pelanggan tidak lagi muncul di database pencarian.\n\nTindakan ini tidak dapat dibatalkan otomatis.`,
  );
  if (!confirmed) return { cancelled: true };

  const resis = related.map((service) => service.resi).filter(Boolean);
  const { error: updateError } = await supabase
    .from('services')
    .update({ customer_name: '', customer_phone: '' })
    .eq('tenant_code', tenantCode)
    .in('resi', resis);
  if (updateError) throw updateError;

  return { cancelled: false, count: resis.length };
};

const enhanceEditCustomerModal = async (form) => {
  if (!form || form.dataset.customerDeleteReady === '1') return;
  const nameInput = form.querySelector('[data-customer-edit="name"]');
  const saveButton = form.querySelector('[data-customer-edit="save"]');
  if (!nameInput || !saveButton) return;

  const resi = extractResi(form);
  if (!resi) return;
  form.dataset.customerDeleteReady = '1';

  const tenantCode = getTenantCode();
  const { data: baseService, error } = await supabase
    .from('services')
    .select('resi,tenant_code,customer_name,customer_phone,status')
    .eq('tenant_code', tenantCode)
    .eq('resi', resi)
    .maybeSingle();
  if (error || !baseService) return;

  const divider = document.createElement('div');
  divider.style.cssText = 'margin-top:14px;padding-top:14px;border-top:1px solid #fecaca;';
  divider.innerHTML = `
    <button type="button" data-customer-delete="button" class="btn" style="width:100%;background:#fff1f2;color:#be123c;border:1px solid #fecdd3;font-weight:900">🗑 Hapus Pelanggan</button>
    <div style="font-size:11px;line-height:1.45;color:#64748b;margin-top:7px">Riwayat servis tetap disimpan. Hanya identitas pelanggan yang dihapus dari daftar pencarian. Servis yang masih aktif tidak dapat dihapus.</div>
  `;
  saveButton.parentElement?.appendChild(divider);

  const deleteButton = divider.querySelector('[data-customer-delete="button"]');
  deleteButton?.addEventListener('click', async () => {
    const original = deleteButton.textContent;
    deleteButton.disabled = true;
    deleteButton.textContent = 'Menghapus...';
    try {
      const result = await deleteCustomerFromDirectory(baseService);
      if (result.cancelled) {
        deleteButton.disabled = false;
        deleteButton.textContent = original;
        return;
      }
      window.alert(`Pelanggan berhasil dihapus dari daftar.\n\n${result.count} riwayat servis tetap tersimpan tanpa nama dan nomor WhatsApp.`);
      window.location.reload();
    } catch (err) {
      window.alert(err?.message || 'Gagal menghapus pelanggan.');
      deleteButton.disabled = false;
      deleteButton.textContent = original;
    }
  });
};

const addDeleteShortcuts = () => {
  const editButtons = [...document.querySelectorAll('button')].filter((button) => /Edit Pelanggan/i.test(button.textContent || ''));
  editButtons.forEach((editButton) => {
    if (editButton.dataset.customerDeleteShortcutReady === '1') return;
    const parent = editButton.parentElement;
    if (!parent) return;
    editButton.dataset.customerDeleteShortcutReady = '1';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = editButton.className || 'btn btn-ghost';
    deleteButton.textContent = '🗑 Hapus Pelanggan';
    deleteButton.style.color = '#be123c';
    deleteButton.style.fontWeight = '800';
    deleteButton.addEventListener('click', () => {
      editButton.click();
      const focusDelete = (attempt = 0) => {
        const target = document.querySelector('[data-customer-delete="button"]');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.focus();
          return;
        }
        if (attempt < 10) setTimeout(() => focusDelete(attempt + 1), 120);
      };
      setTimeout(() => focusDelete(), 80);
    });
    parent.insertBefore(deleteButton, editButton.nextSibling);
  });
};

if (typeof window !== 'undefined' && !window.__UNITPRO_CUSTOMER_DELETE_ENHANCER__) {
  window.__UNITPRO_CUSTOMER_DELETE_ENHANCER__ = true;
  const scan = () => {
    document.querySelectorAll('.modal-backdrop form').forEach((form) => {
      enhanceEditCustomerModal(form).catch((error) => console.warn('Customer delete enhancer failed:', error));
    });
    addDeleteShortcuts();
  };
  const observer = new MutationObserver(scan);
  const start = () => {
    observer.observe(document.documentElement, { childList: true, subtree: true });
    scan();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
