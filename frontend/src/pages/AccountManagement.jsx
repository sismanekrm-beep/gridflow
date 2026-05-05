import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  User, Lock, Crown, Receipt, LogOut, Trash2,
  Save, Eye, EyeOff, CheckCircle, AlertTriangle, Info
} from 'lucide-react';
import PremiumModal from '../components/PremiumModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const BORDER  = '#E2E8F0';
const PRIMARY = '#0B4F8A';
const MUTED   = '#64748B';
const TRIAL_DAYS = 7;

const S = {
  card: { border: `1px solid ${BORDER}`, borderRadius: '12px', backgroundColor: '#FFFFFF', padding: '22px 24px', boxShadow: '0 1px 3px rgba(15,23,42,0.05)', marginBottom: '16px' },
  h2:   { fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px', fontFamily: "'Space Grotesk','Inter',sans-serif", display: 'flex', alignItems: 'center', gap: '8px' },
  label: { display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' },
  input: { width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: '13px', border: `1px solid ${BORDER}`, borderRadius: '8px', outline: 'none', color: '#0F172A', backgroundColor: '#FFFFFF', fontFamily: "'Inter',sans-serif" },
  btn: (c = PRIMARY) => ({ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, backgroundColor: c, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: "'Inter',sans-serif" }),
  btnOutline: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, backgroundColor: '#fff', color: '#374151', border: `1px solid ${BORDER}`, borderRadius: '8px', cursor: 'pointer' },
};

function Section({ icon, title, children }) {
  return (
    <div style={S.card}>
      <h2 style={S.h2}>{icon}{title}</h2>
      {children}
    </div>
  );
}

export default function AccountManagement() {
  const { user, logout, upgradeToPremium, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Personal info
  const [name, setName]   = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password
  const [curPass, setCurPass]   = useState('');
  const [newPass, setNewPass]   = useState('');
  const [newPass2, setNewPass2] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  // Billing
  const [billing, setBilling] = useState({
    company_name: '', tax_office: '', tax_number: '',
    billing_address: '', billing_phone: '', billing_email: '',
  });
  const [savingBilling, setSavingBilling] = useState(false);

  // Modals
  const [showPremium, setShowPremium] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Load user data
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      if (user.billing) setBilling({ ...billing, ...user.billing });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Trial progress ────────────────────────────────────────────────────
  const trialDaysLeft = (() => {
    if (!user?.created_at) return TRIAL_DAYS;
    const ms   = Date.now() - new Date(user.created_at).getTime();
    const days = Math.floor(ms / 86400000);
    return Math.max(0, TRIAL_DAYS - days);
  })();
  const trialPct = Math.max(0, Math.min(100, (trialDaysLeft / TRIAL_DAYS) * 100));
  const trialColor = trialDaysLeft > 3 ? '#16A34A' : trialDaysLeft > 1 ? '#D97706' : '#DC2626';

  // ── Save profile ───────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!name.trim()) { toast.error('Ad Soyad boş olamaz'); return; }
    setSavingProfile(true);
    try {
      const res = await axios.put(`${BACKEND_URL}/api/auth/profile`, { name, email });
      // Update token with new data
      if (res.data.access_token) {
        localStorage.setItem('es_auth_token', res.data.access_token);
        localStorage.setItem('es_auth_user', JSON.stringify(res.data.user));
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;
      }
      await refreshUser();
      toast.success('Profil güncellendi!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Güncelleme başarısız');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────
  const changePassword = async (e) => {
    e.preventDefault();
    if (newPass !== newPass2) { toast.error('Yeni şifreler eşleşmiyor'); return; }
    if (newPass.length < 6)  { toast.error('Yeni şifre en az 6 karakter olmalı'); return; }
    setSavingPass(true);
    try {
      await axios.put(`${BACKEND_URL}/api/auth/password`, { current_password: curPass, new_password: newPass });
      toast.success('Şifre başarıyla değiştirildi!');
      setCurPass(''); setNewPass(''); setNewPass2('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Şifre değiştirme başarısız');
    } finally {
      setSavingPass(false);
    }
  };

  // ── Save billing ───────────────────────────────────────────────────────
  const saveBilling = async () => {
    setSavingBilling(true);
    try {
      await axios.put(`${BACKEND_URL}/api/auth/billing`, billing);
      toast.success('Fatura bilgileri kaydedildi!');
    } catch {
      toast.error('Kaydetme başarısız');
    } finally {
      setSavingBilling(false);
    }
  };

  // ── Delete account ─────────────────────────────────────────────────────
  const deleteAccount = async () => {
    if (deleteInput !== user?.email) {
      toast.error('E-posta adresi eşleşmiyor'); return;
    }
    setDeleting(true);
    try {
      await axios.delete(`${BACKEND_URL}/api/auth/account`);
      logout();
      toast.success('Hesabınız ve tüm verileriniz silindi.');
      navigate('/login');
    } catch {
      toast.error('Silme işlemi başarısız');
      setDeleting(false);
    }
  };

  const inp = (val, onChange, rest = {}) => (
    <input
      value={val}
      onChange={e => onChange(e.target.value)}
      style={S.input}
      onFocus={e => e.target.style.borderColor = PRIMARY}
      onBlur={e => e.target.style.borderColor = BORDER}
      {...rest}
    />
  );

  return (
    <div style={{ padding: '24px', maxWidth: '720px', margin: '0 auto', fontFamily: "'Inter','Arial',sans-serif" }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Space Grotesk','Inter',sans-serif" }}>Hesap Yönetimi</h1>
        <p style={{ fontSize: '13px', color: MUTED, marginTop: '4px' }}>Hesap bilgilerinizi ve aboneliğinizi yönetin</p>
      </div>

      {/* ── 1. Kişisel Bilgiler ── */}
      <Section icon={<User size={16} color={PRIMARY} />} title="Kişisel Bilgiler">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
          <div>
            <label style={S.label}>Ad Soyad / Firma</label>
            {inp(name, setName, { placeholder: 'Ahmet Yılmaz' })}
          </div>
          <div>
            <label style={S.label}>E-posta</label>
            {inp(email, setEmail, { type: 'email', placeholder: 'ornek@firma.com' })}
          </div>
        </div>
        <button onClick={saveProfile} disabled={savingProfile} style={S.btn()}>
          {savingProfile
            ? <><div style={{ width: '13px', height: '13px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Kaydediliyor...</>
            : <><Save size={14} />Kaydet</>
          }
        </button>
      </Section>

      {/* ── 2. Güvenlik ── */}
      <Section icon={<Lock size={16} color='#7C3AED' />} title="Güvenlik — Şifre Değiştir">
        <form onSubmit={changePassword}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={S.label}>Mevcut Şifre</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'} value={curPass}
                  onChange={e => setCurPass(e.target.value)} placeholder="••••••••" required
                  style={{ ...S.input, paddingRight: '38px' }}
                  onFocus={e => e.target.style.borderColor = PRIMARY}
                  onBlur={e => e.target.style.borderColor = BORDER}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={S.label}>Yeni Şifre</label>
                {inp(newPass, setNewPass, { type: showPwd ? 'text' : 'password', placeholder: 'En az 6 karakter', required: true })}
              </div>
              <div>
                <label style={S.label}>Yeni Şifre Tekrar</label>
                <input
                  type={showPwd ? 'text' : 'password'} value={newPass2}
                  onChange={e => setNewPass2(e.target.value)} placeholder="Aynı şifre" required
                  style={{ ...S.input, borderColor: newPass2 && newPass2 !== newPass ? '#FCA5A5' : BORDER }}
                  onFocus={e => e.target.style.borderColor = PRIMARY}
                  onBlur={e => e.target.style.borderColor = newPass2 && newPass2 !== newPass ? '#FCA5A5' : BORDER}
                />
              </div>
            </div>
          </div>
          <button type="submit" disabled={savingPass} style={S.btn('#7C3AED')}>
            {savingPass
              ? <><div style={{ width: '13px', height: '13px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Değiştiriliyor...</>
              : <><Lock size={14} />Şifreyi Değiştir</>
            }
          </button>
        </form>
      </Section>

      {/* ── 3. Abonelik ── */}
      <Section icon={<Crown size={16} color='#D97706' />} title="Abonelik">
        {user?.is_premium ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', backgroundColor: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: '10px' }}>
            <Crown size={22} color='#D97706' />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Premium Üye</div>
              <div style={{ fontSize: '13px', color: '#64748B' }}>Tüm özellikler aktif. Sınırsız kullanım.</div>
            </div>
            <CheckCircle size={20} color='#16A34A' style={{ marginLeft: 'auto' }} />
          </div>
        ) : (
          <div>
            {/* Trial progress */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  {trialDaysLeft > 0 ? `Ücretsiz deneme: ${trialDaysLeft} gün kaldı` : 'Ücretsiz deneme süresi doldu'}
                </span>
                <span style={{ fontSize: '12px', color: trialColor, fontWeight: 600 }}>
                  {Math.round(trialPct)}%
                </span>
              </div>
              <div style={{ height: '10px', backgroundColor: '#E2E8F0', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${trialPct}%`, backgroundColor: trialColor, borderRadius: '99px', transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: MUTED, marginTop: '4px' }}>
                <span>Başlangıç</span>
                <span>7 gün deneme</span>
              </div>
            </div>

            {/* Features comparison */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              {[
                { label: 'Yazdırma', free: '3 hak', premium: 'Sınırsız' },
                { label: 'Ürün kaydı', free: '—', premium: '500+' },
                { label: 'Etiket tasarımı', free: '—', premium: '✓' },
                { label: 'Excel yükleme', free: '—', premium: '✓' },
              ].map(r => (
                <div key={r.label} style={{ padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: '8px', backgroundColor: '#F8FAFC', fontSize: '12px' }}>
                  <div style={{ fontWeight: 600, color: '#374151', marginBottom: '4px' }}>{r.label}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ color: '#94A3B8' }}>Ücretsiz: {r.free}</span>
                    <span style={{ color: '#15803D', fontWeight: 600 }}>Premium: {r.premium}</span>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setShowPremium(true)} style={{ ...S.btn('#D97706'), fontSize: '14px', padding: '11px 22px' }}>
              <Crown size={16} /> Premium'a Geç — $5/ay
            </button>
          </div>
        )}
      </Section>

      {/* ── 4. Fatura Bilgileri ── */}
      <Section icon={<Receipt size={16} color='#0E7490' />} title="Fatura Bilgileri (Opsiyonel)">
        <p style={{ fontSize: '12px', color: MUTED, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Info size={13} />
          Abonelik faturası için kurumsal bilgilerinizi girin. Doldurmazsanız bireysel fatura kesılır.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={S.label}>Firma Adı</label>
            {inp(billing.company_name, v => setBilling(b => ({ ...b, company_name: v })), { placeholder: 'ABC Ltd. Şti.' })}
          </div>
          <div>
            <label style={S.label}>Vergi Dairesi</label>
            {inp(billing.tax_office, v => setBilling(b => ({ ...b, tax_office: v })), { placeholder: 'Çankaya V.D.' })}
          </div>
          <div>
            <label style={S.label}>Vergi / TC Kimlik No</label>
            {inp(billing.tax_number, v => setBilling(b => ({ ...b, tax_number: v })), { placeholder: '1234567890', style: { ...S.input, fontFamily: "'IBM Plex Mono',monospace" } })}
          </div>
          <div>
            <label style={S.label}>Fatura E-posta</label>
            {inp(billing.billing_email, v => setBilling(b => ({ ...b, billing_email: v })), { type: 'email', placeholder: 'fatura@firma.com' })}
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={S.label}>Fatura Adresi</label>
            {inp(billing.billing_address, v => setBilling(b => ({ ...b, billing_address: v })), { placeholder: 'Tam adres...' })}
          </div>
        </div>
        <button onClick={saveBilling} disabled={savingBilling} style={S.btn('#0E7490')}>
          {savingBilling
            ? <><div style={{ width: '13px', height: '13px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Kaydediliyor...</>
            : <><Save size={14} />Fatura Bilgilerini Kaydet</>
          }
        </button>
      </Section>

      {/* ── 5. Çıkış & Silme ── */}
      <Section icon={<AlertTriangle size={16} color='#DC2626' />} title="Güvenli Çıkış & Hesap Silme">
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <button onClick={() => { logout(); navigate('/login'); }} style={S.btnOutline}>
            <LogOut size={14} /> Güvenli Çıkış Yap
          </button>
        </div>

        {/* Danger zone */}
        <div style={{ padding: '16px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#DC2626', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Trash2 size={15} /> Hesabı Kalıcı Olarak Sil (GDPR)
          </h3>
          <p style={{ fontSize: '12px', color: '#7F1D1D', margin: '0 0 12px', lineHeight: 1.5 }}>
            Bu işlem geri alınamaz. Tüm ürünleriniz, adresleriniz, tasarımlarınız ve hesap bilgileriniz
            kalıcı olarak silinir.
          </p>
          <button onClick={() => setShowDeleteConfirm(true)}
            style={{ ...S.btn('#DC2626'), fontSize: '12px', padding: '7px 14px' }}>
            <Trash2 size={13} /> Hesabımı Sil
          </button>
        </div>
      </Section>

      {/* Premium Modal */}
      {showPremium && <PremiumModal onClose={() => setShowPremium(false)} />}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: '#FEF2F2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={24} color='#DC2626' />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', textAlign: 'center', margin: '0 0 8px', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>
              Hesabı Sil
            </h2>
            <p style={{ fontSize: '13px', color: MUTED, textAlign: 'center', margin: '0 0 20px', lineHeight: 1.6 }}>
              Bu işlem <strong style={{ color: '#DC2626' }}>geri alınamaz</strong>. Tüm verileriniz kalıcı olarak silinecek.
              Onaylamak için e-posta adresinizi yazın:
            </p>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ ...S.label, color: '#DC2626' }}>{user?.email}</label>
              <input
                value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
                placeholder="E-posta adresinizi girin"
                style={{ ...S.input, borderColor: deleteInput && deleteInput !== user?.email ? '#FCA5A5' : BORDER }}
                onFocus={e => e.target.style.borderColor = '#DC2626'}
                onBlur={e => e.target.style.borderColor = BORDER}
              />
            </div>
            <p style={{ fontSize: '11px', color: '#94A3B8', margin: '0 0 20px' }}>
              Yazılan adres hesabınızla eşleşmelidir.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                style={{ ...S.btnOutline, flex: 1, justifyContent: 'center' }}>İptal</button>
              <button
                onClick={deleteAccount}
                disabled={deleteInput !== user?.email || deleting}
                style={{ ...S.btn('#DC2626'), flex: 1, justifyContent: 'center', opacity: deleteInput !== user?.email || deleting ? 0.5 : 1, cursor: deleteInput !== user?.email || deleting ? 'not-allowed' : 'pointer' }}>
                {deleting
                  ? <><div style={{ width: '13px', height: '13px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Siliniyor...</>
                  : <><Trash2 size={14} />Hesabı Sil</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
