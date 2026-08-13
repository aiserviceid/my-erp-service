import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  HelpCircle,
  Lock,
  MessageCircle,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  UsersRound,
  Wrench,
  X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { APP_VERSION, APK_DOWNLOAD_PATH, APK_FILE_NAME } from '../config/appInfo';
import UnitProLogo from '../components/UnitProLogo';
import { t, getAppLanguage } from '../utils/i18n';
import { fetchAppVersionInfo } from '../utils/versionUtils';
import './LandingPage.css';


const salesWhatsapp = import.meta.env.VITE_SALES_WHATSAPP || '6281234567890';
const whatsappUrl = `https://wa.me/${salesWhatsapp}?text=${encodeURIComponent('Halo UnitPro, saya ingin coba aplikasi untuk toko servis saya.')}`;
const partnerWhatsappUrl = `https://wa.me/${salesWhatsapp}?text=${encodeURIComponent('Halo UnitPro, saya ingin bahas paket White Label / branding sendiri.')}`;

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

const packages = [
  {
    name: 'Free',
    subtitle: 'Untuk mulai coba',
    price: 'Rp0',
    period: '/selamanya',
    features: ['25 servis/bulan', '50 transaksi kasir/bulan', '50 produk/sparepart', 'Nota & tracking dasar'],
    action: 'Mulai gratis',
    type: 'free',
  },
  {
    name: 'UnitPro Pro',
    subtitle: 'Untuk toko servis aktif',
    price: 'Rp99.000',
    period: '/bulan',
    badge: 'Rekomendasi',
    featured: true,
    features: ['Servis, kasir, stok unlimited', 'Tim teknisi hingga 20 akun', 'WhatsApp pelanggan & CRM', 'Laporan owner & export Excel'],
    action: 'Coba Pro',
    type: 'pro',
  },
  {
    name: 'Enterprise',
    subtitle: 'Untuk banyak cabang',
    price: 'Rp299rb+',
    period: '/bulan',
    features: ['Hingga 5 cabang/outlet', 'Hingga 50 akun karyawan', 'Laporan cabang', 'Prioritas setup'],
    action: 'Konsultasi',
    type: 'enterprise',
  },
  {
    name: 'White Label',
    subtitle: 'Paket khusus brand sendiri',
    price: 'Hubungi Partner',
    period: '',
    badge: 'Partner',
    partner: true,
    features: ['Logo, warna, domain sendiri', 'APK/branding khusus', 'Panel kelola client/toko', 'Managed service'],
    action: 'Hubungi Partner',
    type: 'partner',
  },
];

