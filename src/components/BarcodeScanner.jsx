import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, CameraOff } from 'lucide-react';

export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => {
    // Explicit camera permission check
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          // Release initial test stream so html5-qrcode can take over
          stream.getTracks().forEach((track) => track.stop());
          initScanner();
        })
        .catch((err) => {
          console.warn('Camera permission denied or unavailable:', err);
          setCameraError('Akses kamera tidak diizinkan atau tidak tersedia. Izinkan akses kamera di pengaturan perangkat Anda.');
        });
    } else {
      initScanner();
    }

    function initScanner() {
      try {
        const scanner = new Html5QrcodeScanner(
          "reader",
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          /* verbose= */ false
        );

        scanner.render((decodedText) => {
          onScan(decodedText);
          try {
            scanner.clear().catch(() => {});
          } catch (err) {}
          onClose();
        }, (error) => {
          // ignore scan frame errors
        });

        scannerRef.current = scanner;
      } catch (err) {
        setCameraError('Gagal menginisialisasi kamera. Pastikan browser atau APK memiliki izin kamera.');
      }
    }

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear().catch(() => {});
        } catch (err) {}
      }
    };
  }, [onScan, onClose]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
      <div className="glass-panel animate-fade-in" style={{ width: '90%', maxWidth: '400px', backgroundColor: 'white', textAlign: 'center', position: 'relative', padding: '20px', borderRadius: '16px' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <X size={24} color="var(--text-muted)" />
        </button>
        <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Scan Barcode / QR</h3>
        
        {cameraError ? (
          <div style={{ padding: '20px 10px', color: '#ef4444' }}>
            <CameraOff size={40} style={{ margin: '0 auto 10px', display: 'block' }} />
            <p style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{cameraError}</p>
            <button className="btn btn-ghost" onClick={onClose} style={{ marginTop: '15px' }}>Tutup</button>
          </div>
        ) : (
          <>
            <div id="reader" style={{ width: '100%' }}></div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
              Arahkan kamera ke Barcode / QR Code.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
