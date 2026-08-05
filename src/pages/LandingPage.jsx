import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, BarChart3, BellRing, Check, CircleHelp, ClipboardCheck,
  Download, FileText, Layers3, Menu, MessageCircle, PackageCheck,
  Printer, ShieldCheck, ShoppingCart, Sparkles, UsersRound, Wrench, X
} from 'lucide-react';
import { useStore } from '../store/useStore';
import heroImage from '../assets/unitpro-hero.png';
import './LandingPage.css';

const features = [
  {
    icon: ClipboardCheck,
    title: 'Terima unit tanpa catatan tercecer',
    description: 'Catat pelanggan, perangkat, keluhan, kelengkapan, dan teknisi dalam satu alur. Resi siap dicetak saat itu juga.',
  },
  {
    icon: UsersRound,
    title: 'Tugas teknisi lebih jelas',
    description: 'Setiap teknisi menerima tugas yang tepat dan dapat memperbarui progres pekerjaan dari portal mereka sendiri.',
  },
  {
    icon: Layers3,
    title: 'Sparepart terhubung ke stok',
    description: 'Pilih part dari daftar barang atau masukkan manual. Stok berkurang otomatis saat part dipakai atau dijual.',
  },
  {
    icon: MessageCircle,
    title: 'Pelanggan tidak perlu terus bertanya',
    description: 'Kirim notifikasi WhatsApp dan izinkan pelanggan melacak status servis melalui nomor resi.',
  },
  {
    icon: ShoppingCart,
    title: 'Kasir dan servis dalam satu data',
    description: 'Kelola penjualan, pembayaran, diskon, nota, dan koreksi harga tanpa rekap ulang di akhir hari.',
  },
  {
    icon: BarChart3,
    title: 'Pemilik melihat toko apa adanya',
    description: 'Pantau unit berjalan, penjualan, stok, dan keuangan dari satu dashboard yang mudah dipahami.',
  },
];

const updates = [
  {
    icon: Download,
    title: 'Aplikasi Android UnitPro',
    description: 'Pengalaman ponsel yang lebih ringkas untuk kasir dan teknisi, dengan navigasi yang dibuat khusus untuk kerja harian.',
  },
  {
    icon: BellRing,
    title: 'Notifikasi tugas ke teknisi',
    description: 'Saat kasir menugaskan servis, detail unit dan keluhan dapat langsung dikirim ke WhatsApp teknisi.',
  },
  {
    icon: PackageCheck,
    title: 'Part servis dan stok tersinkron',
    description: 'Pilih sparepart dari inventori, gunakan saat servis, dan biarkan stok kasir tetap akurat.',
  },
  {
    icon: FileText,
    title: 'QRIS dan koreksi nota',
    description: 'Tampilkan QRIS toko pada nota dan koreksi harga saat ada kesalahan tanpa membuat transaksi baru.',
  },
];

const workflow = [
  ['01', 'Unit diterima', 'Kasir mencatat kondisi unit dan mencetak resi.'],
  ['02', 'Teknisi bekerja', 'Tugas, keluhan, biaya jasa, dan sparepart tercatat.'],
  ['03', 'Pelanggan mendapat kabar', 'Status servis dapat dilacak dan dikirim lewat WhatsApp.'],
  ['04', 'Unit diserahkan', 'Nota final, pembayaran, dan laporan toko tersimpan rapi.'],
];

const faqs = [
  ['Apakah UnitPro cocok untuk toko servis HP dan laptop?', 'Ya. UnitPro dirancang untuk alur penerimaan perangkat, pekerjaan teknisi, sparepart, kasir, dan pengambilan unit.'],
  ['Apakah pelanggan bisa mengecek progres sendiri?', 'Bisa. Pelanggan dapat membuka halaman pelacakan dengan nomor resi dari nota servis.'],
  ['Apakah sparepart harus selalu ada di stok?', 'Tidak. Teknisi dapat memilih part dari stok atau memasukkan nama part secara manual ketika barang belum tercatat.'],
  ['Apakah tersedia paket gratis?', 'Tersedia untuk mencoba alur inti UnitPro. Saat operasional toko semakin aktif, Anda dapat beralih ke paket Pro.'],
];

