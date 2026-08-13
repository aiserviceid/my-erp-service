import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera, CameraOff, Keyboard, ArrowRight } from 'lucide-react';

export default function BarcodeScanner({ onScan, onClose, placeholder = 'Masukkan kode barcode / resi...' }) {
  const scannerRef = useRef(null);
  const videoRef = useRef(null);
  const [cameraError, setCameraError] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [mode, setMode] = useState('camera'); // 'camera' | 'manual'
  const [usingNativeDetector, setUsingNativeDetector] = useState(false);

  useEffect(() => {
    let streamTrack = null;
    let detectorInterval = null;

    if (mode !== 'camera') return;

    // Check if browser native BarcodeDetector is available
    if ('BarcodeDetector' in window) {
      setUsingNativeDetector(true);
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          streamTrack = stream.getVideoTracks()[0];

          const barcodeDetector = new window.BarcodeDetector({
            formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e'],
          });

          detectorInterval = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState === 4) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0) {
                  const rawVal = barcodes[0].rawValue;
                  if (rawVal) {
                    clearInterval(detectorInterval);
                    if (streamTrack) streamTrack.stop();
                    onScan(rawVal);
                    onClose();
                  }
                }
              } catch (e) {
                // frame detection error ignore
              }
            }
          }, 300);
        })
        .catch((err) => {
          console.warn('Native BarcodeDetector camera stream failed, falling back to local library:', err);
          initLocalHtml5Scanner();
        });
    } else {
      initLocalHtml5Scanner();
    }

    function initLocalHtml5Scanner() {
      setUsingNativeDetector(false);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
          .then((stream) => {
            stream.getTracks().forEach((track) => track.stop());
            renderScanner();
          })
          .catch((err) => {
            console.warn('Camera permission denied or unavailable:', err);
            setCameraError('Akses kamera ditolak atau perangkat tidak mendukung. Izinkan kamera di pengaturan browser/HP Anda atau gunakan input manual.');
          });
      } else {
        renderScanner();
      }
    }

    function renderScanner() {
      try {
        const scanner = new Html5QrcodeScanner(
          'reader',
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          false
        );

        scanner.render(
          (decodedText) => {
            onScan(decodedText);
            try {
              scanner.clear().catch(() => {});
            } catch (err) {}
            onClose();
          },
          () => {}
        );

        scannerRef.current = scanner;
      } catch (err) {
        setCameraError('Gagal menginisialisasi kamera. Gunakan pilihan input manual di bawah.');
      }
    }

    return () => {
      if (detectorInterval) clearInterval(detectorInterval);
      if (streamTrack) streamTrack.stop();
      if (scannerRef.current) {
        try {
          scannerRef.current.clear().catch(() => {});
        } catch (err) {}
      }
    };
  }, [mode, onScan, onClose]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onScan(manualCode.trim());
    onClose();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '1rem' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '420px', backgroundColor: '#ffffff', textAlign: 'center', position: 'relative', padding: '24px', borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
        <button
          type="button"
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#64748b' }}
        >
          <X size={20} />
        </button>

        <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Camera size={22} color="#0284c7" /> Scan Barcode / Kode
        </h3>

        {/* Mode Switcher */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '4px', marginBottom: '16px' }}>
          <button
            type="button"
            className={`btn ${mode === 'camera' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, padding: '6px 12px', fontSize: '0.82rem', borderRadius: '8px' }}
            onClick={() => { setMode('camera'); setCameraError(null); }}
          >
            <Camera size={15} /> Kamera Perangkat
          </button>
          <button
            type="button"
            className={`btn ${mode === 'manual' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, padding: '6px 12px', fontSize: '0.82rem', borderRadius: '8px' }}
            onClick={() => setMode('manual')}
          >
            <Keyboard size={15} /> Input Manual
          </button>
        </div>

        {mode === 'camera' ? (
          cameraError ? (
            <div style={{ padding: '20px 10px', color: '#dc2626' }}>
              <CameraOff size={44} style={{ margin: '0 auto 12px', display: 'block', color: '#ef4444' }} />
              <p style={{ fontSize: '0.88rem', lineHeight: 1.5, color: '#475569', marginBottom: '16px' }}>{cameraError}</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setMode('manual')}
                style={{ width: '100%' }}
              >
                <Keyboard size={16} /> Masukkan Kode Manual
              </button>
            </div>
          ) : (
            <div>
              {usingNativeDetector ? (
                <div style={{ position: 'relative', width: '100%', borderRadius: '14px', overflow: 'hidden', background: '#000', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <video ref={videoRef} playsInline muted style={{ width: '100%', height: '260px', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', width: '200px', height: '200px', border: '3px dashed #38bdf8', borderRadius: '16px', boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)' }} />
                </div>
              ) : (
                <div id="reader" style={{ width: '100%', borderRadius: '14px', overflow: 'hidden' }} />
              )}
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '12px' }}>
                Arahkan kamera ke Barcode produk atau QR Resi Servis. Tanpa koneksi server luar.
              </p>
            </div>
          )
        ) : (
          <form onSubmit={handleManualSubmit} style={{ display: 'grid', gap: '12px', textAlign: 'left' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>
              Kode Barcode / Nomor Resi:
            </label>
            <input
              type="text"
              className="input-field"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder={placeholder}
              autoFocus
              style={{ padding: '12px 14px', fontSize: '1rem', width: '100%' }}
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
              Gunakan Kode Ini <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

