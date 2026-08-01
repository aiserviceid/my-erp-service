import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { apiService } from '../services/api';
import { Search, Plus, MessageCircle, CheckCircle, Image as ImageIcon, ArrowLeft, Star, Gift, X } from 'lucide-react';

export default function ForumCommunity() {
  const tenant = useStore(state => state.tenant);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null); // null means list view
  const [threadPosts, setThreadPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form States
  const [showNewThread, setShowNewThread] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('LAPTOP');
  const [newImage, setNewImage] = useState(null);

  const [replyContent, setReplyContent] = useState('');
  const [replyImage, setReplyImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Sawer States
  const [showSawerModal, setShowSawerModal] = useState(false);
  const [sawerTarget, setSawerTarget] = useState(null);
  const [sawerAmount, setSawerAmount] = useState('');

  const categories = [
    { id: 'ALL', label: 'Semua Kategori' },
    { id: 'LAPTOP', label: 'Servis Laptop' },
    { id: 'HP', label: 'Servis Smartphone' },
    { id: 'MOTOR', label: 'Bengkel Motor' }
  ];

  const fetchThreads = async () => {
    setLoading(true);
    const data = await apiService.getForumThreads(activeCategory, searchQuery);
    setThreads(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!activeThread) {
      fetchThreads();
    }
  }, [activeCategory, activeThread]); // Only search on enter or button click for search query

  const handleCreateThread = async () => {
    if (!newTitle || !newContent) return alert('Judul dan isi wajib diisi');
    
    setUploading(true);
    let imageUrl = '';
    if (newImage) {
      try {
        const res = await apiService.uploadFile(newImage);
        imageUrl = res.url;
      } catch (e) {
        alert('Gagal mengupload gambar');
        setUploading(false);
        return;
      }
    }

    await apiService.createForumThread({
      tenant_code: tenant.code,
      author_name: tenant.name,
      title: newTitle,
      content: newContent,
      category: newCategory,
      image_url: imageUrl
    });
    setShowNewThread(false);
    setNewTitle('');
    setNewContent('');
    setNewImage(null);
    setUploading(false);
    fetchThreads();
  };

  const handleOpenThread = async (id) => {
    setLoading(true);
    try {
      const data = await apiService.getForumThreadDetail(id);
      setActiveThread(data.thread);
      setThreadPosts(data.posts);
    } catch (e) {
      alert('Gagal memuat diskusi');
    }
    setLoading(false);
  };

  const handleReply = async () => {
    if (!replyContent) return;
    
    setUploading(true);
    let imageUrl = '';
    if (replyImage) {
      try {
        const res = await apiService.uploadFile(replyImage);
        imageUrl = res.url;
      } catch (e) {
        alert('Gagal mengupload gambar');
        setUploading(false);
        return;
      }
    }

    await apiService.createForumPost(activeThread.id, {
      tenant_code: tenant.code,
      author_name: tenant.name,
      content: replyContent,
      image_url: imageUrl
    });
    setReplyContent('');
    setReplyImage(null);
    setUploading(false);
    // Refresh thread
    handleOpenThread(activeThread.id);
  };

  const handleSolve = async (postId, solverTenantCode) => {
    await apiService.markForumSolution(activeThread.id, postId, solverTenantCode);
    alert('Diskusi ditandai sebagai Selesai! Poin reputasi telah ditambahkan.');
    handleOpenThread(activeThread.id);
  };

  const submitSawer = async () => {
    const amount = parseInt(sawerAmount, 10);
    if (!amount || amount < 1000) return alert('Minimal sawer Rp 1.000');
    try {
      const res = await apiService.sawerTeknisi(sawerTarget.tenant_code, amount);
      alert(`Berhasil memberikan Tip! Teknisi menerima Rp ${res.solverShare.toLocaleString('id-ID')} dan Komisi Sistem Rp ${res.commission.toLocaleString('id-ID')}`);
      setShowSawerModal(false);
      setSawerTarget(null);
      setSawerAmount('');
    } catch (e) {
      alert('Gagal memberikan tip');
    }
  };

  const renderBadge = (reputation) => {
    if (reputation >= 100) return <span className="badge" style={{ background: '#fbbf24', color: '#78350f' }}><Star size={12}/> Master</span>;
    if (reputation >= 50) return <span className="badge" style={{ background: '#e2e8f0', color: '#475569' }}><Star size={12}/> Senior</span>;
    if (reputation > 0) return <span className="badge" style={{ background: '#fed7aa', color: '#9a3412' }}><Star size={12}/> Aktif</span>;
    return null;
  };

  // --- THREAD DETAIL VIEW ---
  if (activeThread) {
    return (
      <div className="glass-panel" style={{ minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
        <button className="btn btn-ghost" style={{ alignSelf: 'flex-start', marginBottom: '1rem' }} onClick={() => setActiveThread(null)}>
          <ArrowLeft size={18} /> Kembali ke Daftar
        </button>

        <div style={{ padding: '1.5rem', background: 'white', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, color: 'var(--primary)' }}>{activeThread.title}</h2>
            {activeThread.is_solved ? <span className="badge badge-success"><CheckCircle size={14}/> Solved</span> : <span className="badge badge-warning">Diskusi Terbuka</span>}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            <strong>{activeThread.author_name}</strong> {renderBadge(activeThread.reputation_points)}
            <span>• Kategori: {activeThread.category}</span>
          </div>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{activeThread.content}</p>
          {activeThread.image_url && (
            <img src={activeThread.image_url} alt="Lampiran" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', marginTop: '1rem' }} />
          )}
        </div>

        <h3 style={{ marginBottom: '1rem' }}>Balasan ({threadPosts.length})</h3>
        
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          {threadPosts.map(post => (
            <div key={post.id} style={{ padding: '1.5rem', background: post.is_solution ? '#f0fdf4' : 'rgba(255,255,255,0.6)', borderRadius: '8px', border: post.is_solution ? '2px solid #16a34a' : '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.9rem' }}>
                  <strong style={{ color: 'var(--primary)' }}>{post.author_name}</strong> {renderBadge(post.reputation_points)}
                </div>
                {post.is_solution && <span className="badge badge-success" style={{ padding: '5px 10px' }}><CheckCircle size={16}/> Jawaban Terbaik</span>}
              </div>
              <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 1rem 0' }}>{post.content}</p>
              {post.image_url && (
                <img src={post.image_url} alt="Lampiran" style={{ maxWidth: '300px', borderRadius: '8px', marginBottom: '1rem' }} />
              )}
              
              {!activeThread.is_solved && activeThread.tenant_code === tenant.code && (
                <div style={{ textAlign: 'right', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  {post.tenant_code !== tenant.code && (
                    <button className="btn btn-ghost" style={{ padding: '5px 15px', fontSize: '0.85rem' }} onClick={() => { setSawerTarget(post); setShowSawerModal(true); }}>
                      <Gift size={16} /> Beri Tip
                    </button>
                  )}
                  <button className="btn btn-primary" style={{ padding: '5px 15px', fontSize: '0.85rem' }} onClick={() => handleSolve(post.id, post.tenant_code)}>
                    <CheckCircle size={16} /> Jadikan Solusi
                  </button>
                </div>
              )}
              {activeThread.is_solved && post.tenant_code !== tenant.code && (
                <div style={{ textAlign: 'right' }}>
                  <button className="btn btn-ghost" style={{ padding: '5px 15px', fontSize: '0.85rem', color: '#16a34a', borderColor: '#16a34a' }} onClick={() => { setSawerTarget(post); setShowSawerModal(true); }}>
                    <Gift size={16} /> Beri Tip (Sawer) Teknisi Ini
                  </button>
                </div>
              )}
            </div>
          ))}
          {threadPosts.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Belum ada balasan. Jadilah yang pertama membantu!</p>}
        </div>

        {/* REPLY BOX */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
          <h4 style={{ marginBottom: '1rem' }}>Tulis Balasan</h4>
          <textarea className="input-field" rows="4" placeholder="Ketik solusi atau pertanyaan tambahan..." value={replyContent} onChange={e => setReplyContent(e.target.value)} style={{ marginBottom: '1rem', resize: 'vertical' }}></textarea>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '0 10px', borderRadius: '8px' }}>
              <ImageIcon size={18} color="var(--text-muted)" style={{ marginRight: '10px' }} />
              <input type="file" accept="image/*" onChange={e => setReplyImage(e.target.files[0])} style={{ border: 'none', background: 'transparent', flex: 1, outline: 'none' }} />
            </div>
            <button className="btn btn-primary" onClick={handleReply} disabled={uploading}>
              <MessageCircle size={18}/> {uploading ? 'Mengirim...' : 'Kirim'}
            </button>
          </div>
        </div>

        {/* SAWER MODAL */}
        {showSawerModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="glass-panel animate-fade-in" style={{ width: '400px', background: 'white', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Gift size={20} color="#16a34a"/> Beri Tip (Saweran)</h3>
                <button className="btn btn-ghost" onClick={() => setShowSawerModal(false)} style={{ padding: '5px' }}><X size={18}/></button>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Beri apresiasi kepada <strong>{sawerTarget?.author_name}</strong> atas solusinya. (Simulasi Pembayaran)
              </p>
              
              <label className="label">Nominal Sawer (Rp)</label>
              <input type="number" className="input-field" placeholder="10000" value={sawerAmount} onChange={e => setSawerAmount(e.target.value)} style={{ marginBottom: '1rem' }} />
              
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <strong>Simulasi Rincian (Otomatis):</strong><br/>
                - Dana masuk ke Dompet Teknisi: Potongan mengikuti tier Teknisi.<br/>
                - Dana masuk ke Dompet Pengembang: Komisi sistem (1% - 6%).
              </div>

              <button className="btn btn-primary" style={{ width: '100%', background: '#16a34a', borderColor: '#16a34a' }} onClick={submitSawer}>
                Kirim Saweran Sekarang
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- MAIN LIST VIEW ---
  return (
    <div className="glass-panel" style={{ minHeight: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: '0 0 5px 0' }}>Forum Komunitas Teknisi</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Diskusi, saling bantu, tingkatkan reputasi tokomu.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Reputasi Saya</div>
            <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{tenant.name} {renderBadge(tenant.reputation_points || 0)}</div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNewThread(!showNewThread)}>
            <Plus size={18} /> Buat Topik
          </button>
        </div>
      </div>

      {showNewThread && (
        <div className="animate-fade-in" style={{ padding: '1.5rem', background: 'white', border: '1px solid var(--border-light)', borderRadius: '8px', marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Mulai Diskusi Baru</h3>
          <input type="text" className="input-field" placeholder="Judul Topik (Cth: Solusi Asus X441 Blank Putih)" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ marginBottom: '1rem' }} />
          <select className="input-field" value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ marginBottom: '1rem' }}>
            <option value="LAPTOP">Servis Laptop</option>
            <option value="HP">Servis Smartphone</option>
            <option value="MOTOR">Bengkel Motor</option>
          </select>
          <textarea className="input-field" rows="5" placeholder="Jelaskan detail kendala atau solusi yang ingin dibagikan..." value={newContent} onChange={e => setNewContent(e.target.value)} style={{ marginBottom: '1rem', resize: 'vertical' }}></textarea>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '1.5rem' }}>
            <label className="label" style={{ margin: 0 }}>Unggah Foto / Lampiran (Opsional)</label>
            <ImageIcon size={20} color="var(--text-muted)" />
            <input type="file" accept="image/*" onChange={e => setNewImage(e.target.files[0])} style={{ flex: 1, margin: 0 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn btn-ghost" onClick={() => setShowNewThread(false)}>Batal</button>
            <button className="btn btn-primary" onClick={handleCreateThread} disabled={uploading}>
              {uploading ? 'Mengirim...' : 'Kirim Topik'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '15px', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '5px', flex: 1 }}>
          {categories.map(cat => (
            <button key={cat.id} className={`btn ${activeCategory === cat.id ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => setActiveCategory(cat.id)}>
              {cat.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flex: 1, background: 'white', borderRadius: '8px', border: '1px solid var(--border-light)', padding: '0 10px', alignItems: 'center' }}>
          <Search size={18} color="var(--text-muted)" />
          <input type="text" placeholder="Cari masalah atau solusi..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchThreads()} style={{ border: 'none', background: 'transparent', flex: 1, padding: '10px', outline: 'none' }} />
          <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '0.85rem' }} onClick={fetchThreads}>Cari</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loading ? <p style={{ textAlign: 'center', padding: '2rem' }}>Memuat diskusi...</p> : 
         threads.length === 0 ? <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Belum ada diskusi di kategori ini.</p> :
         threads.map(thread => (
          <div key={thread.id} className="glass-panel" style={{ display: 'flex', padding: '1rem', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.5)' }} onClick={() => handleOpenThread(thread.id)}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '5px' }}>
                {thread.is_solved ? <CheckCircle size={16} color="#16a34a" /> : <MessageCircle size={16} color="var(--primary)" />}
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: thread.is_solved ? '#16a34a' : 'var(--primary)' }}>{thread.title}</h4>
              </div>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {thread.content}
              </p>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '15px' }}>
                <span>Oleh: {thread.author_name} {renderBadge(thread.reputation_points)}</span>
                <span>• {thread.reply_count} Balasan</span>
                <span>• Kategori: {thread.category}</span>
              </div>
            </div>
            {thread.image_url && (
              <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', marginLeft: '15px', flexShrink: 0 }}>
                <img src={thread.image_url} alt="Thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
