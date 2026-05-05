import React, { forwardRef } from 'react';
import LabelCard from './LabelCard';

const DEFAULT_FORMAT = {
  label_width: 64, label_height: 34,
  cols: 3, rows: 8,
  margin_top: 5.5, margin_bottom: 5.5,
  margin_left: 7.0, margin_right: 7.0,
  gap_col: 2.0, gap_row: 2.0,
  border_radius: 4.0,
};

/**
 * positionMask: boolean[labelsPerPage] — first page only.
 *   true  = this cell gets a label
 *   false = this cell is EMPTY (already used)
 */
const LabelSheet = forwardRef(({ items, settings, positionMask, format }, ref) => {
  const fmt = { ...DEFAULT_FORMAT, ...format };
  const {
    label_width, label_height,
    cols, rows,
    margin_top, margin_bottom, margin_left, margin_right,
    gap_col, gap_row,
    border_radius,
  } = fmt;

  const labelsPerPage = cols * rows;

  // Expand items → individual label objects
  const labels = (items || []).flatMap(({ product, qty }) =>
    Array(Math.max(1, Math.floor(parseInt(qty) || 1))).fill(product)
  );

  // ── Build pages ──────────────────────────────────────────────
  const pages = [];
  const mask = positionMask || Array(labelsPerPage).fill(true);

  if (labels.length === 0) {
    pages.push(Array(labelsPerPage).fill(null).map((_, i) => mask[i] ? null : 'USED'));
  } else {
    const availOnPage1 = mask.reduce((acc, v) => acc + (v ? 1 : 0), 0);
    const page1Grid = Array(labelsPerPage).fill(null);
    let labelIdx = 0;
    for (let pos = 0; pos < labelsPerPage; pos++) {
      if (!mask[pos]) { page1Grid[pos] = 'USED'; }
      else if (labelIdx < labels.length) { page1Grid[pos] = labels[labelIdx++]; }
    }
    pages.push(page1Grid);

    const remaining = labels.slice(availOnPage1);
    for (let i = 0; i < remaining.length; i += labelsPerPage) {
      const chunk = remaining.slice(i, i + labelsPerPage);
      while (chunk.length < labelsPerPage) chunk.push(null);
      pages.push(chunk);
    }
  }

  return (
    <div ref={ref} style={{ background: 'white' }}>
      {pages.map((pageGrid, pi) => (
        <div
          key={pi}
          style={{
            width: '210mm',
            height: '297mm',
            paddingTop:    `${margin_top}mm`,
            paddingBottom: `${margin_bottom}mm`,
            paddingLeft:   `${margin_left}mm`,
            paddingRight:  `${margin_right}mm`,
            background: 'white',
            boxSizing: 'border-box',
            pageBreakAfter: pi < pages.length - 1 ? 'always' : 'auto',
            breakAfter:     pi < pages.length - 1 ? 'page'   : 'auto',
            overflow: 'hidden',
          }}
        >
          {labels.length === 0 && pi === 0 ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: '#9CA3AF', fontFamily: "'Inter', sans-serif" }}>
                <svg style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
                <p style={{ fontSize: '11pt', fontWeight: 500 }}>Önizleme boş</p>
                <p style={{ fontSize: '9pt', marginTop: '4px', opacity: 0.7 }}>Sol taraftan ürün kodu ekleyin</p>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, ${label_width}mm)`,
                gridAutoRows: `${label_height}mm`,
                columnGap: `${gap_col}mm`,
                rowGap: `${gap_row}mm`,
              }}
            >
              {pageGrid.map((cell, li) => {
                if (cell === 'USED' || cell === null) {
                  return <div key={`${pi}-${li}`} style={{ width: `${label_width}mm`, height: `${label_height}mm` }} />;
                }
                return (
                  <LabelCard
                    key={`${pi}-${li}`}
                    product={cell}
                    settings={settings}
                    format={fmt}
                  />
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

LabelSheet.displayName = 'LabelSheet';
export default LabelSheet;