function BrandLogo() {
  return (
    <span className="simple-brand-logo">
      <UnitProLogo variant="wordmark" size={58} width={230} />
    </span>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const setTenant = useStore((state) => state.setTenant);
  const currentLang = getAppLanguage();
  const [versionInfo, setVersionInfo] = useState(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    fetchAppVersionInfo()
      .then((data) => setVersionInfo(data))
      .catch((err) => console.warn('Failed to load version info on landing:', err));
  }, []);

  const startDemo = (role = 'owner') => {
    const demoSettings = {
      storeName: 'UnitPro Demo Store',
      store_wa: '081234567890',
      theme: 'default',
      bank_name: 'BCA',
      bank_account: '1234567890',
      bank_holder: 'UnitPro Demo Store',
      receipt_note_service: 'Simpan nota ini mebikin bukti pengambilan.',
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

  const handlePackageAction = (type) => {
    if (type === 'free' || type === 'pro') {
      navigate('/login', { state: { tab: 'register', tier: type === 'pro' ? 'pro' : 'free' } });
      return;
    }
    window.open(type === 'partner' ? partnerWhatsappUrl : whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="simple-landing">
      <nav className="simple-nav">
        <button type="button" className="simple-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <BrandLogo />
        </button>
        <div className="simple-nav-links">
          <a href="#fitur">{t('nav_features', 'Fitur', currentLang)}</a>
          <a href="#harga">{t('nav_pricing', 'Harga', currentLang)}</a>
          <a href="#download-apk">{t('nav_apk', 'Download APK', currentLang)}</a>
          <button type="button" onClick={login}>{t('login_btn', 'Masuk Toko', currentLang)}</button>
        </div>
      </nav>

      <section className="simple-hero">
        <div className="simple-hero-copy">
          <p className="simple-kicker"><Wrench size={16} /> {t('landing_badge', 'Aplikasi Kasir & Servis No.1', currentLang)}</p>
          <h1>{t('landing_hero_title', 'Satu aplikasi untuk mengatur servis, kasir, barang/jasa, teknisi, dan pelanggan.', currentLang)}</h1>
          <p className="simple-subtitle">
            {t('landing_hero_subtitle', 'UnitPro membantu toko servis & penjualan barang/jasa bekerja lebih rapi dari unit masuk sampai unit diambil pelanggan.', currentLang)}
          </p>
          <div className="simple-actions">
            <button type="button" className="simple-btn primary" onClick={registerFree}>
              {t('register_free_btn', 'Coba gratis', currentLang)} <ArrowRight size={18} />
            </button>
            <button type="button" className="simple-btn secondary" onClick={() => startDemo('owner')}>
              {t('see_demo_btn', 'Lihat demo', currentLang)}
            </button>
            <a className="simple-btn ghost" href={whatsappUrl} target="_blank" rel="noreferrer">
              <MessageCircle size={18} /> {t('consultation_btn', 'Konsultasi', currentLang)}
            </a>
          </div>

          <p className="simple-note">Bisa dibuka langsung dari Browser (PC/HP) & Aplikasi Android APK resmi.</p>
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
          <h2>Pilih paket sesuai tahap toko atau bisnis partner kamu.</h2>
        </div>
        <div className="simple-pricing-grid four">
          {packages.map((item) => (
            <article className={`simple-price-card ${item.featured ? 'featured' : ''} ${item.partner ? 'partner' : ''}`} key={item.name}>
              {item.badge && <span className={`simple-badge ${item.partner ? 'neutral' : ''}`}>{item.badge}</span>}
              <h3>{item.name}</h3>
              <p className="simple-price">{item.price}<span>{item.period}</span></p>
              <small>{item.subtitle}</small>
              <ul>
                {item.features.map((feature) => (
                  <li key={feature}><Check size={16} /> {feature}</li>
                ))}
              </ul>
              <button
                type="button"
                className={`simple-btn ${item.featured || item.partner ? 'primary' : 'secondary'} full`}
                onClick={() => handlePackageAction(item.type)}
              >
                {item.action}
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* REVAMPED PUBLIC APK DOWNLOAD SECTION & INSTALL GUIDE */}
      <section id="download-apk" className="simple-section simple-apk-pro-section">
        <div className="simple-apk-pro-card">
          <div className="simple-apk-pro-header">
            <div className="simple-apk-icon-badge">
              <Smartphone size={32} />
            </div>
            <div>
              <span className="simple-apk-status-tag"><Sparkles size={14} /> Aplikasi Android Resmi</span>
              <h2>Unduh UnitPro untuk Android</h2>
              <p>Kelola toko servis, kasir POS, dan tugas teknisi langsung dari perangkat Android Anda dengan integrasi auto update otomatis.</p>
            </div>
          </div>

          <div className="simple-apk-meta-row">
            <div className="simple-apk-meta-item">
              <small>Versi Rilis Terbaru</small>
              <strong>v{versionInfo?.version || APP_VERSION}</strong>
            </div>
            <div className="simple-apk-meta-item">
              <small>Tanggal Pembaruan</small>
              <strong>{versionInfo?.releaseDate || 'Agustus 2026'}</strong>
            </div>
            <div className="simple-apk-meta-item">
              <small>Fitur Auto-Update</small>
              <strong><CheckCircle2 size={16} color="#059669" /> Aktif di APK</strong>
            </div>
          </div>

          <div className="simple-apk-action-area">
            <a className="simple-btn primary large" href={APK_DOWNLOAD_PATH} download={APK_FILE_NAME}>
              <Download size={20} /> Unduh APK Resmi (v{versionInfo?.version || APP_VERSION})
            </a>
            <p className="simple-apk-trust-text">
              <ShieldCheck size={16} color="#0284c7" /> Bebas Malware & Virus • Aman Dipasang di Seluruh Perangkat Android
            </p>
          </div>

          {/* Installation Steps Guide */}
          <div className="simple-apk-install-steps">
            <h3><HelpCircle size={18} /> Cara Menginstal APK di Android:</h3>
            <div className="simple-steps-grid">
              <div className="simple-step-box">
                <span className="step-num">1</span>
                <div>
                  <strong>Unduh File APK</strong>
                  <p>Tekan tombol unduh di atas untuk menyimpan file UnitPro.apk ke perangkat Anda.</p>
                </div>
              </div>
              <div className="simple-step-box">
                <span className="step-num">2</span>
                <div>
                  <strong>Izinkan Sumber Tak Dikenal</strong>
                  <p>Jika Android menampilkan peringatan, buka Pengaturan → Izinkan Instalasi dari Sumber Ini.</p>
                </div>
              </div>
              <div className="simple-step-box">
                <span className="step-num">3</span>
                <div>
                  <strong>Klik Pasang / Perbarui</strong>
                  <p>Buka file unduhan dan tekan Pasang. Data toko & akun Anda tetap aman tersimpan saat diperbarui.</p>
                </div>
              </div>
            </div>
          </div>

          {versionInfo?.changelog && versionInfo.changelog.length > 0 && (
            <div className="simple-apk-changelog">
              <h4>Catatan Pembaruan Rilis v{versionInfo.version}:</h4>
              <ul>
                {versionInfo.changelog.map((change, idx) => (
                  <li key={`${change}-${idx}`}><CheckCircle2 size={15} color="#0284c7" /> {change}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
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

      {/* FOOTER WITH TRUST, SAFETY & PRIVACY LINKS */}
      <footer className="simple-footer-pro">
        <div className="simple-footer-top">
          <div className="simple-footer-brand">
            <UnitProLogo variant="wordmark" size={40} width={180} />
            <p>Sistem Operasional Toko Servis, Kasir POS, & Manajemen Tim Terpadu.</p>
          </div>
          <div className="simple-footer-links">
            <div className="footer-col">
              <strong>Produk & Aplikasi</strong>
              <a href="#fitur">Fitur Utama</a>
              <a href="#harga">Pilihan Paket</a>
              <a href={APK_DOWNLOAD_PATH} download={APK_FILE_NAME}>Download APK Android</a>
            </div>
            <div className="footer-col">
              <strong>Bantuan & Support</strong>
              <a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp Customer Support</a>
              <a href="mailto:support@unitpro.id">Email Helpdesk</a>
              <button type="button" className="link-btn" onClick={() => setShowTermsModal(true)}>Syarat Penggunaan</button>
            </div>
            <div className="footer-col">
              <strong>Keamanan & Privasi</strong>
              <button type="button" className="link-btn" onClick={() => setShowPrivacyModal(true)}>Kebijakan Privasi</button>
              <span><Lock size={14} /> Encrypted Data Safety</span>
              <span><ShieldCheck size={14} /> Certified Cloud Backup</span>
            </div>
          </div>
        </div>
        <div className="simple-footer-bottom">
          <span>© {new Date().getFullYear()} UnitPro Indonesia. Hak Cipta Dilindungi.</span>
          <span>Aplikasi Manajemen Servis HP, Laptop, & Elektronik No.1</span>
        </div>
      </footer>

      {/* PRIVACY POLICY MODAL */}
      {showPrivacyModal && (
        <div className="modal-backdrop-simple" onClick={() => setShowPrivacyModal(false)}>
          <div className="modal-card-simple" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close-simple" onClick={() => setShowPrivacyModal(false)}><X size={20} /></button>
            <h3><Lock size={20} color="#0284c7" /> Kebijakan Privasi UnitPro</h3>
            <div className="modal-body-simple">
              <p>UnitPro berkomitmen penuh untuk melindungi privasi dan keamanan data toko servis Anda.</p>
              <h4>1. Pengumpulan Data</h4>
              <p>Kami hanya mengumpulkan data yang diperlukan untuk operasional toko seperti nama toko, nomor telepon bisnis, catatan servis, dan data produk kasir.</p>
              <h4>2. Keamanan Data</h4>
              <p>Seluruh kata sandi/PIN disimpan menggunakan enkripsi hashing aman. Data toko Anda diisolasi per tenant dan tidak dibagikan ke pihak ketiga.</p>
              <h4>3. Kamera & Izin Perangkat</h4>
              <p>Penggunaan kamera di browser/APK hanya digunakan untuk scan barcode/QR resi secara lokal di perangkat Anda tanpa mengirim data gambar ke server luar.</p>
            </div>
          </div>
        </div>
      )}

      {/* TERMS OF SERVICE MODAL */}
      {showTermsModal && (
        <div className="modal-backdrop-simple" onClick={() => setShowTermsModal(false)}>
          <div className="modal-card-simple" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close-simple" onClick={() => setShowTermsModal(false)}><X size={20} /></button>
            <h3><FileText size={20} color="#0284c7" /> Syarat Penggunaan UnitPro</h3>
            <div className="modal-body-simple">
              <p>Dengan menggunakan UnitPro, Anda menyetujui ketentuan layanan berikut:</p>
              <h4>1. Penggunaan Akun</h4>
              <p>Pemilik toko bertanggung jawab menjaga kerahasiaan PIN/Password login owner dan akun karyawan.</p>
              <h4>2. Layanan Software SaaS</h4>
              <p>UnitPro menyediakan layanan manajemen servis dan kasir. Pembaruan fitur web dan APK dapat dilakukan secara berkala untuk menjaga kinerja sistem.</p>
              <h4>3. Dukungan Teknis</h4>
              <p>Tim support UnitPro siap membantu penanganan kendala penggunaan aplikasi melalui jalur resmi WhatsApp dan Email.</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

