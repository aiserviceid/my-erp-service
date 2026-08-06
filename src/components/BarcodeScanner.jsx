import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: {width: 250, height: 250}, aspectRatio: 1.0 },
      /* verbose= */ false
    );
    
    scanner.render((decodedText) => {
      onScan(decodedText);
      try {
        scanner.clear().catch(() => {});
      } catch (err) {}
      onClose();
    }, (error) => {
      // ignore scanning errors
    });

    scannerRef.current = scanner;

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
      <div className="glass-panel animate-fade-in" style={{ width: '90%', maxWidth: '400px', backgroundColor: 'white', textAlign: 'center', position: 'relative', padding: '20px' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <X size={24} color="var(--text-muted)" />
        </button>
        <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Scan Barcode / QR</h3>
        <div id="reader" style={{ width: '100%' }}></div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
          Arahkan kamera ke Barcode.
        </p>
      </div>
    </div>
  );
}
