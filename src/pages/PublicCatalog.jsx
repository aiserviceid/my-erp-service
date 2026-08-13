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
        const tenantData = await apiService.getTenantPublic(tenantCode);
        setTenant(tenantData || { name: 'Katalog ' + tenantCode, settings: {} });
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
        <div style={{ display: 'flex', gap: '10px' }}>
          {tenant?.settings?.store_wa && (
            <button onClick={() => window.open(`https://wa.me/${tenant.settings.store_wa.replace(/\\D/g,'')}?text=Halo%20${encodeURIComponent(tenant.name)},%20saya%20ingin%20bertanya%20seputar%20produk%20di%20katalog.`, '_blank')} className="btn btn-primary" style={{ fontSize: '0.85rem', background: '#25D366' }}>Hubungi WA</button>
          )}
          <button onClick={() => navigate('/tracking')} className="btn btn-ghost" style={{ fontSize: '0.9rem' }}>Lacak Servis</button>
        </div>
      </header>

      <main style={{ flex: 1, padding: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
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

        {/* PROMO BANNERS TOKO */}
        {((tenant?.settings?.promoBanners || tenant?.settings?.ads || []).filter(b => b && b.title && b.isActive !== false).length > 0) && (
          <div style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔥 Promo & Penawaran Spesial Toko
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {(tenant?.settings?.promoBanners || tenant?.settings?.ads || []).filter(b => b && b.title && b.isActive !== false).map((banner, i) => (
                <div 
                  key={banner.id || i}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #1e40af 100%)',
                    borderRadius: '16px', padding: '1.2rem', color: 'white',
                    boxShadow: '0 8px 20px rgba(2, 132, 199, 0.2)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden'
                  }}
                >
                  {banner.imageUrl && (
                    <img src={banner.imageUrl} alt={banner.title} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '10px', marginBottom: '10px' }} />
                  )}
                  <div>
                    {banner.badge && <span style={{ background: '#fbbf24', color: '#78350f', padding: '2px 8px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: '900', textTransform: 'uppercase' }}>{banner.badge}</span>}
                    <h4 style={{ margin: '6px 0 4px 0', fontSize: '1.1rem', fontWeight: '900', color: '#ffffff' }}>{banner.title || 'Promo Spesial Servis'}</h4>
                    {banner.description && <p style={{ margin: '0 0 12px 0', fontSize: '0.82rem', color: '#e0f2fe', lineHeight: '1.4' }}>{banner.description}</p>}
                  </div>
                  {tenant?.settings?.store_wa && (
                    <button
                      onClick={() => {
                        const targetWa = (tenant.settings.store_wa || '').replace(/\D/g, '');
                        const msg = `Halo ${tenant.name}, saya tertarik dengan promo: ${banner.title || 'Promo Toko'}. Apakah masih berlaku?`;
                        window.open(`https://wa.me/${targetWa}?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      style={{ background: '#25D366', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer', alignSelf: 'flex-start' }}
                    >
                      💬 Klaim Promo via WA →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: p.stock > 0 ? '#16a34a' : '#ef4444' }}>
                    <CheckCircle size={14} /> {p.stock > 0 ? `Stok: ${p.stock}` : 'Habis'}
                  </div>
                  {p.stock > 0 && tenant?.settings?.store_wa && (
                    <button 
                      onClick={() => window.open(`https://wa.me/${tenant.settings.store_wa.replace(/\\D/g,'')}?text=Halo%20${encodeURIComponent(tenant.name)},%20saya%20ingin%20membeli%20${encodeURIComponent(p.name)}%20(Rp%20${p.price.toLocaleString('id-ID')}).%20Apakah%20stoknya%20masih%20ada?`, '_blank')} 
                      className="btn" 
                      style={{ fontSize: '0.75rem', padding: '4px 8px', background: '#25D366', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Beli via WA
                    </button>
                  )}
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
