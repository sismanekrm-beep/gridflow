import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Search, Edit2, Trash2, Mail, Phone, MapPin, Building, X, ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const LIMIT = 20;
const PRIMARY = '#0B4F8A';
const BORDER = '#E2E8F0';
const MUTED = '#64748B';

const emptyForm = {
  name: '', company: '', address_line1: '', address_line2: '',
  district: '', city: '', postal_code: '', phone: '', email: '', notes: ''
};

const S = {
  input: { width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: '13px', border: `1px solid ${BORDER}`, borderRadius: '8px', outline: 'none', color: '#0F172A', backgroundColor: '#FFFFFF', fontFamily: "'Inter', sans-serif" },
  label: { display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' },
};

export default function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editAddress, setEditAddress] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  // Persistent selection
  const [selectedItems, setSelectedItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('addr_selected') || '[]'); } catch { return []; }
  });
  const navigate = useNavigate();

  useEffect(() => {
    try { localStorage.setItem('addr_selected', JSON.stringify(selectedItems)); } catch {}
  }, [selectedItems]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/addresses?query=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=${LIMIT}`);
      setAddresses(res.data.addresses); setTotal(res.data.total); setPages(res.data.pages);
    } catch { toast.error('Adresler yüklenemedi'); }
    finally { setLoading(false); }
  }, [debouncedSearch, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const openAdd = () => { setEditAddress(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (a) => { setEditAddress(a); setForm({ name: a.name||'', company: a.company||'', address_line1: a.address_line1||'', address_line2: a.address_line2||'', district: a.district||'', city: a.city||'', postal_code: a.postal_code||'', phone: a.phone||'', email: a.email||'', notes: a.notes||'' }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Ad / Firma zorunludur'); return; }
    setSaving(true);
    try {
      if (editAddress) { await axios.put(`${BACKEND_URL}/api/addresses/${editAddress.id}`, form); toast.success('Adres güncellendi'); }
      else { await axios.post(`${BACKEND_URL}/api/addresses`, form); toast.success('Adres eklendi'); }
      setModalOpen(false); load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Hata oluştu'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await axios.delete(`${BACKEND_URL}/api/addresses/${deleteTarget.id}`); toast.success('Adres silindi'); setDeleteTarget(null); load(); }
    catch { toast.error('Silinemedi'); }
  };

  const selectedIds = new Set(selectedItems.map(i => i.id));
  const toggleSelect = (a) => setSelectedItems(prev => prev.some(i => i.id === a.id) ? prev.filter(i => i.id !== a.id) : [...prev, { id: a.id, name: a.name }]);
  const allSel = addresses.length > 0 && addresses.every(a => selectedIds.has(a.id));
  const toggleAll = () => {
    if (allSel) setSelectedItems(prev => prev.filter(i => !addresses.some(a => a.id === i.id)));
    else setSelectedItems(prev => { const next = [...prev]; addresses.forEach(a => { if (!prev.some(i => i.id === a.id)) next.push({ id: a.id, name: a.name }); }); return next; });
  };

  const handleBulkLabel = async () => {
    try {
      const results = await Promise.all(selectedItems.map(si => axios.get(`${BACKEND_URL}/api/addresses/${si.id}`).then(r => r.data).catch(() => null)));
      navigate('/address-labels', { state: { labelItems: results.filter(Boolean).map(a => ({ address: a, qty: 1 })) } });
    } catch { toast.error('Yüklenemedi'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Bulk bar */}
      {selectedItems.length > 0 && (
        <div style={{ backgroundColor: '#0B4F8A', color: '#fff', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
          <MapPin size={16} />
          <span style={{ fontWeight: 600, fontSize: '13px' }}>{selectedItems.length} adres seçildi</span>
          <button onClick={handleBulkLabel} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, backgroundColor: '#fff', color: PRIMARY, border: 'none', borderRadius: '7px', cursor: 'pointer' }}>
            <Tag size={14} /> Adres Etiketi Hazırla
          </button>
          <button onClick={() => setSelectedItems([])} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '12px', backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '7px', cursor: 'pointer', color: '#fff' }}>
            <X size={13} /> Seçimi Temizle
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: 'rgba(247,250,252,0.97)', borderBottom: `1px solid ${BORDER}`, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flexShrink: 0 }}>
        <h1 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Space Grotesk','Inter',sans-serif" }}>Adresler</h1>
        <div style={{ position: 'relative', width: '240px' }}>
          <Search size={14} color={MUTED} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input style={{ ...S.input, paddingLeft: '32px', height: '36px' }} placeholder="Ad, şehir veya telefon ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {total > 0 && <span style={{ fontSize: '13px', color: MUTED }}>{total} adres</span>}
        <button onClick={openAdd} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, backgroundColor: PRIMARY, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          <Plus size={15} /> Yeni Adres
        </button>
        <button onClick={() => navigate('/address-labels')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '13px', fontWeight: 500, backgroundColor: '#fff', color: '#7C3AED', border: '1px solid #C4B5FD', borderRadius: '8px', cursor: 'pointer' }}>
          <Tag size={14} /> Adres Etiketi
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1,2,3].map(i => <div key={i} style={{ height: '72px', backgroundColor: '#F1F5F9', borderRadius: '10px' }} />)}
          </div>
        ) : addresses.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', textAlign: 'center' }}>
            <MapPin size={44} color='#CBD5E1' style={{ marginBottom: '12px' }} />
            <p style={{ color: MUTED, fontWeight: 500, margin: '0 0 12px' }}>{search ? `"${search}" için sonuç yok` : 'Henüz adres eklenmemiş'}</p>
            <button onClick={openAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, backgroundColor: PRIMARY, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              <Plus size={14} /> İlk Adresi Ekle
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Select all */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', fontSize: '12px', color: MUTED }}>
              <input type="checkbox" checked={allSel} onChange={toggleAll} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
              <span>Bu sayfadakileri seç ({addresses.length})</span>
            </div>

            {addresses.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', border: `1px solid ${selectedIds.has(a.id) ? '#BFDBFE' : BORDER}`, borderRadius: '12px', backgroundColor: selectedIds.has(a.id) ? '#F0F7FF' : '#FFFFFF', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
                <input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => toggleSelect(a)} style={{ cursor: 'pointer', width: '15px', height: '15px', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{a.name}</span>
                    {a.company && <span style={{ fontSize: '12px', color: MUTED }}>— {a.company}</span>}
                  </div>
                  {(a.address_line1 || a.city) && (
                    <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>
                      <MapPin size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', color: MUTED }} />
                      {[a.address_line1, a.address_line2, a.district, a.city, a.postal_code].filter(Boolean).join(', ')}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '14px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {a.phone && <span style={{ fontSize: '12px', color: MUTED, display: 'flex', alignItems: 'center', gap: '3px' }}><Phone size={11} />{a.phone}</span>}
                    {a.email && <span style={{ fontSize: '12px', color: MUTED, display: 'flex', alignItems: 'center', gap: '3px' }}><Mail size={11} />{a.email}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                  <button onClick={() => navigate('/address-labels', { state: { labelItems: [{ address: a, qty: 1 }] } })} title="Etiket Hazırla" style={{ padding: '6px', borderRadius: '6px', background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(11,79,138,0.08)'; e.currentTarget.style.color = PRIMARY; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = MUTED; }}>
                    <Tag size={14} />
                  </button>
                  <button onClick={() => openEdit(a)} title="Düzenle" style={{ padding: '6px', borderRadius: '6px', background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.color = '#0F172A'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = MUTED; }}>
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => setDeleteTarget(a)} title="Sil" style={{ padding: '6px', borderRadius: '6px', background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = MUTED; }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
            <button onClick={() => setPage(p => p-1)} disabled={page===1} style={{ padding: '7px', border: `1px solid ${BORDER}`, borderRadius: '8px', background: '#fff', cursor: page===1?'not-allowed':'pointer', opacity: page===1?.4:1, display: 'flex' }}><ChevronLeft size={16} color={MUTED}/></button>
            <span style={{ fontSize: '13px', color: MUTED }}>Sayfa {page} / {pages}</span>
            <button onClick={() => setPage(p => p+1)} disabled={page===pages} style={{ padding: '7px', border: `1px solid ${BORDER}`, borderRadius: '8px', background: '#fff', cursor: page===pages?'not-allowed':'pointer', opacity: page===pages?.4:1, display: 'flex' }}><ChevronRight size={16} color={MUTED}/></button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
          <div onClick={() => setModalOpen(false)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
          <div style={{ position: 'relative', width: '500px', maxWidth: '95vw', height: '100vh', backgroundColor: '#fff', boxShadow: '-8px 0 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', zIndex: 1 }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Space Grotesk','Inter',sans-serif" }}>{editAddress ? 'Adres Düzenle' : 'Yeni Adres Ekle'}</h2>
              <button onClick={() => setModalOpen(false)} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex' }}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF', marginBottom: '10px' }}>Kişi / Firma Bilgileri</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div><label style={S.label}>Ad Soyad *</label><input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Ahmet Yılmaz" style={S.input} /></div>
                  <div><label style={S.label}>Firma Adı</label><input value={form.company} onChange={e => setForm(f => ({...f, company: e.target.value}))} placeholder="ABC Ltd. Şti." style={S.input} /></div>
                </div>
              </div>
              <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '10px' }}><MapPin size={13} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />Adres Bilgileri</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div><label style={S.label}>Adres Satırı 1</label><input value={form.address_line1} onChange={e => setForm(f => ({...f, address_line1: e.target.value}))} placeholder="Cadde, Sokak, No, Daire" style={S.input} /></div>
                  <div><label style={S.label}>Adres Satırı 2 (isteğe bağlı)</label><input value={form.address_line2} onChange={e => setForm(f => ({...f, address_line2: e.target.value}))} placeholder="Mahalle, Apartman adı vb." style={S.input} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div><label style={S.label}>İlçe</label><input value={form.district} onChange={e => setForm(f => ({...f, district: e.target.value}))} placeholder="Kadıköy" style={S.input} /></div>
                    <div><label style={S.label}>Şehir</label><input value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} placeholder="İstanbul" style={S.input} /></div>
                    <div><label style={S.label}>Posta Kodu</label><input value={form.postal_code} onChange={e => setForm(f => ({...f, postal_code: e.target.value}))} placeholder="34710" style={{ ...S.input, fontFamily: "'IBM Plex Mono',monospace" }} /></div>
                  </div>
                </div>
              </div>
              <div style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#9A3412', marginBottom: '10px' }}>İletişim Bilgileri</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div><label style={S.label}><Phone size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />Telefon</label><input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="0212 000 00 00" style={{ ...S.input, fontFamily: "'IBM Plex Mono',monospace" }} /></div>
                  <div><label style={S.label}><Mail size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />E-posta</label><input value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="info@ornek.com" style={S.input} /></div>
                </div>
              </div>
              <div><label style={S.label}>Notlar</label><textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Ek bilgiler..." rows={3} style={{ ...S.input, resize: 'vertical', minHeight: '72px' }} /></div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: '10px', flexShrink: 0, backgroundColor: '#fff' }}>
              <button onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 500, border: `1px solid ${BORDER}`, borderRadius: '8px', background: '#fff', cursor: 'pointer' }}>İptal</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 600, backgroundColor: saving ? '#94A3B8' : PRIMARY, color: '#fff', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {saving ? <><div style={{ width: '13px', height: '13px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Kaydediliyor...</> : (editAddress ? 'Güncelle' : 'Kaydet')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={() => setDeleteTarget(null)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} />
          <div style={{ position: 'relative', backgroundColor: '#fff', borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 1 }}>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: '0 0 10px', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>Adres Silinecek</h2>
            <p style={{ fontSize: '13px', color: MUTED, margin: '0 0 20px' }}><strong style={{ color: '#0F172A' }}>{deleteTarget.name}</strong> kalıcı olarak silinecek.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '10px', fontSize: '13px', border: `1px solid ${BORDER}`, borderRadius: '8px', background: '#fff', cursor: 'pointer' }}>İptal</button>
              <button onClick={handleDelete} style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 600, backgroundColor: '#DC2626', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
