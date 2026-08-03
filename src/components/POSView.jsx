import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Package, Trash, Printer, X, ShoppingCart } from 'lucide-react';
import { apiService } from '../services/api';

export default function POSView({ products }) {
  const { tenant, cart, addToCart, removeFromCart, clearCart } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const printIframeRef = useRef(null);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const receiptData = {
      items: [...cart],
      total: total,
      date: new Date().toLocaleString('id-ID'),
      transactionId: 'POS-' + Date.now()
    };

    try {
      // 1. Create Transaction
      await apiService.post('/transactions', {
        tenant_code: tenant.code,
        type: 'POS_SALES',
        amount: total,
        description: `POS: ${cart.length} brg (${receiptData.transactionId})`
      });

      // 2. Reduce Stock
      for (const item of cart) {
        const newStock = Math.max(0, item.stock - item.qty);
        // Fire and forget stock updates to make it fast
        apiService.updateProduct(item.id, { 
          name: item.name, 
          price: item.price, 
          stock: newStock 
        }).catch(err => console.error('Failed to update stock', err));
      }

      setLastReceipt(receiptData);
      clearCart();
      setShowPrintModal(true);
      
    } catch (e) {
      alert('Gagal memproses transaksi');
    }
  };

  const doPrint = (printerType) => {
    if (!lastReceipt) return;
    const doc = printIframeRef.current.contentDocument || printIframeRef.current.contentWindow.document;
    doc.open();
    
    let itemsHtml = lastReceipt.items.map(item => `
      <tr>
        <td style="padding-bottom:5px;">${item.name}<br/><small>${item.qty}x @Rp ${item.price.toLocaleString('id-ID')}</small></td>
        <td style="text-align: right; vertical-align: top;">Rp ${(item.price * item.qty).toLocaleString('id-ID')}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <div style="font-family: monospace; padding: 10px; max-width: ${printerType === 'thermal' ? '300px' : '100%'}; margin: auto;">
        <h2 style="text-align: center; margin-bottom: 5px;">${tenant?.name || 'Toko'}</h2>
        <p style="text-align: center; margin: 0 0 15px 0;">STRUK PEMBELIAN</p>
        <hr style="border-top: 1px dashed black;"/>
        <p><strong>ID:</strong> ${lastReceipt.transactionId}</p>
        <p><strong>Tgl:</strong> ${lastReceipt.date}</p>
        <hr style="border-top: 1px dashed black;"/>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
          ${itemsHtml}
          <tr><td colspan="2"><hr style="border-top: 1px dashed black; margin: 5px 0;"/></td></tr>
          <tr>
            <td><strong>TOTAL LUNAS</strong></td>
            <td style="text-align: right;"><strong>Rp ${lastReceipt.total.toLocaleString('id-ID')}</strong></td>
          </tr>
        </table>
        <hr style="border-top: 1px dashed black; margin-top: 15px;"/>
        ${tenant?.settings?.store_bank ? `<p style="font-size: 0.8rem; text-align: center; margin: 10px 0;"><strong>INFO REKENING:</strong><br/>${tenant.settings.store_bank.replace(/\\n/g, '<br/>')}</p><hr style="border-top: 1px dashed black; margin: 15px 0;"/>` : ''}
        <p style="font-size: 0.8rem; text-align: center;">Terima kasih telah berbelanja!</p>
        <p style="font-size: 0.8rem; text-align: center;">Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</p>
      </div>
    `;
    
    doc.write(`<html><head><title>Print Struk</title></head><body onload="window.print(); window.close();">${htmlContent}</body></html>`);
    doc.close();
    setShowPrintModal(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
      <div>
        <input type="text" className="input-field" placeholder="Cari barang..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ marginBottom: '1rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
          {filteredProducts.map(p => (
            <div key={p.id} className="glass-panel" style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', border: p.stock <= 0 ? '1px solid #ef4444' : 'none', opacity: p.stock <= 0 ? 0.6 : 1 }} onClick={() => {
              if (p.stock <= 0) { alert('Stok Habis!'); return; }
              addToCart(p);
            }}>
              <div style={{ height: '80px', background: 'rgba(255,255,255,0.5)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                <Package size={32} color="var(--primary)" />
              </div>
              <h4 style={{ margin: '0 0 5px 0', fontSize: '0.9rem' }}>{p.name}</h4>
              <p style={{ margin: 0, color: 'var(--accent)', fontWeight: 'bold' }}>Rp {p.price.toLocaleString('id-ID')}</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: p.stock <= 0 ? '#ef4444' : 'var(--text-muted)' }}>Stok: {p.stock}</p>
            </div>
          ))}
          {filteredProducts.length === 0 && <p>Belum ada produk. Tambahkan di Master Barang.</p>}
        </div>
      </div>
      
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><ShoppingCart size={20}/> Keranjang</h3>
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

      {/* Hidden iframe for printing */}
      <iframe ref={printIframeRef} style={{ display: 'none' }} title="Receipt Printer" />

      {/* Print Modal */}
      {showPrintModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '350px', background: 'var(--bg-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Pembayaran Berhasil!</h3>
              <button className="btn btn-ghost" onClick={() => setShowPrintModal(false)}><X size={20}/></button>
            </div>
            <p style={{ fontSize: '0.9rem', marginBottom: '20px' }}>Pilih jenis printer untuk mencetak Struk Pembelian:</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => doPrint('thermal')}>
                <Printer size={16} style={{ display: 'inline', marginRight: '5px' }} /> Thermal
              </button>
              <button className="btn btn-ghost" style={{ flex: 1, border: '1px solid var(--border-light)' }} onClick={() => doPrint('a4')}>
                <Printer size={16} style={{ display: 'inline', marginRight: '5px' }} /> Kertas A4
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
