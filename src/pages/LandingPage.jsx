import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, BarChart3, Building2, Check, CheckCircle2, ClipboardCheck, Clock3, Download, Menu,
  MessageCircle, Send, ShieldCheck, ShoppingCart, Sparkles, Star, UsersRound, Wrench, X
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { apiService } from '../services/api';
import UnitProLogo from '../components/UnitProLogo';
import heroImage from '../assets/unitpro-hero.png';
import './LandingPage.css';

const features = [
  { icon: ClipboardCheck, title: 'Penerimaan unit rapi', description: 'Data pelanggan, keluhan, kelengkapan, teknisi, dan resi dicatat dalam satu alur.' },
  { icon: UsersRound, title: 'Penugasan teknisi jelas', description: 'Tugas dapat dialihkan saat teknisi berhalangan, tanpa kehilangan catatan servis.' },
  { icon: ShoppingCart, title: 'Part dan kasir tersinkron', description: 'Gunakan part dari inventori atau input manual, lalu biarkan stok tetap akurat.' },
  { icon: BarChart3, title: 'Kontrol toko dari satu layar', description: 'Pantau servis, penjualan, stok, nota, QRIS, dan laporan tanpa rekap berulang.' },
];

function UnitProMark() {
  return <UnitProLogo size={38} />;
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
          <Star size={interactive ? 23 : 16} fill={star <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const setTenant = useStore((state) => state.setTenant);
  const [menuOpen, setMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState('yearly');
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ name: '', role: '', rating: 5, content: '' });
  const [reviewState, setReviewState] = useState({ loading: true, submitting: false, error: '', success: '' });
  const isYearlyBilling = billingCycle === 'yearly';
  const proPrice = isYearlyBilling ? 'Rp590.000' : 'Rp99.000';
  const proTerm = isYearlyBilling ? '/ tahun pertama' : '/ bulan';

  const loadReviews = async () => {
    setReviewState((current) => ({ ...current, loading: true }));
    const data = await apiService.getPlatformReviews();
    setReviews(data);
    setReviewState((current) => ({ ...current, loading: false }));
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const averageRating = useMemo(() => {
    if (!reviews.length) return null;
    return (reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length).toFixed(1);
  }, [reviews]);

  const startDemo = () => {
    setTenant('DEMO-STORE', 'UnitPro Demo Store', '', 'pro', 'token_demo_123');
    useStore.getState().updateTenantSettings({ storeName: 'UnitPro Demo Store', store_wa: '081234567890', theme: 'default' });
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
      setReviewState((current) => ({ ...current, submitting: false, success: 'Terima kasih. Komentar Anda sudah ditampilkan.', error: '' }));
    } catch (error) {
      setReviewState((current) => ({ ...current, submitting: false, error: error.message || 'Komentar belum dapat dikirim. Coba lagi.', success: '' }));
    }
  };

  return (
    <main className="unitpro-page">
      <div className="unitpro-announcement"><Sparkles size={16} /><span>Promo peluncuran: UnitPro Pro <strong>Rp590.000 untuk tahun pertama.</strong></span><a href="#harga">Lihat paket</a></div>

      <nav className="unitpro-nav" aria-label="Navigasi UnitPro">
        <button className="unitpro-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="UnitPro beranda"><UnitProMark /><span>Unit<span>Pro</span></span></button>
        <div className={`unitpro-links ${menuOpen ? 'open' : ''}`}>
          <a href="#fitur" onClick={() => setMenuOpen(false)}>Fitur</a>
          <a href="#harga" onClick={() => setMenuOpen(false)}>Harga</a>
          <a href="#roadmap" onClick={() => setMenuOpen(false)}>Roadmap</a>
          <a href="#komentar" onClick={() => setMenuOpen(false)}>Komentar</a>
        </div>
        <div className="unitpro-nav-actions">
          <button className="unitpro-text-button" onClick={() => navigate('/login', { state: { tab: 'login' } })}>Masuk</button>
          <button className="unitpro-nav-cta" onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}>Coba gratis</button>
          <button className="unitpro-menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label="Buka menu">{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
        </div>
      </nav>

      <section className="unitpro-hero" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="unitpro-hero-content">
          <p className="unitpro-eyebrow"><Wrench size={15} /> Sistem operasional toko servis</p>
          <h1>UnitPro</h1>
          <p className="unitpro-hero-tagline">Dari Unit Masuk sampai Diambil, Semua Terkontrol.</p>
          <p className="unitpro-hero-copy">Kasir, teknisi, stok sparepart, nota, tracking pelanggan, dan WhatsApp dalam satu sistem yang dibuat untuk toko servis.</p>
          <div className="unitpro-hero-actions">
            <button className="unitpro-button primary" onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}>Mulai kelola toko <ArrowRight size={19} /></button>
            <button className="unitpro-button secondary" onClick={startDemo}>Lihat demo</button>
            <a className="unitpro-button secondary" href="/downloads/UnitPro.apk" download><Download size={18} /> Unduh APK</a>
          </div>
        </div>
      </section>

      <section className="unitpro-proof-band" aria-label="Manfaat utama UnitPro">
        <div><strong>Resi & tracking</strong><span>Pelanggan tahu progres unitnya</span></div>
        <div><strong>Tugas teknisi</strong><span>Pekerjaan tidak salah orang</span></div>
        <div><strong>Stok sparepart</strong><span>Pemakaian part tercatat</span></div>
        <div><strong>Kasir & laporan</strong><span>Data toko tetap sinkron</span></div>
      </section>

      <section id="fitur" className="unitpro-section unitpro-compact-section">
        <div className="unitpro-section-heading"><p className="unitpro-kicker">Fitur inti</p><h2>Operasional toko lebih teratur, tanpa bikin kerja tambah rumit.</h2></div>
        <div className="unitpro-feature-grid">
          {features.map(({ icon: Icon, title, description }) => <article className="unitpro-feature" key={title}><span className="unitpro-icon"><Icon size={22} /></span><h3>{title}</h3><p>{description}</p></article>)}
        </div>
      </section>

      <section id="harga" className="unitpro-section unitpro-pricing-section">
        <div className="unitpro-section-heading centered"><p className="unitpro-kicker">Paket sederhana</p><h2>Mulai gratis. Naik paket saat toko semakin aktif.</h2></div>
        <div className="unitpro-billing-toggle" role="group" aria-label="Pilih periode pembayaran">
          <button type="button" className={!isYearlyBilling ? 'active' : ''} onClick={() => setBillingCycle('monthly')}>Bulanan</button>
          <button type="button" className={isYearlyBilling ? 'active' : ''} onClick={() => setBillingCycle('yearly')}>Tahunan</button>
        </div>
        <div className="unitpro-pricing-grid">
          <article className="unitpro-price-card"><p className="unitpro-price-label">Gratis</p><h3>Mulai pakai UnitPro</h3><div className="unitpro-price"><strong>Rp0</strong><span>/ selamanya</span></div><ul><li><Check size={16} /> 1 akun pemilik</li><li><Check size={16} /> Kasir dan servis dasar</li><li><Check size={16} /> Resi dan tracking</li></ul><button className="unitpro-button outlined" onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}>Coba gratis</button></article>
          <article className="unitpro-price-card featured"><div className="unitpro-price-badge">Paling lengkap</div><p className="unitpro-price-label">UnitPro Pro</p><h3>Toko aktif, semua lebih terkendali</h3><div className="unitpro-price"><strong>{proPrice}</strong><span>{proTerm}</span></div><ul><li><Check size={16} /> Kasir, teknisi, dan stok</li><li><Check size={16} /> WhatsApp, QRIS, dan nota</li><li><Check size={16} /> Laporan dan hingga 10 karyawan</li></ul><button className="unitpro-button primary" onClick={() => navigate('/login', { state: { tab: 'register', tier: 'pro', billing: billingCycle } })}>Pilih UnitPro Pro <ArrowRight size={18} /></button></article>
          <article className="unitpro-price-card coming-soon"><div className="unitpro-price-badge neutral">Segera hadir</div><p className="unitpro-price-label">Enterprise</p><h3>Kontrol untuk jaringan toko</h3><div className="unitpro-price"><strong>Dalam pengembangan</strong></div><p className="unitpro-price-promo">Paket lanjutan untuk bisnis dengan beberapa cabang dan tim operasional yang lebih besar.</p><ul><li><Building2 size={16} /> Multi-cabang dan laporan gabungan</li><li><ShieldCheck size={16} /> Hak akses pemilik, admin, kasir, dan teknisi</li><li><Check size={16} /> Transfer stok antar cabang</li></ul><button className="unitpro-button outlined" type="button" disabled>Segera hadir</button></article>
        </div>
      </section>

      <section id="roadmap" className="unitpro-section unitpro-roadmap-section">
        <div className="unitpro-section-heading centered"><p className="unitpro-kicker">Roadmap UnitPro</p><h2>Posisi aplikasi saat ini: Tahap 2 — penguatan tim dan pengalaman APK.</h2><p>Fitur Enterprise dibuka setelah fondasi operasional toko dan akses peran tim benar-benar siap dipakai.</p></div>
        <div className="unitpro-roadmap" aria-label="Tahapan pengembangan UnitPro">
          <article className="unitpro-roadmap-item complete"><span className="unitpro-roadmap-status"><CheckCircle2 size={16} /> Selesai</span><h3>Tahap 1 · Operasional inti</h3><p>Servis, kasir, stok, nota, tracking pelanggan, serta laporan dasar sudah tersedia.</p></article>
          <article className="unitpro-roadmap-item current"><span className="unitpro-roadmap-status"><Clock3 size={16} /> Anda di sini</span><h3>Tahap 2 · Tim & aplikasi</h3><p>APK admin dan karyawan, portal kasir/teknisi, absensi, komisi, serta penyempurnaan hak akses per peran.</p></article>
          <article className="unitpro-roadmap-item future"><span className="unitpro-roadmap-status"><Building2 size={16} /> Berikutnya</span><h3>Tahap 3 · Enterprise</h3><p>Multi-cabang, laporan gabungan, transfer stok, dan kontrol akses lengkap untuk jaringan toko.</p></article>
        </div>
      </section>

      <section id="komentar" className="unitpro-section unitpro-review-section">
        <div className="unitpro-section-heading centered"><p className="unitpro-kicker">Komentar pengguna</p><h2>Bagikan pengalaman Anda memakai UnitPro.</h2>{averageRating && <div className="unitpro-rating-summary"><RatingStars value={Math.round(averageRating)} /><strong>{averageRating}/5</strong><span>dari {reviews.length} ulasan</span></div>}</div>
        <div className="unitpro-review-layout">
          <div className="unitpro-review-list" aria-live="polite">
            {reviewState.loading ? <p className="unitpro-review-empty">Memuat komentar...</p> : reviews.length === 0 ? <p className="unitpro-review-empty">Belum ada komentar. Jadilah yang pertama membagikan pengalaman.</p> : reviews.slice(0, 6).map((review) => <article className="unitpro-review-card" key={review.id}><RatingStars value={Number(review.rating)} /><p>{review.content}</p><strong>{review.author_name}</strong>{review.author_role && <span>{review.author_role}</span>}</article>)}
          </div>
          <form className="unitpro-review-form" onSubmit={submitReview}>
            <h3>Tulis komentar</h3>
            <label>Rating<RatingStars value={reviewForm.rating} interactive onChange={(rating) => setReviewForm((current) => ({ ...current, rating }))} /></label>
            <label>Nama<input value={reviewForm.name} maxLength="50" onChange={(event) => setReviewForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nama Anda" required /></label>
            <label>Usaha atau peran (opsional)<input value={reviewForm.role} maxLength="80" onChange={(event) => setReviewForm((current) => ({ ...current, role: event.target.value }))} placeholder="Contoh: Pemilik toko servis" /></label>
            <label>Komentar<textarea value={reviewForm.content} maxLength="500" onChange={(event) => setReviewForm((current) => ({ ...current, content: event.target.value }))} placeholder="Ceritakan pengalaman Anda..." required /></label>
            {reviewState.error && <p className="unitpro-form-message error">{reviewState.error}</p>}
            {reviewState.success && <p className="unitpro-form-message success">{reviewState.success}</p>}
            <button type="submit" className="unitpro-button primary" disabled={reviewState.submitting}>{reviewState.submitting ? 'Mengirim...' : <><Send size={17} /> Kirim komentar</>}</button>
          </form>
        </div>
      </section>

      <section className="unitpro-cta-section"><div><p className="unitpro-kicker">Saatnya toko servis lebih rapi</p><h2>Fokus perbaiki unit, bukan mencari catatan.</h2></div><button className="unitpro-button primary" onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}>Buat akun gratis <ArrowRight size={19} /></button></section>

      <footer className="unitpro-footer"><div className="unitpro-footer-brand"><UnitProMark /><strong>Unit<span>Pro</span></strong></div><p>Kelola unit. Tuntaskan servis.</p><div><button onClick={() => navigate('/tracking')}>Lacak servis</button><button onClick={() => navigate('/login', { state: { tab: 'login' } })}>Masuk</button></div><small>Copyright {new Date().getFullYear()} UnitPro. Sistem operasional toko servis.</small></footer>
    </main>
  );
}
