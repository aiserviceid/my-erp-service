import packageJson from '../../package.json';

export const APP_VERSION = packageJson.version;
export const APK_FILE_NAME = `UnitPro-Android-v${APP_VERSION}.apk`;
export const APK_DOWNLOAD_PATH = `/downloads/${APK_FILE_NAME}`;
export const APK_RELEASE_URL = `https://github.com/aiserviceid/my-erp-service/releases/download/v${APP_VERSION}/${APK_FILE_NAME}`;
export const APK_PUBLIC_URL = import.meta.env.VITE_APK_PUBLIC_URL || APK_RELEASE_URL;
