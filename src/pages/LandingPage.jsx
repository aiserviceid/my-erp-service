import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ClipboardCheck,
  MessageCircle,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  UsersRound,
  Wrench,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { APP_VERSION, APK_DOWNLOAD_PATH, APK_FILE_NAME } from '../config/appInfo';
import UnitProLogo from '../components/UnitProLogo';
import './LandingPage.css';

const salesWhatsapp = import.meta.env.VITE_SALES_WHATSAPP || '6281234567890';
const whatsappUrl = `https://wa.me/${salesWhatsapp}?text=${encodeURIComponent('Halo UnitPro, saya ingin coba aplikasi untuk toko servis saya.')}`;

const coreFeatures = [
  {
    icon: ClipboardCheck,
    title: 'Servis lebih rapi',
    text: 'Catat pelanggan, keluhan, unit, teknisi, biaya, nota, dan status dari satu tempat.',
  },
  {
    icon: UsersRound,
    title: 'Teknisi jelas tugasnya',
    text: 'Kasir bisa menugaskan servis ke teknisi dan progres kerja lebih mudah dipantau.',
  },
  {
    icon: ShoppingCart,
    title: 'Kasir & stok tersambung',
    text: 'Penjualan sparepart dan jasa masuk ke laporan tanpa rekap manual berulang.',
  },
  {
    icon: MessageCircle,
    title: 'Pelanggan bisa tracking',
    text: 'Pelanggan cek status servis lewat resi, jadi admin tidak terus ditanya lewat WhatsApp.',
  },
];

const painPoints = [
  'Status servis sering lupa di-update',
  'Nota, stok, dan laporan masih tercecer',
  'Pelanggan sering tanya: “HP saya sudah jadi?”',
];

