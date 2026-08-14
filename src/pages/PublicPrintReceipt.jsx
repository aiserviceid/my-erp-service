import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiService } from '../services/api';

const rupiah = (value = 0) => Number(value || 0).toLocaleString('id-ID');
const cleanStatus = (value = '') => String(value || '').toUpperCase().replace(/[\s_]+/g, '');
const cleanCode = (value = '') => String(value || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 60);

const getDiscount = (issue = '') => {
  const match = String(issue || '').match(/\[Diskon:\s*Rp\s*([^\]]+)\]/i);
  return match ? Number(String(match[1] || '').replace(/\D/g, '')) || 0 : 0;
};

const parseMeta = (issue = '') => {
  const text = String(issue || '');
  const part = text.match(/\[Sparepart diganti:\s*([^\]]+)\]/i)?.[1]?.trim() || '';
  const service = text.match(/\[Jasa Servis:\s*([^\]]+)\]/i)?.[1]?.trim() || '';
  const result = text.match(/\[Hasil Perbaikan:\s*([^\]]+)\]/i)?.[1]?.trim() || '';
  const warranty = text.match(/\[Garansi Servis:\s*([^\]|]+?)(?:\s*\|\s*berlaku sampai\s*([^\]]+))?\]/i);
  return {
    part,
    service,
    result,
    warrantyLabel: warranty ? String(warranty[1] || '').trim() : '',
    warrantyEnd: warranty ? String(warranty[2] || '').trim() : '',
  };
};

const cleanIssue = (issue = '') => String(issue || '')
  .replace(/\n?\[Diskon:[^\]]*\]/gi, '')
  .replace(/\n?\[Sparepart diganti:[^\]]*\]/gi, '')
  .replace(/\n?\[Jasa Servis:[^\]]*\]/gi, '')
  .replace(/\n?\[Hasil Perbaikan:[^\]]*\]/gi, '')
  .replace(/\n?\[Garansi Servis:[^\]]*\]/gi, '')
  .replace(/\n?\[Batas Pengambilan:[^\]]*\]/gi, '')
  .replace(/\n?\[Peringatan Pengambilan:[^\]]*\]/gi, '')
  .trim();

