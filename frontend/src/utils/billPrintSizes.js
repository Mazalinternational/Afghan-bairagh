export const BILL_SIZES = {
  A4: {
    width: '210mm',
    minHeight: '297mm',
    height: '297mm',
    pageSize: 'A4 portrait',
    orientation: 'portrait',
  },
  // Half of A4: 148mm × 210mm portrait (A4 cut in half, standing).
  A5: {
    width: '148mm',
    minHeight: '210mm',
    height: '210mm',
    pageSize: 'A5 portrait',
    orientation: 'portrait',
  },
};

export function getBillDimensions(size = 'A4') {
  return BILL_SIZES[size] || BILL_SIZES.A4;
}

export function isCompactBill(pageSize = 'A4') {
  return pageSize === 'A5';
}

/** Spacing/type tokens so A5 portrait (half A4) fits header + 11 rows + totals + footer. */
export function getBillLayout(pageSize = 'A4') {
  const compact = isCompactBill(pageSize);
  return {
    compact,
    headerHeight: compact ? 52 : 100,
    logoSize: compact ? 34 : 80,
    logoBorder: compact ? 2 : 3,
    titleFontSize: compact ? 14 : 26,
    billLabelFontSize: compact ? 10 : 18,
    billLabelPadding: compact ? '3px 8px' : '8px 20px',
    serialFontSize: compact ? 10 : 16,
    headerPadding: compact ? '4px' : '10px',
    infoPadding: compact ? '5px 8px' : '15px 20px',
    infoFontSize: compact ? 9 : 14,
    infoMarginBottom: compact ? 2 : 5,
    tableWrapPadding: compact ? '0 8px' : '0 20px',
    tableMarginTop: compact ? 4 : 10,
    thPadding: compact ? '3px 2px' : '8px',
    tdPadding: compact ? '2px 2px' : '10px',
    thFontSize: compact ? 8 : 13,
    tdFontSize: compact ? 8 : 13,
    indexFontSize: compact ? 8 : 14,
    colIndex: compact ? 22 : 60,
    colSize: compact ? 40 : 100,
    colDesign: compact ? 40 : 90,
    colQty: compact ? 28 : 80,
    colPrice: compact ? 42 : 100,
    colTotal: compact ? 50 : 120,
    totalsPadding: compact ? '6px 8px' : '20px',
    totalsBoxPadding: compact ? '4px 10px' : '15px 40px',
    totalsTitleSize: compact ? 10 : 18,
    totalsValueSize: compact ? 12 : 20,
    totalsBoxMinWidth: compact ? 96 : 200,
    paidFontSize: compact ? 9 : 14,
    signatureMarginTop: compact ? 8 : 30,
    signatureLineMargin: compact ? 10 : 30,
    signatureWidth: compact ? 90 : 150,
    footerPadding: compact ? '5px 8px' : '12px 20px',
    footerFontSize: compact ? 7 : 12,
    footerAddressSize: compact ? 6.5 : 11,
    footerMarginTop: compact ? 2 : 20,
    footerAddressMaxWidth: compact ? 180 : 400,
    footerAddressPadding: compact ? '3px 10px 3px 8px' : '8px 30px 8px 15px',
  };
}

export function getBillContainerStyle(pageSize = 'A4') {
  const dims = getBillDimensions(pageSize);
  const compact = isCompactBill(pageSize);
  return {
    width: dims.width,
    minHeight: dims.minHeight,
    height: dims.height,
    maxHeight: compact ? dims.height : undefined,
    overflow: compact ? 'hidden' : undefined,
    boxSizing: 'border-box',
  };
}

function getPrintPageCss(dims) {
  return `
    @media print {
      @page { size: ${dims.pageSize}; margin: 0; }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: ${dims.width} !important;
        height: ${dims.height} !important;
        overflow: hidden !important;
      }
      body * { visibility: hidden; }
      .printable-bill, .printable-bill * { visibility: visible; }
      .printable-bill {
        position: absolute;
        left: 0;
        top: 0;
        width: ${dims.width} !important;
        min-height: ${dims.minHeight} !important;
        height: ${dims.height} !important;
        max-height: ${dims.height} !important;
        overflow: hidden !important;
        background: white !important;
        box-shadow: none !important;
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      button, .no-print { display: none !important; }
    }
  `;
}

/** Print a bill ref with A4 or A5 page size (keeps on-screen preview size in sync). */
export function printBillFromRef(billRef, pageSize = 'A4') {
  if (!billRef?.current) return;
  const dims = getBillDimensions(pageSize);
  const styleId = 'dynamic-bill-print-style';
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = getPrintPageCss(dims);
  const printContents = billRef.current.innerHTML;
  const originalContents = document.body.innerHTML;
  document.body.innerHTML = `<div class="printable-bill">${printContents}</div>`;
  window.print();
  document.body.innerHTML = originalContents;
  window.location.reload();
}

export function getBillPrintCss(pageSize = 'A4') {
  return getPrintPageCss(getBillDimensions(pageSize));
}
