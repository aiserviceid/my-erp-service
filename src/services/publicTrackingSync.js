import { apiService } from './api';
import { allocateServiceDiscount } from '../utils/financeUtils';
import { parseServiceDiscount } from '../utils/serviceWarranty';

if (!apiService.__publicTrackingAmountSync) {
  apiService.__publicTrackingAmountSync = true;
  const originalTrackService = apiService.trackService.bind(apiService);

  apiService.trackService = async (resi) => {
    const service = await originalTrackService(resi);
    if (!service) return service;

    const grossPartFee = Number(service.part_fee || 0);
    const grossJasaFee = Number(service.jasa_fee || 0);
    const requestedDiscount = parseServiceDiscount(service.issue || '');
    const allocation = allocateServiceDiscount(grossPartFee, grossJasaFee, requestedDiscount);

    return {
      ...service,
      public_gross_part_fee: grossPartFee,
      public_gross_jasa_fee: grossJasaFee,
      public_discount: allocation.discount,
      public_total_fee: Math.max(0, allocation.subtotal - allocation.discount),
      // PublicTracking lama menjumlahkan kedua field ini langsung. Dengan
      // nilai setelah alokasi diskon, angka di halaman tracking tetap sama
      // dengan Nota Tagihan / Nota Pelunasan tanpa mengubah data database.
      part_fee: allocation.partAfterDiscount,
      jasa_fee: allocation.jasaAfterDiscount,
    };
  };
}
