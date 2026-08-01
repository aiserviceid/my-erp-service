import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Package, Trash } from 'lucide-react';
import { apiService } from '../services/api';

export default function POSView({ products }) {
  const { tenant, cart, addToCart, removeFromCart, clearCart } = useStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    try {
      await apiService.post('/transactions', {
        tenant_code: tenant.code,
        type: 'INCOME',
        amount: total,
        description: `POS Checkout (${cart.length} items)`
      });
      alert('Transaksi Berhasil!');
      clearCart();
    } catch (e) {
      alert('Gagal memproses transaksi');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
      <div>
        <input type="text" className="input-field" placeholder="Cari barang..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ marginBottom: '1rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
          {filteredProducts.map(p => (
            <div key={p.id} className="glass-panel" style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => addToCart(p)}>
              <div style={{ height: '80px', background: 'rgba(255,255,255,0.5)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                <Package size={32} color="var(--primary)" />
              </div>
              <h4 style={{ margin: '0 0 5px 0', fontSize: '0.9rem' }}>{p.name}</h4>
              <p style={{ margin: 0, color: 'var(--accent)', fontWeight: 'bold' }}>Rp {p.price.toLocaleString('id-ID')}</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stok: {p.stock}</p>
            </div>
          ))}
          {filteredProducts.length === 0 && <p>Belum ada produk. Tambahkan di Master Barang.</p>}
        </div>
      </div>
      
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
        <h3 style={{ marginBottom: '1rem' }}>Keranjang</h3>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {cart.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid var(--border-light)' }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{item.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>Rp {item.price.toLocaleString('id-ID')} x {item.qty}</div>
              </div>
              <button onClick={() => removeFromCart(item.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                <Trash size={16} />
              </button>
            </div>
          ))}
          {cart.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>Keranjang kosong</p>}
        </div>
        
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontWeight: 'bold', fontSize: '1.2rem' }}>
            <span>Total</span>
            <span>Rp {cart.reduce((sum, item) => sum + (item.price * item.qty), 0).toLocaleString('id-ID')}</span>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }} onClick={handleCheckout} disabled={cart.length === 0}>
            Bayar Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}
