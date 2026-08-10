# Implementation Plan — Fix QA Priority Findings (08.08.2026)

This plan addresses all 3 priority QA findings and 4 minor enhancements for the UnitPro application on branch `agent/qa-fix-priority-findings`.

---

## User Review Required

> [!IMPORTANT]
> The changes affect WhatsApp notification sending, inventory item category classification, dashboard layout structure, onboarding progress tracking, route redirections, and session cleanup upon logout. All modifications adhere strictly to existing features and preserve all financial/reporting functionalities.

---

## Proposed Changes

### 1. WhatsApp Phone Normalization & Conflict Detection (Bug 1)

#### [MODIFY] [notificationService.js](file:///d:/data%20ipud/aiservice%20beckup/TRACKING%20SERVICE/src/services/notificationService.js)
- Ensure `normalizeWhatsAppNumber` handles all formats: `082282760606` -> `6282282760606`, `+6282282760606` -> `6282282760606`, `6282282760606` -> `6282282760606`.
- Add helper `findMatchingEmployee(phone, employees)` to check if a normalized phone number matches any employee phone in the tenant.
- Update `sendWhatsAppNotification` to check employee phone conflict and return warning / block sending if a conflict exists unless explicitly overridden.

#### [MODIFY] [AdminDashboard.jsx](file:///d:/data%20ipud/aiservice%20beckup/TRACKING%20SERVICE/src/pages/AdminDashboard.jsx)
- In `handleCreateService`: check if `customer_phone` matches any employee phone in `users`/`tenant`. If matched, show warning confirm dialog ("Nomor WhatsApp ini sama dengan nomor karyawan [nama]. Pastikan ini nomor pelanggan, bukan nomor teknisi/kasir.") defaulting to cancel/fix. Proceed only on explicit user confirmation.
- In manual WhatsApp sending / status update actions: check for employee phone conflict before sending. Show warning alert if conflicted.

#### [MODIFY] [PremiumFinanceReport.jsx](file:///d:/data%20ipud/aiservice%20beckup/TRACKING%20SERVICE/src/components/PremiumFinanceReport.jsx)
- In **Piutang / Belum Lunas** section: compare `customer_phone` against employee list (`users` / `tenant.employees`).
- Display red label: `⚠ Sama dengan WA karyawan: [nama]` when conflict is detected.
- Prevent "Kirim WA Tagihan" from opening WhatsApp when conflicted and display alert: `"Nomor WA pelanggan ini sama dengan nomor karyawan. Perbaiki nomor pelanggan dulu agar tagihan tidak salah alamat."`.

---

### 2. Item Category Consistency ("Service Mainboard" Bug 2)

#### [MODIFY] [POSView.jsx](file:///d:/data%20ipud/aiservice%20beckup/TRACKING%20SERVICE/src/components/POSView.jsx)
#### [MODIFY] [EmployeePortal.jsx](file:///d:/data%20ipud/aiservice%20beckup/TRACKING%20SERVICE/src/pages/EmployeePortal.jsx)
- Refactor `isServiceItem` helper function to prioritize explicit `category`:
  - `serviceCategories`: `['JASA', 'SERVIS', 'SERVICE', 'LAYANAN']` -> returns `true`.
  - `physicalCategories`: `['SPAREPART', 'SPARE_PART', 'AKSESORIS', 'BARANG', 'PRODUK', 'PRODUCT']` -> returns `false`.
  - Check keywords in name only as fallback when `category` is empty/unspecified.
- Ensure item with category `SPAREPART` named "service mainboard" is correctly treated as physical SPAREPART in POS, Master Products, and Employee Portal.

---

### 3. Sidebar Persistence on Team Page (Bug 3)

#### [MODIFY] [index.css](file:///d:/data%20ipud/aiservice%20beckup/TRACKING%20SERVICE/src/index.css)
- Add desktop CSS guard block:
  ```css
  @media (min-width: 769px) {
    body:not(.native-app) .dashboard-layout > .sidebar {
      display: flex !important;
      flex-direction: column !important;
      visibility: visible !important;
      opacity: 1 !important;
    }

    body:not(.native-app) .dashboard-layout > .sidebar .nav-item {
      display: flex !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
  }
  ```
