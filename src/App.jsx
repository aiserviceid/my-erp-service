import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, Component } from 'react';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import EmployeePortal from './pages/EmployeePortal';
import PublicTracking from './pages/PublicTracking';
import LandingPage from './pages/LandingPage';
import SuperAdmin from './pages/SuperAdmin';
import PublicCatalog from './pages/PublicCatalog';
import { useStore } from './store/useStore';

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
  hp: {
    primary: '#0ea5e9', // Sky blue
    primaryHover: '#0284c7',
    primaryLight: '#38bdf8',
    accent: '#06b6d4', // Cyan
    accentHover: '#0891b2',
  },
  laptop: {
    primary: '#0f172a', // Slate
    primaryHover: '#1e293b',
    primaryLight: '#334155',
    accent: '#10b981', // Emerald
    accentHover: '#059669',
  },
  motor: {
    primary: '#18181b', // Zinc
    primaryHover: '#27272a',
    primaryLight: '#3f3f46',
    accent: '#f97316', // Orange
    accentHover: '#ea580c',
  }
};

function App() {
  const tenant = useStore((state) => state.tenant);
  const settings = tenant?.settings || { theme: 'laptop' };

  // Apply Theme CSS Variables dynamically
  useEffect(() => {
    try {
      const currentTheme = settings?.theme || 'laptop';
      const colors = themeColors[currentTheme] || themeColors.laptop;
      const root = document.documentElement;
      root.style.setProperty('--primary', colors.primary);
      root.style.setProperty('--primary-hover', colors.primaryHover);
      root.style.setProperty('--primary-light', colors.primaryLight);
      root.style.setProperty('--accent', colors.accent);
      root.style.setProperty('--accent-hover', colors.accentHover);
    } catch (e) {
      console.warn('Theme apply error:', e);
    }
  }, [settings?.theme]);

  const hasTenantCode = Boolean(tenant?.code);

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Halaman Utama Publik */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Halaman Login Karyawan / Admin */}
          <Route path="/login" element={!hasTenantCode ? <Login /> : <Navigate to="/admin" />} />
          
          {/* Dashboard Internal */}
          <Route path="/admin" element={hasTenantCode ? <AdminDashboard /> : <Navigate to="/login" />} />
          <Route path="/employee" element={<EmployeePortal />} />
          <Route path="/super-admin" element={<SuperAdmin />} />
          
          {/* Cek Resi Publik */}
          <Route path="/tracking" element={<PublicTracking />} />
          
          {/* Katalog Produk Publik */}
          <Route path="/katalog/:tenantCode" element={<PublicCatalog />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
