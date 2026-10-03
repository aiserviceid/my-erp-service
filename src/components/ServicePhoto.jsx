import React, { useRef, useState } from 'react';
import { compressImageFile } from '../utils/imageCompressor';

export function ServicePhoto({ src }) {
  // Only locally encoded images are accepted; never load arbitrary remote URLs.
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(src || '')) return null;
  return <details style={{ margin: '8px 0' }}><summary>Foto kondisi unit</summary><img src={src} alt="Kondisi unit saat diterima" loading="lazy" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }} /></details>;
}

export function ServicePhotoInput({ value, onChange, onBusy }) {
  const camera = useRef(null);
  const gallery = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const choose = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/') || file.size > 15 * 1024 * 1024) {
      setError('Pilih foto gambar maksimal 15 MB.');
      return;
    }
    setBusy(true); onBusy(true);
    try {
      const result = await compressImageFile(file, 1280, 0.65);
      if (!/^data:image\/(jpeg|webp);base64,/.test(result) || result.length > 700000) throw new Error('Foto terlalu besar atau format tidak didukung. Pilih foto lain.');
      onChange(result);
    } catch (err) { setError(err.message || 'Foto gagal diproses. Silakan coba lagi.'); }
    finally { setBusy(false); onBusy(false); }
  };
  return <div style={{ marginBottom: 16 }}>
    <p>Foto kondisi unit pertama (opsional)</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => camera.current.click()}>Ambil foto</button>
      <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => gallery.current.click()}>Pilih dari galeri</button>
      {value && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => { onChange(null); setError(''); }}>Hapus foto</button>}
    </div>
    <input ref={camera} type="file" aria-label="Ambil foto kondisi unit" accept="image/*" capture="environment" hidden onChange={choose} />
    <input ref={gallery} type="file" aria-label="Pilih foto kondisi unit" accept="image/*" hidden onChange={choose} />
    {busy && <p role="status">Memperkecil foto…</p>}
    {error && <p role="alert">{error}</p>}
    {value && <img src={value} alt="Pratinjau foto kondisi unit" style={{ display: 'block', maxWidth: '100%', maxHeight: 160, marginTop: 8, borderRadius: 8 }} />}
  </div>;
}
