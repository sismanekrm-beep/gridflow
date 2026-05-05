import { useState } from 'react';
import { Crown, Check, X, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const PRIMARY = '#0B4F8A';

export default function PremiumModal({ onClose }) {
  const { upgradeToPremium } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      await upgradeToPremium();
      toast.success('🎉 Premium üyeliğiniz aktifleştirildi! Tüm özellikler açıldı.');
      onClose?.();
    } catch {
      toast.error('İşlem başarısız, lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'Sınırsız etiket yazdırma',
    'Sınırsız ürün & adres',
    'Özel etiket tasarımcısı',
    'Excel toplu içe aktarma',
    'Kategori yönetimi',
    'Adres etiketi & zarf baskısı',
    'Tasarım kataloğu',
    'Öncelikli destek',
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '20px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${PRIMARY}, #0E7490)`, padding: '28px 28px 24px', position: 'relative', color: '#fff' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <X size={14} />
          </button>
          <div style={{ width: '48px', height: '48px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Crown size={26} color='#FDE68A' />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>
            Premium'a Yüksel
          </h2>
          <p style={{ fontSize: '14px', opacity: 0.85, margin: 0 }}>
            Tüm özellikleri sınırsız kullanın
          </p>
        </div>

        {/* Price */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', backgroundColor: '#F0F7FF' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '36px', fontWeight: 800, color: PRIMARY, fontFamily: "'Space Grotesk','Inter',sans-serif" }}>$5</span>
            <span style={{ fontSize: '14px', color: '#64748B' }}>/ay</span>
            <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 600, marginTop: '2px' }}>30 gün ücretsiz deneyin</div>
          </div>
        </div>

        {/* Features */}
        <div style={{ padding: '20px 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '22px' }}>
            {features.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151' }}>
                <Check size={14} color='#16A34A' style={{ flexShrink: 0 }} />
                {f}
              </div>
            ))}
          </div>

          <button onClick={handleUpgrade} disabled={loading}
            style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700, backgroundColor: loading ? '#94A3B8' : PRIMARY, color: '#fff', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
            {loading
              ? <><div style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />İşleniyor...</>
              : <><Zap size={17} /> Hemen Premium'a Geç — $5/ay</>
            }
          </button>

          <p style={{ textAlign: 'center', fontSize: '11px', color: '#94A3B8' }}>
            Demo mod: Gerçek ödeme alınmaz • Stripe entegrasyonu için hazır yapı
          </p>
        </div>
      </div>
    </div>
  );
}
