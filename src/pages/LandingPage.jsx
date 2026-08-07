import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  Menu,
  MessageCircle,
  Send,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  UsersRound,
  Wrench,
  X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { apiService } from '../services/api';
import { APP_VERSION, APK_DOWNLOAD_PATH, APK_FILE_NAME } from '../config/appInfo';
import UnitProLogo from '../components/UnitProLogo';
import './LandingPage.css';

const WHATSAPP_NUMBER = '6281234567890';
const whatsappText = encodeURIComponent('Halo UnitPro, saya ingin coba aplikasi untuk toko servis saya.');
const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappText}`;

const proofStats = [
  { value: '1 sistem', label: 'untuk servis, kasir, stok, teknisi, nota, laporan, dan pelanggan' },
  { value: '24/7', label: 'tracking mandiri agar pelanggan tidak terus bertanya progres' },
  { value: '30 hari', label: 'masa coba untuk validasi alur toko sebelum berlangganan' },
];

const painPoints = [
  'Status servis tercecer di chat, buku, dan catatan kasir.',
  'Pelanggan sering tanya progres karena tidak punya link tracking.',
  'Stok sparepart berubah, tapi laporan dan nota tidak ikut rapi.',
  'Owner sulit tahu omzet, servis selesai, dan pekerjaan teknisi hari ini.',
];

const coreFeatures = [
  {
    icon: ClipboardCheck,
    title: 'Servis masuk lebih rapi',
    description: 'Catat pelanggan, keluhan, kelengkapan, estimasi, teknisi, nota, dan nomor resi dalam satu alur yang mudah diikuti.',
  },
  {
    icon: UsersRound,
    title: 'Tugas teknisi jelas',
    description: 'Kasir bisa menugaskan servis, teknisi melihat daftar kerja, update progres, dan menyelesaikan tagihan tanpa tumpang tindih.',
  },
  {
    icon: ShoppingCart,
    title: 'Kasir dan stok tersambung',
    description: 'Jual sparepart atau jasa dari POS, stok barang fisik ikut berkurang, dan transaksi tercatat ke laporan owner.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp lebih cepat',
    description: 'Buka pesan status, nota, tracking, follow-up pelanggan lama, dan campaign manual dari data pelanggan yang sudah tersusun.',
  },
  {
    icon: BarChart3,
    title: 'Laporan owner mudah dibaca',
    description: 'Owner melihat omzet, pengeluaran, net profit, servis aktif, stok tipis, dan sumber uang toko tanpa rekap manual.',
  },
  {
    icon: ShieldCheck,
    title: 'Siap untuk SaaS multi toko',
    description: 'Dibangun dengan tenant, role, paket fitur, readiness database, dan fondasi keamanan agar siap dijual bertahap.',
  },
];

const workflowSteps = [
  { title: 'Kasir terima unit', description: 'Input data pelanggan, keluhan, kelengkapan, estimasi biaya, foto barang, dan cetak nota.' },
  { title: 'Teknisi kerja sesuai tugas', description: 'Teknisi melihat antrean, update status, isi biaya jasa/part, lalu selesaikan servis.' },
  { title: 'Pelanggan pantau sendiri', description: 'Pelanggan bisa cek status lewat link tracking dan QR, sehingga admin tidak dibanjiri chat.' },
  { title: 'Owner melihat hasil', description: 'Transaksi, stok, laporan, CRM pelanggan, dan ringkasan toko ikut terupdate otomatis.' },
];

const demoRoles = [
  {
    id: 'owner',
    icon: BarChart3,
    title: 'Owner / Admin',
    description: 'Dashboard, servis, inventori, laporan, CRM, WhatsApp, dan kontrol toko.',
    action: 'Coba mode Owner',
  },
  {
    id: 'kasir',
    icon: ShoppingCart,
    title: 'Kasir',
    description: 'POS, penerimaan servis, cetak nota, stok, dan pembayaran pelanggan.',
    action: 'Coba mode Kasir',
  },
  {
    id: 'teknisi',
    icon: Wrench,
    title: 'Teknisi',
    description: 'Daftar tugas, update progres, tagihan jasa/part, dan status selesai.',
    action: 'Coba mode Teknisi',
  },
];

const pricingCards = [
  {
    name: 'Free Trial',
    label: 'Untuk mulai tes toko',
    price: 'Rp0',
    term: '30 hari pertama',
    description: 'Cocok untuk mencoba alur servis, kasir, dan tracking pelanggan sebelum berlangganan.',
    cta: 'Mulai gratis',
    tier: 'free',
    featured: false,
    bullets: ['Servis dan nomor resi', 'Kasir POS dasar', 'Inventori produk/jasa', 'Tracking pelanggan', 'Demo operasional toko'],
  },
  {
    name: 'UnitPro Pro',
    label: 'Paket utama toko aktif',
    price: 'Rp99.000',
    term: '/ bulan',
    description: 'Untuk toko servis yang ingin operasional lebih profesional dan laporan owner lebih jelas.',
    cta: 'Pilih Pro',
    tier: 'pro',
    featured: true,
    bullets: ['Semua fitur servis dan kasir', 'Laporan owner premium', 'WhatsApp pelanggan dan campaign manual', 'CRM pelanggan', 'Multi karyawan', 'Export dan fitur Pro bertahap'],
  },
  {
    name: 'Enterprise',
    label: 'Untuk banyak outlet',
    price: 'Khusus',
    term: 'sesuai kebutuhan',
    description: 'Untuk pemilik yang ingin mengatur beberapa toko, tim, paket, dan kontrol operasional lebih besar.',
    cta: 'Konsultasi',
    tier: 'enterprise',
    featured: false,
    bullets: ['Multi cabang', 'Kontrol owner pusat', 'Prioritas support', 'Setup khusus', 'Roadmap fitur sesuai kebutuhan'],
  },
];

const faqs = [
  {
    question: 'Apakah UnitPro hanya untuk toko servis HP?',
    answer: 'Tidak. UnitPro cocok untuk servis HP, laptop, elektronik, sparepart, dan toko yang butuh alur servis + kasir + stok + laporan dalam satu sistem.',
  },
  {
    question: 'Apakah pelanggan harus install aplikasi?',
    answer: 'Tidak. Pelanggan cukup buka link tracking atau scan QR dari nota untuk melihat status servis.',
  },
  {
    question: 'Apakah WhatsApp otomatis langsung aktif?',
    answer: 'Untuk tahap awal, UnitPro mengutamakan WhatsApp manual yang aman: sistem menyiapkan pesan, admin tinggal klik kirim. Otomatis penuh bisa ditambahkan saat toko siap memakai provider WhatsApp.',
  },
  {
    question: 'Apakah bisa dipakai di HP Android?',
    answer: 'Bisa. UnitPro tersedia sebagai web app dan APK Android untuk tes internal. Untuk distribusi besar, nanti dibuat signed release APK/AAB.',
  },
];

const fallbackReviews = [
  {
    id: 'fallback-1',
    name: 'Owner Toko Servis',
    role: 'Pengguna awal',
    rating: 5,
    content: 'Yang paling terasa adalah tracking pelanggan dan nota servis jadi lebih rapi. Admin tidak bolak-balik jawab status unit.',
  },
  {
    id: 'fallback-2',
    name: 'Kasir Servis',
    role: 'Operasional toko',
    rating: 5,
    content: 'Alur kasir, servis, dan stok lebih gampang dipahami. Data unit masuk tidak tercecer seperti sebelumnya.',
  },
  {
    id: 'fallback-3',
    name: 'Teknisi',
    role: 'Tim pengerjaan',
    rating: 5,
    content: 'Tugas lebih jelas, status bisa diperbarui, dan admin bisa lihat progres tanpa tanya terus ke teknisi.',
  },
];

function UnitProMark() {
  return <UnitProLogo size={42} />;
}

function RatingStars({ value, interactive = false, onChange }) {
  return (
    <div className={`unitpro-stars ${interactive ? 'interactive' : ''}`} aria-label={`${value} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={star <= value ? 'selected' : ''}
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          aria-label={`Beri ${star} bintang`}
        >
          <Star size={interactive ? 22 : 16} fill={star <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const setTenant = useStore((state) => state.setTenant);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ name: '', role: '', rating: 5, content: '' });
  const [reviewState, setReviewState] = useState({ loading: true, submitting: false, error: '', success: '' });

  const visibleReviews = reviews.length ? reviews.slice(0, 6) : fallbackReviews;
  const averageRating = useMemo(() => {
    const source = reviews.length ? reviews : fallbackReviews;
    return (source.reduce((total, review) => total + Number(review.rating || 0), 0) / source.length).toFixed(1);
  }, [reviews]);

  const closeMenu = () => setMenuOpen(false);

  const loadReviews = async () => {
    setReviewState((current) => ({ ...current, loading: true }));
    try {
      const data = await apiService.getPlatformReviews();
      setReviews(Array.isArray(data) ? data : []);
      setReviewState((current) => ({ ...current, loading: false }));
    } catch (error) {
      setReviews([]);
      setReviewState((current) => ({ ...current, loading: false, error: '' }));
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const goRegister = (tier = 'free') => {
    navigate('/login', { state: { tab: 'register', tier } });
  };

  const startDemo = (role = 'owner') => {
    const demoSettings = {
      storeName: 'UnitPro Demo Store',
      store_wa: '081234567890',
      theme: 'default',
      bank_name: 'BCA',
      bank_account: '1234567890',
      bank_holder: 'UnitPro Demo Store',
      receipt_note_service: 'Garansi servis mengikuti ketentuan toko. Simpan nota ini sebagai bukti pengambilan.',
      receipt_note_pos: 'Barang yang sudah dibeli tidak dapat ditukar kecuali ada perjanjian tertulis.',
    };

    setTenant('DEMO-STORE', 'UnitPro Demo Store', '', 'pro', 'token_demo_123', '081234567890', demoSettings);
    useStore.getState().updateTenantSettings(demoSettings);

    if (role === 'kasir') {
      useStore.getState().setEmployee({ id: 'EMP-3', name: 'Citra (Kasir Demo)', role: 'KASIR', pin: '1111', phone: '081234567803', tenant_code: 'DEMO-STORE', token: 'demo-kasir-token' });
      navigate('/employee');
      return;
    }

    if (role === 'teknisi') {
      useStore.getState().setEmployee({ id: 'EMP-1', name: 'Andi (Teknisi Demo)', role: 'TEKNISI', pin: '1234', phone: '081234567801', tenant_code: 'DEMO-STORE', token: 'demo-teknisi-token' });
      navigate('/employee');
      return;
    }

    useStore.getState().clearEmployee?.();
    navigate('/admin');
  };

  const submitReview = async (event) => {
    event.preventDefault();
    const name = reviewForm.name.trim();
    const content = reviewForm.content.trim();
    if (name.length < 2 || content.length < 10) {
      setReviewState((current) => ({ ...current, error: 'Nama minimal 2 karakter dan komentar minimal 10 karakter.', success: '' }));
      return;
    }

    setReviewState((current) => ({ ...current, submitting: true, error: '', success: '' }));
    try {
      const created = await apiService.createPlatformReview({ ...reviewForm, name, content, role: reviewForm.role.trim() });
      setReviews((current) => [created, ...current]);
      setReviewForm({ name: '', role: '', rating: 5, content: '' });
      setReviewState((current) => ({ ...current, submitting: false, success: 'Terima kasih. Komentar Anda sudah masuk.', error: '' }));
    } catch (error) {
      setReviewState((current) => ({ ...current, submitting: false, error: error.message || 'Komentar belum dapat dikirim. Coba lagi.', success: '' }));
    }
  };

  return (
    <main className="unitpro-page">
      <div className="unitpro-announcement">
        <Sparkles size={16} />
        <span>Software toko servis modern: servis, kasir, stok, teknisi, pelanggan, dan laporan dalam satu alur.</span>
        <a href={whatsappUrl} target="_blank" rel="noreferrer">Konsultasi WhatsApp</a>
      </div>

      <nav className="unitpro-nav" aria-label="Navigasi UnitPro">
        <button className="unitpro-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="UnitPro beranda">
          <UnitProMark />
          <span>Unit<span>Pro</span></span>
        </button>

        <div className={`unitpro-links ${menuOpen ? 'open' : ''}`}>
          <a href="#fitur" onClick={closeMenu}>Fitur</a>
          <a href="#alur" onClick={closeMenu}>Alur</a>
          <a href="#harga" onClick={closeMenu}>Harga</a>
          <a href="#demo" onClick={closeMenu}>Demo</a>
          <a href="#faq" onClick={closeMenu}>FAQ</a>
        </div>

        <div className="unitpro-nav-actions">
          <button className="unitpro-text-button" onClick={() => navigate('/login', { state: { tab: 'login' } })}>Masuk</button>
          <button className="unitpro-nav-cta" onClick={() => goRegister('free')}>Coba gratis</button>
          <button className="unitpro-menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label="Buka menu">
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </nav>

      <section className="unitpro-hero">
        <div className="unitpro-hero-content">
          <p className="unitpro-eyebrow"><Wrench size={15} /> Operating system untuk toko servis modern</p>
          <h1>Kelola toko servis dari unit masuk sampai pelanggan ambil barang.</h1>
          <p className="unitpro-hero-copy">
            UnitPro membantu owner toko servis merapikan penerimaan unit, tugas teknisi, stok sparepart, transaksi kasir, nota, tracking pelanggan, WhatsApp, dan laporan keuangan dalam satu sistem.
          </p>
          <div className="unitpro-hero-actions">
            <button className="unitpro-button primary" onClick={() => goRegister('free')}>Coba gratis 30 hari <ArrowRight size={19} /></button>
            <button className="unitpro-button secondary" onClick={() => startDemo('owner')}>Lihat demo langsung</button>
            <a className="unitpro-button ghost" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Tanya via WhatsApp</a>
          </div>
          <div className="unitpro-hero-trust">
            <span><CheckCircle2 size={17} /> Tanpa pelanggan install aplikasi</span>
            <span><CheckCircle2 size={17} /> Bisa dipakai dari web dan Android</span>
            <span><CheckCircle2 size={17} /> Cocok untuk HP, laptop, elektronik, dan sparepart</span>
          </div>
        </div>

        <div className="unitpro-hero-card" aria-label="Ringkasan manfaat UnitPro">
          <div className="unitpro-card-top">
            <span className="unitpro-live-dot" />
            <p>Dashboard Owner</p>
          </div>
          <h2>Satu layar untuk tahu toko sedang sehat atau berantakan.</h2>
          <div className="unitpro-dashboard-mock">
            <div><strong>18</strong><span>Servis aktif</span></div>
            <div><strong>7</strong><span>Selesai hari ini</span></div>
            <div><strong>Rp3,8 jt</strong><span>Omzet hari ini</span></div>
            <div><strong>5</strong><span>Stok tipis</span></div>
          </div>
          <ul className="unitpro-check-list">
            <li><Check size={16} /> Kasir input sekali, data ikut ke nota, stok, laporan, dan tracking.</li>
            <li><Check size={16} /> Teknisi update progres, admin dan pelanggan lebih mudah mengikuti.</li>
            <li><Check size={16} /> Owner tidak perlu menunggu rekap manual untuk tahu kondisi toko.</li>
          </ul>
        </div>
      </section>

      <section className="unitpro-proof-band" aria-label="Angka ringkas UnitPro">
        {proofStats.map((item) => (
          <div key={item.value}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      <section className="unitpro-section unitpro-problem-section">
        <div className="unitpro-section-heading centered">
          <p className="unitpro-kicker">Masalah toko servis</p>
          <h2>Kalau operasional masih campur chat, buku, dan ingatan, toko cepat terlihat sibuk tapi sulit dikontrol.</h2>
        </div>
        <div className="unitpro-pain-grid">
          {painPoints.map((point) => (
            <article key={point} className="unitpro-pain-card">
              <Clock3 size={19} />
              <p>{point}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="fitur" className="unitpro-section unitpro-feature-section">
        <div className="unitpro-section-heading">
          <p className="unitpro-kicker">Fitur yang benar-benar dipakai toko</p>
          <h2>Bukan sekadar aplikasi catatan. UnitPro menyambungkan pekerjaan kasir, teknisi, owner, stok, dan pelanggan.</h2>
        </div>
        <div className="unitpro-feature-grid">
          {coreFeatures.map(({ icon: Icon, title, description }) => (
            <article className="unitpro-feature" key={title}>
              <span className="unitpro-icon"><Icon size={22} /></span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="alur" className="unitpro-section unitpro-flow-section">
        <div className="unitpro-section-heading centered">
          <p className="unitpro-kicker">Alur kerja</p>
          <h2>Sekali data masuk, seluruh sistem ikut bekerja.</h2>
          <p>Inilah alur yang membuat UnitPro berbeda dari catatan servis biasa.</p>
        </div>
        <div className="unitpro-flow-grid">
          {workflowSteps.map((step, index) => (
            <article className="unitpro-flow-card" key={step.title}>
              <span>{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="demo" className="unitpro-section unitpro-demo-section">
        <div className="unitpro-demo-copy">
          <p className="unitpro-kicker">Sales Demo Mode</p>
          <h2>Coba seperti toko servis sungguhan, tanpa daftar dulu.</h2>
          <p>Pilih peran dan langsung lihat UnitPro dari sudut owner, kasir, atau teknisi. Ini membantu calon pembeli cepat paham manfaatnya.</p>
        </div>
        <div className="unitpro-demo-grid">
          {demoRoles.map(({ id, icon: Icon, title, description, action }) => (
            <button key={id} type="button" className="unitpro-demo-card" onClick={() => startDemo(id)}>
              <span><Icon size={22} /></span>
              <strong>{title}</strong>
              <small>{description}</small>
              <em>{action} <ArrowRight size={15} /></em>
            </button>
          ))}
        </div>
      </section>

      <section id="harga" className="unitpro-section unitpro-pricing-section">
        <div className="unitpro-section-heading centered">
          <p className="unitpro-kicker">Harga sederhana</p>
          <h2>Mulai dari trial. Upgrade saat toko sudah nyaman pakai.</h2>
          <p>Paket dibuat bertahap agar toko kecil bisa masuk, dan toko aktif punya alasan jelas untuk naik ke Pro.</p>
        </div>
        <div className="unitpro-pricing-grid">
          {pricingCards.map((card) => (
            <article key={card.name} className={`unitpro-price-card ${card.featured ? 'featured' : ''}`}>
              {card.featured && <div className="unitpro-price-badge">Paling direkomendasikan</div>}
              <p className="unitpro-price-label">{card.label}</p>
              <h3>{card.name}</h3>
              <div className="unitpro-price"><strong>{card.price}</strong><span>{card.term}</span></div>
              <p className="unitpro-price-promo">{card.description}</p>
              <ul>
                {card.bullets.map((bullet) => (
                  <li key={bullet}><Check size={16} /> {bullet}</li>
                ))}
              </ul>
              {card.tier === 'enterprise' ? (
                <a className="unitpro-button secondary full" href={whatsappUrl} target="_blank" rel="noreferrer">Konsultasi Enterprise</a>
              ) : (
                <button className={`unitpro-button ${card.featured ? 'primary' : 'outlined'} full`} onClick={() => goRegister(card.tier)}>{card.cta}</button>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="unitpro-section unitpro-apk-section">
        <div>
          <p className="unitpro-kicker">Web + Android</p>
          <h2>Tes UnitPro langsung di HP toko.</h2>
          <p>Gunakan versi web untuk operasional harian. APK debug tersedia untuk tes internal di perangkat Android sebelum dibuat signed release resmi.</p>
        </div>
        <a className="unitpro-button secondary" href={APK_DOWNLOAD_PATH} download={APK_FILE_NAME}><Download size={18} /> Unduh APK v{APP_VERSION}</a>
      </section>

      <section id="komentar" className="unitpro-section unitpro-review-section">
        <div className="unitpro-section-heading centered">
          <p className="unitpro-kicker">Komentar pengguna</p>
          <h2>Yang dicari pemilik toko: operasional rapi, admin lebih ringan, owner lebih tenang.</h2>
          <div className="unitpro-rating-summary">
            <RatingStars value={Math.round(Number(averageRating || 5))} />
            <span>{averageRating} / 5 dari pengguna awal</span>
          </div>
        </div>
        <div className="unitpro-review-grid">
          {visibleReviews.map((review) => (
            <article className="unitpro-review-card" key={review.id || `${review.name}-${review.content}`}>
              <RatingStars value={Number(review.rating || 5)} />
              <p>“{review.content}”</p>
              <strong>{review.name}</strong>
              {review.role && <span>{review.role}</span>}
            </article>
          ))}
        </div>

        <form className="unitpro-review-form" onSubmit={submitReview}>
          <div>
            <p className="unitpro-kicker">Beri komentar</p>
            <h3>Bantu calon pengguna lain percaya dengan pengalamanmu.</h3>
          </div>
          <div className="unitpro-form-grid">
            <input value={reviewForm.name} onChange={(event) => setReviewForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nama" />
            <input value={reviewForm.role} onChange={(event) => setReviewForm((current) => ({ ...current, role: event.target.value }))} placeholder="Role / nama toko" />
          </div>
          <RatingStars interactive value={reviewForm.rating} onChange={(rating) => setReviewForm((current) => ({ ...current, rating }))} />
          <textarea value={reviewForm.content} onChange={(event) => setReviewForm((current) => ({ ...current, content: event.target.value }))} placeholder="Tulis komentar singkat tentang UnitPro" rows={4} />
          {reviewState.error && <p className="unitpro-form-error">{reviewState.error}</p>}
          {reviewState.success && <p className="unitpro-form-success">{reviewState.success}</p>}
          <button className="unitpro-button primary" disabled={reviewState.submitting} type="submit">
            {reviewState.submitting ? 'Mengirim...' : 'Kirim komentar'} <Send size={17} />
          </button>
        </form>
      </section>

      <section id="faq" className="unitpro-section unitpro-faq-section">
        <div className="unitpro-section-heading centered">
          <p className="unitpro-kicker">FAQ</p>
          <h2>Pertanyaan yang biasanya ditanyakan calon pembeli.</h2>
        </div>
        <div className="unitpro-faq-grid">
          {faqs.map((item) => (
            <article key={item.question} className="unitpro-faq-card">
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="unitpro-final-cta">
        <div>
          <p className="unitpro-kicker">Saatnya toko lebih tertib</p>
          <h2>Jangan tunggu toko ramai baru dirapikan.</h2>
          <p>Mulai dari trial, test alur servis dan kasir, lalu upgrade saat toko sudah nyaman memakai UnitPro setiap hari.</p>
        </div>
        <div className="unitpro-final-actions">
          <button className="unitpro-button primary" onClick={() => goRegister('free')}>Mulai gratis <ArrowRight size={18} /></button>
          <a className="unitpro-button secondary" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Konsultasi WhatsApp</a>
        </div>
      </section>

      <footer className="unitpro-footer">
        <div className="unitpro-footer-brand">
          <UnitProMark />
          <div>
            <strong>UnitPro</strong>
            <span>Operating System untuk Toko Servis Modern.</span>
          </div>
        </div>
        <div className="unitpro-footer-links">
          <button onClick={() => navigate('/terms')}>Syarat Layanan</button>
          <button onClick={() => navigate('/privacy')}>Privasi</button>
          <button onClick={() => navigate('/login')}>Login</button>
        </div>
      </footer>
    </main>
  );
}
