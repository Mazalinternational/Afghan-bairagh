import React, { useRef, useState } from 'react';
import { useTranslation } from '../../i18n/fallback';
import { formatBillDateParts, formatNumberTrimZeros } from '../../utils/billFormat';
import BillPrintControls from '../common/BillPrintControls';
import { getBillContainerStyle, getBillDimensions, printBillFromRef } from '../../utils/billPrintSizes';

const BILL_FOOTER = {
  phones: '0744841167, 0704737305, 0730117373',
  email: 'afghanart.af@gmail.com',
  address: 'چهارراهی صدارت، سرک وزارت داخله سابقه، مارکیت مطابع صنعتی جاوید، منزل دوم دوکان نمبر A2 14-15',
};

/** Max line items on one A4 press bill; smaller typography so ~15 rows fit. */
const PRESS_BILL_MAX_LINES = 15;

function parseLineNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

/** Show making unit price, legacy per-meter, or derived rate from totals when DB fields are zero. */
function formatMakingCell(line, t, isCustomerBill) {
  const mk = parseLineNum(line.making_unit_price ?? line.making_price);
  if (mk > 0) return `AFN ${formatNumberTrimZeros(mk, '0')}`;
  const perM = parseLineNum(line.per_meter_price);
  if (perM > 0) {
    return `${formatNumberTrimZeros(perM, '0')} ${t('printing.afnPerMeter')}`;
  }
  const selling = parseLineNum(line.selling_unit_price ?? line.selling_price);
  const meters = parseLineNum(line.total_meters);
  const sub = parseLineNum(line.line_total);
  const qty = parseLineNum(line.qty ?? line.job_qty);
  // Legacy meter-priced lines (no per-unit selling): infer AFN/m from stored totals
  if (selling <= 0 && meters > 0 && sub > 0) {
    const implied = sub / meters;
    return `${formatNumberTrimZeros(implied, '0')} ${t('printing.afnPerMeter')}`;
  }
  if (isCustomerBill && selling <= 0 && qty > 0 && sub > 0) {
    return `AFN ${formatNumberTrimZeros(sub / qty, '0')}`;
  }
  return '—';
}

/**
 * @param {object} record - printing job with items
 * @param {'customer'|'internal'} billAudience - customer bill hides selling column and profit; internal shows full margin view
 */
