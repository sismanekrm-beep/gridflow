import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Tag, Settings, Menu, X, FolderOpen, Palette, MapPin, Mail, Layers, LogOut, Crown, User } from 'lucide-react';
import { useState } from 'react';
import { useAppSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/dashboard',      icon: LayoutDashboard, label: 'Gösterge Paneli',   testId: 'nav-dashboard' },
  { to: '/categories',     icon: FolderOpen,      label: 'Kategoriler',        testId: 'nav-categories' },
  { to: '/products',       icon: Package,         label: 'Ürünler',            testId: 'nav-products' },
  { to: '/label-prep',     icon: Tag,             label: 'Etiket Hazırlama',   testId: 'nav-label-prep' },
  { to: '/addresses',      icon: MapPin,          label: 'Adresler',           testId: 'nav-addresses' },
  { to: '/address-labels', icon: Mail,            label: 'Adres Etiketi',      testId: 'nav-address-labels' },
  { to: '/designs',        icon: Layers,          label: 'Tasarımlarım',       testId: 'nav-designs' },
  { to: '/settings',       icon: Settings,        label: 'Şablon Oluştur',     testId: 'nav-settings' },
];

const PRIMARY = '#0B4F8A';
const PRIMARY_BG = 'rgba(11, 79, 138, 0.08)';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const CARD_BG = '#FFFFFF';
const SIDEBAR_W = 260;

