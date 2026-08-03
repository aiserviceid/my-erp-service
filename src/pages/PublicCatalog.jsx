import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, Tag, CheckCircle } from 'lucide-react';
import { apiService } from '../services/api';

export default function PublicCatalog() {
  const { tenantCode } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch specific tenant using the code
        // Supabase mock fetch (since tenant settings might just exist in global state, 
        // we'll rely on our apiService mock for now, but usually it fetches by code).
        // For local mock:
        setTenant({ name: 'Katalog ' + tenantCode });
        const productData = await apiService.get(`/products/${tenantCode}`);
        setProducts(productData);
      } catch (err) {
        console.error('Failed to load catalog');
      } finally {
        setLoading(false);
      }
    };
    if (tenantCode) fetchData();
  }, [tenantCode]);

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Memuat Katalog...</div>;
  }

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <ShoppingBag /> {tenant?.name}
        </h2>
        <button onClick={() => navigate('/tracking')} className="btn btn-ghost" style={{ fontSize: '0.9rem' }}>Lacak Servis</button>
      </header>

      <main style={{ flex: 1, padding: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ marginBottom: '0.5rem', color: 'var(--text-dark)' }}>Katalog Etalase Barang</h1>
          <p style={{ color: 'var(--text-muted)' }}>Temukan sparepart dan aksesori terbaik di toko kami.</p>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Cari barang atau aksesori..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: '40px', borderRadius: '30px', border: '1px solid #cbd5e1' }}
              />
              <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Barang yang Anda cari belum tersedia.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
            {filteredProducts.map(p => (
              <div key={p.id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', transition: 'transform 0.2s' }} className="hover-scale">
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--primary-light)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <Tag size={20} />
                </div>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: 'var(--text-dark)' }}>{p.name}</h3>
                <h2 style={{ margin: '0 0 10px 0', color: 'var(--accent)', fontSize: '1.2rem' }}>Rp {p.price.toLocaleString('id-ID')}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: p.stock > 0 ? '#16a34a' : '#ef4444' }}>
                  <CheckCircle size={14} /> {p.stock > 0 ? `Stok Tersedia: ${p.stock}` : 'Stok Habis'}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer style={{ padding: '2rem', textAlign: 'center', background: 'var(--primary)', color: 'white' }}>
        <p style={{ margin: 0, opacity: 0.8 }}>&copy; {new Date().getFullYear()} {tenant?.name}. All rights reserved.</p>
      </footer>
    </div>
  );
}
