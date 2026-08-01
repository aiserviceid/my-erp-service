import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Smartphone, Laptop, Wrench, Search, LogIn, ChevronRight, Check, X,
  Zap, ShieldCheck, Star, Users, BarChart3, Printer, Clock, 
  MessageSquare, Sparkles, HelpCircle, ArrowRight, Download, CheckCircle2,
  CreditCard, Flame, Award, Layers, TrendingUp, PhoneCall
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    [
      "Apakah benar-benar bisa dipakai gratis selamanya?",
      "Ya! Paket Starter kami 100% Gratis selamanya tanpa batas waktu. Anda bisa mengelola servis harian, kasir POS dasar, dan cetak nota barcode tanpa perlu kartu kredit."
    ],
    [
      "Bagaimana konsumen saya mengecek progres servis mereka?",
      "Pelanggan cukup membuka menu 'Lacak Servis' di website atau scan QR barcode pada nota bukti terima servis yang dicetak dari printer thermal Anda."
    ],
    [
      "Apakah aplikasi ini bisa diinstall di HP Android?",
      "Tentu! Kami menyediakan file APK resmi yang sangat ringan dan responsif, sehingga kasir atau teknisi lapangan bisa langsung menginput data dari smartphone tanpa perlu laptop."
    ],
    [
      "Bagaimana cara pembayaran aktivasi promo Paket Pro (Rp 49rb) & Enterprise (Rp 79rb)?",
      "Pembayaran sangat mudah via transfer Bank BRI (2088-01007194505) atau E-Wallet DANA (085382535050) a/n Syaifudin. Setelah transfer, klik tombol Konfirmasi WhatsApp untuk aktivasi kilat 1 menit."
    ],
    [
      "Apa keunggulan Fitur Komunitas & Dompet Saweran Teknisi?",
      "Teknisi Anda bisa bertanya solusi kerusakan hardware/software ke ribuan teknisi se-Indonesia. Teknisi yang memberikan solusi tepat bisa mendapatkan saweran saldo langsung ke rekening."
    ]
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif" }}>
      
      {/* TOP PROMO ANNOUNCEMENT BAR */}
      <div style={{
        background: 'linear-gradient(90deg, #1e3a8a 0%, #0284c7 100%)',
        padding: '0.6rem 1rem', textAlign: 'center', fontSize: '0.86rem', color: '#ffffff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap'
      }}>
        <Flame size={16} color="#fbbf24" />
        <span><strong>PROMO SPESIAL BULAN INI:</strong> Dapatkan Paket Pro Titan hanya <span style={{ color: '#fef08a', fontWeight: '800' }}>Rp 49.000/bln</span> & Enterprise <span style={{ color: '#86efac', fontWeight: '800' }}>Rp 79.000/bln</span>!</span>
        <button 
          onClick={() => navigate('/login', { state: { tab: 'register', tier: 'pro' } })}
          style={{ background: '#ffffff', color: '#0369a1', border: 'none', padding: '3px 12px', borderRadius: '6px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer', marginLeft: '6px' }}
        >
          Klaim Promo →
        </button>
      </div>

      {/* NAVBAR */}
      <nav style={{ 
        position: 'sticky', top: 0, zIndex: 100, 
        backdropFilter: 'blur(16px)', background: 'rgba(255, 255, 255, 0.92)',
        borderBottom: '1px solid #e2e8f0',
        padding: '1rem 2rem', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          {/* Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div style={{ 
              width: '42px', height: '42px', 
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', 
              borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(2, 132, 199, 0.3)'
            }}>
              <Sparkles size={22} color="white" />
            </div>
            <div>
              <span style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.5px', color: '#0f172a' }}>
                AISERVICE.ID
              </span>
              <span style={{ display: 'block', fontSize: '0.68rem', color: '#0284c7', fontWeight: '700', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                SaaS Kasir & Servis No. 1 Indonesia
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <div style={{ display: 'none', gap: '2rem', alignItems: 'center', fontWeight: '600', fontSize: '0.92rem' }} className="desktop-menu">
            <a href="#fitur" style={{ color: '#475569', textDecoration: 'none', transition: 'color 0.2s' }}>Fitur Unggulan</a>
            <a href="#pricing" style={{ color: '#475569', textDecoration: 'none', transition: 'color 0.2s' }}>Harga & Promo</a>
            <a href="#pembayaran" style={{ color: '#475569', textDecoration: 'none', transition: 'color 0.2s' }}>Pembayaran</a>
            <a href="#faq" style={{ color: '#475569', textDecoration: 'none', transition: 'color 0.2s' }}>Tanya Jawab</a>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              onClick={() => navigate('/tracking')}
              style={{
                background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1',
                padding: '0.6rem 1.1rem', borderRadius: '10px', fontWeight: '600', fontSize: '0.88rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
              }}
            >
              <Search size={15} /> Cek Resi
            </button>

            <button 
              onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', color: 'white', border: 'none',
                padding: '0.6rem 1.3rem', borderRadius: '10px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)', transition: 'all 0.2s'
              }}
            >
              Daftar Toko 🚀
            </button>

            <button 
              onClick={() => navigate('/login', { state: { tab: 'login' } })}
              style={{
                background: 'white', color: '#0f172a', border: '1px solid #cbd5e1',
                padding: '0.6rem 1.1rem', borderRadius: '10px', fontWeight: '600', fontSize: '0.88rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
              }}
            >
              <LogIn size={15} /> Masuk
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section style={{ 
        position: 'relative', padding: '5.5rem 2rem 5rem 2rem', 
        background: 'radial-gradient(circle at 50% 10%, #e0f2fe 0%, #f8fafc 70%)',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '980px', margin: '0 auto' }}>
          
          {/* Promo Pill Badge */}
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '10px', 
            padding: '6px 18px', borderRadius: '100px', 
            background: '#e0f2fe', border: '1px solid #bae6fd',
            color: '#0369a1', fontSize: '0.85rem', fontWeight: '700', marginBottom: '1.8rem',
            boxShadow: '0 2px 10px rgba(2, 132, 199, 0.1)'
          }}>
            <Sparkles size={16} />
            <span>ERP Modern Khusus Bengkel & Toko Servis Seluruh Indonesia</span>
          </div>

          {/* Headline */}
          <h1 style={{ 
            fontSize: 'clamp(2.4rem, 5.2vw, 4.2rem)', fontWeight: '900', lineHeight: '1.16', 
            letterSpacing: '-1.5px', marginBottom: '1.4rem', color: '#0f172a'
          }}>
            Tingkatkan Omzet Servis & Kendalikan Toko Anda Secara Otomatis.
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: 'clamp(1.05rem, 2vw, 1.25rem)', color: '#475569', lineHeight: '1.65', maxWidth: '780px', margin: '0 auto 2.8rem auto' }}>
            Solusi All-in-One: Kasir POS Cepat, Pelacakan Resi Realtime untuk Konsumen, Cetak Nota Barcode Thermal, dan Komunitas Teknisi Berbagi Solusi.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '4rem' }}>
            <button 
              onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}
              style={{
                padding: '1.1rem 2.6rem', fontSize: '1.05rem', fontWeight: '800', borderRadius: '14px',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', color: 'white', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                boxShadow: '0 8px 25px rgba(2, 132, 199, 0.35)', transition: 'all 0.2s'
              }}
            >
              Mulai Daftar Gratis Sekarang <ArrowRight size={20} />
            </button>

            <a 
              href="https://github.com/aiserviceid/my-erp-service/releases/download/v1.0.0/app-release.apk"
              download="Aplikasi-Kasir-ERP.apk"
              style={{
                padding: '1.1rem 2.2rem', fontSize: '1.05rem', fontWeight: '700', borderRadius: '14px',
                background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1',
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.04)', transition: 'all 0.2s'
              }}
            >
              <Download size={20} color="#059669" /> Unduh APK Android (v1.0)
            </a>
          </div>

          {/* Trust Stat Grid */}
          <div style={{ 
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', 
            padding: '1.8rem', borderRadius: '20px', background: '#ffffff', 
            border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)'
          }}>
            <div>
              <div style={{ fontSize: '2.1rem', fontWeight: '900', color: '#0284c7' }}>100%</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px', fontWeight: '600' }}>Cloud Realtime Supabase</div>
            </div>
            <div>
              <div style={{ fontSize: '2.1rem', fontWeight: '900', color: '#059669' }}>0 Detik</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px', fontWeight: '600' }}>Setup Cepat Tanpa Ribet</div>
            </div>
            <div>
              <div style={{ fontSize: '2.1rem', fontWeight: '900', color: '#d97706' }}>Multi-Role</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px', fontWeight: '600' }}>Owner, Kasir & Teknisi PIN</div>
            </div>
            <div>
              <div style={{ fontSize: '2.1rem', fontWeight: '900', color: '#7c3aed' }}>Web + APK</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px', fontWeight: '600' }}>Bisa Akses HP & Laptop</div>
            </div>
          </div>

        </div>
      </section>

      {/* CORE FEATURES SECTION */}
      <section id="fitur" style={{ padding: '5.5rem 2rem', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.8rem' }}>
          <span style={{ color: '#0284c7', fontWeight: '800', fontSize: '0.85rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            FITUR UTAMA SISTEM
          </span>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '900', marginTop: '0.5rem', letterSpacing: '-0.5px', color: '#0f172a' }}>
            Kelola Bisnis Servis Tanpa Celah & Penuh Kendali
          </h2>
          <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: '650px', margin: '0.8rem auto 0 auto' }}>
            Semua fitur dibangun berdasarkan kebutuhan nyata para teknisi dan pemilik konter / bengkel.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '24px' }}>
          
          {/* Card 1: Kasir POS */}
          <div style={{ 
            padding: '2.4rem', borderRadius: '20px', background: '#ffffff',
            border: '1px solid #e2e8f0', boxShadow: '0 8px 25px rgba(0, 0, 0, 0.04)', transition: 'transform 0.3s'
          }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', marginBottom: '1.4rem' }}>
              <Zap size={26} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.8rem', color: '#0f172a' }}>Kasir POS Cepat & Akurat</h3>
            <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Catat penjualan sparepart, biaya jasa, dan aksesoris hanya dalam hitungan detik dengan kalkulasi otomatis dan stok real-time.
            </p>
          </div>

          {/* Card 2: Tracking Resi Real-Time */}
          <div style={{ 
            padding: '2.4rem', borderRadius: '20px', background: '#ffffff',
            border: '1px solid #e2e8f0', boxShadow: '0 8px 25px rgba(0, 0, 0, 0.04)', transition: 'transform 0.3s'
          }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', marginBottom: '1.4rem' }}>
              <Clock size={26} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.8rem', color: '#0f172a' }}>Lacak Status Resi Konsumen</h3>
            <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Pelanggan cukup memasukkan nomor resi (cth: SRV-001) di website untuk memantau apakah barang sedang dicek, dikerjakan, atau selesai.
            </p>
          </div>

          {/* Card 3: Cetak Nota Barcode */}
          <div style={{ 
            padding: '2.4rem', borderRadius: '20px', background: '#ffffff',
            border: '1px solid #e2e8f0', boxShadow: '0 8px 25px rgba(0, 0, 0, 0.04)', transition: 'transform 0.3s'
          }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', marginBottom: '1.4rem' }}>
              <Printer size={26} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.8rem', color: '#0f172a' }}>Cetak Nota Thermal Barcode</h3>
            <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Langsung cetak tanda terima servis dan struk kasir dengan barcode & QR code ke printer Bluetooth 58mm / 80mm.
            </p>
          </div>

          {/* Card 4: Multi-Karyawan & PIN */}
          <div style={{ 
            padding: '2.4rem', borderRadius: '20px', background: '#ffffff',
            border: '1px solid #e2e8f0', boxShadow: '0 8px 25px rgba(0, 0, 0, 0.04)', transition: 'transform 0.3s'
          }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#db2777', marginBottom: '1.4rem' }}>
              <Users size={26} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.8rem', color: '#0f172a' }}>Multi-Karyawan & PIN Mandiri</h3>
            <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Beri teknisi dan kasir hak akses terpisah dengan PIN khusus. Owner memegang kontrol penuh atas harga modal dan laporan omzet.
            </p>
          </div>

          {/* Card 5: Forum Solusi & Saweran */}
          <div style={{ 
            padding: '2.4rem', borderRadius: '20px', background: '#ffffff',
            border: '1px solid #e2e8f0', boxShadow: '0 8px 25px rgba(0, 0, 0, 0.04)', transition: 'transform 0.3s'
          }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333ea', marginBottom: '1.4rem' }}>
              <MessageSquare size={26} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.8rem', color: '#0f172a' }}>Forum Solusi & Saweran Teknisi</h3>
            <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Tanya jawab kasus servis sulit dengan teknisi se-Indonesia. Teknisi yang memberi solusi tepat bisa dapat saweran saldo tunai!
            </p>
          </div>

          {/* Card 6: Laporan Keuangan */}
          <div style={{ 
            padding: '2.4rem', borderRadius: '20px', background: '#ffffff',
            border: '1px solid #e2e8f0', boxShadow: '0 8px 25px rgba(0, 0, 0, 0.04)', transition: 'transform 0.3s'
          }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', marginBottom: '1.4rem' }}>
              <BarChart3 size={26} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.8rem', color: '#0f172a' }}>Laporan Arus Kas Otomatis</h3>
            <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Pantau laba bersih harian, omzet jasa servis, dan biaya operasional secara otomatis tanpa perlu rekap nota di buku manual.
            </p>
          </div>

        </div>
      </section>

      {/* PRICING & TIERS SECTION WITH STRIKETHROUGH */}
      <section id="pricing" style={{ padding: '5.5rem 2rem', background: '#ffffff', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1150px', margin: '0 auto', textAlign: 'center' }}>
          
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '100px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontSize: '0.85rem', fontWeight: '800', marginBottom: '1rem' }}>
            <Flame size={16} />
            <span>HARGA PROMO RESMI BULAN INI</span>
          </div>

          <h2 style={{ fontSize: '2.6rem', fontWeight: '900', letterSpacing: '-0.5px', color: '#0f172a' }}>
            Pilih Paket Berlangganan Toko Anda
          </h2>
          <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: '650px', margin: '0.8rem auto 2.5rem auto' }}>
            Mulai gratis selamanya atau nikmati fitur terlengkap dengan diskon harga promo coret spesial.
          </p>

          {/* Billing Switch (Bulanan vs Tahunan 20% OFF) */}
          <div style={{ display: 'inline-flex', alignItems: 'center', background: '#f1f5f9', padding: '4px', borderRadius: '14px', marginBottom: '3.5rem', border: '1px solid #e2e8f0' }}>
            <button 
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '0.92rem', cursor: 'pointer',
                background: billingCycle === 'monthly' ? '#0284c7' : 'transparent', color: billingCycle === 'monthly' ? 'white' : '#64748b',
                transition: 'all 0.2s', boxShadow: billingCycle === 'monthly' ? '0 2px 8px rgba(2, 132, 199, 0.3)' : 'none'
              }}
            >
              Tagihan Bulanan
            </button>
            <button 
              onClick={() => setBillingCycle('yearly')}
              style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '0.92rem', cursor: 'pointer',
                background: billingCycle === 'yearly' ? '#0284c7' : 'transparent', color: billingCycle === 'yearly' ? 'white' : '#64748b',
                display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
                boxShadow: billingCycle === 'yearly' ? '0 2px 8px rgba(2, 132, 199, 0.3)' : 'none'
              }}
            >
              Paket Tahunan <span style={{ fontSize: '0.75rem', background: '#059669', color: 'white', padding: '2px 8px', borderRadius: '100px', fontWeight: '800' }}>Diskon 20% 🔥</span>
            </button>
          </div>

          {/* Pricing Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '26px', textAlign: 'left' }}>
            
            {/* TIER 1: STARTER (GRATIS) */}
            <div style={{ 
              padding: '2.8rem 2rem', borderRadius: '24px', background: '#ffffff',
              border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ color: '#0284c7', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase' }}>Starter Toko</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '900', marginTop: '4px', color: '#0f172a' }}>Gratis Selamanya</h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '6px' }}>Untuk toko servis pemula dan teknisi perorangan.</p>
              </div>

              {/* Price Display */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0f172a' }}>
                  Rp 0 <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 'normal' }}>/bulan</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: '700', marginTop: '4px' }}>
                  ✓ Tanpa biaya tersembunyi selamanya
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.5rem 0', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#334155' }}><Check size={18} color="#059669" /> Hingga 50 Servis / bulan</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#334155' }}><Check size={18} color="#059669" /> Kasir POS & Data Stok Sparepart</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#334155' }}><Check size={18} color="#059669" /> Cek Status Resi Online Pelanggan</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#334155' }}><Check size={18} color="#059669" /> 1 Akun Admin Toko</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#334155' }}><Check size={18} color="#059669" /> Cetak Nota Resi Barcode</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#94a3b8' }}><X size={18} /> Multi-Karyawan & Multi-Teknisi</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#94a3b8' }}><X size={18} /> Custom Logo & Template Nota Sendiri</li>
              </ul>

              <button 
                onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}
                style={{
                  width: '100%', padding: '1rem', borderRadius: '12px', fontWeight: '700', fontSize: '0.95rem',
                  background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Gunakan Gratis Sekarang
              </button>
            </div>

            {/* TIER 2: PRO TITAN (FEATURED - RP 49.000 / BLN) */}
            <div style={{ 
              padding: '2.8rem 2rem', borderRadius: '24px', 
              background: '#ffffff',
              border: '2px solid #0284c7', display: 'flex', flexDirection: 'column', position: 'relative',
              boxShadow: '0 15px 40px rgba(2, 132, 199, 0.15)'
            }}>
              <div style={{ 
                position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', 
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', color: 'white', 
                padding: '4px 16px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '900', 
                letterSpacing: '1px', textTransform: 'uppercase', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)'
              }}>
                ⭐ PALING POPULER & HEMAT
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <span style={{ color: '#0284c7', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase' }}>Pro Bengkel / Store</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '900', marginTop: '4px', color: '#0f172a' }}>Paket Pro Titan</h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '6px' }}>Untuk toko berkembang dengan multi-karyawan & custom branding.</p>
              </div>

              {/* Strikethrough Price Display */}
              <div style={{ marginBottom: '1.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '1.2rem', fontWeight: '700' }}>
                    {billingCycle === 'monthly' ? 'Rp 99.000' : 'Rp 49.000'}
                  </span>
                  <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>
                    {billingCycle === 'monthly' ? 'DISKON 50%' : 'DISKON 20%'}
                  </span>
                </div>

                <div style={{ fontSize: '2.6rem', fontWeight: '900', color: '#0284c7', margin: '2px 0' }}>
                  {billingCycle === 'monthly' ? 'Rp 49.000' : 'Rp 39.000'} 
                  <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 'normal' }}>/bulan</span>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#059669', fontWeight: '700' }}>
                  {billingCycle === 'monthly' ? '✓ Promo harga murah Rp 49rb/bulan' : '✓ Ditagih tahunan Rp 468.000 (Hemat Besar!)'}
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.2rem 0', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#1e293b' }}><Check size={18} color="#059669" /> <strong>UNLIMITED</strong> Servis & Transaksi POS</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#1e293b' }}><Check size={18} color="#059669" /> <strong>Multi-Karyawan</strong> (Kasir & Teknisi PIN)</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#1e293b' }}><Check size={18} color="#059669" /> Custom Logo Toko & Nama Usaha Sendiri</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#1e293b' }}><Check size={18} color="#059669" /> Cetak Nota Thermal & QR Tracking</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#1e293b' }}><Check size={18} color="#059669" /> Laporan Laba Bersih & Arus Kas Lengkap</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#1e293b' }}><Check size={18} color="#059669" /> Akses Komunitas & Dompet Saweran</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#1e293b' }}><Check size={18} color="#059669" /> Bantuan Support WhatsApp Prioritas</li>
              </ul>

              <button 
                onClick={() => navigate('/login', { state: { tab: 'register', tier: 'pro' } })}
                style={{
                  width: '100%', padding: '1.05rem', borderRadius: '12px', fontWeight: '800', fontSize: '1rem',
                  background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', color: 'white', border: 'none',
                  cursor: 'pointer', boxShadow: '0 4px 18px rgba(2, 132, 199, 0.4)', transition: 'all 0.2s'
                }}
              >
                Pilih Paket Pro (Rp 49rb) ⭐
              </button>
            </div>

            {/* TIER 3: ENTERPRISE (RP 79.000 / BLN) */}
            <div style={{ 
              padding: '2.8rem 2rem', borderRadius: '24px', background: '#ffffff',
              border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ marginBottom: '1.2rem' }}>
                <span style={{ color: '#7c3aed', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase' }}>Multi-Branch Network</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '900', marginTop: '4px', color: '#0f172a' }}>Enterprise Cabang</h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '6px' }}>Untuk franchise atau pemilik dengan banyak cabang toko.</p>
              </div>

              {/* Strikethrough Price Display */}
              <div style={{ marginBottom: '1.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '1.2rem', fontWeight: '700' }}>
                    {billingCycle === 'monthly' ? 'Rp 149.000' : 'Rp 79.000'}
                  </span>
                  <span style={{ background: '#f3e8ff', color: '#7c3aed', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>
                    {billingCycle === 'monthly' ? 'HEMAT 47%' : 'DISKON 20%'}
                  </span>
                </div>

                <div style={{ fontSize: '2.6rem', fontWeight: '900', color: '#7c3aed', margin: '2px 0' }}>
                  {billingCycle === 'monthly' ? 'Rp 79.000' : 'Rp 63.000'} 
                  <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 'normal' }}>/bulan</span>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#7c3aed', fontWeight: '700' }}>
                  {billingCycle === 'monthly' ? '✓ Promo spesial Rp 79rb/bulan' : '✓ Ditagih tahunan Rp 756.000 (Hemat 20%)'}
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.2rem 0', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#1e293b' }}><Check size={18} color="#059669" /> <strong>Semua Fitur Paket Pro Titan</strong></li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#1e293b' }}><Check size={18} color="#059669" /> Hingga 5 Cabang Toko Terpusat</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#1e293b' }}><Check size={18} color="#059669" /> Transfer Stok Antar Cabang</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#1e293b' }}><Check size={18} color="#059669" /> Custom Domain Pribadi (.com/.id)</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#1e293b' }}><Check size={18} color="#059669" /> Dedicated Account Manager Pribadi</li>
              </ul>

              <button 
                onClick={() => navigate('/login', { state: { tab: 'register', tier: 'enterprise' } })}
                style={{
                  width: '100%', padding: '1.05rem', borderRadius: '12px', fontWeight: '800', fontSize: '1rem',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: 'white', border: 'none',
                  cursor: 'pointer', boxShadow: '0 4px 18px rgba(124, 58, 237, 0.35)', transition: 'all 0.2s'
                }}
              >
                Pilih Enterprise (Rp 79rb) 🏢
              </button>
            </div>

          </div>

          {/* PAYMENT DETAILS CLEAN BOX */}
          <div id="pembayaran" style={{ 
            marginTop: '4rem', padding: '2.4rem', borderRadius: '24px', 
            background: 'linear-gradient(135deg, #f0f9ff 0%, #f8fafc 100%)',
            border: '1px solid #bae6fd', textAlign: 'left',
            boxShadow: '0 10px 30px rgba(2, 132, 199, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
              <CreditCard size={28} color="#0284c7" />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>Rekening Resmi Pembayaran & Aktivasi Cepat</h3>
                <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>Transfer biaya langganan promo ke rekening resmi di bawah ini:</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '1.5rem' }}>
              {/* Bank BRI */}
              <div style={{ padding: '16px', borderRadius: '16px', background: '#ffffff', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Bank BRI</div>
                <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#0284c7', letterSpacing: '1px', margin: '4px 0' }}>
                  2088-01007194505
                </div>
                <div style={{ fontSize: '0.9rem', color: '#334155' }}>Atas Nama: <strong>SYAIFUDIN</strong></div>
              </div>

              {/* DANA */}
              <div style={{ padding: '16px', borderRadius: '16px', background: '#ffffff', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>E-Wallet DANA</div>
                <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#059669', letterSpacing: '1px', margin: '4px 0' }}>
                  085382535050
                </div>
                <div style={{ fontSize: '0.9rem', color: '#334155' }}>Atas Nama: <strong>SYAIFUDIN</strong></div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ fontSize: '0.88rem', color: '#64748b' }}>
                ⚡ <em>Setelah transfer, akun Anda akan langsung diaktivasi dalam 1 menit via WhatsApp resmi.</em>
              </div>
              <a 
                href="https://wa.me/6285382535050?text=Halo%20Admin%20AISERVICE,%20saya%20ingin%20tanya/konfirmasi%20promo%20langganan%20aplikasi%20kasir%20ERP." 
                target="_blank" 
                rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: '#25D366', color: 'white', padding: '10px 22px', borderRadius: '10px',
                  fontWeight: '800', fontSize: '0.92rem', textDecoration: 'none', boxShadow: '0 4px 15px rgba(37, 211, 102, 0.35)'
                }}
              >
                Chat WhatsApp Admin (085382535050) 💬
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* FAQ ACCORDION */}
      <section id="faq" style={{ padding: '5.5rem 2rem', maxWidth: '850px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <span style={{ color: '#0284c7', fontWeight: '800', fontSize: '0.85rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            FAQ
          </span>
          <h2 style={{ fontSize: '2.4rem', fontWeight: '900', marginTop: '0.5rem', color: '#0f172a' }}>
            Pertanyaan yang Sering Diajukan
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {faqs.map((faq, idx) => (
            <div 
              key={idx}
              onClick={() => toggleFaq(idx)}
              style={{
                borderRadius: '16px', background: '#ffffff',
                border: '1px solid #e2e8f0', padding: '1.5rem 2rem',
                cursor: 'pointer', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)', transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700', fontSize: '1.05rem', color: '#0f172a' }}>
                <span>{faq[0]}</span>
                <span style={{ color: '#0284c7', fontSize: '1.4rem' }}>{openFaq === idx ? '−' : '+'}</span>
              </div>
              {openFaq === idx && (
                <p style={{ color: '#64748b', marginTop: '1rem', lineHeight: '1.6', fontSize: '0.95rem' }}>
                  {faq[1]}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA BANNER */}
      <section style={{ 
        padding: '5rem 2rem', margin: '0 2rem 5rem 2rem',
        borderRadius: '30px', background: 'linear-gradient(135deg, #0284c7 0%, #1e40af 100%)',
        textAlign: 'center', boxShadow: '0 20px 45px rgba(2, 132, 199, 0.25)'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '900', color: 'white', marginBottom: '1rem' }}>
            Siap Mengembangkan Usaha Servis Anda Hari Ini?
          </h2>
          <p style={{ fontSize: '1.15rem', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '2.5rem' }}>
            Bergabunglah bersama ratusan pemilik bengkel & toko servis lainnya. Daftar dalam 1 menit tanpa biaya.
          </p>
          <button 
            onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}
            style={{
              padding: '1.1rem 2.8rem', fontSize: '1.15rem', fontWeight: '800', borderRadius: '14px',
              background: 'white', color: '#0f172a', border: 'none', cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)', transition: 'transform 0.2s'
            }}
          >
            Buat Akun Toko Gratis Sekarang 🚀
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ 
        padding: '3.5rem 2rem', borderTop: '1px solid #e2e8f0', 
        background: '#ffffff', color: '#64748b', fontSize: '0.9rem' 
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <span style={{ color: '#0f172a', fontWeight: '900', fontSize: '1.15rem' }}>AISERVICE.ID</span>
            <p style={{ margin: '4px 0 0 0' }}>Sistem ERP Kasir & Pelacakan Servis Terpadu No. 1 di Indonesia.</p>
          </div>
          <div>
            &copy; {new Date().getFullYear()} AISERVICE.ID. Hak Cipta Dilindungi.
          </div>
        </div>
      </footer>

    </div>
  );
}
