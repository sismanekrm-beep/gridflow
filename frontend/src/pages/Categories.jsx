import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Upload, X, FolderOpen, Copy, ChevronDown, ChevronRight } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const PRIMARY = '#0B4F8A';
const BORDER = '#E2E8F0';
const MUTED = '#64748B';

const DEFAULT_FIELDS = [
  { name: 'Ürün Kodu', var: '{{code}}' },
  { name: 'Ölçü',      var: '{{measurement}}' },
  { name: 'Açıklama',  var: '{{description}}' },
  { name: 'Kalite',    var: '{{quality}}' },
  { name: 'Adet',      var: '{{default_qty}}' },
  { name: 'Barkod No', var: '{{barcode}}' },
  { name: 'Tarih',     var: '{{print_date}}' },
];

const uid = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const makeField = (name, varStr = '') => ({ id: uid(), name, var: varStr, colorRules: [] });
const makeRule  = () => ({ id: uid(), value: '', bgColor: '#22C55E', textColor: '#000000' });

export default function Categories() {
  const [categories, setCategories]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editCat, setEditCat]         = useState(null);
  const [form, setForm]               = useState({ name: '', description: '', image_url: null, fields: [] });
  const [imgLoading, setImgLoading]   = useState(false);
  const [saving, setSaving]           = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandedField, setExpandedField] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/categories`);
      setCategories(res.data);
    } catch { toast.error('Kategoriler yüklenemedi'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const defaultFields = () => DEFAULT_FIELDS.map(f => makeField(f.name, f.var));

  const openAdd = () => {
    setEditCat(null);
    setForm({ name: '', description: '', image_url: null, fields: defaultFields() });
    setExpandedField(null);
    setModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditCat(cat);
    setForm({
      name: cat.name,
      description: cat.description || '',
      image_url: cat.image_url || null,
      fields: cat.fields?.length ? cat.fields : defaultFields(),
    });
    setExpandedField(null);
    setModalOpen(true);
  };

  const handleImgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgLoading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm(f => ({ ...f, image_url: res.data.url }));
      toast.success('Resim yüklendi');
    } catch { toast.error('Resim yüklenemedi'); }
    finally { setImgLoading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  // ── Field helpers ────────────────────────────────────────────────────
  const addField = () => {
    const nf = makeField('Yeni Alan', '');
    setForm(f => ({ ...f, fields: [...f.fields, nf] }));
    setExpandedField(nf.id);
  };

  const updateField = (id, key, val) =>
    setForm(f => ({ ...f, fields: f.fields.map(fl => fl.id === id ? { ...fl, [key]: val } : fl) }));

  const removeField = (id) => {
    setForm(f => ({ ...f, fields: f.fields.filter(fl => fl.id !== id) }));
    if (expandedField === id) setExpandedField(null);
  };

  const addRule = (fieldId) => {
    const r = makeRule();
    setForm(f => ({ ...f, fields: f.fields.map(fl =>
      fl.id === fieldId ? { ...fl, colorRules: [...(fl.colorRules || []), r] } : fl
    )}));
  };

  const updateRule = (fieldId, ruleId, key, val) =>
    setForm(f => ({ ...f, fields: f.fields.map(fl =>
      fl.id === fieldId ? { ...fl, colorRules: (fl.colorRules || []).map(r =>
        r.id === ruleId ? { ...r, [key]: val } : r
      )} : fl
    )}));

  const removeRule = (fieldId, ruleId) =>
    setForm(f => ({ ...f, fields: f.fields.map(fl =>
      fl.id === fieldId ? { ...fl, colorRules: (fl.colorRules || []).filter(r => r.id !== ruleId) } : fl
    )}));

  // ── Save / Delete / Duplicate ─────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Kategori adı zorunludur'); return; }
    setSaving(true);
    try {
      if (editCat) {
        await axios.put(`${BACKEND_URL}/api/categories/${editCat.id}`, form);
        toast.success('Kategori güncellendi');
      } else {
        await axios.post(`${BACKEND_URL}/api/categories`, form);
        toast.success('Kategori eklendi');
      }
      setModalOpen(false);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Hata oluştu'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (cat) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/categories/${cat.id}`);
      toast.success(`"${cat.name}" silindi`);
      setDeleteTarget(null);
      load();
    } catch { toast.error('Silme başarısız'); }
  };

  const handleDuplicate = async (cat) => {
    try {
      await axios.post(`${BACKEND_URL}/api/categories/${cat.id}/duplicate`);
      toast.success(`"${cat.name}" kopyalandı`);
      load();
    } catch { toast.error('Kopyalama başarısız'); }
  };

  const inp = { width: '100%', boxSizing: 'border-box', padding: '8px 11px', fontSize: '13px', border: `1px solid ${BORDER}`, borderRadius: '7px', outline: 'none', color: '#0F172A', backgroundColor: '#fff', fontFamily: "'Inter',sans-serif" };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Space Grotesk','Inter',sans-serif" }}>Kategoriler</h1>
          <p style={{ fontSize: '13px', color: MUTED, marginTop: '4px' }}>Dinamik alan tanımları ve renk kurallarıyla etiket tasarımlarınızı kişiselleştirin.</p>
        </div>
        <button onClick={openAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, backgroundColor: PRIMARY, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          <Plus size={16} /> Yeni Kategori
        </button>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: '220px', backgroundColor: '#F1F5F9', borderRadius: '12px' }} />)}
        </div>
      ) : categories.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px', textAlign: 'center' }}>
          <FolderOpen size={48} color='#CBD5E1' style={{ marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: '0 0 8px' }}>Henüz kategori yok</p>
          <p style={{ fontSize: '13px', color: MUTED, margin: '0 0 20px' }}>Civatalar, Somunlar gibi kategoriler oluşturun</p>
          <button onClick={openAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, backgroundColor: PRIMARY, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            <Plus size={16} /> İlk Kategoriyi Ekle
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          {categories.map((cat) => (
            <div key={cat.id} style={{ border: `1px solid ${BORDER}`, borderRadius: '12px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Thumbnail */}
              <div style={{ height: '130px', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${BORDER}`, position: 'relative', overflow: 'hidden' }}>
                {cat.image_url
                  ? <img src={`${BACKEND_URL}${cat.image_url}`} alt={cat.name} style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain' }} />
                  : <div style={{ textAlign: 'center' }}><FolderOpen size={30} color='#CBD5E1' style={{ display: 'block', margin: '0 auto 4px' }} /><span style={{ fontSize: '10px', color: '#94A3B8' }}>Resim yok</span></div>}
                <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: PRIMARY, color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>
                  {cat.product_count || 0} ürün
                </div>
              </div>
              {/* Body */}
              <div style={{ padding: '10px 14px', flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>{cat.name}</div>
                <div style={{ display: 'flex', gap: '5px', marginTop: '5px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: MUTED, backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '20px' }}>
                    {cat.fields?.length || 0} alan
                  </span>
                  {(cat.fields || []).some(f => f.colorRules?.length > 0) && (
                    <span style={{ fontSize: '11px', color: '#7C3AED', backgroundColor: '#EDE9FE', padding: '2px 8px', borderRadius: '20px' }}>🎨 renk kuralı</span>
                  )}
                </div>
              </div>
              {/* Actions */}
              <div style={{ display: 'flex', gap: '5px', padding: '10px 14px', borderTop: `1px solid ${BORDER}`, backgroundColor: '#F8FAFC' }}>
                <button onClick={() => openEdit(cat)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '7px', fontSize: '12px', fontWeight: 500, border: `1px solid ${BORDER}`, borderRadius: '7px', backgroundColor: '#fff', cursor: 'pointer', color: '#374151' }}>
                  <Edit2 size={12} /> Düzenle
                </button>
                <button onClick={() => handleDuplicate(cat)} title="Kategoriyi Çoğalt"
                  style={{ width: '34px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${BORDER}`, borderRadius: '7px', backgroundColor: '#fff', cursor: 'pointer', color: MUTED }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#EFF6FF'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = MUTED; e.currentTarget.style.borderColor = BORDER; }}>
                  <Copy size={12} />
                </button>
                <button onClick={() => setDeleteTarget(cat)}
                  style={{ width: '34px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${BORDER}`, borderRadius: '7px', backgroundColor: '#fff', cursor: 'pointer', color: '#94A3B8' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.borderColor = '#FCA5A5'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = BORDER; }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto' }}>
          <div onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'relative', backgroundColor: '#fff', borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '700px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 1, margin: '20px 0' }}>

            {/* Title */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Space Grotesk','Inter',sans-serif" }}>
                {editCat ? 'Kategori Düzenle' : 'Yeni Kategori'}
              </h2>
              <button onClick={() => setModalOpen(false)} style={{ padding: '6px', borderRadius: '6px', background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex' }}><X size={18} /></button>
            </div>

            {/* Top section: image + name + desc */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '20px', marginBottom: '20px', alignItems: 'start' }}>
              {/* Image upload */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '7px' }}>Kategori Resmi</label>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div onClick={() => fileRef.current?.click()} style={{ width: '80px', height: '70px', border: form.image_url ? `1px solid ${BORDER}` : '2px dashed #3B82F6', borderRadius: '10px', backgroundColor: form.image_url ? '#F8FAFC' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                    {form.image_url ? (
                      <>
                        <img src={`${BACKEND_URL}${form.image_url}`} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        <button onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, image_url: null })); }} style={{ position: 'absolute', top: '2px', right: '2px', width: '16px', height: '16px', backgroundColor: '#DC2626', color: '#fff', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={9} />
                        </button>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <Upload size={18} color='#3B82F6' style={{ display: 'block', margin: '0 auto 2px' }} />
                        <span style={{ fontSize: '9px', color: '#3B82F6', fontWeight: 600 }}>YÜKLE</span>
                      </div>
                    )}
                  </div>
                  <button onClick={() => fileRef.current?.click()} disabled={imgLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', fontSize: '12px', fontWeight: 600, border: 'none', borderRadius: '7px', backgroundColor: imgLoading ? '#94A3B8' : '#2563EB', color: '#fff', cursor: imgLoading ? 'not-allowed' : 'pointer', marginTop: '2px' }}>
                    {imgLoading ? '...' : <><Upload size={12} /> {form.image_url ? 'Değiştir' : 'Yükle'}</>}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImgUpload} />
                </div>
              </div>

              {/* Name + desc */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Kategori Adı *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="örn: Metrik Civatalar" style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Açıklama (isteğe bağlı)</label>
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="örn: DIN standardı civatalar" style={inp} />
                </div>
              </div>
            </div>

            {/* ── Fields Section ── */}
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#F8FAFC', borderBottom: `1px solid ${BORDER}` }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Alan Tanımları</span>
                  <span style={{ fontSize: '11px', color: MUTED, marginLeft: '8px' }}>{form.fields.length} alan</span>
                </div>
                <button onClick={addField} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, backgroundColor: PRIMARY, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  <Plus size={12} /> Alan Ekle
                </button>
              </div>

              <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                {form.fields.length === 0 && (
                  <p style={{ fontSize: '12px', color: '#94A3B8', padding: '14px 16px', margin: 0 }}>Alan yok. "Alan Ekle" ile yeni alan oluşturun.</p>
                )}
                {form.fields.map((field, idx) => (
                  <div key={field.id} style={{ borderBottom: idx < form.fields.length - 1 ? `1px solid ${BORDER}` : 'none' }}>

                    {/* Field row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 14px' }}>
                      <span style={{ fontSize: '11px', color: '#94A3B8', width: '18px', flexShrink: 0, fontFamily: "'IBM Plex Mono',monospace", textAlign: 'right' }}>{idx + 1}</span>
                      <input
                        value={field.name}
                        onChange={e => updateField(field.id, 'name', e.target.value)}
                        style={{ flex: 1, padding: '6px 10px', fontSize: '13px', border: `1px solid ${BORDER}`, borderRadius: '6px', outline: 'none', fontFamily: "'Inter',sans-serif" }}
                      />
                      <button
                        onClick={() => setExpandedField(expandedField === field.id ? null : field.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, border: `1px solid ${expandedField === field.id ? '#A78BFA' : BORDER}`, borderRadius: '6px', backgroundColor: expandedField === field.id ? '#EDE9FE' : '#fff', color: expandedField === field.id ? '#7C3AED' : MUTED, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        🎨 {field.colorRules?.length > 0 ? `${field.colorRules.length} kural` : 'Renk Kuralı'}
                        {expandedField === field.id ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      </button>
                      <button onClick={() => removeField(field.id)}
                        style={{ width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${BORDER}`, borderRadius: '6px', backgroundColor: '#fff', cursor: 'pointer', color: '#94A3B8', flexShrink: 0 }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.borderColor = '#FCA5A5'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = BORDER; }}>
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {/* Color Rules Panel */}
                    {expandedField === field.id && (
                      <div style={{ backgroundColor: '#F5F0FF', borderTop: '1px solid #DDD6FE', padding: '10px 14px 12px 42px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 600, color: '#7C3AED', marginBottom: '8px', margin: '0 0 8px' }}>
                          Renk Kuralları — "<em>{field.name}</em>" değeri eşleşirse renk uygula:
                        </p>
                        {(field.colorRules || []).length === 0 && (
                          <p style={{ fontSize: '11px', color: '#A78BFA', marginBottom: '8px', fontStyle: 'italic' }}>Henüz kural yok.</p>
                        )}
                        {(field.colorRules || []).map(rule => (
                          <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px', backgroundColor: '#fff', borderRadius: '7px', padding: '7px 10px', border: '1px solid #DDD6FE', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '10px', color: '#7C3AED', fontWeight: 600, whiteSpace: 'nowrap' }}>Değer =</span>
                            <input
                              value={rule.value}
                              onChange={e => updateRule(field.id, rule.id, 'value', e.target.value)}
                              placeholder="örn: A2"
                              style={{ width: '72px', padding: '4px 7px', fontSize: '12px', border: '1px solid #DDD6FE', borderRadius: '5px', outline: 'none', fontFamily: "'IBM Plex Mono',monospace" }}
                            />
                            <span style={{ fontSize: '10px', color: '#7C3AED', whiteSpace: 'nowrap' }}>Arkaplan:</span>
                            <input type="color" value={rule.bgColor} onChange={e => updateRule(field.id, rule.id, 'bgColor', e.target.value)} style={{ width: '34px', height: '28px', padding: '1px', border: '1px solid #DDD6FE', borderRadius: '5px', cursor: 'pointer' }} />
                            <span style={{ fontSize: '10px', color: '#7C3AED', whiteSpace: 'nowrap' }}>Metin:</span>
                            <input type="color" value={rule.textColor} onChange={e => updateRule(field.id, rule.id, 'textColor', e.target.value)} style={{ width: '34px', height: '28px', padding: '1px', border: '1px solid #DDD6FE', borderRadius: '5px', cursor: 'pointer' }} />
                            {/* Preview */}
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '4px', backgroundColor: rule.bgColor, color: rule.textColor, whiteSpace: 'nowrap' }}>{rule.value || 'önizleme'}</span>
                            <div style={{ flex: 1 }} />
                            <button onClick={() => removeRule(field.id, rule.id)} style={{ width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #FCA5A5', borderRadius: '5px', backgroundColor: '#FEF2F2', cursor: 'pointer', color: '#DC2626' }}>
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        <button onClick={() => addRule(field.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, border: '1px dashed #A78BFA', borderRadius: '6px', backgroundColor: 'transparent', color: '#7C3AED', cursor: 'pointer', marginTop: '4px' }}>
                          <Plus size={11} /> Kural Ekle
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 500, border: `1px solid ${BORDER}`, borderRadius: '8px', background: '#fff', cursor: 'pointer' }}>İptal</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '10px', fontSize: '13px', fontWeight: 600, backgroundColor: saving ? '#94A3B8' : PRIMARY, color: '#fff', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {saving ? 'Kaydediliyor...' : (editCat ? 'Güncelle' : 'Kaydet')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={() => setDeleteTarget(null)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'relative', backgroundColor: '#fff', borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 1 }}>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: '0 0 10px', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>Kategori Silinecek</h2>
            <p style={{ fontSize: '13px', color: MUTED, margin: '0 0 8px' }}>
              <strong style={{ color: '#0F172A' }}>"{deleteTarget.name}"</strong> kategorisi silinecek.
            </p>
            <p style={{ fontSize: '12px', color: '#DC2626', margin: '0 0 20px', padding: '8px 12px', backgroundColor: '#FEF2F2', borderRadius: '7px', border: '1px solid #FCA5A5' }}>
              Bu kategoriye atanmış <strong>{deleteTarget.product_count || 0} ürün</strong>ün kategori bağlantısı kaldırılacak.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '10px', fontSize: '13px', border: `1px solid ${BORDER}`, borderRadius: '8px', background: '#fff', cursor: 'pointer' }}>İptal</button>
              <button onClick={() => handleDelete(deleteTarget)} style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 600, backgroundColor: '#DC2626', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