function SidebarBody({ onNavClick }) {
  const navigate = useNavigate();
  const { formats, selectedFormatId } = useAppSettings();

  const openDesigner = () => {
    const fmtId = selectedFormatId || (formats[0]?.id);
    if (fmtId) {
      if (onNavClick) onNavClick();
      navigate(`/label-designer/${fmtId}`);
    }
  };
  return (
    <>
      <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
        {navItems.map(({ to, icon: Icon, label, testId }) => (
          <NavLink
            key={to}
            to={to}
            data-testid={testId}
            onClick={onNavClick}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              paddingLeft: isActive ? '9px' : '12px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: 500,
              textDecoration: 'none',
              color: isActive ? PRIMARY : MUTED,
              backgroundColor: isActive ? PRIMARY_BG : 'transparent',
              borderLeft: isActive ? `3px solid ${PRIMARY}` : '3px solid transparent',
              marginBottom: '2px',
              transition: 'background-color 0.15s ease, color 0.15s ease',
              cursor: 'pointer',
            })}
            onMouseEnter={(e) => {
              if (!e.currentTarget.style.backgroundColor.includes('0.08')) {
                e.currentTarget.style.backgroundColor = '#EEF2F7';
                e.currentTarget.style.color = '#0F172A';
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.style.backgroundColor.includes('0.08')) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = MUTED;
              }
            }}
          >
            <Icon size={18} style={{ flexShrink: 0 }} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Etiket Tasarımcısı kısayolu ── */}
      <div style={{ padding: '12px', borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <button
          onClick={openDesigner}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
            background: 'linear-gradient(135deg, #0B4F8A, #0E7490)',
            border: 'none', color: '#fff', fontFamily: "'Inter', sans-serif",
          }}
        >
          <Palette size={17} style={{ flexShrink: 0 }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>Etiket Tasarımcısı</div>
            <div style={{ fontSize: '10px', opacity: 0.8 }}>Görsel etiket düzenle</div>
          </div>
        </button>
      </div>

      <div style={{ padding: '12px 16px', borderTop: `1px solid ${BORDER}`, backgroundColor: '#F8FAFC', flexShrink: 0 }}>
        <div style={{ fontSize: '11px', color: MUTED, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, color: '#475569', marginBottom: '2px' }}>Etiket Formatı</div>
          {formats[0] ? <div>{formats.find(f=>f.id===selectedFormatId)?.name || formats[0]?.name} • {(formats.find(f=>f.id===selectedFormatId) || formats[0])?.label_width}×{(formats.find(f=>f.id===selectedFormatId) || formats[0])?.label_height}mm</div> : <div>TANEX TW-2024 • 64×34mm</div>}
        </div>
      </div>
    </>
  );
}

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout, isPremium, isAuthenticated, guestPrintsLeft, MAX_GUEST_PRINTS } = useAuth();
  const navigate = useNavigate();

  const logoSection = (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
      <img src="/logo.png" alt="GridFlow" style={{ height: '36px', objectFit: 'contain', maxWidth: '100%' }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#F7FAFC' }} data-testid="app-shell">

      {/* Desktop Sidebar */}
      <aside className="no-print" style={{ width: `${SIDEBAR_W}px`, minWidth: `${SIDEBAR_W}px`, display: 'flex', flexDirection: 'column', backgroundColor: CARD_BG, borderRight: `1px solid ${BORDER}`, height: '100vh', overflow: 'hidden' }} data-testid="sidebar-nav">
        {logoSection}
        <SidebarBody />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, backgroundColor: 'rgba(0,0,0,0.5)' }} />
      )}

      {/* Mobile drawer */}
      <aside className="no-print" style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50, width: `${SIDEBAR_W}px`, display: 'flex', flexDirection: 'column', backgroundColor: CARD_BG, borderRight: `1px solid ${BORDER}`, transform: mobileOpen ? 'translateX(0)' : `translateX(-${SIDEBAR_W + 20}px)`, transition: 'transform 0.2s ease', boxShadow: '4px 0 20px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <img src="/logo.png" alt="GridFlow" style={{ height: '36px', objectFit: 'contain', maxWidth: '180px' }} />
          <button onClick={() => setMobileOpen(false)} style={{ padding: '6px', borderRadius: '6px', background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
        <SidebarBody onNavClick={() => setMobileOpen(false)} />
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <header className="no-print" style={{ height: '56px', display: 'flex', alignItems: 'center', gap: '12px', padding: '0 20px', borderBottom: `1px solid ${BORDER}`, backgroundColor: 'rgba(247,250,252,0.95)', backdropFilter: 'blur(8px)', flexShrink: 0 }} data-testid="topbar">
          <button id="mobile-menu-btn" onClick={() => setMobileOpen(true)} style={{ padding: '6px', borderRadius: '6px', background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'none', alignItems: 'center' }}>
            <Menu size={20} />
          </button>
          <div style={{ flex: 1, padding: '5px 12px', borderRadius: '8px', background: 'linear-gradient(90deg, rgba(14,116,144,0.08), rgba(11,79,138,0.04), transparent)' }}>
            <span style={{ fontSize: '14px', color: MUTED, fontWeight: 500 }}>Ürün Kutu Etiket Yönetim Sistemi</span>
          </div>
          {/* User info + Premium + Logout OR Guest login prompt */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {isAuthenticated ? (
              <>
                {isPremium ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, backgroundColor: '#FEF9C3', color: '#854D0E', padding: '3px 10px', borderRadius: '20px', border: '1px solid #FDE68A' }}>
                    <Crown size={11} /> Premium
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', color: '#94A3B8', backgroundColor: '#F1F5F9', padding: '3px 8px', borderRadius: '20px' }}>Ücretsiz</span>
                )}
                <span
                  onClick={() => navigate('/account')}
                  title="Hesap Yönetimi"
                  style={{ fontSize: '12px', color: PRIMARY, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                  {user?.name || user?.email}
                </span>
                <button onClick={logout} title="Çıkış Yap" style={{ padding: '5px', borderRadius: '7px', border: '1px solid #E2E8F0', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748B' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = '#64748B'; }}>
                  <LogOut size={14} />
                </button>
              </>
            ) : (
              <>
                {/* Guest mode indicator */}
                <span style={{ fontSize: '11px', color: '#D97706', backgroundColor: '#FEF9C3', padding: '3px 8px', borderRadius: '20px', border: '1px solid #FDE68A', fontWeight: 600 }}>
                  Misafir ({guestPrintsLeft}/{MAX_GUEST_PRINTS} baskı)
                </span>
                <button onClick={() => navigate('/register')} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', fontSize: '12px', fontWeight: 600, backgroundColor: PRIMARY, color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer' }}>
                  <User size={13} /> Kayıt Ol
                </button>
                <button onClick={() => navigate('/login')} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', fontSize: '12px', fontWeight: 500, backgroundColor: '#fff', color: PRIMARY, border: `1px solid ${BORDER}`, borderRadius: '7px', cursor: 'pointer' }}>
                  Giriş
                </button>
              </>
            )}
          </div>
        </header>
        <main style={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>

      <style>{`@media (max-width: 768px) { #mobile-menu-btn { display: flex !important; } }`}</style>
    </div>
  );
}
