// Use only at HTML-string boundaries; React text children already escape data.
export const escapeHtml = (value = '') => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const safeImageUrl = (value = '') => {
  const text = String(value || '').trim();
  if (/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(text)) return escapeHtml(text);
  if (/^https?:\/\//i.test(text) || /^\/(?!\/)/.test(text)) return escapeHtml(text);
  return '';
};
