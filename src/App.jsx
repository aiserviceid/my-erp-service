import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useEffect, Component, lazy, Suspense } from 'react';
import { Capacitor } from '@capacitor/core';
import { useStore } from './store/useStore';
import PremiumFeedback from './components/PremiumFeedback';

const Login = lazy(() => import('./pages/Login'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const EmployeePortal = lazy(() => import('./pages/EmployeePortal'));
const PublicTracking = lazy(() => import('./pages/PublicTracking'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const SuperAdmin = lazy(() => import('./pages/SuperAdmin'));
const PublicCatalog = lazy(() => import('./pages/PublicCatalog'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const isNativeApp = Capacitor.isNativePlatform();

import { useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

function PageLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#0f172a' }} aria-label="Memuat halaman">
      <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#0284c7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ marginTop: '16px', fontSize: '0.9rem', fontWeight: '700', color: '#475569' }}>Memuat UnitPro...</p>
    </div>
  );
}

function OfflineNotice() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#ef4444', color: '#ffffff', zIndex: 11000, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)', fontSize: '0.86rem', fontWeight: '700' }}>
      <WifiOff size={18} />
      <span>Koneksi Internet Lambat / Offline. Periksa sambungan jaringan Anda.</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{ background: '#ffffff', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '4px 10px', fontWeight: '800', cursor: 'pointer', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
      >
        <RefreshCw size={14} /> Coba Lagi
      </button>
    </div>
  );
}

function TrackResiRedirect() {
  const { resi } = useParams();
  return <Navigate to={`/tracking?resi=${encodeURIComponent(resi || '')}`} replace />;
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050811', color: 'white', padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f87171' }}>Terjadi Kendala Memuat Halaman</h2>
          <p style={{ color: '#94a3b8', maxWidth: '500px', margin: '1rem 0 1rem 0' }}>
            Data cache lama browser mungkin perlu dibersihkan. Klik tombol di bawah untuk memuat ulang aplikasi secara bersih:
          </p>
          {this.state.error && (
            <details style={{ margin: '0 0 1.5rem 0', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 16px', maxWidth: '600px', textAlign: 'left', cursor: 'pointer' }}>
              <summary style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: '700' }}>Detail Error (klik untuk lihat)</summary>
              <pre style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {this.state.error?.toString()}
              </pre>
            </details>
          )}
          <button 
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.href = '/';
            }}
            style={{
              padding: '12px 28px', background: '#0ea5e9', color: 'white', border: 'none',
              borderRadius: '12px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer'
            }}
          >
            Bersihkan Cache & Refresh 🔄
          </button>
        </div>
      );
    }
    return this.props.children;
  }

}

const themeColors = {
  default: {
    primary: '#0f172a',
    primaryHover: '#1e293b',
    primaryLight: '#334155',
    accent: '#10b981',
    accentHover: '#059669',
  },
  dark: {
    primary: '#0f172a',
    primaryHover: '#1e293b',
    primaryLight: '#334155',
    accent: '#10b981',
    accentHover: '#059669',
  }
};

function App() {
  const tenant = useStore((state) => state.tenant);
  const settings = tenant?.settings || { theme: 'default' };

  // Apply Theme CSS Variables dynamically
  useEffect(() => {
    try {
      const currentTheme = settings?.theme || 'default';
      const colors = themeColors[currentTheme] || themeColors.default;
      const root = document.documentElement;
      root.style.setProperty('--primary', colors.primary);
      root.style.setProperty('--primary-hover', colors.primaryHover);
      root.style.setProperty('--primary-light', colors.primaryLight);
      root.style.setProperty('--accent', colors.accent);
      root.style.setProperty('--accent-hover', colors.accentHover);

      // Apply true dark mode via data attribute
      if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    } catch (e) {
      console.warn('Theme apply error:', e);
    }
  }, [settings?.theme]);

  // The Android build has its own compact, task-focused shell. Keeping this
  // marker on the document lets the public web site retain its desktop layout.
  useEffect(() => {
    document.documentElement.classList.toggle('native-app', isNativeApp);
    return () => document.documentElement.classList.remove('native-app');
  }, []);

  const hasTenantCode = Boolean(tenant?.code);

  return (
    <ErrorBoundary>
      <OfflineNotice />
      <PremiumFeedback />
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={isNativeApp ? <Navigate to="/login" replace /> : <LandingPage />} />
            <Route path="/login" element={!hasTenantCode ? <Login /> : <Navigate to="/admin" />} />
            <Route path="/admin" element={hasTenantCode ? <AdminDashboard /> : <Navigate to="/login" />} />
            <Route path="/employee" element={<EmployeePortal />} />
            <Route path="/super-admin" element={<SuperAdmin />} />
            <Route path="/tracking" element={<PublicTracking />} />
            <Route path="/track/:resi" element={<TrackResiRedirect />} />
            <Route path="/katalog/:tenantCode" element={<PublicCatalog />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="*" element={<Navigate to={isNativeApp ? '/login' : '/'} replace />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