const PrintablePressBill = ({ record, billAudience = 'internal' }) => {
  const { t } = useTranslation();
  const billRef = useRef(null);
  const [pageSize, setPageSize] = useState('A4');
  const isCustomerBill = billAudience === 'customer';

  if (!record) return null;

  const billDateParts = formatBillDateParts(record.job_date || record.purchase_date);
  const rawLines = Array.isArray(record.items) ? record.items : (Array.isArray(record.purchase_items) ? record.purchase_items : []);
  const truncated = rawLines.length > PRESS_BILL_MAX_LINES;
  const lines = truncated ? rawLines.slice(0, PRESS_BILL_MAX_LINES) : rawLines;

  const isA5 = pageSize === 'A5';
  const thStyle = { border: '1px solid #0047AB', padding: isA5 ? '2px 3px' : '5px 5px', textAlign: 'center', fontSize: isA5 ? '8px' : '9px', lineHeight: 1.2 };
  const tdStyle = { border: '1px solid #ddd', padding: isA5 ? '2px 3px' : '4px 5px', textAlign: 'center', fontSize: isA5 ? '8px' : '9px', lineHeight: 1.2 };
  const tdTextRtl = { ...tdStyle, textAlign: 'right' };
  const thNarrow = { ...thStyle, width: '48px', padding: '4px 2px' };
  /** Making / rate column needs a bit more room for “AFN …” and per-meter text. */
  const thMaking = { ...thStyle, width: '76px', minWidth: '72px', padding: '5px 4px' };
  const tdMaking = { ...tdStyle, width: '76px', minWidth: '72px', padding: '4px 4px' };
  const billGrandTotal = parseFloat(record.total_price || record.cost || 0);
  const billProfit = rawLines.reduce((sum, line) => {
    const q = parseLineNum(line.qty ?? line.job_qty);
    const mk = parseLineNum(line.making_unit_price ?? line.making_price);
    const sl = parseLineNum(line.selling_unit_price ?? line.selling_price);
    const sub = parseLineNum(line.line_total);
    if (q <= 0 || sl <= 0) return sum;
    const cost = mk > 0 ? q * mk : sub;
    return sum + (q * sl - cost);
  }, 0);

  const handlePrint = () => {
    printBillFromRef(billRef, pageSize);
  };

  const dims = getBillDimensions(pageSize);

  return (
    <div className="w-full flex flex-col items-center py-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-[210mm] mx-auto px-4 mb-4">
        <BillPrintControls
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          onPrint={handlePrint}
        />
      </div>
      <div
        ref={billRef}
        className="printable-bill bg-white shadow-lg mx-auto press-bill-a4"
        style={{ ...getBillContainerStyle(pageSize), maxWidth: '100%', padding: 0, boxSizing: 'border-box' }}
      >
        <style>{`
          .press-bill-table { font-size: 9px; }
          .press-bill-a4 {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: auto !important;
            }
            .no-print { display: none !important; }
            body * { visibility: hidden; }
            .printable-bill, .printable-bill * { visibility: visible; }
            .printable-bill {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              right: 0 !important;
              width: ${dims.width} !important;
              max-width: ${dims.width} !important;
              height: ${dims.height} !important;
              max-height: ${dims.height} !important;
              min-height: ${dims.minHeight} !important;
              overflow: hidden !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              background: #fff !important;
              page-break-inside: avoid !important;
            }
            .press-bill-a4 .press-bill-table { font-size: ${pageSize === 'A5' ? '7.5px' : '8.5px'}; }
            .press-bill-a4 .press-bill-table th,
            .press-bill-a4 .press-bill-table td { padding: ${pageSize === 'A5' ? '2px 3px' : '3px 4px'} !important; }
            .press-bill-a4 .press-bill-table th.press-bill-making-col,
            .press-bill-a4 .press-bill-table td.press-bill-making-col {
              min-width: 70px !important;
              padding-left: 5px !important;
              padding-right: 5px !important;
            }
            @page { size: ${dims.pageSize}; margin: 0; }
          }
        `}</style>
        <div className="flex items-stretch" style={{ height: isA5 ? '40px' : '76px' }}>
          <div className="flex items-center justify-center" style={{ width: '35%', backgroundColor: '#0047AB', color: 'white' }}>
            <div style={{ fontSize: isA5 ? '11px' : '15px', fontWeight: 'bold' }}>{t('printing.billTitle')}</div>
          </div>
          <div className="flex items-center justify-center" style={{ width: '40%', backgroundColor: '#FFD700' }}>
            <h1 style={{ fontSize: isA5 ? '13px' : '19px', fontWeight: 'bold', margin: 0 }} dir="rtl">بیرق سازی افغان</h1>
          </div>
          <div className="flex items-center justify-center" style={{ width: '25%', backgroundColor: '#fff', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: '30%', transform: 'translateY(-50%)', backgroundColor: '#0047AB', color: 'white', padding: isA5 ? '2px 8px' : '5px 12px', fontWeight: 'bold', fontSize: isA5 ? '9px' : '11px', clipPath: 'polygon(0 0, 100% 0, 85% 50%, 100% 100%, 0 100%)' }} dir="rtl">
              {t('printing.billNumber')}
            </div>
            <div style={{ position: 'absolute', bottom: isA5 ? '3px' : '8px', right: isA5 ? '6px' : '8px', fontWeight: 'bold', color: '#0047AB', fontSize: isA5 ? '10px' : '12px' }}>
              #{record.bill_number || record.id}
            </div>
          </div>
        </div>

        <div style={{ padding: isA5 ? '4px 8px' : '10px 16px', backgroundColor: '#f8f9fa' }} dir="rtl">
          <div style={{ fontSize: isA5 ? '8px' : '11px', marginBottom: isA5 ? '2px' : '4px', borderBottom: '1px dotted #999', paddingBottom: '2px' }}>
            <span style={{ fontWeight: 'bold' }}>{t('common.date')}:</span>
            <span style={{ marginRight: '8px' }}>{billDateParts ? `${billDateParts.year}/${billDateParts.month}/${billDateParts.day}` : '-'}</span>
          </div>
          <div style={{ fontSize: isA5 ? '8px' : '11px', borderBottom: '1px dotted #999', paddingBottom: '2px' }}>
            <span style={{ fontWeight: 'bold' }}>{t('printing.printer')}:</span>
            <span style={{ marginRight: '8px' }}>{record.printer_name || record.supplier_name || '-'}</span>
          </div>
        </div>

        <div style={{ padding: isA5 ? '0 8px' : '0 14px' }}>
        <table className="press-bill-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '6px', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ backgroundColor: '#0047AB', color: 'white' }}>
              <th style={{ ...thStyle, width: '22px' }}>#</th>
              <th style={{ ...thStyle, textAlign: 'right', minWidth: '52px' }} dir="rtl">{t('printing.flagName')}</th>
              <th style={thNarrow} dir="rtl">{t('printing.size')}</th>
              <th style={thNarrow} dir="rtl">{t('printing.qty')}</th>
              <th className="press-bill-making-col" style={thMaking} dir="rtl">{isCustomerBill ? t('printing.makingRateColumn') : t('printing.makingUnitPrice')}</th>
              {!isCustomerBill ? (
                <th style={thNarrow} dir="rtl">{t('printing.sellingUnitPrice')}</th>
              ) : null}
              <th style={thNarrow} dir="rtl">{t('printing.lineSubtotal')}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => {
              const sub = parseLineNum(line.line_total);
              const qtyVal = line.qty ?? line.job_qty;
              const qtyDisplay =
                qtyVal != null && qtyVal !== '' ? formatNumberTrimZeros(qtyVal) : '-';
              const slNum = parseLineNum(line.selling_unit_price ?? line.selling_price);
              const sellingDisplay =
                !isCustomerBill && slNum > 0
                  ? `AFN ${formatNumberTrimZeros(slNum, '0')}`
                  : (!isCustomerBill && parseLineNum(line.per_meter_price) > 0
                    ? `AFN ${formatNumberTrimZeros(line.per_meter_price, '0')}`
                    : null);
              return (
                <tr key={`print-line-${idx}`} style={{ backgroundColor: idx % 2 === 0 ? '#f8f9fa' : '#fff' }}>
                  <td style={{ ...tdStyle, color: '#0047AB', fontWeight: 'bold' }}>{idx + 1}</td>
                  <td style={{ ...tdTextRtl, wordBreak: 'break-word' }} dir="rtl">{line.flag_name || line.item_name || '-'}</td>
                  <td style={tdStyle}>{line.size || line.flag_size || '-'}</td>
                  <td style={tdStyle}>{qtyDisplay}</td>
                  <td className="press-bill-making-col" style={tdMaking}>{formatMakingCell(line, t, isCustomerBill)}</td>
                  {!isCustomerBill ? (
                    <td style={tdStyle}>{sellingDisplay || '—'}</td>
                  ) : null}
                  <td style={{ ...tdStyle, fontWeight: 'bold' }}>AFN {formatNumberTrimZeros(sub, '0')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {truncated ? (
          <p style={{ fontSize: '9px', color: '#666', marginTop: '6px', textAlign: 'center' }} dir="ltr">
            {t('printing.pressBillLinesTruncated', { shown: PRESS_BILL_MAX_LINES, total: rawLines.length })}
          </p>
        ) : null}
        </div>

        <div style={{ padding: isA5 ? '6px 8px' : '12px 14px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: isA5 ? '6px' : '10px' }} dir="rtl">
          <div style={{ border: isA5 ? '2px solid #0047AB' : '3px solid #0047AB', padding: isA5 ? '4px 12px' : '10px 20px', clipPath: 'polygon(0 0, 100% 0, 90% 50%, 100% 100%, 0 100%)' }}>
            <div style={{ fontSize: isA5 ? '10px' : '12px', fontWeight: 'bold', textAlign: 'center' }}>{t('printing.grandTotal')}</div>
            <div style={{ fontSize: isA5 ? '12px' : '15px', fontWeight: 'bold', textAlign: 'center' }}>
              {formatNumberTrimZeros(billGrandTotal, '0')}
            </div>
          </div>
          {!isCustomerBill ? (
            <div style={{ border: isA5 ? '2px solid #228B22' : '3px solid #228B22', padding: isA5 ? '4px 12px' : '10px 20px', clipPath: 'polygon(0 0, 100% 0, 90% 50%, 100% 100%, 0 100%)' }}>
              <div style={{ fontSize: isA5 ? '10px' : '12px', fontWeight: 'bold', textAlign: 'center' }}>{t('printing.totalProfit')}</div>
              <div style={{ fontSize: isA5 ? '12px' : '15px', fontWeight: 'bold', textAlign: 'center' }}>
                {formatNumberTrimZeros(billProfit, '0')}
              </div>
            </div>
          ) : null}
          <div style={{ minWidth: isA5 ? '120px' : '160px' }}>
            <div style={{ fontSize: isA5 ? '8px' : '11px', marginBottom: isA5 ? '3px' : '6px', borderBottom: '1px dotted #999', paddingBottom: isA5 ? '2px' : '4px' }}>
              <span style={{ fontWeight: 'bold' }}>{t('purchases.paid')}:</span>
              <span style={{ marginRight: '8px' }}>{formatNumberTrimZeros(parseFloat(record.total_paid || 0), '0')}</span>
            </div>
            <div style={{ fontSize: isA5 ? '8px' : '11px', borderBottom: '1px dotted #999', paddingBottom: isA5 ? '2px' : '4px' }}>
              <span style={{ fontWeight: 'bold' }}>{t('purchases.remaining')}:</span>
              <span style={{ marginRight: '8px' }}>{formatNumberTrimZeros(parseFloat(record.remaining_amount || 0), '0')}</span>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFD700', padding: isA5 ? '3px 8px' : '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: isA5 ? '7.5px' : '10px' }}>📞 {BILL_FOOTER.phones} &nbsp; | &nbsp; 📧 {BILL_FOOTER.email}</div>
          <div style={{ backgroundColor: '#0047AB', color: 'white', padding: isA5 ? '3px 10px' : '5px 14px', fontSize: isA5 ? '7px' : '9px', clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 15% 100%, 0 50%)' }} dir="rtl">
            آدرس: {BILL_FOOTER.address}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintablePressBill;
