import { useNavigate } from 'react-router-dom';
import { UserPlus, LogIn, Printer, Tag } from 'lucide-react';

const PRIMARY = '#0B4F8A';

/**
 * Shown when a guest user attempts to print and has
 * reached the MAX_GUEST_PRINTS limit (default: 3).
 * 
 * Props:
 *   onClose  - close the modal
 *   from     - path to return to after auth (e.g. '/label-prep')
 *   printCount - how many prints were done
 */
export default function GuestLimitModal({ onClose, from = '/label-prep', printCount = 3 }) {
  const navigate = useNavigate();

  const goTo = (path) => {
    onClose?.();
    navigate(path, { state: { from } });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '20px', width: '100%', maxWidth: '420px', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.25)', fontFamily: "'Inter','Arial',sans-serif" }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #0B4F8A, #0E7490)', padding: '28px 28px 22px', color: '#fff', textAlign: 'center' }}>
          <div style={{ width: '52px', height: '52px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Printer size={26} color='#FDE68A' />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>
            Yazdırma Sınırına Ulaştınız
          </h2>
          <p style={{ fontSize: '14px', opacity: 0.85, margin: 0 }}>
            {printCount}/{printCount} ücretsiz yazdırma hakkı kullanıldı
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ height: '4px', backgroundColor: '#FDE68A', width: '100%' }} />

        {/* Body */}
        <div style={{ padding: '24px 28px' }}>
          <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6, margin: '0 0 18px', textAlign: 'center' }}>
            Devam etmek ve <strong>tasarımlarınızı kaydetmek</strong> için
            ücretsiz bir hesap oluşturun. Verileriniz hemen kurtarılacak!
          </p>

          {/* Benefits */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', backgroundColor: '#F0F7FF', borderRadius: '10px', marginBottom: '20px' }}>
            {[
              '✓ Sınırsız yazdırma',
              '✓ 500+ ürün kaydı',
              '✓ Tasarımlarınız güvende',
              '✓ Kategori & etiket yönetimi',
            ].map(b => (
              <div key={b} style={{ fontSize: '13px', color: '#1D4ED8', fontWeight: 500 }}>{b}</div>
            ))}
          </div>

          {/* Action buttons */}
          <button onClick={() => goTo('/register')}
            style={{ width: '100%', padding: '13px', fontSize: '14px', fontWeight: 700, backgroundColor: PRIMARY, color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
            <UserPlus size={17} /> Ücretsiz Hesap Oluştur
          </button>

          <button onClick={() => goTo('/login')}
            style={{ width: '100%', padding: '11px', fontSize: '14px', fontWeight: 600, backgroundColor: '#fff', color: PRIMARY, border: `1.5px solid ${PRIMARY}`, borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
            <LogIn size={16} /> Zaten Hesabım Var — Giriş Yap
          </button>

          <button onClick={onClose}
            style={{ width: '100%', padding: '9px', fontSize: '13px', color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}>
            Şimdilik devam et (yazdırma devre dışı)
          </button>
        </div>
      </div>
    </div>
  );
}
