import React from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// Envelope: 240mm × 105mm natural landscape orientation
// Rotated 90° CW for portrait (dik) printing

const EnvelopeLabelCard = React.forwardRef(({ address, settings }, ref) => {
  const a = address || {};
  const brandName  = settings?.brand_name  || '';
  const brandLogo  = settings?.brand_logo_url ? `${BACKEND_URL}${settings.brand_logo_url}` : null;
  const senderAddr = settings?.sender_address || '';

  const envFont        = settings?.envelope_font_family       || "'Inter','Arial',sans-serif";
  const senderFontSize = settings?.envelope_sender_font_size  || 6.5;
  const rcpNameSize    = settings?.envelope_recipient_name_size || 11;
  const rcpAddrSize    = settings?.envelope_recipient_addr_size || 8.5;

  // ── Layout settings ──────────────────────────────────────────────────
  const showLogo   = settings?.envelope_show_logo   !== false;
  const showSender = settings?.envelope_show_sender !== false;
  const showStamp  = settings?.envelope_show_stamp  !== false;

  const lx = settings?.envelope_logo_x   ?? 7;
  const ly = settings?.envelope_logo_y   ?? 5;
  const lw = settings?.envelope_logo_w   ?? (settings?.brand_logo_w ?? 50);
  const lh = settings?.envelope_logo_h   ?? (settings?.brand_logo_h ?? 12);

  const sx = settings?.envelope_sender_x ?? 7;
  const sy = settings?.envelope_sender_y ?? 18;
  const sw = settings?.envelope_sender_w ?? 60;
  const sh = settings?.envelope_sender_h ?? 18;

  const stx = settings?.envelope_stamp_x ?? 207;
  const sty = settings?.envelope_stamp_y ?? 5;
  const stw = settings?.envelope_stamp_w ?? 25;
  const sth = settings?.envelope_stamp_h ?? 30;

  const rx = settings?.envelope_recipient_x ?? 60;
  const ry = settings?.envelope_recipient_y ?? 28;
  const rw = settings?.envelope_recipient_w ?? 172;
  const rh = settings?.envelope_recipient_h ?? 65;

  const addrParts = [
    a.address_line1,
    a.address_line2,
    [a.district, a.city, a.postal_code].filter(Boolean).join('  '),
  ].filter(Boolean);

  const ENV_SIZES = { DL:{w:220,h:110}, C5:{w:229,h:162}, C6:{w:162,h:114}, C4:{w:324,h:229} };
  const sizeKey = settings?.envelope_size || 'DL';
  const envW = settings?.envelope_w || ENV_SIZES[sizeKey]?.w || 220;
  const envH = settings?.envelope_h || ENV_SIZES[sizeKey]?.h || 110;

  return (
    <div
      ref={ref}
      data-testid="envelope-label-card"
      style={{
        width: `${envW}mm`, height: `${envH}mm`,
        backgroundColor: '#FFFFFF',
        fontFamily: envFont,
        position: 'relative', overflow: 'hidden',
        boxSizing: 'border-box', userSelect: 'none',
      }}
    >
      {/* ── Logo ── */}
      {showLogo && (brandLogo || brandName) && (
        <div style={{
          position: 'absolute',
          left: `${lx}mm`, top: `${ly}mm`,
          width: `${lw}mm`, height: `${lh}mm`,
          overflow: 'hidden',
          display: 'flex', alignItems: 'center',
        }}>
          {brandLogo ? (
            <img src={brandLogo} alt="logo"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          ) : (
            <span style={{ fontSize: '8pt', fontWeight: 700, color: '#0F172A', fontFamily: "'Space Grotesk','Inter',sans-serif", lineHeight: 1.2 }}>
              {brandName}
            </span>
          )}
        </div>
      )}

      {/* ── Sender address ── */}
      {showSender && senderAddr && (
        <div style={{
          position: 'absolute',
          left: `${sx}mm`, top: `${sy}mm`,
          width: `${sw}mm`, height: `${sh}mm`,
          overflow: 'hidden',
        }}>
          {senderAddr.split('\n').map((line, i) => (
            <div key={i} style={{ fontSize: `${senderFontSize}pt`, color: '#64748B', lineHeight: 1.4, fontFamily: envFont }}>{line}</div>
          ))}
        </div>
      )}

      {/* ── Stamp area ── */}
      {showStamp && (
        <div style={{
          position: 'absolute',
          left: `${stx}mm`, top: `${sty}mm`,
          width: `${stw}mm`, height: `${sth}mm`,
          border: '0.5mm dashed #CBD5E1', borderRadius: '2mm',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '6pt', color: '#CBD5E1', textAlign: 'center', lineHeight: 1.5, whiteSpace: 'pre' }}>{'POSTA\nPULU'}</span>
        </div>
      )}

      {/* ── Recipient address ── */}
      <div style={{
        position: 'absolute',
        left: `${rx}mm`, top: `${ry}mm`,
        width: `${rw}mm`, height: `${rh}mm`,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <div style={{ fontSize: `${rcpNameSize}pt`, fontWeight: 800, color: '#0F172A', fontFamily: envFont, marginBottom: '2mm', lineHeight: 1.2 }}>
          {a.name || '—'}
        </div>
        {a.company && <div style={{ fontSize: `${rcpAddrSize}pt`, fontWeight: 600, color: '#374151', marginBottom: '1mm', lineHeight: 1.3, fontFamily: envFont }}>{a.company}</div>}
        {addrParts.map((line, i) => <div key={i} style={{ fontSize: `${rcpAddrSize}pt`, color: '#374151', lineHeight: 1.4, fontFamily: envFont }}>{line}</div>)}
        {a.phone && <div style={{ fontSize: `${Math.max(rcpAddrSize - 0.5, 6)}pt`, color: '#64748B', marginTop: '1.5mm', fontFamily: envFont }}>📞 {a.phone}</div>}
      </div>

      {/* ── Barcode (decorative) ── */}
      <div style={{ position: 'absolute', bottom: '3mm', left: '8mm', display: 'flex', gap: '1px', height: '5mm', alignItems: 'flex-end', opacity: 0.1 }}>
        {Array.from({ length: 28 }).map((_, i) => (
          <div key={i} style={{ width: i % 3 === 0 ? '2px' : '1px', height: i % 5 === 0 ? '100%' : '60%', backgroundColor: '#000' }} />
        ))}
      </div>
    </div>
  );
});

EnvelopeLabelCard.displayName = 'EnvelopeLabelCard';
export default EnvelopeLabelCard;
