import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const PRIMARY = '#0B4F8A';

function SocialButton({ icon, label, color, onClick }) {
  return (
    <button onClick={onClick}
      style={{ width: '100%', padding: '10px 14px', fontSize: '13px', fontWeight: 600, backgroundColor: '#fff', border: '1.5px solid #E2E8F0', borderRadius: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#374151', transition: 'border-color 0.15s, background 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.backgroundColor = '#fff'; }}>
      {icon}
      <span>{label}</span>
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

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const { login, loginWithGoogle } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  // Smart redirect: go back to where user came from (e.g. /label-prep)
  const from = location.state?.from?.pathname || location.state?.from || '/label-prep';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(typeof from === 'string' ? from : '/label-prep', { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Giriş başarısız. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle(credential);
      navigate(typeof from === 'string' ? from : '/label-prep', { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Google ile giriş başarısız.');
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
      toast.info('Google Sign-In yükleniyor, lütfen bekleyin ve tekrar deneyin.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F0F7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Inter','Arial',sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '18px 32px', boxShadow: '0 4px 24px rgba(11,79,138,0.08)', border: '1px solid #E2E8F0', textAlign: 'center', marginBottom: '12px' }}>
          <img src="/logo.png" alt="GridFlow" style={{ height: '80px', objectFit: 'contain' }} />
          <p style={{ fontSize: '13px', color: '#64748B', margin: '8px 0 0' }}>Etiket Yönetim Platformu</p>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '28px 32px', boxShadow: '0 4px 24px rgba(11,79,138,0.08)', border: '1px solid #E2E8F0' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>Hoş Geldiniz</h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 22px' }}>Hesabınıza giriş yapın</p>

          {/* Social auth buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
            <SocialButton icon={<GoogleIcon />} label="Google ile Devam Et" color="#4285F4" onClick={handleGoogleClick} />
            <SocialButton icon={<LinkedInIcon />} label="LinkedIn ile Devam Et" color="#0A66C2" onClick={() => toast.info('LinkedIn ile giriş yakında!')} />
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
            <span style={{ fontSize: '12px', color: '#94A3B8', whiteSpace: 'nowrap' }}>veya e-posta ile</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#DC2626' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />{error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>E-posta</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ornek@firma.com" required autoFocus
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: '14px', border: '1.5px solid #E2E8F0', borderRadius: '9px', outline: 'none', color: '#0F172A', fontFamily: "'Inter',sans-serif" }}
                onFocus={e => e.target.style.borderColor = PRIMARY} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Şifre</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 42px 10px 14px', fontSize: '14px', border: '1.5px solid #E2E8F0', borderRadius: '9px', outline: 'none', color: '#0F172A', fontFamily: "'Inter',sans-serif" }}
                  onFocus={e => e.target.style.borderColor = PRIMARY} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 700, backgroundColor: loading ? '#94A3B8' : PRIMARY, color: '#fff', border: 'none', borderRadius: '9px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {loading ? <><div style={{ width: '15px', height: '15px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Giriş yapılıyor...</> : 'Giriş Yap'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748B', marginTop: '18px' }}>
            Hesabınız yok mu?{' '}
            <Link to="/register" state={{ from }} style={{ color: PRIMARY, fontWeight: 600, textDecoration: 'none' }}>Kayıt Ol</Link>
          </p>
        </div>

        {/* Guest option */}
        <p style={{ textAlign: 'center', marginTop: '16px' }}>
          <button onClick={() => navigate(typeof from === 'string' ? from : '/label-prep')}
            style={{ fontSize: '13px', color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Giriş yapmadan devam et (3 yazdırma hakkı)
          </button>
        </p>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#94A3B8', marginTop: '12px' }}>
          © 2025 GridFlow • Tüm hakları saklıdır
        </p>
      </div>
    </div>
  );
}
