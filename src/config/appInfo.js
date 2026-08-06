import packageJson from '../../package.json';

export const APP_VERSION = packageJson.version;
export const APK_FILE_NAME = `UnitPro-v${APP_VERSION}.apk`;
export const APK_DOWNLOAD_PATH = '/downloads/UnitPro.apk';
export const APK_PUBLIC_URL = import.meta.env.VITE_APK_PUBLIC_URL || 'https://unitproid.vercel.app/downloads/UnitPro.apk';
