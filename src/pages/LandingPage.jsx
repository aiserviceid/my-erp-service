import React, { useState, useEffect, useRef } from 'react';
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
  ArrowUpRight,
  Gauge,
  PackageCheck,
  Receipt,
  BellRing,
  ChevronDown,
  MonitorSmartphone,
  TrendingUp,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { APP_VERSION, APK_DOWNLOAD_PATH, APK_FILE_NAME } from '../config/appInfo';
import UnitProLogo from '../components/UnitProLogo';
import { t, getAppLanguage } from '../utils/i18n';
import { fetchAppVersionInfo } from '../utils/versionUtils';
import './LandingPage.css';


const salesWhatsapp = '6285382535050';
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

const workflowSteps = [
  { number: '01', icon: Receipt, title: 'Unit diterima', text: 'Kasir mencatat pelanggan, perangkat, keluhan, dan mencetak nota.' },
  { number: '02', icon: Wrench, title: 'Teknisi bekerja', text: 'Tugas masuk ke portal teknisi dan progres dapat dipantau.' },
  { number: '03', icon: BellRing, title: 'Pelanggan mendapat kabar', text: 'Status dan link tracking dapat dikirim melalui WhatsApp.' },
  { number: '04', icon: BarChart3, title: 'Owner tetap memegang kendali', text: 'Omzet, stok, servis, dan kinerja tim terlihat dalam laporan.' },
];

