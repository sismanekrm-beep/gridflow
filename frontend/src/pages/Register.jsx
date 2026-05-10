import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const PRIMARY = '#0B4F8A';

function SocialButton({ icon, label, color, onClick }) {
  return (
    <button onClick={onClick}
      style={{ width: '100%', padding: '10px 14px', fontSize: '13px', fontWeight: 600, backgroundColor: '#fff', border: '1.5px solid #E2E8F0', borderRadius: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#374151', transition: 'border-color 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.backgroundColor = '#fff'; }}>
      {icon}<span>{label}</span>
    </button>
  );
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const BENEFITS = [
  { icon: '♾️', text: 'Sınırsız tasarım kaydı ve yazdırma' },
  { icon: '🏷️', text: '500+ ürün & kategori yönetimi' },
  { icon: '📎', text: '32 farklı TANEX etiket formatı' },
  { icon: '📊', text: 'Excel ile toplu ürün yükleme' },
  { icon: '📍', text: 'Adres etiketi & zarf baskısı' },
  { icon: '🎨', text: '"Görsel etiket tasarımcısı' },
];

export default function Register() {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [pass2, setPass2]       = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const { register, loginWithGoogle } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  // Smart redirect after registration
  const from = location.state?.from?.pathname || location.state?.from || '/label-prep';

  const handleGoogleCredential = async (credential) => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle(credential);
      navigate(typeof from === 'string' ? from : '/label-prep', { replace: true });
      toast.success('Google ile giriş yapıldı!');
    } catch (err) {
      setError(err.response?.data?.detail || 'Google ile kayıt başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = () => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) {
      toast.error('Google OAuth henüz yapılandırılmamış. .env dosyasına REACT_APP_GOOGLE_CLIENT_ID ekleyin.');
      return;
    }
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({ client_id: clientId, callback: (r) => handleGoogleCredential(r.credential) });
      window.google.accounts.id.prompt();
    } else {
      toast.info('Google Sign-In yükleniyor, lütfen tekrar deneyin.');
    }
  };

  const strength = () => {
    if (!password) return null;
    if (password.length < 6) return { label: 'Zayıf', color: '#DC2626' };
    if (password.length < 10) return { label: 'Orta', color: '#D97706' };
    return { label: 'Güçlü', color: '#16A34A' };
  };
  const str = strength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== pass2) { setError('Şifreler eşleşmiyor'); return; }
    if (password.length < 6) { setError('Şifre en az 6 karakter olmalı'); return; }
    setLoading(true);
    try {
      await register(email, password, name);
      // Navigate back to where they came from (e.g. /label-prep with existing items)
      navigate(typeof from === 'string' ? from : '/label-prep', { replace: true });
      toast.success('🎉 Hoş geldiniz! Verileriniz kaydedildi.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Kayıt başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F0F7FF', display: 'flex', padding: '24px', fontFamily: "'Inter','Arial',sans-serif", gap: '24px', alignItems: 'flex-start', justifyContent: 'center' }}>

      {/* Benefits panel (left, desktop) */}
      <div style={{ width: '280px', flexShrink: 0, paddingTop: '80px', display: 'none' }} className="benefits-panel">
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>Neden GridFlow?</h3>
        {BENEFITS.map(b => (
          <div key={b.text} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
            <span style={{ fontSize: '18px' }}>{b.icon}</span>
            <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>{b.text}</span>
          </div>
        ))}
      </div>

      {/* Register form */}
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img src="/logo.png" alt="GridFlow" style={{ height: '72px', objectFit: 'contain' }} />
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '26px 28px', boxShadow: '0 4px 24px rgba(11,79,138,0.08)', border: '1px solid #E2E8F0' }}>
          <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>Hesap Oluştur</h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 18px' }}>7 gün ücretsiz, kredi kartı gerektirmez</p>

          {/* Membership benefits note */}
          <div style={{ padding: '12px 14px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '9px', marginBottom: '18px' }}>
            <p style={{ fontSize: '12px', color: '#166534', fontWeight: 600, margin: '0 0 6px' }}>💡 Üye olduğunuzda:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              {BENEFITS.slice(0,4).map(b => (
                <div key={b.text} style={{ fontSize: '11px', color: '#15803D', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={11} /> {b.text.replace(/^🏷️ |^📎 |^📊 |^267e️|^📍 |^🎨 /, '')}
                </div>
              ))}
            </div>
          </div>

          {/* Social buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <SocialButton icon={<GoogleIcon />} label="Google ile Kayıt Ol" color="#4285F4" onClick={handleGoogleClick} />
            <SocialButton icon={<LinkedInIcon />} label="LinkedIn ile Kayıt Ol" color="#0A66C2" onClick={() => toast.info('LinkedIn ile kayıt yakında!')} />
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>veya e-posta ile</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', color: '#DC2626' }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />{error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Name */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Ad Soyad / Firma</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ahmet Yılmaz" required
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: '13px', border: '1.5px solid #E2E8F0', borderRadius: '8px', outline: 'none', color: '#0F172A', fontFamily: "'Inter',sans-serif" }}
                onFocus={e => e.target.style.borderColor = PRIMARY} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
            </div>
            {/* Email */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>E-posta</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ornek@firma.com" required
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: '13px', border: '1.5px solid #E2E8F0', borderRadius: '8px', outline: 'none', color: '#0F172A', fontFamily: "'Inter',sans-serif" }}
                onFocus={e => e.target.style.borderColor = PRIMARY} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
            </div>
            {/* Password */}
            <div style={{ marginBottom: '4px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Şifre</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="En az 6 karakter" required
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 38px 9px 12px', fontSize: '13px', border: '1.5px solid #E2E8F0', borderRadius: '8px', outline: 'none', color: '#0F172A', fontFamily: "'Inter',sans-serif" }}
                  onFocus={e => e.target.style.borderColor = PRIMARY} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {str && <p style={{ fontSize: '11px', color: str.color, margin: '3px 0 10px', fontWeight: 500 }}>Şifre: {str.label}</p>}
            {/* Confirm */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Şifre Tekrar</label>
              <input type={showPass ? 'text' : 'password'} value={pass2} onChange={e => setPass2(e.target.value)} placeholder="Aynı şifre" required
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: '13px', border: `1.5px solid ${pass2 && pass2 !== password ? '#FCA5A5' : '#E2E8F0'}`, borderRadius: '8px', outline: 'none', color: '#0F172A', fontFamily: "'Inter',sans-serif" }}
                onFocus={e => e.target.style.borderColor = PRIMARY} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
            </div>
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '11px', fontSize: '14px', fontWeight: 700, backgroundColor: loading ? '#94A3B8' : PRIMARY, color: '#fff', border: 'none', borderRadius: '9px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {loading ? <><div style={{ width: '14px', height: '14px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Oluşturuluyor...</> : 'Hesap Oluştur — Ücretsiz'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '12px', color: '#64748B', marginTop: '14px' }}>
            Zaten hesabınız var mı?{' '}
            <Link to="/login" state={{ from }} style={{ color: PRIMARY, fontWeight: 600, textDecoration: 'none' }}>Giriş Yap</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
