import { useState } from 'react';
import { MoreHorizontal, X } from 'lucide-react';

const PRIMARY_TAB_IDS = ['dashboard', 'servis', 'pos', 'keuangan'];
const PRIMARY_MENU_ORDER = ['master', 'pelanggan', 'karyawan', 'pengaturan'];

const getNavLabel = (tab) => ({
  dashboard: 'Beranda',
  servis: 'Servis',
  pos: 'Kasir',
  keuangan: 'Keuangan',
}[tab.id] || tab.name.replace(/\s*&.*/, '').replace(' (POS)', ''));

/**
 * Keeps the mobile navigation deliberately short. Operational screens that
 * are used less often remain one tap away in a native-style bottom sheet.
 */
export default function MobileTabBar({ tabs, activeTab, onChange, primaryTabIds = PRIMARY_TAB_IDS }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const primaryTabs = primaryTabIds
    .map((id) => tabs.find((tab) => tab.id === id))
    .filter(Boolean);
  const moreTabs = tabs
    .filter((tab) => !primaryTabIds.includes(tab.id))
    .sort((left, right) => {
      const leftRank = PRIMARY_MENU_ORDER.indexOf(left.id);
      const rightRank = PRIMARY_MENU_ORDER.indexOf(right.id);
      return (leftRank === -1 ? 99 : leftRank) - (rightRank === -1 ? 99 : rightRank);
    });
  const isMoreActive = moreTabs.some((tab) => tab.id === activeTab);
  const navCount = primaryTabs.length + (moreTabs.length ? 1 : 0);

  const selectTab = (tabId) => {
    onChange(tabId);
    setIsMoreOpen(false);
  };

  return (
    <>
      <nav className="mobile-bottom-nav" style={{ gridTemplateColumns: `repeat(${navCount}, minmax(0, 1fr))` }} aria-label="Navigasi utama aplikasi">
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              className={`mobile-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => selectTab(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span className="mobile-nav-icon"><Icon size={21} strokeWidth={activeTab === tab.id ? 2.5 : 2} />{tab.badge && <b>{tab.badge}</b>}</span>
              <span>{getNavLabel(tab)}</span>
            </button>
          );
        })}
        {moreTabs.length > 0 && (
          <button
            type="button"
            className={`mobile-nav-item ${isMoreActive || isMoreOpen ? 'active' : ''}`}
            onClick={() => setIsMoreOpen(true)}
            aria-label="Buka seluruh menu aplikasi"
          >
            <span className="mobile-nav-icon"><MoreHorizontal size={22} />{moreTabs.some((tab) => tab.badge) && <b>•</b>}</span>
            <span>Menu</span>
          </button>
        )}
      </nav>

      {isMoreOpen && (
        <div className="mobile-menu-layer" role="presentation" onClick={() => setIsMoreOpen(false)}>
          <section
            className="mobile-menu-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Seluruh menu aplikasi"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-sheet-header">
              <div>
                <p>NAVIGASI TOKO</p>
                <h3>Kelola operasional</h3>
              </div>
              <button type="button" className="mobile-sheet-close" onClick={() => setIsMoreOpen(false)} aria-label="Tutup menu">
                <X size={20} />
              </button>
            </div>
            <p className="mobile-menu-description">Akses fitur pendukung tanpa membuat navigasi utama penuh.</p>
            <div className="mobile-menu-grid">
              {moreTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`mobile-menu-action ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => selectTab(tab.id)}
                  >
                    <span className="mobile-menu-icon"><Icon size={21} /></span>
                    <span>{tab.name}</span>
                    {tab.badge && <b>{tab.badge}</b>}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