const faqs = [
  { q: 'Apakah UnitPro bisa dicoba sebelum berlangganan?', a: 'Bisa. Gunakan demo tanpa membuat akun atau mulai dengan paket Free untuk mencoba alur servis, kasir, dan tracking.' },
  { q: 'Apakah bisa digunakan dari HP dan komputer?', a: 'Bisa. UnitPro berjalan melalui browser modern dan tersedia juga sebagai APK Android untuk operasional harian.' },
  { q: 'Apakah pelanggan harus memasang aplikasi?', a: 'Tidak. Pelanggan cukup membuka link tracking dan memasukkan nomor resi untuk melihat status servis.' },
  { q: 'Bagaimana jika toko memiliki beberapa teknisi?', a: 'Paket Pro mendukung akun tim dengan PIN masing-masing, pembagian tugas servis, absensi, gaji, dan komisi.' },
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
    features: ['Servis, kasir, stok, dan pelanggan tanpa batas', 'Tim teknisi hingga 20 akun', 'WhatsApp pelanggan & CRM', 'Laporan owner & export Excel'],
    action: 'Coba Pro',
    type: 'pro',
  },
  {
    name: 'Enterprise',
    subtitle: 'Untuk banyak cabang',
    price: 'Rp299.000',
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
  const landingRef = useRef(null);
  const navigate = useNavigate();
  const setTenant = useStore((state) => state.setTenant);
  const currentLang = getAppLanguage();
  const [versionInfo, setVersionInfo] = useState(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    fetchAppVersionInfo()
      .then((data) => setVersionInfo(data))
      .catch((err) => console.warn('Failed to load version info on landing:', err));
  }, []);

  useEffect(() => {
    const handleScroll = () => setNavScrolled(window.scrollY > 18);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px' });

    const targets = landingRef.current?.querySelectorAll('[data-reveal]') || [];
    targets.forEach((target) => observer.observe(target));
    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  const handlePointerMove = (event) => {
    if (!landingRef.current
      || !window.matchMedia('(hover: hover) and (pointer: fine)').matches
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const x = event.clientX / window.innerWidth;
    const y = event.clientY / window.innerHeight;
    landingRef.current.style.setProperty('--pointer-x', `${Math.round(x * 100)}%`);
    landingRef.current.style.setProperty('--pointer-y', `${Math.round(y * 100)}%`);
    landingRef.current.style.setProperty('--tilt-x', `${(0.5 - y) * 4}deg`);
    landingRef.current.style.setProperty('--tilt-y', `${(x - 0.5) * 5}deg`);
  };

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

  const handlePackageAction = (type) => {
    if (type === 'free' || type === 'pro') {
      navigate('/login', { state: { tab: 'register', tier: type === 'pro' ? 'pro' : 'free' } });
      return;
    }
    window.open(type === 'partner' ? partnerWhatsappUrl : whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="simple-landing" ref={landingRef} onMouseMove={handlePointerMove}>
      <div className="landing-ambient one" aria-hidden="true" />
      <div className="landing-ambient two" aria-hidden="true" />
      <nav className={`simple-nav ${navScrolled ? 'is-scrolled' : ''}`}>
        <button type="button" className="simple-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <BrandLogo />
        </button>
        <div className="simple-nav-links">
          <a href="#fitur">{t('nav_features', 'Fitur', currentLang)}</a>
          <a href="#harga">{t('nav_pricing', 'Harga', currentLang)}</a>
          <a href="#download-apk">{t('nav_apk', 'Download APK', currentLang)}</a>
          <button type="button" className="nav-login-button" onClick={login}>{t('login_btn', 'Masuk Toko', currentLang)} <ArrowUpRight size={15} /></button>
        </div>
      </nav>

      <section className="simple-hero" data-reveal>
        <div className="simple-hero-copy">
          <p className="simple-kicker"><Wrench size={16} /> {t('landing_badge', 'Sistem operasional toko servis', currentLang)}</p>
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

          <div className="hero-trust-row">
            <span><CheckCircle2 size={15} /> Tidak perlu kartu kredit</span>
            <span><MonitorSmartphone size={15} /> Browser & Android</span>
            <span><ShieldCheck size={15} /> Data tiap toko terpisah</span>
          </div>
        </div>

        <aside className="product-stage" aria-label="Pratinjau dashboard UnitPro">
          <div className="product-stage-glow" aria-hidden="true" />
          <div className="product-window">
            <div className="product-window-bar">
              <div className="window-dots"><i /><i /><i /></div>
              <span>UnitPro · Ringkasan Owner</span>
              <small>Aktif</small>
            </div>
            <div className="product-dashboard">
              <div className="product-sidebar">
                <div className="mini-logo">U</div>
                {[Gauge, Wrench, ShoppingCart, PackageCheck, UsersRound].map((Icon, index) => <span className={index === 0 ? 'active' : ''} key={index}><Icon size={16} /></span>)}
              </div>
              <div className="product-content">
                <div className="product-title"><div><small>RINGKASAN OWNER</small><strong>Kondisi toko hari ini</strong></div><button type="button">+ Terima servis</button></div>
                <div className="product-metrics">
                  <article className="metric-card"><span>Omzet hari ini</span><strong>Rp2,85 jt</strong><small>↑ 12,4%</small></article>
                  <article className="metric-card"><span>Servis aktif</span><strong>18 unit</strong><small>6 selesai</small></article>
                  <article className="metric-card"><span>Siap diambil</span><strong>5 unit</strong><small>Hubungi pelanggan</small></article>
                </div>
                <div className="product-chart-card">
                  <div className="chart-heading"><strong>Tren omzet</strong><span>7 hari terakhir</span></div>
                  <div className="chart-visual"><i /><i /><i /><i /><i /><i /><i /></div>
                  <div className="chart-labels"><span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span><span>Min</span></div>
                </div>
              </div>
            </div>
          </div>
          <div className="floating-status one"><CheckCircle2 size={16} /><div><strong>Servis selesai</strong><span>Pelanggan siap dihubungi</span></div></div>
          <div className="floating-status two"><TrendingUp size={16} /><div><strong>Omzet terpantau</strong><span>Laporan diperbarui otomatis</span></div></div>
        </aside>
      </section>

      <section className="simple-proof" data-reveal>
        <div><strong>Servis</strong><span>resi, status, nota</span></div>
        <div><strong>Kasir</strong><span>penjualan & stok</span></div>
        <div><strong>Teknisi</strong><span>tugas & progres</span></div>
        <div><strong>Laporan</strong><span>omzet & arus kas</span></div>
      </section>

      <section className="simple-section simple-two-column" data-reveal>
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

      <section className="simple-section workflow-section" data-reveal>
        <div className="simple-section-head workflow-heading">
          <p className="simple-kicker">Satu alur kerja</p>
          <h2>Dari unit masuk sampai laporan, semuanya tetap tersambung.</h2>
          <p>Setiap orang melihat hal yang mereka butuhkan tanpa membuat data terpisah-pisah.</p>
        </div>
        <div className="workflow-track">
          {workflowSteps.map(({ number, icon: Icon, title, text }) => (
            <article className="workflow-card" key={number}>
              <div className="workflow-card-top"><span>{number}</span><Icon size={20} /></div>
              <h3>{title}</h3><p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="fitur" className="simple-section" data-reveal>
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

      <section className="simple-demo-strip" data-reveal>
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

      <section id="harga" className="simple-section simple-pricing-section" data-reveal>
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
      <section id="download-apk" className="simple-section simple-apk-pro-section" data-reveal>
        <div className="simple-apk-pro-card">
          <div className="simple-apk-pro-header">
            <div className="simple-apk-icon-badge">
              <Smartphone size={32} />
            </div>
            <div>
              <span className="simple-apk-status-tag"><Sparkles size={14} /> Aplikasi Android Resmi</span>
              <h2>Unduh UnitPro untuk Android</h2>
              <p>Kelola toko servis, kasir POS, dan tugas teknisi langsung dari perangkat Android dengan pembaruan aplikasi yang praktis.</p>
            </div>
          </div>

          <div className="simple-apk-meta-row">
            <div className="simple-apk-meta-item">
              <small>Versi Rilis Terbaru</small>
              <strong>v{versionInfo?.version || APP_VERSION}</strong>
            </div>
            <div className="simple-apk-meta-item">
              <small>Tanggal Pembaruan</small>
              <strong>{versionInfo?.releaseDate || '13 Agustus 2026'}</strong>
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
              <ShieldCheck size={16} color="#0284c7" /> Unduh hanya melalui halaman resmi UnitPro
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

      <section className="simple-section faq-section" data-reveal>
        <div className="simple-section-head">
          <p className="simple-kicker">Pertanyaan umum</p>
          <h2>Hal penting sebelum mulai menggunakan UnitPro.</h2>
        </div>
        <div className="faq-list">
          {faqs.map((item, index) => (
            <article className={`faq-item ${openFaq === index ? 'open' : ''}`} key={item.q}>
              <button type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}>
                <span>{item.q}</span><ChevronDown size={20} />
              </button>
              <div className="faq-answer"><p>{item.a}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="simple-final-cta" data-reveal>
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
              <span><ShieldCheck size={14} /> Isolasi data per tenant</span>
            </div>
          </div>
        </div>
        <div className="simple-footer-bottom">
          <span>© {new Date().getFullYear()} UnitPro Indonesia. Hak Cipta Dilindungi.</span>
          <span>Sistem operasional servis, kasir, dan tim</span>
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
