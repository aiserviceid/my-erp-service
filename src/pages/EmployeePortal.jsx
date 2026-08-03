import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { LogIn, CheckCircle, Clock, LogOut, Wallet, Plus, MessageSquare, Printer, X } from 'lucide-react';
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
  const [transactions, setTransactions] = useState([]);
  
  const [activeTab, setActiveTab] = useState('tugas');

  // Modals
  const [showSelesaiModal, setShowSelesaiModal] = useState(false);
  const [showPersetujuanModal, setShowPersetujuanModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [printType, setPrintType] = useState('pendaftaran');
  const printIframeRef = useRef(null);

  useEffect(() => {
    if (employee && (employee.role === 'TEKNISI' || employee?.role === 'Teknisi')) {
      fetchServices();
      fetchTransactions();
    }
    if (employee && (employee.role === 'KASIR' || employee.role === 'Kasir')) {
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

  const fetchTransactions = async () => {
    try {
      const code = tenant?.code || employee?.tenant_code;
      if (!code) return;
      const data = await apiService.get(`/transactions/${code}`);
      setTransactions(data);
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
      const empData = { ...data.user, token: data.token };
      setEmployee(empData);
      
      if (!tenant?.code || tenant.code !== code) {
        setTenant(code, empData.tenant_code || code, '', 'free', data.token);
      }
    } catch (e) {
      setError(e.message || 'PIN Salah atau terjadi kesalahan');
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const kelengkapan = fd.get('kelengkapan') || '-';
    const issueText = `${fd.get('issue')} | Kelengkapan: ${kelengkapan}`;
    const resiGenerated = 'TRX-' + Date.now();
    const serviceData = {
      tenant_code: employee.tenant_code || tenant.code,
      resi: resiGenerated,
      customer_name: fd.get('name'),
      customer_phone: fd.get('phone'),
      device_name: fd.get('device'),
      issue: issueText,
      technician_id: employee.id
    };
    try {
      await apiService.post('/services', serviceData);
      
      const waText = `Halo ${serviceData.customer_name}, perangkat ${serviceData.device_name} Anda sudah kami terima untuk diperbaiki.\n\n*Nomor Resi:* ${resiGenerated}\n*Keluhan:* ${fd.get('issue')}\n*Kelengkapan:* ${kelengkapan}\n\nAnda dapat mengecek status servis secara berkala dengan memasukkan nomor resi di web kami. Terima kasih!`;
      const waUrl = `https://wa.me/${serviceData.customer_phone.replace(/^0/, '62')}?text=${encodeURIComponent(waText)}`;
      
      if (confirm(`Servis berhasil ditambahkan (Resi: ${resiGenerated}).\n\nKlik OK untuk mengirim info resi ini ke WhatsApp pelanggan.`)) {
        window.open(waUrl, '_blank');
      }

      if (confirm(`Ingin mencetak Nota Pendaftaran untuk pelanggan?`)) {
        setSelectedService(serviceData);
        setPrintType('pendaftaran');
        setShowPrintModal(true);
      }
      
      e.target.reset();
      fetchServices();
    } catch (err) {
      alert('Gagal tambah tugas');
    }
  };

  const handleBon = async () => {
    const amountStr = prompt('Masukkan nominal Kasbon / Pinjaman (Rp):');
    if (!amountStr) return;
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) return alert('Nominal tidak valid');
    
    try {
      await apiService.post('/transactions', {
        tenant_code: employee.tenant_code || tenant.code,
        type: 'BON_PENDING',
        amount: amount,
        description: `EMP_${employee.id}`
      });
      alert('Kasbon berhasil dicatat!');
      fetchTransactions();
    } catch (e) {
      alert('Gagal mencatat kasbon');
    }
  };

  const doPrint = (printerType) => {
    if (!selectedService) return;
    const doc = printIframeRef.current.contentDocument || printIframeRef.current.contentWindow.document;
    doc.open();
    
    let htmlContent = '';
    const dateStr = new Date().toLocaleString('id-ID');
    
    if (printType === 'pendaftaran') {
      htmlContent = `
        <div style="font-family: monospace; padding: 10px; max-width: ${printerType === 'thermal' ? '300px' : '100%'}; margin: auto;">
          <h2 style="text-align: center; margin-bottom: 5px;">${tenant?.name || 'Toko Servis'}</h2>
          <p style="text-align: center; margin: 0 0 15px 0;">NOTA PENDAFTARAN SERVIS</p>
          <hr style="border-top: 1px dashed black;"/>
          <p><strong>Resi:</strong> ${selectedService.resi}</p>
          <p><strong>Tanggal:</strong> ${dateStr}</p>
          <p><strong>Pelanggan:</strong> ${selectedService.customer_name} (${selectedService.customer_phone})</p>
          <hr style="border-top: 1px dashed black;"/>
          <p><strong>Perangkat:</strong> ${selectedService.device_name}</p>
          <p><strong>Keluhan & Kelengkapan:</strong><br/>${selectedService.issue}</p>
          <hr style="border-top: 1px dashed black;"/>
          ${tenant?.settings?.store_bank ? `<p style="font-size: 0.8rem; text-align: center; margin: 10px 0;"><strong>INFO REKENING:</strong><br/>${tenant.settings.store_bank.replace(/\\n/g, '<br/>')}</p><hr style="border-top: 1px dashed black; margin: 15px 0;"/>` : ''}
          <p style="font-size: 0.8rem; text-align: center;">Simpan struk ini sebagai bukti pengambilan barang.</p>
          <p style="font-size: 0.8rem; text-align: center;">Cek status servis di web kami menggunakan No Resi.</p>
        </div>
      `;
    } else {
      const discountMatch = (selectedService.issue || '').match(/\[Diskon: Rp (.*?)\]/);
      const discountStr = discountMatch ? discountMatch[1].replace(/\./g, '') : '0';
      const discount = parseInt(discountStr) || 0;
      
      const subtotal = (selectedService.part_fee || 0) + (selectedService.jasa_fee || 0);
      const total = subtotal - discount;
      
      htmlContent = `
        <div style="font-family: monospace; padding: 10px; max-width: ${printerType === 'thermal' ? '300px' : '100%'}; margin: auto;">
          <h2 style="text-align: center; margin-bottom: 5px;">${tenant?.name || 'Toko Servis'}</h2>
          <p style="text-align: center; margin: 0 0 15px 0;">NOTA PENGAMBILAN (LUNAS)</p>
          <hr style="border-top: 1px dashed black;"/>
          <p><strong>Resi:</strong> ${selectedService.resi}</p>
          <p><strong>Tanggal:</strong> ${dateStr}</p>
          <p><strong>Pelanggan:</strong> ${selectedService.customer_name}</p>
          <hr style="border-top: 1px dashed black;"/>
          <p><strong>Perangkat:</strong> ${selectedService.device_name}</p>
          <p><strong>Rincian Perbaikan:</strong><br/>${(selectedService.issue || '').replace(/\n\[Diskon: .*?\]/, '')}</p>
          <br/>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td>Biaya Sparepart</td><td style="text-align: right;">Rp ${selectedService.part_fee?.toLocaleString('id-ID') || 0}</td></tr>
            <tr><td>Biaya Jasa</td><td style="text-align: right;">Rp ${selectedService.jasa_fee?.toLocaleString('id-ID') || 0}</td></tr>
            ${discount > 0 ? `
            <tr><td colspan="2"><hr style="border-top: 1px dashed black; margin: 5px 0;"/></td></tr>
            <tr><td>Subtotal</td><td style="text-align: right;">Rp ${subtotal.toLocaleString('id-ID')}</td></tr>
            <tr><td style="color: red;">Diskon</td><td style="text-align: right; color: red;">- Rp ${discount.toLocaleString('id-ID')}</td></tr>
            ` : ''}
            <tr><td colspan="2"><hr style="border-top: 1px dashed black; margin: 5px 0;"/></td></tr>
            <tr><td><strong>TOTAL LUNAS</strong></td><td style="text-align: right;"><strong>Rp ${total.toLocaleString('id-ID')}</strong></td></tr>
          </table>
          <hr style="border-top: 1px dashed black; margin-top: 15px;"/>
          ${tenant?.settings?.store_bank ? `<p style="font-size: 0.8rem; text-align: center; margin: 10px 0;"><strong>INFO REKENING:</strong><br/>${tenant.settings.store_bank.replace(/\\n/g, '<br/>')}</p><hr style="border-top: 1px dashed black; margin: 15px 0;"/>` : ''}
          <p style="font-size: 0.8rem; text-align: center;">Terima kasih atas kepercayaan Anda!</p>
          <p style="font-size: 0.8rem; text-align: center;">Barang yang sudah diambil tidak dapat dikembalikan.</p>
        </div>
      `;
    }
    
    doc.write(`<html><head><title>Print Nota</title></head><body onload="window.print(); window.close();">${htmlContent}</body></html>`);
    doc.close();
    setShowPrintModal(false);
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

  // calculations for finances
  const myCommissionRate = tenant?.settings?.employee_commissions?.[employee.id] || 0;
  const myCompletedServices = services.filter(s => (s.status === 'SELESAI' || s.status === 'DI AMBIL') && s.technician_id === employee.id);
  const totalJasaFee = myCompletedServices.reduce((sum, s) => sum + (s.jasa_fee || 0), 0);
  const totalKomisi = Math.floor(totalJasaFee * (myCommissionRate / 100));

  const myBonTransactions = transactions.filter(t => t.type === 'BON_KARYAWAN' && t.description === `EMP_${employee.id}`);
  const totalBon = myBonTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const sisaBersih = totalKomisi - totalBon;

  const isKasir = employee.role === 'Kasir' || employee.role === 'KASIR';

  const todayDateStr = new Date().toDateString();
  const myAttendanceToday = transactions.filter(t => t.description === `ATTENDANCE_EMP_${employee.id}` && new Date(t.created_at).toDateString() === todayDateStr);
  const hasCheckedIn = myAttendanceToday.some(t => t.type === 'ATTENDANCE_IN');
  const hasCheckedOut = myAttendanceToday.some(t => t.type === 'ATTENDANCE_OUT');

  const handleAttendance = async (type) => {
    try {
      await apiService.post('/transactions', {
        tenant_code: employee.tenant_code || tenant.code,
        type: type,
        amount: 0,
        description: `ATTENDANCE_EMP_${employee.id}`
      });
      alert(`Berhasil Absen ${type === 'ATTENDANCE_IN' ? 'Masuk' : 'Keluar'}!`);
      fetchTransactions();
    } catch(e) { alert('Gagal mencatat absensi'); }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: '0 0 10px 0' }}>Halo, {employee.name} <span className="badge badge-warning">{employee.role}</span></h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            {!hasCheckedIn ? (
              <button className="btn" style={{ background: '#059669', color: 'white', fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => handleAttendance('ATTENDANCE_IN')}>✅ Absen Masuk</button>
            ) : !hasCheckedOut ? (
              <button className="btn" style={{ background: '#ef4444', color: 'white', fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => handleAttendance('ATTENDANCE_OUT')}>👋 Absen Keluar</button>
            ) : (
              <span className="badge badge-success" style={{ fontSize: '0.8rem' }}>Absensi Hari Ini Selesai</span>
            )}
          </div>
        </div>
        <button className="btn btn-danger" onClick={() => {
          useStore.getState().clearEmployee();
        }}><LogOut size={16} /> Keluar</button>
      </div>

      {isKasir ? (
        <POSView products={products} />
      ) : (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
            <button className={`btn ${activeTab === 'tugas' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('tugas')}>
              Daftar Tugas
            </button>
            <button className={`btn ${activeTab === 'keuangan' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('keuangan')}>
              Keuangan Saya
            </button>
          </div>

          {activeTab === 'tugas' && (
            <>
              <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>+ Tambah Pelanggan / Servis</h3>
                <form onSubmit={handleAddService} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <input type="text" name="name" className="input-field" placeholder="Nama Pelanggan" required />
                  <input type="text" name="phone" className="input-field" placeholder="No. WA (08...)" required />
                  <input type="text" name="device" className="input-field" placeholder="Perangkat (Misal: Laptop ASUS)" required />
                  <input type="text" name="kelengkapan" className="input-field" placeholder="Kelengkapan (Misal: Tas, Charger)" required />
                  <div style={{ gridColumn: '1 / -1' }}>
                    <input type="text" name="issue" className="input-field" placeholder="Keluhan / Kerusakan" required />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                      <Plus size={18} /> Tambahkan ke Antrian & Kirim WA
                    </button>
                  </div>
                </form>
              </div>

              <div className="glass-panel">
                <h3 style={{ marginBottom: '1rem' }}>Daftar Tugas Servis</h3>
                {services.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada antrian servis.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {services.filter(s => s.technician_id === employee.id).length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Anda belum memiliki tugas servis aktif.</p>
                    ) : services.filter(s => s.technician_id === employee.id).map(s => (
                      <div key={s.resi} style={{ padding: '1rem', border: '1px solid var(--border-light)', borderRadius: '8px', background: 'rgba(255,255,255,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold' }}>{s.device_name}</div>
                          <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>Keluhan: {s.issue}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>Resi: {s.resi} | Pelanggan: {s.customer_name}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          {(s.status === 'PROSES' || s.status === 'MENUNGGU PART' || s.status === 'ANTRIAN') && (
                            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => {
                              setSelectedService(s);
                              setShowPersetujuanModal(true);
                            }}>
                              <MessageSquare size={14} style={{ marginRight: '5px', display: 'inline' }} /> WA Persetujuan
                            </button>
                          )}
                          
                          {s.status !== 'DI AMBIL' ? (
                            <select 
                              className="input-field" 
                              style={{ padding: '4px 8px', fontSize: '0.8rem', width: '140px', background: 'white' }}
                              value={s.status || 'PROSES'}
                              onChange={async (e) => {
                                const newStatus = e.target.value;
                                if (newStatus === 'SELESAI') {
                                  setSelectedService(s);
                                  setShowSelesaiModal(true);
                                } else if (newStatus === 'DI AMBIL') {
                                  if(confirm('Ubah status menjadi Di Ambil?\n\n(Pembayaran akan masuk otomatis ke Laporan Keuangan Toko)')) {
                                    try {
                                      let updatedIssue = s.issue;
                                      const warrantyDaysStr = prompt('Berapa HARI garansi untuk servis ini?\n\n(Isi angka saja, misal: 30. Kosongkan jika tidak ada garansi)', '30');
                                      let warrantyDateStr = '';
                                      if (warrantyDaysStr && parseInt(warrantyDaysStr) > 0) {
                                        const d = new Date();
                                        d.setDate(d.getDate() + parseInt(warrantyDaysStr));
                                        warrantyDateStr = d.toLocaleDateString('id-ID');
                                        updatedIssue += `\n[Masa Garansi Servis: s/d ${warrantyDateStr}]`;
                                      }

                                      // Update the status AND the appended warranty info
                                      await apiService.post('/services/finish', {
                                        resi: s.resi,
                                        status: newStatus,
                                        part_fee: s.part_fee,
                                        jasa_fee: s.jasa_fee,
                                        technician_id: s.technician_id,
                                        issue: updatedIssue
                                      });

                                      await apiService.post('/transactions', {
                                        tenant_code: employee.tenant_code || tenant.code,
                                        type: 'INCOME',
                                        amount: (s.part_fee || 0) + (s.jasa_fee || 0),
                                        description: `Pelunasan Servis Resi ${s.resi} (${s.customer_name})`
                                      });
                                      fetchServices();
                                      fetchTransactions();
                                      
                                      if (confirm('Servis Lunas! Ingin mencetak Nota Pengambilan?')) {
                                        setSelectedService({ ...s, issue: updatedIssue });
                                        setPrintType('pengambilan');
                                        setShowPrintModal(true);
                                      }
                                    } catch(err) { alert('Gagal update status / transaksi'); }
                                  }
                                } else {
                                  try {
                                    await apiService.post(`/services/${s.resi}/status`, { status: newStatus });
                                    fetchServices();
                                  } catch(err) { alert('Gagal update status'); }
                                }
                              }}
                            >
                              <option value="ANTRIAN">Antrian</option>
                              <option value="PROSES">Proses Servis</option>
                              <option value="MENUNGGU PART">Menunggu Part</option>
                              <option value="BATAL">Batal</option>
                              <option value="SELESAI" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Selesai (Tagihan)</option>
                              {s.status === 'SELESAI' && <option value="DI AMBIL" style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Di Ambil (Lunas)</option>}
                            </select>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
                              <span className="badge badge-success"><CheckCircle size={14} /> Sudah Di Ambil (Lunas)</span>
                              <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => {
                                setSelectedService(s);
                                setPrintType('pengambilan');
                                setShowPrintModal(true);
                              }}>
                                <Printer size={12} style={{ display: 'inline', marginRight: '4px' }} /> Cetak Ulang Nota
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'keuangan' && (
            <div className="glass-panel">
              <h3 style={{ marginBottom: '1rem' }}>Laporan Keuangan ({myCommissionRate}% Komisi)</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '2rem' }}>
                <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.5)', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 10px 0', color: 'var(--text-muted)' }}>Total Komisi Anda</p>
                  <h2 style={{ margin: 0, color: 'var(--accent)' }}>Rp {totalKomisi.toLocaleString('id-ID')}</h2>
                  <p style={{ fontSize: '0.8rem', marginTop: '5px' }}>Dari {myCompletedServices.length} Servis</p>
                </div>
                <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.5)', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 10px 0', color: 'var(--text-muted)' }}>Total Bon / Kasbon</p>
                  <h2 style={{ margin: 0, color: '#ef4444' }}>Rp {totalBon.toLocaleString('id-ID')}</h2>
                  <p style={{ fontSize: '0.8rem', marginTop: '5px' }}>Dari {myBonTransactions.length} Transaksi</p>
                </div>
                <div style={{ padding: '1.5rem', background: 'var(--primary)', color: 'white', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 10px 0', opacity: 0.9 }}>Sisa Bersih (Belum Dibayar)</p>
                  <h2 style={{ margin: 0 }}>Rp {sisaBersih.toLocaleString('id-ID')}</h2>
                  <button className="btn" style={{ background: 'white', color: 'var(--primary)', marginTop: '10px', fontSize: '0.85rem', fontWeight: 'bold' }} onClick={handleBon}>
                    <Wallet size={14} style={{ marginRight: '5px', display: 'inline' }}/> Ajukan Bon
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Hidden iframe for printing */}
      <iframe ref={printIframeRef} style={{ display: 'none' }} title="Receipt Printer" />

      {/* Modals */}
      {showSelesaiModal && selectedService && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', background: 'var(--bg-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Rincian Biaya Servis</h3>
              <button className="btn btn-ghost" onClick={() => setShowSelesaiModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              try {
                const partFee = parseInt(fd.get('part_fee')) || 0;
                const jasaFee = parseInt(fd.get('jasa_fee')) || 0;
                const diskon = parseInt(fd.get('diskon')) || 0;
                const partName = fd.get('part_name');
                
                let updatedIssue = selectedService.issue || '';
                if (partName) updatedIssue += `\n[Sparepart diganti: ${partName}]`;
                if (diskon > 0) updatedIssue += `\n[Diskon: Rp ${diskon}]`;

                await apiService.post('/services/finish', {
                  resi: selectedService.resi,
                  status: 'SELESAI',
                  part_fee: partFee,
                  jasa_fee: jasaFee,
                  technician_id: employee.id,
                  issue: updatedIssue
                });
                
                const totalTagihan = Math.max(0, partFee + jasaFee - diskon);
                const message = `Halo ${selectedService.customer_name},\n\nServis perangkat ${selectedService.device_name} Anda (Resi: ${selectedService.resi}) telah *SELESAI*.\nTotal Tagihan: Rp ${totalTagihan.toLocaleString('id-ID')}.\n\nSilakan diambil di toko kami. Terima kasih!`;
                
                const fonnteToken = tenant?.settings?.fonnte_token;
                const waMethod = tenant?.settings?.wa_method || 'auto';
                
                if (waMethod === 'auto' && fonnteToken) {
                  try {
                    await fetch('https://api.fonnte.com/send', {
                      method: 'POST',
                      headers: { 'Authorization': fonnteToken },
                      body: new URLSearchParams({
                        target: selectedService.customer_phone.replace(/^0/, '62'),
                        message: message
                      })
                    });
                  } catch(err) {
                    console.error('Fonnte Error:', err);
                  }
                } else {
                  window.open(`https://wa.me/${selectedService.customer_phone.replace(/^0/, '62')}?text=${encodeURIComponent(message)}`, '_blank');
                }
                
                alert('Berhasil disimpan & Notifikasi WA diproses!');
                setShowSelesaiModal(false);
                fetchServices();
              } catch (err) { alert('Gagal update status'); }
            }}>
              <p style={{ fontSize: '0.9rem', marginBottom: '15px' }}>Resi: {selectedService.resi}</p>
              
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Nama Sparepart (Kosongkan jika tidak ada):</label>
              <input type="text" name="part_name" className="input-field" placeholder="Misal: LCD Samsung J2" style={{ marginBottom: '10px' }} />
              
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Total Biaya Sparepart (Rp):</label>
              <input type="number" name="part_fee" className="input-field" defaultValue="0" required style={{ marginBottom: '10px' }} />
              
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Biaya Jasa (Rp):</label>
              <input type="number" name="jasa_fee" className="input-field" defaultValue="0" required style={{ marginBottom: '10px' }} />
              
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--danger)' }}>Diskon Khusus (Rp):</label>
              <input type="number" name="diskon" className="input-field" defaultValue="0" placeholder="Opsional" style={{ marginBottom: '20px' }} />
              
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Simpan & Tandai Selesai</button>
            </form>
          </div>
        </div>
      )}

      {showPersetujuanModal && selectedService && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', background: 'var(--bg-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Minta Persetujuan WA</h3>
              <button className="btn btn-ghost" onClick={() => setShowPersetujuanModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const partName = e.target.part.value;
              const estPrice = e.target.price.value;
              
              const waText = `Halo kak ${selectedService.customer_name}, dari ${tenant?.name || 'Toko Servis'}.\n\nSetelah kami lakukan pengecekan pada perangkat ${selectedService.device_name} kakak, ternyata memerlukan perbaikan/penggantian *${partName}*.\n\nEstimasi biaya totalnya adalah *Rp ${parseInt(estPrice).toLocaleString('id-ID')}*.\n\nApakah kakak setuju untuk kami lanjutkan perbaikannya? Mohon konfirmasinya ya kak. Terima kasih! 🙏`;
              const waUrl = `https://wa.me/${selectedService.customer_phone.replace(/^0/, '62')}?text=${encodeURIComponent(waText)}`;
              window.open(waUrl, '_blank');
              setShowPersetujuanModal(false);
            }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Tindakan / Nama Sparepart:</label>
              <input type="text" name="part" className="input-field" placeholder="Misal: Ganti LCD & Baterai" required style={{ marginBottom: '10px' }} />
              
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Estimasi Total Biaya (Rp):</label>
              <input type="number" name="price" className="input-field" placeholder="Misal: 450000" required style={{ marginBottom: '20px' }} />
              
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Buka WhatsApp</button>
            </form>
          </div>
        </div>
      )}

      {showPrintModal && selectedService && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '350px', background: 'var(--bg-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Cetak {printType === 'pendaftaran' ? 'Nota Pendaftaran' : 'Nota Pengambilan'}</h3>
              <button className="btn btn-ghost" onClick={() => setShowPrintModal(false)}><X size={20}/></button>
            </div>
            <p style={{ fontSize: '0.9rem', marginBottom: '20px' }}>Pilih jenis printer yang Anda gunakan:</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => doPrint('thermal')}>
                <Printer size={16} style={{ display: 'inline', marginRight: '5px' }} /> Thermal (58/80mm)
              </button>
              <button className="btn btn-ghost" style={{ flex: 1, border: '1px solid var(--border-light)' }} onClick={() => doPrint('a4')}>
                <Printer size={16} style={{ display: 'inline', marginRight: '5px' }} /> Kertas Biasa (A4)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