function UnitProMark() {
  return <span className="unitpro-mark" aria-hidden="true">UP</span>;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const setTenant = useStore((state) => state.setTenant);
  const [menuOpen, setMenuOpen] = useState(false);

  const startDemo = () => {
    setTenant('DEMO-STORE', 'UnitPro Demo Store', '', 'pro', 'token_demo_123');
    useStore.getState().updateTenantSettings({
      storeName: 'UnitPro Demo Store',
      store_wa: '081234567890',
      theme: 'default',
    });
    navigate('/admin');
  };

  return (
    <main className="unitpro-page">
      <div className="unitpro-announcement">
        <Sparkles size={16} />
        <span>Promo peluncuran: UnitPro Pro <strong>Rp590.000 untuk tahun pertama.</strong></span>
        <a href="#harga">Lihat paket</a>
      </div>

      <nav className="unitpro-nav" aria-label="Navigasi UnitPro">
        <button className="unitpro-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="UnitPro beranda">
          <UnitProMark />
          <span>Unit<span>Pro</span></span>
        </button>
        <div className={`unitpro-links ${menuOpen ? 'open' : ''}`}>
          <a href="#fitur" onClick={() => setMenuOpen(false)}>Fitur</a>
          <a href="#cara-kerja" onClick={() => setMenuOpen(false)}>Cara kerja</a>
          <a href="#pembaruan" onClick={() => setMenuOpen(false)}>Pembaruan</a>
          <a href="#harga" onClick={() => setMenuOpen(false)}>Harga</a>
        </div>
        <div className="unitpro-nav-actions">
          <button className="unitpro-text-button" onClick={() => navigate('/login', { state: { tab: 'login' } })}>Masuk</button>
          <button className="unitpro-nav-cta" onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}>Coba gratis</button>
          <button className="unitpro-menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label="Buka menu">
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </nav>

      <section className="unitpro-hero" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="unitpro-hero-content">
          <p className="unitpro-eyebrow"><Wrench size={15} /> Sistem operasional toko servis</p>
          <h1>UnitPro</h1>
          <p className="unitpro-hero-tagline">Dari Unit Masuk sampai Diambil, Semua Terkontrol.</p>
          <p className="unitpro-hero-copy">
            Satukan kasir, teknisi, stok sparepart, nota, tracking pelanggan, dan WhatsApp dalam satu sistem yang dibuat untuk toko servis.
          </p>
          <div className="unitpro-hero-actions">
            <button className="unitpro-button primary" onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}>
              Mulai kelola toko <ArrowRight size={19} />
            </button>
            <button className="unitpro-button secondary" onClick={startDemo}>Lihat demo langsung</button>
          </div>
          <div className="unitpro-hero-proof">
            <span><Check size={15} /> Tanpa kartu kredit</span>
            <span><Check size={15} /> Siap untuk kasir dan teknisi</span>
          </div>
        </div>
      </section>

      <section className="unitpro-proof-band" aria-label="Manfaat utama UnitPro">
        <div><strong>Resi & tracking</strong><span>Pelanggan tahu progres unitnya</span></div>
        <div><strong>Tugas teknisi</strong><span>Pekerjaan tidak salah orang</span></div>
        <div><strong>Stok sparepart</strong><span>Pemakaian part tercatat</span></div>
        <div><strong>Kasir & laporan</strong><span>Data toko tetap sinkron</span></div>
      </section>

      <section id="fitur" className="unitpro-section">
        <div className="unitpro-section-heading">
          <p className="unitpro-kicker">Yang benar-benar dibutuhkan toko servis</p>
          <h2>Operasional rapi, dari meja kasir sampai meja teknisi.</h2>
          <p>UnitPro bukan POS generik. Setiap fitur mengikuti cara toko servis bekerja setiap hari.</p>
        </div>
        <div className="unitpro-feature-grid">
          {features.map(({ icon: Icon, title, description }) => (
            <article className="unitpro-feature" key={title}>
              <span className="unitpro-icon"><Icon size={22} /></span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="cara-kerja" className="unitpro-workflow-section">
        <div className="unitpro-section-heading light">
          <p className="unitpro-kicker">Satu alur yang jelas</p>
          <h2>Unit bergerak, data ikut bergerak.</h2>
          <p>Tidak ada lagi catatan terpisah antara kasir, teknisi, stok, dan pemilik toko.</p>
        </div>
        <ol className="unitpro-workflow">
          {workflow.map(([number, title, description]) => (
            <li key={number}>
              <span>{number}</span>
              <div><h3>{title}</h3><p>{description}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section id="pembaruan" className="unitpro-section unitpro-update-section">
        <div className="unitpro-section-heading">
          <p className="unitpro-kicker">Pembaruan aplikasi</p>
          <h2>UnitPro sedang dibuat semakin siap untuk kerja dari ponsel.</h2>
          <p>Pembaruan berikut membawa fitur operasional yang sudah Anda butuhkan ke pengalaman Android yang lebih nyaman.</p>
        </div>
        <div className="unitpro-update-grid">
          {updates.map(({ icon: Icon, title, description }) => (
            <article className="unitpro-update" key={title}>
              <Icon size={23} />
              <h3>{title}</h3>
              <p>{description}</p>
              <span>Segera hadir</span>
            </article>
          ))}
        </div>
      </section>

      <section id="harga" className="unitpro-section unitpro-pricing-section">
        <div className="unitpro-section-heading centered">
          <p className="unitpro-kicker">Harga yang masuk akal untuk toko servis</p>
          <h2>Mulai gratis. Bertumbuh saat toko Anda semakin sibuk.</h2>
          <p>Tanpa biaya per transaksi. Biaya gateway WhatsApp mengikuti layanan yang Anda pilih.</p>
        </div>
        <div className="unitpro-pricing-grid">
          <article className="unitpro-price-card">
            <p className="unitpro-price-label">Gratis</p>
            <h3>Kenali alur UnitPro</h3>
            <div className="unitpro-price"><strong>Rp0</strong><span>/ selamanya</span></div>
            <p>Cocok untuk mencoba penerimaan servis, kasir dasar, dan cara kerja sistem.</p>
            <ul><li><Check size={16} /> 1 akun pemilik</li><li><Check size={16} /> Kasir dan servis dasar</li><li><Check size={16} /> Resi dan tracking pelanggan</li></ul>
            <button className="unitpro-button outlined" onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}>Coba gratis</button>
          </article>
          <article className="unitpro-price-card featured">
            <div className="unitpro-price-badge">Pilihan untuk toko aktif</div>
            <p className="unitpro-price-label">UnitPro Pro</p>
            <h3>Operasional toko dalam satu kendali</h3>
            <div className="unitpro-price"><strong>Rp99.000</strong><span>/ bulan</span></div>
            <p className="unitpro-price-promo">Promo tahun pertama: <strong>Rp590.000/tahun</strong></p>
            <ul><li><Check size={16} /> Kasir, teknisi, dan stok sparepart</li><li><Check size={16} /> Notifikasi WhatsApp dan tracking</li><li><Check size={16} /> Nota, QRIS, laporan, dan ekspor</li><li><Check size={16} /> Hingga 10 karyawan</li></ul>
            <button className="unitpro-button primary" onClick={() => navigate('/login', { state: { tab: 'register', tier: 'pro', billing: 'yearly' } })}>Ambil promo Pro <ArrowRight size={18} /></button>
          </article>
          <article className="unitpro-price-card muted">
            <p className="unitpro-price-label">Multi Outlet</p>
            <h3>Untuk toko yang sedang berkembang</h3>
            <div className="unitpro-price"><strong>Rp249.000</strong><span>/ bulan</span></div>
            <p>Kontrol cabang, pengguna lebih banyak, dan laporan owner terpusat.</p>
            <ul><li><Check size={16} /> Beberapa outlet</li><li><Check size={16} /> Kontrol stok dan laporan terpusat</li><li><Check size={16} /> Prioritas pembaruan enterprise</li></ul>
            <a className="unitpro-button outlined" href="https://wa.me/6285382535050?text=Halo%20UnitPro%2C%20saya%20tertarik%20dengan%20paket%20Multi%20Outlet.">Masuk daftar tunggu</a>
          </article>
        </div>
      </section>

      <section className="unitpro-cta-section">
        <div>
          <p className="unitpro-kicker">Saatnya toko servis bergerak lebih rapi</p>
          <h2>Fokus perbaiki unit, bukan mencari catatan.</h2>
          <p>Mulai dari satu unit hari ini, lalu biarkan UnitPro menjaga prosesnya tetap jelas.</p>
        </div>
        <button className="unitpro-button primary" onClick={() => navigate('/login', { state: { tab: 'register', tier: 'free' } })}>Buat akun toko gratis <ArrowRight size={19} /></button>
      </section>

      <section className="unitpro-faq-section">
        <div className="unitpro-section-heading centered">
          <p className="unitpro-kicker">Pertanyaan umum</p>
          <h2>Semua yang perlu Anda tahu untuk mulai.</h2>
        </div>
        <div className="unitpro-faq-list">
          {faqs.map(([question, answer]) => (
            <details key={question}>
              <summary><span>{question}</span><CircleHelp size={19} /></summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="unitpro-footer">
        <div className="unitpro-footer-brand"><UnitProMark /><strong>Unit<span>Pro</span></strong></div>
        <p>Kelola unit. Tuntaskan servis.</p>
        <div><button onClick={() => navigate('/tracking')}>Lacak servis</button><button onClick={() => navigate('/login', { state: { tab: 'login' } })}>Masuk</button></div>
        <small>© {new Date().getFullYear()} UnitPro. Sistem operasional toko servis.</small>
      </footer>
    </main>
  );
}
