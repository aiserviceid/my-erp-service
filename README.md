# UnitPro / Tracking Service

Web app dan APK Android untuk toko servis, kasir, tracking, dan dashboard admin.

## Jalankan lokal

- `npm install`
- `npm run dev`

## Build web

- `npm run build`

## Build Android APK

- `npm run sync:android`
- `cd android`
- `./gradlew assembleRelease`

APK release akan dibuat di `android/app/build/outputs/apk/release/`.

## Publish APK

- File unduhan publik ada di `public/downloads/UnitPro.apk`
- Tombol unduh landing page memakai file itu langsung
- Workflow GitHub Actions `build-apk.yml` sekarang membangun `release APK` dan menamai artefaknya `UnitPro-v<versi>.apk`

## Versi aplikasi

- Versi utama diambil dari `package.json`
- Android `versionName` dan label unduhan mengikuti versi tersebut
