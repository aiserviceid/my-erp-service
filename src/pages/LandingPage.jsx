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
    <div style={{ minHeight: '100vh', background: '#050811', color: '#f8fafc', fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}>
      
      {/* TOP ANNOUNCEMENT BAR */}
      <div style={{
        background: 'linear-gradient(90deg, #1e1b4b 0%, #0f172a 50%, #1e1b4b 100%)',
        borderBottom: '1px solid rgba(139, 92, 246, 0.25)',
        padding: '0.55rem 1rem', textAlign: 'center', fontSize: '0.85rem', color: '#e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
      }}>
        <Flame size={16} color="#f59e0b" style={{ animation: 'bounce 1s infinite' }} />
        <span><strong>PROMO SPESIAL BULAN INI:</strong> Dapatkan Paket Pro Titan hanya <span style={{ color: '#38bdf8', fontWeight: '800' }}>Rp 49.000/bln</span> & Enterprise <span style={{ color: '#10b981', fontWeight: '800' }}>Rp 79.000/bln</span>!</span>
        <button 
          onClick={() => navigate('/login', { state: { tab: 'register', tier: 'pro' } })}
          style={{ background: '#38bdf8', color: '#090d16', border: 'none', padding: '2px 10px', borderRadius: '6px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer', marginLeft: '6px' }}
        >
          Klaim Promo →
        </button>
      </div>

      {/* NAVBAR */}
      <nav style={{ 
        position: 'sticky', top: 0, zIndex: 100, 
        backdropFilter: 'blur(20px)', background: 'rgba(5, 8, 17, 0.85)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
        padding: '0.9rem 2rem'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          {/* Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div style={{ 
              width: '42px', height: '42px', 
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', 
              borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(2, 132, 199, 0.4)'
            }}>
              <Sparkles size={22} color="white" />
            </div>
            <div>
              <span style={{ fontSize: '1.45rem', fontWeight: '900', letterSpacing: '-0.5px', background: 'linear-gradient(to right, #ffffff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                AISERVICE.ID
              </span>
              <span style={{ display: 'block', fontSize: '0.68rem', color: '#38bdf8', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Enterprise SaaS Bengkel & Servis
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <div style={{ display: 'none', gap: '2.2rem', alignItems: 'center', fontWeight: '500', fontSize: '0.92rem' }} className="desktop-menu">
            <a href="#fitur" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}>Fitur Unggulan</a>
            <a href="#pricing" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}>Harga & Promo</a>
            <a href="#pembayaran" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}>Pembayaran</a>
            <a href="#faq" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}>Tanya Jawab</a>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              onClick={() => navigate('/tracking')}
              style={{
                background: 'rgba(255, 255, 255, 0.04)', color: '#cbd5e1', border: '1px solid rgba(255, 255, 255, 0.12)',
                padding: '0.6rem 1.1rem', borderRadius: '10px', fontWeight: '600', fontSize: '0.88rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
              }}
            >
              <Search size={15} /> Cek Resi
            </button>

            <button 
              onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}
              style={{
                background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', color: 'white', border: 'none',
                padding: '0.6rem 1.3rem', borderRadius: '10px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 18px rgba(14, 165, 233, 0.4)', transition: 'all 0.2s'
              }}
            >
              Daftar Toko 🚀
            </button>

            <button 
              onClick={() => navigate('/login', { state: { tab: 'login' } })}
              style={{
                background: 'rgba(255, 255, 255, 0.06)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.15)',
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
        position: 'relative', padding: '6.5rem 2rem 5.5rem 2rem', 
        background: 'radial-gradient(circle at 50% 10%, rgba(14, 165, 233, 0.18) 0%, rgba(5, 8, 17, 0.95) 75%)',
        textAlign: 'center', overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '980px', margin: '0 auto' }}>
          
          {/* Promo Pill Badge */}
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '10px', 
            padding: '6px 18px', borderRadius: '100px', 
            background: 'rgba(14, 165, 233, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8', fontSize: '0.85rem', fontWeight: '700', marginBottom: '2rem',
            boxShadow: '0 0 25px rgba(14, 165, 233, 0.2)'
          }}>
            <Sparkles size={16} />
            <span>ERP Generasi Modern untuk Bengkel & Toko Servis Seluruh Indonesia</span>
          </div>

          {/* Headline */}
          <h1 style={{ 
            fontSize: 'clamp(2.5rem, 5.5vw, 4.4rem)', fontWeight: '900', lineHeight: '1.14', 
            letterSpacing: '-1.8px', marginBottom: '1.5rem',
            background: 'linear-gradient(180deg, #ffffff 30%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            Tingkatkan Omzet Servis & Kendalikan Toko Anda Secara Otomatis.
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: 'clamp(1.05rem, 2vw, 1.3rem)', color: '#94a3b8', lineHeight: '1.65', maxWidth: '780px', margin: '0 auto 3rem auto' }}>
            Solusi All-in-One: Kasir POS Cepat, Pelacakan Resi Realtime untuk Konsumen, Cetak Nota Barcode Thermal, dan Komunitas Teknisi Berbagi Solusi.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '4.5rem' }}>
            <button 
              onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}
              style={{
                padding: '1.15rem 2.6rem', fontSize: '1.05rem', fontWeight: '800', borderRadius: '14px',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', color: 'white', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                boxShadow: '0 10px 35px rgba(14, 165, 233, 0.45)', transition: 'all 0.2s'
              }}
            >
              Mulai Daftar Gratis Sekarang <ArrowRight size={20} />
            </button>

            <a 
              href="https://github.com/aiserviceid/my-erp-service/releases/download/v1.0.0/app-release.apk"
              download="Aplikasi-Kasir-ERP.apk"
              style={{
                padding: '1.15rem 2.4rem', fontSize: '1.05rem', fontWeight: '700', borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.05)', color: '#f8fafc', border: '1px solid rgba(255, 255, 255, 0.15)',
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px',
                backdropFilter: 'blur(10px)', transition: 'all 0.2s'
              }}
            >
              <Download size={20} color="#10b981" /> Unduh APK Android (v1.0)
            </a>
          </div>

          {/* Trust Stat Grid */}
          <div style={{ 
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', 
            padding: '1.8rem', borderRadius: '20px', background: 'rgba(11, 17, 32, 0.65)', 
            border: '1px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(20px)'
          }}>
            <div>
              <div style={{ fontSize: '2.1rem', fontWeight: '900', color: '#38bdf8' }}>100%</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '2px' }}>Cloud Realtime Supabase</div>
            </div>
            <div>
              <div style={{ fontSize: '2.1rem', fontWeight: '900', color: '#10b981' }}>0 Detik</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '2px' }}>Setup Cepat Tanpa Ribet</div>
            </div>
            <div>
              <div style={{ fontSize: '2.1rem', fontWeight: '900', color: '#f59e0b' }}>Multi-Role</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '2px' }}>Owner, Kasir & Teknisi PIN</div>
            </div>
            <div>
              <div style={{ fontSize: '2.1rem', fontWeight: '900', color: '#c084fc' }}>Web + APK</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '2px' }}>Bisa Akses HP & Laptop</div>
            </div>
          </div>

        </div>
      </section>

      {/* CORE FEATURES SECTION */}
      <section id="fitur" style={{ padding: '6rem 2rem', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <span style={{ color: '#38bdf8', fontWeight: '800', fontSize: '0.85rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            FITUR UTAMA SISTEM
          </span>
          <h2 style={{ fontSize: '2.6rem', fontWeight: '900', marginTop: '0.5rem', letterSpacing: '-0.5px' }}>
            Kelola Bisnis Servis Tanpa Celah & Penuh Kendali
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', maxWidth: '650px', margin: '1rem auto 0 auto' }}>
            Semua fitur dibangun berdasarkan kebutuhan nyata para teknisi dan pemilik konter / bengkel.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '24px' }}>
          
          {/* Card 1: Kasir POS */}
          <div style={{ 
            padding: '2.4rem', borderRadius: '20px', background: 'rgba(11, 17, 32, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)', transition: 'transform 0.3s'
          }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(14, 165, 233, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', marginBottom: '1.4rem' }}>
              <Zap size={26} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '0.8rem' }}>Kasir POS Cepat & Akurat</h3>
            <p style={{ color: '#94a3b8', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Catat penjualan sparepart, biaya jasa, dan aksesoris hanya dalam hitungan detik dengan kalkulasi otomatis dan stok real-time.
            </p>
          </div>

          {/* Card 2: Tracking Resi Real-Time */}
          <div style={{ 
            padding: '2.4rem', borderRadius: '20px', background: 'rgba(11, 17, 32, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)', transition: 'transform 0.3s'
          }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', marginBottom: '1.4rem' }}>
              <Clock size={26} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '0.8rem' }}>Lacak Status Resi Konsumen</h3>
            <p style={{ color: '#94a3b8', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Pelanggan cukup memasukkan nomor resi (cth: SRV-001) di website untuk memantau apakah barang sedang dicek, dikerjakan, atau selesai.
            </p>
          </div>

          {/* Card 3: Cetak Nota Barcode */}
          <div style={{ 
            padding: '2.4rem', borderRadius: '20px', background: 'rgba(11, 17, 32, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)', transition: 'transform 0.3s'
          }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', marginBottom: '1.4rem' }}>
              <Printer size={26} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '0.8rem' }}>Cetak Nota Thermal Barcode</h3>
            <p style={{ color: '#94a3b8', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Langsung cetak tanda terima servis dan struk kasir dengan barcode & QR code ke printer Bluetooth 58mm / 80mm.
            </p>
          </div>

          {/* Card 4: Multi-Karyawan & PIN */}
          <div style={{ 
            padding: '2.4rem', borderRadius: '20px', background: 'rgba(11, 17, 32, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)', transition: 'transform 0.3s'
          }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ec4899', marginBottom: '1.4rem' }}>
              <Users size={26} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '0.8rem' }}>Multi-Karyawan & PIN Mandiri</h3>
            <p style={{ color: '#94a3b8', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Beri teknisi dan kasir hak akses terpisah dengan PIN khusus. Owner memegang kontrol penuh atas harga modal dan laporan omzet.
            </p>
          </div>

          {/* Card 5: Forum Solusi & Saweran */}
          <div style={{ 
            padding: '2.4rem', borderRadius: '20px', background: 'rgba(11, 17, 32, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)', transition: 'transform 0.3s'
          }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc', marginBottom: '1.4rem' }}>
              <MessageSquare size={26} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '0.8rem' }}>Forum Solusi & Saweran Teknisi</h3>
            <p style={{ color: '#94a3b8', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Tanya jawab kasus servis sulit dengan teknisi se-Indonesia. Teknisi yang memberi solusi tepat bisa dapat saweran saldo tunai!
            </p>
          </div>

          {/* Card 6: Laporan Keuangan */}
          <div style={{ 
            padding: '2.4rem', borderRadius: '20px', background: 'rgba(11, 17, 32, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)', transition: 'transform 0.3s'
          }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', marginBottom: '1.4rem' }}>
              <BarChart3 size={26} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '0.8rem' }}>Laporan Arus Kas Otomatis</h3>
            <p style={{ color: '#94a3b8', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Pantau laba bersih harian, omzet jasa servis, dan biaya operasional secara otomatis tanpa perlu rekap nota di buku manual.
            </p>
          </div>

        </div>
      </section>

      {/* PRICING & TIERS SECTION WITH STRIKETHROUGH */}
      <section id="pricing" style={{ padding: '6.5rem 2rem', background: 'rgba(11, 17, 32, 0.5)', borderTop: '1px solid rgba(255, 255, 255, 0.07)', borderBottom: '1px solid rgba(255, 255, 255, 0.07)' }}>
        <div style={{ maxWidth: '1150px', margin: '0 auto', textAlign: 'center' }}>
          
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '100px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.85rem', fontWeight: '800', marginBottom: '1rem' }}>
            <Flame size={16} />
            <span>HARGA PROMO RESMI BULAN INI</span>
          </div>

          <h2 style={{ fontSize: '2.6rem', fontWeight: '900', letterSpacing: '-0.5px' }}>
            Pilih Paket Berlangganan Toko Anda
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', maxWidth: '650px', margin: '0.8rem auto 2.5rem auto' }}>
            Mulai gratis selamanya atau nikmati fitur terlengkap dengan diskon harga promo coret spesial.
          </p>

          {/* Billing Switch (Bulanan vs Tahunan 20% OFF) */}
          <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.06)', padding: '4px', borderRadius: '14px', marginBottom: '3.5rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <button 
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '0.92rem', cursor: 'pointer',
                background: billingCycle === 'monthly' ? '#0ea5e9' : 'transparent', color: billingCycle === 'monthly' ? 'white' : '#94a3b8',
                transition: 'all 0.2s'
              }}
            >
              Tagihan Bulanan
            </button>
            <button 
              onClick={() => setBillingCycle('yearly')}
              style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '0.92rem', cursor: 'pointer',
                background: billingCycle === 'yearly' ? '#0ea5e9' : 'transparent', color: billingCycle === 'yearly' ? 'white' : '#94a3b8',
                display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
              }}
            >
              Paket Tahunan <span style={{ fontSize: '0.75rem', background: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '100px', fontWeight: '800' }}>Diskon 20% 🔥</span>
            </button>
          </div>

          {/* Pricing Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '26px', textAlign: 'left' }}>
            
            {/* TIER 1: STARTER (GRATIS) */}
            <div style={{ 
              padding: '2.8rem 2rem', borderRadius: '24px', background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ color: '#38bdf8', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase' }}>Starter Toko</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '900', marginTop: '4px' }}>Gratis Selamanya</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '6px' }}>Untuk toko servis pemula dan teknisi perorangan.</p>
              </div>

              {/* Price Display */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#f8fafc' }}>
                  Rp 0 <span style={{ fontSize: '0.95rem', color: '#94a3b8', fontWeight: 'normal' }}>/bulan</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '600', marginTop: '4px' }}>
                  ✓ Tanpa biaya tersembunyi selamanya
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.5rem 0', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem' }}><Check size={18} color="#10b981" /> Hingga 50 Servis / bulan</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem' }}><Check size={18} color="#10b981" /> Kasir POS & Data Stok Sparepart</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem' }}><Check size={18} color="#10b981" /> Cek Status Resi Online Pelanggan</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem' }}><Check size={18} color="#10b981" /> 1 Akun Admin Toko</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem' }}><Check size={18} color="#10b981" /> Cetak Nota Resi Barcode</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#64748b' }}><X size={18} /> Multi-Karyawan & Multi-Teknisi</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#64748b' }}><X size={18} /> Custom Logo & Template Nota Sendiri</li>
              </ul>

              <button 
                onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}
                style={{
                  width: '100%', padding: '1rem', borderRadius: '12px', fontWeight: '700', fontSize: '0.95rem',
                  background: 'rgba(255, 255, 255, 0.06)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.15)',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Gunakan Gratis Sekarang
              </button>
            </div>

            {/* TIER 2: PRO TITAN (FEATURED - RP 49.000 / BLN) */}
            <div style={{ 
              padding: '2.8rem 2rem', borderRadius: '24px', 
              background: 'linear-gradient(180deg, rgba(14, 165, 233, 0.16) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '2px solid #0ea5e9', display: 'flex', flexDirection: 'column', position: 'relative',
              boxShadow: '0 20px 45px rgba(14, 165, 233, 0.25)'
            }}>
              <div style={{ 
                position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', 
                background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', color: 'white', 
                padding: '4px 16px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '900', 
                letterSpacing: '1px', textTransform: 'uppercase', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.4)'
              }}>
                ⭐ PALING POPULER & HEMAT
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <span style={{ color: '#38bdf8', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase' }}>Pro Bengkel / Store</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '900', marginTop: '4px' }}>Paket Pro Titan</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '6px' }}>Untuk toko berkembang dengan multi-karyawan & custom branding.</p>
              </div>

              {/* Strikethrough Price Display */}
              <div style={{ marginBottom: '1.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ textDecoration: 'line-through', color: '#64748b', fontSize: '1.2rem', fontWeight: '700' }}>
                    {billingCycle === 'monthly' ? 'Rp 99.000' : 'Rp 49.000'}
                  </span>
                  <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>
                    {billingCycle === 'monthly' ? 'DISKON 50%' : 'DISKON 20%'}
                  </span>
                </div>

                <div style={{ fontSize: '2.6rem', fontWeight: '900', color: '#38bdf8', margin: '2px 0' }}>
                  {billingCycle === 'monthly' ? 'Rp 49.000' : 'Rp 39.000'} 
                  <span style={{ fontSize: '0.95rem', color: '#94a3b8', fontWeight: 'normal' }}>/bulan</span>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: '600' }}>
                  {billingCycle === 'monthly' ? '✓ Promo harga murah Rp 49rb/bulan' : '✓ Ditagih tahunan Rp 468.000 (Hemat Besar!)'}
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.2rem 0', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem' }}><Check size={18} color="#10b981" /> <strong>UNLIMITED</strong> Servis & Transaksi POS</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem' }}><Check size={18} color="#10b981" /> <strong>Multi-Karyawan</strong> (Kasir & Teknisi PIN)</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem' }}><Check size={18} color="#10b981" /> Custom Logo Toko & Nama Usaha Sendiri</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem' }}><Check size={18} color="#10b981" /> Cetak Nota Thermal & QR Tracking</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem' }}><Check size={18} color="#10b981" /> Laporan Laba Bersih & Arus Kas Lengkap</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem' }}><Check size={18} color="#10b981" /> Akses Komunitas & Dompet Saweran</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem' }}><Check size={18} color="#10b981" /> Bantuan Support WhatsApp Prioritas</li>
              </ul>

              <button 
                onClick={() => navigate('/login', { state: { tab: 'register', tier: 'pro' } })}
                style={{
                  width: '100%', padding: '1.05rem', borderRadius: '12px', fontWeight: '800', fontSize: '1rem',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', color: 'white', border: 'none',
                  cursor: 'pointer', boxShadow: '0 4px 18px rgba(14, 165, 233, 0.45)', transition: 'all 0.2s'
                }}
              >
                Pilih Paket Pro (Rp 49rb) ⭐
              </button>
            </div>

            {/* TIER 3: ENTERPRISE (RP 79.000 / BLN) */}
            <div style={{ 
              padding: '2.8rem 2rem', borderRadius: '24px', background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(192, 132, 252, 0.3)', display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ marginBottom: '1.2rem' }}>
                <span style={{ color: '#c084fc', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase' }}>Multi-Branch Network</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '900', marginTop: '4px' }}>Enterprise Cabang</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '6px' }}>Untuk franchise atau pemilik dengan banyak cabang toko.</p>
              </div>

              {/* Strikethrough Price Display */}
              <div style={{ marginBottom: '1.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ textDecoration: 'line-through', color: '#64748b', fontSize: '1.2rem', fontWeight: '700' }}>
                    {billingCycle === 'monthly' ? 'Rp 149.000' : 'Rp 79.000'}
                  </span>
                  <span style={{ background: 'rgba(192, 132, 252, 0.2)', color: '#c084fc', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>
                    {billingCycle === 'monthly' ? 'HEMAT 47%' : 'DISKON 20%'}
                  </span>
                </div>

                <div style={{ fontSize: '2.6rem', fontWeight: '900', color: '#c084fc', margin: '2px 0' }}>
                  {billingCycle === 'monthly' ? 'Rp 79.000' : 'Rp 63.000'} 
                  <span style={{ fontSize: '0.95rem', color: '#94a3b8', fontWeight: 'normal' }}>/bulan</span>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#c084fc', fontWeight: '600' }}>
                  {billingCycle === 'monthly' ? '✓ Promo spesial Rp 79rb/bulan' : '✓ Ditagih tahunan Rp 756.000 (Hemat 20%)'}
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.2rem 0', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem' }}><Check size={18} color="#10b981" /> <strong>Semua Fitur Paket Pro Titan</strong></li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem' }}><Check size={18} color="#10b981" /> Hingga 5 Cabang Toko Terpusat</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem' }}><Check size={18} color="#10b981" /> Transfer Stok Antar Cabang</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem' }}><Check size={18} color="#10b981" /> Custom Domain Pribadi (.com/.id)</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem' }}><Check size={18} color="#10b981" /> Dedicated Account Manager Pribadi</li>
              </ul>

              <button 
                onClick={() => navigate('/login', { state: { tab: 'register', tier: 'enterprise' } })}
                style={{
                  width: '100%', padding: '1.05rem', borderRadius: '12px', fontWeight: '800', fontSize: '1rem',
                  background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)', color: 'white', border: 'none',
                  cursor: 'pointer', boxShadow: '0 4px 18px rgba(147, 51, 234, 0.4)', transition: 'all 0.2s'
                }}
              >
                Pilih Enterprise (Rp 79rb) 🏢
              </button>
            </div>

          </div>

          {/* PAYMENT DETAILS LUXURY BOX */}
          <div id="pembayaran" style={{ 
            marginTop: '4rem', padding: '2.2rem', borderRadius: '24px', 
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '1px solid rgba(14, 165, 233, 0.3)', textAlign: 'left',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
              <CreditCard size={28} color="#38bdf8" />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800' }}>Rekening Resmi Pembayaran & Aktivasi Cepat</h3>
                <p style={{ margin: '2px 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>Transfer biaya langganan promo ke rekening resmi di bawah ini:</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '1.5rem' }}>
              {/* Bank BRI */}
              <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Bank BRI</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#38bdf8', letterSpacing: '1px', margin: '4px 0' }}>
                  2088-01007194505
                </div>
                <div style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>Atas Nama: <strong>SYAIFUDIN</strong></div>
              </div>

              {/* DANA */}
              <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>E-Wallet DANA</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#10b981', letterSpacing: '1px', margin: '4px 0' }}>
                  085382535050
                </div>
                <div style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>Atas Nama: <strong>SYAIFUDIN</strong></div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                ⚡ <em>Setelah transfer, akun Anda akan langsung diaktivasi dalam 1 menit via WhatsApp resmi.</em>
              </div>
              <a 
                href="https://wa.me/6285382535050?text=Halo%20Admin%20AISERVICE,%20saya%20ingin%20tanya/konfirmasi%20promo%20langganan%20aplikasi%20kasir%20ERP." 
                target="_blank" 
                rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: '#25D366', color: 'white', padding: '10px 20px', borderRadius: '10px',
                  fontWeight: '800', fontSize: '0.9rem', textDecoration: 'none', boxShadow: '0 4px 15px rgba(37, 211, 102, 0.35)'
                }}
              >
                Chat WhatsApp Admin (085382535050) 💬
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* FAQ ACCORDION */}
      <section id="faq" style={{ padding: '6rem 2rem', maxWidth: '850px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <span style={{ color: '#38bdf8', fontWeight: '800', fontSize: '0.85rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            FAQ
          </span>
          <h2 style={{ fontSize: '2.4rem', fontWeight: '900', marginTop: '0.5rem' }}>
            Pertanyaan yang Sering Diajukan
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {faqs.map((faq, idx) => (
            <div 
              key={idx}
              onClick={() => toggleFaq(idx)}
              style={{
                borderRadius: '16px', background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)', padding: '1.5rem 2rem',
                cursor: 'pointer', transition: 'background 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700', fontSize: '1.05rem' }}>
                <span>{faq[0]}</span>
                <span style={{ color: '#38bdf8', fontSize: '1.4rem' }}>{openFaq === idx ? '−' : '+'}</span>
              </div>
              {openFaq === idx && (
                <p style={{ color: '#94a3b8', marginTop: '1rem', lineHeight: '1.6', fontSize: '0.95rem' }}>
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
        borderRadius: '30px', background: 'linear-gradient(135deg, #0ea5e9 0%, #1e3a8a 100%)',
        textAlign: 'center', boxShadow: '0 20px 50px rgba(14, 165, 233, 0.3)'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.6rem', fontWeight: '900', color: 'white', marginBottom: '1rem' }}>
            Siap Mengembangkan Usaha Servis Anda Hari Ini?
          </h2>
          <p style={{ fontSize: '1.15rem', color: 'rgba(255, 255, 255, 0.85)', marginBottom: '2.5rem' }}>
            Bergabunglah bersama ratusan pemilik bengkel & toko servis lainnya. Daftar dalam 1 menit tanpa biaya.
          </p>
          <button 
            onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}
            style={{
              padding: '1.1rem 2.8rem', fontSize: '1.15rem', fontWeight: '800', borderRadius: '14px',
              background: 'white', color: '#0f172a', border: 'none', cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)', transition: 'transform 0.2s'
            }}
          >
            Buat Akun Toko Gratis Sekarang 🚀
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ 
        padding: '3.5rem 2rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', 
        background: '#03060d', color: '#64748b', fontSize: '0.9rem' 
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <span style={{ color: 'white', fontWeight: '800', fontSize: '1.15rem' }}>AISERVICE.ID</span>
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
