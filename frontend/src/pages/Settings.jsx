import { useState, useEffect, useRef } from 'react';
import React from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Upload, Save, X, Tag, Info, Plus, Edit2, Trash2, Ruler, Paintbrush, ChevronDown, ChevronUp, Mail, Type, RotateCcw } from 'lucide-react';
import LabelCard from '../components/LabelCard';
import EnvelopeLabelCard from '../components/EnvelopeLabelCard';
import { useAppSettings } from '../contexts/SettingsContext';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const imgUrl = (url) => !url ? null : url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
const PRIMARY = '#0B4F8A';
const BORDER = '#E2E8F0';
const MUTED = '#64748B';
const SCALE_PX = 1.6;

const ENVELOPE_SIZES = [
  { key:'DL', label:'DL', desc:'220×110 mm', w:220, h:110,
    stampDef:{ x:185, y:5, w:28, h:30 },
    windowDef:{ x:22, y:48, w:90, h:45 } },
  { key:'C5', label:'C5', desc:'229×162 mm', w:229, h:162,
    stampDef:{ x:194, y:5, w:28, h:35 },
    windowDef:{ x:20, y:85, w:110, h:60 } },
  { key:'C6', label:'C6', desc:'162×114 mm', w:162, h:114,
    stampDef:{ x:130, y:4, w:25, h:30 },
    windowDef:{ x:15, y:55, w:80, h:40 } },
  { key:'C4', label:'C4', desc:'324×229 mm', w:324, h:229,
    stampDef:{ x:290, y:5, w:28, h:40 },
    windowDef:{ x:25, y:110, w:130, h:75 } },
];

const FONT_OPTIONS = [
  { label: 'Inter (Varsayılan)', value: "'Inter','Arial',sans-serif" },
  { label: 'Arial', value: 'Arial,Helvetica,sans-serif' },
  { label: 'Helvetica', value: "Helvetica,Arial,sans-serif" },
  { label: 'Verdana', value: "Verdana,Geneva,sans-serif" },
  { label: 'IBM Plex Mono (Tekdüze)', value: "'IBM Plex Mono','Courier New',monospace" },
  { label: 'Courier New (Tekdüze)', value: "'Courier New',Courier,monospace" },
  { label: 'Times New Roman (Serif)', value: "'Times New Roman',Times,serif" },
  { label: 'Georgia (Serif)', value: "Georgia,serif" },
];

const DEMO_ADDR = {
  name: 'Ahmet Yılmaz', company: 'ABC Ticaret Ltd.',
  address_line1: 'Atatürk Cad. No:15 D:3',
  district: 'Çankaya', city: 'Ankara', postal_code: '06420',
};

const ELEMENTS = [
  { key: 'logo',      label: 'Logo',            color: '#16A34A', showKey: 'envelope_show_logo',
    xKey: 'envelope_logo_x',   yKey: 'envelope_logo_y',   wKey: 'envelope_logo_w',   hKey: 'envelope_logo_h',
    defX: 7, defY: 5, defW: 50, defH: 12 },
  { key: 'sender',    label: 'Gönderen Adresi', color: '#D97706', showKey: 'envelope_show_sender',
    xKey: 'envelope_sender_x', yKey: 'envelope_sender_y', wKey: 'envelope_sender_w', hKey: 'envelope_sender_h',
    defX: 7, defY: 18, defW: 60, defH: 18 },
  { key: 'stamp',     label: 'Pul Alanı',       color: '#7C3AED', showKey: 'envelope_show_stamp',
    xKey: 'envelope_stamp_x',  yKey: 'envelope_stamp_y',  wKey: 'envelope_stamp_w',  hKey: 'envelope_stamp_h',
    defX: 207, defY: 5, defW: 25, defH: 30 },
  { key: 'recipient', label: 'Alıcı Adresi',    color: '#2563EB', showKey: null,
    xKey: 'envelope_recipient_x', yKey: 'envelope_recipient_y', wKey: 'envelope_recipient_w', hKey: 'envelope_recipient_h',
    defX: 60, defY: 28, defW: 172, defH: 65 },
];

