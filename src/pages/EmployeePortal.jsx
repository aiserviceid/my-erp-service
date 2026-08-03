import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { LogIn, CheckCircle, Clock, LogOut } from 'lucide-react';
import { apiService } from '../services/api';
import POSView from '../components/POSView';

export default function EmployeePortal() {
  const { tenant, employee, setEmployee, setTenant } = useStore();
  const navigate = useNavigate();
  
  const [tenantCode, setTenantCode] = useState(tenant?.code || '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (employee && employee.role === 'Teknisi') {
      fetchServices();
    }
    if (employee && employee.role === 'Kasir') {
      const code = tenant?.code || employee.tenant_code;
      if (code) {
        apiService.getProducts(code).then(setProducts);
      }
    }
  }, [employee, tenant?.code]);

  const fetchServices = async () => {
    try {
      const code = tenant?.code || employee?.tenant_code;
      if (!code) return;
      const data = await apiService.get(`/services/${code}`);
      setServices(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!tenantCode) {
      setError('Kode Toko wajib diisi');
      return;
    }
    try {
      const code = tenantCode.toUpperCase();
      const data = await apiService.loginEmployee(code, pin);
      // data contains token and user
      const empData = { ...data.user, token: data.token };
      setEmployee(empData);
      
      if (!tenant?.code || tenant.code !== code) {
        setTenant(code, empData.tenant_code || code, '', 'free', data.token);
      }
    } catch (e) {
      setError(e.message || 'PIN Salah atau terjadi kesalahan');
    }
  };

  const handleSelesaikan = async (resi) => {
    const partFee = prompt('Masukkan total biaya Part/Sparepart (Rp):', '0');
    const jasaFee = prompt('Masukkan total biaya Jasa (Rp):', '0');
    if (partFee === null || jasaFee === null) return;
    
    try {
      await apiService.post(`/services/finish`, {
        resi,
        status: 'SELESAI',
        part_fee: parseInt(partFee),
        jasa_fee: parseInt(jasaFee)
      });
      alert('Servis ditandai Selesai!');
      fetchServices();
    } catch (e) {
      alert('Gagal mengupdate servis');
    }
  };

  if (!employee) {
    return (
      <div className="login-container animate-fade-in" style={{ padding: '2rem' }}>
        <div className="glass-panel" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
          <h2>Portal Karyawan</h2>
          <p>{tenant?.name || 'Masuk sebagai Karyawan'}</p>
          {error && <div style={{ color: 'white', background: 'var(--danger)', padding: '10px', borderRadius: '8px', marginTop: '1rem' }}>{error}</div>}
          <form onSubmit={handleLogin} style={{ marginTop: '2rem' }}>
            {!tenant?.code && (
              <input 
                type="text" 
                className="input-field" 
                placeholder="Masukkan Kode Toko" 
                value={tenantCode}
                onChange={(e) => { setTenantCode(e.target.value.toUpperCase()); setError(''); }}
                style={{ textAlign: 'center', fontSize: '1.2rem', marginBottom: '1rem', letterSpacing: '0.1rem' }}
                required
              />
            )}
            <input 
              type="password" 
              className="input-field" 
              placeholder="Masukkan PIN Anda" 
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(''); }}
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              <LogIn size={18} /> Masuk
            </button>
          </form>
          <button className="btn btn-ghost" style={{ marginTop: '1rem', width: '100%' }} onClick={() => navigate('/')}>
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Halo, {employee.name} <span className="badge badge-warning">{employee.role}</span></h2>
        <button className="btn btn-danger" onClick={() => {
          useStore.getState().clearEmployee();
        }}><LogOut size={16} /> Keluar</button>
      </div>

      {employee.role === 'Kasir' ? (
        <POSView products={products} />
      ) : (
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem' }}>Daftar Tugas Servis</h3>
          
          {services.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada antrian servis.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {services.map(s => (
                <div key={s.resi} style={{ padding: '1rem', border: '1px solid var(--border-light)', borderRadius: '8px', background: 'rgba(255,255,255,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{s.device_name}</div>
                    <div style={{ fontSize: '0.9rem' }}>Keluhan: {s.issue}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>Resi: {s.resi} | Pelanggan: {s.customer_name}</div>
                  </div>
                  <div>
                    {s.status === 'PROSES' ? (
                      <button className="btn btn-accent" onClick={() => handleSelesaikan(s.resi)}>
                        <CheckCircle size={16} /> Tandai Selesai
                      </button>
                    ) : (
                      <span className="badge badge-success"><CheckCircle size={14} /> Selesai</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
