import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { apiService } from '../services/api';
import { Search, Plus, MessageCircle, CheckCircle, Image as ImageIcon, ArrowLeft, Star, Gift, X, Send, Calendar } from 'lucide-react';

// Helper for Avatar
const getInitials = (name) => {
  if (!name) return 'U';
  return name.substring(0, 2).toUpperCase();
};

const Avatar = ({ name, size = 40 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, #3b82f6 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold',
    fontSize: size * 0.4 + 'px', flexShrink: 0
  }}>
    {getInitials(name)}
  </div>
);

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
  }, [activeCategory, activeThread]);

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
      const net = res.net || (amount * 0.93);
      const fee = res.feePlatform || (amount * 0.01);
      alert(`Berhasil memberikan Tip! Teknisi menerima Rp ${Math.round(net).toLocaleString('id-ID')} dan Komisi Sistem Rp ${Math.round(fee).toLocaleString('id-ID')}`);
      setShowSawerModal(false);
      setSawerTarget(null);
      setSawerAmount('');
    } catch (e) {
      alert('Gagal memberikan tip');
    }
  };

  const renderBadge = (reputation) => {
    if (reputation >= 100) return <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Star size={10}/> Master</span>;
    if (reputation >= 50) return <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Star size={10}/> Senior</span>;
    if (reputation > 0) return <span style={{ background: '#ffedd5', color: '#c2410c', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Star size={10}/> Aktif</span>;
    return null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // --- THREAD DETAIL VIEW ---
  if (activeThread) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f1f5f9', margin: '-1.5rem', padding: '1.5rem', position: 'relative' }}>
        
        {/* Sticky Header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'white', padding: '10px 15px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '1.5rem' }}>
          <button className="btn btn-ghost" style={{ padding: '8px', borderRadius: '50%' }} onClick={() => setActiveThread(null)}>
            <ArrowLeft size={20} color="var(--primary)" />
          </button>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeThread.title}</h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{activeThread.category}</div>
          </div>
        </div>

        {/* OP Content */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Avatar name={activeThread.author_name} size={48} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{activeThread.author_name}</strong>
                  {renderBadge(activeThread.reputation_points)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <Calendar size={12} /> {formatDate(activeThread.created_at)}
                </div>
              </div>
            </div>
            {activeThread.is_solved && <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={14}/> Solved</span>}
          </div>
          
          <h2 style={{ fontSize: '1.3rem', color: '#0f172a', marginBottom: '1rem', lineHeight: '1.4' }}>{activeThread.title}</h2>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7', color: '#334155', fontSize: '0.95rem' }}>{activeThread.content}</p>
          
          {activeThread.image_url && (
            <div style={{ marginTop: '1rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <img src={activeThread.image_url} alt="Lampiran" style={{ width: '100%', display: 'block', maxHeight: '500px', objectFit: 'contain', background: '#f8fafc' }} />
            </div>
          )}
        </div>

        {/* Replies Section */}
        <div style={{ marginBottom: '80px' }}>
          <h4 style={{ color: '#475569', marginBottom: '1rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageCircle size={16} /> {threadPosts.length} Balasan
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {threadPosts.map(post => (
              <div key={post.id} style={{ background: post.is_solution ? '#f0fdf4' : 'white', borderRadius: '12px', padding: '1.2rem', border: post.is_solution ? '2px solid #22c55e' : '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <Avatar name={post.author_name} size={36} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>{post.author_name}</strong>
                        {renderBadge(post.reputation_points)}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{formatDate(post.created_at)}</div>
                    </div>
                  </div>
                  {post.is_solution && <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 'bold', background: '#dcfce7', padding: '4px 8px', borderRadius: '6px' }}><CheckCircle size={14}/> Solusi</span>}
                </div>
                
                <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 1rem 0', color: '#334155', fontSize: '0.95rem', lineHeight: '1.6' }}>{post.content}</p>
                {post.image_url && (
                  <img src={post.image_url} alt="Lampiran" style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0' }} />
                )}
                
                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                  {!activeThread.is_solved && activeThread.tenant_code === tenant.code && (
                    <>
                      {post.tenant_code !== tenant.code && (
                        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '100px' }} onClick={() => { setSawerTarget(post); setShowSawerModal(true); }}>
                          <Gift size={14} style={{ marginRight: '4px' }} /> Tip
                        </button>
                      )}
                      <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '100px', color: '#16a34a', background: '#f0fdf4' }} onClick={() => handleSolve(post.id, post.tenant_code)}>
                        <CheckCircle size={14} style={{ marginRight: '4px' }} /> Pilih Solusi
                      </button>
                    </>
                  )}
                  {activeThread.is_solved && post.tenant_code !== tenant.code && post.is_solution && (
                    <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#059669', background: '#dcfce7', borderRadius: '100px' }} onClick={() => { setSawerTarget(post); setShowSawerModal(true); }}>
                      <Gift size={14} style={{ marginRight: '4px' }} /> Beri Tip (Sawer)
                    </button>
                  )}
                </div>
              </div>
            ))}
            {threadPosts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <MessageCircle size={40} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                <p style={{ color: '#64748b', margin: 0 }}>Belum ada balasan.<br/>Jadilah yang pertama membantu!</p>
              </div>
            )}
          </div>
        </div>

        {/* Docked Reply Input */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', padding: '12px 15px', boxShadow: '0 -4px 20px rgba(0,0,0,0.08)', zIndex: 20, display: 'flex', gap: '10px', alignItems: 'flex-end', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: '#f8fafc', borderRadius: '20px', padding: '8px 15px', border: '1px solid #cbd5e1' }}>
            {replyImage && (
              <div style={{ fontSize: '0.75rem', color: '#0284c7', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ImageIcon size={12}/> Gambar dilampirkan
              </div>
            )}
            <textarea 
              rows="1" 
              placeholder="Tulis balasan..." 
              value={replyContent} 
              onChange={e => {
                setReplyContent(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
              }} 
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', resize: 'none', fontSize: '0.95rem', maxHeight: '100px', fontFamily: 'inherit' }}
            />
          </div>
          
          <label style={{ cursor: 'pointer', padding: '10px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImageIcon size={20} color="#64748b" />
            <input type="file" accept="image/*" onChange={e => setReplyImage(e.target.files[0])} style={{ display: 'none' }} />
          </label>
          
          <button 
            className="btn btn-primary" 
            style={{ borderRadius: '50%', width: '44px', height: '44px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: (!replyContent && !replyImage) ? 0.5 : 1 }} 
            onClick={handleReply} 
            disabled={uploading || (!replyContent && !replyImage)}
          >
            <Send size={18} style={{ marginLeft: '2px' }} />
          </button>
        </div>

        {/* SAWER MODAL (Detail View) */}
        {showSawerModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="glass-panel animate-fade-in" style={{ width: '90%', maxWidth: '400px', background: 'white', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Gift size={20} color="#16a34a"/> Beri Tip (Saweran)</h3>
                <button className="btn btn-ghost" onClick={() => setShowSawerModal(false)} style={{ padding: '5px' }}><X size={18}/></button>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Beri apresiasi kepada <strong>{sawerTarget?.author_name}</strong> atas solusinya. (Simulasi)
              </p>
              
              <label className="label">Nominal Sawer (Rp)</label>
              <input type="number" className="input-field" placeholder="10000" value={sawerAmount} onChange={e => setSawerAmount(e.target.value)} style={{ marginBottom: '1rem' }} />
              
              <button className="btn btn-primary" style={{ width: '100%', background: '#16a34a', borderColor: '#16a34a' }} onClick={submitSawer}>
                Kirim Saweran
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- MAIN LIST VIEW ---
  return (
    <div style={{ position: 'relative', minHeight: '80vh', paddingBottom: '80px' }}>
      
      {/* Search & Header Section */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '1.4rem', fontWeight: '800' }}>Forum Teknisi</h2>
        
        <div style={{ display: 'flex', background: 'white', borderRadius: '100px', padding: '4px 12px', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
          <Search size={18} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Cari solusi masalah..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && fetchThreads()} 
            style={{ border: 'none', background: 'transparent', flex: 1, padding: '10px 10px', outline: 'none', fontSize: '0.95rem' }} 
          />
        </div>

        {/* Categories Chips */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {categories.map(cat => (
            <button 
              key={cat.id} 
              className={`btn ${activeCategory === cat.id ? 'btn-primary' : 'btn-ghost'}`} 
              style={{ flex: '0 0 auto', padding: '6px 16px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 'bold', background: activeCategory === cat.id ? 'var(--primary)' : 'white', color: activeCategory === cat.id ? 'white' : '#64748b', border: activeCategory === cat.id ? 'none' : '1px solid #cbd5e1' }} 
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Threads List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {loading ? (
           <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Memuat diskusi...</div>
        ) : threads.length === 0 ? (
           <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
             <MessageCircle size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem' }} />
             <h3 style={{ margin: '0 0 5px 0', color: '#475569' }}>Tidak ada diskusi</h3>
             <p style={{ margin: 0, color: '#94a3b8' }}>Belum ada diskusi untuk kategori/pencarian ini.</p>
           </div>
        ) : (
          threads.map(thread => (
            <div 
              key={thread.id} 
              style={{ background: 'white', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'transform 0.1s', position: 'relative' }} 
              onClick={() => handleOpenThread(thread.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Avatar name={thread.author_name} size={28} />
                  <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {thread.author_name} {renderBadge(thread.reputation_points)}
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formatDate(thread.created_at)}</div>
              </div>
              
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#0f172a', lineHeight: '1.4', fontWeight: '800' }}>
                {thread.title}
              </h3>
              
              <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' }}>
                {thread.content}
              </p>
              
              {thread.image_url && (
                <div style={{ marginBottom: '12px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                   <img src={thread.image_url} alt="Thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>
                  <MessageCircle size={16} /> {thread.reply_count} Balasan
                </div>
                {thread.is_solved && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#16a34a', fontWeight: 'bold' }}>
                    <CheckCircle size={16} /> Solved
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#94a3b8', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', marginLeft: 'auto' }}>
                  {thread.category}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      <button 
        style={{ position: 'fixed', bottom: '80px', right: '20px', width: '56px', height: '56px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(2, 132, 199, 0.4)', border: 'none', cursor: 'pointer', zIndex: 50, transition: 'transform 0.2s' }}
        onClick={() => setShowNewThread(true)}
      >
        <Plus size={28} />
      </button>

      {/* Create Thread Modal */}
      {showNewThread && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '15px' }}>
          <div className="animate-slide-up" style={{ width: '100%', maxWidth: '500px', background: 'white', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            
            <div style={{ padding: '15px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Mulai Diskusi Baru</h3>
              <button className="btn btn-ghost" onClick={() => setShowNewThread(false)} style={{ padding: '6px', borderRadius: '50%' }}><X size={20}/></button>
            </div>
            
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <input type="text" className="input-field" placeholder="Judul Topik (Singkat & Jelas)" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ marginBottom: '1rem', fontWeight: 'bold', fontSize: '1.1rem' }} />
              
              <select className="input-field" value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ marginBottom: '1rem' }}>
                <option value="LAPTOP">Servis Laptop</option>
                <option value="HP">Servis Smartphone</option>
                <option value="MOTOR">Bengkel Motor</option>
              </select>
              
              <textarea className="input-field" rows="6" placeholder="Ceritakan detail masalah atau pengalaman Anda di sini..." value={newContent} onChange={e => setNewContent(e.target.value)} style={{ marginBottom: '1rem', resize: 'vertical' }}></textarea>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f1f5f9', padding: '12px', borderRadius: '12px' }}>
                <div style={{ background: '#e2e8f0', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImageIcon size={20} color="#64748b" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155' }}>Foto Lampiran (Opsional)</div>
                  <input type="file" accept="image/*" onChange={e => setNewImage(e.target.files[0])} style={{ fontSize: '0.8rem', marginTop: '4px', width: '100%' }} />
                </div>
              </div>
            </div>
            
            <div style={{ padding: '15px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: 'white' }}>
              <button className="btn btn-ghost" onClick={() => setShowNewThread(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleCreateThread} disabled={uploading} style={{ borderRadius: '100px', padding: '10px 24px' }}>
                {uploading ? 'Mengunggah...' : 'Posting Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