function EnvelopePositionPicker({ settings, setSettings, envW, envH }) {
  const [activeEl, setActiveEl] = React.useState('recipient');
  const canvasRef = React.useRef(null);
  const upd = (patch) => setSettings(s => ({ ...s, ...patch }));
  const getEl = (el) => ({
    show: el.showKey ? (settings[el.showKey] !== false) : true,
    x: settings[el.xKey] ?? el.defX, y: settings[el.yKey] ?? el.defY,
    w: settings[el.wKey] ?? el.defW, h: settings[el.hKey] ?? el.defH,
  });
  const toP = (mm) => mm * SCALE_PX;
  const fromP = (px) => px / SCALE_PX;

  const handleMouseDown = (e, elKey) => {
    e.preventDefault(); e.stopPropagation();
    setActiveEl(elKey);
    const el = ELEMENTS.find(el => el.key === elKey);
    if (!el) return;
    const state = getEl(el);
    const { x: snapX, y: snapY, w: snapW, h: snapH } = state;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = fromP(e.clientX - rect.left), my = fromP(e.clientY - rect.top);
    const margin = 5 / SCALE_PX;
    const corners = { se:{x:snapX+snapW,y:snapY+snapH}, sw:{x:snapX,y:snapY+snapH}, ne:{x:snapX+snapW,y:snapY}, nw:{x:snapX,y:snapY} };
    let corner = null;
    for (const [c, pos] of Object.entries(corners)) {
      if (Math.abs(mx-pos.x)<margin*2.5 && Math.abs(my-pos.y)<margin*2.5) { corner=c; break; }
    }
    const startMX = e.clientX, startMY = e.clientY;
    const onMove = (ev) => {
      const dx = fromP(ev.clientX-startMX), dy = fromP(ev.clientY-startMY);
      if (corner) {
        let nx=snapX,ny=snapY,nw=snapW,nh=snapH;
        if(corner.includes('e'))nw=Math.max(10,snapW+dx); if(corner.includes('s'))nh=Math.max(8,snapH+dy);
        if(corner.includes('w')){nx=snapX+dx;nw=Math.max(10,snapW-dx);} if(corner.includes('n')){ny=snapY+dy;nh=Math.max(8,snapH-dy);}
        nx=Math.max(0,Math.min(envW-10,nx)); ny=Math.max(0,Math.min(envH-8,ny));
        nw=Math.min(envW-nx,nw); nh=Math.min(envH-ny,nh);
        upd({[el.xKey]:+(nx.toFixed(1)),[el.yKey]:+(ny.toFixed(1)),[el.wKey]:+(nw.toFixed(1)),[el.hKey]:+(nh.toFixed(1))});
      } else {
        upd({[el.xKey]:+(Math.max(0,Math.min(envW-snapW,snapX+dx)).toFixed(1)),[el.yKey]:+(Math.max(0,Math.min(envH-snapH,snapY+dy)).toFixed(1))});
      }
    };
    const onUp = () => { document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp); };
    document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',onUp);
  };

  const CW = toP(envW), CH = toP(envH);
  const hasWindow = settings.envelope_has_window;
  const wx = settings.envelope_window_x ?? 22, wy = settings.envelope_window_y ?? 48;
  const ww = settings.envelope_window_w ?? 90, wh = settings.envelope_window_h ?? 45;
  const activeElDef = ELEMENTS.find(e => e.key === activeEl);
  const activeState = activeElDef ? getEl(activeElDef) : null;
  return (
    <div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'10px' }}>
        {ELEMENTS.map(el => {
          const st = getEl(el); const isActive = activeEl === el.key;
          return (
            <button key={el.key} onClick={() => setActiveEl(el.key)}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'5px 10px', fontSize:'12px', fontWeight:isActive?700:500, border:`2px solid ${isActive?el.color:BORDER}`, borderRadius:'7px', backgroundColor:isActive?`${el.color}12`:'#fff', cursor:'pointer', color:isActive?el.color:'#374151' }}>
              <span style={{ width:'10px', height:'10px', borderRadius:'2px', backgroundColor:el.color, flexShrink:0 }} />
              {el.label}
              {el.showKey && (
                <span onClick={e => { e.stopPropagation(); upd({[el.showKey]:!st.show}); }}
                  style={{ marginLeft:'2px', padding:'1px 6px', fontSize:'10px', fontWeight:600, borderRadius:'10px', backgroundColor:st.show?'#DCFCE7':'#FEE2E2', color:st.show?'#15803D':'#DC2626', cursor:'pointer' }}>
                  {st.show ? 'Görünür' : 'Gizli'}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div style={{ marginBottom:'10px' }}>
        <p style={{ fontSize:'11px', color:MUTED, marginBottom:'5px' }}>
          Seçili (<span style={{ color:activeElDef?.color, fontWeight:600 }}>{activeElDef?.label}</span>) kutuyu sürükleyin veya köşelerden boyutlandırın:
        </p>
        <div style={{ overflowX:'auto' }}>
          <div ref={canvasRef} style={{ position:'relative', width:`${CW}px`, height:`${CH}px`, backgroundColor:'#FFFFFF', border:`1.5px solid ${BORDER}`, borderRadius:'4px', cursor:'default', overflow:'visible', userSelect:'none', backgroundImage:'radial-gradient(circle, #E2E8F0 1px, transparent 1px)', backgroundSize:`${SCALE_PX*10}px ${SCALE_PX*10}px`, flexShrink:0 }}>
            {/* Pencere overlay */}
            {hasWindow && (
              <div style={{ position:'absolute', left:`${toP(wx)}px`, top:`${toP(wy)}px`, width:`${toP(ww)}px`, height:`${toP(wh)}px`, backgroundColor:'rgba(96,165,250,0.15)', border:'1.5px dashed #3B82F6', borderRadius:'2px', zIndex:5, pointerEvents:'none', boxSizing:'border-box' }}>
                <div style={{ position:'absolute', top:2, left:3, fontSize:'7px', fontWeight:700, color:'#3B82F6', whiteSpace:'nowrap' }}>🪟 Pencere</div>
              </div>
            )}
            {ELEMENTS.map(el => {
              const st = getEl(el);
              if (!st.show && el.showKey) return null;
              const isAct = el.key === activeEl;
              return (
                <div key={el.key} style={{ position:'absolute', left:`${toP(st.x)}px`, top:`${toP(st.y)}px`, width:`${toP(st.w)}px`, height:`${toP(st.h)}px`, backgroundColor:`${el.color}18`, border:`${isAct?2:1}px solid ${el.color}`, borderRadius:'2px', cursor:'move', boxSizing:'border-box', zIndex:isAct?10:1 }}
                  onMouseDown={e => handleMouseDown(e, el.key)}>
                  <div style={{ position:'absolute', top:1, left:2, fontSize:'7px', fontWeight:700, color:el.color, lineHeight:1, whiteSpace:'nowrap', pointerEvents:'none' }}>{el.label}</div>
                  {isAct && [['nw',0,0],['ne',0,toP(st.w)-8],['sw',toP(st.h)-8,0],['se',toP(st.h)-8,toP(st.w)-8]].map(([c,t,l]) => (
                    <div key={c} style={{ position:'absolute', top:t, left:l, width:'8px', height:'8px', backgroundColor:'#fff', border:`1.5px solid ${el.color}`, borderRadius:'2px', cursor:`${c}-resize`, pointerEvents:'none' }} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
        <p style={{ fontSize:'10px', color:'#94A3B8', marginTop:'3px' }}>
          {envW}mm × {envH}mm &nbsp;|&nbsp;
          {activeElDef && activeState && <span style={{ color:activeElDef.color, fontWeight:500 }}>{activeElDef.label}: {Math.round(activeState.x)}mm sol, {Math.round(activeState.y)}mm üst, {Math.round(activeState.w)}×{Math.round(activeState.h)}mm</span>}
        </p>
      </div>
      {activeElDef && activeState && (
        <div style={{ padding:'10px 12px', backgroundColor:`${activeElDef.color}08`, border:`1px solid ${activeElDef.color}30`, borderRadius:'8px', marginBottom:'8px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:activeElDef.color, marginBottom:'8px' }}>{activeElDef.label} – Hassas Ayar</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'7px' }}>
            {[['Sol (mm)',activeElDef.xKey,activeState.x],['Üst (mm)',activeElDef.yKey,activeState.y],['Genişlik',activeElDef.wKey,activeState.w],['Yükseklik',activeElDef.hKey,activeState.h]].map(([label,key,val]) => (
              <div key={key}>
                <label style={{ display:'block', fontSize:'9px', color:MUTED, marginBottom:'2px' }}>{label}</label>
                <input type="number" min="0" max={envW} step="0.5" value={Math.round(val*10)/10} onChange={e => upd({[key]:parseFloat(e.target.value)||0})}
                  style={{ width:'100%', boxSizing:'border-box', padding:'4px 6px', fontSize:'12px', fontFamily:"'IBM Plex Mono',monospace", border:`1px solid ${BORDER}`, borderRadius:'6px', outline:'none', color:'#0F172A', backgroundColor:'#fff' }} />
              </div>
            ))}
          </div>
        </div>
      )}
      {activeEl === 'recipient' && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
          <span style={{ fontSize:'10px', color:MUTED, alignSelf:'center' }}>Hızlı konum:</span>
          {[['Sol',8,Math.round(envH*0.27),Math.round(envW*0.55),Math.round(envH*0.60)],['Orta',Math.round(envW*0.22),Math.round(envH*0.27),Math.round(envW*0.57),Math.round(envH*0.60)],['Sağ',Math.round(envW*0.40),Math.round(envH*0.27),Math.round(envW*0.57),Math.round(envH*0.60)],['Klasik',Math.round(envW*0.27),Math.round(envH*0.27),Math.round(envW*0.72),Math.round(envH*0.62)]].map(([lbl,x,y,w,h]) => (
            <button key={lbl} onClick={() => upd({envelope_recipient_x:x,envelope_recipient_y:y,envelope_recipient_w:w,envelope_recipient_h:h})}
              style={{ padding:'3px 9px', fontSize:'11px', border:`1px solid ${BORDER}`, borderRadius:'6px', backgroundColor:'#fff', cursor:'pointer', color:'#374151' }}>{lbl}</button>
          ))}
        </div>
      )}
    </div>
  );
}

const DEMO_PRODUCT = {
  code: 'DIN965-M4X35', name: 'Y.H.B METRİK VİDA',
  measurement: '4X35', standard_code: 'DIN965', quality: 'A2', image_url: null,
};

const S = {
  page: { padding:'24px', maxWidth:'960px', margin:'0 auto' },
  heading1: { fontSize:'24px', fontWeight:700, color:'#0F172A', fontFamily:"'Space Grotesk','Inter',sans-serif", margin:0, lineHeight:1.3 },
  heading2: { fontSize:'15px', fontWeight:700, color:'#0F172A', fontFamily:"'Space Grotesk','Inter',sans-serif", margin:'0 0 14px 0' },
  card: { border:`1px solid ${BORDER}`, borderRadius:'12px', padding:'20px', backgroundColor:'#FFFFFF', boxShadow:'0 1px 3px rgba(15,23,42,0.06)' },
  grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' },
  label: { display:'block', fontSize:'13px', fontWeight:600, color:'#0F172A', marginBottom:'6px' },
  input: { width:'100%', boxSizing:'border-box', padding:'8px 12px', fontSize:'14px', border:`1px solid #D1D5DB`, borderRadius:'8px', outline:'none', color:'#0F172A', backgroundColor:'#FFFFFF', fontFamily:"'Inter',sans-serif" },
  inputNumber: { width:'100%', boxSizing:'border-box', padding:'8px 12px', fontSize:'13px', fontFamily:"'IBM Plex Mono',monospace", border:`1px solid #D1D5DB`, borderRadius:'8px', outline:'none', color:'#0F172A', backgroundColor:'#FFFFFF' },
  btn: { display:'inline-flex', alignItems:'center', gap:'6px', padding:'8px 14px', fontSize:'13px', fontWeight:500, border:`1px solid #D1D5DB`, borderRadius:'8px', backgroundColor:'#FFFFFF', cursor:'pointer', color:'#374151', fontFamily:"'Inter',sans-serif" },
  btnPrimary: { display:'inline-flex', alignItems:'center', gap:'8px', padding:'10px 20px', fontSize:'14px', fontWeight:600, border:'none', borderRadius:'8px', backgroundColor:PRIMARY, color:'#FFFFFF', cursor:'pointer', fontFamily:"'Inter',sans-serif" },
  infoBox: { display:'flex', alignItems:'flex-start', gap:'8px', padding:'12px', borderRadius:'8px', backgroundColor:'#EFF6FF', border:'1px solid #BFDBFE', fontSize:'12px', color:'#1E40AF' },
  muted: { fontSize:'12px', color:'#64748B', marginTop:'4px' },
  logoBox: { width:'80px', height:'64px', border:'2px dashed #CBD5E1', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0, backgroundColor:'#F8FAFC' },
  sectionTitle: { display:'flex', alignItems:'center', gap:'8px', fontSize:'16px', fontWeight:700, color:'#0F172A', fontFamily:"'Space Grotesk','Inter',sans-serif" },
  divider: { borderTop:`1px solid ${BORDER}`, paddingTop:'14px', marginTop:'14px' },
};

export default function Settings() {
  const [settings, setSettings] = useState({
    brand_name:'Marka Adı', brand_logo_url:null, brand_logo_w:20, brand_logo_h:12, sender_address:'',
    label_font_family:"'Inter','Arial',sans-serif", label_default_font_size:8,
    envelope_show_logo:true, envelope_logo_x:7, envelope_logo_y:5, envelope_logo_w:50, envelope_logo_h:12,
    envelope_show_sender:true, envelope_sender_x:7, envelope_sender_y:18, envelope_sender_w:60, envelope_sender_h:18,
    envelope_show_stamp:true, envelope_stamp_x:207, envelope_stamp_y:5, envelope_stamp_w:25, envelope_stamp_h:30,
    envelope_recipient_x:60, envelope_recipient_y:28, envelope_recipient_w:172, envelope_recipient_h:65,
    margin_top:5.5, margin_bottom:5.5, margin_left:7.0, margin_right:7.0, gap_col:2.0, gap_row:2.0,
    envelope_font_family:"'Inter','Arial',sans-serif",
    envelope_sender_font_size:6.5,
    envelope_recipient_name_size:11,
    envelope_recipient_addr_size:8.5,
    envelope_size:'DL',
    envelope_has_window:false,
    envelope_window_x:22, envelope_window_y:48, envelope_window_w:90, envelope_window_h:45,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);
  const [zarfOpen, setZarfOpen] = useState(false);
  const logoRef = useRef(null);

  const { updateSettings: updateGlobalSettings, formats, fetchFormats } = useAppSettings();
  const navigate = useNavigate();

  // Format management
  const [fmtModalOpen, setFmtModalOpen] = useState(false);
  const [editFmt, setEditFmt] = useState(null);
  const [fmtSaving, setFmtSaving] = useState(false);
  const [fmtDeleting, setFmtDeleting] = useState(null);
  const [fmtResetting, setFmtResetting] = useState(false);

  const handleResetPresets = async () => {
    setFmtResetting(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/label-formats/load-presets`);
      if (res.data.added > 0) {
        toast.success(`${res.data.added} eksik TANEX şablonu geri yüklendi`);
      } else {
        toast.info('Tüm varsayılan şablonlar zaten mevcut');
      }
      await fetchFormats();
    } catch (err) { toast.error(err.response?.data?.detail || 'Hata oluştu'); }
    finally { setFmtResetting(false); }
  };
  const emptyFmt = { name:'', label_width:64, label_height:34, cols:3, rows:8, margin_top:5.5, margin_bottom:5.5, margin_left:7.0, margin_right:7.0, gap_col:2.0, gap_row:2.0, border_radius:4.0 };
  const [fmtForm, setFmtForm] = useState(emptyFmt);

  const openAddFmt = () => { setEditFmt(null); setFmtForm(emptyFmt); setFmtModalOpen(true); };
  const openEditFmt = (f) => { setEditFmt(f); setFmtForm({...f}); setFmtModalOpen(true); };

  const handleSaveFmt = async () => {
    if (!fmtForm.name.trim()) { toast.error('Format adı zorunludur'); return; }
    setFmtSaving(true);
    try {
      if (editFmt) await axios.put(`${BACKEND_URL}/api/label-formats/${editFmt.id}`, fmtForm);
      else await axios.post(`${BACKEND_URL}/api/label-formats`, fmtForm);
      toast.success(editFmt ? 'Format güncellendi' : 'Format eklendi');
      setFmtModalOpen(false);
      await fetchFormats();
    } catch (err) { toast.error(err.response?.data?.detail || 'Hata oluştu'); }
    finally { setFmtSaving(false); }
  };

  const handleDeleteFmt = async (f) => {
    setFmtDeleting(f.id);
    try {
      await axios.delete(`${BACKEND_URL}/api/label-formats/${f.id}`);
      toast.success(`"${f.name}" silindi`);
      setFmtDeleting(null);
      await fetchFormats();
    } catch (err) { toast.error(err.response?.data?.detail || 'Silinemedi'); setFmtDeleting(null); }
  };

  const calcFit = (f) => {
    const usedW = f.margin_left + f.cols*f.label_width + (f.cols-1)*f.gap_col + f.margin_right;
    const usedH = f.margin_top + f.rows*f.label_height + (f.rows-1)*f.gap_row + f.margin_bottom;
    return { usedW:usedW.toFixed(1), usedH:usedH.toFixed(1), ok:Math.abs(usedW-210)<3 && Math.abs(usedH-297)<3 };
  };

  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/settings`)
      .then(r => { setSettings(s => ({...s, ...r.data})); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setLogoLoading(true);
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/upload`, fd, { headers:{'Content-Type':'multipart/form-data'} });
      setSettings(s => ({...s, brand_logo_url:res.data.url}));
      toast.success('Logo yüklendi');
    } catch { toast.error('Logo yüklenemedi'); }
    finally { setLogoLoading(false); if (logoRef.current) logoRef.current.value=''; }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${BACKEND_URL}/api/settings`, settings);
      setSettings(prev => ({...prev, ...res.data}));
      updateGlobalSettings({...settings, ...res.data});
      toast.success('Ayarlar kaydedildi!');
    } catch { toast.error('Kaydetme başarısız'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'160px' }}>
      <div style={{ width:'24px', height:'24px', border:'2px solid #0B4F8A', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ marginBottom:'28px' }}>
        <h1 style={S.heading1}>Şablon Oluştur</h1>
        <p style={{ fontSize:'13px', color:MUTED, marginTop:'4px' }}>Marka bilgileri, yazı tipi, yazdırma ve etiket boyut ayarları</p>
      </div>

      {/* ── Row 1: Marka + Yazı Tipi ── */}
      <div style={S.grid2}>

        {/* Marka Ayarları */}
        <div style={S.card}>
          <h2 style={S.heading2}>Marka Ayarları</h2>

          {/* Logo */}
          <div style={{ marginBottom:'20px' }}>
            <span style={S.label}>Marka Logosu</span>
            <div style={{ display:'flex', alignItems:'flex-start', gap:'16px' }}>
              <div style={S.logoBox}>
                {settings.brand_logo_url
                  ? <img src={imgUrl(settings.brand_logo_url)} alt="logo" style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain', padding:'4px' }} />
                  : <Tag size={22} color="#94A3B8" />}
              </div>
              <div>
                <button onClick={() => logoRef.current?.click()} style={S.btn} disabled={logoLoading}>
                  {logoLoading ? <div style={{ width:'14px', height:'14px', border:'2px solid #0B4F8A', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} /> : <Upload size={14} />}
                  {logoLoading ? 'Yükleniyor...' : 'Logo Seç'}
                </button>
                {settings.brand_logo_url && (
                  <button onClick={() => setSettings(s => ({...s, brand_logo_url:null}))}
                    style={{ marginTop:'6px', background:'none', border:'none', cursor:'pointer', fontSize:'12px', color:'#94A3B8', display:'flex', alignItems:'center', gap:'4px', padding:0 }}>
                    <X size={11} /> Logoyu Kaldır
                  </button>
                )}
                <p style={{ ...S.muted, marginTop:'6px' }}>PNG, JPG (max 2MB)</p>
              </div>
              <input ref={logoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleLogoUpload} />
            </div>
          </div>

          {/* Brand Name */}
          <div style={{ marginBottom:'18px' }}>
            <label style={S.label}>Marka Adı</label>
            <input type="text" value={settings.brand_name || ''} onChange={e => setSettings(s => ({...s, brand_name:e.target.value}))} placeholder="Şirket adınız" style={S.input} />
            <p style={S.muted}>Logo yoksa etikette marka adı gösterilir</p>
          </div>

          {/* Logo Boyutu */}
          <div style={{ borderTop:`1px solid ${BORDER}`, paddingTop:'16px' }}>
            <label style={{ ...S.label, marginBottom:'10px' }}>Logo Boyutu (mm)</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
              <div>
                <label style={{ display:'block', fontSize:'11px', color:MUTED, marginBottom:'4px' }}>Genişlik</label>
                <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                  <input type="range" min={10} max={80} step={1}
                    value={settings.brand_logo_w || 20}
                    onChange={e => setSettings(s => ({...s, brand_logo_w:+e.target.value}))}
                    style={{ flex:1, accentColor:PRIMARY }} />
                  <input type="number" min={10} max={80} step={1}
                    value={settings.brand_logo_w || 20}
                    onChange={e => setSettings(s => ({...s, brand_logo_w:+e.target.value||20}))}
                    style={{ ...S.inputNumber, width:'52px', textAlign:'center', padding:'5px 6px' }} />
                </div>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'11px', color:MUTED, marginBottom:'4px' }}>Yükseklik</label>
                <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                  <input type="range" min={5} max={50} step={1}
                    value={settings.brand_logo_h || 12}
                    onChange={e => setSettings(s => ({...s, brand_logo_h:+e.target.value}))}
                    style={{ flex:1, accentColor:PRIMARY }} />
                  <input type="number" min={5} max={50} step={1}
                    value={settings.brand_logo_h || 12}
                    onChange={e => setSettings(s => ({...s, brand_logo_h:+e.target.value||12}))}
                    style={{ ...S.inputNumber, width:'52px', textAlign:'center', padding:'5px 6px' }} />
                </div>
              </div>
            </div>
            {/* Mini önizleme */}
            <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 12px', backgroundColor:'#F8FAFC', border:`1px solid ${BORDER}`, borderRadius:'8px' }}>
              <div style={{ width:`${Math.min((settings.brand_logo_w||20)*1.5, 120)}px`, height:`${Math.min((settings.brand_logo_h||12)*1.5, 60)}px`, flexShrink:0, border:`1.5px dashed ${BORDER}`, borderRadius:'6px', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', backgroundColor:'#fff', transition:'all 0.2s' }}>
                {settings.brand_logo_url
                  ? <img src={imgUrl(settings.brand_logo_url)} alt="logo" style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }} />
                  : <span style={{ fontSize:'10px', color:'#94A3B8', fontWeight:600 }}>{settings.brand_name || 'MARKA'}</span>}
              </div>
              <div>
                <div style={{ fontSize:'11px', fontWeight:600, color:'#374151' }}>{settings.brand_logo_w||20} × {settings.brand_logo_h||12} mm</div>
                <div style={{ fontSize:'10px', color:MUTED, marginTop:'2px' }}>Etiket ve zarfta bu boyutta görünür</div>
                <button onClick={() => setSettings(s => ({...s, brand_logo_w:20, brand_logo_h:12}))}
                  style={{ marginTop:'5px', fontSize:'10px', color:MUTED, background:'none', border:'none', cursor:'pointer', padding:0, textDecoration:'underline' }}>
                  Varsayılana sıfırla (20×12)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Yazı Tipi Ayarları */}
        <div style={S.card}>
          <h2 style={{ ...S.heading2, display:'flex', alignItems:'center', gap:'8px' }}>
            <Type size={16} color={PRIMARY} /> Yazı Tipi Ayarları
          </h2>

          {/* Font Family */}
          <div style={{ marginBottom:'16px' }}>
            <label style={S.label}>Yazı Karakteri</label>
            <select
              value={settings.label_font_family || "'Inter','Arial',sans-serif"}
              onChange={e => setSettings(s => ({...s, label_font_family:e.target.value}))}
              style={{ ...S.input, cursor:'pointer' }}>
              {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <p style={S.muted}>Yeni metin kutularının varsayılan yazı tipi</p>
          </div>

          {/* Font Size */}
          <div style={{ marginBottom:'16px' }}>
            <label style={S.label}>Varsayılan Yazı Boyutu (pt)</label>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <input type="range" min={5} max={20} step={0.5}
                value={settings.label_default_font_size || 8}
                onChange={e => setSettings(s => ({...s, label_default_font_size:parseFloat(e.target.value)}))}
                style={{ flex:1, accentColor:PRIMARY }} />
              <input type="number" min={5} max={20} step={0.5}
                value={settings.label_default_font_size || 8}
                onChange={e => setSettings(s => ({...s, label_default_font_size:parseFloat(e.target.value)||8}))}
                style={{ ...S.inputNumber, width:'60px', textAlign:'center' }} />
            </div>
          </div>

          {/* Font Preview */}
          <div style={{ borderTop:`1px solid ${BORDER}`, paddingTop:'14px' }}>
            <p style={{ fontSize:'11px', fontWeight:600, color:MUTED, marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Önizleme</p>
            <div style={{ padding:'14px 16px', backgroundColor:'#F8FAFC', border:`1px solid ${BORDER}`, borderRadius:'10px', display:'flex', flexDirection:'column', gap:'6px' }}>
              {[
                { text:'DIN965-M4X35', size:(settings.label_default_font_size||8)*1.6, weight:'800', label:'Ürün Kodu' },
                { text:'4×35mm  |  A2', size:(settings.label_default_font_size||8)*1.2, weight:'600', label:'Ölçü & Kalite' },
                { text:'Çukur başlı metrik vida galvaniz kaplama', size:(settings.label_default_font_size||8)*0.9, weight:'400', label:'Açıklama' },
              ].map(({ text, size, weight, label }) => (
                <div key={label}>
                  <div style={{ fontSize:'9px', color:'#94A3B8', marginBottom:'2px' }}>{label}</div>
                  <div style={{ fontFamily:settings.label_font_family||"'Inter',sans-serif", fontSize:`${size}px`, fontWeight:weight, color:'#0F172A', lineHeight:1.3, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                    {text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* ── Zarf Yazdırma Ayarları (accordion) ── */}
      <div style={{ ...S.card, marginTop:'20px' }}>
        <button onClick={() => setZarfOpen(o => !o)}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', background:'none', border:'none', cursor:'pointer', padding:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'36px', height:'36px', borderRadius:'10px', backgroundColor:'#FEF3C7', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Mail size={18} color="#D97706" />
            </div>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontSize:'15px', fontWeight:700, color:'#0F172A', fontFamily:"'Space Grotesk','Inter',sans-serif" }}>Zarf Yazdırma Ayarları</div>
              <div style={{ fontSize:'12px', color:MUTED }}>Gönderen adresi ve zarf üzerinde eleman konumları</div>
            </div>
          </div>
          {zarfOpen ? <ChevronUp size={18} color={MUTED} /> : <ChevronDown size={18} color={MUTED} />}
        </button>

        {zarfOpen && (() => {
          const envSizeObj = ENVELOPE_SIZES.find(s => s.key === settings.envelope_size) || ENVELOPE_SIZES[0];
          const envW = envSizeObj.w, envH = envSizeObj.h;
          const PX_PER_MM = 3.7795;
          const MOCKUP_W = 370;
          const mockupScale = MOCKUP_W / (envW * PX_PER_MM);
          const mockupW = Math.round(envW * PX_PER_MM * mockupScale);
          const mockupH = Math.round(envH * PX_PER_MM * mockupScale);
          const hasWin = settings.envelope_has_window;
          const mwx = Math.round((settings.envelope_window_x ?? 22) * PX_PER_MM * mockupScale);
          const mwy = Math.round((settings.envelope_window_y ?? 48) * PX_PER_MM * mockupScale);
          const mww = Math.round((settings.envelope_window_w ?? 90) * PX_PER_MM * mockupScale);
          const mwh = Math.round((settings.envelope_window_h ?? 45) * PX_PER_MM * mockupScale);
          return (
          <div style={{ borderTop:`1px solid ${BORDER}`, marginTop:'16px', paddingTop:'16px' }}>

            {/* ── Üst satır: Sol form + Sağ mockup ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px', marginBottom:'20px' }}>

              {/* Sol: Boyut/Tip seçimi + Gönderen + Font ayarları */}
              <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

                {/* Zarf Boyutu Seçici */}
                <div>
                  <label style={S.label}>Zarf Boyutu</label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'6px' }}>
                    {ENVELOPE_SIZES.map(sz => (
                      <button key={sz.key} onClick={() => {
                        const newStamp = sz.stampDef;
                        setSettings(s => ({ ...s, envelope_size:sz.key,
                          envelope_stamp_x:newStamp.x, envelope_stamp_y:newStamp.y,
                          envelope_stamp_w:newStamp.w, envelope_stamp_h:newStamp.h,
                          envelope_window_x:sz.windowDef.x, envelope_window_y:sz.windowDef.y,
                          envelope_window_w:sz.windowDef.w, envelope_window_h:sz.windowDef.h,
                        }));
                      }} style={{ padding:'8px 4px', border:`2px solid ${settings.envelope_size===sz.key?PRIMARY:BORDER}`, borderRadius:'8px', backgroundColor:settings.envelope_size===sz.key?'#EFF6FF':'#fff', cursor:'pointer', textAlign:'center' }}>
                        <div style={{ fontSize:'13px', fontWeight:700, color:settings.envelope_size===sz.key?PRIMARY:'#374151' }}>{sz.label}</div>
                        <div style={{ fontSize:'9px', color:MUTED, marginTop:'2px' }}>{sz.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pencereli / Penceresiz */}
                <div>
                  <label style={S.label}>Zarf Tipi</label>
                  <div style={{ display:'flex', gap:'10px' }}>
                    {[{val:false, label:'Penceresiz', icon:'✉️', desc:'Standart kapalı zarf'},{val:true, label:'Pencereli', icon:'🪟', desc:'Şeffaf pencereli'}].map(opt => (
                      <button key={String(opt.val)} onClick={() => setSettings(s => ({...s, envelope_has_window:opt.val}))}
                        style={{ flex:1, padding:'10px 8px', border:`2px solid ${settings.envelope_has_window===opt.val?PRIMARY:BORDER}`, borderRadius:'10px', backgroundColor:settings.envelope_has_window===opt.val?'#EFF6FF':'#fff', cursor:'pointer', textAlign:'center' }}>
                        <div style={{ fontSize:'18px', marginBottom:'3px' }}>{opt.icon}</div>
                        <div style={{ fontSize:'12px', fontWeight:700, color:settings.envelope_has_window===opt.val?PRIMARY:'#374151' }}>{opt.label}</div>
                        <div style={{ fontSize:'10px', color:MUTED, marginTop:'2px' }}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                  {hasWin && (
                    <div style={{ marginTop:'10px', padding:'10px 12px', backgroundColor:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:'8px', fontSize:'12px', color:'#1E40AF' }}>
                      <strong>Pencereli zarf:</strong> Alıcı adresinizi pencerenin arkasına denk gelecek şekilde konumlandırın. Pencere konumunu aşağıdaki editörden ayarlayın.
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ ...S.label, display:'flex', alignItems:'center', gap:'6px' }}>
                    ✉️ Gönderen Adresi
                  </label>
                  <textarea
                    value={settings.sender_address || ''}
                    onChange={e => setSettings(s => ({...s, sender_address:e.target.value}))}
                    placeholder={"Firma Adı\nAdres Satırı 1\nAdres Satırı 2\nŞehir, Posta Kodu\nTel: 0212 ..."}
                    rows={5}
                    style={{ ...S.input, resize:'vertical', minHeight:'90px', lineHeight:1.5 }}
                  />
                  <p style={S.muted}>Zarfın sol üst köşesinde gönderen olarak görünür</p>
                </div>

                {/* Yazı Tipi Ayarları */}
                <div style={{ padding:'14px 16px', backgroundColor:'#F8FAFC', border:`1px solid ${BORDER}`, borderRadius:'10px' }}>
                  <div style={{ fontSize:'12px', fontWeight:700, color:'#374151', marginBottom:'12px', display:'flex', alignItems:'center', gap:'6px' }}>
                    <Type size={13} color={PRIMARY} /> Zarf Yazı Tipi Ayarları
                  </div>

                  <div style={{ marginBottom:'12px' }}>
                    <label style={{ display:'block', fontSize:'11px', color:MUTED, fontWeight:600, marginBottom:'4px' }}>Yazı Karakteri</label>
                    <select
                      value={settings.envelope_font_family || "'Inter','Arial',sans-serif"}
                      onChange={e => setSettings(s => ({...s, envelope_font_family:e.target.value}))}
                      style={{ ...S.input, padding:'6px 10px', fontSize:'13px', cursor:'pointer' }}>
                      {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
                    {[
                      { label:'Gönderen (pt)', key:'envelope_sender_font_size', min:4, max:12, def:6.5 },
                      { label:'Alıcı Adı (pt)', key:'envelope_recipient_name_size', min:7, max:18, def:11 },
                      { label:'Alıcı Adres (pt)', key:'envelope_recipient_addr_size', min:5, max:14, def:8.5 },
                    ].map(({ label, key, min, max, def }) => (
                      <div key={key}>
                        <label style={{ display:'block', fontSize:'10px', color:MUTED, marginBottom:'4px' }}>{label}</label>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                          <input type="range" min={min} max={max} step={0.5}
                            value={settings[key] || def}
                            onChange={e => setSettings(s => ({...s, [key]:parseFloat(e.target.value)}))}
                            style={{ flex:1, accentColor:PRIMARY }} />
                          <span style={{ fontSize:'12px', fontWeight:700, color:'#0F172A', fontFamily:"'IBM Plex Mono',monospace", minWidth:'26px', textAlign:'right' }}>
                            {settings[key] || def}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ padding:'10px 12px', backgroundColor:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:'8px', fontSize:'12px', color:'#92400E' }}>
                  <div style={{ fontWeight:600, marginBottom:'3px' }}>Zarf Boyutu: {envW} × {envH} mm</div>
                  <div>Logo, Gönderen ve Pul Alanını aşağıdaki editörden sürükleyerek konumlandırın.</div>
                </div>
              </div>

            </div>

            {/* ── Orta: Canlı Önizleme (tam genişlik, ortalı) ── */}
            <div style={{ borderTop:`1px solid ${BORDER}`, paddingTop:'20px', marginBottom:'20px', display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' }}>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#374151', display:'flex', alignItems:'center', gap:'6px' }}>
                <span style={{ fontSize:'14px' }}>👁</span> Canlı Önizleme
                <span style={{ fontSize:'10px', fontWeight:400, color:MUTED, marginLeft:'4px' }}>ayarlar değiştikçe anlık güncellenir</span>
              </div>

              {/* Masa yüzeyi */}
              <div style={{ background:'linear-gradient(135deg,#c8a96e 0%,#d4b483 30%,#c09a5e 60%,#b8904f 100%)', borderRadius:'16px', padding:'28px 32px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:'14px', width:'100%', boxSizing:'border-box' }}>
                <div style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.8)', letterSpacing:'0.04em' }}>
                  {envSizeObj.label} · {envSizeObj.desc} · {hasWin ? '🪟 Pencereli' : '✉️ Penceresiz'}
                </div>
                {/* Zarf mockup wrapper */}
                <div style={{ position:'relative', width:`${mockupW}px`, height:`${mockupH}px`, transform:'rotate(-1.5deg)', transformOrigin:'center center', filter:'drop-shadow(0 12px 32px rgba(0,0,0,0.35)) drop-shadow(0 3px 8px rgba(0,0,0,0.2))' }}>
                  <div style={{ position:'absolute', top:0, left:0, width:`${mockupW}px`, height:`${mockupH}px`, borderRadius:'3px', backgroundColor:'#C9CED6', transform:'translateY(4px) translateX(2px)', zIndex:0 }} />
                  <div style={{ position:'absolute', top:0, left:0, width:`${mockupW}px`, zIndex:3, pointerEvents:'none', overflow:'hidden', height:`${Math.round(mockupH*0.5)}px`, borderRadius:'3px 3px 0 0' }}>
                    <svg width={mockupW} height={Math.round(mockupH*0.5)} style={{ position:'absolute', top:0, left:0 }}>
                      <path d={`M 0,0 L ${mockupW/2},${Math.round(mockupH*0.45)} L ${mockupW},0 Z`} fill="rgba(0,0,0,0.04)" />
                      <line x1="0" y1="0" x2={mockupW/2} y2={Math.round(mockupH*0.45)} stroke="rgba(0,0,0,0.08)" strokeWidth="1"/>
                      <line x1={mockupW} y1="0" x2={mockupW/2} y2={Math.round(mockupH*0.45)} stroke="rgba(0,0,0,0.08)" strokeWidth="1"/>
                    </svg>
                  </div>
                  <div style={{ width:`${mockupW}px`, height:`${mockupH}px`, position:'relative', zIndex:2, overflow:'hidden', borderRadius:'3px', backgroundColor:'#fff' }}>
                    <div style={{ transform:`scale(${mockupScale})`, transformOrigin:'top left', lineHeight:1 }}>
                      <EnvelopeLabelCard address={DEMO_ADDR} settings={{...settings, envelope_w:envW, envelope_h:envH}} />
                    </div>
                    {hasWin && (
                      <div style={{ position:'absolute', left:`${mwx}px`, top:`${mwy}px`, width:`${mww}px`, height:`${mwh}px`, backgroundColor:'rgba(186,230,253,0.5)', border:'1.5px solid rgba(59,130,246,0.6)', borderRadius:'2px', zIndex:10, boxSizing:'border-box', backdropFilter:'blur(1px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <span style={{ fontSize:'9px', color:'#1D4ED8', fontWeight:600, textShadow:'0 1px 2px rgba(255,255,255,0.8)' }}>🪟 PENCERE</span>
                      </div>
                    )}
                  </div>
                  <div style={{ position:'absolute', top:0, left:0, width:`${mockupW}px`, height:`${mockupH}px`, zIndex:4, border:'1px solid rgba(0,0,0,0.15)', borderRadius:'3px', pointerEvents:'none', boxSizing:'border-box' }} />
                </div>
                <p style={{ fontSize:'10px', color:'rgba(255,255,255,0.75)', textAlign:'center', margin:0 }}>
                  {envSizeObj.label} · {envSizeObj.desc}
                </p>
              </div>

              {/* Boyut chip'leri */}
              <div style={{ display:'flex', justifyContent:'center', gap:'6px', flexWrap:'wrap' }}>
                {[
                  { label:'Zarf', val:`${envW}×${envH} mm` },
                  { label:'Alıcı kutu', val:`${settings.envelope_recipient_w||172}×${settings.envelope_recipient_h||65} mm` },
                  hasWin && { label:'Pencere', val:`${settings.envelope_window_w||90}×${settings.envelope_window_h||45} mm` },
                ].filter(Boolean).map(({ label, val }) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:'4px', padding:'3px 8px', borderRadius:'6px', backgroundColor:'#fff', border:`1px solid ${BORDER}` }}>
                    <span style={{ fontSize:'10px', color:MUTED }}>{label}:</span>
                    <span style={{ fontSize:'11px', fontWeight:700, color:'#0F172A', fontFamily:"'IBM Plex Mono',monospace" }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Alt: Konum Picker (tam genişlik) ── */}
            <div style={{ borderTop:`1px solid ${BORDER}`, paddingTop:'16px' }}>
              <label style={{ ...S.label, display:'flex', alignItems:'center', gap:'6px', marginBottom:'14px' }}>
                📍 Zarf Üzerinde Eleman Konumları
                <span style={{ fontSize:'11px', fontWeight:400, color:MUTED }}>— sürükleyerek konumlandırın</span>
              </label>
              <EnvelopePositionPicker settings={settings} setSettings={setSettings} envW={envW} envH={envH} />
            </div>
          </div>
          );
        })()}
      </div>

      {/* Save Button */}
      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'20px', gap:'10px' }}>
        <button onClick={handleSave} disabled={saving} style={{ ...S.btnPrimary, opacity:saving?0.7:1, cursor:saving?'not-allowed':'pointer' }}>
          {saving ? <><div style={{ width:'14px', height:'14px', border:'2px solid #fff', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />Kaydediliyor...</> : <><Save size={16} />Kaydet</>}
        </button>
      </div>

      {/* ── Etiket Boyut Profilleri ── */}
      <div style={{ ...S.card, marginTop:'28px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
          <div>
            <h2 style={{ ...S.heading2, margin:0 }}>Etiket Boyut Profilleri</h2>
            <p style={{ ...S.muted, marginTop:'3px' }}>Farklı TANEX etiket boyutları. Etiket Hazırlama ekranında seçebilirsiniz.</p>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={handleResetPresets} disabled={fmtResetting}
              title="Silinen veya eksik TANEX şablonlarını geri yükle"
              style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'8px 14px', fontSize:'13px', fontWeight:600, backgroundColor:'#fff', color:'#374151', border:`1px solid ${BORDER}`, borderRadius:'8px', cursor:fmtResetting?'not-allowed':'pointer', opacity:fmtResetting?0.7:1 }}>
              {fmtResetting ? <div style={{ width:'13px', height:'13px', border:'2px solid #94A3B8', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} /> : <RotateCcw size={14} />}
              Varsayılana Dön
            </button>
            <button onClick={openAddFmt} style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'8px 14px', fontSize:'13px', fontWeight:600, backgroundColor:PRIMARY, color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer' }}>
              <Plus size={14} /> Yeni Format
            </button>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {formats.map(f => {
            const fit = calcFit(f);
            return (
              <div key={f.id} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'12px 16px', borderRadius:'10px', border:`1px solid ${BORDER}`, backgroundColor:'#F8FAFC' }}>
                <div style={{ width:'52px', height:'28px', border:'1.5px solid #93C5FD', borderRadius:'4px', backgroundColor:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:'8px', fontWeight:700, color:'#1D4ED8', fontFamily:"'IBM Plex Mono',monospace" }}>{f.label_width}×{f.label_height}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:'13px', color:'#0F172A', fontFamily:"'Space Grotesk','Inter',sans-serif" }}>{f.name}</div>
                  <div style={{ fontSize:'11px', color:MUTED, marginTop:'1px' }}>
                    {f.cols} süt × {f.rows} sat &bull; {f.cols*f.rows} etiket/sayfa &bull; boşluk: {f.gap_col}/{f.gap_row}mm
                  </div>
                  <div style={{ fontSize:'10px', marginTop:'2px' }}>
                    <span style={{ color:fit.ok?'#15803D':'#DC2626', fontWeight:600 }}>
                      {fit.ok ? "✓ A4'e uygun" : `⚠ G:${fit.usedW}mm · Y:${fit.usedH}mm`}
                    </span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
                  <button onClick={() => navigate(`/label-designer/${f.id}`)}
                    style={{ padding:'6px 12px', fontSize:'12px', fontWeight:600, border:'none', borderRadius:'7px', backgroundColor:PRIMARY, cursor:'pointer', color:'#fff', display:'inline-flex', alignItems:'center', gap:'4px' }}>
                    <Paintbrush size={12} /> Tasarım
                  </button>
                  <button onClick={() => openEditFmt(f)}
                    style={{ padding:'6px 10px', fontSize:'12px', fontWeight:500, border:`1px solid ${BORDER}`, borderRadius:'7px', backgroundColor:'#fff', cursor:'pointer', color:'#374151', display:'inline-flex', alignItems:'center', gap:'4px' }}>
                    <Edit2 size={12} />
                  </button>
                  {formats.length > 1 && (
                    <button onClick={() => handleDeleteFmt(f)} disabled={fmtDeleting===f.id}
                      style={{ padding:'6px', border:`1px solid ${BORDER}`, borderRadius:'7px', backgroundColor:'#fff', cursor:'pointer', color:fmtDeleting===f.id?'#94A3B8':'#DC2626', display:'flex', alignItems:'center' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop:'12px', padding:'10px 14px', backgroundColor:'#EFF6FF', borderRadius:'8px', border:'1px solid #BFDBFE', fontSize:'12px', color:'#1D4ED8' }}>
          <Ruler size={13} style={{ display:'inline', marginRight:'6px', verticalAlign:'middle' }} />
          <strong>İpucu:</strong> A4 = 210mm × 297mm. Sol + Sütunlar + Sağ = 210mm · Üst + Satırlar + Alt = 297mm olmalı.
        </div>
      </div>

      {/* Format Modal — Özel Etiket Tasarım */}
      {fmtModalOpen && (() => {
        const mCols = Math.min(fmtForm.cols || 3, 4);
        const mRows = Math.min(fmtForm.rows || 8, 3);
        const mW    = fmtForm.label_width  || 64;
        const mH    = fmtForm.label_height || 34;
        const mFit  = calcFit(fmtForm);
        const MSCALE = 0.68, PX = 3.7795;
        const mt = fmtForm.margin_top || 0, ml = fmtForm.margin_left || 0;
        const gc = fmtForm.gap_col || 0, gr = fmtForm.gap_row || 0;
        const pW = (ml + mCols*mW + (mCols-1)*gc) * PX;
        const pH = (mt + mRows*mH + (mRows-1)*gr) * PX;
        return (
          <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
            <div onClick={() => setFmtModalOpen(false)} style={{ position:'absolute', inset:0, backgroundColor:'rgba(0,0,0,0.55)' }} />
            <div style={{ position:'relative', backgroundColor:'#fff', borderRadius:'16px', width:'min(96vw, 980px)', maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 80px rgba(0,0,0,0.25)', zIndex:1 }}>

              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 28px', borderBottom:`1px solid ${BORDER}`, flexShrink:0 }}>
                <div>
                  <h2 style={{ fontSize:'20px', fontWeight:700, color:'#0F172A', margin:0, fontFamily:"'Space Grotesk','Inter',sans-serif" }}>
                    {editFmt ? 'Etiket Formatı Düzenle' : 'Özel Etiket Tasarım'}
                  </h2>
                  <p style={{ margin:'3px 0 0', fontSize:'13px', color:MUTED }}>
                    {editFmt ? `"${editFmt.name}" formatının boyut ve düzen ayarları` : 'Yeni bir etiket boyutu ve sayfa düzeni tanımlayın'}
                  </p>
                </div>
                <button onClick={() => setFmtModalOpen(false)} style={{ padding:'8px', borderRadius:'8px', background:'none', border:`1px solid ${BORDER}`, cursor:'pointer', color:MUTED, display:'flex', lineHeight:1 }}><X size={18} /></button>
              </div>

              {/* Body */}
              <div style={{ display:'flex', flex:1, overflow:'hidden', minHeight:0 }}>

                {/* Sol: Form */}
                <div style={{ width:'400px', flexShrink:0, overflowY:'auto', padding:'22px 28px', borderRight:`1px solid ${BORDER}` }}>
                  <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

                    <div>
                      <label style={S.label}>Format Adı *</label>
                      <input value={fmtForm.name} onChange={e => setFmtForm(f => ({...f, name:e.target.value}))} placeholder="örn: TANEX TW-2037" style={S.input} />
                    </div>

                    <div>
                      <label style={{ ...S.label, marginBottom:'8px' }}>Etiket Boyutu</label>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                        <div>
                          <label style={{ ...S.label, fontSize:'11px', color:MUTED, fontWeight:500, marginBottom:'4px' }}>Genişlik (mm)</label>
                          <input type="number" min="10" max="210" step="0.5" value={fmtForm.label_width} onChange={e => setFmtForm(f => ({...f, label_width:parseFloat(e.target.value)||64}))} style={S.inputNumber} />
                        </div>
                        <div>
                          <label style={{ ...S.label, fontSize:'11px', color:MUTED, fontWeight:500, marginBottom:'4px' }}>Yükseklik (mm)</label>
                          <input type="number" min="8" max="297" step="0.5" value={fmtForm.label_height} onChange={e => setFmtForm(f => ({...f, label_height:parseFloat(e.target.value)||34}))} style={S.inputNumber} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label style={{ ...S.label, marginBottom:'8px' }}>Sayfa Düzeni</label>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                        <div>
                          <label style={{ ...S.label, fontSize:'11px', color:MUTED, fontWeight:500, marginBottom:'4px' }}>Sütun Sayısı</label>
                          <input type="number" min="1" max="10" value={fmtForm.cols} onChange={e => setFmtForm(f => ({...f, cols:parseInt(e.target.value)||3}))} style={S.inputNumber} />
                        </div>
                        <div>
                          <label style={{ ...S.label, fontSize:'11px', color:MUTED, fontWeight:500, marginBottom:'4px' }}>Satır Sayısı</label>
                          <input type="number" min="1" max="20" value={fmtForm.rows} onChange={e => setFmtForm(f => ({...f, rows:parseInt(e.target.value)||8}))} style={S.inputNumber} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label style={{ ...S.label, marginBottom:'8px' }}>Kenar Boşlukları (mm)</label>
                      <div style={{ display:'flex', justifyContent:'center', marginBottom:'6px' }}>
                        <div style={{ width:'130px', textAlign:'center' }}>
                          <label style={{ display:'block', fontSize:'11px', color:MUTED, marginBottom:'3px' }}>⬆ Üst</label>
                          <input type="number" min="0" max="30" step="0.5" value={fmtForm.margin_top} onChange={e => setFmtForm(f => ({...f, margin_top:parseFloat(e.target.value)||0}))} style={{ ...S.inputNumber, textAlign:'center' }} />
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'6px' }}>
                        <div style={{ textAlign:'center' }}>
                          <label style={{ display:'block', fontSize:'11px', color:MUTED, marginBottom:'3px' }}>⬅ Sol</label>
                          <input type="number" min="0" max="30" step="0.5" value={fmtForm.margin_left} onChange={e => setFmtForm(f => ({...f, margin_left:parseFloat(e.target.value)||0}))} style={{ ...S.inputNumber, textAlign:'center' }} />
                        </div>
                        <div style={{ textAlign:'center' }}>
                          <label style={{ display:'block', fontSize:'11px', color:MUTED, marginBottom:'3px' }}>Sağ ➡</label>
                          <input type="number" min="0" max="30" step="0.5" value={fmtForm.margin_right} onChange={e => setFmtForm(f => ({...f, margin_right:parseFloat(e.target.value)||0}))} style={{ ...S.inputNumber, textAlign:'center' }} />
                        </div>
                      </div>
                      <div style={{ display:'flex', justifyContent:'center' }}>
                        <div style={{ width:'130px', textAlign:'center' }}>
                          <label style={{ display:'block', fontSize:'11px', color:MUTED, marginBottom:'3px' }}>⬇ Alt</label>
                          <input type="number" min="0" max="30" step="0.5" value={fmtForm.margin_bottom} onChange={e => setFmtForm(f => ({...f, margin_bottom:parseFloat(e.target.value)||0}))} style={{ ...S.inputNumber, textAlign:'center' }} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label style={{ ...S.label, marginBottom:'8px' }}>Etiketler Arası Boşluk & Köşe</label>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
                        <div style={{ textAlign:'center' }}>
                          <label style={{ display:'block', fontSize:'11px', color:MUTED, marginBottom:'3px' }}>↔ Yatay (mm)</label>
                          <input type="number" min="0" max="10" step="0.5" value={fmtForm.gap_col} onChange={e => setFmtForm(f => ({...f, gap_col:parseFloat(e.target.value)||0}))} style={{ ...S.inputNumber, textAlign:'center' }} />
                        </div>
                        <div style={{ textAlign:'center' }}>
                          <label style={{ display:'block', fontSize:'11px', color:MUTED, marginBottom:'3px' }}>↕ Dikey (mm)</label>
                          <input type="number" min="0" max="10" step="0.5" value={fmtForm.gap_row} onChange={e => setFmtForm(f => ({...f, gap_row:parseFloat(e.target.value)||0}))} style={{ ...S.inputNumber, textAlign:'center' }} />
                        </div>
                        <div style={{ textAlign:'center' }}>
                          <label style={{ display:'block', fontSize:'11px', color:MUTED, marginBottom:'3px' }}>Köşe (mm)</label>
                          <input type="number" min="0" max="10" step="0.5" value={fmtForm.border_radius} onChange={e => setFmtForm(f => ({...f, border_radius:parseFloat(e.target.value)||0}))} style={{ ...S.inputNumber, textAlign:'center' }} />
                        </div>
                      </div>
                    </div>

                    <button onClick={() => setFmtForm(f => ({...f, margin_top:5.5, margin_bottom:5.5, margin_left:7.0, margin_right:7.0, gap_col:2.0, gap_row:2.0}))}
                      style={{ width:'100%', padding:'8px', fontSize:'12px', fontWeight:500, border:`1px solid ${BORDER}`, borderRadius:'8px', backgroundColor:'#F8FAFC', cursor:'pointer', color:'#64748B' }}>
                      ↺ TW-2024 Standart Değerlere Sıfırla
                    </button>

                    <div style={{ padding:'10px 14px', borderRadius:'8px', backgroundColor:mFit.ok?'#F0FDF4':'#FEF9C3', border:`1px solid ${mFit.ok?'#BBF7D0':'#FDE68A'}`, fontSize:'12px', color:mFit.ok?'#15803D':'#92400E' }}>
                      {mFit.ok ? "✓ A4'e uygun!" : `⚠ Genişlik ${mFit.usedW}mm · Yükseklik ${mFit.usedH}mm (210×297 olmalı)`}
                      <div style={{ marginTop:'3px', fontSize:'11px', opacity:0.8 }}>{fmtForm.cols*fmtForm.rows} etiket/sayfa · {mW}×{mH}mm</div>
                    </div>

                    <div style={S.infoBox}>
                      <Info size={13} style={{ flexShrink:0, marginTop:'1px' }} />
                      <div>A4 = 210×297mm &nbsp;|&nbsp; Sol+Sütunlar+Sağ = 210mm &nbsp;|&nbsp; Üst+Satırlar+Alt = 297mm</div>
                    </div>
                  </div>
                </div>

                {/* Sağ: Canlı Önizleme */}
                <div style={{ flex:1, overflowY:'auto', padding:'22px 28px', backgroundColor:'#F8FAFC', display:'flex', flexDirection:'column', gap:'16px' }}>
                  <div>
                    <h3 style={{ fontSize:'14px', fontWeight:700, color:'#374151', margin:'0 0 4px', fontFamily:"'Space Grotesk','Inter',sans-serif" }}>Canlı Önizleme</h3>
                    <p style={{ fontSize:'12px', color:MUTED, margin:0 }}>Değerler değiştikçe anlık güncellenir</p>
                  </div>

                  {/* Stat chips */}
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                    {[
                      { label:'Etiket', val:`${mW}×${mH}mm` },
                      { label:'Düzen', val:`${fmtForm.cols||0}×${fmtForm.rows||0}`, hi:true },
                      { label:'Toplam', val:`${(fmtForm.cols||0)*(fmtForm.rows||0)} adet` },
                      { label:'Sol/Sağ', val:`${ml.toFixed(1)}/${(fmtForm.margin_right||0).toFixed(1)}mm` },
                      { label:'Üst/Alt', val:`${mt.toFixed(1)}/${(fmtForm.margin_bottom||0).toFixed(1)}mm` },
                    ].map(({ label, val, hi }) => (
                      <div key={label} style={{ display:'flex', alignItems:'center', gap:'4px', padding:'4px 8px', borderRadius:'6px', backgroundColor:hi?'#EFF6FF':'#fff', border:`1px solid ${hi?'#BFDBFE':BORDER}` }}>
                        <span style={{ fontSize:'10px', color:MUTED }}>{label}:</span>
                        <span style={{ fontSize:'11px', fontWeight:700, color:hi?'#1D4ED8':'#0F172A', fontFamily:"'IBM Plex Mono',monospace" }}>{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Grid preview */}
                  <div style={{ backgroundColor:'#CBD5E1', borderRadius:'12px', padding:'16px', overflowX:'auto', flex:1, display:'flex', flexDirection:'column' }}>
                    <p style={{ fontSize:'10px', color:'#475569', marginBottom:'10px', textAlign:'center' }}>
                      {mCols}×{mRows} görünüm — gerçek ölçeklerde
                    </p>
                    <div style={{ display:'flex', justifyContent:'center', alignItems:'flex-start', flex:1 }}>
                      <div style={{ position:'relative', width:`${pW*MSCALE}px`, height:`${pH*MSCALE}px`, flexShrink:0 }}>
                        <div style={{ position:'absolute', top:0, left:0, transform:`scale(${MSCALE})`, transformOrigin:'top left', backgroundColor:'white', boxShadow:'0 4px 20px rgba(0,0,0,0.15)', borderRadius:'3px' }}>
                          <div style={{ paddingTop:`${mt}mm`, paddingLeft:`${ml}mm`, backgroundColor:'white' }}>
                            <div style={{ display:'grid', gridTemplateColumns:`repeat(${mCols}, ${mW}mm)`, gridAutoRows:`${mH}mm`, columnGap:`${gc}mm`, rowGap:`${gr}mm` }}>
                              {Array.from({ length:mCols*mRows }).map((_,i) => (
                                <LabelCard key={i} product={DEMO_PRODUCT} settings={settings} format={{ label_width:mW, label_height:mH, border_radius:fmtForm.border_radius||0 }} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize:'10px', color:'#64748B', marginTop:'10px', textAlign:'center' }}>
                      {mCols}×{mRows} önizleme ({(fmtForm.cols||0)*(fmtForm.rows||0)} etiket/sayfa gerçekte)
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ display:'flex', gap:'10px', padding:'16px 28px', borderTop:`1px solid ${BORDER}`, flexShrink:0, justifyContent:'flex-end', backgroundColor:'#fff', borderRadius:'0 0 16px 16px' }}>
                <button onClick={() => setFmtModalOpen(false)} style={{ padding:'10px 20px', fontSize:'13px', border:`1px solid ${BORDER}`, borderRadius:'8px', background:'#fff', cursor:'pointer', color:'#374151' }}>İptal</button>
                <button onClick={handleSaveFmt} disabled={fmtSaving}
                  style={{ padding:'10px 28px', fontSize:'14px', fontWeight:600, backgroundColor:fmtSaving?'#94A3B8':PRIMARY, color:'#fff', border:'none', borderRadius:'8px', cursor:fmtSaving?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:'8px' }}>
                  {fmtSaving ? <><div style={{ width:'13px', height:'13px', border:'2px solid #fff', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />Kaydediliyor...</> : (editFmt ? 'Güncelle' : 'Kaydet')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
