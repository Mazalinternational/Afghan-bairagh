import React, { useRef, useState, useEffect } from 'react';
import { PrinterIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n/fallback';
import { formatBillDateParts } from '../../utils/billFormat';

const BILL_FOOTER = {
  phones: '0744841167, 0704737305, 0730117373',
  email: 'afghanart.af@gmail.com',
  address: 'چهارراهی صدارت، سرک وزارت داخله سابقه، مارکیت مطابع صنعتی جاوید، منزل دوم دوکان نمبر A2 14-15',
};

/** Exactly 11 line-item rows per A4 quotation page. */
const QUOTATION_ROWS_PER_PAGE = 11;
/** Fixed tbody row height so 11 rows always fill the table area on one page. */
const QUOTATION_ROW_HEIGHT_MM = 14;

const QUOTATION_PRINT_CSS = `
  html, body { margin: 0; padding: 0; background: #fff; }
  .quotation-bill-a4 {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: auto !important;
      height: auto !important;
      overflow: visible !important;
    }
    body * { visibility: hidden; }
    .printable-bill, .printable-bill * { visibility: visible; }
    .printable-bill {
      position: relative !important;
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      box-shadow: none !important;
      overflow: visible !important;
      box-sizing: border-box !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .printable-bill .quotation-bill-a4 {
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
      min-height: calc(297mm - 20mm) !important;
      overflow: visible !important;
      box-sizing: border-box !important;
    }
    .quotation-bill-body {
      padding-bottom: 34px !important;
      overflow: visible !important;
    }
    .quotation-customer-block {
      padding: 6px 10px !important;
      overflow: visible !important;
    }
    .quotation-customer-block > div {
      overflow: visible !important;
      word-break: break-word !important;
    }
    .quotation-table-section {
      padding: 0 10px !important;
      overflow: visible !important;
    }
    .quotation-bill-footer {
      position: absolute !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      width: 100% !important;
      margin: 0 !important;
      box-sizing: border-box !important;
    }
    .quotation-bill-a4 .quotation-bill-table { font-size: 10.5px; }
    .quotation-bill-a4 .quotation-bill-table th { font-size: 10.5px !important; }
    .quotation-bill-a4 .quotation-bill-table td { font-size: 11px !important; }
    .quotation-bill-a4 .quotation-bill-table th,
    .quotation-bill-a4 .quotation-bill-table td {
      padding: 2px 3px !important;
    }
    .quotation-bill-a4 .quotation-bill-table tbody tr.quotation-bill-row {
      height: ${QUOTATION_ROW_HEIGHT_MM}mm !important;
      max-height: ${QUOTATION_ROW_HEIGHT_MM}mm !important;
    }
    .quotation-bill-a4 .quotation-bill-table tbody td {
      height: ${QUOTATION_ROW_HEIGHT_MM}mm !important;
      max-height: ${QUOTATION_ROW_HEIGHT_MM}mm !important;
      overflow: hidden !important;
      vertical-align: middle !important;
    }
    .watermark-quotation {
      visibility: visible !important;
      opacity: 1 !important;
      font-size: 64px !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color: rgba(0, 71, 171, 0.08) !important;
      z-index: 999 !important;
    }
    button { display: none !important; }
    @page {
      size: A4;
      margin: 10mm;
    }
  }
  .watermark-quotation {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
`;

const PrintableQuotation = ({ order, customer }) => {
  const { t } = useTranslation();
  const billRef = useRef(null);
  const [systemLogo, setSystemLogo] = useState(`/logo.jpeg?v=${Date.now()}`);
  const [systemName, setSystemName] = useState('بیرق سازی افغان');

  useEffect(() => {
    setSystemLogo(`/logo.jpeg?v=${Date.now()}`);
    setSystemName('بیرق سازی افغان');
  }, []);

  const handlePrint = () => {
    if (!billRef.current) return;
    const printContents = billRef.current.innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = '<div class="printable-bill">' + printContents + '</div>';
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  if (!order) return null;

  const customerName =
    customer?.name ||
    (order.customer && typeof order.customer === 'object' ? order.customer.name : null) ||
    order.customer_name ||
    '';

  const customerPhone = 
    customer?.phone ||
    (order.customer && typeof order.customer === 'object' ? order.customer.phone : null) ||
    order.customer_phone ||
    '';

  const customerAddress = 
    customer?.address ||
    (order.customer && typeof order.customer === 'object' ? order.customer.address : null) ||
    order.customer_address ||
    '';

  const billNo = order.id;
  const billDateParts = formatBillDateParts(
    order.order_date ?? order.quotation_date ?? order.created_at
  );

  const items = order.order_items && order.order_items.length > 0
    ? order.order_items
    : [
        {
          id: 1,
          item_name: order.item_name || order.item?.name,
          flag_size: order.flag_size || '-',
          quality_design_type: order.quality_design_type || '',
          quantity: order.quantity || 0,
          price_estimate: order.price_per_unit || order.price_per_unit || 0,
          total: parseFloat(order.total_amount || order.total_estimated_amount || 0),
        },
      ];

  const truncated = items.length > QUOTATION_ROWS_PER_PAGE;
  const displayItems = items.slice(0, QUOTATION_ROWS_PER_PAGE);
  while (displayItems.length < QUOTATION_ROWS_PER_PAGE) {
    displayItems.push({
      id: `empty-${displayItems.length}`,
      item_name: '',
      flag_size: '',
      quality_design_type: '',
      quantity: '',
      price_estimate: '',
      total: '',
    });
  }

  const rowHeight = `${QUOTATION_ROW_HEIGHT_MM}mm`;
  const thStyle = { border: '1px solid #0047AB', padding: '3px 3px', textAlign: 'center', fontSize: '10.5px', lineHeight: 1.25 };
  const tdStyle = {
    border: '1px solid #ddd',
    padding: '2px 3px',
    textAlign: 'center',
    fontSize: '11px',
    lineHeight: 1.25,
    height: rowHeight,
    maxHeight: rowHeight,
    verticalAlign: 'middle',
    overflow: 'hidden',
  };
  const tdDesc = { ...tdStyle, textAlign: 'right', wordBreak: 'break-word' };

  const grandTotal = order.total_estimated_amount != null
    ? parseFloat(order.total_estimated_amount)
    : parseFloat(order.total_amount) || items.reduce((sum, row) => sum + parseFloat(row.total || 0), 0);

  const totalPaid = order.payments?.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0) ?? 
    (order.total_paid != null ? parseFloat(order.total_paid) : 0);
  const remaining = Math.max(0, grandTotal - totalPaid);

  return (
    <div className="w-full flex flex-col items-center py-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-[210mm] mx-auto flex justify-end mb-4 px-4">
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PrinterIcon className="h-5 w-5" />
          {t('quotations.printQuotation')}
        </button>
      </div>

      <div
        ref={billRef}
        className="printable-bill quotation-bill-a4 bg-white shadow-lg mx-auto"
        style={{
          width: '210mm',
          maxWidth: '100%',
          height: '297mm',
          padding: 0,
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Watermark */}
        <div className="watermark-quotation" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(-45deg)',
          fontSize: '72px',
          fontWeight: 'bold',
          color: 'rgba(0, 71, 171, 0.08)',
          zIndex: 999,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact'
        }}>
          QUOTATION
        </div>

        {/* Content wrapper — padding reserves space for pinned footer */}
        <div className="quotation-bill-body" style={{ position: 'relative', zIndex: 1, paddingBottom: '34px' }}>
        {/* Blue Header with Logo */}
        <div className="flex items-stretch" style={{ height: '68px', flexShrink: 0 }}>
          <div className="flex items-center justify-center" style={{ 
            width: '35%', 
            backgroundColor: '#0047AB',
            padding: '8px'
          }}>
            <img 
              src={systemLogo} 
              alt="Wahid Afghan Logo" 
              style={{ 
                width: '54px', 
                height: '54px', 
                borderRadius: '50%', 
                objectFit: 'cover',
                border: '3px solid white',
                backgroundColor: 'white'
              }} 
            />
          </div>
          
          <div className="flex items-center justify-center" style={{ 
            width: '40%', 
            backgroundColor: '#FFD700',
            padding: '10px'
          }}>
            <h1 style={{ 
              fontSize: '18px', 
              fontWeight: 'bold',
              color: '#000',
              textAlign: 'center',
              fontFamily: 'Arial, sans-serif',
              margin: 0,
            }} dir="rtl">
              {systemName}
            </h1>
          </div>

          <div className="flex items-center justify-center" style={{ 
            width: '25%',
            backgroundColor: '#fff',
            position: 'relative',
            padding: '8px'
          }}>
            <div style={{
              position: 'absolute',
              left: 0,
              top: '30%',
              transform: 'translateY(-50%)',
              backgroundColor: '#0047AB',
              color: 'white',
              padding: '5px 14px',
              fontSize: '12px',
              fontWeight: 'bold',
              clipPath: 'polygon(0 0, 100% 0, 85% 50%, 100% 100%, 0 100%)',
              fontFamily: 'Arial, sans-serif'
            }} dir="rtl">
              {t('quotations.billNoLabel')}
            </div>
            <div style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#0047AB'
            }} dir="rtl">
              نمبر مسلسل: {billNo}
            </div>
          </div>
        </div>

        {/* Quotation Label */}
        <div style={{ 
          padding: '5px 14px', 
          backgroundColor: '#0047AB', 
          color: 'white',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 'bold',
          flexShrink: 0,
        }}>
          {t('quotations.printHeading')}
        </div>

        {/* Customer Info Section */}
        <div className="quotation-customer-block" style={{ padding: '6px 14px', backgroundColor: '#f8f9fa', flexShrink: 0 }} dir="rtl">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <div style={{ fontSize: '10px' }}>
              <span style={{ fontWeight: 'bold' }}>تاریخ:</span>
              <span style={{ marginRight: '8px' }}>
                {billDateParts
                  ? `${billDateParts.year}/${billDateParts.month}/${billDateParts.day}`
                  : t('orders.billDateNotSet')}
              </span>
            </div>
          </div>
          {(order.manual_serial_no || '').trim() !== '' && (
            <div style={{ fontSize: '10px', marginBottom: '2px', borderBottom: '1px dotted #999', paddingBottom: '1px' }}>
              <span style={{ fontWeight: 'bold' }}>{t('customers.manualSerialNo')}:</span>
              <span style={{ marginRight: '6px' }}>{String(order.manual_serial_no).trim()}</span>
            </div>
          )}
          <div style={{ fontSize: '10px', marginBottom: '2px', borderBottom: '1px dotted #999', paddingBottom: '1px' }}>
            <span style={{ fontWeight: 'bold' }}>اسم مشتری:</span>
            <span style={{ marginRight: '6px' }}>{customerName}</span>
          </div>
          <div style={{ fontSize: '10px', marginBottom: '2px', borderBottom: '1px dotted #999', paddingBottom: '1px' }}>
            <span style={{ fontWeight: 'bold' }}>شماره تماس:</span>
            <span style={{ marginRight: '6px' }}>{customerPhone}</span>
          </div>
          <div style={{ fontSize: '10px', borderBottom: '1px dotted #999', paddingBottom: '1px' }}>
            <span style={{ fontWeight: 'bold' }}>آدرس مشتری:</span>
            <span style={{ marginRight: '6px' }}>{customerAddress}</span>
          </div>
          {order.notes && String(order.notes).trim() ? (
            <div style={{ fontSize: '10px', marginTop: '3px', paddingTop: '3px', borderTop: '1px dotted #ccc' }} dir="rtl">
              <span style={{ fontWeight: 'bold' }}>{t('orders.billNotesHeading')}:</span>
              <span style={{ marginRight: '8px', whiteSpace: 'pre-wrap' }}>{order.notes}</span>
            </div>
          ) : null}
        </div>

        {/* Table — exactly 11 rows */}
        <div className="quotation-table-section" style={{ padding: '0 12px' }}>
          <table className="quotation-bill-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#0047AB', color: 'white' }}>
                <th style={{ ...thStyle, width: '28px' }} dir="rtl">شماره</th>
                <th style={{ ...thStyle, textAlign: 'right' }} dir="rtl">تفصیلات</th>
                <th style={{ ...thStyle, width: '64px' }} dir="rtl">سایز</th>
                <th style={{ ...thStyle, width: '44px' }} dir="rtl">تعداد</th>
                <th style={{ ...thStyle, width: '56px' }} dir="rtl">قیمت</th>
                <th style={{ ...thStyle, width: '68px' }} dir="rtl">قیمت مجموعی</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((row, idx) => {
                const qty = row.quantity || '';
                const perPrice =
                  row.price_estimate != null && row.price_estimate !== ''
                    ? row.price_estimate
                    : row.price_per_unit != null && row.price_per_unit !== ''
                      ? row.price_per_unit
                      : '';
                const total = row.total || '';
                const descBase = row.item_name || row.item?.name || '';
                const design = (row.quality_design_type || '').trim();
                const desc = design ? (descBase ? `${descBase} — ${design}` : design) : descBase;
                const flagSize = row.flag_size || '';
                const flagStandSize = row.flag_stand_size || '';
                const sizeDisplay = flagSize && flagStandSize ? `${flagSize} / ${flagStandSize}` : flagSize || flagStandSize || '';
                
                return (
                  <tr key={row.id || idx} className="quotation-bill-row" style={{ backgroundColor: idx % 2 === 0 ? '#f8f9fa' : '#fff', height: rowHeight }}>
                    <td style={{ 
                      ...tdStyle,
                      color: '#0047AB',
                      fontWeight: 'bold',
                    }}>{idx + 1}</td>
                    <td style={tdDesc} dir="rtl">{desc}</td>
                    <td style={tdStyle}>{sizeDisplay}</td>
                    <td style={tdStyle}>{qty}</td>
                    <td style={tdStyle}>
                      {perPrice && `AFN ${parseFloat(perPrice).toFixed(0)}`}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 'bold' }}>
                      {total && `AFN ${parseFloat(total).toFixed(0)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {truncated ? (
            <p style={{ fontSize: '8px', color: '#666', marginTop: '3px', textAlign: 'center' }} dir="ltr">
              {t('quotations.linesTruncated', { shown: QUOTATION_ROWS_PER_PAGE, total: items.length })}
            </p>
          ) : null}
        </div>

        {/* Totals Section */}
        <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }} dir="rtl">
          <div style={{ 
            border: '3px solid #0047AB',
            padding: '6px 20px',
            clipPath: 'polygon(0 0, 100% 0, 90% 50%, 100% 100%, 0 100%)',
            minWidth: '140px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>
              مجموع پول:
            </div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', textAlign: 'center', marginTop: '2px' }}>
              {grandTotal.toFixed(0)}
            </div>
          </div>

          <div style={{ flex: 1, paddingRight: '20px' }}>
            <div style={{ fontSize: '10px', marginBottom: '4px', borderBottom: '1px dotted #999', paddingBottom: '2px' }}>
              <span style={{ fontWeight: 'bold' }}>رسید:</span>
              <span style={{ marginRight: '6px' }}>{totalPaid.toFixed(0)}</span>
            </div>
            <div style={{ fontSize: '10px', marginBottom: '4px', borderBottom: '1px dotted #999', paddingBottom: '2px' }}>
              <span style={{ fontWeight: 'bold' }}>باقی مانده:</span>
              <span style={{ marginRight: '6px' }}>{remaining.toFixed(0)}</span>
            </div>
            <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '10px' }}>
               مهر و امضاء
              <div style={{ borderTop: '1px solid #000', marginTop: '14px', width: '120px', marginLeft: 'auto', marginRight: 'auto' }}></div>
            </div>
          </div>
        </div>
        </div>

        {/* Yellow Footer — pinned to bottom of A4 */}
        <div className="quotation-bill-footer" style={{ 
          backgroundColor: '#FFD700', 
          padding: '6px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          boxSizing: 'border-box',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>📞</span>
              <span>{BILL_FOOTER.phones}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>📧</span>
              <span>{BILL_FOOTER.email}</span>
            </div>
          </div>

          <div style={{
            backgroundColor: '#0047AB',
            color: 'white',
            padding: '5px 20px 5px 12px',
            fontSize: '9px',
            clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 15% 100%, 0 50%)',
            textAlign: 'right',
            maxWidth: '360px'
          }} dir="rtl">
            آدرس: <span style={{ marginRight: '5px' }}>{BILL_FOOTER.address}</span>
          </div>
        </div>
      </div>

      <style>{QUOTATION_PRINT_CSS}</style>
    </div>
  );
};

export default PrintableQuotation;
