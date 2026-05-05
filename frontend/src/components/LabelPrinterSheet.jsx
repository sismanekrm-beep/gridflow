import React, { forwardRef } from 'react';
import LabelCard from './LabelCard';

const LabelPrinterSheet = forwardRef(({ items, settings, format }, ref) => {
  const labels = (items || []).flatMap(({ product, qty }) =>
    Array(Math.max(1, Math.floor(parseInt(qty) || 1))).fill(product)
  );

  const W = format?.width || 70;
  const H = format?.height || 40;

  const cardFormat = {
    label_width: W,
    label_height: H,
    cols: 1, rows: 1,
    margin_top: 0, margin_bottom: 0, margin_left: 0, margin_right: 0,
    gap_col: 0, gap_row: 0,
    border_radius: format?.border_radius || 2.0,
    background: format?.background || '#FFFFFF',
    elements: format?.elements || [],
  };

  return (
    <div ref={ref} style={{ background: 'white' }}>
      {labels.length === 0 ? (
        <div style={{ width: `${W}mm`, height: `${H}mm`, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }}>
          <div style={{ textAlign: 'center', color: '#9CA3AF', fontFamily: "'Inter', sans-serif" }}>
            <p style={{ fontSize: '9pt', fontWeight: 500, margin: 0 }}>Önizleme boş</p>
            <p style={{ fontSize: '7pt', marginTop: '3px', opacity: 0.7 }}>Sol taraftan ürün kodu ekleyin</p>
          </div>
        </div>
      ) : (
        labels.map((product, idx) => (
          <React.Fragment key={idx}>
            <div style={{
              width: `${W}mm`,
              height: `${H}mm`,
              pageBreakAfter: idx < labels.length - 1 ? 'always' : 'auto',
              breakAfter: idx < labels.length - 1 ? 'page' : 'auto',
              backgroundColor: 'white',
              overflow: 'hidden',
            }}>
              <LabelCard product={product} settings={settings} format={cardFormat} />
            </div>
            {idx < labels.length - 1 && (
              <div className="lps-gap" style={{ height: '8px', backgroundColor: '#E2E8F0' }} />
            )}
          </React.Fragment>
        ))
      )}
    </div>
  );
});

LabelPrinterSheet.displayName = 'LabelPrinterSheet';
export default LabelPrinterSheet;
