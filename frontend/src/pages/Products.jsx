import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Plus, Search, Edit2, Trash2, Tag, ChevronLeft, ChevronRight,
  X, Package, FolderOpen, Download, FileUp, ArrowUp, ArrowDown,
  ArrowUpDown, CheckSquare, Square, Printer
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const LIMIT = 20;
const PRIMARY = '#0B4F8A';
const BORDER = '#E2E8F0';
const MUTED = '#64748B';
const STORAGE_KEY = 'products_selected_v2';

const emptyForm = {
  code: '', name: '', measurement: '', standard_code: '',
  quality: '', description: '', default_qty: 1, barcode: '',
  category_id: '', custom_fields: {}
};

const VAR_TO_KEY = {
  '{{code}}':          'code',
  '{{measurement}}':   'measurement',
  '{{description}}':   'description',
  '{{quality}}':       'quality',
  '{{default_qty}}':   'default_qty',
  '{{barcode}}':       'barcode',
  '{{standard_code}}': 'standard_code',
  '{{print_date}}':    '__date__',
};
// Monospace input vars (ürün kodları, ölçüler)
const MONO_VARS = new Set(['{{code}}','{{measurement}}','{{standard_code}}','{{barcode}}']);

const S = {
  input:    { width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: '13px', border: `1px solid ${BORDER}`, borderRadius: '8px', outline: 'none', color: '#0F172A', backgroundColor: '#FFFFFF', fontFamily: "'Inter', sans-serif" },
  inputMono:{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: '13px', fontFamily: "'IBM Plex Mono', monospace", border: `1px solid ${BORDER}`, borderRadius: '8px', outline: 'none', color: '#0F172A', backgroundColor: '#FFFFFF' },
  label:    { display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' },
  textarea: { width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: '13px', border: `1px solid ${BORDER}`, borderRadius: '8px', outline: 'none', color: '#0F172A', backgroundColor: '#FFFFFF', fontFamily: "'Inter', sans-serif", resize: 'vertical', minHeight: '68px' },
  select:   { width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: '13px', border: `1px solid ${BORDER}`, borderRadius: '8px', outline: 'none', color: '#0F172A', backgroundColor: '#FFFFFF', fontFamily: "'Inter', sans-serif", cursor: 'pointer' },
};

// Load/save selection from localStorage
function loadSelection() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function saveSelection(items) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
  catch {}
}

