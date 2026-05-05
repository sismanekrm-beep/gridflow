import { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Paintbrush, Trash2, Plus, FolderOpen, Check, X, Layers, Tag, Edit2 } from 'lucide-react';
import LabelCard from '../components/LabelCard';
import { useAppSettings } from '../contexts/SettingsContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const BORDER = '#E2E8F0';
const MUTED = '#64748B';
const PRIMARY = '#0B4F8A';

const DEMO = {
  code: 'DIN965-M4X35', name: 'Y.H.B METRİK VİDA',
  measurement: '4X35', standard_code: 'DIN965', quality: 'A2',
};

// ─── Thumbnail ───────────────────────────────────────────────────────────────
function DesignThumbnail({ design, format, settings, size = 240 }) {
  const W = format?.label_width || 64;
  const H = format?.label_height || 34;
  const PX = 3.7795;
  const scale = Math.min(size / (W * PX), (size * 0.55) / (H * PX));
  const dW = W * PX * scale, dH = H * PX * scale;

  // Use the design's elements but the format's physical dimensions
  const fakeFormat = { ...(format || {}), elements: design.elements };

  return (
    <div style={{ width: `${dW}px`, height: `${dH}px`, position: 'relative', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, transform: `scale(${scale})`, transformOrigin: 'top left', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <LabelCard product={DEMO} settings={settings} format={fakeFormat} />
      </div>
    </div>
  );
}

export default function Designs() {
  const navigate = useNavigate();
  const { settings, designs, formats, fetchDesigns, fetchFormats, resolveFormat } = useAppSettings();

  const [loading, setLoading]           = useState(false);
  const [assignModal, setAssignModal]   = useState(null); // design being assigned
  const [editNameModal, setEditNameModal] = useState(null); // { id, name }
  const [newName, setNewName]           = useState('');
  const [selectedFormatIds, setSelectedFormatIds] = useState(new Set());

  // Default format for thumbnail rendering (smallest, matches TW-2024 proportions)
  const defaultFormat = formats[0] || { label_width: 64, label_height: 34, border_radius: 4 };

  // ── Assign design to formats ──────────────────────────────────────────────
  const openAssign = (design) => {
    // Pre-select formats already using this design
    const already = new Set(formats.filter(f => f.design_id === design.id).map(f => f.id));
    setSelectedFormatIds(already);
    setAssignModal(design);
  };

  const handleAssign = async () => {
    if (!assignModal) return;
    setLoading(true);
    try {
      const toAssign = [...selectedFormatIds];
      // Remove from formats that were deselected
      const toRemove = formats.filter(f => f.design_id === assignModal.id && !selectedFormatIds.has(f.id));
      await Promise.all([
        // Assign
        ...toAssign.map(fid => axios.put(`${BACKEND_URL}/api/label-formats/${fid}`, { design_id: assignModal.id })),
        // Remove
        ...toRemove.map(f  => axios.put(`${BACKEND_URL}/api/label-formats/${f.id}`,  { design_id: null })),
      ]);
      await Promise.all([fetchDesigns(), fetchFormats()]);
      toast.success(`"${assignModal.name}" tasarımı atandı!`);
      setAssignModal(null);
    } catch { toast.error('Atama başarısız'); }
    finally { setLoading(false); }
  };

  // ── Delete design ────────────────────────────────────────────────────────
  const handleDelete = async (design) => {
    if (!window.confirm(`"${design.name}" tasarımı silinecek. Kullanan şablonların ataması da kaldırılacak. Emin misiniz?`)) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/designs/${design.id}`);
      await Promise.all([fetchDesigns(), fetchFormats()]);
      toast.success('Tasarım silindi');
    } catch { toast.error('Silinemedi'); }
  };

  // ── Rename design ────────────────────────────────────────────────────────
  const handleRename = async () => {
    if (!editNameModal || !newName.trim()) return;
    try {
      await axios.put(`${BACKEND_URL}/api/designs/${editNameModal.id}`, { name: newName.trim() });
      await fetchDesigns();
      toast.success('İsim güncellendi');
      setEditNameModal(null);
    } catch { toast.error('İsim güncellenemedi'); }
  };

  const toggleFormat = (fid) => {
    setSelectedFormatIds(prev => {
      const next = new Set(prev);
      next.has(fid) ? next.delete(fid) : next.add(fid);
      return next;
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Space Grotesk','Inter',sans-serif" }}>
            Tasarım Kataloğu
          </h1>
          <p style={{ fontSize: '13px', color: MUTED, marginTop: '4px' }}>
            Tasarımlarınızı burada saklayın. İstediğiniz tasarımı istediğiniz şablona atayabilirsiniz.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => navigate('/settings')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', fontSize: '13px', fontWeight: 500, backgroundColor: '#fff', color: '#374151', border: `1px solid ${BORDER}`, borderRadius: '8px', cursor: 'pointer' }}>
            <FolderOpen size={14} /> Şablon Yönetimi
          </button>
        </div>
      </div>

      {/* ── Info banner ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', marginBottom: '24px', fontSize: '13px', color: '#1D4ED8', lineHeight: 1.6 }}>
        <Layers size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
        <div>
          <strong>Nasıl çalışır?</strong><br />
          1. <strong>Etiket Tasarımcısı</strong>'nda tasarımı oluşturun → <em>"Kataloğa Kaydet"</em> ile buraya ekleyin.<br />
          2. Her tasarım kartındaki <strong>"Şablona Ata"</strong> butonuyla hangi şablonların bu tasarımı kullanacağını seçin.<br />
          3. Bir tasarımı güncellerseniz, onu kullanan tüm şablonlar <strong>otomatik güncellenir</strong>.
        </div>
      </div>

      {/* ── Empty state ── */}
      {designs.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center', border: `2px dashed ${BORDER}`, borderRadius: '16px', backgroundColor: '#F8FAFC' }}>
          <Paintbrush size={48} color='#CBD5E1' style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 10px', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>
            Henüz tasarım yok
          </h2>
          <p style={{ fontSize: '14px', color: MUTED, margin: '0 0 24px', maxWidth: '400px' }}>
            Sol menüdeki <strong>"🎨 Etiket Tasarımcısı"</strong> butonundan tasarım oluşturun
            ve <em>"Kataloğa Kaydet"</em> ile buraya ekleyin.
          </p>
          <button
            onClick={() => {
              const firstFmt = formats[0];
              if (firstFmt) navigate(`/label-designer/${firstFmt.id}`);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 22px', fontSize: '14px', fontWeight: 600, backgroundColor: PRIMARY, color: '#fff', border: 'none', borderRadius: '9px', cursor: 'pointer' }}
          >
            <Paintbrush size={16} /> Tasarımcıya Git
          </button>
        </div>
      )}

      {/* ── Design cards ── */}
      {designs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' }}>
          {designs.map(design => {
            const usedBy = formats.filter(f => f.design_id === design.id);
            return (
              <div key={design.id} style={{ border: `1px solid ${BORDER}`, borderRadius: '14px', backgroundColor: '#FFFFFF', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column' }}>

                {/* Thumbnail */}
                <div style={{ padding: '20px', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '120px', borderBottom: `1px solid ${BORDER}`, position: 'relative' }}>
                  <DesignThumbnail design={design} format={defaultFormat} settings={settings} size={260} />
                </div>

                {/* Info */}
                <div style={{ padding: '14px 16px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', fontFamily: "'Space Grotesk','Inter',sans-serif", flex: 1 }}>
                      {design.name}
                    </span>
                    <button onClick={() => { setEditNameModal(design); setNewName(design.name); }}
                      style={{ padding: '4px', borderRadius: '5px', background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex' }}>
                      <Edit2 size={13} />
                    </button>
                  </div>
                  <div style={{ fontSize: '12px', color: MUTED, marginBottom: '8px' }}>
                    {design.elements?.length || 0} eleman &bull; {design.created_at ? new Date(design.created_at).toLocaleDateString('tr-TR') : ''}
                  </div>
                  {/* Used by */}
                  {usedBy.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {usedBy.map(f => (
                        <span key={f.id} style={{ fontSize: '11px', backgroundColor: '#EFF6FF', color: PRIMARY, border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: '20px', fontWeight: 500 }}>
                          {f.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>
                      Henüz hiçbir şablona atanmamış
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px', padding: '10px 14px', borderTop: `1px solid ${BORDER}`, backgroundColor: '#F8FAFC' }}>
                  {/* Assign to formats */}
                  <button
                    onClick={() => openAssign(design)}
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '8px', fontSize: '12px', fontWeight: 700, backgroundColor: PRIMARY, color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer' }}
                  >
                    <Tag size={13} /> Şablona Ata
                  </button>
                  {/* Edit in designer */}
                  <button
                    onClick={() => {
                      // Find a format using this design, or use the first format
                      const fmt = usedBy[0] || formats[0];
                      if (fmt) navigate(`/label-designer/${fmt.id}?design=${design.id}`);
                    }}
                    title="Tasarımcıda düzenle"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '8px 10px', fontSize: '12px', fontWeight: 500, backgroundColor: '#fff', color: '#374151', border: `1px solid ${BORDER}`, borderRadius: '7px', cursor: 'pointer' }}
                  >
                    <Paintbrush size={13} /> Düzenle
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(design)}
                    title="Sil"
                    style={{ display: 'inline-flex', alignItems: 'center', padding: '8px', fontSize: '12px', backgroundColor: '#fff', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '7px', cursor: 'pointer' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Assign Modal ── */}
      {assignModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={() => setAssignModal(null)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)' }} />
          <div style={{ position: 'relative', backgroundColor: '#fff', borderRadius: '16px', width: '100%', maxWidth: '580px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.25)', zIndex: 1 }}>

            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Space Grotesk','Inter',sans-serif" }}>
                  Şablona Ata
                </h2>
                <p style={{ fontSize: '13px', color: MUTED, marginTop: '3px' }}>
                  "<strong style={{ color: PRIMARY }}>{assignModal.name}</strong>" tasarımını hangi şablonlara atamak istiyorsunuz?
                </p>
              </div>
              <button onClick={() => setAssignModal(null)} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex' }}><X size={20} /></button>
            </div>

            {/* Design preview strip */}
            <div style={{ padding: '14px 24px', backgroundColor: '#F8FAFC', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
              <DesignThumbnail design={assignModal} format={defaultFormat} settings={settings} size={160} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{assignModal.name}</div>
                <div style={{ fontSize: '12px', color: MUTED, marginTop: '3px' }}>{assignModal.elements?.length} eleman</div>
              </div>
            </div>

            {/* Format list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
                Şablon Seçin (birden fazla seçilebilir)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {formats.map(fmt => {
                  const isSelected = selectedFormatIds.has(fmt.id);
                  const currentDesign = fmt.design_id ? designs.find(d => d.id === fmt.design_id) : null;
                  const hasOtherDesign = currentDesign && currentDesign.id !== assignModal.id;

                  return (
                    <div
                      key={fmt.id}
                      onClick={() => toggleFormat(fmt.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', border: `2px solid ${isSelected ? PRIMARY : BORDER}`, borderRadius: '10px', backgroundColor: isSelected ? '#EFF6FF' : '#FAFAFA', cursor: 'pointer', transition: 'border-color 0.15s, background-color 0.15s' }}
                    >
                      {/* Checkbox */}
                      <div style={{ width: '20px', height: '20px', borderRadius: '5px', backgroundColor: isSelected ? PRIMARY : '#fff', border: `2px solid ${isSelected ? PRIMARY : '#D1D5DB'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                        {isSelected && <Check size={12} color='#fff' strokeWidth={3} />}
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>
                          {fmt.name}
                        </div>
                        <div style={{ fontSize: '11px', color: MUTED }}>
                          {fmt.label_width}×{fmt.label_height}mm &bull; {fmt.cols}×{fmt.rows} = {fmt.cols*fmt.rows}/sayfa
                        </div>
                      </div>
                      {/* Current state badge */}
                      {fmt.design_id === assignModal.id ? (
                        <span style={{ fontSize: '11px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, flexShrink: 0 }}>
                          ✓ Atanmış
                        </span>
                      ) : hasOtherDesign ? (
                        <span style={{ fontSize: '11px', backgroundColor: '#FEF9C3', color: '#854D0E', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, flexShrink: 0, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          "{currentDesign.name}" kullanıyor
                        </span>
                      ) : fmt.elements?.length > 0 ? (
                        <span style={{ fontSize: '11px', backgroundColor: '#F1F5F9', color: MUTED, padding: '2px 8px', borderRadius: '20px', fontWeight: 500, flexShrink: 0 }}>
                          Özel tasarım
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', backgroundColor: '#F1F5F9', color: MUTED, padding: '2px 8px', borderRadius: '20px', fontWeight: 400, flexShrink: 0 }}>
                          Varsayılan
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: '10px', flexShrink: 0 }}>
              <div style={{ flex: 1, fontSize: '13px', color: MUTED, display: 'flex', alignItems: 'center' }}>
                {selectedFormatIds.size > 0 ? (
                  <span style={{ color: PRIMARY, fontWeight: 600 }}>{selectedFormatIds.size} şablon seçildi</span>
                ) : 'Şablon seçilmedi'}
              </div>
              <button onClick={() => setAssignModal(null)} style={{ padding: '10px 18px', fontSize: '13px', border: `1px solid ${BORDER}`, borderRadius: '8px', background: '#fff', cursor: 'pointer' }}>
                İptal
              </button>
              <button
                onClick={handleAssign}
                disabled={loading}
                style={{ padding: '10px 24px', fontSize: '13px', fontWeight: 600, backgroundColor: loading ? '#94A3B8' : PRIMARY, color: '#fff', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {loading
                  ? <><div style={{ width: '13px', height: '13px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Uygulanıyor...</>
                  : <><Check size={14} /> Onayla</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rename Modal ── */}
      {editNameModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={() => setEditNameModal(null)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'relative', backgroundColor: '#fff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 1 }}>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: '0 0 14px', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>Tasarım Adını Değiştir</h2>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); }}
              autoFocus
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: '14px', border: `1px solid ${BORDER}`, borderRadius: '8px', outline: 'none', color: '#0F172A', fontFamily: "'Inter',sans-serif", marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setEditNameModal(null)} style={{ flex: 1, padding: '10px', fontSize: '13px', border: `1px solid ${BORDER}`, borderRadius: '8px', background: '#fff', cursor: 'pointer' }}>İptal</button>
              <button onClick={handleRename} style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 600, backgroundColor: PRIMARY, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
