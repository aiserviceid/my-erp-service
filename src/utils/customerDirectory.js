const normalizeName = (value) => String(value || '').trim().replace(/\s+/g, ' ');

export const normalizeCustomerPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
};

export const buildCustomerDirectory = (services = []) => {
  const customers = new Map();

  [...services]
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .forEach((service) => {
      const name = normalizeName(service.customer_name);
      const phone = normalizeCustomerPhone(service.customer_phone);
      if (!name && !phone) return;

      const key = phone ? `phone:${phone}` : `name:${name.toLocaleLowerCase('id-ID')}`;
      const existing = customers.get(key);
      if (existing) {
        existing.serviceCount += 1;
        return;
      }

      customers.set(key, {
        key,
        name: name || 'Pelanggan',
        phone,
        serviceCount: 1,
        lastServiceAt: service.updated_at || service.created_at || '',
        searchText: `${name} ${phone} ${phone.replace(/^62/, '0')}`.toLocaleLowerCase('id-ID'),
      });
    });

  return [...customers.values()];
};

export const findCustomerSuggestions = (customers, query, limit = 5) => {
  const normalizedQuery = String(query || '').trim().toLocaleLowerCase('id-ID');
  const digitQuery = normalizedQuery.replace(/\D/g, '').replace(/^0/, '62');
  if (normalizedQuery.length < 2 && digitQuery.length < 3) return [];

  return customers
    .filter((customer) => customer.searchText.includes(normalizedQuery) || (digitQuery && customer.phone.includes(digitQuery)))
    .slice(0, limit);
};
