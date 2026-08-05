import { useState } from 'react';
import { MoreHorizontal, X } from 'lucide-react';

const PRIMARY_TAB_IDS = ['dashboard', 'pos', 'servis', 'keuangan'];

/**
 * Keeps the mobile navigation deliberately short. Operational screens that
 * are used less often remain one tap away in a native-style bottom sheet.
 */
export default function MobileTabBar({ tabs, activeTab, onChange, primaryTabIds = PRIMARY_TAB_IDS }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const primaryTabs = primaryTabIds
    .map((id) => tabs.find((tab) => tab.id === id))
    .filter(Boolean);
  const moreTabs = tabs.filter((tab) => !primaryTabIds.includes(tab.id));
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
              <Icon size={21} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
              <span>{tab.name.replace(/\s*&.*/, '').replace(' (POS)', '')}</span>
            </button>
          );
        })}
        {moreTabs.length > 0 && (
          <button
            type="button"
            className={`mobile-nav-item ${isMoreActive || isMoreOpen ? 'active' : ''}`}
            onClick={() => setIsMoreOpen(true)}
            aria-label="Buka menu lainnya"
          >
            <MoreHorizontal size={22} />
            <span>Lainnya</span>
          </button>
        )}
      </nav>

      {isMoreOpen && (
        <div className="mobile-menu-layer" role="presentation" onClick={() => setIsMoreOpen(false)}>
          <section
            className="mobile-menu-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Menu lainnya"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-sheet-header">
              <div>
                <p>MENU OPERASIONAL</p>
                <h3>Fitur lainnya</h3>
              </div>
              <button type="button" className="mobile-sheet-close" onClick={() => setIsMoreOpen(false)} aria-label="Tutup menu">
                <X size={20} />
              </button>
            </div>
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