- Ensure desktop sidebar is hidden on native mobile apps (`body.native-app`).

#### [MODIFY] [AdminDashboard.jsx](file:///d:/data%20ipud/aiservice%20beckup/TRACKING%20SERVICE/src/pages/AdminDashboard.jsx)
- Verify `activeTab === 'karyawan'` does not affect main layout structure or hide `.sidebar`. `empTab` sub-tabs (`daftar`, `kasbon`, `absensi`) only switch internal content within the Team view.

---

### 4. Minor Enhancements (Items 4, 5, 6, 7)

#### [MODIFY] [OnboardingProgressCard.jsx](file:///d:/data%20ipud/aiservice%20beckup/TRACKING%20SERVICE/src/components/OnboardingProgressCard.jsx)
- Update onboarding step 'Barang & Jasa' completion logic: `catalogReady = products.length > 0` (shows completed if products array has at least 1 item).

#### [MODIFY] [App.jsx](file:///d:/data%20ipud/aiservice%20beckup/TRACKING%20SERVICE/src/App.jsx)
- Add route `/track/:resi` redirecting automatically to `/tracking?resi=:resi`.

#### [MODIFY] [useStore.js](file:///d:/data%20ipud/aiservice%20beckup/TRACKING%20SERVICE/src/store/useStore.js) & [AdminDashboard.jsx](file:///d:/data%20ipud/aiservice%20beckup/TRACKING%20SERVICE/src/pages/AdminDashboard.jsx)
- Update `clearTenant()` and `handleLogout()` to clear all tenant and employee storage keys (`TENANT_CODE`, `TENANT_NAME`, `TENANT_API_URL`, `TENANT_TOKEN`, `TENANT_TIER`, `TENANT_PHONE`, `TENANT_SETTINGS`, `EMP_SESSION`, `EMPLOYEE_TOKEN`), call `sessionStorage.clear()`, reset state, and redirect to `/login`.

#### [MODIFY] [tierLimits.js](file:///d:/data%20ipud/aiservice%20beckup/TRACKING%20SERVICE/src/config/tierLimits.js), [AdminDashboard.jsx](file:///d:/data%20ipud/aiservice%20beckup/TRACKING%20SERVICE/src/pages/AdminDashboard.jsx), [EmployeePortal.jsx](file:///d:/data%20ipud/aiservice%20beckup/TRACKING%20SERVICE/src/pages/EmployeePortal.jsx)
- Ensure status dropdowns use `SERVICE_STATUSES` (`PROSES`, `DICEK`, `DIKERJAKAN`, `MENUNGGU_PART`, `SELESAI`, `DIAMBIL`, `DIBATALKAN`) consistently in both Admin Dashboard and Employee Portal.

---

## Verification Plan

### Automated Build Verification
- Run `npm ci` and `npm run build` to confirm zero build errors or syntax issues.

### Manual Verification Scenarios
1. **Service Registration with Conflict**: Create a new service entering customer WA matching an employee phone. Confirm warning dialog pops up and default action cancels.
2. **Piutang WA Tagihan**: Open Laporan > Piutang. Verify red label `⚠ Sama dengan WA karyawan: [nama]` appears for conflicting numbers, and clicking "Kirim WA Tagihan" displays alert without opening WhatsApp.
3. **Item "service mainboard" Category**: Create/check an item named "service mainboard" with category `SPAREPART`. Verify it shows as SPAREPART (not JASA) in POSView, Master Products, and Employee Portal.
4. **Team Page Navigation**: Go to Tim tab in Admin Dashboard and switch between `Daftar Karyawan`, `Permintaan Kasbon`, and `Laporan Absensi`. Verify the left sidebar remains visible at all times on desktop.
5. **Route `/track/:resi`**: Visit `/track/TRX-1001` in browser and verify automatic redirect to `/tracking?resi=TRX-1001`.
6. **Session Cleanup on Logout**: Click logout in Admin Dashboard or Employee Portal and verify all tokens and session state are wiped clean and user is redirected to `/login`.
