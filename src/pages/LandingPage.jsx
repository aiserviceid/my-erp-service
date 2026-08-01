import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Smartphone, Laptop, Wrench, Search, LogIn, ChevronRight } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const tenant = useStore((state) => state.tenant);
  const settings = tenant?.settings || { theme: 'laptop', storeName: 'AI SERVICE', ads: [] };

  // Tema Spesifik Icon & Teks
  const getThemeContent = () => {
    switch(settings.theme) {
      case 'hp':
        return { icon: <Smartphone size={64} color="var(--primary)" />, title: 'Ahli Perbaikan Smartphone', subtitle: 'Layanan servis HP profesional, cepat, dan bergaransi.' };
      case 'motor':
        return { icon: <Wrench size={64} color="var(--primary)" />, title: 'Bengkel Motor Terpercaya', subtitle: 'Servis rutin, turun mesin, dan modifikasi motor kesayangan Anda.' };
      case 'laptop':
      default:
        return { icon: <Laptop size={64} color="var(--primary)" />, title: 'Pusat Servis Laptop & Komputer', subtitle: 'Solusi terbaik untuk masalah hardware dan software perangkat Anda.' };
    }
  };

  const themeContent = getThemeContent();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER */}
      <header style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" style={{ height: '40px', borderRadius: '8px' }} />
          ) : (
            <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
              {settings.storeName.charAt(0)}
            </div>
          )}
          <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.5rem' }}>{settings.storeName}</h2>
        </div>
        <div>
          <button onClick={() => navigate('/login')} className="btn btn-ghost">
            <LogIn size={18} /> Internal Login
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center', background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)' }}>
        <div className="animate-fade-in" style={{ marginBottom: '2rem' }}>
          {themeContent.icon}
        </div>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--primary)', maxWidth: '800px' }}>
          {themeContent.title}
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '3rem', maxWidth: '600px' }}>
          {themeContent.subtitle}
        </p>

        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => navigate('/tracking')} className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Search size={20} /> Lacak Status Servis <ChevronRight size={20} />
          </button>
          <a 
            href="/downloads/app-release.apk" 
            download="Aplikasi-Kasir-ERP.apk"
            className="btn btn-accent" 
            style={{ padding: '1rem 2rem', fontSize: '1.1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}
            onClick={(e) => {
              // Graceful download notice if file not yet compiled locally
              console.log('Downloading APK...');
            }}
          >
            <Smartphone size={20} /> Download APK Android (v1.0)
          </a>
        </div>
      </main>

      {/* ANDROID APP SHOWCASE */}
      <section style={{ padding: '4rem 2rem', background: '#f8fafc', textAlign: 'center', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <span className="badge badge-warning" style={{ padding: '6px 14px', fontSize: '0.85rem', marginBottom: '1rem' }}>Aplikasi Mobile Siap Pakai</span>
          <h2 style={{ fontSize: '2.2rem', color: 'var(--primary)', margin: '0.5rem 0 1rem 0' }}>Bawa Bisnis Anda ke Dalam Genggaman</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
            Kelola transaksi kasir, cek antrian servis teknisi, dan cetak struk nota langsung dari smartphone Android Anda.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', textAlign: 'left' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', background: 'white' }}>
              <div style={{ width: '40px', height: '40px', background: '#dbeafe', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', marginBottom: '1rem', fontWeight: 'bold' }}>⚡</div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>Cepat & Ringan</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Ukuran installer APK sangat kecil dan hemat kuota internet.</p>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', background: 'white' }}>
              <div style={{ width: '40px', height: '40px', background: '#dcfce7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', marginBottom: '1rem', fontWeight: 'bold' }}>🔒</div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>Login PIN Aman</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Mendukung akses khusus kasir & teknisi dengan PIN terenkripsi.</p>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', background: 'white' }}>
              <div style={{ width: '40px', height: '40px', background: '#fef3c7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', marginBottom: '1rem', fontWeight: 'bold' }}>📦</div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>Auto-Sync Cloud</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Semua data otomatis tersinkronisasi dengan dashboard web secara realtime.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ADS / PROMO SECTION */}
      {settings.ads && settings.ads.length > 0 && (
        <section style={{ padding: '4rem 2rem', background: 'white', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '2rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Promo & Info Terbaru</h3>
          <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', padding: '1rem', justifyContent: 'center' }}>
            {settings.ads.map(ad => (
              <div key={ad.id} className="glass-panel" style={{ minWidth: '300px', maxWidth: '400px', padding: 0, overflow: 'hidden' }}>
                <img src={ad.imageUrl} alt={ad.title} style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                <div style={{ padding: '1.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1.2rem' }}>{ad.title}</h4>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer style={{ padding: '2rem', textAlign: 'center', background: 'var(--primary)', color: 'white' }}>
        <p style={{ margin: 0, opacity: 0.8 }}>&copy; {new Date().getFullYear()} {settings.storeName}. All rights reserved.</p>
        
        {/* WATERMARK FREE TIER */}
        {useStore.getState().tenant.tier === 'free' && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <p style={{ fontSize: '0.85rem', color: '#fbbf24', margin: 0 }}>
              ⚡ Powered by <strong>AI SERVICE</strong> - Buat Aplikasi Tokomu Sekarang!
            </p>
          </div>
        )}
      </footer>
    </div>
  );
}
