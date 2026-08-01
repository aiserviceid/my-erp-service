import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { apiService } from '../services/api';
import { Wallet, Landmark, ArrowRight, History } from 'lucide-react';

export default function WalletDashboard() {
  const tenant = useStore(state => state.tenant);
  const [balance, setBalance] = useState(0);
  const [bankDetails, setBankDetails] = useState({ bank_name: 'BCA', account_number: '', account_name: '' });
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const banks = ['BCA', 'BRI', 'Mandiri', 'BNI', 'SeaBank', 'DANA', 'OVO', 'GoPay'];

  const loadWallet = async () => {
    setLoading(true);
    const data = await apiService.getWalletBalance(tenant.code);
    setBalance(data.balance);
    if (data.bank_details) {
      setBankDetails(typeof data.bank_details === 'string' ? JSON.parse(data.bank_details) : data.bank_details);
    }
    setWithdrawals(data.withdrawals || []);
    setLoading(false);
  };

  useEffect(() => {
    if (tenant.code) loadWallet();
  }, [tenant.code]);

  const handleSaveBank = async () => {
    if (!bankDetails.account_number || !bankDetails.account_name) return alert('Lengkapi data rekening!');
    await apiService.updateBankDetails(tenant.code, bankDetails);
    alert('Data rekening berhasil disimpan!');
  };

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount, 10);
    if (!amount || amount < 10000) return alert('Minimal penarikan Rp 10.000');
    if (amount > balance) return alert('Saldo tidak mencukupi');
    if (!bankDetails.account_number) return alert('Simpan data rekening terlebih dahulu!');

    try {
      await apiService.requestWithdraw({
        tenant_code: tenant.code,
        amount: amount,
        bank_name: bankDetails.bank_name,
        account_number: bankDetails.account_number,
        account_name: bankDetails.account_name
      });
      alert('Permintaan penarikan berhasil! Dana akan diproses 1x24 jam.');
      setWithdrawAmount('');
      loadWallet();
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading && balance === 0) return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>Memuat data dompet...</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      {/* Kiri: Saldo & Withdraw */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="glass-panel" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', color: 'white', padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', opacity: 0.9 }}>
            <Wallet size={24} /> <span>Saldo Penghasilan Forum</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', margin: '0 0 1rem 0' }}>Rp {balance.toLocaleString('id-ID')}</h1>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, margin: 0 }}>Dapatkan lebih banyak saldo dengan menjadi solusi di Forum Teknisi!</p>
        </div>

        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}><Landmark size={18}/> Data Rekening / E-Wallet</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
            <select className="input-field" style={{ flex: 1 }} value={bankDetails.bank_name} onChange={e => setBankDetails({...bankDetails, bank_name: e.target.value})}>
              {banks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <input type="text" className="input-field" placeholder="Nomor Rekening / No HP" value={bankDetails.account_number} onChange={e => setBankDetails({...bankDetails, account_number: e.target.value})} style={{ marginBottom: '1rem' }} />
          <input type="text" className="input-field" placeholder="Nama Pemilik (Sesuai Buku Tabungan)" value={bankDetails.account_name} onChange={e => setBankDetails({...bankDetails, account_name: e.target.value})} style={{ marginBottom: '1.5rem' }} />
          <button className="btn btn-ghost" onClick={handleSaveBank} style={{ width: '100%' }}>Simpan Rekening</button>
        </div>

        <div className="glass-panel" style={{ border: '1px solid var(--accent)' }}>
          <h3 style={{ marginBottom: '1rem' }}>Tarik Dana (Withdraw)</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="number" className="input-field" placeholder="Nominal (Min. Rp 10.000)" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} style={{ margin: 0, flex: 2 }} />
            <button className="btn btn-accent" style={{ flex: 1 }} onClick={handleWithdraw}>Tarik <ArrowRight size={16}/></button>
          </div>
        </div>
      </div>

      {/* Kanan: Riwayat Penarikan */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}><History size={18}/> Riwayat Penarikan</h3>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: '300px' }}>
          {withdrawals.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>Belum ada riwayat penarikan.</p>
          ) : (
            withdrawals.map(w => (
              <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Rp {w.amount.toLocaleString('id-ID')}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{w.bank_name} - {w.account_number}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '5px' }}>{new Date(w.created_at).toLocaleString('id-ID')}</div>
                </div>
                <span className={`badge ${w.status === 'PENDING' ? 'badge-warning' : w.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>
                  {w.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