export default function PublicPrintReceipt() {
  const [params] = useSearchParams();
  const resi = String(params.get('resi') || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 50);
  const tenantCode = cleanCode(params.get('tenant_code') || params.get('tenant') || '');
  const format = params.get('format') === 'thermal' ? 'thermal' : 'a4';
  const requestedType = String(params.get('type') || '').toLowerCase();
  const autoPrint = params.get('autoprint') === '1';
  const [service, setService] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!resi) {
      setError('Nomor nota tidak ditemukan.');
      return () => { active = false; };
    }

    const loadReceipt = async () => {
      setError('');
      try {
        const query = new URLSearchParams({ resi });
        if (tenantCode) query.set('tenant_code', tenantCode);
        const response = await fetch(`/api/public-service?${query.toString()}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.service) throw new Error(payload?.error || 'Nota tidak ditemukan.');
        if (!active) return;
        setService(payload.service);
        setTenant(payload.tenant || null);
        return;
      } catch (serverError) {
        try {
          const data = await apiService.trackService(resi);
          if (!active) return;
          setService(data);
          if (data?.tenant_code) {
            const info = await apiService.getTenantPublic(data.tenant_code).catch(() => null);
            if (active) setTenant(info || null);
          }
          return;
        } catch {
          if (active) setError(serverError?.message || 'Nota tidak ditemukan atau tidak dapat dimuat.');
        }
      }
    };

    loadReceipt();
    return () => { active = false; };
  }, [resi, tenantCode]);

  const settings = useMemo(() => {
    if (!tenant?.settings) return {};
    if (typeof tenant.settings === 'string') {
      try { return JSON.parse(tenant.settings); } catch { return {}; }
    }
    return tenant.settings || {};
  }, [tenant]);

  const status = cleanStatus(service?.status);
  const isPaid = requestedType === 'pickup' || status === 'DIAMBIL';
  const isInvoice = !isPaid && (requestedType === 'completion' || status === 'SELESAI');
  const discount = getDiscount(service?.issue || '');
  const partFee = Number(service?.part_fee || 0);
  const jasaFee = Number(service?.jasa_fee || 0);
  const subtotal = partFee + jasaFee;
  const total = Math.max(0, subtotal - discount);
  const meta = parseMeta(service?.issue || '');
  const storeName = settings.storeName || settings.store_name || tenant?.name || 'UnitPro';
  const storeAddress = settings.store_address || settings.address || '';
  const storePhone = settings.store_wa || tenant?.phone || '';
  const warrantyUrl = typeof window !== 'undefined' && service?.resi
    ? `${window.location.origin}/garansi?resi=${encodeURIComponent(service.resi)}`
    : '';

  const receiptTitle = isPaid ? 'NOTA PELUNASAN SERVIS' : isInvoice ? 'NOTA TAGIHAN SERVIS' : 'NOTA PENDAFTARAN SERVIS';
  const totalLabel = isPaid ? 'TOTAL LUNAS' : isInvoice ? 'TOTAL TAGIHAN' : 'TOTAL';

  useEffect(() => {
    if (!autoPrint || !service) return undefined;
    const timer = window.setTimeout(() => {
      try { window.print(); } catch {}
    }, 900);
    return () => window.clearTimeout(timer);
  }, [autoPrint, service]);

  if (error) {
    return (
      <div style={{ minHeight: '100vh', padding: 24, display: 'grid', placeItems: 'center', fontFamily: 'Arial, sans-serif', background: '#f8fafc' }}>
        <div style={{ maxWidth: 460, background: '#fff', padding: 22, borderRadius: 14, border: '1px solid #fecaca', color: '#991b1b', textAlign: 'center' }}>
          <strong style={{ display: 'block', fontSize: 18, marginBottom: 8 }}>Nota tidak dapat dimuat</strong>
          <span>{error}</span>
          <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>Resi: {resi || '-'}</div>
          <button type="button" onClick={() => window.location.reload()} style={{ marginTop: 14, border: 0, borderRadius: 9, padding: '10px 14px', background: '#0f172a', color: '#fff', fontWeight: 800 }}>Coba Lagi</button>
        </div>
      </div>
    );
  }
  if (!service) return <div style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>Memuat nota...</div>;

  return (
    <div className={`print-page print-page--${format}`}>
      <style>{`
        *{box-sizing:border-box} body{margin:0;background:#eef2f7;color:#111827;font-family:Arial,Helvetica,sans-serif}
        .print-toolbar{position:sticky;top:0;z-index:5;display:flex;gap:8px;justify-content:center;padding:10px;background:#0f172a}
        .print-toolbar button{border:0;border-radius:8px;padding:10px 16px;background:#fff;color:#0f172a;font-weight:800;cursor:pointer}
        .receipt{background:#fff;margin:18px auto;padding:${format === 'thermal' ? '8mm 4mm' : '16mm'};width:${format === 'thermal' ? '80mm' : '210mm'};max-width:100%;min-height:${format === 'thermal' ? 'auto' : '297mm'};box-shadow:0 8px 28px rgba(15,23,42,.12)}
        .center{text-align:center}.store{font-size:${format === 'thermal' ? '18px' : '28px'};font-weight:900;margin:0}.muted{color:#64748b}.title{font-weight:900;letter-spacing:.08em;margin:5px 0 0;font-size:${format === 'thermal' ? '11px' : '14px'}}
        .dash{border-top:1.5px dashed #64748b;margin:12px 0}.row{display:flex;justify-content:space-between;gap:10px;padding:3px 0;font-size:${format === 'thermal' ? '11px' : '13px'}}.row span:last-child{text-align:right;font-weight:700}.section-title{font-size:${format === 'thermal' ? '11px' : '13px'};font-weight:900;margin:10px 0 5px}.note{font-size:${format === 'thermal' ? '10px' : '12px'};line-height:1.5;white-space:pre-wrap}.amount{font-size:${format === 'thermal' ? '14px' : '18px'};font-weight:900}.paid,.invoice{padding:8px;border:1px solid #111827;text-align:center;font-weight:900;margin:10px 0}.warranty{margin-top:16px;padding-top:12px;border-top:1.5px dashed #64748b;text-align:center;font-size:${format === 'thermal' ? '10px' : '12px'};line-height:1.45}.warranty a{display:block;margin-top:6px;color:#111827;font-weight:800;word-break:break-all}.thanks{text-align:center;font-size:${format === 'thermal' ? '10px' : '12px'};margin-top:12px}
        @media print{body{background:#fff}.print-toolbar{display:none}.receipt{margin:0;box-shadow:none;max-width:none}${format === 'thermal' ? '@page{size:80mm auto;margin:0}' : '@page{size:A4;margin:0}'}}
      `}</style>

      <div className="print-toolbar">
        <button type="button" onClick={() => window.print()}>🖨 Cetak Sekarang</button>
        <button type="button" onClick={() => window.close()}>Tutup</button>
      </div>

      <main className="receipt">
        <header className="center">
          <h1 className="store">{storeName}</h1>
          {storeAddress && <div className="muted" style={{ fontSize: format === 'thermal' ? 9 : 11, marginTop: 3 }}>{storeAddress}</div>}
          {storePhone && <div className="muted" style={{ fontSize: format === 'thermal' ? 9 : 11 }}>{storePhone}</div>}
          <div className="title">{receiptTitle}</div>
        </header>

        <div className="dash" />
        <div className="row"><span>No. Nota</span><span>{service.resi}</span></div>
        <div className="row"><span>Tanggal</span><span>{new Date(service.updated_at || service.created_at || Date.now()).toLocaleString('id-ID')}</span></div>
        <div className="row"><span>Pelanggan</span><span>{service.customer_name || '-'}</span></div>
        <div className="row"><span>Perangkat</span><span>{service.device_name || '-'}</span></div>

        {(meta.part || meta.service || meta.result || cleanIssue(service.issue)) && <>
          <div className="dash" />
          <div className="section-title">RINCIAN PERBAIKAN</div>
          {meta.part && <div className="row"><span>Sparepart</span><span>{meta.part}</span></div>}
          {meta.service && <div className="row"><span>Jasa</span><span>{meta.service}</span></div>}
          {meta.result && <div className="row"><span>Hasil</span><span>{meta.result}</span></div>}
          {cleanIssue(service.issue) && <div className="note">{cleanIssue(service.issue)}</div>}
        </>}

        {(isInvoice || isPaid) && <>
          <div className="dash" />
          <div className="section-title">RINCIAN BIAYA</div>
          <div className="row"><span>Biaya Sparepart</span><span>Rp {rupiah(partFee)}</span></div>
          <div className="row"><span>Biaya Jasa</span><span>Rp {rupiah(jasaFee)}</span></div>
          {discount > 0 && <>
            <div className="row"><span>Subtotal</span><span>Rp {rupiah(subtotal)}</span></div>
            <div className="row"><span>Diskon</span><span>- Rp {rupiah(discount)}</span></div>
          </>}
          <div className="dash" />
          <div className="row amount"><span>{totalLabel}</span><span>Rp {rupiah(total)}</span></div>
        </>}

        {isInvoice && <div className="invoice">SERVIS SELESAI • BELUM LUNAS</div>}
        {isPaid && <div className="paid">LUNAS • BARANG SUDAH DIAMBIL</div>}

        {isPaid && <div className="warranty">
          <strong>GARANSI SERVIS</strong>
          <div>{meta.warrantyLabel || 'Sesuai ketentuan toko'}{meta.warrantyEnd ? ` • berlaku sampai ${meta.warrantyEnd}` : ''}</div>
          <div style={{ marginTop: 8 }}>Cek garansi digital:</div>
          <a href={warrantyUrl}>{warrantyUrl}</a>
        </div>}

        <div className="thanks">Terima kasih atas kepercayaan Anda.</div>
      </main>
    </div>
  );
}
