import React from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// ── Address Label Card ────────────────────────────────────────────
const AddressLabelCard = React.forwardRef(({ address, format, settings }, ref) => {
  const W = format?.label_width  || 105;
  const H = format?.label_height || 42;
  const R = format?.border_radius ?? 3;
  const scale = Math.min(H / 42, W / 105);
  const fs = (base, min = 4) => `${Math.max(min, base * scale).toFixed(1)}pt`;

  const a = address || {};
  const brandName  = settings?.brand_name || '';
  const brandLogo  = settings?.brand_logo_url ? `${BACKEND_URL}${settings.brand_logo_url}` : null;

  const addressParts = [
    a.address_line1,
    a.address_line2,
    [a.district, a.city, a.postal_code].filter(Boolean).join(' / '),
  ].filter(Boolean);

  const contact = [a.phone, a.email].filter(Boolean).join('  •  ');

  return (
    <div
      ref={ref}
      data-testid="address-label-card"
      style={{
        width: `${W}mm`,
        height: `${H}mm`,
        boxSizing: 'border-box',
        overflow: 'hidden',
        borderRadius: `${R}mm`,
        border: 'none',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', 'Arial', sans-serif",
        userSelect: 'none',
        padding: `${H * 0.06}mm ${W * 0.04}mm`,
      }}
    >
      {/* Sender strip (top, small) */}
      {(brandName || brandLogo) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1.5mm',
          paddingBottom: `${H * 0.04}mm`,
          marginBottom: `${H * 0.04}mm`,
          borderBottom: '0.3mm solid #E5E7EB',
          flexShrink: 0,
        }}>
          {brandLogo ? (
            <img src={brandLogo} alt="logo" style={{ height: `${H * 0.12}mm`, maxWidth: `${W * 0.25}mm`, objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: fs(6, 4), fontWeight: 600, color: '#64748B' }}>{brandName}</span>
          )}
        </div>
      )}

      {/* Recipient name */}
      <div style={{
        fontSize: fs(10, 6),
        fontWeight: 700,
        color: '#0F172A',
        lineHeight: 1.2,
        marginBottom: `${H * 0.03}mm`,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        flexShrink: 0,
      }}>
        {a.company ? (
          <>{a.name}<br /><span style={{ fontSize: fs(7.5, 5), fontWeight: 500, color: '#374151' }}>{a.company}</span></>
        ) : a.name}
      </div>

      {/* Address lines */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {addressParts.map((line, i) => (
          <div key={i} style={{
            fontSize: fs(7.5, 5),
            color: '#374151',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {line}
          </div>
        ))}
      </div>

      {/* Contact */}
      {contact && (
        <div style={{
          fontSize: fs(6.5, 4.5),
          color: '#64748B',
          marginTop: `${H * 0.03}mm`,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          borderTop: '0.25mm solid #E5E7EB',
          paddingTop: `${H * 0.03}mm`,
        }}>
          {contact}
        </div>
      )}
    </div>
  );
});

AddressLabelCard.displayName = 'AddressLabelCard';
export default AddressLabelCard;