function BrandLogo() {
  return (
    <span className="simple-brand-logo">
      <UnitProLogo size={54} wordmark />
    </span>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const setTenant = useStore((state) => state.setTenant);

  const startDemo = (role = 'owner') => {
    const demoSettings = {
      storeName: 'UnitPro Demo Store',
      store_wa: '081234567890',
      theme: 'default',
      bank_name: 'BCA',
      bank_account: '1234567890',
      bank_holder: 'UnitPro Demo Store',
      receipt_note_service: 'Simpan nota ini sebagai bukti pengambilan.',
      receipt_note_pos: 'Terima kasih sudah berbelanja.',
    };

    setTenant('DEMO-STORE', 'UnitPro Demo Store', '', 'pro', 'token_demo_123', '081234567890', demoSettings);
    useStore.getState().updateTenantSettings(demoSettings);

    if (role === 'kasir') {
      useStore.getState().setEmployee({
        id: 'EMP-3',
        name: 'Citra (Kasir Demo)',
        role: 'KASIR',
        pin: '1111',
        phone: '081234567803',
        tenant_code: 'DEMO-STORE',
        token: 'demo-kasir-token',
      });
      navigate('/employee');
      return;
    }

    if (role === 'teknisi') {
      useStore.getState().setEmployee({
        id: 'EMP-1',
        name: 'Andi (Teknisi Demo)',
        role: 'TEKNISI',
        pin: '1234',
        phone: '081234567801',
        tenant_code: 'DEMO-STORE',
        token: 'demo-teknisi-token',
      });
      navigate('/employee');
      return;
    }

    useStore.getState().clearEmployee?.();
    navigate('/admin');
  };

  const registerFree = () => navigate('/login', { state: { tab: 'register', tier: 'free' } });
  const login = () => navigate('/login', { state: { tab: 'login' } });

  return (
    <main className="simple-landing">
      <nav className="simple-nav">
        <button type="button" className="simple-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <BrandLogo />
        </button>
        <div className="simple-nav-links">
          <a href="#fitur">Fitur</a>
          <a href="#harga">Harga</a>
          <button type="button" onClick={login}>Masuk</button>
        </div>
      </nav>

      <section className="simple-hero">
        <div className="simple-hero-copy">
          <p className="simple-kicker"><Wrench size={16} /> Untuk toko servis HP, laptop, dan elektronik</p>
          <h1>Satu aplikasi untuk mengatur servis, kasir, stok, teknisi, dan pelanggan.</h1>
          <p className="simple-subtitle">
            UnitPro membantu toko servis bekerja lebih rapi dari unit masuk sampai unit diambil pelanggan.
          </p>
          <div className="simple-actions">
            <button type="button" className="simple-btn primary" onClick={registerFree}>
              Coba gratis <ArrowRight size={18} />
            </button>
            <button type="button" className="simple-btn secondary" onClick={() => startDemo('owner')}>
              Lihat demo
            </button>
            <a className="simple-btn ghost" href={whatsappUrl} target="_blank" rel="noreferrer">
              <MessageCircle size={18} /> Konsultasi
            </a>
          </div>
          <p className="simple-note">Tidak perlu install server. Bisa dibuka dari browser dan Android.</p>
        </div>

        <aside className="simple-hero-card" aria-label="Ringkasan manfaat UnitPro">
          <div className="simple-card-header">
            <span><CheckCircle2 size={22} /></span>
            <div>
              <strong>Alur toko lebih terkendali</strong>
              <small>Kasir → Teknisi → Pelanggan → Owner</small>
            </div>
          </div>
          <div className="simple-flow-list">
            <p><span>1</span> Kasir input servis dan cetak nota</p>
            <p><span>2</span> Teknisi update progres kerja</p>
            <p><span>3</span> Pelanggan cek status lewat resi</p>
            <p><span>4</span> Owner melihat laporan toko</p>
          </div>
        </aside>
      </section>

      <section className="simple-proof">
        <div><strong>Servis</strong><span>resi, status, nota</span></div>
        <div><strong>Kasir</strong><span>penjualan & stok</span></div>
        <div><strong>Teknisi</strong><span>tugas & progres</span></div>
        <div><strong>Laporan</strong><span>omzet & arus kas</span></div>
      </section>

      <section className="simple-section simple-two-column">
        <div>
          <p className="simple-kicker">Masalah umum</p>
          <h2>Kalau toko makin ramai, catatan manual mulai bikin repot.</h2>
        </div>
        <div className="simple-pain-box">
          {painPoints.map((item) => (
            <p key={item}><Check size={17} /> {item}</p>
          ))}
        </div>
      </section>

      <section id="fitur" className="simple-section">
        <div className="simple-section-head">
          <p className="simple-kicker">Fitur inti</p>
          <h2>Cukup fitur yang benar-benar dipakai toko setiap hari.</h2>
        </div>
        <div className="simple-feature-grid">
          {coreFeatures.map(({ icon: Icon, title, text }) => (
            <article className="simple-feature-card" key={title}>
              <span><Icon size={22} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="simple-demo-strip">
        <div>
          <p className="simple-kicker">Demo cepat</p>
          <h2>Coba dulu sebelum dipakai di toko.</h2>
          <p>Pilih peran dan langsung masuk ke aplikasi demo.</p>
        </div>
        <div className="simple-demo-actions">
          <button type="button" onClick={() => startDemo('owner')}><BarChart3 size={18} /> Owner</button>
          <button type="button" onClick={() => startDemo('kasir')}><ShoppingCart size={18} /> Kasir</button>
          <button type="button" onClick={() => startDemo('teknisi')}><Wrench size={18} /> Teknisi</button>
        </div>
      </section>

      <section id="harga" className="simple-section simple-pricing-section">
        <div className="simple-section-head">
          <p className="simple-kicker">Harga</p>
          <h2>Mulai gratis. Upgrade saat toko sudah nyaman pakai.</h2>
        </div>
        <div className="simple-pricing-grid">
          <article className="simple-price-card">
            <h3>Gratis</h3>
            <p className="simple-price">Rp0</p>
            <ul>
              <li><Check size={16} /> Catat servis dasar</li>
              <li><Check size={16} /> Tracking pelanggan</li>
              <li><Check size={16} /> Kasir dan stok dasar</li>
            </ul>
            <button type="button" className="simple-btn secondary full" onClick={registerFree}>Mulai gratis</button>
          </article>

          <article className="simple-price-card featured">
            <span className="simple-badge">Rekomendasi</span>
            <h3>UnitPro Pro</h3>
            <p className="simple-price">Rp99.000<span>/bulan</span></p>
            <ul>
              <li><Check size={16} /> Servis, kasir, stok, teknisi</li>
              <li><Check size={16} /> Nota dan QR tracking</li>
              <li><Check size={16} /> WhatsApp pelanggan</li>
              <li><Check size={16} /> Laporan owner</li>
            </ul>
            <button type="button" className="simple-btn primary full" onClick={registerFree}>Coba Pro</button>
          </article>
        </div>
      </section>

      <section className="simple-section simple-apk-box">
        <div>
          <p className="simple-kicker"><Smartphone size={15} /> Android</p>
          <h2>Butuh aplikasi di HP?</h2>
          <p>APK debug tersedia untuk tes internal. Untuk dibagikan ke pelanggan banyak, gunakan signed release APK/AAB.</p>
        </div>
        <a className="simple-btn secondary" href={APK_DOWNLOAD_PATH} download={APK_FILE_NAME}>
          Download APK v{APP_VERSION}
        </a>
      </section>

      <section className="simple-final-cta">
        <ShieldCheck size={30} />
        <h2>Mulai rapikan toko servis kamu hari ini.</h2>
        <p>Jangan tunggu toko makin ramai baru sistemnya dibenahi.</p>
        <div className="simple-actions center">
          <button type="button" className="simple-btn primary" onClick={registerFree}>Coba gratis</button>
          <a className="simple-btn ghost" href={whatsappUrl} target="_blank" rel="noreferrer">Tanya dulu</a>
        </div>
      </section>

      <footer className="simple-footer">
        <span>© {new Date().getFullYear()} UnitPro</span>
        <span>Software operasional toko servis</span>
      </footer>
    </main>
  );
}
