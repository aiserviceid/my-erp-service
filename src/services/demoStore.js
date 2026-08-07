const STORAGE_KEY = 'UNITPRO_DEMO_STORE_V1';
const now = Date.now();

const seed = () => ({
  products: [
    { id: 'PROD-001', tenant_code: 'DEMO-STORE', name: 'LCD iPhone 11 Original', price: 450000, stock: 12, category: 'SPAREPART', imageUrl: '' },
    { id: 'PROD-002', tenant_code: 'DEMO-STORE', name: 'Baterai MacBook Pro Retina 13', price: 650000, stock: 5, category: 'SPAREPART', imageUrl: '' },
    { id: 'PROD-003', tenant_code: 'DEMO-STORE', name: 'RAM DDR4 8GB Laptop', price: 320000, stock: 18, category: 'SPAREPART', imageUrl: '' },
    { id: 'PROD-004', tenant_code: 'DEMO-STORE', name: 'SSD NVMe 512GB Kingston', price: 580000, stock: 14, category: 'SPAREPART', imageUrl: '' },
    { id: 'PROD-005', tenant_code: 'DEMO-STORE', name: 'Jasa Cleaning & Thermal Paste', price: 150000, stock: 999, category: 'JASA', imageUrl: '' },
    { id: 'PROD-006', tenant_code: 'DEMO-STORE', name: 'Jasa Install Windows 11', price: 100000, stock: 999, category: 'JASA', imageUrl: '' },
  ],
  users: [
    { id: 'EMP-1', name: 'Andi (Teknisi Hardware)', role: 'TEKNISI', pin: '1234', phone: '081234567801', tenant_code: 'DEMO-STORE' },
    { id: 'EMP-2', name: 'Budi (Teknisi Software)', role: 'TEKNISI', pin: '5678', phone: '081234567802', tenant_code: 'DEMO-STORE' },
    { id: 'EMP-3', name: 'Citra (Kasir Demo)', role: 'KASIR', pin: '1111', phone: '081234567803', tenant_code: 'DEMO-STORE' },
  ],
  services: [
    { resi: 'TRX-1001', tenant_code: 'DEMO-STORE', customer_name: 'Hendra Saputra', customer_phone: '081234567890', device_name: 'Laptop ASUS ROG Strix', issue: 'Mati total terkena cairan kopi | Kelengkapan: Unit + charger', status: 'DIKERJAKAN', technician_id: 'EMP-1', part_fee: 0, jasa_fee: 0, created_at: new Date(now - 172800000).toISOString() },
    { resi: 'TRX-1002', tenant_code: 'DEMO-STORE', customer_name: 'Siti Rahma', customer_phone: '085712345678', device_name: 'MacBook Air M1 2020', issue: 'Layar blank hitam, suara nyala | Kelengkapan: Unit saja', status: 'DICEK', technician_id: 'EMP-2', part_fee: 0, jasa_fee: 0, created_at: new Date(now - 86400000).toISOString() },
    { resi: 'TRX-1003', tenant_code: 'DEMO-STORE', customer_name: 'Bambang Wijaya', customer_phone: '081987654321', device_name: 'Lenovo ThinkPad T480', issue: 'Upgrade SSD 512GB dan RAM 16GB | Kelengkapan: Unit + tas', status: 'SELESAI', technician_id: 'EMP-1', part_fee: 580000, jasa_fee: 150000, created_at: new Date(now - 43200000).toISOString() },
    { resi: 'TRX-1004', tenant_code: 'DEMO-STORE', customer_name: 'Dewi Lestari', customer_phone: '082133445566', device_name: 'Acer Nitro 5 AN515', issue: 'Kipas berisik dan panas | Kelengkapan: Unit + charger', status: 'DIAMBIL', technician_id: 'EMP-1', part_fee: 0, jasa_fee: 150000, created_at: new Date(now - 21600000).toISOString() },
  ],
  transactions: [
    { id: 'DEMO-TX-1', tenant_code: 'DEMO-STORE', type: 'INCOME_JASA', amount: 150000, description: 'Pelunasan jasa servis Resi TRX-1004', created_at: new Date(now - 18000000).toISOString() },
    { id: 'DEMO-TX-2', tenant_code: 'DEMO-STORE', type: 'POS_SALES', amount: 320000, description: 'Penjualan RAM DDR4 8GB Laptop', created_at: new Date(now - 14400000).toISOString() },
    { id: 'DEMO-TX-3', tenant_code: 'DEMO-STORE', type: 'EXPENSE', amount: 75000, description: 'Konsumsi teknisi dan kertas nota', created_at: new Date(now - 7200000).toISOString() },
  ],
});

const read = () => {
  if (typeof window === 'undefined') return seed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = seed();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return { ...seed(), ...JSON.parse(raw) };
  } catch (_) {
    return seed();
  }
};

const write = (data) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
};

const sortNewest = (items) => [...items].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

export const demoStore = {
  reset() { return write(seed()); },
  getProducts() { return sortNewest(read().products); },
  getUsers() { return read().users; },
  getServices() { return sortNewest(read().services); },
  getTransactions() { return sortNewest(read().transactions); },
  findService(resi) { return read().services.find((service) => String(service.resi).toUpperCase() === String(resi).toUpperCase()) || null; },
  addProduct(product) {
    const data = read();
    const next = { id: `PROD-${Date.now()}`, tenant_code: 'DEMO-STORE', stock: 0, category: 'SPAREPART', ...product };
    data.products = [next, ...data.products];
    write(data);
    return next;
  },
  updateProduct(id, product) {
    const data = read();
    data.products = data.products.map((item) => String(item.id) === String(id) ? { ...item, ...product, id: item.id, tenant_code: 'DEMO-STORE' } : item);
    write(data);
    return data.products.find((item) => String(item.id) === String(id)) || { id, ...product, tenant_code: 'DEMO-STORE' };
  },
  deleteProduct(id) {
    const data = read();
    data.products = data.products.filter((item) => String(item.id) !== String(id));
    write(data);
    return { success: true };
  },
  addService(service) {
    const data = read();
    const next = { tenant_code: 'DEMO-STORE', status: 'PROSES', part_fee: 0, jasa_fee: 0, created_at: new Date().toISOString(), ...service };
    data.services = [next, ...data.services.filter((item) => item.resi !== next.resi)];
    write(data);
    return next;
  },
  updateService(resi, updates) {
    const data = read();
    data.services = data.services.map((item) => item.resi === resi ? { ...item, ...updates, resi, tenant_code: 'DEMO-STORE' } : item);
    write(data);
    return data.services.find((item) => item.resi === resi) || { resi, tenant_code: 'DEMO-STORE', ...updates };
  },
  addTransaction(transaction) {
    const data = read();
    const next = { id: `DEMO-TX-${Date.now()}`, tenant_code: 'DEMO-STORE', created_at: new Date().toISOString(), ...transaction };
    data.transactions = [next, ...data.transactions];
    write(data);
    return next;
  },
  addUser(user) {
    const data = read();
    const next = { id: `EMP-${Date.now()}`, tenant_code: 'DEMO-STORE', ...user };
    data.users = [next, ...data.users];
    write(data);
    return next;
  },
};
