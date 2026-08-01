import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { apiService } from '../services/api';
import { Store, LogIn, Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [tenantCode, setTenantCode] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const setTenant = useStore(state => state.setTenant);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const code = tenantCode.toUpperCase().trim();
    if (!code || !pin) {
      setError('Kode dan PIN wajib diisi');
      return;
    }
    
    try {
      const data = await apiService.loginTenant(code, tenantName || 'Toko ' + code, pin);
      // data contains: code, name, tier, settings, token
      setTenant(data.code, data.name, '', data.tier, data.token);
      useStore.getState().updateTenantSettings(typeof data.settings === 'string' ? JSON.parse(data.settings) : data.settings);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Gagal masuk ke sistem. Pastikan backend menyala.');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <Store size={48} color="var(--accent)" style={{ marginBottom: '1rem' }} />
        <h2 style={{ marginBottom: '0.5rem' }}>SaaS ERP & POS</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Masukkan kode toko Anda</p>
        
        {error && <div style={{ color: 'white', background: 'var(--danger)', padding: '10px', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="label">Kode Toko / Tenant ID</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Cth: DEMO-TOKO" 
              value={tenantCode}
              onChange={(e) => setTenantCode(e.target.value)}
              required 
              style={{ textTransform: 'uppercase' }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="label">PIN Rahasia</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="Masukkan PIN" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            <LogIn size={18} /> Verifikasi
          </button>
        </form>

        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
           <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Fitur Publik</p>
           <button onClick={() => navigate('/tracking')} className="btn btn-ghost" style={{ width: '100%', marginBottom: '10px' }}>
              <Search size={18} /> Lacak Servis
           </button>
        </div>
      </div>
    </div>
  );
}
