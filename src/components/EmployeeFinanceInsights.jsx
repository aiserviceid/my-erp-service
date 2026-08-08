import React, { useMemo } from 'react';
import { isPaidServiceStatus } from '../utils/financeUtils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

const compactRupiah = (value = 0) => {
  const amount = Number(value || 0);
  if (amount >= 1000000) {
    const millions = amount / 1000000;
    return `Rp ${Number.isInteger(millions) ? millions : millions.toFixed(1).replace('.0', '')}jt`;
  }
  if (amount >= 1000) return `Rp ${Math.round(amount / 1000)}rb`;
  if (amount > 0) return `Rp ${Math.round(amount)}`;
  return 'Rp 0';
};

const fullRupiah = (value = 0) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

export default function EmployeeFinanceInsights({ services = [], employee, salary = 0, commissionRate = 0 }) {
  const completedServices = useMemo(() => services
    .filter((service) => String(service.technician_id) === String(employee?.id))
    .filter((service) => isPaidServiceStatus(service.status))
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)), [services, employee?.id]);

  const trendData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }).map((_, index) => {
      const month = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const monthServices = completedServices.filter((service) => {
        const created = new Date(service.created_at || 0);
        return created.getFullYear() === month.getFullYear() && created.getMonth() === month.getMonth();
      });
      const jasa = monthServices.reduce((sum, service) => sum + Number(service.jasa_fee || 0), 0);
      return {
        month: month.toLocaleDateString('id-ID', { month: 'short' }),
        Gaji: Number(salary || 0),
        Komisi: Math.floor(jasa * (Number(commissionRate || 0) / 100)),
      };
    });
  }, [completedServices, salary, commissionRate]);

  const hasTrend = trendData.some((row) => row.Gaji > 0 || row.Komisi > 0);

  return (
    <div className="employee-finance-insights">
      <div className="employee-finance-chart-card">
        <div className="employee-finance-heading">
          <div>
            <h4>Tren Gaji & Komisi 6 Bulan</h4>
            <p>Ringkasan pendapatan berdasarkan servis yang sudah lunas/diambil.</p>
          </div>
        </div>

        {hasTrend ? (
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.22)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={11} />
                <YAxis tickFormatter={compactRupiah} axisLine={false} tickLine={false} width={68} fontSize={11} tickCount={5} />
                <Tooltip formatter={(value, name) => [fullRupiah(value), name]} />
                <Legend />
                <Line type="monotone" dataKey="Gaji" stroke="#3B82F6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Komisi" stroke="#10B981" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="chart-empty-state chart-empty-state--small">
            <div className="chart-empty-icon" aria-hidden="true">📈</div>
            <strong>Belum ada data komisi</strong>
            <span>Tren akan muncul setelah servis pertama lunas/diambil.</span>
          </div>
        )}
      </div>

      <div className="employee-commission-history">
        <div className="employee-finance-heading">
          <div>
            <h4>Riwayat Komisi</h4>
            <p>10 servis lunas terbaru.</p>
          </div>
        </div>
        <div className="employee-commission-table-wrap">
          <table className="table employee-commission-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Resi</th>
                <th style={{ textAlign: 'right' }}>Jasa</th>
                <th style={{ textAlign: 'right' }}>Komisi</th>
              </tr>
            </thead>
            <tbody>
              {completedServices.slice(0, 10).map((service) => {
                const jasa = Number(service.jasa_fee || 0);
                const commission = Math.floor(jasa * (Number(commissionRate || 0) / 100));
                return (
                  <tr key={`${service.resi}-${service.created_at}`}>
                    <td>{service.created_at ? new Date(service.created_at).toLocaleDateString('id-ID') : '-'}</td>
                    <td><strong>{service.resi || '-'}</strong></td>
                    <td style={{ textAlign: 'right' }}>{fullRupiah(jasa)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: commission === 0 ? '#6B7280' : '#10B981' }}>{fullRupiah(commission)}</td>
                  </tr>
                );
              })}
              {completedServices.length === 0 && (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: '#6B7280', padding: '1.5rem' }}>Belum ada riwayat komisi.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
