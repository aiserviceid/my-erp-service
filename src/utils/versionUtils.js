import { APP_VERSION } from '../config/appInfo';

const normalizeParts = (version = '') => String(version)
  .replace(/^v/i, '')
  .split('.')
  .map((part) => Number.parseInt(part.replace(/\D/g, ''), 10) || 0);

export function compareVersions(left = '', right = '') {
  const leftParts = normalizeParts(left);
  const rightParts = normalizeParts(right);
  const max = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < max; index += 1) {
    const leftValue = leftParts[index] || 0;
    const rightValue = rightParts[index] || 0;
    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }

  return 0;
}

export function isNewerVersion(candidateVersion, currentVersion = APP_VERSION) {
  return compareVersions(candidateVersion, currentVersion) > 0;
}

export async function fetchAppVersionInfo() {
  const response = await fetch('/version.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Gagal mengambil info versi aplikasi.');
  return response.json();
}
