import { apiService } from './api';
import { useStore } from '../store/useStore';
import {
  allocateServiceDiscount,
  isPaidServiceStatus,
  transactionMatchesServiceResi,
} from '../utils/financeUtils';

const ENHANCER_FLAG = '__UNITPRO_TEAM_FINANCE_SYNC_V1__';
const COMMISSION_TYPE = 'OUT_KOMISI';
const BACKFILL_VERSION = '1.2.14';

const normalizeTenantCode = (value = '') => String(value || '').trim().toUpperCase();
const normalizeEmployeeId = (value = '') => String(value ?? '').trim();
const sanitizeRate = (value) => Math.max(0, Math.min(100, Number(value) || 0));

const parseServiceDiscount = (issue = '') => {
  const match = String(issue || '').match(/\[Diskon:\s*Rp\s*([^\]]+)\]/i);
  return match ? Number(String(match[1] || '').replace(/\D/g, '')) || 0 : 0;
};

const commissionEmployeeMarker = (employeeId) => `EMP:${normalizeEmployeeId(employeeId)}`;

const isCommissionTransactionForService = (transaction, serviceResi, employeeId) => (
  String(transaction?.type || '').toUpperCase() === COMMISSION_TYPE
  && transactionMatchesServiceResi(transaction?.description, serviceResi)
  && String(transaction?.description || '').includes(commissionEmployeeMarker(employeeId))
);

const getFreshTenantSettings = async (tenantCode) => {
  const code = normalizeTenantCode(tenantCode);
  if (!code || code === 'DEMO-STORE') return null;

  const tenantData = await apiService.getTenantPublic(code);
  if (!tenantData) return null;

  const state = useStore.getState();
  const nextSettings = tenantData.settings || {};

  if (normalizeTenantCode(state.tenant?.code) === code) {
    state.updateTenantSettings(nextSettings);
  } else {
    state.setTenant(
      tenantData.code || code,
      tenantData.name || code,
      '',
      tenantData.tier || state.tenant?.tier || 'free',
      state.tenant?.token || null,
      null,
      nextSettings,
    );
  }

  return tenantData;
};

const buildCommissionTransaction = ({ tenantCode, service, settings, users = [], isBackfill = false }) => {
  const employeeId = normalizeEmployeeId(service?.technician_id);
  if (!employeeId || !service?.resi) return null;

  const rate = sanitizeRate(settings?.employee_commissions?.[employeeId]);
  if (rate <= 0) return null;

  const discount = parseServiceDiscount(service?.issue);
  const { jasaAfterDiscount } = allocateServiceDiscount(
    service?.part_fee,
    service?.jasa_fee,
    discount,
  );
  const amount = Math.floor(jasaAfterDiscount * (rate / 100));
  if (amount <= 0) return null;

  const employee = users.find((user) => normalizeEmployeeId(user?.id) === employeeId);
  const employeeName = String(employee?.name || '').trim();
  const employeeLabel = employeeName ? ` ${employeeName}` : '';
  const syncLabel = isBackfill ? ' | Sinkron awal v1.2.14' : '';

  return {
    tenant_code: tenantCode,
    type: COMMISSION_TYPE,
    amount,
    description: `Komisi Teknisi${employeeLabel} | ${commissionEmployeeMarker(employeeId)} | Resi ${service.resi} | ${rate}% dari jasa bersih Rp ${jasaAfterDiscount.toLocaleString('id-ID')}${syncLabel}`,
    created_at: service?.updated_at || service?.created_at || new Date().toISOString(),
    idempotency_key: `KOMISI_${tenantCode}_${service.resi}_${employeeId}`,
  };
};

