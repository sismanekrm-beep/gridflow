import React from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const imgUrl = (url) => !url ? null : url.startsWith('http') ? url : `${BACKEND_URL}${url}`;

// ── Quality colors ────────────────────────────────────────────────────
const QUALITY_COLORS = {
  default:   { bg: '#E5E7EB', text: '#374151' },
  a2:        { bg: '#DCFCE7', text: '#15803D' },
  a4:        { bg: '#FEE2E2', text: '#991B1B' },
  '8.8':     { bg: '#F1F5F9', text: '#475569' },
  '10.9':    { bg: '#FFEDD5', text: '#C2410C' },
  '12.9':    { bg: '#FEF08A', text: '#854D0E' },
  paslanmaz: { bg: '#EDE9FE', text: '#5B21B6' },
  pirinc:    { bg: '#FEF9C3', text: '#854D0E' },
  celik:     { bg: '#F1F5F9', text: '#475569' },
};
function getQualityColor(quality) {
  if (!quality) return QUALITY_COLORS.default;
  const q = quality.toLowerCase().trim();
  if (q.includes('12.9')) return QUALITY_COLORS['12.9'];
  if (q.includes('10.9')) return QUALITY_COLORS['10.9'];
  if (q.includes('8.8'))  return QUALITY_COLORS['8.8'];
  if (q.includes('a4'))   return QUALITY_COLORS.a4;
  if (q.includes('a2'))   return QUALITY_COLORS.a2;
  if (q.includes('paslanmaz') || q.includes('304') || q.includes('316'))
    return QUALITY_COLORS.paslanmaz;
  if (q.includes('pirin') || q.includes('brass'))
    return QUALITY_COLORS.pirinc;
  if (q.includes('çelik') || q.includes('celik') || q.includes('galv'))
    return QUALITY_COLORS.celik;
  return QUALITY_COLORS.default;
}

