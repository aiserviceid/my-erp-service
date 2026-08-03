import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Package, Trash, Printer, X, ShoppingCart, Camera } from 'lucide-react';
import { apiService } from '../services/api';
import BarcodeScanner from './BarcodeScanner';

export default function POSView({ products }) {
  const { tenant, cart, addToCart, removeFromCart, clearCart } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const printIframeRef = useRef(null);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleScan = (decodedText) => {
    const product = products.find(p => p.id === decodedText || p.name.toLowerCase().includes(decodedText.toLowerCase()));
    if (product) {
      if (product.stock <= 0) { alert('Stok Habis!'); return; }
      addToCart(product);
      // Optional: beep sound
    } else {
      alert('Produk tidak ditemukan untuk barcode: ' + decodedText);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const finalTotal = Math.max(0, total - discount);

    const receiptData = {
      items: [...cart],
      subtotal: total,
      discount: discount,
      total: finalTotal,
      date: new Date().toLocaleString('id-ID'),
      transactionId: 'POS-' + Date.now()
    };

    try {
      // 1. Create Transaction
      await apiService.post('/transactions', {
        tenant_code: tenant.code,
        type: 'POS_SALES',
        amount: finalTotal,
        description: `POS: ${cart.length} brg (${receiptData.transactionId}) - Diskon Rp${discount}`
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
      setDiscount(0);
      setShowPrintModal(true);
      
    } catch (e) {
      alert('Gagal memproses transaksi');
    }
  };

  const doPrint = (printerType) => {
    if (!lastReceipt) return;
    const doc = printIframeRef.current.contentDocument || printIframeRef.current.contentWindow.document;
    doc.open();
    
    const css = `
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: ${printerType === 'thermal' ? '0' : '20px'}; }
        .receipt-container { max-width: ${printerType === 'thermal' ? '300px' : '800px'}; margin: 0 auto; background: #fff; border: ${printerType === 'thermal' ? 'none' : '1px solid #e2e8f0'}; padding: ${printerType === 'thermal' ? '10px' : '40px'}; border-radius: 12px; box-shadow: ${printerType === 'thermal' ? 'none' : '0 10px 25px rgba(0,0,0,0.05)'}; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h2 { margin: 0; color: #0f172a; font-size: ${printerType === 'thermal' ? '1.4rem' : '2rem'}; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
        .header p { margin: 5px 0 0; color: #64748b; font-size: ${printerType === 'thermal' ? '0.8rem' : '1rem'}; font-weight: 600; letter-spacing: 2px; }
        .divider { border-top: 2px dashed #cbd5e1; margin: 15px 0; }
        .info-grid { display: flex; flex-direction: column; gap: 8px; font-size: ${printerType === 'thermal' ? '0.85rem' : '0.95rem'}; margin-bottom: 20px; }
        .info-item { margin: 0; display: flex; justify-content: space-between; }
        .info-item strong { color: #64748b; font-weight: 600; }
        .info-item span { color: #0f172a; font-weight: 500; text-align: right; max-width: 60%; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: ${printerType === 'thermal' ? '0.85rem' : '0.95rem'}; }
        .table th { border-bottom: 2px solid #cbd5e1; padding: 8px 0; text-align: left; color: #64748b; font-weight: 600; }
        .table td { padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .text-right { text-align: right; }
        .total-row td { font-weight: 800; font-size: ${printerType === 'thermal' ? '1rem' : '1.2rem'}; color: #0f172a; border-bottom: none; padding-top: 15px; }
        .footer { text-align: center; margin-top: 30px; font-size: 0.85rem; color: #94a3b8; }
        .bank-info { background: #f8fafc; padding: 12px; border-radius: 8px; text-align: center; font-size: 0.85rem; margin: 20px 0; border: 1px solid #e2e8f0; color: #475569; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .receipt-container { border: none; padding: ${printerType === 'thermal' ? '0' : '10px'}; box-shadow: none; } }
      </style>
    `;
    
    const htmlContent = `
      <div class="receipt-container">
        <div class="header">
          <h2>${tenant?.name || 'Toko'}</h2>
          <p>STRUK PEMBELIAN</p>
        </div>
        <div class="divider"></div>
        <div class="info-grid">
          <div class="info-item"><strong>ID Trx</strong> <span>${lastReceipt.transactionId}</span></div>
          <div class="info-item"><strong>Tanggal</strong> <span>${lastReceipt.date}</span></div>
        </div>
        
        <table class="table">
          <thead>
            <tr><th>Item Barang</th><th class="text-right">Harga (Rp)</th></tr>
          </thead>
          <tbody>
            ${lastReceipt.items.map(item => `
              <tr>
                <td>${item.name}<br/><span style="color: #64748b; font-size: 0.85em;">${item.qty}x @ ${(item.price).toLocaleString('id-ID')}</span></td>
                <td class="text-right">${(item.price * item.qty).toLocaleString('id-ID')}</td>
              </tr>
            `).join('')}
            ${lastReceipt.discount > 0 ? `
            <tr><td>Subtotal</td><td class="text-right">${lastReceipt.subtotal.toLocaleString('id-ID')}</td></tr>
            <tr><td style="color: #ef4444; font-weight: 600;">Diskon Khusus</td><td class="text-right" style="color: #ef4444; font-weight: 600;">- ${lastReceipt.discount.toLocaleString('id-ID')}</td></tr>
            ` : ''}
            <tr class="total-row"><td>TOTAL LUNAS</td><td class="text-right">${lastReceipt.total.toLocaleString('id-ID')}</td></tr>
          </tbody>
        </table>
        
        ${tenant?.settings?.store_bank ? `<div class="bank-info"><strong>INFO REKENING PEMBAYARAN:</strong><br/>${tenant.settings.store_bank.replace(/\n/g, '<br/>')}</div>` : ''}
        
        <div class="divider"></div>
        <div class="footer">
          <p style="margin: 0 0 5px 0; color: #0f172a; font-weight: 600;">Terima kasih telah berbelanja!</p>
          <p style="margin: 0;">Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</p>
        </div>
      </div>
    `;
    
    doc.write(`<html><head><title>Print Struk</title>${css}</head><body onload="window.print(); window.close();">${htmlContent}</body></html>`);
    doc.close();
    setShowPrintModal(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
      <div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
          <input type="text" className="input-field" placeholder="Cari barang atau scan barcode..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1 }} />
          <button className="btn" style={{ background: '#0284c7', color: 'white', display: 'flex', gap: '8px', alignItems: 'center' }} onClick={() => setShowScanner(true)}>
            <Camera size={18} /> Scan
          </button>
        </div>
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
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Diskon Pembelian (Rp)</label>
            <input type="number" className="input-field" style={{ width: '100%', marginTop: '4px' }} placeholder="0" value={discount || ''} onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontWeight: 'bold', fontSize: '1.2rem' }}>
            <span>Total Bayar</span>
            <span>Rp {Math.max(0, cart.reduce((sum, item) => sum + (item.price * item.qty), 0) - discount).toLocaleString('id-ID')}</span>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }} onClick={handleCheckout} disabled={cart.length === 0}>
            Bayar & Cetak Struk
          </button>
        </div>
      </div>

      {showScanner && (
        <BarcodeScanner 
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}

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
