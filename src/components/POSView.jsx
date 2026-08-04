import React, { useState, useRef, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Package, Trash, Printer, X, ShoppingCart, Camera, Search, Minus, Plus, Receipt, CreditCard, Banknote, Smartphone, AlertTriangle, ChevronDown, Clock, CheckCircle } from 'lucide-react';
import { apiService } from '../services/api';
import BarcodeScanner from './BarcodeScanner';
import { PAYMENT_METHODS, isWithinLimit } from '../config/tierLimits';

export default function POSView({ products, transactions = [], onTransactionCreated }) {
  const { tenant, cart, addToCart, removeFromCart, clearCart, updateCartQty } = useStore();
  const [selectedCategory, setSelectedCategory] = useState('SEMUA');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('nominal'); // 'nominal' | 'percent'
  const [showScanner, setShowScanner] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('TUNAI');
  const [cashReceived, setCashReceived] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const printIframeRef = useRef(null);
  const searchRef = useRef(null);

  const tier = tenant?.tier || 'free';
  const settings = tenant?.settings || {};

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'SEMUA' || (p.category && p.category.toUpperCase() === selectedCategory.toUpperCase());
      if (!matchCat) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) || 
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q))
      );
    });
  }, [products, searchQuery, selectedCategory]);

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const discountAmount = discountType === 'percent' 
    ? Math.round(subtotal * (discount / 100)) 
    : discount;
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const cashReceivedNum = parseInt(cashReceived) || 0;
  const changeAmount = paymentMethod === 'TUNAI' ? Math.max(0, cashReceivedNum - grandTotal) : 0;

  // Today's sales summary
  const todaySales = useMemo(() => {
    const today = new Date().toDateString();
    const todayTxs = transactions.filter(t => 
      t.type === 'POS_SALES' && new Date(t.created_at).toDateString() === today
    );
    return {
      count: todayTxs.length,
      total: todayTxs.reduce((sum, t) => sum + (t.amount || 0), 0)
    };
  }, [transactions]);

  // Handle barcode scan
  const handleScan = (decodedText) => {
    const product = products.find(p => 
      p.id === decodedText || p.name.toLowerCase().includes(decodedText.toLowerCase())
    );
    if (product) {
      if (product.stock <= 0) { alert('Stok Habis!'); return; }
      addToCart(product);
      setShowScanner(false);
    } else {
      alert('Produk tidak ditemukan: ' + decodedText);
    }
  };

  // Handle checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'TUNAI' && cashReceivedNum < grandTotal) {
      alert('Uang yang diterima kurang dari total belanja!');
      return;
    }

    setCheckoutLoading(true);

    const receiptData = {
      items: [...cart],
      subtotal,
      discount: discountAmount,
      total: grandTotal,
      paymentMethod,
      cashReceived: paymentMethod === 'TUNAI' ? cashReceivedNum : grandTotal,
      change: changeAmount,
      date: new Date().toLocaleString('id-ID'),
      transactionId: 'POS-' + Date.now(),
      storeName: settings.storeName || tenant?.name || 'Toko'
    };

    try {
      // 1. Create transaction
      await apiService.post('/transactions', {
        tenant_code: tenant.code,
        type: 'POS_SALES',
        amount: grandTotal,
        description: `POS: ${cart.length} item (${receiptData.transactionId}) | Bayar: ${paymentMethod}${discountAmount > 0 ? ` | Diskon: Rp${discountAmount.toLocaleString('id-ID')}` : ''}`
      });

      // 2. Update stock for each item
      for (const item of cart) {
        const newStock = Math.max(0, item.stock - item.qty);
        apiService.updateProduct(item.id, {
          name: item.name,
          price: item.price,
          stock: newStock,
          cost_price: item.cost_price || 0
        }).catch(() => {});
      }

      // 3. Show receipt
      setLastReceipt(receiptData);
      clearCart();
      setDiscount(0);
      setCashReceived('');
      setShowCheckout(false);
      setShowReceipt(true);

      // Notify parent
      if (onTransactionCreated) onTransactionCreated();

      // Play success sound
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 800; gain.gain.value = 0.15;
        osc.start(); osc.stop(ctx.currentTime + 0.15);
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2); gain2.connect(ctx.destination);
          osc2.frequency.value = 1200; gain2.gain.value = 0.15;
          osc2.start(); osc2.stop(ctx.currentTime + 0.15);
        }, 150);
      } catch (e) {}

    } catch (err) {
      alert('Gagal menyimpan transaksi: ' + err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Print receipt
  const doPrintReceipt = (printerType) => {
    if (!lastReceipt) return;
    const doc = printIframeRef.current.contentDocument || printIframeRef.current.contentWindow.document;
    doc.open();
    const isThermal = printerType === 'thermal';
    const css = `
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: ${isThermal ? '8px' : '20px'}; }
        .receipt { max-width: ${isThermal ? '300px' : '600px'}; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 15px; border-bottom: 2px dashed #ccc; padding-bottom: 12px; }
        .header h2 { margin: 0; font-size: ${isThermal ? '1.2rem' : '1.6rem'}; font-weight: 900; text-transform: uppercase; }
        .header p { margin: 4px 0 0; color: #666; font-size: ${isThermal ? '0.75rem' : '0.9rem'}; }
        .meta { font-size: ${isThermal ? '0.8rem' : '0.9rem'}; margin-bottom: 12px; }
        .meta div { display: flex; justify-content: space-between; margin: 3px 0; }
        .items { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: ${isThermal ? '0.8rem' : '0.9rem'}; }
        .items th { text-align: left; padding: 6px 0; border-bottom: 1px solid #ddd; color: #666; font-weight: 600; }
        .items td { padding: 5px 0; border-bottom: 1px dotted #eee; }
        .items .right { text-align: right; }
        .total-section { border-top: 2px dashed #ccc; padding-top: 10px; font-size: ${isThermal ? '0.8rem' : '0.9rem'}; }
        .total-section div { display: flex; justify-content: space-between; margin: 4px 0; }
        .grand-total { font-size: ${isThermal ? '1.1rem' : '1.4rem'}; font-weight: 900; margin: 10px 0; padding: 8px 0; border-top: 2px solid #333; border-bottom: 2px solid #333; }
        .payment-info { background: #f5f5f5; padding: 8px; border-radius: 6px; margin: 10px 0; font-size: ${isThermal ? '0.8rem' : '0.9rem'}; }
        .footer { text-align: center; margin-top: 15px; font-size: 0.8rem; color: #999; }
        @media print { body { -webkit-print-color-adjust: exact; } }
      </style>
    `;

    const itemRows = lastReceipt.items.map(item => `
      <tr>
        <td>${item.name}</td>
        <td class="right">${item.qty}x</td>
        <td class="right">Rp ${(item.price * item.qty).toLocaleString('id-ID')}</td>
      </tr>
    `).join('');

    const payLabel = PAYMENT_METHODS.find(m => m.id === lastReceipt.paymentMethod)?.label || 'Tunai';

    const activeLogoUrl = settings?.logoUrl || '/favicon.svg';

    const html = `
      <div class="receipt">
        <div class="header">
          <img src="${activeLogoUrl}" alt="Logo" style="max-height: ${isThermal ? '40px' : '60px'}; margin-bottom: 8px;" />
          <h2>${lastReceipt.storeName}</h2>
          <p>STRUK PENJUALAN</p>
        </div>
        <div class="meta">
          <div><span>No. Transaksi</span><span>${lastReceipt.transactionId}</span></div>
          <div><span>Tanggal</span><span>${lastReceipt.date}</span></div>
        </div>
        <table class="items">
          <thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Total</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div class="total-section">
          <div><span>Subtotal</span><span>Rp ${lastReceipt.subtotal.toLocaleString('id-ID')}</span></div>
          ${lastReceipt.discount > 0 ? `<div><span style="color:#dc2626">Diskon</span><span style="color:#dc2626">- Rp ${lastReceipt.discount.toLocaleString('id-ID')}</span></div>` : ''}
          <div class="grand-total"><span>TOTAL</span><span>Rp ${lastReceipt.total.toLocaleString('id-ID')}</span></div>
          <div class="payment-info">
            <div><span>Bayar (${payLabel})</span><span>Rp ${lastReceipt.cashReceived.toLocaleString('id-ID')}</span></div>
            ${lastReceipt.paymentMethod === 'TUNAI' && lastReceipt.change > 0 ? `<div><span><strong>Kembalian</strong></span><span><strong>Rp ${lastReceipt.change.toLocaleString('id-ID')}</strong></span></div>` : ''}
          </div>
        </div>
        ${settings.store_bank ? `<div style="text-align:center;font-size:0.75rem;color:#666;margin:10px 0;padding:8px;border:1px solid #ddd;border-radius:6px">${settings.store_bank.replace(/\n/g, '<br/>')}</div>` : ''}
        <div class="footer">
          ${settings.receipt_note_pos ? `<p style="margin: 0 0 5px 0; color: #333; font-weight: 700;">${settings.receipt_note_pos.replace(/\n/g, '<br/>')}</p>` : `<p style="margin:0 0 4px; font-weight: bold;">Terima kasih atas pembelian Anda!</p>
          <p style="margin:0">Barang yang sudah dibeli tidak dapat dikembalikan.</p>`}
        </div>
      </div>
    `;

    doc.write(`<html><head><title>Struk</title>${css}</head><body onload="window.print(); window.close();">${html}</body></html>`);
    doc.close();
  };

  const paymentIcons = {
    TUNAI: <Banknote size={20} />,
    TRANSFER: <CreditCard size={20} />,
    QRIS: <Smartphone size={20} />,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', minHeight: 'calc(100vh - 200px)' }}>
      
      {/* ── TODAY'S SUMMARY BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderRadius: '12px', marginBottom: '16px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: 'white', flexWrap: 'wrap', gap: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingCart size={20} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Penjualan Hari Ini</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900' }}>Rp {todaySales.total.toLocaleString('id-ID')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>{todaySales.count}</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Transaksi</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>{cart.length}</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Keranjang</div>
          </div>
          <button onClick={() => setShowHistory(!showHistory)} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
            padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
            fontSize: '0.78rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px'
          }}>
            <Clock size={14} /> Riwayat
          </button>
        </div>
      </div>

      {/* ── SEARCH BAR ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            ref={searchRef}
            type="text"
            className="input-field"
            placeholder="Cari produk atau scan barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '40px', height: '48px', fontSize: '0.95rem' }}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); searchRef.current?.focus(); }} style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px'
            }}>
              <X size={16} />
            </button>
          )}
        </div>
        <button onClick={() => setShowScanner(true)} style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
          color: 'white', border: 'none', padding: '0 16px', borderRadius: '12px',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
          fontWeight: '700', fontSize: '0.85rem', minWidth: '48px', justifyContent: 'center',
        }}>
          <Camera size={20} />
          <span className="hide-mobile">Scan</span>
        </button>
      </div>

      {/* ── CATEGORY FILTER PILLS ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        {['SEMUA', 'SPAREPART', 'AKSESORIS', 'JASA', 'UNIT'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '6px 14px',
              borderRadius: '100px',
              border: selectedCategory === cat ? 'none' : '1px solid #cbd5e1',
              background: selectedCategory === cat ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)' : 'white',
              color: selectedCategory === cat ? 'white' : '#475569',
              fontWeight: '800',
              fontSize: '0.78rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: selectedCategory === cat ? '0 2px 8px rgba(2,132,199,0.3)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── PRODUCT GRID ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '10px',
        marginBottom: '16px',
        maxHeight: cart.length > 0 ? '300px' : '500px',
        overflowY: 'auto',
        paddingRight: '4px',
      }}>
        {filteredProducts.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            {searchQuery ? `Tidak ada produk "${searchQuery}"` : 'Belum ada produk. Tambahkan di Master Barang.'}
          </div>
        ) : filteredProducts.map(p => {
          const outOfStock = p.stock <= 0;
          const lowStock = p.stock > 0 && p.stock <= 5;
          const inCart = cart.find(c => c.id === p.id);

          return (
            <button
              key={p.id}
              disabled={outOfStock}
              onClick={() => {
                if (!outOfStock) addToCart(p);
              }}
              style={{
                background: inCart ? '#f0fdf4' : 'white',
                border: inCart ? '2px solid #86efac' : '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '14px 12px',
                cursor: outOfStock ? 'not-allowed' : 'pointer',
                opacity: outOfStock ? 0.5 : 1,
                transition: 'all 0.15s ease',
                textAlign: 'left',
                position: 'relative',
                minHeight: '100px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              {/* Stock indicator */}
              {outOfStock && (
                <div style={{
                  position: 'absolute', top: '8px', right: '8px',
                  background: '#ef4444', color: 'white', fontSize: '0.6rem',
                  padding: '2px 6px', borderRadius: '4px', fontWeight: '800',
                }}>HABIS</div>
              )}
              {lowStock && !outOfStock && (
                <div style={{
                  position: 'absolute', top: '8px', right: '8px',
                  background: '#f59e0b', color: 'white', fontSize: '0.6rem',
                  padding: '2px 6px', borderRadius: '4px', fontWeight: '800',
                }}>Sisa {p.stock}</div>
              )}
              {inCart && (
                <div style={{
                  position: 'absolute', top: '8px', left: '8px',
                  background: '#16a34a', color: 'white', fontSize: '0.7rem',
                  width: '22px', height: '22px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '900',
                }}>{inCart.qty}</div>
              )}

              {/* Product Image Thumbnail */}
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '75px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px', background: '#f8fafc' }} />
              ) : null}

              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', lineHeight: '1.3', marginBottom: '8px', marginTop: inCart ? '4px' : 0, wordBreak: 'break-word' }}>
                {p.name}
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: '900', color: '#0284c7' }}>
                  Rp {p.price.toLocaleString('id-ID')}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                  Stok: {p.stock}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── CART SECTION ── */}
      {cart.length > 0 && (
        <div style={{
          background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0',
          overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
        }}>
          {/* Cart Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '0.9rem', color: '#0f172a' }}>
              <ShoppingCart size={18} /> Keranjang ({cart.length} item)
            </div>
            <button onClick={clearCart} style={{
              background: '#fee2e2', border: 'none', color: '#dc2626', padding: '4px 10px',
              borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px'
            }}>
              <Trash size={12} /> Kosongkan
            </button>
          </div>

          {/* Cart Items */}
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {cart.map(item => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', borderBottom: '1px solid #f1f5f9',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Rp {item.price.toLocaleString('id-ID')} × {item.qty}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button onClick={() => {
                    if (item.qty <= 1) removeFromCart(item.id);
                    else if (updateCartQty) updateCartQty(item.id, item.qty - 1);
                    else removeFromCart(item.id);
                  }} style={{
                    width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #e2e8f0',
                    background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Minus size={14} color="#64748b" />
                  </button>
                  <span style={{ fontWeight: '800', fontSize: '0.9rem', minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                  <button onClick={() => {
                    if (item.qty < item.stock) {
                      if (updateCartQty) updateCartQty(item.id, item.qty + 1);
                      else addToCart(item);
                    }
                  }} style={{
                    width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #e2e8f0',
                    background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Plus size={14} color="#64748b" />
                  </button>
                  <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#0f172a', minWidth: '80px', textAlign: 'right' }}>
                    Rp {(item.price * item.qty).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Discount Row */}
          <div style={{ padding: '10px 16px', background: '#fefce8', borderTop: '1px solid #fef08a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#a16207', whiteSpace: 'nowrap' }}>Diskon:</span>
            <input
              type="number"
              placeholder="0"
              value={discount || ''}
              onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
              style={{
                flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #fde68a',
                fontSize: '0.85rem', fontWeight: '700', background: 'white', maxWidth: '120px',
                outline: 'none',
              }}
            />
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
              style={{
                padding: '6px 8px', borderRadius: '8px', border: '1px solid #fde68a',
                fontSize: '0.82rem', fontWeight: '700', background: 'white', outline: 'none',
              }}
            >
              <option value="nominal">Rp</option>
              <option value="percent">%</option>
            </select>
            {discountAmount > 0 && (
              <span style={{ fontSize: '0.82rem', color: '#dc2626', fontWeight: '700' }}>
                -Rp {discountAmount.toLocaleString('id-ID')}
              </span>
            )}
          </div>

          {/* Total & Checkout */}
          <div style={{
            padding: '16px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>TOTAL BAYAR</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#10b981' }}>
                Rp {grandTotal.toLocaleString('id-ID')}
              </div>
            </div>
            <button
              onClick={() => setShowCheckout(true)}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white', border: 'none', padding: '14px 28px', borderRadius: '14px',
                fontWeight: '900', fontSize: '1rem', cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(16,185,129,0.4)',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              <Receipt size={20} /> Bayar
            </button>
          </div>
        </div>
      )}

      {/* ── CHECKOUT MODAL ── */}
      {showCheckout && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 1000, padding: '0',
        }} onClick={(e) => { if (e.target === e.currentTarget) setShowCheckout(false); }}>
          <div style={{
            background: 'white', borderRadius: '24px 24px 0 0', padding: '24px',
            width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto',
            animation: 'slideUp 0.3s ease-out',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900' }}>Pembayaran</h3>
              <button onClick={() => setShowCheckout(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            {/* Total Display */}
            <div style={{
              textAlign: 'center', padding: '20px', borderRadius: '16px', marginBottom: '20px',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            }}>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>Total Pembayaran</div>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#10b981' }}>
                Rp {grandTotal.toLocaleString('id-ID')}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                {cart.length} item{discountAmount > 0 ? ` • Hemat Rp ${discountAmount.toLocaleString('id-ID')}` : ''}
              </div>
            </div>

            {/* Payment Method Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '10px', display: 'block' }}>
                Metode Pembayaran
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {PAYMENT_METHODS.map(method => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    style={{
                      background: paymentMethod === method.id ? method.color : 'white',
                      color: paymentMethod === method.id ? 'white' : '#334155',
                      border: paymentMethod === method.id ? 'none' : '1px solid #e2e8f0',
                      borderRadius: '12px', padding: '14px 10px', cursor: 'pointer',
                      fontWeight: '700', fontSize: '0.85rem', textAlign: 'center',
                      transition: 'all 0.15s',
                      boxShadow: paymentMethod === method.id ? `0 4px 12px ${method.color}40` : 'none',
                    }}
                  >
                    <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{method.icon}</div>
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Input (only for TUNAI) */}
            {paymentMethod === 'TUNAI' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '8px', display: 'block' }}>
                  Uang Diterima
                </label>
                <input
                  type="number"
                  placeholder={`Min. Rp ${grandTotal.toLocaleString('id-ID')}`}
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%', padding: '16px', borderRadius: '14px',
                    border: '2px solid #e2e8f0', fontSize: '1.3rem', fontWeight: '800',
                    textAlign: 'center', outline: 'none',
                    background: '#f8fafc',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0284c7'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
                {/* Quick amount buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {[grandTotal, Math.ceil(grandTotal / 10000) * 10000, Math.ceil(grandTotal / 50000) * 50000, 100000, 200000].filter((v, i, a) => v >= grandTotal && a.indexOf(v) === i).slice(0, 4).map(amount => (
                    <button
                      key={amount}
                      onClick={() => setCashReceived(String(amount))}
                      style={{
                        flex: '1 1 auto', padding: '8px 12px', borderRadius: '8px',
                        border: cashReceived === String(amount) ? '2px solid #0284c7' : '1px solid #e2e8f0',
                        background: cashReceived === String(amount) ? '#e0f2fe' : 'white',
                        fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', color: '#0f172a',
                      }}
                    >
                      {amount === grandTotal ? 'Uang Pas' : `Rp ${(amount/1000).toLocaleString('id-ID')}rb`}
                    </button>
                  ))}
                </div>

                {/* Change Display */}
                {cashReceivedNum >= grandTotal && cashReceivedNum > 0 && (
                  <div style={{
                    marginTop: '16px', padding: '16px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)',
                    border: '2px solid #86efac', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.82rem', color: '#166534', fontWeight: '600', marginBottom: '4px' }}>
                      💵 Kembalian
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: '#16a34a' }}>
                      Rp {changeAmount.toLocaleString('id-ID')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {paymentMethod !== 'TUNAI' && (
              <div style={{
                padding: '16px', borderRadius: '14px', marginBottom: '20px',
                background: '#f0f9ff', border: '1px solid #bae6fd', textAlign: 'center',
              }}>
                <div style={{ fontSize: '0.85rem', color: '#0369a1', fontWeight: '600' }}>
                  {paymentMethod === 'TRANSFER' ? '🏦 Pastikan pembayaran transfer sudah diterima' : '📱 Scan QRIS dan pastikan pembayaran berhasil'}
                </div>
              </div>
            )}

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading || (paymentMethod === 'TUNAI' && cashReceivedNum < grandTotal)}
              style={{
                width: '100%', padding: '16px', borderRadius: '14px',
                background: (paymentMethod === 'TUNAI' && cashReceivedNum < grandTotal) 
                  ? '#cbd5e1' 
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white', border: 'none', fontWeight: '900', fontSize: '1.1rem',
                cursor: (paymentMethod === 'TUNAI' && cashReceivedNum < grandTotal) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 18px rgba(16,185,129,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              }}
            >
              {checkoutLoading ? '⏳ Memproses...' : (
                <>
                  <CheckCircle size={22} /> Konfirmasi Pembayaran
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── RECEIPT MODAL ── */}
      {showReceipt && lastReceipt && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem',
        }}>
          <div style={{
            background: 'white', borderRadius: '24px', padding: '28px 24px',
            width: '100%', maxWidth: '400px', textAlign: 'center',
            animation: 'fadeIn 0.3s ease-out',
          }}>
            {/* Success Animation */}
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle size={32} color="#16a34a" />
            </div>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: '900', color: '#16a34a' }}>
              Pembayaran Berhasil! 🎉
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 16px' }}>
              {lastReceipt.transactionId}
            </p>

            {/* Quick Summary */}
            <div style={{
              padding: '16px', borderRadius: '12px', background: '#f8fafc',
              border: '1px solid #e2e8f0', marginBottom: '16px', textAlign: 'left',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Total</span>
                <span style={{ fontWeight: '800', fontSize: '1rem' }}>Rp {lastReceipt.total.toLocaleString('id-ID')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Bayar ({PAYMENT_METHODS.find(m => m.id === lastReceipt.paymentMethod)?.label})</span>
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Rp {lastReceipt.cashReceived.toLocaleString('id-ID')}</span>
              </div>
              {lastReceipt.paymentMethod === 'TUNAI' && lastReceipt.change > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                  <span style={{ color: '#16a34a', fontSize: '0.9rem', fontWeight: '700' }}>Kembalian</span>
                  <span style={{ fontWeight: '900', fontSize: '1.1rem', color: '#16a34a' }}>Rp {lastReceipt.change.toLocaleString('id-ID')}</span>
                </div>
              )}
            </div>

            {/* Print Options */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <button onClick={() => doPrintReceipt('thermal')} style={{
                flex: 1, padding: '12px', borderRadius: '12px',
                background: '#0f172a', color: 'white', border: 'none',
                fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}>
                <Printer size={18} /> Cetak Thermal
              </button>
              <button onClick={() => doPrintReceipt('a4')} style={{
                flex: 1, padding: '12px', borderRadius: '12px',
                background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0',
                fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}>
                <Printer size={18} /> Cetak A4
              </button>
            </div>
            <button onClick={() => setShowReceipt(false)} style={{
              width: '100%', padding: '12px', borderRadius: '12px',
              background: 'none', border: 'none', color: '#64748b',
              fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
            }}>
              Selesai — Transaksi Baru
            </button>
          </div>
        </div>
      )}

      {/* ── HISTORY MODAL ── */}
      {showHistory && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 1000,
        }} onClick={(e) => { if (e.target === e.currentTarget) setShowHistory(false); }}>
          <div style={{
            background: 'white', borderRadius: '24px 24px 0 0', padding: '24px',
            width: '100%', maxWidth: '500px', maxHeight: '70vh', overflowY: 'auto',
            animation: 'slideUp 0.3s ease-out',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontWeight: '900' }}>📋 Riwayat Penjualan Hari Ini</h3>
              <button onClick={() => setShowHistory(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            
            {(() => {
              const today = new Date().toDateString();
              const todayTxs = transactions.filter(t => 
                t.type === 'POS_SALES' && new Date(t.created_at).toDateString() === today
              ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
              
              if (todayTxs.length === 0) {
                return <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 0' }}>Belum ada penjualan hari ini.</p>;
              }

              return todayTxs.map(tx => (
                <div key={tx.id} style={{
                  padding: '12px', borderRadius: '12px', background: '#f8fafc',
                  border: '1px solid #e2e8f0', marginBottom: '8px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#0f172a' }}>
                      {tx.description?.replace(/^POS: /, '').split('|')[0]?.trim() || 'Penjualan'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                      {new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div style={{ fontWeight: '800', color: '#16a34a', fontSize: '0.95rem' }}>
                    +Rp {tx.amount?.toLocaleString('id-ID')}
                  </div>
                </div>
              ));
            })()}

            <div style={{
              marginTop: '12px', padding: '14px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white',
            }}>
              <span style={{ fontWeight: '600' }}>Total Hari Ini</span>
              <span style={{ fontWeight: '900', fontSize: '1.2rem', color: '#10b981' }}>
                Rp {todaySales.total.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Hidden print iframe */}
      <iframe ref={printIframeRef} style={{ display: 'none' }} title="POS Receipt" />

      {/* CSS for slide-up animation */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}