export default function Products() {
  const [products, setProducts]           = useState([]);
  const [categories, setCategories]       = useState([]);
  const [total, setTotal]                 = useState(0);
  const [pages, setPages]                 = useState(1);
  const [page, setPage]                   = useState(1);
  const [search, setSearch]               = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [loading, setLoading]             = useState(false);

  // Sort state
  const [sortBy, setSortBy]   = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  // Selection (persistent via localStorage)
  const [selectedItems, setSelectedItems] = useState(loadSelection);

  // Modal states
  const [modalOpen, setModalOpen]     = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm]               = useState(emptyForm);
  const [saving, setSaving]           = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importing, setImporting]     = useState(false);
  const [importResult, setImportResult] = useState(null);

  const importRef = useRef(null);
  const navigate  = useNavigate();

  // Persist selection
  useEffect(() => { saveSelection(selectedItems); }, [selectedItems]);

  // ── Load products ──────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const catParam  = filterCategoryId ? `&category_id=${filterCategoryId}` : '';
      const sortParam = `&sort_by=${sortBy}&sort_dir=${sortDir}`;
      const res = await axios.get(
        `${BACKEND_URL}/api/products?query=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=${LIMIT}${catParam}${sortParam}`
      );
      setProducts(res.data.products);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch { toast.error('Ürünler yüklenemedi'); }
    finally { setLoading(false); }
  }, [debouncedSearch, page, filterCategoryId, sortBy, sortDir]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/categories`).then(r => setCategories(r.data)).catch(() => {});
  }, []);

  // ── Sort ───────────────────────────────────────────────────────────
  const handleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
    setPage(1);
  };
  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <ArrowUpDown size={12} color='#CBD5E1' />;
    return sortDir === 'asc' ? <ArrowUp size={12} color={PRIMARY} /> : <ArrowDown size={12} color={PRIMARY} />;
  };
  const thStyle = (field) => ({
    padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700,
    color: sortBy === field ? PRIMARY : MUTED,
    textTransform: 'uppercase', letterSpacing: '0.04em',
    borderBottom: `1px solid ${BORDER}`, cursor: 'pointer',
    userSelect: 'none', whiteSpace: 'nowrap',
    backgroundColor: sortBy === field ? '#F0F7FF' : '#F8FAFC',
    transition: 'background-color 0.15s',
  });

  // ── Selection ──────────────────────────────────────────────────────
  const selectedIds = new Set(selectedItems.map(i => i.id));
  const currentPageIds = products.map(p => p.id);
  const allCurrentSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.has(id));
  const someCurrentSelected = currentPageIds.some(id => selectedIds.has(id)) && !allCurrentSelected;

  const toggleSelect = (product) => {
    setSelectedItems(prev => {
      if (prev.some(i => i.id === product.id)) return prev.filter(i => i.id !== product.id);
      return [...prev, { id: product.id, code: product.code, name: product.name, default_qty: product.default_qty || 1 }];
    });
  };
  const toggleSelectAll = () => {
    if (allCurrentSelected) {
      setSelectedItems(prev => prev.filter(i => !currentPageIds.includes(i.id)));
    } else {
      setSelectedItems(prev => {
        const next = [...prev];
        products.forEach(p => {
          if (!prev.some(i => i.id === p.id))
            next.push({ id: p.id, code: p.code, name: p.name, default_qty: p.default_qty || 1 });
        });
        return next;
      });
    }
  };
  const clearSelection = () => setSelectedItems([]);

  // ── Bulk label ─────────────────────────────────────────────────────
  const handleBulkLabel = async () => {
    if (selectedItems.length === 0) return;
    try {
      const results = await Promise.all(
        selectedItems.map(item =>
          axios.get(`${BACKEND_URL}/api/products/code/${encodeURIComponent(item.code)}`)
            .then(r => r.data).catch(() => null)
        )
      );
      const labelItems = results.filter(Boolean).map(p => ({ product: p, qty: p.default_qty || 1 }));
      navigate('/label-prep', { state: { labelItems } });
    } catch { toast.error('Ürünler yüklenemedi'); }
  };

  // ── Form helpers ───────────────────────────────────────────────────
  const openAdd = () => { setEditProduct(null); setForm({ ...emptyForm, category_id: filterCategoryId || '' }); setModalOpen(true); };
  const openEdit = (p) => {
    setEditProduct(p);
    setForm({ code: p.code||'', name: p.name||'', measurement: p.measurement||'', standard_code: p.standard_code||'', quality: p.quality||'', description: p.description||'', default_qty: p.default_qty||1, barcode: p.barcode||'', category_id: p.category_id||'', custom_fields: p.custom_fields||{} });
    setModalOpen(true);
  };
  const handleSave = async () => {
    if (!form.code.trim()) { toast.error('Ürün Kodu zorunludur'); return; }
    const saveName = form.name.trim() || form.code.trim();
    setSaving(true);
    try {
      if (editProduct) {
        await axios.put(`${BACKEND_URL}/api/products/${editProduct.id}`, { name: saveName, measurement: form.measurement||null, standard_code: form.standard_code||null, quality: form.quality||null, description: form.description||null, default_qty: form.default_qty, barcode: form.barcode||null, category_id: form.category_id||null, custom_fields: form.custom_fields||{} });
        toast.success('Ürün güncellendi');
      } else {
        await axios.post(`${BACKEND_URL}/api/products`, { ...form, name: saveName, category_id: form.category_id||null });
        toast.success('Ürün eklendi');
      }
      setModalOpen(false); loadProducts();
    } catch (err) { toast.error(err.response?.data?.detail || 'Hata oluştu'); }
    finally { setSaving(false); }
  };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/products/${deleteTarget.id}`);
      toast.success('Ürün silindi');
      setSelectedItems(prev => prev.filter(i => i.id !== deleteTarget.id));
      setDeleteTarget(null); loadProducts();
    } catch { toast.error('Silme başarısız'); }
  };

  const handleDownloadTemplate = async () => {
    const params = filterCategoryId ? `?category_id=${filterCategoryId}` : '';
    try {
      const res = await axios.get(`${BACKEND_URL}/api/products/template${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      const cat = categories.find(c => c.id === filterCategoryId);
      a.download = cat ? `${cat.name.replace(/\s+/g,'_')}_sablonu.xlsx` : 'urunler_sablonu.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Şablon indirilemedi'); }
  };
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImporting(true);
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/products/import`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportResult(res.data); loadProducts();
    } catch (err) { toast.error(err.response?.data?.detail || 'İçeri aktarma başarısız'); }
    finally { setImporting(false); if (importRef.current) importRef.current.value = ''; }
  };

  const selectedCat = categories.find(c => c.id === form.category_id);

  // Tablo için: filtreli kategori ve onun dinamik sütunları
  const selectedFilterCat = categories.find(c => c.id === filterCategoryId);
  const dynamicCols = (() => {
    const skip = v => VAR_TO_KEY[v] === '__date__' || VAR_TO_KEY[v] === 'code' || VAR_TO_KEY[v] === 'standard_code';
    if (selectedFilterCat) {
      // Tek kategori seçili: o kategorinin alanları
      return (selectedFilterCat.fields || []).filter(f => !skip(f.var));
    }
    // Tüm kategoriler: var veya isim bazında tekilleştirilmiş birleşim
    const seen = new Map();
    for (const cat of categories) {
      for (const field of (cat.fields || [])) {
        if (skip(field.var)) continue;
        const key = field.var || field.name; // aynı var → tek sütun
        if (!seen.has(key)) seen.set(key, field);
      }
    }
    return Array.from(seen.values());
  })();
  // Ürün hücre değerini kategori alanına göre çöz
  const getCellValue = (product, field) => {
    const knownKey = VAR_TO_KEY[field.var];
    if (knownKey && knownKey !== '__date__' && knownKey !== 'code') {
      return product[knownKey] || '';
    }
    return product.custom_fields?.[field.id] || '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Bulk action bar ── */}
      {selectedItems.length > 0 && (
        <div style={{ backgroundColor: '#0B4F8A', color: '#fff', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
          <CheckSquare size={16} />
          <span style={{ fontWeight: 600, fontSize: '13px' }}>
            {selectedItems.length} ürün seçildi
          </span>
          <button
            onClick={handleBulkLabel}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, backgroundColor: '#fff', color: PRIMARY, border: 'none', borderRadius: '7px', cursor: 'pointer' }}
          >
            <Printer size={14} /> Etiket Hazırla
          </button>
          <button
            onClick={clearSelection}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '12px', fontWeight: 500, backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '7px', cursor: 'pointer' }}
          >
            <X size={13} /> Seçimi Temizle
          </button>
          <span style={{ marginLeft: 'auto', fontSize: '11px', opacity: 0.7 }}>
            Sayfa değiştirseniz bile seçim korunur
          </span>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: 'rgba(247,250,252,0.97)', borderBottom: `1px solid ${BORDER}`, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flexShrink: 0 }}>
        <h1 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Space Grotesk','Inter',sans-serif" }}>Ürünler</h1>
        <div style={{ position: 'relative', width: '240px' }}>
          <Search size={14} color={MUTED} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input style={{ ...S.input, paddingLeft: '32px', height: '36px' }} placeholder="Kod, isim veya ölçü ara..." value={search} onChange={e => setSearch(e.target.value)} data-testid="products-search-input" />
        </div>
        {categories.length > 0 && (
          <select value={filterCategoryId} onChange={e => { setFilterCategoryId(e.target.value); setPage(1); }} style={{ ...S.select, width: 'auto', height: '36px', maxWidth: '200px' }}>
            <option value="">Tüm Kategoriler</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        {total > 0 && <span style={{ fontSize: '13px', color: MUTED }}>{total} ürün</span>}
        <button onClick={openAdd} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, backgroundColor: PRIMARY, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }} data-testid="products-create-button">
          <Plus size={15} /> Yeni Ürün
        </button>
        <button
          onClick={handleDownloadTemplate}
          title={filterCategoryId ? `"${categories.find(c=>c.id===filterCategoryId)?.name}" kategorisi şablonu` : 'Genel şablon — kategori seçerek kategoriye özel şablon indirin'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '8px 13px', fontSize: '13px', fontWeight: 500, backgroundColor: '#fff', color: '#15803D', border: '1px solid #86EFAC', borderRadius: '8px', cursor: 'pointer' }}>
          <Download size={14} /> {filterCategoryId ? 'Şablon İndir ✓' : 'Şablon İndir'}
        </button>
        <button onClick={() => importRef.current?.click()} disabled={importing} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '8px 13px', fontSize: '13px', fontWeight: 500, backgroundColor: '#fff', color: '#7C3AED', border: '1px solid #C4B5FD', borderRadius: '8px', cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.7 : 1 }}>
          {importing ? <div style={{ width: '13px', height: '13px', border: '2px solid #7C3AED', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : <FileUp size={14} />}
          {importing ? 'Aktarılıyor...' : 'Excel Aktar'}
        </button>
        <input ref={importRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportFile} />
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height: '50px', backgroundColor: '#F1F5F9', borderRadius: '10px' }} />)}
          </div>
        ) : products.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center' }}>
            <Package size={44} color='#CBD5E1' style={{ marginBottom: '12px' }} />
            <p style={{ color: MUTED, fontWeight: 500, margin: '0 0 6px', fontSize: '15px' }}>
              {search ? `"${search}" için sonuç yok` : filterCategoryId ? 'Bu kategoride ürün yok' : 'Henüz ürün eklenmemiş'}
            </p>
            <button onClick={openAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, backgroundColor: PRIMARY, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '12px' }}>
              <Plus size={14} /> Ürün Ekle
            </button>
          </div>
        ) : (
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: '12px', backgroundColor: '#fff', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }} data-testid="products-table">
              <thead>
                <tr>
                  {/* Checkbox header */}
                  <th style={{ padding: '10px 12px', borderBottom: `1px solid ${BORDER}`, backgroundColor: '#F8FAFC', width: '40px' }}>
                    <div
                      onClick={toggleSelectAll}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title={allCurrentSelected ? 'Sayfadaki seçimi kaldır' : 'Sayfadakileri seç'}
                    >
                      {allCurrentSelected
                        ? <CheckSquare size={16} color={PRIMARY} />
                        : someCurrentSelected
                          ? <CheckSquare size={16} color='#93C5FD' />
                          : <Square size={16} color='#CBD5E1' />
                      }
                    </div>
                  </th>
                  {/* Image */}
                  <th style={{ padding: '10px 12px', borderBottom: `1px solid ${BORDER}`, backgroundColor: '#F8FAFC', width: '48px' }} />
                  {/* Ürün Kodu (birincil tanımlayıcı) — her zaman ilk sütun */}
                  <th style={thStyle('code')} onClick={() => handleSort('code')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      KOD <SortIcon field='code' />
                    </div>
                  </th>
                  {/* Dinamik sütunlar — kategorilerin tüm alanları */}
                  {!selectedFilterCat && (
                    <th style={thStyle(null)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>KATEGORİ</div>
                    </th>
                  )}
                  {dynamicCols.map(field => {
                    const sortField = VAR_TO_KEY[field.var];
                    const isSortable = !!sortField;
                    return (
                      <th
                        key={field.id}
                        style={thStyle(isSortable ? sortField : null)}
                        onClick={isSortable ? () => handleSort(sortField) : undefined}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          {field.name.toUpperCase()}
                          {isSortable && <SortIcon field={sortField} />}
                        </div>
                      </th>
                    );
                  })}
                  <th style={{ padding: '10px 12px', borderBottom: `1px solid ${BORDER}`, backgroundColor: '#F8FAFC', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em', width: '110px' }}>
                    İŞLEMLER
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const isSelected = selectedIds.has(p.id);
                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: isSelected ? '#F0F7FF' : 'transparent', transition: 'background-color 0.1s' }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '8px 12px' }}>
                        <div onClick={() => toggleSelect(p)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isSelected
                            ? <CheckSquare size={16} color={PRIMARY} />
                            : <Square size={16} color='#CBD5E1' />
                          }
                        </div>
                      </td>
                      {/* Image */}
                      <td style={{ padding: '8px 12px' }}>
                        {(p.image_url || p.category_image_url) ? (
                          <img src={`${BACKEND_URL}${p.image_url || p.category_image_url}`} alt="" style={{ width: '34px', height: '34px', objectFit: 'contain', borderRadius: '6px', border: `1px solid ${BORDER}`, backgroundColor: '#F8FAFC' }} />
                        ) : (
                          <div style={{ width: '34px', height: '34px', borderRadius: '6px', border: `1px solid ${BORDER}`, backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Package size={14} color='#CBD5E1' />
                          </div>
                        )}
                      </td>
                      {/* Ürün Kodu — sabit */}
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '11px', fontWeight: 700, color: PRIMARY, backgroundColor: 'rgba(11,79,138,0.08)', padding: '2px 8px', borderRadius: '4px' }}>{p.code}</span>
                      </td>
                      {/* Kategori badge — sadece tüm kategoriler görünümünde */}
                      {!selectedFilterCat && (
                        <td style={{ padding: '8px 12px' }}>
                          {p.category_name ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: '20px', color: '#1D4ED8', fontWeight: 500 }}>
                              <FolderOpen size={10} />{p.category_name}
                            </span>
                          ) : <span style={{ color: '#CBD5E1', fontSize: '12px' }}>—</span>}
                        </td>
                      )}
                      {/* Dinamik hücreler — tüm kategori alanları */}
                      {dynamicCols.map(field => {
                        const val = getCellValue(p, field);
                        const isMono = MONO_VARS.has(field.var);
                        return (
                          <td key={field.id} style={{ padding: '8px 12px', maxWidth: '160px' }}>
                            {val ? (
                              <span style={{
                                display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                fontFamily: isMono ? "'IBM Plex Mono',monospace" : 'inherit',
                                fontWeight: isMono ? 700 : 400,
                                fontSize: '13px', color: '#0F172A',
                              }}>{val}</span>
                            ) : <span style={{ color: '#CBD5E1', fontSize: '12px' }}>—</span>}
                          </td>
                        );
                      })}
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                          <button onClick={() => navigate('/label-prep', { state: { codes: [p.code] } })} title="Etiket Hazırla"
                            style={{ padding: '5px', borderRadius: '6px', background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex' }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(11,79,138,0.08)'; e.currentTarget.style.color = PRIMARY; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = MUTED; }}
                          ><Tag size={14} /></button>
                          <button onClick={() => openEdit(p)} title="Düzenle" data-testid="products-row-edit-button"
                            style={{ padding: '5px', borderRadius: '6px', background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex' }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.color = '#0F172A'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = MUTED; }}
                          ><Edit2 size={14} /></button>
                          <button onClick={() => setDeleteTarget(p)} title="Sil" data-testid="products-row-delete-button"
                            style={{ padding: '5px', borderRadius: '6px', background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex' }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = MUTED; }}
                          ><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1} style={{ padding: '7px', border: `1px solid ${BORDER}`, borderRadius: '8px', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, display: 'flex' }}>
              <ChevronLeft size={16} color={MUTED} />
            </button>
            <span style={{ fontSize: '13px', color: MUTED }}>Sayfa {page} / {pages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page === pages} style={{ padding: '7px', border: `1px solid ${BORDER}`, borderRadius: '8px', background: '#fff', cursor: page === pages ? 'not-allowed' : 'pointer', opacity: page === pages ? 0.4 : 1, display: 'flex' }}>
              <ChevronRight size={16} color={MUTED} />
            </button>
          </div>
        )}
      </div>

      {/* ── ADD/EDIT MODAL ── */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
          <div onClick={() => setModalOpen(false)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
          <div style={{ position: 'relative', width: '480px', maxWidth: '95vw', height: '100vh', backgroundColor: '#fff', boxShadow: '-8px 0 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', zIndex: 1 }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Space Grotesk','Inter',sans-serif" }}>{editProduct ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}</h2>
              <button onClick={() => setModalOpen(false)} style={{ padding: '6px', borderRadius: '6px', background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex' }}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* ── Ürün Kodu (her zaman zorunlu, sabit) ── */}
                <div>
                  <label style={S.label}>Ürün Kodu *</label>
                  <input
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="örn: DIN965-M4X35"
                    style={{ ...S.inputMono, backgroundColor: editProduct ? '#F8FAFC' : '#fff' }}
                    disabled={!!editProduct}
                  />
                  {editProduct && <p style={{ fontSize: '11px', color: MUTED, marginTop: '4px' }}>Ürün kodu değiştirilemez</p>}
                </div>

                {/* ── Kategori Seçimi ── */}
                <div>
                  <label style={{ ...S.label, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <FolderOpen size={13} style={{ verticalAlign: 'middle' }} />
                    Kategori Seçin
                  </label>
                  <select
                    value={form.category_id}
                    onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                    style={S.select}
                  >
                    <option value="">-- Kategori Yok --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {selectedCat && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', padding: '8px 10px', backgroundColor: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                      {selectedCat.image_url
                        ? <img src={`${BACKEND_URL}${selectedCat.image_url}`} alt="" style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '6px', border: `1px solid ${BORDER}` }} />
                        : <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FolderOpen size={14} color='#94A3B8' /></div>}
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#166534' }}>{selectedCat.name}</div>
                        {selectedCat.description && <div style={{ fontSize: '11px', color: '#16A34A' }}>{selectedCat.description}</div>}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Dinamik Alanlar (kategori seçiliyse) / Statik Alanlar (seçili değilse) ── */}
                {selectedCat?.fields?.length > 0 ? (
                  /* Kategori seçili: kategorinin alan tanımlarını göster */
                  <div style={{ border: `1px solid #BFDBFE`, borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: '#EFF6FF', padding: '10px 14px', borderBottom: '1px solid #BFDBFE' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#1D4ED8' }}>
                        📋 {selectedCat.name} — Alan Girişleri
                      </span>
                      <span style={{ fontSize: '11px', color: '#60A5FA', marginLeft: '8px' }}>
                        Etiket değişkenleriyle otomatik eşleşir
                      </span>
                    </div>
                    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
                      {selectedCat.fields.map(field => {
                        // knownKey: bir form state key'i, '__date__', ya da undefined (custom alan)
                        const knownKey   = VAR_TO_KEY[field.var];
                        const isDate     = knownKey === '__date__';
                        const isCustom   = knownKey === undefined;
                        const formKey    = isDate || isCustom ? null : knownKey;

                        // {{code}} üstteki sabit "Ürün Kodu *" alanı tarafından karşılanıyor, burada atla
                        if (formKey === 'code') return null;

                        const isMono     = MONO_VARS.has(field.var);
                        const isNumber   = field.var === '{{default_qty}}';
                        const isTextarea = field.var === '{{description}}';

                        const inputValue = isCustom
                          ? (form.custom_fields?.[field.id] ?? '')
                          : (formKey !== null ? (form[formKey] ?? '') : '');
                        const setInputValue = (val) => {
                          if (isCustom) {
                            setForm(f => ({ ...f, custom_fields: { ...(f.custom_fields||{}), [field.id]: val } }));
                          } else if (formKey) {
                            setForm(f => ({ ...f, [formKey]: val }));
                          }
                        };

                        const varHint = field.var || (isCustom ? 'özel' : '');
                        const labelRow = (
                          <label style={{ ...S.label, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {field.name}
                            {varHint && <span style={{ fontSize: '9px', color: '#94A3B8', fontFamily: "'IBM Plex Mono',monospace", fontWeight: 400 }}>{varHint}</span>}
                            {field.colorRules?.length > 0 && (
                              <span style={{ fontSize: '9px', color: '#7C3AED', backgroundColor: '#EDE9FE', padding: '1px 6px', borderRadius: '10px', fontWeight: 600 }}>
                                🎨 {field.colorRules.length} kural
                              </span>
                            )}
                          </label>
                        );

                        if (isDate) {
                          const today = new Date();
                          const dateStr = `${String(today.getDate()).padStart(2,'0')}.${String(today.getMonth()+1).padStart(2,'0')}.${today.getFullYear()}`;
                          return (
                            <div key={field.id}>
                              {labelRow}
                              <div style={{ ...S.input, backgroundColor: '#F8FAFC', color: '#64748B', cursor: 'default', userSelect: 'none' }}>
                                {dateStr}
                              </div>
                              <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>Otomatik — basım anında eklenir</p>
                            </div>
                          );
                        }

                        return (
                          <div key={field.id}>
                            {labelRow}
                            {isTextarea ? (
                              <textarea value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder={`${field.name}...`} style={S.textarea} />
                            ) : isNumber ? (
                              <input type="number" min="1" value={inputValue} onChange={e => setInputValue(parseInt(e.target.value) || 1)} style={S.inputMono} />
                            ) : (
                              <input
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                placeholder={`${field.name} girin...`}
                                style={isMono ? S.inputMono : S.input}
                              />
                            )}
                            {field.colorRules?.length > 0 && (
                              <div style={{ display: 'flex', gap: '4px', marginTop: '5px', flexWrap: 'wrap' }}>
                                {field.colorRules.map(rule => (
                                  <span key={rule.id} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', backgroundColor: rule.bgColor, color: rule.textColor, fontWeight: 700 }}>
                                    {rule.value || '—'}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Kategori seçili değil: standart statik alanlar (Ürün Kodu üstte sabit) */
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div><label style={S.label}>Ölçü</label><input value={form.measurement} onChange={e => setForm(f => ({ ...f, measurement: e.target.value }))} placeholder="örn: 4X35" style={S.inputMono} /></div>
                      <div><label style={S.label}>Standart Kodu</label><input value={form.standard_code} onChange={e => setForm(f => ({ ...f, standard_code: e.target.value }))} placeholder="örn: DIN965" style={S.inputMono} /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div><label style={S.label}>Kalite / Malzeme</label><input value={form.quality} onChange={e => setForm(f => ({ ...f, quality: e.target.value }))} placeholder="örn: A2, Çelik" style={S.input} /></div>
                      <div><label style={S.label}>Varsayılan Adet</label><input type="number" min="1" value={form.default_qty} onChange={e => setForm(f => ({ ...f, default_qty: parseInt(e.target.value) || 1 }))} style={S.inputMono} /></div>
                    </div>
                    <div><label style={S.label}>Açıklama</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ek bilgiler..." style={S.textarea} /></div>
                  </>
                )}
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: '10px', flexShrink: 0, backgroundColor: '#fff' }}>
              <button onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 500, border: `1px solid ${BORDER}`, borderRadius: '8px', background: '#fff', cursor: 'pointer' }}>İptal</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 600, backgroundColor: saving ? '#94A3B8' : PRIMARY, color: '#fff', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {saving ? <><div style={{ width: '13px', height: '13px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Kaydediliyor...</> : (editProduct ? 'Güncelle' : 'Kaydet')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE ── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={() => setDeleteTarget(null)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} />
          <div style={{ position: 'relative', backgroundColor: '#fff', borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 1 }}>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: '0 0 10px', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>Ürün Silinecek</h2>
            <p style={{ fontSize: '13px', color: MUTED, margin: '0 0 20px' }}><strong style={{ color: '#0F172A' }}>{deleteTarget.name}</strong> ({deleteTarget.code}) kalıcı olarak silinecek.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '10px', fontSize: '13px', border: `1px solid ${BORDER}`, borderRadius: '8px', background: '#fff', cursor: 'pointer' }}>İptal</button>
              <button onClick={handleDelete} style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 600, backgroundColor: '#DC2626', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Sil</button>
            </div>
          </div>
        </div>
      )}

      {/* ── IMPORT RESULT ── */}
      {importResult && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={() => setImportResult(null)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} />
          <div style={{ position: 'relative', backgroundColor: '#fff', borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Space Grotesk','Inter',sans-serif" }}>İçeri Aktarma Tamamlandı</h2>
              <button onClick={() => setImportResult(null)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
              <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', textAlign: 'center' }}>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#15803D', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>{importResult.added}</div>
                <div style={{ fontSize: '12px', color: '#15803D', marginTop: '2px' }}>Yeni Eklendi</div>
              </div>
              <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', textAlign: 'center' }}>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#1D4ED8', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>{importResult.updated}</div>
                <div style={{ fontSize: '12px', color: '#1D4ED8', marginTop: '2px' }}>Güncellendi</div>
              </div>
              <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: importResult.skipped > 0 ? '#FEF9C3' : '#F8FAFC', border: `1px solid ${importResult.skipped > 0 ? '#FDE68A' : BORDER}`, textAlign: 'center' }}>
                <div style={{ fontSize: '26px', fontWeight: 800, color: importResult.skipped > 0 ? '#92400E' : '#94A3B8', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>{importResult.skipped}</div>
                <div style={{ fontSize: '12px', color: importResult.skipped > 0 ? '#92400E' : '#94A3B8', marginTop: '2px' }}>Atlandı</div>
              </div>
            </div>
            {importResult.errors?.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#DC2626', marginBottom: '6px' }}>Uyarılar ({importResult.errors.length}):</p>
                <div style={{ maxHeight: '140px', overflowY: 'auto', padding: '10px', backgroundColor: '#FEF2F2', borderRadius: '8px', border: '1px solid #FCA5A5' }}>
                  {importResult.errors.map((err, i) => <div key={i} style={{ fontSize: '12px', color: '#DC2626', marginBottom: '3px', lineHeight: 1.4 }}>• {err}</div>)}
                </div>
              </div>
            )}
            <button onClick={() => setImportResult(null)} style={{ width: '100%', padding: '11px', fontSize: '14px', fontWeight: 600, backgroundColor: PRIMARY, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Tamam</button>
          </div>
        </div>
      )}
    </div>
  );
}
