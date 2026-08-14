const isAdminRoute = () => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/');
};

const destructiveTextPattern = /^(?:🗑\s*)?(?:Hapus Pelanggan(?:\s*\+\s*\d+\s*Nota)?|Hapus pelanggan beserta nota)$/i;

const isCustomerDeleteControl = (element) => {
  if (!(element instanceof Element)) return false;
  if (element.matches('[data-editor-tab="delete"], [data-delete-all], [data-customer-delete="button"]')) return true;
  if (element.tagName === 'BUTTON' && destructiveTextPattern.test(String(element.textContent || '').trim())) return true;
  return false;
};

const removeUnauthorizedDeleteControls = () => {
  if (isAdminRoute()) return;

  document
    .querySelectorAll('[data-editor-tab="delete"], [data-delete-all], [data-customer-delete="button"]')
    .forEach((node) => node.remove());

  document.querySelectorAll('button').forEach((button) => {
    if (destructiveTextPattern.test(String(button.textContent || '').trim())) button.remove();
  });

  document.querySelectorAll('[data-editor-tabs]').forEach((tabs) => {
    tabs.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
  });
};

if (typeof window !== 'undefined' && !window.__UNITPRO_ADMIN_ONLY_CUSTOMER_DELETE_GUARD__) {
  window.__UNITPRO_ADMIN_ONLY_CUSTOMER_DELETE_GUARD__ = true;

  document.addEventListener('click', (event) => {
    if (isAdminRoute()) return;
    const target = event.target instanceof Element
      ? event.target.closest('[data-editor-tab="delete"], [data-delete-all], [data-customer-delete="button"], button')
      : null;
    if (!target || !isCustomerDeleteControl(target)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    removeUnauthorizedDeleteControls();
  }, true);

  const observer = new MutationObserver(removeUnauthorizedDeleteControls);
  const start = () => {
    observer.observe(document.documentElement, { childList: true, subtree: true });
    removeUnauthorizedDeleteControls();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