const ensureCommissionTransaction = async ({
  tenantCode,
  service,
  settings,
  users = [],
  transactions = null,
  isBackfill = false,
}) => {
  if (!service || !isPaidServiceStatus(service.status)) return null;

  const row = buildCommissionTransaction({ tenantCode, service, settings, users, isBackfill });
  if (!row) return null;

  const existingTransactions = transactions || await apiService.getTransactions(tenantCode);
  const alreadyExists = existingTransactions.some((transaction) => (
    isCommissionTransactionForService(transaction, service.resi, service.technician_id)
  ));
  if (alreadyExists) return null;

  const created = await apiService.post('/transactions', row);
  if (Array.isArray(transactions) && created) transactions.push(created);
  return created;
};

const backfillCommissionLedger = async (tenantCode, tenantData = null) => {
  const code = normalizeTenantCode(tenantCode);
  if (!code || code === 'DEMO-STORE') return;

  const storageKey = `UNITPRO_COMMISSION_BACKFILL_${BACKFILL_VERSION}_${code}`;
  if (window.localStorage.getItem(storageKey) === '1') return;

  const [services, transactions, users, freshTenant] = await Promise.all([
    apiService.getServices(code),
    apiService.getTransactions(code),
    apiService.getUsers(code),
    tenantData ? Promise.resolve(tenantData) : apiService.getTenantPublic(code),
  ]);

  const settings = freshTenant?.settings || useStore.getState().tenant?.settings || {};
  const paidServices = (services || []).filter((service) => isPaidServiceStatus(service?.status));

  for (const service of paidServices) {
    await ensureCommissionTransaction({
      tenantCode: code,
      service,
      settings,
      users,
      transactions,
      isBackfill: true,
    });
  }

  window.localStorage.setItem(storageKey, '1');
};

if (typeof window !== 'undefined' && !window[ENHANCER_FLAG]) {
  window[ENHANCER_FLAG] = true;

  const originalLoginEmployee = apiService.loginEmployee.bind(apiService);
  apiService.loginEmployee = async (tenantCode, pin) => {
    const result = await originalLoginEmployee(tenantCode, pin);
    const code = normalizeTenantCode(result?.user?.tenant_code || tenantCode);

    try {
      const tenantData = await getFreshTenantSettings(code);
      window.setTimeout(() => {
        backfillCommissionLedger(code, tenantData).catch((error) => {
          console.warn('Team commission backfill warning:', error);
        });
      }, 0);
    } catch (error) {
      console.warn('Employee tenant settings sync warning:', error);
    }

    return result;
  };

  const originalSettleServicePickup = apiService.settleServicePickup.bind(apiService);
  apiService.settleServicePickup = async (payload) => {
    const result = await originalSettleServicePickup(payload);

    try {
      const code = normalizeTenantCode(payload?.tenant_code || result?.service?.tenant_code);
      if (code && code !== 'DEMO-STORE' && result?.service) {
        const [tenantData, users, transactions] = await Promise.all([
          apiService.getTenantPublic(code),
          apiService.getUsers(code),
          apiService.getTransactions(code),
        ]);
        const settings = tenantData?.settings || useStore.getState().tenant?.settings || {};
        await ensureCommissionTransaction({
          tenantCode: code,
          service: result.service,
          settings,
          users,
          transactions,
          isBackfill: false,
        });
      }
    } catch (error) {
      // Pembayaran/ambil barang tidak boleh gagal hanya karena pencatatan komisi bermasalah.
      console.warn('Commission ledger sync warning:', error);
    }

    return result;
  };

  let lastSessionMarker = '';
  const syncActiveSession = () => {
    const state = useStore.getState();
    const code = normalizeTenantCode(state.employee?.tenant_code || state.tenant?.code);
    if (!code || code === 'DEMO-STORE') return;

    const sessionMarker = `${code}:${normalizeEmployeeId(state.employee?.id) || 'ADMIN'}`;
    if (sessionMarker === lastSessionMarker) return;
    lastSessionMarker = sessionMarker;

    getFreshTenantSettings(code)
      .then((tenantData) => backfillCommissionLedger(code, tenantData))
      .catch((error) => {
        console.warn('Team finance session sync warning:', error);
        lastSessionMarker = '';
      });
  };

  useStore.subscribe(syncActiveSession);
  Promise.resolve().then(syncActiveSession);
}
