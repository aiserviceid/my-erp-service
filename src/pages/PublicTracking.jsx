import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { apiService } from '../services/api';

export default function PublicTracking() {
  const navigate = useNavigate();
  const tenant = useStore((state) => state.tenant);
  const settings = tenant?.settings || { storeName: 'AI SERVICE' };
  const tier = tenant?.tier || 'free';

  const [resi, setResi] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!resi) return;
    
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await apiService.trackService(resi);
      setResult(data);
    } catch (e) {
      setError('Nomor Resi tidak ditemukan atau terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
      {/* HEADER */}
      <header style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
        <h2 style={{ margin: 0, color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate('/')}>
          {settings.storeName}
        </h2>
        <button onClick={() => navigate('/')} className="btn btn-ghost">Kembali</button>
      </header>

      <main style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="glass-panel animate-slide-in" style={{ width: '100%', maxWidth: '600px', textAlign: 'center' }}>
          <Package size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ marginBottom: '0.5rem' }}>Lacak Status Servis</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Masukkan nomor resi yang Anda dapatkan saat menyerahkan barang.</p>
          
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Contoh: SRV-001" 
              value={resi}
              onChange={(e) => setResi(e.target.value.toUpperCase())}
              style={{ flex: 1, fontSize: '1.2rem', textAlign: 'center', letterSpacing: '2px' }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0 2rem' }} disabled={loading}>
              {loading ? 'Mencari...' : <Search size={20} />}
            </button>
          </form>

          {error && (
            <div style={{ marginTop: '2rem', padding: '1rem', background: '#fee2e2', color: '#ef4444', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <AlertTriangle size={20} /> {error}
            </div>
          )}

          {result && (
            <div className="animate-fade-in" style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.8)', border: '1px solid var(--border-light)', borderRadius: '12px', textAlign: 'left' }}>
              <h3 style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Resi: <span style={{ color: 'var(--primary)' }}>{result.resi}</span></h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pelanggan</div>
                  <div style={{ fontWeight: 'bold' }}>{result.customer_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Perangkat</div>
                  <div style={{ fontWeight: 'bold' }}>{result.device_name}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Keluhan</div>
                  <div>{result.issue}</div>
                </div>
              </div>

              <div style={{ background: result.status === 'SELESAI' ? '#dcfce7' : '#fef9c3', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {result.status === 'SELESAI' ? <CheckCircle color="#16a34a" /> : <Clock color="#ca8a04" />}
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: result.status === 'SELESAI' ? '#16a34a' : '#ca8a04' }}>
                    Status: {result.status}
                  </div>
                  {result.status === 'SELESAI' && (
                    <div style={{ fontSize: '0.8rem', marginTop: '5px' }}>
                      Silakan ambil perangkat Anda di toko. Total Biaya: Rp {(result.jasa_fee + result.part_fee).toLocaleString('id-ID')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer style={{ padding: '2rem', textAlign: 'center', background: 'var(--primary)', color: 'white' }}>
        <p style={{ margin: 0, opacity: 0.8 }}>&copy; {new Date().getFullYear()} {settings.storeName}. All rights reserved.</p>
        
        {tier === 'free' && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <p style={{ fontSize: '0.85rem', color: '#fbbf24', margin: 0 }}>
              ⚡ Powered by <strong>AI SERVICE</strong> - Buat Aplikasi Tokomu Sekarang!
            </p>
          </div>
        )}
      </footer>
    </div>
  );
}
