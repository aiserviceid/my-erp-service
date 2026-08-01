import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Smartphone, Laptop, Wrench, Search, LogIn, ChevronRight, Check, X,
  Zap, ShieldCheck, Star, Users, BarChart3, Printer, Clock, 
  MessageSquare, Sparkles, HelpCircle, ArrowRight, Download, CheckCircle2
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
      "Ya! Paket Starter kami 100% Gratis selamanya tanpa batas waktu. Anda bisa mengelola servis harian, kasir POS dasar, dan cetak nota tanpa perlu kartu kredit."
    ],
    [
      "Bagaimana konsumen saya mengecek progres servis mereka?",
      "Pelanggan cukup membuka menu 'Lacak Servis' atau scan QR barcode pada nota bukti terima servis yang dicetak dari sistem Anda."
    ],
    [
      "Apakah aplikasi ini bisa diinstall di HP Android?",
      "Tentu! Kami menyediakan file APK resmi yang ringan dan responsif, sehingga kasir atau teknisi lapangan bisa langsung menginput data dari smartphone."
    ],
    [
      "Apa keunggulan Fitur Komunitas & Saweran Teknisi?",
      "Teknisi Anda bisa bertanya solusi kerusakan hardware/software ke ribuan teknisi se-Indonesia. Teknisi yang memberikan solusi tepat bisa mendapatkan saweran saldo langsung ke rekening."
    ],
    [
      "Bagaimana jika suatu saat saya ingin upgrade ke Paket Pro?",
      "Anda bisa upgrade kapan saja langsung dari dashboard. Seluruh data transaksi, pelanggan, dan riwayat servis Anda akan tetap aman 100%."
    ]
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* NAVBAR */}
      <nav style={{ 
        position: 'sticky', top: 0, zIndex: 100, 
        backdropFilter: 'blur(16px)', background: 'rgba(9, 13, 22, 0.85)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '1rem 2rem'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          {/* Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div style={{ 
              width: '42px', height: '42px', 
              background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)', 
              borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(14, 165, 233, 0.4)'
            }}>
              <Sparkles size={24} color="white" />
            </div>
            <div>
              <span style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.5px', background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                AISERVICE.ID
              </span>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#38bdf8', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>
                SaaS No. 1 Bengkel & Servis
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <div style={{ display: 'none', gap: '2rem', alignItems: 'center', fontWeight: '500', fontSize: '0.95rem' }} className="desktop-menu">
            <a href="#fitur" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}>Fitur Unggulan</a>
            <a href="#pricing" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}>Harga & Paket</a>
            <a href="#komunitas" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}>Komunitas Teknisi</a>
            <a href="#faq" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}>Tanya Jawab</a>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => navigate('/tracking')}
              style={{
                background: 'rgba(255, 255, 255, 0.05)', color: '#e2e8f0', border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '0.6rem 1.2rem', borderRadius: '10px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
              }}
            >
              <Search size={16} /> Cek Resi
            </button>

            <button 
              onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none',
                padding: '0.6rem 1.3rem', borderRadius: '10px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)', transition: 'all 0.2s'
              }}
            >
              Daftar Toko 🚀
            </button>

            <button 
              onClick={() => navigate('/login', { state: { tab: 'login' } })}
              style={{
                background: 'rgba(255, 255, 255, 0.08)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '0.6rem 1.2rem', borderRadius: '10px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
              }}
            >
              <LogIn size={16} /> Masuk
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section style={{ 
        position: 'relative', padding: '6rem 2rem 5rem 2rem', 
        background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(14, 165, 233, 0.25), rgba(9, 13, 22, 0))',
        textAlign: 'center', overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          
          {/* Badge */}
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '8px', 
            padding: '6px 16px', borderRadius: '100px', 
            background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)',
            color: '#38bdf8', fontSize: '0.85rem', fontWeight: '600', marginBottom: '2rem'
          }}>
            <Sparkles size={16} />
            <span>ERP Generasi Terbaru untuk Servis HP, Laptop, Komputer & Motor</span>
          </div>

          {/* Headline */}
          <h1 style={{ 
            fontSize: 'clamp(2.5rem, 5vw, 4.2rem)', fontWeight: '900', lineHeight: '1.15', 
            letterSpacing: '-1.5px', marginBottom: '1.5rem',
            background: 'linear-gradient(to bottom, #ffffff 40%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            Tingkatkan Omzet Servis & Kendalikan Toko Anda Secara Otomatis.
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: 'clamp(1.1rem, 2vw, 1.35rem)', color: '#94a3b8', lineHeight: '1.6', marginBottom: '3rem', maxWidth: '750px', margin: '0 auto 3rem auto' }}>
            Aplikasi All-in-One: Kasir POS Cepat, Pelacakan Resi Realtime untuk Pelanggan, Cetak Nota Barcode, dan Forum Solusi Teknisi Terintegrasi.
          </p>

          {/* CTA Group */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '4rem' }}>
            <button 
              onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}
              style={{
                padding: '1.1rem 2.4rem', fontSize: '1.1rem', fontWeight: '700', borderRadius: '14px',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', color: 'white', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                boxShadow: '0 8px 30px rgba(14, 165, 233, 0.45)', transform: 'translateY(0)', transition: 'all 0.2s'
              }}
            >
              Daftar Toko Gratis Sekarang <ArrowRight size={20} />
            </button>

            <a 
              href="https://github.com/aiserviceid/my-erp-service/releases/download/v1.0.0/app-release.apk"
              download="Aplikasi-Kasir-ERP.apk"
              style={{
                padding: '1.1rem 2.4rem', fontSize: '1.1rem', fontWeight: '700', borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.05)', color: '#f8fafc', border: '1px solid rgba(255, 255, 255, 0.15)',
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px',
                backdropFilter: 'blur(10px)', transition: 'all 0.2s'
              }}
            >
              <Download size={20} color="#10b981" /> Download APK Android (v1.0)
            </a>
          </div>

          {/* Metrics Preview */}
          <div style={{ 
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', 
            padding: '2rem', borderRadius: '20px', background: 'rgba(15, 23, 42, 0.6)', 
            border: '1px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(20px)'
          }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#38bdf8' }}>100%</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>Cloud Real-Time Database</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#10b981' }}>0 Detik</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>Setup Instan Tanpa Kartu Kredit</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#f59e0b' }}>Multi-Role</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>Owner, Kasir & Teknisi</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#ec4899' }}>Web + APK</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>Akses Laptop & Smartphone</div>
            </div>
          </div>

        </div>
      </section>

      {/* CORE FEATURES SECTION */}
      <section id="fitur" style={{ padding: '6rem 2rem', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <span style={{ color: '#38bdf8', fontWeight: '700', fontSize: '0.9rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
            FITUR UNGGULAN
          </span>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginTop: '0.5rem', letterSpacing: '-0.5px' }}>
            Semua yang Dibutuhkan Bengkel & Toko Servis Anda
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '650px', margin: '1rem auto 0 auto' }}>
            Dirancang khusus dengan alur kerja nyata para pemilik toko servis dan teknisi di Indonesia.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          {/* Card 1: Kasir POS */}
          <div style={{ 
            padding: '2.5rem', borderRadius: '20px', background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)', transition: 'transform 0.3s'
          }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(14, 165, 233, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', marginBottom: '1.5rem' }}>
              <Zap size={28} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '1rem' }}>Kasir POS Cepat & Akurat</h3>
            <p style={{ color: '#94a3b8', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Catat penjualan sparepart dan aksesoris hanya dalam hitungan detik dengan pencarian instan, diskon, dan manajemen stok otomatis.
            </p>
          </div>

          {/* Card 2: Tracking Resi Real-Time */}
          <div style={{ 
            padding: '2.5rem', borderRadius: '20px', background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)', transition: 'transform 0.3s'
          }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', marginBottom: '1.5rem' }}>
              <Clock size={28} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '1rem' }}>Lacak Servis Real-Time</h3>
            <p style={{ color: '#94a3b8', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Pelanggan tidak perlu lagi bolak-balik menanyakan kabar servis via WA. Mereka cukup masukkan nomor resi di website Anda.
            </p>
          </div>

          {/* Card 3: Cetak Nota & Barcode */}
          <div style={{ 
            padding: '2.5rem', borderRadius: '20px', background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)', transition: 'transform 0.3s'
          }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', marginBottom: '1.5rem' }}>
              <Printer size={28} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '1rem' }}>Cetak Nota Barcode Otomatis</h3>
            <p style={{ color: '#94a3b8', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Mendukung printer thermal Bluetooth dan printer kasir USB. Lengkap dengan barcode nomor resi dan rincian biaya jasa + part.
            </p>
          </div>

          {/* Card 4: Multi-Karyawan & PIN */}
          <div style={{ 
            padding: '2.5rem', borderRadius: '20px', background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)', transition: 'transform 0.3s'
          }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc', marginBottom: '1.5rem' }}>
              <Users size={28} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '1rem' }}>Akses Khusus Karyawan & PIN</h3>
            <p style={{ color: '#94a3b8', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Setiap teknisi memiliki portal mandiri untuk mengubah status pengerjaan perangkat tanpa bisa melihat laporan keuangan sensitif toko.
            </p>
          </div>

          {/* Card 5: Komunitas Solusi Teknisi */}
          <div style={{ 
            padding: '2.5rem', borderRadius: '20px', background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)', transition: 'transform 0.3s'
          }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f472b6', marginBottom: '1.5rem' }}>
              <MessageSquare size={28} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '1rem' }}>Forum Komunitas & Saweran</h3>
            <p style={{ color: '#94a3b8', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Tanya jawab skematik & jalur kerusakan. Teknisi yang memberikan solusi terbaik berhak mendapatkan tip saldo (saweran) nyata.
            </p>
          </div>

          {/* Card 6: Laporan Keuangan */}
          <div style={{ 
            padding: '2.5rem', borderRadius: '20px', background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)', transition: 'transform 0.3s'
          }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', marginBottom: '1.5rem' }}>
              <BarChart3 size={28} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '1rem' }}>Laporan Arus Kas Otomatis</h3>
            <p style={{ color: '#94a3b8', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Pantau laba bersih harian, total omzet jasa servis, dan pengeluaran operasional secara instan tanpa perlu rekap manual di buku.
            </p>
          </div>

        </div>
      </section>

      {/* PRICING & TIERS SECTION */}
      <section id="pricing" style={{ padding: '6rem 2rem', background: 'rgba(15, 23, 42, 0.4)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          
          <span style={{ color: '#10b981', fontWeight: '700', fontSize: '0.9rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
            PAKET HARGA FLEKSIBEL
          </span>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginTop: '0.5rem', letterSpacing: '-0.5px' }}>
            Mulai Gratis, Upgrade Sesuai Pertumbuhan Bisnis Anda
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '600px', margin: '1rem auto 2.5rem auto' }}>
            Pilih paket yang paling sesuai dengan kebutuhan cabang dan volume transaksi Anda.
          </p>

          {/* Billing Switch */}
          <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.06)', padding: '4px', borderRadius: '12px', marginBottom: '3.5rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <button 
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '8px 20px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
                background: billingCycle === 'monthly' ? '#0ea5e9' : 'transparent', color: billingCycle === 'monthly' ? 'white' : '#94a3b8',
                transition: 'all 0.2s'
              }}
            >
              Bulanan
            </button>
            <button 
              onClick={() => setBillingCycle('yearly')}
              style={{
                padding: '8px 20px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
                background: billingCycle === 'yearly' ? '#0ea5e9' : 'transparent', color: billingCycle === 'yearly' ? 'white' : '#94a3b8',
                display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
              }}
            >
              Tahunan <span style={{ fontSize: '0.75rem', background: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '100px' }}>Hemat 20%</span>
            </button>
          </div>

          {/* Pricing Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', textAlign: 'left' }}>
            
            {/* TIER 1: FREE STARTER */}
            <div style={{ 
              padding: '3rem 2rem', borderRadius: '24px', background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ color: '#38bdf8', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Starter Toko</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '4px' }}>Gratis Selamanya</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '8px' }}>Cocok untuk toko servis pemula dan teknisi perorangan.</p>
              </div>

              <div style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '2rem' }}>
                Rp 0 <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 'normal' }}>/bulan</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.5rem 0', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}><Check size={18} color="#10b981" /> Hingga 50 Servis / bulan</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}><Check size={18} color="#10b981" /> Kasir POS & Data Sparepart</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}><Check size={18} color="#10b981" /> Cek Status Resi Online Pelanggan</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}><Check size={18} color="#10b981" /> 1 Akun Admin Toko</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}><Check size={18} color="#10b981" /> Cetak Nota Resi Barcode</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', color: '#64748b' }}><X size={18} /> Multi-Karyawan & Multi-Teknisi</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', color: '#64748b' }}><X size={18} /> Custom Logo & Template Nota Sendiri</li>
              </ul>

              <button 
                onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}
                style={{
                  width: '100%', padding: '1rem', borderRadius: '12px', fontWeight: '700', fontSize: '1rem',
                  background: 'rgba(255, 255, 255, 0.08)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.15)',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Gunakan Gratis Sekarang
              </button>
            </div>

            {/* TIER 2: PRO TITAN (FEATURED) */}
            <div style={{ 
              padding: '3rem 2rem', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(14, 165, 233, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '2px solid #0ea5e9', display: 'flex', flexDirection: 'column', position: 'relative',
              boxShadow: '0 20px 40px rgba(14, 165, 233, 0.2)'
            }}>
              <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', color: 'white', padding: '4px 16px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>
                PALING POPULER
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ color: '#38bdf8', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Pro Bengkel / Store</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '4px' }}>Paket Pro Titan</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '8px' }}>Untuk toko ramai yang membutuhkan fitur multi-teknisi & branding.</p>
              </div>

              <div style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '2rem' }}>
                {billingCycle === 'monthly' ? 'Rp 79.000' : 'Rp 63.000'} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 'normal' }}>/bulan</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.5rem 0', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}><Check size={18} color="#10b981" /> <strong>UNLIMITED</strong> Servis & Transaksi POS</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}><Check size={18} color="#10b981" /> <strong>Multi-Karyawan</strong> (Kasir & Teknisi Khusus)</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}><Check size={18} color="#10b981" /> Custom Logo Toko & Nama Usaha Sendiri</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}><Check size={18} color="#10b981" /> Cetak Nota Thermal & QR Code Tracking</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}><Check size={18} color="#10b981" /> Laporan Laba Bersih & Arus Kas Lengkap</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}><Check size={18} color="#10b981" /> Akses Penuh Komunitas & Dompet Saweran</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}><Check size={18} color="#10b981" /> Prioritas Bantuan Support WhatsApp 24/7</li>
              </ul>

              <button 
                onClick={() => navigate('/login', { state: { tab: 'register', tier: 'pro' } })}
                style={{
                  width: '100%', padding: '1rem', borderRadius: '12px', fontWeight: '700', fontSize: '1rem',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', color: 'white', border: 'none',
                  cursor: 'pointer', boxShadow: '0 4px 15px rgba(14, 165, 233, 0.4)', transition: 'all 0.2s'
                }}
              >
                Pilih Paket Pro Titan ⭐
              </button>
            </div>

            {/* TIER 3: ENTERPRISE MULTI-CABANG */}
            <div style={{ 
              padding: '3rem 2rem', borderRadius: '24px', background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ color: '#c084fc', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Multi-Branch</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '4px' }}>Enterprise Cabang</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '8px' }}>Untuk jaringan franchise atau bisnis dengan banyak cabang toko.</p>
              </div>

              <div style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '2rem' }}>
                {billingCycle === 'monthly' ? 'Rp 199.000' : 'Rp 159.000'} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 'normal' }}>/bulan</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.5rem 0', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}><Check size={18} color="#10b981" /> <strong>Semua Fitur Paket Pro</strong></li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}><Check size={18} color="#10b981" /> Hingga 5 Cabang Toko Terpusat</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}><Check size={18} color="#10b981" /> Transfer Stok Antar Cabang</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}><Check size={18} color="#10b981" /> Custom Domain Pribadi (.com / .id)</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}><Check size={18} color="#10b981" /> Dedicated Account Manager</li>
              </ul>

              <button 
                onClick={() => navigate('/login', { state: { tab: 'register', tier: 'enterprise' } })}
                style={{
                  width: '100%', padding: '1rem', borderRadius: '12px', fontWeight: '700', fontSize: '1rem',
                  background: 'rgba(255, 255, 255, 0.08)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.15)',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Hubungi Kami (Enterprise)
              </button>
            </div>

          </div>

          {/* Payment Notice Banner */}
          <div style={{ 
            marginTop: '3.5rem', padding: '1.5rem 2rem', borderRadius: '16px', 
            background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', textAlign: 'center'
          }}>
            <CreditCard size={24} color="#38bdf8" />
            <div style={{ fontSize: '0.95rem', color: '#cbd5e1' }}>
              <strong>Metode Pembayaran Resmi Aktivasi:</strong> Bank BRI <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>2088-01007194505</span> & E-Wallet DANA <span style={{ color: '#10b981', fontWeight: 'bold' }}>085382535050</span> a/n <strong>SYAIFUDIN</strong> (Aktivasi Cepat via WA)
            </div>
          </div>

        </div>
      </section>

      {/* FAQ ACCORDION */}
      <section id="faq" style={{ padding: '6rem 2rem', maxWidth: '850px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <span style={{ color: '#38bdf8', fontWeight: '700', fontSize: '0.9rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
            FAQ
          </span>
          <h2 style={{ fontSize: '2.4rem', fontWeight: '800', marginTop: '0.5rem' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700', fontSize: '1.1rem' }}>
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
        borderRadius: '30px', background: 'linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)',
        textAlign: 'center', boxShadow: '0 20px 50px rgba(14, 165, 233, 0.3)'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '900', color: 'white', marginBottom: '1rem' }}>
            Siap Mengembangkan Usaha Servis Anda Hari Ini?
          </h2>
          <p style={{ fontSize: '1.2rem', color: 'rgba(255, 255, 255, 0.85)', marginBottom: '2.5rem' }}>
            Bergabunglah bersama ratusan pemilik bengkel & toko servis lainnya. Daftar dalam 1 menit tanpa biaya.
          </p>
          <button 
            onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}
            style={{
              padding: '1.1rem 2.8rem', fontSize: '1.15rem', fontWeight: '800', borderRadius: '14px',
              background: 'white', color: '#0f172a', border: 'none', cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)', transition: 'transform 0.2s'
            }}
          >
            Buat Akun Toko Gratis Sekarang 🚀
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ 
        padding: '3rem 2rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', 
        background: '#06090f', color: '#64748b', fontSize: '0.9rem' 
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <span style={{ color: 'white', fontWeight: '700', fontSize: '1.1rem' }}>AISERVICE.ID</span>
            <p style={{ margin: '4px 0 0 0' }}>Sistem ERP Kasir & Pelacakan Servis Terpadu se-Indonesia.</p>
          </div>
          <div>
            &copy; {new Date().getFullYear()} AISERVICE.ID. Hak Cipta Dilindungi.
          </div>
        </div>
      </footer>

    </div>
  );
}
