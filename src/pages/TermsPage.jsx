import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', padding: '3rem 1.5rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: '#ffffff', borderRadius: '24px', padding: '2.5rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#0284c7', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
          <ArrowLeft size={18} /> Kembali ke Beranda
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <ShieldCheck size={32} color="#0284c7" />
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: '#0f172a' }}>Syarat & Ketentuan Layanan (Terms of Service)</h1>
        </div>

        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Terakhir diperbarui: 4 Agustus 2026. Dengan mendaftar dan menggunakan layanan AIService.ID, Anda menyetujui ketentuan di bawah ini.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', lineHeight: '1.7', color: '#334155', fontSize: '0.95rem' }}>
          <section>
            <h3 style={{ color: '#0f172a', fontWeight: '800' }}>1. Ketentuan Akun & Keamanan Data</h3>
            <p>Pengguna bertanggung jawab penuh atas kerahasiaan Kode Toko dan PIN keamanan akun. AIService.ID tidak bertanggung jawab atas kerugian yang disebabkan oleh penyalahgunaan PIN oleh pihak yang tidak berwenang.</p>
          </section>

          <section>
            <h3 style={{ color: '#0f172a', fontWeight: '800' }}>2. Penggunaan Layanan SaaS & Batasan Tier</h3>
            <p>Setiap paket berlangganan (Free, Pro Titan, Enterprise) memiliki batasan kuota transaksi, jumlah servis, dan fitur terdaftar sesuai syarat yang tercantum pada tabel harga resmi.</p>
          </section>

          <section>
            <h3 style={{ color: '#0f172a', fontWeight: '800' }}>3. Pembayaran & Pembatalan Langganan</h3>
            <p>Biaya langganan dibayarkan secara di muka (prepaid) secara bulanan atau tahunan melalui kanal pembayaran resmi terdaftar. Tidak ada pengembalian dana (refund) untuk periode berlangganan yang telah berjalan.</p>
          </section>

          <section>
            <h3 style={{ color: '#0f172a', fontWeight: '800' }}>4. Hak Cipta & Kepemilikan Data</h3>
            <p>Data transaksi, pelanggan, dan daftar servis adalah 100% milik pemilik toko (tenant). AIService.ID menjamin kerahasiaan data dan tidak akan memperjualbelikan data toko kepada pihak ketiga mana pun.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
