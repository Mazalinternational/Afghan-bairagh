import React, { useRef, useState, useEffect } from 'react';
import { PrinterIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useTranslation } from '../../i18n/fallback';
import { formatBillDateParts } from '../../utils/billFormat';

const BILL_FOOTER = {
  phones: '0744841167, 0704737305, 0730117373',
  email: 'afghanart.af@gmail.com',
  address: 'چهارراهی صدارت، سرک وزارت داخله سابقه، مارکیت مطابع صنعتی جاوید، منزل دوم دوکان نمبر A2 14-15',
};

const PrintableBill = ({ order, customer }) => {
  const { t } = useTranslation();
  const billRef = useRef(null);
  const [systemLogo, setSystemLogo] = useState(`/logo.jpeg?v=${Date.now()}`);
  const [systemName, setSystemName] = useState('بیرق سازی افغان');

  useEffect(() => {
    // Always use the local logo file and default name
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
  const billDateRaw = Object.prototype.hasOwnProperty.call(order, 'bill_date')
    ? order.bill_date
    : (order.order_date ?? order.quotation_date ?? order.sale_date ?? order.created_at);
  const billDateParts = formatBillDateParts(billDateRaw);

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

  // Fill empty rows to make 11 total
  const displayItems = [...items];
  while (displayItems.length < 11) {
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
          {t('sales.printBill')}
        </button>
      </div>

      <div
        ref={billRef}
        className="printable-bill bg-white shadow-lg mx-auto"
        style={{ width: '210mm', minHeight: '297mm', padding: '0' }}
      >
        {/* Blue Header with Logo */}
        <div className="flex items-stretch" style={{ height: '100px' }}>
          {/* Left side - Blue with Logo */}
          <div className="flex items-center justify-center" style={{ 
            width: '35%', 
            backgroundColor: '#0047AB',
            padding: '10px'
          }}>
            <img 
              src={systemLogo} 
              alt="Wahid Afghan Logo" 
              style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                objectFit: 'cover',
                border: '3px solid white',
                backgroundColor: 'white'
              }} 
            />
          </div>
          
          {/* Middle - Yellow with Company Name */}
          <div className="flex items-center justify-center" style={{ 
            width: '40%', 
            backgroundColor: '#FFD700',
            padding: '15px'
          }}>
            <h1 style={{ 
              fontSize: '26px', 
              fontWeight: 'bold',
              color: '#000',
              textAlign: 'center',
              fontFamily: 'Arial, sans-serif'
            }} dir="rtl">
              {systemName}
            </h1>
          </div>

          {/* Right side - White with Receipt label and bill number */}
          <div className="flex items-center justify-center" style={{ 
            width: '25%',
            backgroundColor: '#fff',
            position: 'relative',
            padding: '10px'
          }}>
            <div style={{
              position: 'absolute',
              left: 0,
              top: '30%',
              transform: 'translateY(-50%)',
              backgroundColor: '#0047AB',
              color: 'white',
              padding: '8px 20px',
              fontSize: '18px',
              fontWeight: 'bold',
              clipPath: 'polygon(0 0, 100% 0, 85% 50%, 100% 100%, 0 100%)',
              fontFamily: 'Arial, sans-serif'
            }} dir="rtl">
               نمبر بل
            </div>
            <div style={{
              position: 'absolute',
              bottom: '10px',
              right: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#0047AB'
            }} dir="rtl">
              نمبر مسلسل: {billNo}
            </div>
          </div>
        </div>

        {/* Customer Info Section */}
        <div style={{ padding: '15px 20px', backgroundColor: '#f8f9fa' }} dir="rtl">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontSize: '14px' }}>
              <span style={{ fontWeight: 'bold' }}>تاریخ:</span>
              <span style={{ marginRight: '10px' }}>
                {billDateParts
                  ? `${billDateParts.year}/${billDateParts.month}/${billDateParts.day}`
                  : t('orders.billDateNotSet')}
              </span>
            </div>
          </div>
          <div style={{ fontSize: '14px', marginBottom: '5px', borderBottom: '1px dotted #999', paddingBottom: '3px' }}>
            <span style={{ fontWeight: 'bold' }}>اسم مشتری:</span>
            <span style={{ marginRight: '10px' }}>{customerName}</span>
          </div>
          <div style={{ fontSize: '14px', marginBottom: '5px', borderBottom: '1px dotted #999', paddingBottom: '3px' }}>
            <span style={{ fontWeight: 'bold' }}>شماره تماس:</span>
            <span style={{ marginRight: '10px' }}>{customerPhone}</span>
          </div>
          <div style={{ fontSize: '14px', borderBottom: '1px dotted #999', paddingBottom: '3px' }}>
            <span style={{ fontWeight: 'bold' }}>آدرس مشتری:</span>
            <span style={{ marginRight: '10px' }}>{customerAddress}</span>
          </div>
          {order.notes && String(order.notes).trim() ? (
            <div style={{ fontSize: '14px', marginTop: '8px', paddingTop: '8px', borderTop: '1px dotted #ccc' }} dir="rtl">
              <span style={{ fontWeight: 'bold' }}>{t('orders.billNotesHeading')}:</span>
              <span style={{ marginRight: '10px', whiteSpace: 'pre-wrap' }}>{order.notes}</span>
            </div>
          ) : null}
        </div>

        {/* Table */}
        <div style={{ padding: '0 20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0047AB', color: 'white' }}>
                <th style={{ border: '1px solid #0047AB', padding: '8px', textAlign: 'center', width: '60px' }} dir="rtl">شماره</th>
                <th style={{ border: '1px solid #0047AB', padding: '8px', textAlign: 'right' }} dir="rtl">تفصیلات</th>
                <th style={{ border: '1px solid #0047AB', padding: '8px', textAlign: 'center', width: '100px' }} dir="rtl">سایز</th>
                <th style={{ border: '1px solid #0047AB', padding: '8px', textAlign: 'center', width: '80px' }} dir="rtl">تعداد</th>
                <th style={{ border: '1px solid #0047AB', padding: '8px', textAlign: 'center', width: '100px' }} dir="rtl">قیمت</th>
                <th style={{ border: '1px solid #0047AB', padding: '8px', textAlign: 'center', width: '120px' }} dir="rtl">قیمت مجموعی</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((row, idx) => {
                const qty = row.quantity || '';
                const perPrice = row.price_estimate || row.price_per_unit || '';
                const total = row.total || '';
                const desc = row.item_name || row.item?.name || '';
                const flagSize = row.flag_size || '';
                const flagStandSize = row.flag_stand_size || '';
                const sizeDisplay = flagSize && flagStandSize ? `${flagSize} / ${flagStandSize}` : flagSize || flagStandSize || '';
                
                return (
                  <tr key={row.id || idx} style={{ backgroundColor: idx % 2 === 0 ? '#f8f9fa' : '#fff' }}>
                    <td style={{ 
                      border: '1px solid #ddd', 
                      padding: '10px', 
                      textAlign: 'center',
                      color: '#0047AB',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'right', fontSize: '13px' }} dir="rtl">{desc}</td>
                    <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center', fontSize: '13px' }}>{sizeDisplay}</td>
                    <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center', fontSize: '13px' }}>{qty}</td>
                    <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center', fontSize: '13px' }}>
                      {perPrice && `AFN ${parseFloat(perPrice).toFixed(0)}`}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold' }}>
                      {total && `AFN ${parseFloat(total).toFixed(0)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }} dir="rtl">
          {/* Left side - Total box */}
          <div style={{ 
            border: '3px solid #0047AB',
            padding: '15px 40px',
            clipPath: 'polygon(0 0, 100% 0, 90% 50%, 100% 100%, 0 100%)',
            minWidth: '200px'
          }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', textAlign: 'center' }}>
              مجموع پول:
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', marginTop: '5px' }}>
              {grandTotal.toFixed(0)}
            </div>
          </div>

          {/* Right side - Receipt and Balance */}
          <div style={{ flex: 1, paddingRight: '40px' }}>
            <div style={{ fontSize: '14px', marginBottom: '10px', borderBottom: '1px dotted #999', paddingBottom: '5px' }}>
              <span style={{ fontWeight: 'bold' }}>رسید:</span>
              <span style={{ marginRight: '10px' }}>{totalPaid.toFixed(0)}</span>
            </div>
            <div style={{ fontSize: '14px', marginBottom: '10px', borderBottom: '1px dotted #999', paddingBottom: '5px' }}>
              <span style={{ fontWeight: 'bold' }}>باقی مانده:</span>
              <span style={{ marginRight: '10px' }}>{remaining.toFixed(0)}</span>
            </div>
            <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '13px' }}>
               مهر و امضاء
              <div style={{ borderTop: '1px solid #000', marginTop: '30px', width: '150px', marginLeft: 'auto', marginRight: 'auto' }}></div>
            </div>
          </div>
        </div>

        {/* Yellow Footer */}
        <div style={{ 
          backgroundColor: '#FFD700', 
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '20px',
          position: 'relative'
        }}>
          {/* Left side - Contact info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>📞</span>
              <span>{BILL_FOOTER.phones}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>📧</span>
              <span>{BILL_FOOTER.email}</span>
            </div>
          </div>

          {/* Right side - Blue arrow with address */}
          <div style={{
            backgroundColor: '#0047AB',
            color: 'white',
            padding: '8px 30px 8px 15px',
            fontSize: '11px',
            clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 15% 100%, 0 50%)',
            textAlign: 'right',
            maxWidth: '400px'
          }} dir="rtl">
            آدرس: <span style={{ marginRight: '5px' }}>{BILL_FOOTER.address}</span>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable-bill, .printable-bill * { visibility: visible; }
          .printable-bill {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm !important;
            height: 297mm !important;
            background: white;
            box-shadow: none !important;
          }
          button { display: none !important; }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintableBill;
