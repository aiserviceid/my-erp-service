import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('AppErrorBoundary caught an error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleBackToLogin = () => {
    window.location.href = '/login';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const message = this.state.error?.message || 'Terjadi kesalahan yang tidak terduga.';

    return (
      <main
        role="alert"
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
          background: 'linear-gradient(180deg, #f8fafc 0%, #e0f2fe 100%)',
          fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: '#0f172a',
        }}
      >
        <section
          style={{
            width: 'min(100%, 440px)',
            borderRadius: '24px',
            padding: '24px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 48px rgba(15, 23, 42, 0.12)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '44px', marginBottom: '10px' }}>⚠️</div>
          <h1 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 900 }}>
            Aplikasi perlu dimuat ulang
          </h1>
          <p style={{ margin: '0 0 18px', color: '#64748b', lineHeight: 1.55, fontSize: '14px' }}>
            Ada bagian aplikasi yang gagal dimuat. Data Anda tetap aman; coba muat ulang halaman atau kembali ke login.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '14px',
            }}
          >
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                minHeight: '44px',
                border: 0,
                borderRadius: '12px',
                background: '#0284c7',
                color: '#fff',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Muat Ulang
            </button>
            <button
              type="button"
              onClick={this.handleBackToLogin}
              style={{
                minHeight: '44px',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                background: '#fff',
                color: '#334155',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Ke Login
            </button>
          </div>
          <details style={{ textAlign: 'left', color: '#64748b', fontSize: '12px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Detail teknis</summary>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                marginTop: '8px',
                padding: '10px',
                borderRadius: '10px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              {message}
            </pre>
          </details>
        </section>
      </main>
    );
  }
}
