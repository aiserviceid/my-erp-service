import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', padding: '3rem 1.5rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: '#ffffff', borderRadius: '24px', padding: '2.5rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#0284c7', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
          <ArrowLeft size={18} /> Kembali ke Beranda
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <Lock size={32} color="#0284c7" />
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: '#0f172a' }}>Kebijakan Privasi (Privacy Policy)</h1>
        </div>

        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Terakhir diperbarui: 4 Agustus 2026. AIService.ID berkomitmen menjaga kerahasiaan dan keamanan data pribadi Anda.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', lineHeight: '1.7', color: '#334155', fontSize: '0.95rem' }}>
          <section>
            <h3 style={{ color: '#0f172a', fontWeight: '800' }}>1. Data yang Kami Kumpulkan</h3>
            <p>Kami mengumpulkan informasi toko (nama toko, nomor WhatsApp, alamat) dan data operasional servis semata-mata untuk keperluan penyediaan layanan operasional dan fitur notifikasi pelanggan.</p>
          </section>

          <section>
            <h3 style={{ color: '#0f172a', fontWeight: '800' }}>2. Perlindungan & Keamanan Data</h3>
            <p>Seluruh komunikasi data dienkripsi menggunakan protokol SSL/TLS standar industri. PIN keamanan disimpan dalam bentuk enkripsi terenkripsi (bcrypt hashing) dan tidak dapat dibaca oleh staf internal.</p>
          </section>

          <section>
            <h3 style={{ color: '#0f172a', fontWeight: '800' }}>3. Penggunaan Cookie & Storage</h3>
            <p>Aplikasi menggunakan enkripsi `localStorage` dan session cookies untuk mempertahankan status login pengguna yang sah pada perangkat yang digunakan.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
