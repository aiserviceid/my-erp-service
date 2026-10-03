import { transactionMatchesServiceResi } from './financeUtils.js';
// Prefer the latest matching income record: intake timestamps are not payment dates.
export function commissionPaidAt(service, transactions = []) {
  const dates = transactions.filter(row => (!row.tenant_code || row.tenant_code === service?.tenant_code)
    && ['INCOME', 'INCOME_JASA', 'INCOME_SPAREPART'].includes(String(row.type || '').toUpperCase())
    && transactionMatchesServiceResi(row.description, service?.resi))
    .map(row => Date.parse(row.created_at)).filter(Number.isFinite);
  if (dates.length) return new Date(Math.max(...dates)).toISOString();
  const explicit = Date.parse(service?.paid_at || service?.picked_up_at || '');
  return Number.isFinite(explicit) ? new Date(explicit).toISOString() : null;
}
