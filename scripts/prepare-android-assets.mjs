import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

// The web deployment needs the downloadable APK in /downloads, but embedding
// that same file in the Capacitor bundle makes every Android build contain a
// full copy of itself.
const downloadableApk = resolve('dist', 'downloads', 'UnitPro.apk');

await rm(downloadableApk, { force: true });
console.log('Android assets ready: downloadable APK excluded from the native bundle.');
