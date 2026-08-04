import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Smartphone, Laptop, Wrench, Search, LogIn, ChevronRight, Check, X,
  Zap, ShieldCheck, Star, Users, BarChart3, Printer, Clock, 
  MessageSquare, Sparkles, HelpCircle, ArrowRight, Download, CheckCircle2,
  CreditCard, Flame, Award, Layers, TrendingUp, PhoneCall, Play
} from 'lucide-react';
import { useStore } from '../store/useStore';

export default function LandingPage() {
  const navigate = useNavigate();
  const setTenant = useStore(state => state.setTenant);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [openFaq, setOpenFaq] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [demoStep, setDemoStep] = useState(1);

  // Auto-play timer for Interactive 45s Video Demo Player
  useEffect(() => {
    const timer = setInterval(() => {
      setDemoStep(prev => (prev >= 4 ? 1 : prev + 1));
    }, 2800);
    return () => clearInterval(timer);
  }, []);

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
            <span>SISTEM OPERASIONAL TOKO SERVIS MODERN</span>
          </div>

          {/* Headline */}
          <h1 style={{ 
            fontSize: 'clamp(2.4rem, 5.2vw, 4.2rem)', fontWeight: '900', lineHeight: '1.16', 
            letterSpacing: '-1.5px', marginBottom: '1.4rem', color: '#0f172a'
          }}>
            Bikin Toko Servis Berjalan Otomatis: Anti Lupa Servis, Bebas Stok Bocor & Omzet Naik!
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: 'clamp(1.05rem, 2vw, 1.25rem)', color: '#475569', lineHeight: '1.65', maxWidth: '820px', margin: '0 auto 2.8rem auto' }}>
            Bukan sekadar aplikasi, ini adalah <strong>Sistem Operasional Toko Servis Modern</strong> yang dirancang khusus untuk pemilik toko HP, komputer, & bengkel. Cegah pelanggan kabur, cegah komplain nota hilang, dan pantau laba bersih secara otomatis tanpa perlu pusing rekap manual.
          </p>

          {/* CTA Buttons (Termasuk Live Demo 1-Klik) */}
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3.5rem' }}>
            <button 
              onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}
              style={{
                padding: '1.1rem 2.4rem', fontSize: '1.05rem', fontWeight: '800', borderRadius: '14px',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', color: 'white', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                boxShadow: '0 8px 25px rgba(2, 132, 199, 0.35)', transition: 'all 0.2s'
              }}
            >
              Modernkan Toko Anda Gratis <ArrowRight size={20} />
            </button>

            {/* LIVE DEMO 1-KLIK DIRECT HERO BUTTON */}
            <button 
              onClick={() => {
                setTenant('DEMO-STORE', 'Toko Servis Laptop & PC (Demo)', '', 'pro', 'token_demo_123');
                useStore.getState().updateTenantSettings({
                  storeName: 'Toko Servis Laptop & PC (Demo)',
                  store_wa: '081234567890',
                  theme: 'laptop'
                });
                navigate('/admin');
              }}
              style={{
                padding: '1.1rem 2.2rem', fontSize: '1.05rem', fontWeight: '800', borderRadius: '14px',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', color: '#15803d', border: '1px solid #86efac',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                boxShadow: '0 4px 15px rgba(22, 163, 74, 0.2)', transition: 'all 0.2s'
              }}
            >
              ✨ Coba Live Demo 1-Klik (Tanpa Daftar) 🚀
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
              <Download size={20} color="#059669" /> APK Android (v1.0)
            </a>
          </div>

          {/* 🎬 DEMO PLAYER 45 DETIK MOCKUP CONTAINER */}
          <div style={{
            maxWidth: '860px', margin: '0 auto 4rem auto', borderRadius: '24px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            padding: '1.8rem', color: 'white', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.35)',
            border: '1px solid #334155', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#94a3b8', marginLeft: '8px' }}>🎥 DEMO SISTEM OPERASIONAL (45 DETIK)</span>
              </div>
              <div style={{ background: '#0284c7', color: 'white', padding: '4px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '900' }}>
                ⏱️ Waktu Operasional: 45 Detik
              </div>
            </div>

            {/* REAL HTML5 SCREENCAST ANIMATED VIDEO PLAYER ENGINE */}
            <div 
              onClick={() => setShowVideoModal(true)}
              style={{
                background: '#020617', borderRadius: '18px', padding: '0',
                border: '1px solid #334155', minHeight: '320px', display: 'flex', flexDirection: 'column',
                position: 'relative', cursor: 'pointer', overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
              }}
            >
              {/* Browser Window Bar Header */}
              <div style={{
                background: '#1e293b', padding: '10px 16px', borderBottom: '1px solid #334155',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                  <div style={{
                    background: '#0f172a', padding: '3px 14px', borderRadius: '6px', fontSize: '0.72rem',
                    color: '#94a3b8', border: '1px solid #334155', fontFamily: 'monospace', marginLeft: '10px'
                  }}>
                    https://aiservice.id/demo-operasional-toko.mp4
                  </div>
                </div>
                <div style={{ background: '#059669', color: 'white', padding: '2px 10px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '900' }}>
                  🔴 FULL HD 1080P • LIVE SCREENCAST
                </div>
              </div>

              {/* Live Animated Video Screen Viewport */}
              <div style={{
                flex: 1, padding: '2rem 1.5rem', background: '#090d16', position: 'relative',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                minHeight: '220px'
              }}>
                {/* Moving Animated Cursor Simulation */}
                <div style={{
                  position: 'absolute',
                  top: demoStep === 1 ? '35%' : demoStep === 2 ? '50%' : demoStep === 3 ? '65%' : '40%',
                  left: demoStep === 1 ? '45%' : demoStep === 2 ? '70%' : demoStep === 3 ? '30%' : '60%',
                  transition: 'all 1.2s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 10, pointerEvents: 'none'
                }}>
                  <div style={{
                    width: '0', height: '0',
                    borderLeft: '10px solid transparent', borderRight: '10px solid transparent',
                    borderBottom: '18px solid #38bdf8', transform: 'rotate(-30deg)', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))'
                  }} />
                </div>

                {/* Video Play Overlay Central Button */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  width: '68px', height: '68px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.9) 0%, rgba(37, 99, 235, 0.9) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 40px rgba(2, 132, 199, 0.8)', zIndex: 5, backdropFilter: 'blur(4px)'
                }}>
                  <Play size={32} color="white" style={{ marginLeft: '4px' }} />
                </div>

                {/* Animated UI Screen Simulation Frame */}
                <div style={{
                  background: '#0f172a', border: '1px solid #334155', borderRadius: '16px',
                  padding: '1.2rem 1.6rem', maxWidth: '650px', width: '100%', textAlignment: 'left',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)', position: 'relative'
                }}>
                  {demoStep === 1 && (
                    <div style={{ textAlign: 'left', animation: 'fadeIn 0.4s ease-out' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: '#38bdf8', fontWeight: '800', fontSize: '0.85rem' }}>📝 FORM PENDAFTARAN SERVIS BARU</span>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>00:10 / 00:45</span>
                      </div>
                      <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', fontSize: '0.85rem', color: '#f8fafc', fontWeight: '700' }}>
                        Unit: Laptop ASUS ROG Strix GL553 • Keluhan: Mati Total
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <span style={{ background: '#0284c7', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700' }}>Garansi Active</span>
                        <span style={{ background: '#059669', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700' }}>Estimasi Rp 450.000</span>
                      </div>
                    </div>
                  )}

                  {demoStep === 2 && (
                    <div style={{ textAlign: 'left', animation: 'fadeIn 0.4s ease-out' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: '#4ade80', fontWeight: '800', fontSize: '0.85rem' }}>🧾 CETAK STRUK THERMAL BLUETOOTH</span>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>00:20 / 00:45</span>
                      </div>
                      <div style={{ background: '#ffffff', color: '#0f172a', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontFamily: 'monospace', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                        <div>--- AISERVICE TOKO KOMPUTER ---</div>
                        <div>RESI: #TRX-1001 • PASS QR: 9812</div>
                        <div>STATUS: DITERIMA (SIAP DICEK)</div>
                        <div style={{ color: '#0284c7', fontWeight: 'bold', marginTop: '4px' }}>[ Scan QR Code di HP Pelanggan ]</div>
                      </div>
                    </div>
                  )}

                  {demoStep === 3 && (
                    <div style={{ textAlign: 'left', animation: 'fadeIn 0.4s ease-out' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: '#facc15', fontWeight: '800', fontSize: '0.85rem' }}>📱 PELANGGAN CEK STATUS DIRESI DARI HP</span>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>00:30 / 00:45</span>
                      </div>
                      <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '8px', border: '1px solid #eab308', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.8rem' }}>📱</span>
                        <div>
                          <div style={{ color: '#facc15', fontWeight: '800', fontSize: '0.88rem' }}>Status Realtime: MENUNGGU SPAREPART</div>
                          <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Pelanggan tidak perlu telepon / SMS toko (Cek Otomatis 24 Jam)</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {demoStep === 4 && (
                    <div style={{ textAlign: 'left', animation: 'fadeIn 0.4s ease-out' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: '#c084fc', fontWeight: '800', fontSize: '0.85rem' }}>💬 NOTIFIKASI WHATSAPP BOT TERKIRIM</span>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>00:45 / 00:45</span>
                      </div>
                      <div style={{ background: '#052e16', border: '1px solid #22c55e', padding: '10px 14px', borderRadius: '8px', color: '#dcfce7', fontSize: '0.82rem', lineHeight: '1.5' }}>
                        💬 <strong>WhatsApp Notification:</strong> "Halo Bpk. Budi, servis Laptop ASUS ROG Anda (#TRX-1001) telah SELESAI dikerjakan & siap diambil. Terima kasih!"
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Native Video Player Control Bar */}
              <div style={{
                background: '#0f172a', padding: '10px 18px', borderTop: '1px solid #334155',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Play size={18} color="#38bdf8" />
                  <span style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '700', fontFamily: 'monospace' }}>
                    00:{demoStep * 10 < 10 ? '0' : ''}{demoStep * 10} / 00:45
                  </span>
                </div>

                {/* Progress Bar Timeline */}
                <div style={{ flex: 1, height: '6px', background: '#334155', borderRadius: '100px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(demoStep / 4) * 100}%`, height: '100%',
                    background: 'linear-gradient(90deg, #0284c7 0%, #22c55e 100%)', transition: 'width 0.4s ease'
                  }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: '800' }}>▶️ Klik Video untuk Fullscreen</span>
                </div>
              </div>

            </div>

            {/* 4 Active Step Indicators */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginTop: '1.2rem' }}>
              <div style={{ padding: '10px', borderRadius: '10px', background: demoStep === 1 ? '#0284c7' : '#1e293b', color: demoStep === 1 ? 'white' : '#94a3b8', fontSize: '0.78rem', fontWeight: '800', transition: 'all 0.3s' }}>1. 📝 Input Servis (10s)</div>
              <div style={{ padding: '10px', borderRadius: '10px', background: demoStep === 2 ? '#0284c7' : '#1e293b', color: demoStep === 2 ? 'white' : '#94a3b8', fontSize: '0.78rem', fontWeight: '800', transition: 'all 0.3s' }}>2. 🧾 Cetak Struk (10s)</div>
              <div style={{ padding: '10px', borderRadius: '10px', background: demoStep === 3 ? '#0284c7' : '#1e293b', color: demoStep === 3 ? 'white' : '#94a3b8', fontSize: '0.78rem', fontWeight: '800', transition: 'all 0.3s' }}>3. 📱 Scan QR (10s)</div>
              <div style={{ padding: '10px', borderRadius: '10px', background: demoStep === 4 ? '#0284c7' : '#1e293b', color: demoStep === 4 ? 'white' : '#94a3b8', fontSize: '0.78rem', fontWeight: '800', transition: 'all 0.3s' }}>4. 💬 Notif WA (15s)</div>
            </div>
          </div>

          {/* Trust Stat Grid - Focused on Owner Desires */}
          <div style={{ 
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', 
            padding: '1.8rem', borderRadius: '20px', background: '#ffffff', 
            border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)'
          }}>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#0284c7' }}>🛡️ Anti Pelanggan Kabur</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px', fontWeight: '600' }}>Notif WA & Tracking 24/7</div>
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#059669' }}>📋 Anti Lupa Servis</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px', fontWeight: '600' }}>Manajemen Resi & Status</div>
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#d97706' }}>📦 Anti Hilang Stok</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px', fontWeight: '600' }}>Kontrol Sparepart Real-Time</div>
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#7c3aed' }}>📈 Laba Bersih Otomatis</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px', fontWeight: '600' }}>Tanpa Rekap Buku Manual</div>
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
            
            {/* TIER 0: GRATIS (FREE FOREVER) */}
            <div style={{ 
              padding: '2.8rem 2rem', borderRadius: '24px', background: '#f8fafc',
              border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)'
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ color: '#64748b', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase' }}>Mulai Dari Sini</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '900', marginTop: '4px', color: '#0f172a' }}>Paket Gratis</h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '6px' }}>Coba semua fitur dasar tanpa kartu kredit. Selamanya.</p>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0f172a' }}>
                  Rp 0 <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 'normal' }}>/selamanya</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: '700', marginTop: '4px' }}>
                  ✓ Gratis Selamanya — Tanpa Batas Waktu
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.5rem 0', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#334155' }}><Check size={18} color="#059669" /> Manajemen Servis (maks. 50/bln)</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#334155' }}><Check size={18} color="#059669" /> Kasir POS Dasar (maks. 100 transaksi/bln)</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#334155' }}><Check size={18} color="#059669" /> Cek Status Resi Publik 24/7</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#334155' }}><Check size={18} color="#059669" /> Cetak Nota & Stiker Barcode</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#94a3b8' }}><X size={18} /> <strong>Tanpa</strong> Otomatisasi WA Bot</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#94a3b8' }}><X size={18} /> <strong>Tanpa</strong> Portal Karyawan / PIN</li>
              </ul>

              <button 
                onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}
                style={{
                  width: '100%', padding: '1rem', borderRadius: '12px', fontWeight: '700', fontSize: '0.95rem',
                  background: 'transparent', color: '#475569', border: '1px dashed #cbd5e1',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Mulai Gratis Sekarang →
              </button>
            </div>

            {/* TIER 1: STARTER (RP 79.000 / BLN) */}
            <div style={{ 
              padding: '2.8rem 2rem', borderRadius: '24px', background: '#ffffff',
              border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ color: '#0284c7', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase' }}>Starter Toko</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '900', marginTop: '4px', color: '#0f172a' }}>Paket Starter</h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '6px' }}>Solusi operasional hemat untuk konter & perorangan.</p>
              </div>

              {/* Price Display */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0f172a' }}>
                  Rp 79.000 <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 'normal' }}>/bulan</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: '700', marginTop: '4px' }}>
                  ✓ Hemat & Siap Bertransaksi Cepat
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.5rem 0', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#334155' }}><Check size={18} color="#059669" /> Semua Fitur Gratis — Tanpa Batas</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#334155' }}><Check size={18} color="#059669" /> Manajemen Servis & QR Barcode</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#334155' }}><Check size={18} color="#059669" /> Kasir POS Penjualan Cepat</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#334155' }}><Check size={18} color="#059669" /> Cek Resi Publik 24/7</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#94a3b8' }}><X size={18} /> <strong>Tanpa</strong> Otomatisasi WA Bot</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#94a3b8' }}><X size={18} /> <strong>Tanpa</strong> Portal Teknisi PIN</li>
              </ul>

              <button 
                onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}
                style={{
                  width: '100%', padding: '1rem', borderRadius: '12px', fontWeight: '700', fontSize: '0.95rem',
                  background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Pilih Starter (Rp 79rb)
              </button>
            </div>

            {/* TIER 2: PRO TITAN (RP 149.000 / BLN) */}
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
                ⭐ REKOMENDASI UTAMA OWNER
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <span style={{ color: '#0284c7', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase' }}>Pro Store / Bengkel</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '900', marginTop: '4px', color: '#0f172a' }}>Paket Pro</h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '6px' }}>Sistem operasional terlengkap untuk melipatgandakan omzet.</p>
              </div>

              {/* Price Display */}
              <div style={{ marginBottom: '1.8rem' }}>
                <div style={{ fontSize: '2.6rem', fontWeight: '900', color: '#0284c7', margin: '2px 0' }}>
                  Rp 149.000 <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 'normal' }}>/bulan</span>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#059669', fontWeight: '700' }}>
                  ✓ Notif WA Otomatis + Portal Teknisi & Export Excel
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.2rem 0', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#1e293b' }}><Check size={18} color="#059669" /> <strong>UNLIMITED</strong> Servis & Transaksi POS</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#1e293b' }}><Check size={18} color="#059669" /> <strong>Otomatisasi WhatsApp Broadcast & Notif</strong></li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#1e293b' }}><Check size={18} color="#059669" /> <strong>Portal Teknisi & Upload Foto Progress</strong></li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#1e293b' }}><Check size={18} color="#059669" /> <strong>Laporan Laba Bersih & Arus Kas Lengkap</strong></li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#1e293b' }}><Check size={18} color="#059669" /> <strong>Export/Import Data Excel & CSV</strong></li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#1e293b' }}><Check size={18} color="#059669" /> Bantuan Support Prioritas 24/7</li>
              </ul>

              <button 
                onClick={() => navigate('/login', { state: { tab: 'register', tier: 'pro' } })}
                style={{
                  width: '100%', padding: '1.05rem', borderRadius: '12px', fontWeight: '800', fontSize: '1rem',
                  background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', color: 'white', border: 'none',
                  cursor: 'pointer', boxShadow: '0 4px 18px rgba(2, 132, 199, 0.4)', transition: 'all 0.2s'
                }}
              >
                Pilih Paket Pro (Rp 149rb) ⭐
              </button>
            </div>

            {/* TIER 3: ENTERPRISE (SEGERA HADIR / WAITING LIST) */}
            <div style={{ 
              padding: '2.8rem 2rem', borderRadius: '24px', background: '#faf5ff',
              border: '1px solid #d8b4fe', display: 'flex', flexDirection: 'column',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.04)', position: 'relative', opacity: 0.95
            }}>
              <div style={{ marginBottom: '1.2rem' }}>
                <span style={{ color: '#7c3aed', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase' }}>Multi-Branch Network</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '900', marginTop: '4px', color: '#0f172a' }}>Enterprise</h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '6px' }}>Untuk franchise & bisnis servis multi-cabang.</p>
              </div>

              <div style={{ marginBottom: '1.8rem' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#7c3aed', margin: '2px 0' }}>
                  🔒 Segera Hadir
                </div>
                <div style={{ fontSize: '0.82rem', color: '#7c3aed', fontWeight: '700', marginTop: '4px' }}>
                  Tahap Pengembangan Multi-Cabang Terpusat
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.2rem 0', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#64748b' }}><Clock size={18} color="#7c3aed" /> Semua Fitur Paket Pro</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#64748b' }}><Clock size={18} color="#7c3aed" /> Hingga 5 Cabang Toko Terpusat</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#64748b' }}><Clock size={18} color="#7c3aed" /> Transfer Stok Antar Cabang</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', color: '#64748b' }}><Clock size={18} color="#7c3aed" /> Dedicated Account Manager</li>
              </ul>

              <a 
                href="https://wa.me/6285382535050?text=Halo%20Admin%20AISERVICE,%20saya%20tertarik%20dengan%20Paket%20Enterprise%20Multi-Cabang.%20Tolong%20kabari%20saya%20jika%20sudah%20tersedia."
                target="_blank" rel="noreferrer"
                style={{
                  width: '100%', padding: '1.05rem', borderRadius: '12px', fontWeight: '800', fontSize: '0.95rem',
                  background: '#f1f5f9', color: '#7c3aed', border: '1px solid #c4b5fd',
                  textAlign: 'center', textDecoration: 'none', display: 'block', transition: 'all 0.2s'
                }}
              >
                📩 Daftar Waiting List Enterprise
              </a>
            </div>

          </div>

          {/* 🛡️ RISK REVERSAL GARANSI KEPUASAN 30 HARI */}
          <div style={{
            marginTop: '3.5rem', padding: '2rem 2.4rem', borderRadius: '24px',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '2px solid #86efac', textAlign: 'center',
            boxShadow: '0 10px 30px rgba(22, 163, 74, 0.12)'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🛡️</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: '900', color: '#166534' }}>
              Garansi Kepuasan 30 Hari — Uang Kembali 100% Tanpa Syarat
            </h3>
            <p style={{ margin: 0, color: '#15803d', fontSize: '0.95rem', maxWidth: '750px', marginLeft: 'auto', marginRight: 'auto', lineHeight: '1.6' }}>
              Coba AIService.ID selama 30 Hari. Jika aplikasi ini tidak menghemat waktu administrasi toko Anda & tidak memotong 90% pertanyaan pelanggan via WhatsApp, kami kembalikan uang Anda <strong>100% utuh tanpa pertanyaan!</strong>
            </p>
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

      {/* 🎬 FULLSCREEN INTERACTIVE VIDEO DEMO MODAL */}
      {showVideoModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
          animation: 'fadeIn 0.2s ease-out'
        }} onClick={() => setShowVideoModal(false)}>
          <div style={{
            maxWidth: '850px', width: '100%', background: '#0f172a', borderRadius: '24px',
            border: '1px solid #334155', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            color: 'white', position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{ padding: '1.2rem 1.8rem', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.3rem' }}>🎥</span>
                <span style={{ fontWeight: '800', fontSize: '1rem', color: '#f8fafc' }}>
                  Demo Operasional Toko Servis Selesai (45 Detik)
                </span>
              </div>
              <button onClick={() => setShowVideoModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
            </div>

            {/* Video Player Canvas Simulation */}
            <div style={{ padding: '2rem 1.8rem', background: '#020617', textAlign: 'center' }}>
              <div style={{
                background: '#0f172a', border: '2px solid #0284c7', borderRadius: '16px',
                padding: '2.5rem 1.5rem', minHeight: '260px', display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center', boxShadow: '0 10px 30px rgba(2, 132, 199, 0.2)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>
                  {demoStep === 1 ? '📝' : demoStep === 2 ? '🧾' : demoStep === 3 ? '📱' : '💬'}
                </div>
                
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: '900', color: '#38bdf8' }}>
                  {demoStep === 1 ? 'LANGKAH 1: Input Servis Baru'
                 : demoStep === 2 ? 'LANGKAH 2: Cetak Struk Thermal Bluetooth'
                 : demoStep === 3 ? 'LANGKAH 3: Pelanggan Scan QR & Cek Status'
                 : 'LANGKAH 4: Notifikasi WA Otomatis Terkirim'}
                </h3>

                <p style={{ margin: '0 0 1.5rem 0', color: '#cbd5e1', fontSize: '1rem', maxWidth: '600px', lineHeight: '1.6' }}>
                  {demoStep === 1 ? 'Kasir memasukkan data unit (Laptop ASUS ROG Strix), keluhan mati total & estimasi biaya Rp 450.000 dalam 10 detik.'
                 : demoStep === 2 ? 'Printer thermal mencetak struk nota resmi terdaftar lengkap dengan barcode & QR Code tracking untuk pelanggan.'
                 : demoStep === 3 ? 'Pelanggan scan QR code dari HP mereka untuk memantau progres (Dicek ➔ Selesai) 24 jam tanpa perlu menelepon toko.'
                 : 'Begitu status diubah ke SELESAI, sistem otomatis mengirimkan pesan WhatsApp resmi ke HP pelanggan untuk pengambilan unit.'}
                </p>

                {/* Progress bar timeline */}
                <div style={{ width: '100%', maxWidth: '500px', background: '#1e293b', borderRadius: '100px', height: '10px', overflow: 'hidden', margin: '0 auto' }}>
                  <div style={{ width: `${(demoStep / 4) * 100}%`, background: 'linear-gradient(90deg, #0284c7 0%, #22c55e 100%)', height: '100%', transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px', fontWeight: '700' }}>
                  Tahap {demoStep} dari 4 • Otomatis Memutar Simulator (45 Detik)
                </div>
              </div>
            </div>

            {/* Footer Action */}
            <div style={{ padding: '1.2rem 1.8rem', background: '#1e293b', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Ingin mencoba memasukkan data servis sendiri?
              </div>
              <button 
                onClick={() => {
                  setShowVideoModal(false);
                  setTenant('DEMO-STORE', 'Toko Servis Laptop & PC (Demo)', '', 'pro', 'token_demo_123');
                  useStore.getState().updateTenantSettings({ storeName: 'Toko Servis Laptop & PC (Demo)', store_wa: '081234567890', theme: 'laptop' });
                  navigate('/admin');
                }}
                style={{
                  padding: '10px 22px', borderRadius: '12px', background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                  color: 'white', border: 'none', fontWeight: '800', fontSize: '0.92rem', cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(2, 132, 199, 0.4)'
                }}
              >
                🚀 Uji Coba Sendiri Sistem Ini Sekarang (Live Demo)
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
