export const copyText = async (value) => {
  const text = String(value ?? '').trim();
  if (!text) return false;

  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Android WebView tertentu menampilkan Clipboard API tetapi menolak akses.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.inset = '0 auto auto -9999px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  try {
    return Boolean(document.execCommand('copy'));
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
};
