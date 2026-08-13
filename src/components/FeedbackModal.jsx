import React, { useState } from 'react';
import { MessageSquareHeart, Send, X, Star, CheckCircle, Sparkles } from 'lucide-react';
import { apiService } from '../services/api';

export default function FeedbackModal({ tenant, user, onClose, onSuccess }) {
  const [category, setCategory] = useState('Saran');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [senderName, setSenderName] = useState(user?.name || tenant?.name || '');
  const [senderPhone, setSenderPhone] = useState(user?.phone || tenant?.settings?.store_wa || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Mohon tuliskan pesan kritik & saran Anda.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      await apiService.submitFeedback({
        tenant_code: tenant?.code || '',
        tenant_name: tenant?.name || 'Toko Servis',
        sender_name: senderName || 'Admin Toko',
        sender_phone: senderPhone,
        category,
        subject: subject.trim() || category,
        message: message.trim(),
        rating,
      });

      setSubmitting(false);
      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Feedback submit error:', err);
      setError('Gagal mengirim saran. Silakan coba lagi.');
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        background: '#ffffff', width: '100%', maxWidth: '520px',
        borderRadius: '20px', padding: '28px 24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        position: 'relative', overflow: 'hidden', border: '1px solid #e2e8f0'
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute', right: '16px', top: '16px',
            background: '#f1f5f9', border: 'none', width: '32px', height: '32px',
            borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b'
          }}
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <div style={{ width: '64px', height: '64px', background: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
              <CheckCircle size={36} />
            </div>
            <h3 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '1.25rem', fontWeight: '800' }}>Terima Kasih Banyak!</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 20px' }}>
              Kritik & saran Anda telah langsung terkirim ke <strong>Super Admin UnitPro</strong>. Kami akan menggunakannya untuk terus menyempurnakan aplikasi.
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: 'white', border: 'none', padding: '12px', borderRadius: '10px',
                fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer'
              }}
            >
              Selesai & Tutup
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <MessageSquareHeart size={22} />
              </div>
              <div>
                <h3 style={{ margin: '0', color: '#0f172a', fontSize: '1.15rem', fontWeight: '800' }}>Kritik & Saran Pengembang</h3>
                <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.78rem' }}>Semua masukan dikirim langsung ke Super Admin UnitPro</p>
              </div>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: '10px', fontSize: '0.82rem', marginBottom: '14px', fontWeight: '600' }}>
                {error}
              </div>
            )}

            {/* Rating Stars */}
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #f1f5f9', marginBottom: '14px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                Berapa bintang kepuasan Anda memakai UnitPro?
              </span>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                  >
                    <Star
                      size={24}
                      fill={star <= rating ? '#f59e0b' : 'none'}
                      color={star <= rating ? '#f59e0b' : '#cbd5e1'}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Category selection */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Kategori Pesan</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'Saran', label: '💡 Saran Perbaikan' },
                  { id: 'Kritik', label: '💬 Kritik Masukan' },
                  { id: 'Kendala / Bug', label: '⚠️ Kendala / Error' },
                  { id: 'Permintaan Fitur', label: '🚀 Permintaan Fitur' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id)}
                    style={{
                      padding: '8px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '700',
                      border: category === item.id ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      background: category === item.id ? '#f0f9ff' : '#ffffff',
                      color: category === item.id ? '#0284c7' : '#475569',
                      cursor: 'pointer', textAlign: 'left'
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sender Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Nama Anda</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Nama Anda"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>No. WA (Opsional)</label>
                <input
                  type="text"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="0812xxx"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Subject */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Judul Singkat / Topik</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Contoh: Usul penambahan fitur cetak nota..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
              />
            </div>

            {/* Message Body */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Detail Kritik, Saran, atau Masukan *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tuliskan masukan Anda dengan jelas di sini agar tim pengembang dapat memahami dengan baik..."
                rows={4}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', resize: 'vertical', boxSizing: 'border-box', lineHeight: '1.4' }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: 'white', border: 'none', padding: '12px', borderRadius: '10px',
                fontWeight: '800', fontSize: '0.9rem', cursor: submitting ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)', opacity: submitting ? 0.7 : 1
              }}
            >
              <Send size={16} /> {submitting ? 'Mengirim Masukan...' : 'Kirim Kritik & Saran ke Super Admin'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
