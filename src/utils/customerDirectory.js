export const normalizeCustomerName = (value) => String(value || '').trim().replace(/\s+/g, ' ');

export const normalizeCustomerPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
};

const normalizedNameKey = (value) => normalizeCustomerName(value).toLocaleLowerCase('id-ID');

export const buildCustomerDirectory = (services = []) => {
  const sorted = [...services].sort(
    (a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0),
  );

  // Nama yang hanya pernah memakai satu nomor diperlakukan sebagai pelanggan
  // yang sama. Bila satu nama punya beberapa nomor berbeda, nomor tetap menjadi
  // identitas utama agar dua orang dengan nama sama tidak ikut tergabung.
  const phonesByName = new Map();
  sorted.forEach((service) => {
    const nameKey = normalizedNameKey(service.customer_name);
    const phone = normalizeCustomerPhone(service.customer_phone);
    if (!nameKey || !phone) return;
    if (!phonesByName.has(nameKey)) phonesByName.set(nameKey, new Set());
    phonesByName.get(nameKey).add(phone);
  });

  const customers = new Map();
  sorted.forEach((service) => {
    const name = normalizeCustomerName(service.customer_name);
    const nameKey = normalizedNameKey(name);
    const phone = normalizeCustomerPhone(service.customer_phone);
    if (!name && !phone) return;

    const knownPhones = nameKey ? [...(phonesByName.get(nameKey) || [])] : [];
    const inferredPhone = !phone && knownPhones.length === 1 ? knownPhones[0] : '';
    const canonicalPhone = phone || inferredPhone;
    const key = canonicalPhone ? `phone:${canonicalPhone}` : `name:${nameKey}`;

    const existing = customers.get(key);
    if (existing) {
      existing.serviceCount += 1;
      if (name) existing.aliases.add(name);
      if (!existing.phone && canonicalPhone) existing.phone = canonicalPhone;
      if (!existing.name && name) existing.name = name;
      return;
    }

    customers.set(key, {
      key,
      name: name || 'Pelanggan',
      normalizedName: nameKey,
      phone: canonicalPhone,
      serviceCount: 1,
      lastServiceAt: service.updated_at || service.created_at || '',
      aliases: new Set(name ? [name] : []),
    });
  });

  return [...customers.values()].map((customer) => {
    const aliases = [...customer.aliases];
    const localPhone = customer.phone.replace(/^62/, '0');
    return {
      ...customer,
      aliases,
      searchText: `${aliases.join(' ')} ${customer.name} ${customer.phone} ${localPhone}`.toLocaleLowerCase('id-ID'),
    };
  });
};

export const findCustomerSuggestions = (customers, query, limit = 5) => {
  const normalizedQuery = String(query || '').trim().toLocaleLowerCase('id-ID');
  const digitQuery = normalizedQuery.replace(/\D/g, '').replace(/^0/, '62');
  if (normalizedQuery.length < 2 && digitQuery.length < 3) return [];

  return customers
    .filter((customer) => customer.searchText.includes(normalizedQuery) || (digitQuery && customer.phone.includes(digitQuery)))
    .slice(0, limit);
};
