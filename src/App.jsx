import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import EmployeePortal from './pages/EmployeePortal';
import PublicTracking from './pages/PublicTracking';
import LandingPage from './pages/LandingPage';
import SuperAdmin from './pages/SuperAdmin';
import { useStore } from './store/useStore';

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
    const colors = themeColors[settings.theme] || themeColors.laptop;
    const root = document.documentElement;
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--primary-hover', colors.primaryHover);
    root.style.setProperty('--primary-light', colors.primaryLight);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--accent-hover', colors.accentHover);
  }, [settings.theme]);

  return (
    <Router>
      <Routes>
        {/* Halaman Utama Publik */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Halaman Login Karyawan / Admin */}
        <Route path="/login" element={!tenant.code ? <Login /> : <Navigate to="/admin" />} />
        
        {/* Dashboard Internal */}
        <Route path="/admin" element={tenant.code ? <AdminDashboard /> : <Navigate to="/login" />} />
        <Route path="/employee" element={<EmployeePortal />} />
        <Route path="/super-admin" element={<SuperAdmin />} />
        
        {/* Cek Resi Publik */}
        <Route path="/tracking" element={<PublicTracking />} />
      </Routes>
    </Router>
  );
}

export default App;