// ── Resolve template variables ────────────────────────────────────────
export function resolveText(value, product) {
  if (!value) return '';
  const p = product || {};
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()}`;
  return String(value)
    .replace(/\{\{code\}\}/gi,          p.code || '')
    .replace(/\{\{name\}\}/gi,          p.name || '')
    .replace(/\{\{measurement\}\}/gi,   p.measurement || '')
    .replace(/\{\{standard_code\}\}/gi, p.standard_code || '')
    .replace(/\{\{quality\}\}/gi,       p.quality || '')
    .replace(/\{\{description\}\}/gi,   p.description || '')
    .replace(/\{\{default_qty\}\}/gi,   String(p.default_qty ?? p.qty ?? ''))
    .replace(/\{\{barcode\}\}/gi,       p.barcode || '')
    .replace(/\{\{print_date\}\}/gi,    dateStr)
    .replace(/\{\{field:([^}]+)\}\}/gi, (_, id) => p.custom_fields?.[id] || '');
}

const DEFAULT_FORMAT = {
  label_width: 64, label_height: 34,
  border_radius: 4.0, background: '#FFFFFF',
};

// ── Custom (designer) label render ────────────────────────────────────
function CustomRender({ product, settings, format }) {
  const W = format.label_width;
  const H = format.label_height;
  const R = format.border_radius ?? 4;
  const bg = format.background || '#FFFFFF';

  const brandLogoUrl = imgUrl(settings?.brand_logo_url);
  const brandName    = settings?.brand_name || 'Marka';
  const prodImgUrl   = imgUrl(product?.image_url) || imgUrl(product?.category_image_url);

  const qualityColor = getQualityColor(product?.quality);

  return (
    <div style={{
      width: `${W}mm`, height: `${H}mm`,
      overflow: 'hidden',
      borderRadius: `${R}mm`,
      backgroundColor: bg,
      position: 'relative',
      fontFamily: settings?.label_font_family || "'Inter','Arial',sans-serif",
      userSelect: 'none',
    }}>
      {(format.elements || []).map((el) => {
        const elStyle = {
          position: 'absolute',
          left:   `${el.x}mm`,
          top:    `${el.y}mm`,
          width:  `${el.width}mm`,
          height: `${el.height}mm`,
          overflow: 'hidden',
          boxSizing: 'border-box',
          backgroundColor: el.bg || 'transparent',
        };

        if (el.type === 'text') {
          // resolveText handles standard vars + {{field:ID}}; fallback to custom_fields[fieldId] for legacy elements
          const displayValue = resolveText(el.value, product)
            || (el.fieldId ? (product.custom_fields?.[el.fieldId] || '') : '');
          // Apply color rules: first matching rule wins
          const matchRule = (el.colorRules || []).find(r => r.value && displayValue.trim().toLowerCase() === r.value.trim().toLowerCase());
          const textColor = matchRule ? matchRule.textColor : (el.color || '#0F172A');
          const textBg    = matchRule ? matchRule.bgColor   : 'transparent';
          const style = {
            fontSize:   `${el.fontSize || 8}pt`,
            fontWeight: el.fontWeight || '400',
            fontStyle:  el.italic ? 'italic' : 'normal',
            color:      textColor,
            textAlign:  el.align || 'left',
            lineHeight: el.lineHeight || 1.2,
            padding:    `${el.padding || 0.5}mm`,
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center',
            justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
            boxSizing: 'border-box',
            fontFamily: el.fontFamily || settings?.label_font_family || "'Inter','Arial',sans-serif",
          };
          if (el.vertical) {
            style.writingMode = 'vertical-rl';
            style.textOrientation = 'mixed';
            style.transform = 'rotate(180deg)';
            style.justifyContent = 'center';
          }
          const isQualityEl = el.isQualityBar || el.value?.includes('{{quality}}');
          if (isQualityEl && !matchRule) {
            elStyle.backgroundColor = qualityColor.bg;
            style.color = qualityColor.text;
          } else if (matchRule) {
            let ruleBg = matchRule.bgColor;
            if (!ruleBg) {
              // Use the product's quality color (not displayValue — avoids false match on codes like A496502016)
              ruleBg = isQualityEl ? qualityColor.bg : (el.bg || 'transparent');
            }
            elStyle.backgroundColor = ruleBg;
          } else {
            elStyle.backgroundColor = el.bg || 'transparent';
          }
          return (
            <div key={el.id} style={elStyle}>
              <span style={style}>{displayValue}</span>
            </div>
          );
        }

        if (el.type === 'image') {
          const imgUrl = el.imageType === 'brand' ? brandLogoUrl : prodImgUrl;
          return (
            <div key={el.id} style={elStyle}>
              {imgUrl ? (
                <img src={imgUrl} alt="" style={{ maxWidth: el.imageType==='brand' && settings?.brand_logo_w ? `${settings.brand_logo_w}mm` : '100%', maxHeight: el.imageType==='brand' && settings?.brand_logo_h ? `${settings.brand_logo_h}mm` : '100%', objectFit: 'contain', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
              ) : el.imageType === 'brand' ? (
                <span style={{ fontSize: `${(el.width / 64) * 8.5}pt`, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontFamily: "'Space Grotesk','Inter',sans-serif", textAlign: 'center', padding: '1mm', boxSizing: 'border-box', fontFamily: settings?.label_font_family || "'Space Grotesk','Inter',sans-serif" }}>
                  {brandName}
                </span>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
              )}
            </div>
          );
        }

        if (el.type === 'rect') {
          return (
            <div key={el.id} style={{ ...elStyle, overflow: 'visible' }}>
              <svg width={`${el.width}mm`} height={`${el.height}mm`} viewBox={`0 0 ${el.width} ${el.height}`} style={{ position: 'absolute', top: 0, left: 0 }}>
                <rect x={0.5} y={0.5} width={el.width - 1} height={el.height - 1}
                  fill={el.fill === 'none' || !el.fill ? 'none' : el.fill}
                  stroke={el.stroke || '#374151'} strokeWidth={el.strokeWidth || 0.5}
                  rx={el.radius || 0} />
              </svg>
            </div>
          );
        }

        if (el.type === 'circle') {
          const rx = el.width / 2, ry = el.height / 2;
          return (
            <div key={el.id} style={{ ...elStyle, overflow: 'visible' }}>
              <svg width={`${el.width}mm`} height={`${el.height}mm`} viewBox={`0 0 ${el.width} ${el.height}`} style={{ position: 'absolute', top: 0, left: 0 }}>
                <ellipse cx={rx} cy={ry} rx={rx - (el.strokeWidth || 0.5) / 2} ry={ry - (el.strokeWidth || 0.5) / 2}
                  fill={el.fill === 'none' || !el.fill ? 'none' : el.fill}
                  stroke={el.stroke || '#374151'} strokeWidth={el.strokeWidth || 0.5} />
              </svg>
            </div>
          );
        }

        if (el.type === 'triangle') {
          const W2 = el.width, H2 = el.height;
          return (
            <div key={el.id} style={{ ...elStyle, overflow: 'visible' }}>
              <svg width={`${W2}mm`} height={`${H2}mm`} viewBox={`0 0 ${W2} ${H2}`} style={{ position: 'absolute', top: 0, left: 0 }}>
                <polygon points={`${W2/2},0.5 ${W2-0.5},${H2-0.5} 0.5,${H2-0.5}`}
                  fill={el.fill === 'none' || !el.fill ? 'none' : el.fill}
                  stroke={el.stroke || '#374151'} strokeWidth={el.strokeWidth || 0.5} strokeLinejoin="round" />
              </svg>
            </div>
          );
        }

        if (el.type === 'path') {
          return (
            <div key={el.id} style={{ position: 'absolute', left: 0, top: 0, width: `${W}mm`, height: `${H}mm`, pointerEvents: 'none', overflow: 'visible' }}>
              <svg width={`${W}mm`} height={`${H}mm`} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
                <polyline
                  points={(el.points || []).map(([x, y]) => `${x},${y}`).join(' ')}
                  stroke={el.stroke || '#374151'}
                  strokeWidth={el.strokeWidth || 0.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          );
        }

        if (el.type === 'line') {
          return (
            <div key={el.id} style={{
              ...elStyle,
              backgroundColor: el.fill || '#9CA3AF',
            }} />
          );
        }

        return null;
      })}
    </div>
  );
}

// ── Fixed (default) label render ──────────────────────────────────────
function FixedRender({ product, settings, format }) {
  const W  = format.label_width || 64;
  const H  = format.label_height || 34;
  const R  = format.border_radius ?? 4.0;
  const scale = Math.min(H / 34, W / 64);

  const brandLogoUrl = imgUrl(settings?.brand_logo_url);
  const brandName    = settings?.brand_name || 'Marka';
  const prodImgUrl   = imgUrl(product?.image_url) || imgUrl(product?.category_image_url);
  const qualityColor = getQualityColor(product?.quality);

  const fs = (base, min = 4) => `${Math.max(min, base * scale).toFixed(1)}pt`;
  const INNER   = `${Math.max(0.2, 0.45 * scale).toFixed(2)}mm solid #9CA3AF`;
  const INNER_L = `${Math.max(0.15, 0.35 * scale).toFixed(2)}mm solid #C4C9D4`;
  const topH  = H * (14/34);
  const midH  = H * (10/34);
  const brandW = W * (20/64);
  const innerLW = W * (10/64);

  return (
    <div style={{
      width: `${W}mm`, height: `${H}mm`,
      boxSizing: 'border-box', overflow: 'hidden',
      borderRadius: `${R}mm`, border: 'none',
      backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column',
      fontFamily: settings?.label_font_family || "'Inter','Arial',sans-serif", userSelect: 'none',
    }}>
      <div style={{ display: 'flex', height: `${topH}mm`, flexShrink: 0, borderBottom: INNER }}>
        <div style={{ width: `${brandW}mm`, borderRight: INNER, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `${0.04*H}mm ${0.03*W}mm`, flexShrink: 0, boxSizing: 'border-box', overflow: 'hidden', backgroundColor: '#FAFAFA' }}>
          {brandLogoUrl
            ? <img src={brandLogoUrl} alt="logo" style={{ maxWidth: settings?.brand_logo_w ? `${settings.brand_logo_w * scale}mm` : '100%', maxHeight: settings?.brand_logo_h ? `${settings.brand_logo_h * scale}mm` : '100%', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
            : <span style={{ fontSize: fs(8.5,5), fontWeight: 700, color: '#0F172A', fontFamily: "'Space Grotesk','Inter',sans-serif", textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{brandName}</span>
          }
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `${0.03*H}mm ${0.03*W}mm`, overflow: 'hidden' }}>
            {prodImgUrl
              ? <img src={prodImgUrl} alt="ürün" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
              : <div style={{ width: `${W*0.15}mm`, height: `${topH*0.65}mm`, background: '#F3F4F6', borderRadius: '1mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
            }
          </div>
          <div style={{ background: qualityColor.bg, padding: `${0.025*H}mm ${0.03*W}mm`, textAlign: 'center', flexShrink: 0, borderTop: INNER_L, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: `${0.03*W}mm` }}>
            <span style={{ fontSize: fs(6.5,4.5), fontWeight: 700, color: qualityColor.text, fontFamily: "'IBM Plex Mono','Courier New',monospace", letterSpacing: '0.04em', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {product?.standard_code || 'DIN'}
            </span>
            {product?.quality && <><span style={{ fontSize: fs(6.5,4.5), color: qualityColor.text, opacity: 0.4 }}>|</span><span style={{ fontSize: `${Math.max(3.5, 6*scale).toFixed(1)}pt`, fontWeight: 700, color: qualityColor.text, whiteSpace: 'nowrap' }}>{product.quality}</span></>}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', height: `${midH}mm`, flexShrink: 0, borderBottom: INNER, alignItems: 'stretch' }}>
        <div style={{ width: `${innerLW}mm`, borderRight: INNER, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: '#F8FAFC' }}>
          <span style={{ fontSize: fs(5.5,4), fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1, writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>ÖLÇÜ</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `0 ${0.015*W}mm`, overflow: 'hidden' }}>
          <span style={{ fontSize: fs(13,7), fontWeight: 800, color: '#0F172A', fontFamily: "'Space Grotesk','Inter',sans-serif", letterSpacing: '-0.02em', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product?.measurement || '—'}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flex: 1, alignItems: 'stretch', overflow: 'hidden' }}>
        <div style={{ width: `${innerLW}mm`, borderRight: INNER, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: '#F8FAFC' }}>
          <span style={{ fontSize: fs(5.5,4), fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1, writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>ÜRÜN</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `${0.03*H}mm ${0.03*W}mm`, overflow: 'hidden' }}>
          <span style={{ fontSize: fs(7.5,5), fontWeight: 700, color: '#0F172A', lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word', textAlign: 'center' }}>{product?.description || product?.name || '—'}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main LabelCard ────────────────────────────────────────────────────
const LabelCard = React.forwardRef(({ product, settings, format }, ref) => {
  const fmt = { ...DEFAULT_FORMAT, ...format };
  const useCustomDesign = fmt.elements && fmt.elements.length > 0;

  return (
    <div ref={ref} data-testid="label-card">
      {useCustomDesign
        ? <CustomRender product={product} settings={settings} format={fmt} />
        : <FixedRender  product={product} settings={settings} format={fmt} />
      }
    </div>
  );
});

LabelCard.displayName = 'LabelCard';
export { getQualityColor };
export default LabelCard;
