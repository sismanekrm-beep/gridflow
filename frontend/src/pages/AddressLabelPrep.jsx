import { useState, useEffect, useCallback, useRef } from 'react';
import React from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useReactToPrint } from 'react-to-print';
import { useLocation } from 'react-router-dom';
import { Search, Plus, Trash2, Printer, ZoomIn, ZoomOut, MapPin, Info, X, ChevronUp, ChevronDown } from 'lucide-react';
import AddressLabelCard from '../components/AddressLabelCard';
import EnvelopeLabelCard from '../components/EnvelopeLabelCard';
import { useAppSettings } from '../contexts/SettingsContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const MM_TO_PX = 3.7795;
const PRIMARY = '#0B4F8A';
const BORDER = '#E2E8F0';
const MUTED = '#64748B';

const isEnvelopeFormat = (fmt) => !!(fmt?.page_width && fmt?.page_height);

// ── Address/Envelope Sheet ────────────────────────────────────────────────────
function AddressLabelSheet({ items, settings, format }, ref) {
  const fmt = format || {};
  const isEnv = isEnvelopeFormat(fmt);
  const cols = fmt.cols || (isEnv ? 1 : 2);
  const rows = fmt.rows || (isEnv ? 1 : 7);
  const W  = fmt.label_width  || (isEnv ? 105 : 105);
  const H  = fmt.label_height || (isEnv ? 240 : 42);
  const mt = fmt.margin_top    ?? (isEnv ? 0 : 5);
  const mb = fmt.margin_bottom ?? (isEnv ? 0 : 5);
  const ml = fmt.margin_left   ?? 0;
  const mr = fmt.margin_right  ?? 0;
  const gc = fmt.gap_col ?? 0;
  const gr = fmt.gap_row ?? 0;
  const labelsPerPage = cols * rows;

  // Page dimensions (envelope uses its own size, otherwise A4)
  const pageW = fmt.page_width  || 210;
  const pageH = fmt.page_height || 297;

  const labels = (items || []).flatMap(({ address, qty }) =>
    Array(Math.max(1, parseInt(qty) || 1)).fill(address)
  );
  const pages = [];
  for (let i = 0; i < Math.max(1, labels.length); i += labelsPerPage) {
    const chunk = labels.slice(i, i + labelsPerPage);
    while (chunk.length < labelsPerPage) chunk.push(null);
    pages.push(chunk);
  }

  return (
    <div style={{ background: 'white' }}>
      {/* Dynamic @page size for printing */}
      <style>{`@page { size: ${pageW}mm ${pageH}mm portrait; margin: 0; }`}</style>
      {pages.map((pg, pi) => (
        <div key={pi} style={{ width: `${pageW}mm`, height: `${pageH}mm`, paddingTop: `${mt}mm`, paddingBottom: `${mb}mm`, paddingLeft: `${ml}mm`, paddingRight: `${mr}mm`, background: 'white', boxSizing: 'border-box', pageBreakAfter: pi < pages.length-1 ? 'always' : 'auto', breakAfter: pi < pages.length-1 ? 'page' : 'auto', overflow: 'hidden' }}>
          {isEnv ? (
            // Envelope: show each card rotated (landscape card → portrait page)
            <div style={{ display: 'flex', flexDirection: 'column', gap: `${gr}mm` }}>
              {pg.map((addr, li) => {
                if (!addr) return <div key={`${pi}-${li}`} style={{ width: `${W}mm`, height: `${H}mm` }} />;
                return (
                  // Rotate landscape (240×105) card to fill portrait (105×240) space
                  <div key={`${pi}-${li}`} style={{
                    width: '105mm',
                    height: '240mm',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      position: 'absolute',
                      width: '240mm',
                      height: '105mm',
                      top: 0,
                      left: '105mm',
                      transformOrigin: 'top left',
                      transform: 'rotate(90deg)',
                    }}>
                      <EnvelopeLabelCard address={addr} settings={settings} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${W}mm)`, gridAutoRows: `${H}mm`, columnGap: `${gc}mm`, rowGap: `${gr}mm` }}>
              {pg.map((addr, li) => addr
                ? <AddressLabelCard key={`${pi}-${li}`} address={addr} format={fmt} settings={settings} />
                : <div key={`${pi}-${li}`} style={{ width: `${W}mm`, height: `${H}mm` }} />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
const AddressLabelSheetRef = (props, ref) => <div ref={ref}><AddressLabelSheet {...props} /></div>;
AddressLabelSheetRef.displayName = 'AddressLabelSheet';
const ForwardedSheet = React.forwardRef(AddressLabelSheetRef);

export default function AddressLabelPrep() {
  const [items, setItems] = useState([]);
  const [codeInput, setCodeInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1.0);

  const printRef = useRef(null);
  const inputRef = useRef(null);
  const location = useLocation();
  const { settings, formats } = useAppSettings();

  // Default address format: 105x42mm, 2 cols x 7 rows
  const [selectedFormatId, setSelectedFormatId] = useState(() => {
    const saved = localStorage.getItem('addr_format_id');
    return saved || null;
  });
  const selectedFormat = formats.find(f => f.id === selectedFormatId) || {
    id: 'addr-default', name: 'Adres Etiketi (105×42mm)',
    label_width: 105, label_height: 42, cols: 2, rows: 7,
    margin_top: 5, margin_bottom: 5, margin_left: 0, margin_right: 0,
    gap_col: 0, gap_row: 0, border_radius: 3,
  };

  // Auto-adjust zoom when format changes (envelope needs smaller zoom)
  useEffect(() => {
    if (isEnvelopeFormat(selectedFormat)) {
      setZoom(0.55);
    } else {
      setZoom(1.0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFormatId]);

  // Page style: envelope = 105×240mm portrait, otherwise A4
  const pageW = selectedFormat?.page_width  || 210;
  const pageH = selectedFormat?.page_height || 297;
  const pageStyleStr = `@page { size: ${pageW}mm ${pageH}mm portrait; margin: 0; } body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }`;

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: isEnvelopeFormat(selectedFormat) ? 'Zarf Etiketi' : 'Adres Etiketleri',
    pageStyle: pageStyleStr,
    onAfterPrint: () => toast.success('Etiketler yazdırıldı!'),
  });

  const labelsPerPage = selectedFormat.cols * selectedFormat.rows;
  const totalLabels = items.reduce((s, i) => s + (parseInt(i.qty)||1), 0);
  const pageCount = Math.max(1, Math.ceil(totalLabels / labelsPerPage));
  const isEnv = isEnvelopeFormat(selectedFormat);
  const previewPageW = pageW * MM_TO_PX;
  const previewPageH = pageH * MM_TO_PX;

  // Pre-fill from navigation state
  useEffect(() => {
    const state = location.state;
    if (state?.labelItems?.length > 0) {
      setItems(state.labelItems);
    } else {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSuggestions = useCallback(async (q) => {
    if (!q || q.length < 1) { setSuggestions([]); setShowSugg(false); return; }
    try {
      const res = await axios.get(`${BACKEND_URL}/api/addresses?query=${encodeURIComponent(q)}&limit=7`);
      setSuggestions(res.data.addresses || []);
      setShowSugg(true);
    } catch { setSuggestions([]); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchSuggestions(codeInput), 200);
    return () => clearTimeout(t);
  }, [codeInput, fetchSuggestions]);

  const addAddress = useCallback(async (addr) => {
    setLoading(true);
    try {
      // If addr is just a name string, search for it; if it's an object, use directly
      let address = typeof addr === 'object' ? addr : null;
      if (!address) {
        const res = await axios.get(`${BACKEND_URL}/api/addresses?query=${encodeURIComponent(addr)}&limit=1`);
        address = res.data.addresses?.[0];
      }
      if (!address) { toast.error(`"${addr}" bulunamadı`); return; }
      setItems(prev => {
        const idx = prev.findIndex(i => i.address.id === address.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], qty: updated[idx].qty + 1 };
          toast.info(`${address.name} – adet: ${updated[idx].qty}`);
          return updated;
        }
        toast.success(`${address.name} eklendi`);
        return [...prev, { address, qty: 1 }];
      });
      setCodeInput('');
      setShowSugg(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch { toast.error('Adres yüklenemedi'); }
    finally { setLoading(false); }
  }, []);

  const updateQty = (idx, val) => setItems(prev => prev.map((item, i) => i === idx ? { ...item, qty: Math.max(1, parseInt(val)||1) } : item));
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const iconBtn = { width: '26px', height: '26px', border: `1px solid ${BORDER}`, borderRadius: '6px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED };

  return (
    <div data-testid="address-label-prep" style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

      {/* LEFT PANEL */}
      <div className="no-print" style={{ width: '320px', minWidth: '320px', display: 'flex', flexDirection: 'column', borderRight: `1px solid ${BORDER}`, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Space Grotesk','Inter',sans-serif" }}>Adres Etiketi</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
            <span style={{ fontSize: '11px', color: MUTED, whiteSpace: 'nowrap' }}>Format:</span>
            <select value={selectedFormatId||''} onChange={e => { setSelectedFormatId(e.target.value); localStorage.setItem('addr_format_id', e.target.value); }} style={{ flex: 1, padding: '5px 8px', fontSize: '12px', border: `1px solid ${BORDER}`, borderRadius: '6px', outline: 'none', color: '#0F172A', backgroundColor: '#fff' }}>
              <option value="">Adres Etiketi (105×42mm)</option>
              {formats.map(f => <option key={f.id} value={f.id}>{f.name} ({f.label_width}×{f.label_height}mm)</option>)}
            </select>
          </div>
          <p style={{ fontSize: '11px', color: MUTED, marginTop: '4px' }}>{selectedFormat.cols}×{selectedFormat.rows} = {labelsPerPage} etiket/sayfa</p>
        </div>

        {/* Search & Add */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 7px' }}>Adres Ekle</p>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: '7px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={13} color={MUTED} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input ref={inputRef} value={codeInput} onChange={e => setCodeInput(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter') addAddress(codeInput); else if (e.key==='Escape') setShowSugg(false); }}
                  onFocus={() => codeInput && setShowSugg(true)}
                  onBlur={() => setTimeout(() => setShowSugg(false), 200)}
                  placeholder="Ad veya şehir ara..." autoComplete="off"
                  style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '30px', paddingRight: '8px', paddingTop: '8px', paddingBottom: '8px', fontSize: '13px', border: `1px solid ${BORDER}`, borderRadius: '8px', outline: 'none', color: '#0F172A', backgroundColor: '#FFFFFF' }} />
              </div>
              <button onClick={() => addAddress(codeInput)} disabled={loading || !codeInput.trim()}
                style={{ width: '36px', height: '36px', flexShrink: 0, backgroundColor: codeInput.trim() && !loading ? PRIMARY : '#94A3B8', color: '#fff', border: 'none', borderRadius: '8px', cursor: codeInput.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {loading ? <div style={{ width: '14px', height: '14px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : <Plus size={15} />}
              </button>
            </div>
            {showSugg && suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: '4px', backgroundColor: '#fff', border: `1px solid ${BORDER}`, borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                {suggestions.map(a => (
                  <button key={a.id} onMouseDown={() => addAddress(a)}
                    style={{ width: '100%', padding: '9px 12px', textAlign: 'left', background: 'none', border: 'none', borderBottom: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '1px', fontFamily: "'Inter',sans-serif" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{a.name}</span>
                    {(a.address_line1 || a.city) && <span style={{ fontSize: '11px', color: MUTED }}>{[a.address_line1, a.city].filter(Boolean).join(', ')}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p style={{ fontSize: '11px', color: MUTED, marginTop: '5px' }}>Enter'a basın veya listeden seçin</p>
        </div>

        {/* Items list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {items.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '40px', textAlign: 'center' }}>
              <MapPin size={28} color='#CBD5E1' style={{ marginBottom: '8px' }} />
              <p style={{ fontSize: '13px', color: MUTED, margin: 0 }}>Henüz adres eklenmedi</p>
              <p style={{ fontSize: '11px', color: '#94A3B8', margin: '4px 0 0' }}>Yukarıdan adres arayın</p>
            </div>
          ) : (
            items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px', borderRadius: '10px', border: `1px solid ${BORDER}`, marginBottom: '6px', backgroundColor: '#FFFFFF' }}>
                <MapPin size={14} color={PRIMARY} style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>{item.address.name}</div>
                  {item.address.company && <div style={{ fontSize: '11px', color: MUTED }}>{item.address.company}</div>}
                  {item.address.city && <div style={{ fontSize: '11px', color: MUTED }}>{[item.address.district, item.address.city].filter(Boolean).join(', ')}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                  <button style={iconBtn} onClick={() => updateQty(idx, item.qty - 1)}><ChevronDown size={11} /></button>
                  <input type="number" min="1" value={item.qty} onChange={e => updateQty(idx, e.target.value)} style={{ width: '36px', textAlign: 'center', fontSize: '12px', fontFamily: "'IBM Plex Mono',monospace", border: `1px solid ${BORDER}`, borderRadius: '5px', padding: '2px 3px', outline: 'none', color: '#0F172A', backgroundColor: '#fff' }} />
                  <button style={iconBtn} onClick={() => updateQty(idx, item.qty + 1)}><ChevronUp size={11} /></button>
                </div>
                <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '3px', display: 'flex', alignItems: 'center' }}><X size={13} /></button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{ padding: '11px 16px', borderTop: `1px solid ${BORDER}`, backgroundColor: '#F8FAFC', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: MUTED }}><strong style={{ color: '#0F172A' }}>{totalLabels}</strong> etiket &bull; <strong style={{ color: '#0F172A' }}>{pageCount}</strong> sayfa</span>
              <button onClick={() => setItems([])} style={{ fontSize: '11px', color: MUTED, background: 'none', border: 'none', cursor: 'pointer' }}>Temizle</button>
            </div>
            <button onClick={handlePrint} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px', fontSize: '13px', fontWeight: 600, backgroundColor: PRIMARY, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              <Printer size={15} /> {totalLabels} Etiketi Yazdır
            </button>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Preview */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#E2E8F0' }}>
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 14px', borderBottom: `1px solid ${BORDER}`, backgroundColor: 'rgba(255,255,255,0.95)', flexShrink: 0 }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>Önizleme</span>
          <span style={{ fontSize: '12px', color: MUTED }}>{items.length > 0 ? `${pageCount} sayfa • ${totalLabels} etiket` : 'Boş'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: 'auto' }}>
            <button onClick={() => setZoom(z => +Math.max(0.25, z - 0.1).toFixed(2))} style={{ padding: '5px', border: `1px solid ${BORDER}`, borderRadius: '6px', background: '#fff', cursor: 'pointer', display: 'flex' }}><ZoomOut size={14} color={MUTED} /></button>
            <span style={{ fontSize: '12px', fontFamily: "'IBM Plex Mono',monospace", color: MUTED, minWidth: '44px', textAlign: 'center' }}>{Math.round(zoom*100)}%</span>
            <button onClick={() => setZoom(z => +Math.min(1.5, z + 0.1).toFixed(2))} style={{ padding: '5px', border: `1px solid ${BORDER}`, borderRadius: '6px', background: '#fff', cursor: 'pointer', display: 'flex' }}><ZoomIn size={14} color={MUTED} /></button>
          </div>
          <button onClick={handlePrint} disabled={items.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', fontSize: '13px', fontWeight: 600, backgroundColor: items.length > 0 ? PRIMARY : '#94A3B8', color: '#fff', border: 'none', borderRadius: '8px', cursor: items.length > 0 ? 'pointer' : 'not-allowed' }}>
            <Printer size={14} /> Yazdır
          </button>
        </div>
        {/* Warning */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 14px', backgroundColor: isEnv ? '#EFF6FF' : '#FFFBEB', borderBottom: `1px solid ${isEnv ? '#BFDBFE' : '#FDE68A'}`, fontSize: '12px', color: isEnv ? '#1D4ED8' : '#92400E', flexShrink: 0 }}>
          <Info size={12} style={{ flexShrink: 0 }} />
          {isEnv ? (
            <span>
              <strong>Zarf Etiketi:</strong> Zarfı yazıcıya <strong>DİK (portrait)</strong> koyun (kısa kenar = 10.5cm aşağıya bakacak şekilde).
              Tarayıcıda <strong>"Ölçek: 100%"</strong> ve <strong>"Sayfa boyutu: 105×240mm"</strong> seçin.
            </span>
          ) : (
            <span>Yazdırırken <strong>"Ölçek: 100%"</strong> veya <strong>"Gerçek boyut"</strong> seçin.</span>
          )}
        </div>
        {/* Preview area */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', padding: '20px' }}>
          <div style={{ position: 'relative', width: `${previewPageW * zoom}px`, height: `${previewPageH * zoom * pageCount}px`, flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, transform: `scale(${zoom})`, transformOrigin: 'top left', boxShadow: '0 6px 32px rgba(0,0,0,0.15)' }}>
              <ForwardedSheet ref={printRef} items={items} settings={settings} format={selectedFormat} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
