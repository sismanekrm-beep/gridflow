import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Package, Tag, PlusCircle, ChevronRight, TrendingUp, Settings } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const PRIMARY = '#0B4F8A';
const BORDER = '#E2E8F0';
const MUTED = '#64748B';
const CARD_BG = '#FFFFFF';

export default function Dashboard() {
  const [stats, setStats] = useState({ total_products: 0, recent_products: [] });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/stats`)
      .then((r) => { setStats(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const formatDate = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return ''; }
  };

  const card = {
    border: `1px solid ${BORDER}`,
    borderRadius: '12px',
    backgroundColor: CARD_BG,
    boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
  };

  const quickActions = [
    { label: 'Yeni Ürün', icon: PlusCircle, to: '/products', desc: 'Ürün ekle' },
    { label: 'Etiket Hazırla', icon: Tag, to: '/label-prep', desc: 'Etiket oluştur' },
    { label: 'Ürün Listesi', icon: Package, to: '/products', desc: 'Tüm ürünler' },
    { label: 'Ayarlar', icon: Settings, to: '/settings', desc: 'Marka ayarları' },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
            Gösterge Paneli
          </h1>
          <p style={{ fontSize: '13px', color: MUTED, marginTop: '4px' }}>Ürün ve etiket yönetimine hoş geldiniz</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/label-prep')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, backgroundColor: PRIMARY, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
            data-testid="dashboard-go-to-label-prep-button"
          >
            <Tag size={15} /> Etiket Hazırla
          </button>
          <button
            onClick={() => navigate('/products')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, backgroundColor: '#fff', color: '#0F172A', border: `1px solid ${BORDER}`, borderRadius: '8px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
            data-testid="dashboard-create-product-button"
          >
            <PlusCircle size={15} /> Yeni Ürün
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div
          style={{ ...card, padding: '20px', cursor: 'pointer' }}
          onClick={() => navigate('/products')}
          data-testid="dashboard-kpi-total-products"
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '13px', color: MUTED, fontWeight: 500, margin: 0 }}>Toplam Ürün</p>
              <p style={{ fontSize: '36px', fontWeight: 700, color: '#0F172A', margin: '4px 0', fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
                {loading ? '...' : stats.total_products}
              </p>
              <p style={{ fontSize: '12px', color: MUTED, margin: 0 }}>Kayıtlı ürün sayısı</p>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(11,79,138,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Package size={22} color={PRIMARY} />
            </div>
          </div>
        </div>

        <div style={{ ...card, padding: '20px' }} data-testid="dashboard-kpi-recent-additions">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '13px', color: MUTED, fontWeight: 500, margin: 0 }}>Son Eklenenler</p>
              <p style={{ fontSize: '36px', fontWeight: 700, color: '#0F172A', margin: '4px 0', fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
                {loading ? '...' : stats.recent_products?.length || 0}
              </p>
              <p style={{ fontSize: '12px', color: MUTED, margin: 0 }}>Son 8 eklenen ürün</p>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(14,116,144,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TrendingUp size={22} color='#0E7490' />
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {quickActions.map(({ label, icon: Icon, to, desc }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            style={{ padding: '14px', border: `1px solid ${BORDER}`, borderRadius: '10px', backgroundColor: CARD_BG, textAlign: 'left', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.borderColor = 'rgba(11,79,138,0.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = CARD_BG; e.currentTarget.style.borderColor = BORDER; }}
          >
            <Icon size={16} color={PRIMARY} style={{ marginBottom: '8px', display: 'block' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{label}</div>
            <div style={{ fontSize: '11px', color: MUTED, marginTop: '2px' }}>{desc}</div>
          </button>
        ))}
      </div>

      {/* ── Recent Products Table ── */}
      <div style={{ ...card }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${BORDER}` }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
            Son Eklenen Ürünler
          </h2>
          <button
            onClick={() => navigate('/products')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: PRIMARY, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
          >
            Tümünü gör <ChevronRight size={14} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '24px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: '36px', backgroundColor: '#F1F5F9', borderRadius: '6px', marginBottom: '8px' }} />
            ))}
          </div>
        ) : stats.recent_products.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Package size={36} color='#CBD5E1' style={{ margin: '0 auto 10px', display: 'block' }} />
            <p style={{ color: MUTED, fontSize: '14px', margin: '0 0 8px' }}>Henüz ürün eklenmemiş</p>
            <button
              onClick={() => navigate('/products')}
              style={{ color: PRIMARY, background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: "'Inter', sans-serif" }}
            >
              Ürün ekle
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC' }}>
                  {['Kod', 'Ürün Adı', 'Ölçü', 'Standart', 'Tarih'].map((h, i) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: i === 4 ? 'right' : 'left', fontSize: '11px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recent_products.map((p) => (
                  <tr key={p.id || p.code} style={{ borderBottom: `1px solid ${BORDER}` }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', fontWeight: 700, color: PRIMARY, backgroundColor: 'rgba(11,79,138,0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                        {p.code}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', fontWeight: 500, color: '#0F172A' }}>{p.name}</td>
                    <td style={{ padding: '10px 16px', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{p.measurement || '-'}</td>
                    <td style={{ padding: '10px 16px', color: MUTED }}>{p.standard_code || '-'}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: MUTED, fontSize: '12px' }}>{formatDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
