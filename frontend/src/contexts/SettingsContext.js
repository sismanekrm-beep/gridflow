import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const SettingsContext = createContext(null);
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const SELECTED_FORMAT_KEY = 'selected_label_format_id';

const DEFAULT_SETTINGS = {
  brand_name: 'Marka Adı', brand_logo_url: null,
  margin_top: 5.5, margin_bottom: 5.5,
  margin_left: 7.0, margin_right: 7.0,
  gap_col: 2.0, gap_row: 2.0,
};

const DEFAULT_FORMAT = {
  id: 'default-tw-2024', name: 'TANEX TW-2024',
  label_width: 64, label_height: 34,
  cols: 3, rows: 8,
  margin_top: 5.5, margin_bottom: 5.5,
  margin_left: 7.0, margin_right: 7.0,
  gap_col: 2.0, gap_row: 2.0,
  border_radius: 4.0,
};

export function SettingsProvider({ children }) {
  const { token } = useAuth();
  const [settings, setSettings]           = useState(DEFAULT_SETTINGS);
  const [formats, setFormats]             = useState([DEFAULT_FORMAT]);
  const [designs, setDesigns]             = useState([]);  // catalog designs
  const [selectedFormatId, _setSelFmtId]  = useState(
    () => localStorage.getItem(SELECTED_FORMAT_KEY) || 'default-tw-2024'
  );
  const [loaded, setLoaded] = useState(false);

  const fetchSettings = useCallback(async (authToken) => {
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    try {
      const res = await axios.get(`${BACKEND_URL}/api/settings`, { headers });
      setSettings({ ...DEFAULT_SETTINGS, ...res.data });
      setLoaded(true);
    } catch { setLoaded(true); }
  }, []);

  const fetchFormats = useCallback(async (authToken) => {
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    try {
      const res = await axios.get(`${BACKEND_URL}/api/label-formats`, { headers });
      setFormats(Array.isArray(res.data) ? res.data : [DEFAULT_FORMAT]);
    } catch {}
  }, []);

  const fetchDesigns = useCallback(async (authToken) => {
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    try {
      const res = await axios.get(`${BACKEND_URL}/api/designs`, { headers });
      setDesigns(Array.isArray(res.data) ? res.data : []);
    } catch {}
  }, []);

  useEffect(() => {
    if (token) {
      fetchSettings(token);
      fetchFormats(token);
      fetchDesigns(token);
    } else {
      setSettings(DEFAULT_SETTINGS);
      setFormats([DEFAULT_FORMAT]);
      setDesigns([]);
      setLoaded(true);
    }
  }, [token, fetchSettings, fetchFormats, fetchDesigns]);

  const setSelectedFormatId = useCallback((id) => {
    _setSelFmtId(id);
    localStorage.setItem(SELECTED_FORMAT_KEY, id);
  }, []);

  const updateSettings = useCallback((s) => {
    setSettings(prev => ({ ...prev, ...s }));
  }, []);

  // Resolve format: if it has design_id, pull elements from the catalog design
  const resolveFormat = useCallback((fmt) => {
    if (!fmt) return fmt;
    if (fmt.design_id) {
      const safeDesigns = Array.isArray(designs) ? designs : [];
      const design = safeDesigns.find(d => d.id === fmt.design_id);
      if (design?.elements?.length > 0) {
        return { ...fmt, elements: design.elements, _designName: design.name };
      }
    }
    return fmt;
  }, [designs]);

  const safeFormats = Array.isArray(formats) ? formats : [DEFAULT_FORMAT];
  const selectedFormat = safeFormats.find(f => f.id === selectedFormatId) || safeFormats[0] || DEFAULT_FORMAT;

  return (
    <SettingsContext.Provider value={{
      settings, setSettings, updateSettings, fetchSettings,
      formats, setFormats, fetchFormats,
      designs, setDesigns, fetchDesigns,
      selectedFormat, selectedFormatId, setSelectedFormatId,
      resolveFormat,
      loaded,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useAppSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within SettingsProvider');
  return ctx;
}
