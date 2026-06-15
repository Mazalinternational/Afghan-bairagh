import React, { useRef, useState, useEffect } from 'react';
import { PrinterIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n/fallback';
import { formatBillDateParts } from '../../utils/billFormat';

const BILL_FOOTER = {
  phones: '0744841167, 0704737305, 0730117373',
  email: 'afghanart.af@gmail.com',
  address: 'چهارراهی صدارت، سرک وزارت داخله سابقه، مارکیت مطابع صنعتی جاوید، منزل دوم دوکان نمبر A2 14-15',
};

/** Minimum blank rows on the bill; compact layout fits at least this many real items on one A4 page. */
const QUOTATION_MIN_ROWS = 7;

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

  const displayItems = [...items];
  while (displayItems.length < QUOTATION_MIN_ROWS) {
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

  const thStyle = { border: '1px solid #0047AB', padding: '5px 4px', textAlign: 'center', fontSize: '9px', lineHeight: 1.2 };
  const tdStyle = { border: '1px solid #ddd', padding: '4px 4px', textAlign: 'center', fontSize: '9px', lineHeight: 1.25 };
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
        style={{ width: '210mm', maxWidth: '100%', minHeight: '297mm', padding: 0, boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}
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

        {/* Content wrapper */}
        <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Blue Header with Logo */}
        <div className="flex items-stretch" style={{ height: '76px' }}>
          <div className="flex items-center justify-center" style={{ 
            width: '35%', 
            backgroundColor: '#0047AB',
            padding: '8px'
          }}>
            <img 
              src={systemLogo} 
              alt="Wahid Afghan Logo" 
              style={{ 
                width: '60px', 
                height: '60px', 
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
              fontSize: '20px', 
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
          padding: '6px 16px', 
          backgroundColor: '#0047AB', 
          color: 'white',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          {t('quotations.printHeading')}
        </div>

        {/* Customer Info Section */}
        <div style={{ padding: '8px 16px', backgroundColor: '#f8f9fa' }} dir="rtl">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <div style={{ fontSize: '11px' }}>
              <span style={{ fontWeight: 'bold' }}>تاریخ:</span>
              <span style={{ marginRight: '8px' }}>
                {billDateParts
                  ? `${billDateParts.year}/${billDateParts.month}/${billDateParts.day}`
                  : t('orders.billDateNotSet')}
              </span>
            </div>
          </div>
          {(order.manual_serial_no || '').trim() !== '' && (
            <div style={{ fontSize: '11px', marginBottom: '3px', borderBottom: '1px dotted #999', paddingBottom: '2px' }}>
              <span style={{ fontWeight: 'bold' }}>{t('customers.manualSerialNo')}:</span>
              <span style={{ marginRight: '8px' }}>{String(order.manual_serial_no).trim()}</span>
            </div>
          )}
          <div style={{ fontSize: '11px', marginBottom: '3px', borderBottom: '1px dotted #999', paddingBottom: '2px' }}>
            <span style={{ fontWeight: 'bold' }}>اسم مشتری:</span>
            <span style={{ marginRight: '8px' }}>{customerName}</span>
          </div>
          <div style={{ fontSize: '11px', marginBottom: '3px', borderBottom: '1px dotted #999', paddingBottom: '2px' }}>
            <span style={{ fontWeight: 'bold' }}>شماره تماس:</span>
            <span style={{ marginRight: '8px' }}>{customerPhone}</span>
          </div>
          <div style={{ fontSize: '11px', borderBottom: '1px dotted #999', paddingBottom: '2px' }}>
            <span style={{ fontWeight: 'bold' }}>آدرس مشتری:</span>
            <span style={{ marginRight: '8px' }}>{customerAddress}</span>
          </div>
          {order.notes && String(order.notes).trim() ? (
            <div style={{ fontSize: '11px', marginTop: '4px', paddingTop: '4px', borderTop: '1px dotted #ccc' }} dir="rtl">
              <span style={{ fontWeight: 'bold' }}>{t('orders.billNotesHeading')}:</span>
              <span style={{ marginRight: '8px', whiteSpace: 'pre-wrap' }}>{order.notes}</span>
            </div>
          ) : null}
        </div>

        {/* Table */}
        <div style={{ padding: '0 14px' }}>
          <table className="quotation-bill-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '6px', tableLayout: 'fixed' }}>
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
                  <tr key={row.id || idx} style={{ backgroundColor: idx % 2 === 0 ? '#f8f9fa' : '#fff' }}>
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
        </div>

        {/* Totals Section */}
        <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }} dir="rtl">
          <div style={{ 
            border: '3px solid #0047AB',
            padding: '8px 24px',
            clipPath: 'polygon(0 0, 100% 0, 90% 50%, 100% 100%, 0 100%)',
            minWidth: '160px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>
              مجموع پول:
            </div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', textAlign: 'center', marginTop: '3px' }}>
              {grandTotal.toFixed(0)}
            </div>
          </div>

          <div style={{ flex: 1, paddingRight: '24px' }}>
            <div style={{ fontSize: '11px', marginBottom: '6px', borderBottom: '1px dotted #999', paddingBottom: '3px' }}>
              <span style={{ fontWeight: 'bold' }}>رسید:</span>
              <span style={{ marginRight: '8px' }}>{totalPaid.toFixed(0)}</span>
            </div>
            <div style={{ fontSize: '11px', marginBottom: '6px', borderBottom: '1px dotted #999', paddingBottom: '3px' }}>
              <span style={{ fontWeight: 'bold' }}>باقی مانده:</span>
              <span style={{ marginRight: '8px' }}>{remaining.toFixed(0)}</span>
            </div>
            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px' }}>
               مهر و امضاء
              <div style={{ borderTop: '1px solid #000', marginTop: '20px', width: '130px', marginLeft: 'auto', marginRight: 'auto' }}></div>
            </div>
          </div>
        </div>

        {/* Yellow Footer */}
        <div style={{ 
          backgroundColor: '#FFD700', 
          padding: '8px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '8px',
          position: 'relative'
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
      </div>

      <style>{`
        .quotation-bill-a4 {
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
          body * { visibility: hidden; }
          .printable-bill, .printable-bill * { visibility: visible; }
          .printable-bill {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            min-height: 297mm !important;
            height: auto !important;
            background: white !important;
            box-shadow: none !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .quotation-bill-a4 .quotation-bill-table { font-size: 8.5px; }
          .quotation-bill-a4 .quotation-bill-table th,
          .quotation-bill-a4 .quotation-bill-table td { padding: 3px 4px !important; }
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
            margin: 0;
          }
        }
        .watermark-quotation {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      `}</style>
    </div>
  );
};

export default PrintableQuotation;
