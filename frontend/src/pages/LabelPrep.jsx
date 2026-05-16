import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useReactToPrint } from 'react-to-print';
import { useLocation } from 'react-router-dom';
import {
  Search, Plus, Trash2, Printer, ZoomIn, ZoomOut,
  Tag, Info, X, ChevronUp, ChevronDown, Grid, RotateCcw, Crown
} from 'lucide-react';
import LabelSheet from '../components/LabelSheet';
import LabelPrinterSheet from '../components/LabelPrinterSheet';
import { useAppSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import PremiumModal from '../components/PremiumModal';
import GuestLimitModal from '../components/GuestLimitModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const imgUrl = (url) => !url ? null : url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
const MM_TO_PX = 3.7795;
const PRIMARY = '#0B4F8A';
const BORDER = '#E2E8F0';
const MUTED = '#64748B';

export default function LabelPrep() {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('label_prep_items') || '[]'); }
    catch { return []; }
  });
  const [codeInput, setCodeInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1.0);

  // Position mask: 24 booleans, true = available, false = already used
  const [positionMask, setPositionMask] = useState(Array(24).fill(true));
  const [showPositionGrid, setShowPositionGrid] = useState(false);

  const isDragging = useRef(false);
  const dragValue = useRef(true);
  const printRef = useRef(null);
  const labelPrintRef = useRef(null);
  const inputRef = useRef(null);
  const location = useLocation();
  const hasLocationState = useRef(false);
  const productRefreshDone = useRef(false);

  const { settings, formats, designs, resolveFormat, selectedFormat, selectedFormatId, setSelectedFormatId } = useAppSettings();

  const { isPremium, isAuthenticated, canGuestPrint, incrementGuestPrint, guestPrints, MAX_GUEST_PRINTS } = useAuth();
  const [showPremium, setShowPremium] = useState(false);
  const [showGuestLimit, setShowGuestLimit] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // ── Printer mode ──────────────────────────────────────────────────────
  const [printerMode, setPrinterMode] = useState(() => localStorage.getItem('printer_mode') || 'a4');
  const [labelFormats, setLabelFormats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('label_printer_formats') || '[]'); }
    catch { return []; }
  });
  const [selectedLabelFormatId, setSelectedLabelFormatId] = useState(() => localStorage.getItem('label_printer_format_id') || null);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [editingFormat, setEditingFormat] = useState(null);
  const [formatForm, setFormatForm] = useState({ name: '', width: '', height: '', designId: '' });

  // Unified print handler
  const onPrintClick = () => {
    if (!isAuthenticated && !canGuestPrint) {
      setShowGuestLimit(true);
      return;
    }
    if (!isAuthenticated) {
      incrementGuestPrint();
    } else if (!isPremium) {
      setShowPremium(true);
      return;
    }
    if (isLabelMode) handleLabelPrint();
    else handlePrint();
  };

  // ── Label printer format management ───────────────────────────────────
  const openAddFormat = () => {
    setEditingFormat(null);
    setFormatForm({ name: '', width: '', height: '', designId: '' });
    setShowFormatModal(true);
  };
  const openEditFormat = (fmt) => {
    if (!fmt) return;
    setEditingFormat(fmt);
    setFormatForm({ name: fmt.name, width: String(fmt.width), height: String(fmt.height), designId: fmt.designId || '' });
    setShowFormatModal(true);
  };
  const saveLabelFormat = () => {
    const name = formatForm.name.trim();
    const width = parseFloat(formatForm.width);
    const height = parseFloat(formatForm.height);
    if (!name || !width || !height || width <= 0 || height <= 0) return;
    if (editingFormat) {
      setLabelFormats(prev => prev.map(f => f.id === editingFormat.id ? { ...f, name, width, height, designId: formatForm.designId } : f));
    } else {
      const newFmt = { id: Date.now().toString(), name, width, height, designId: formatForm.designId };
      setLabelFormats(prev => [...prev, newFmt]);
      setSelectedLabelFormatId(newFmt.id);
    }
    setShowFormatModal(false);
    setEditingFormat(null);
    setFormatForm({ name: '', width: '', height: '', designId: '' });
  };
  const deleteLabelFormat = (id) => {
    setLabelFormats(prev => {
      const remaining = prev.filter(f => f.id !== id);
      if (selectedLabelFormatId === id) setSelectedLabelFormatId(remaining[0]?.id || null);
      return remaining;
    });
    setShowFormatModal(false);
    setEditingFormat(null);
  };

  // Fetch categories to keep color rules up-to-date in label elements
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/categories`).then(r => setCategories(r.data)).catch(() => {});
  }, []);

  // Map fieldId → current colorRules from category
  const fieldRulesMap = useMemo(() => {
    const map = {};
    categories.forEach(cat => {
      (cat.fields || []).forEach(field => {
        if (field.id) map[field.id] = field.colorRules || [];
      });
    });
    return map;
  }, [categories]);

  // Enrich elements with current category color rules (overwrites stale copies)
  const enrichElements = useCallback((elements) => {
    if (!elements?.length) return elements;
    return elements.map(el =>
      el.fieldId && fieldRulesMap[el.fieldId]?.length
        ? { ...el, colorRules: fieldRulesMap[el.fieldId] }
        : el
    );
  }, [fieldRulesMap]);

  // When format changes, reset position mask to new size
  const labelsPerPage = (selectedFormat?.cols || 3) * (selectedFormat?.rows || 8);
  useEffect(() => {
    setPositionMask(Array(labelsPerPage).fill(true));
  }, [labelsPerPage]);

  const isLabelMode = printerMode === 'label';
  const selectedLabelFormat = labelFormats.find(f => f.id === selectedLabelFormatId) || labelFormats[0] || null;

  // Build a unified list of available designs:
  // 1) catalog designs (db.designs)
  // 2) TANEX formats that have a design assigned (resolved elements)
  const safeFormats = Array.isArray(formats) ? formats : [];
  const safeDesigns = Array.isArray(designs) ? designs : [];
  const resolvedFormatsWithDesign = safeFormats
    .map(f => resolveFormat(f))
    .filter(f => f.elements?.length > 0)
    .map(f => ({ id: `fmt:${f.id}`, name: f._designName ? `${f._designName} (${f.name})` : f.name, elements: f.elements, background: f.background, border_radius: f.border_radius }));
  const allDesignOptions = [
    ...safeDesigns.map(d => ({ id: d.id, name: d.name, elements: d.elements, background: d.background, border_radius: d.border_radius })),
    ...resolvedFormatsWithDesign.filter(rf => !safeDesigns.some(d => `fmt:${rf.id}` === rf.id)),
  ];

  const labelDesign = allDesignOptions.find(d => d.id === selectedLabelFormat?.designId) || null;
  const mergedLabelFormat = selectedLabelFormat ? {
    width: selectedLabelFormat.width,
    height: selectedLabelFormat.height,
    border_radius: labelDesign?.border_radius || 2.0,
    background: labelDesign?.background || '#FFFFFF',
    elements: enrichElements(labelDesign?.elements || []),
  } : null;

  const enrichedSelectedFormat = useMemo(() => {
    if (!selectedFormat) return selectedFormat;
    return { ...selectedFormat, elements: enrichElements(selectedFormat.elements) };
  }, [selectedFormat, enrichElements]);

  useEffect(() => { localStorage.setItem('printer_mode', printerMode); }, [printerMode]);
  useEffect(() => { localStorage.setItem('label_printer_formats', JSON.stringify(labelFormats)); }, [labelFormats]);
  useEffect(() => { if (selectedLabelFormatId) localStorage.setItem('label_printer_format_id', selectedLabelFormatId); }, [selectedLabelFormatId]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${selectedFormat?.name || 'Etiketler'}`,
    pageStyle: `@page { size: A4 portrait; margin: 0; } body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }`,
    onAfterPrint: () => toast.success('Etiketler yazdırıldı!'),
  });

  const handleLabelPrint = useReactToPrint({
    contentRef: labelPrintRef,
    documentTitle: selectedLabelFormat?.name || 'Etiket Yazıcı',
    pageStyle: `@page { size: ${selectedLabelFormat?.width || 70}mm ${selectedLabelFormat?.height || 40}mm; margin: 0; } .lps-gap { display: none !important; } body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }`,
    onAfterPrint: () => toast.success('Etiketler yazdırıldı!'),
  });

  const totalLabels = items.reduce((sum, i) => sum + (parseInt(i.qty) || 1), 0);
  const availableOnPage1 = positionMask.filter(Boolean).length;
  const usedCells = labelsPerPage - availableOnPage1;

  const labelsOnPage1 = Math.min(totalLabels, availableOnPage1);
  const labelsOverflow = Math.max(0, totalLabels - availableOnPage1);
  const pageCount = totalLabels === 0 ? 1 : 1 + Math.ceil(labelsOverflow / labelsPerPage);

  const A4_W_PX = 210 * MM_TO_PX;
  const LBL_W_PX = (selectedLabelFormat?.width || 70) * MM_TO_PX;
  const LBL_H_PX = (selectedLabelFormat?.height || 40) * MM_TO_PX;
  const A4_H_PX = 297 * MM_TO_PX;

  // Persist items to localStorage on every change
  useEffect(() => {
    try { localStorage.setItem('label_prep_items', JSON.stringify(items)); }
    catch {}
  }, [items]);



  useEffect(() => {
    const state = location.state;
    if (state?.labelItems?.length > 0) {
      hasLocationState.current = true;
      setItems(state.labelItems);
    } else if (state?.codes?.length > 0) {
      hasLocationState.current = true;
      Promise.all(
        state.codes.map(code =>
          axios.get(`${BACKEND_URL}/api/products/code?code=${encodeURIComponent(code.trim().toUpperCase())}`)
            .then(r => r.data).catch(() => null)
        )
      ).then(products => {
        const valid = products.filter(Boolean).map(p => ({ product: p, qty: p.default_qty || 1 }));
        if (valid.length > 0) setItems(valid);
      });
    } else if (state?.code) {
      hasLocationState.current = true;
      addProductByCode(state.code);
    } else {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch product data from API once after auth to refresh stale localStorage cache.
  // Without this, standard_code (and other fields updated after first add) stay blank.
  useEffect(() => {
    if (!isAuthenticated || productRefreshDone.current || hasLocationState.current) return;
    productRefreshDone.current = true;
    let savedItems;
    try { savedItems = JSON.parse(localStorage.getItem('label_prep_items') || '[]'); }
    catch { return; }
    if (!savedItems.length) return;
    Promise.all(
      savedItems.map(item =>
        item.product?.code
          ? axios.get(`${BACKEND_URL}/api/products/code?code=${encodeURIComponent(item.product.code)}`)
              .then(r => ({ ...item, product: r.data }))
              .catch(() => item)
          : Promise.resolve(item)
      )
    ).then(refreshed => setItems(refreshed));
  }, [isAuthenticated]);

  const addProductByCode = useCallback(async (code) => {
    if (!code?.trim()) return;
    const trimmed = code.trim().toUpperCase();
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/products/code?code=${encodeURIComponent(trimmed)}`);
      const product = res.data;
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.product.code.toUpperCase() === product.code.toUpperCase());
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], qty: updated[idx].qty + 1 };
          toast.info(`${product.code} – adet: ${updated[idx].qty}`);
          return updated;
        }
        toast.success(`${product.code} eklendi`);
        return [...prev, { product, qty: product.default_qty || 1 }];
      });
      setCodeInput('');
      setShowSuggestions(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      toast.error(err.response?.data?.detail || `'${trimmed}' bulunamadı`);
      setTimeout(() => inputRef.current?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSuggestions = useCallback(async (q) => {
    if (!q || q.length < 1) { setSuggestions([]); setShowSuggestions(false); return; }
    try {
      const res = await axios.get(`${BACKEND_URL}/api/products?query=${encodeURIComponent(q)}&limit=12`);
      const upper = q.trim().toUpperCase();
      const scored = (res.data.products || []).map(p => {
        const c = p.code.toUpperCase();
        return { ...p, _s: c === upper ? 0 : c.startsWith(upper) ? 1 : 2 };
      });
      scored.sort((a, b) => a._s - b._s);
      setSuggestions(scored.slice(0, 7).map(({ _s, ...rest }) => rest));
      setShowSuggestions(true);
    } catch { setSuggestions([]); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchSuggestions(codeInput), 200);
    return () => clearTimeout(t);
  }, [codeInput, fetchSuggestions]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addProductByCode(codeInput);
    else if (e.key === 'Escape') setShowSuggestions(false);
  };

  const updateQty = (idx, val) => {
    const qty = Math.max(1, parseInt(val) || 1);
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, qty } : item));
  };
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const clearAllItems = () => { setItems([]); localStorage.removeItem('label_prep_items'); setShowClearConfirm(false); };

  // ── Position mask helpers ──────────────────────────────────────────
  const togglePosition = (idx, value) => {
    setPositionMask(prev => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const resetMask = () => setPositionMask(Array(labelsPerPage).fill(true));
  const selectNone = () => setPositionMask(Array(labelsPerPage).fill(false));

  const btnSm = {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '4px 10px', fontSize: '11px', fontWeight: 500,
    border: `1px solid ${BORDER}`, borderRadius: '6px',
    backgroundColor: '#fff', cursor: 'pointer', color: MUTED,
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <>
    <div
      data-testid="label-prep-page"
      style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}
      onMouseUp={() => { isDragging.current = false; }}
    >

      {/* ── LEFT PANEL ── */}
      <div
        className="no-print"
        style={{ width: '320px', minWidth: '320px', display: 'flex', flexDirection: 'column', borderRight: `1px solid ${BORDER}`, backgroundColor: '#FFFFFF', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Space Grotesk','Inter',sans-serif" }}>
              Etiket Hazırlama
            </h2>
            {/* Printer mode toggle */}
            <div style={{ display: 'flex', border: `1px solid ${BORDER}`, borderRadius: '7px', overflow: 'hidden', flexShrink: 0 }}>
              <button
                onClick={() => setPrinterMode('a4')}
                style={{ padding: '4px 9px', fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: "'Inter',sans-serif", backgroundColor: !isLabelMode ? PRIMARY : '#F8FAFC', color: !isLabelMode ? '#fff' : MUTED, transition: 'all 0.15s' }}
              >A4</button>
              <button
                onClick={() => setPrinterMode('label')}
                style={{ padding: '4px 9px', fontSize: '11px', fontWeight: 600, border: 'none', borderLeft: `1px solid ${BORDER}`, cursor: 'pointer', fontFamily: "'Inter',sans-serif", backgroundColor: isLabelMode ? PRIMARY : '#F8FAFC', color: isLabelMode ? '#fff' : MUTED, transition: 'all 0.15s' }}
              >Etiket Yazıcı</button>
            </div>
          </div>

          {/* Format selector — adapts to mode */}
          {!isLabelMode ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: MUTED, whiteSpace: 'nowrap' }}>Etiket Boyutu:</span>
                <select
                  value={selectedFormatId || ''}
                  onChange={e => setSelectedFormatId(e.target.value)}
                  style={{ flex: 1, padding: '5px 8px', fontSize: '12px', border: `1px solid ${BORDER}`, borderRadius: '6px', outline: 'none', color: '#0F172A', backgroundColor: '#fff', cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}
                >
                  {formats.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.label_width}×{f.label_height}mm, {f.cols}×{f.rows})
                    </option>
                  ))}
                </select>
              </div>
              <p style={{ fontSize: '11px', color: MUTED, marginTop: '4px' }}>
                {selectedFormat?.cols || 3}×{selectedFormat?.rows || 8} = {labelsPerPage} etiket/sayfa
              </p>
            </>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: MUTED, whiteSpace: 'nowrap' }}>Şablon:</span>
                {labelFormats.length > 0 ? (
                  <>
                    <select
                      value={selectedLabelFormat?.id || ''}
                      onChange={e => setSelectedLabelFormatId(e.target.value)}
                      style={{ flex: 1, padding: '5px 8px', fontSize: '12px', border: `1px solid ${BORDER}`, borderRadius: '6px', outline: 'none', color: '#0F172A', backgroundColor: '#fff', cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}
                    >
                      {labelFormats.map(f => (
                        <option key={f.id} value={f.id}>{f.name} ({f.width}×{f.height}mm)</option>
                      ))}
                    </select>
                    <button onClick={() => openEditFormat(selectedLabelFormat)} title="Düzenle" style={{ width: '28px', height: '28px', border: `1px solid ${BORDER}`, borderRadius: '6px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={openAddFormat} title="Yeni şablon" style={{ width: '28px', height: '28px', border: `1px solid ${BORDER}`, borderRadius: '6px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Plus size={13} color={MUTED} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={openAddFormat}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 12px', fontSize: '12px', backgroundColor: PRIMARY, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}
                  >
                    <Plus size={12} /> İlk Şablonu Ekle
                  </button>
                )}
              </div>
              {selectedLabelFormat && (
                <p style={{ fontSize: '11px', color: MUTED, marginTop: '4px' }}>
                  Tek etiket: <strong style={{ color: '#0F172A' }}>{selectedLabelFormat.width}×{selectedLabelFormat.height}mm</strong>
                  {labelDesign && <span> &bull; <span style={{ color: PRIMARY }}>{labelDesign.name}</span></span>}
                  {!labelDesign && <span style={{ color: '#94A3B8' }}> &bull; varsayılan tasarım</span>}
                </p>
              )}
              {!selectedLabelFormat && (
                <p style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>
                  Şablon ekleyin veya seçin
                </p>
              )}
            </div>
          )}
        </div>

        {/* Code input */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 7px' }}>
            Ürün Kodu Ekle
          </p>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: '7px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={13} color={MUTED} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  ref={inputRef}
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => codeInput && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Kod veya isim..."
                  autoComplete="off"
                  style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '30px', paddingRight: '8px', paddingTop: '8px', paddingBottom: '8px', fontSize: '13px', fontFamily: "'IBM Plex Mono', monospace", border: `1px solid ${BORDER}`, borderRadius: '8px', outline: 'none', color: '#0F172A', backgroundColor: '#FFFFFF' }}
                  data-testid="label-code-entry"
                />
              </div>
              <button
                onClick={() => addProductByCode(codeInput)}
                disabled={loading || !codeInput.trim()}
                style={{ width: '36px', height: '36px', flexShrink: 0, backgroundColor: codeInput.trim() && !loading ? PRIMARY : '#94A3B8', color: '#fff', border: 'none', borderRadius: '8px', cursor: codeInput.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                data-testid="label-prep-add-row-button"
              >
                {loading
                  ? <div style={{ width: '14px', height: '14px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : <Plus size={15} />
                }
              </button>
            </div>

            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: '4px', backgroundColor: '#fff', border: `1px solid ${BORDER}`, borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                {suggestions.map((s) => (
                  <button
                    key={s.id || s.code}
                    onMouseDown={() => addProductByCode(s.code)}
                    style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', borderBottom: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: "'Inter', sans-serif" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {s.image_url && <img src={imgUrl(s.image_url)} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain', borderRadius: '4px', flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', fontWeight: 700, color: PRIMARY }}>{s.code}</span>
                        {s.measurement && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: MUTED }}>({s.measurement})</span>}
                      </div>
                      <p style={{ fontSize: '11px', color: MUTED, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description || s.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p style={{ fontSize: '11px', color: MUTED, marginTop: '5px' }}>Enter'a basın veya listeden seçin</p>
        </div>

        {/* Items list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {items.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: MUTED }}><strong style={{ color: '#0F172A' }}>{items.length}</strong> ürün seçili</span>
              <button
                onClick={() => setShowClearConfirm(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#EF4444', background: 'none', border: '1px solid #FCA5A5', borderRadius: '6px', padding: '3px 9px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
              >
                <Trash2 size={11} />
                Tümünü Kaldır
              </button>
            </div>
          )}
          {items.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '40px', textAlign: 'center' }}>
              <Tag size={28} color='#CBD5E1' style={{ marginBottom: '8px' }} />
              <p style={{ fontSize: '13px', color: MUTED, margin: 0 }}>Henüz ürün eklenmedi</p>
              <p style={{ fontSize: '11px', color: '#94A3B8', margin: '4px 0 0' }}>Yukarıdan ürün kodu girin</p>
            </div>
          ) : (
            items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 10px', borderRadius: '10px', border: `1px solid ${BORDER}`, marginBottom: '6px', backgroundColor: '#FFFFFF' }}>
                {item.product.image_url || item.product.category_image_url ? (
                  <img src={imgUrl(item.product.image_url || item.product.category_image_url)} alt="" style={{ width: '30px', height: '30px', objectFit: 'contain', borderRadius: '6px', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '30px', height: '30px', borderRadius: '6px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Tag size={12} color='#94A3B8' />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', fontWeight: 700, color: PRIMARY }}>{item.product.code}</span>
                    {item.product.measurement && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: MUTED }}>({item.product.measurement})</span>}
                  </div>
                  <p style={{ fontSize: '11px', color: MUTED, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.description || item.product.name}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                  <button style={{ width: '24px', height: '24px', border: `1px solid ${BORDER}`, borderRadius: '5px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }} onClick={() => updateQty(idx, item.qty - 1)}>
                    <ChevronDown size={11} />
                  </button>
                  <input type="number" min="1" value={item.qty} onChange={(e) => updateQty(idx, e.target.value)}
                    style={{ width: '36px', textAlign: 'center', fontSize: '12px', fontFamily: "'IBM Plex Mono', monospace", border: `1px solid ${BORDER}`, borderRadius: '5px', padding: '2px 3px', outline: 'none', color: '#0F172A', backgroundColor: '#fff' }}
                  />
                  <button style={{ width: '24px', height: '24px', border: `1px solid ${BORDER}`, borderRadius: '5px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }} onClick={() => updateQty(idx, item.qty + 1)}>
                    <ChevronUp size={11} />
                  </button>
                </div>
                <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '3px', display: 'flex', alignItems: 'center' }}>
                  <X size={13} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* ── POSITION GRID SECTION ── */}
        {!isLabelMode && <div style={{ borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <button
            onClick={() => setShowPositionGrid(v => !v)}
            style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', background: showPositionGrid ? '#EFF6FF' : '#F8FAFC', border: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif", borderBottom: showPositionGrid ? `1px solid ${BORDER}` : 'none' }}
          >
            <Grid size={14} color={showPositionGrid ? PRIMARY : MUTED} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: showPositionGrid ? PRIMARY : MUTED, flex: 1, textAlign: 'left' }}>
              Kullanılmış Hücreleri İşaretle
            </span>
            {usedCells > 0 && (
              <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#FEF3C7', color: '#92400E', padding: '1px 7px', borderRadius: '10px', border: '1px solid #FDE68A' }}>
                {usedCells} atlıyor
              </span>
            )}
            <span style={{ fontSize: '11px', color: MUTED }}>{showPositionGrid ? '▲' : '▼'}</span>
          </button>

          {showPositionGrid && (
            <div style={{ padding: '12px 16px', backgroundColor: '#F8FAFC' }}>
              <p style={{ fontSize: '11px', color: MUTED, margin: '0 0 8px' }}>
                <strong>Tıkla veya sürükle</strong> → Gri = kullanılmış (atlanacak), Mavi = boş (etiket basılacak)
              </p>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                <button style={btnSm} onClick={resetMask}>
                  <RotateCcw size={11} /> Tümünü Seç
                </button>
                <button style={btnSm} onClick={selectNone}>
                  <X size={11} /> Tümünü Kaldır
                </button>
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: MUTED, display: 'flex', alignItems: 'center' }}>
                  <strong style={{ color: PRIMARY }}>{availableOnPage1}</strong>/24
                </span>
              </div>

              {/* 3×8 interactive grid */}
              <div
                style={{ display: 'grid', gridTemplateColumns: `repeat(${selectedFormat?.cols || 3}, 1fr)`, gap: '4px', userSelect: 'none' }}
                onMouseLeave={() => { isDragging.current = false; }}
              >
                {positionMask.map((available, i) => {
                  // Which label will go here (if available)?
                  const availBefore = positionMask.slice(0, i).filter(Boolean).length;
                  const labelForThis = available && availBefore < totalLabels ? availBefore + 1 : null;

                  return (
                    <div
                      key={i}
                      style={{
                        aspectRatio: '64/34',
                        backgroundColor: available ? '#DBEAFE' : '#F1F5F9',
                        border: `1.5px solid ${available ? '#93C5FD' : '#E2E8F0'}`,
                        borderRadius: '3px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: '1px',
                        position: 'relative',
                        transition: 'background-color 0.1s ease',
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        isDragging.current = true;
                        const newVal = !available;
                        dragValue.current = newVal;
                        togglePosition(i, newVal);
                      }}
                      onMouseEnter={() => {
                        if (isDragging.current) togglePosition(i, dragValue.current);
                      }}
                    >
                      <span style={{ fontSize: '9px', fontWeight: 700, color: available ? '#1D4ED8' : '#94A3B8', lineHeight: 1 }}>
                        {i + 1}
                      </span>
                      {!available && (
                        <span style={{ fontSize: '7px', color: '#94A3B8', lineHeight: 1 }}>✕</span>
                      )}
                      {available && labelForThis && (
                        <span style={{ fontSize: '7px', color: '#1D4ED8', lineHeight: 1, opacity: 0.7 }}>#{labelForThis}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <p style={{ fontSize: '10px', color: MUTED, marginTop: '8px', lineHeight: 1.4 }}>
                Sayfanın sol üstünden sağ alta doğru sıralı. Hücre 1 = sol üst.
              </p>
            </div>
          )}
        </div>}

        {/* Footer */}
        {items.length > 0 && (
          <div style={{ padding: '11px 16px', borderTop: `1px solid ${BORDER}`, backgroundColor: '#F8FAFC', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', color: MUTED }}>
                <strong style={{ color: '#0F172A' }}>{totalLabels}</strong> etiket
                {!isLabelMode && <>&bull; <strong style={{ color: '#0F172A', marginLeft: '4px' }}>{pageCount}</strong> sayfa</>}
                {!isLabelMode && usedCells > 0 && (
                  <span style={{ marginLeft: '4px', fontSize: '11px', color: '#92400E' }}>
                    ({usedCells} hücre atlıyor)
                  </span>
                )}
              </div>
              <button onClick={() => setShowClearConfirm(true)} style={{ fontSize: '11px', color: MUTED, background: 'none', border: 'none', cursor: 'pointer' }}>Temizle</button>
            </div>
            <button
              onClick={onPrintClick}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px', fontSize: '13px', fontWeight: 600, backgroundColor: PRIMARY, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              data-testid="label-prep-print-button"
            >
              <Printer size={15} />
              {isAuthenticated
                ? `${totalLabels} Etiketi Yazdır`
                : `Yazdır (${Math.max(0, MAX_GUEST_PRINTS - guestPrints)}/${MAX_GUEST_PRINTS} hak)`
              }
            </button>
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: PREVIEW ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#E2E8F0' }}>

        {/* Toolbar */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 14px', borderBottom: `1px solid ${BORDER}`, backgroundColor: 'rgba(255,255,255,0.95)', flexShrink: 0 }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>Önizleme</span>
          <span style={{ fontSize: '12px', color: MUTED }}>
            {items.length > 0
              ? isLabelMode
                ? `${totalLabels} etiket • tek tek basılacak`
                : `${pageCount} sayfa • ${totalLabels} etiket`
              : 'Boş'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: 'auto' }}>
            <button onClick={() => setZoom(z => parseFloat(Math.max(0.25, z - 0.1).toFixed(2)))}
              style={{ padding: '5px', border: `1px solid ${BORDER}`, borderRadius: '6px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              data-testid="label-sheet-zoom-out">
              <ZoomOut size={14} color={MUTED} />
            </button>
            <span style={{ fontSize: '12px', fontFamily: "'IBM Plex Mono', monospace", color: MUTED, minWidth: '44px', textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={() => setZoom(z => parseFloat(Math.min(1.5, z + 0.1).toFixed(2)))}
              style={{ padding: '5px', border: `1px solid ${BORDER}`, borderRadius: '6px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              data-testid="label-sheet-zoom-in">
              <ZoomIn size={14} color={MUTED} />
            </button>
            {zoom !== 1.0 && (
              <button onClick={() => setZoom(1.0)}
                style={{ padding: '5px 8px', border: `1px solid ${BORDER}`, borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '11px', color: MUTED }}>
                100%
              </button>
            )}
          </div>
          <button
            onClick={items.length > 0 ? onPrintClick : undefined}
            disabled={items.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', fontSize: '13px', fontWeight: 600, backgroundColor: items.length === 0 ? '#94A3B8' : PRIMARY, color: '#fff', border: 'none', borderRadius: '8px', cursor: items.length > 0 ? 'pointer' : 'not-allowed' }}
            data-testid="label-prep-generate-preview-button"
          >
            <Printer size={14} /> Yazdır
          </button>
        </div>

        {/* Warning */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 14px', backgroundColor: '#FFFBEB', borderBottom: '1px solid #FDE68A', fontSize: '12px', color: '#92400E', flexShrink: 0 }}>
          <Info size={12} style={{ flexShrink: 0 }} />
          {isLabelMode
            ? <span>Yazdırmadan önce yazıcı seçim ekranında <strong>Zebra / etiket yazıcınızı</strong> seçin ve ölçeği <strong>100%</strong> yapın.</span>
            : <span>Yazdırırken <strong>"Ölçek: 100%"</strong> veya <strong>"Gerçek boyut"</strong> seçin.</span>
          }
        </div>

        {/* Preview Area */}
        <div
          style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: isLabelMode ? 'flex-start' : 'center', flexDirection: isLabelMode ? 'column' : 'row', alignItems: isLabelMode ? 'center' : 'flex-start', padding: '20px', gap: isLabelMode ? '0' : undefined }}
          data-testid="label-sheet-preview"
        >
          {isLabelMode ? (
            <div style={{
              position: 'relative',
              width: `${LBL_W_PX * zoom}px`,
              height: `${(LBL_H_PX + 8) * zoom * Math.max(1, totalLabels) - 8 * zoom}px`,
              flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                boxShadow: '0 6px 32px rgba(0,0,0,0.15)',
              }}>
                <LabelPrinterSheet
                  ref={labelPrintRef}
                  items={items}
                  settings={settings}
                  format={mergedLabelFormat}
                />
              </div>
            </div>
          ) : (
            <div style={{
              position: 'relative',
              width: `${A4_W_PX * zoom}px`,
              height: `${A4_H_PX * zoom * pageCount}px`,
              flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                boxShadow: '0 6px 32px rgba(0,0,0,0.15)',
              }}>
                <LabelSheet
                  ref={printRef}
                  items={items}
                  settings={settings}
                  positionMask={positionMask}
                  format={enrichedSelectedFormat}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {showPremium && <PremiumModal onClose={() => setShowPremium(false)} />}
    {showGuestLimit && <GuestLimitModal onClose={() => setShowGuestLimit(false)} from="/label-prep" printCount={MAX_GUEST_PRINTS} />}

    {showClearConfirm && (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={() => setShowClearConfirm(false)}>
        <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '28px 28px 22px', width: '320px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', fontFamily: "'Inter', sans-serif" }}
          onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Trash2 size={17} color='#EF4444' />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Tüm etiketleri kaldır?</h3>
          </div>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px', lineHeight: 1.5 }}>
            Listede bulunan <strong style={{ color: '#0F172A' }}>{items.length} ürün</strong> silinecek. Bu işlem geri alınamaz.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowClearConfirm(false)}
              style={{ flex: 1, padding: '9px', fontSize: '13px', fontWeight: 500, border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#F8FAFC', cursor: 'pointer', color: '#64748B' }}
            >
              İptal
            </button>
            <button
              onClick={clearAllItems}
              style={{ flex: 1, padding: '9px', fontSize: '13px', fontWeight: 600, border: 'none', borderRadius: '8px', backgroundColor: '#EF4444', color: '#fff', cursor: 'pointer' }}
            >
              Evet, Kaldır
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Label Printer Format Modal ── */}
    {showFormatModal && (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={() => setShowFormatModal(false)}>
        <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '24px', width: '340px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', fontFamily: "'Inter', sans-serif" }}
          onClick={e => e.stopPropagation()}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
            {editingFormat ? 'Şablonu Düzenle' : 'Yeni Etiket Şablonu'}
          </h3>
          <p style={{ fontSize: '12px', color: MUTED, margin: '0 0 18px' }}>
            Yazıcınızdaki etiket kağıdının boyutunu girin.
          </p>

          {/* Hızlı presetler */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {[{ label: '70×37', w: 70, h: 37 }, { label: '100×50', w: 100, h: 50 }, { label: '57×32', w: 57, h: 32 }, { label: '50×25', w: 50, h: 25 }].map(p => (
              <button key={p.label} onClick={() => setFormatForm(f => ({ ...f, width: String(p.w), height: String(p.h) }))}
                style={{ padding: '3px 9px', fontSize: '11px', border: `1px solid ${BORDER}`, borderRadius: '5px', background: '#F8FAFC', cursor: 'pointer', color: MUTED }}>
                {p.label}mm
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: MUTED, display: 'block', marginBottom: '4px' }}>Şablon Adı</label>
              <input
                value={formatForm.name}
                onChange={e => setFormatForm(f => ({ ...f, name: e.target.value }))}
                placeholder="ör: Zebra 70×37"
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: '13px', border: `1px solid ${BORDER}`, borderRadius: '7px', outline: 'none', fontFamily: "'Inter',sans-serif" }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: MUTED, display: 'block', marginBottom: '4px' }}>Genişlik (mm)</label>
                <input
                  type="number" min="10" max="300"
                  value={formatForm.width}
                  onChange={e => setFormatForm(f => ({ ...f, width: e.target.value }))}
                  placeholder="70"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: '13px', border: `1px solid ${BORDER}`, borderRadius: '7px', outline: 'none', fontFamily: "'IBM Plex Mono',monospace" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: MUTED, display: 'block', marginBottom: '4px' }}>Yükseklik (mm)</label>
                <input
                  type="number" min="10" max="300"
                  value={formatForm.height}
                  onChange={e => setFormatForm(f => ({ ...f, height: e.target.value }))}
                  placeholder="37"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: '13px', border: `1px solid ${BORDER}`, borderRadius: '7px', outline: 'none', fontFamily: "'IBM Plex Mono',monospace" }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: MUTED, display: 'block', marginBottom: '4px' }}>Tasarım</label>
              {allDesignOptions.length === 0 ? (
                <div style={{ padding: '10px 12px', backgroundColor: '#F8FAFC', border: `1px dashed ${BORDER}`, borderRadius: '7px', fontSize: '12px', color: MUTED, lineHeight: 1.5 }}>
                  Henüz katalogda tasarım yok.{' '}
                  <a href="/designs" style={{ color: PRIMARY, fontWeight: 600 }} onClick={e => { e.preventDefault(); setShowFormatModal(false); window.location.href = '/designs'; }}>
                    Tasarımlarım
                  </a>
                  {' '}sayfasında bir tasarım oluşturup "Kataloğa Kaydet"i kullanın.
                </div>
              ) : (
                <select
                  value={formatForm.designId}
                  onChange={e => setFormatForm(f => ({ ...f, designId: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: `1px solid ${BORDER}`, borderRadius: '7px', outline: 'none', color: '#0F172A', backgroundColor: '#fff', cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}
                >
                  <option value="">— Varsayılan (standart görünüm) —</option>
                  {allDesignOptions.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {editingFormat && (
              <button onClick={() => deleteLabelFormat(editingFormat.id)}
                style={{ padding: '9px 12px', fontSize: '13px', border: '1px solid #FCA5A5', borderRadius: '8px', backgroundColor: '#FFF5F5', cursor: 'pointer', color: '#EF4444' }}>
                Sil
              </button>
            )}
            <button onClick={() => setShowFormatModal(false)}
              style={{ flex: 1, padding: '9px', fontSize: '13px', fontWeight: 500, border: `1px solid ${BORDER}`, borderRadius: '8px', backgroundColor: '#F8FAFC', cursor: 'pointer', color: MUTED }}>
              İptal
            </button>
            <button
              onClick={saveLabelFormat}
              disabled={!formatForm.name.trim() || !formatForm.width || !formatForm.height}
              style={{ flex: 1, padding: '9px', fontSize: '13px', fontWeight: 600, border: 'none', borderRadius: '8px', backgroundColor: !formatForm.name.trim() || !formatForm.width || !formatForm.height ? '#94A3B8' : PRIMARY, color: '#fff', cursor: !formatForm.name.trim() || !formatForm.width || !formatForm.height ? 'not-allowed' : 'pointer' }}>
              Kaydet
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
