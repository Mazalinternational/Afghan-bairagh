import React, { useRef } from 'react';
import { PrinterIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n/fallback';
import { formatBillDateParts, formatNumberTrimZeros } from '../../utils/billFormat';

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
  const isCustomerBill = billAudience === 'customer';

  if (!record) return null;

  const billDateParts = formatBillDateParts(record.job_date || record.purchase_date);
  const rawLines = Array.isArray(record.items) ? record.items : (Array.isArray(record.purchase_items) ? record.purchase_items : []);
  const truncated = rawLines.length > PRESS_BILL_MAX_LINES;
  const lines = truncated ? rawLines.slice(0, PRESS_BILL_MAX_LINES) : rawLines;

  const thStyle = { border: '1px solid #0047AB', padding: '5px 5px', textAlign: 'center', fontSize: '9px', lineHeight: 1.2 };
  const tdStyle = { border: '1px solid #ddd', padding: '4px 5px', textAlign: 'center', fontSize: '9px', lineHeight: 1.25 };
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
    if (!billRef.current) return;
    const printContents = billRef.current.innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  return (
    <div className="w-full flex flex-col items-center py-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-[210mm] mx-auto flex justify-end mb-4 px-4 no-print">
        <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <PrinterIcon className="h-4 w-4" /> {t('printing.printBill')}
        </button>
      </div>
      <div
        ref={billRef}
        className="printable-bill bg-white shadow-lg mx-auto press-bill-a4"
        style={{ width: '210mm', maxWidth: '100%', minHeight: '297mm', padding: 0, boxSizing: 'border-box' }}
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
              width: 100% !important;
              max-width: none !important;
              min-height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              background: #fff !important;
            }
            .press-bill-a4 .press-bill-table { font-size: 8.5px; }
            .press-bill-a4 .press-bill-table th,
            .press-bill-a4 .press-bill-table td { padding: 3px 4px !important; }
            .press-bill-a4 .press-bill-table th.press-bill-making-col,
            .press-bill-a4 .press-bill-table td.press-bill-making-col {
              min-width: 70px !important;
              padding-left: 5px !important;
              padding-right: 5px !important;
            }
            @page { size: A4; margin: 0; }
          }
        `}</style>
        <div className="flex items-stretch" style={{ height: '76px' }}>
          <div className="flex items-center justify-center" style={{ width: '35%', backgroundColor: '#0047AB', color: 'white' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold' }}>{t('printing.billTitle')}</div>
          </div>
          <div className="flex items-center justify-center" style={{ width: '40%', backgroundColor: '#FFD700' }}>
            <h1 style={{ fontSize: '19px', fontWeight: 'bold', margin: 0 }} dir="rtl">بیرق سازی افغان</h1>
          </div>
          <div className="flex items-center justify-center" style={{ width: '25%', backgroundColor: '#fff', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: '30%', transform: 'translateY(-50%)', backgroundColor: '#0047AB', color: 'white', padding: '5px 12px', fontWeight: 'bold', fontSize: '11px', clipPath: 'polygon(0 0, 100% 0, 85% 50%, 100% 100%, 0 100%)' }} dir="rtl">
              {t('printing.billNumber')}
            </div>
            <div style={{ position: 'absolute', bottom: '8px', right: '8px', fontWeight: 'bold', color: '#0047AB', fontSize: '12px' }}>
              #{record.bill_number || record.id}
            </div>
          </div>
        </div>

        <div style={{ padding: '10px 16px', backgroundColor: '#f8f9fa' }} dir="rtl">
          <div style={{ fontSize: '11px', marginBottom: '4px', borderBottom: '1px dotted #999', paddingBottom: '2px' }}>
            <span style={{ fontWeight: 'bold' }}>{t('common.date')}:</span>
            <span style={{ marginRight: '8px' }}>{billDateParts ? `${billDateParts.year}/${billDateParts.month}/${billDateParts.day}` : '-'}</span>
          </div>
          <div style={{ fontSize: '11px', borderBottom: '1px dotted #999', paddingBottom: '2px' }}>
            <span style={{ fontWeight: 'bold' }}>{t('printing.printer')}:</span>
            <span style={{ marginRight: '8px' }}>{record.printer_name || record.supplier_name || '-'}</span>
          </div>
        </div>

        <div style={{ padding: '0 14px' }}>
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

        <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }} dir="rtl">
          <div style={{ border: '3px solid #0047AB', padding: '10px 20px', clipPath: 'polygon(0 0, 100% 0, 90% 50%, 100% 100%, 0 100%)' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>{t('printing.grandTotal')}</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', textAlign: 'center' }}>
              {formatNumberTrimZeros(billGrandTotal, '0')}
            </div>
          </div>
          {!isCustomerBill ? (
            <div style={{ border: '3px solid #228B22', padding: '10px 20px', clipPath: 'polygon(0 0, 100% 0, 90% 50%, 100% 100%, 0 100%)' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>{t('printing.totalProfit')}</div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', textAlign: 'center' }}>
                {formatNumberTrimZeros(billProfit, '0')}
              </div>
            </div>
          ) : null}
          <div style={{ minWidth: '160px' }}>
            <div style={{ fontSize: '11px', marginBottom: '6px', borderBottom: '1px dotted #999', paddingBottom: '4px' }}>
              <span style={{ fontWeight: 'bold' }}>{t('purchases.paid')}:</span>
              <span style={{ marginRight: '8px' }}>{formatNumberTrimZeros(parseFloat(record.total_paid || 0), '0')}</span>
            </div>
            <div style={{ fontSize: '11px', borderBottom: '1px dotted #999', paddingBottom: '4px' }}>
              <span style={{ fontWeight: 'bold' }}>{t('purchases.remaining')}:</span>
              <span style={{ marginRight: '8px' }}>{formatNumberTrimZeros(parseFloat(record.remaining_amount || 0), '0')}</span>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFD700', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '10px' }}>📞 {BILL_FOOTER.phones} &nbsp; | &nbsp; 📧 {BILL_FOOTER.email}</div>
          <div style={{ backgroundColor: '#0047AB', color: 'white', padding: '5px 14px', fontSize: '9px', clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 15% 100%, 0 50%)' }} dir="rtl">
            آدرس: {BILL_FOOTER.address}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintablePressBill;
