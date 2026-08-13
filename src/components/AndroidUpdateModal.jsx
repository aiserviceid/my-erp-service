import React from 'react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { Smartphone, Download, X, Sparkles, CheckCircle } from 'lucide-react';
import { APP_VERSION, APK_PUBLIC_URL } from '../config/appInfo';

export default function AndroidUpdateModal({ updateInfo, onClose }) {
  if (!updateInfo) return null;

  const handleDownload = async () => {
    const targetUrl = updateInfo.apkUrl || APK_PUBLIC_URL;
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: targetUrl });
      return;
    }
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="unitpro-update-backdrop">
      <div className="unitpro-update-dialog">
        {!updateInfo.forceUpdate && (
          <button type="button" className="unitpro-update-close" onClick={onClose} aria-label="Tutup update">
            <X size={18} />
          </button>
        )}

        <div className="unitpro-update-head">
          <div className="unitpro-update-icon">
            <Smartphone size={32} />
          </div>
          <h3>Pembaruan Aplikasi Tersedia</h3>
          <span>Versi baru: v{updateInfo.version || '1.2.0'} | Versi Anda: v{APP_VERSION}</span>
        </div>

        <div className="unitpro-update-changelog">
          <strong><Sparkles size={15} /> Apa yang baru:</strong>
          <div>
            {(updateInfo.changelog || ['Peningkatan performa dan pembaruan fitur terbaru UnitPro.']).map((item, index) => (
              <p key={`${item}-${index}`}>
                <CheckCircle size={14} />
                <span>{item}</span>
              </p>
            ))}
          </div>
        </div>

        <button type="button" className="unitpro-update-primary" onClick={handleDownload}>
          <Download size={18} /> Unduh & Update APK Sekarang
        </button>
        <p className="unitpro-update-note">
          Setelah unduhan selesai, buka file APK dan pilih Perbarui. Data toko, kasir, dan tim tetap tersimpan.
        </p>

        {!updateInfo.forceUpdate && (
          <button type="button" className="unitpro-update-later" onClick={onClose}>
            Nanti Saja
          </button>
        )}
      </div>
    </div>
  );
}
