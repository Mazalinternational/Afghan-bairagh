import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/fallback';
import { formatBillDateParts } from '../../utils/billFormat';
import BillPrintControls from '../common/BillPrintControls';
import { getBillContainerStyle, getBillLayout, getBillPrintCss, printBillFromRef } from '../../utils/billPrintSizes';

const BILL_FOOTER = {
  phones: '0744841167, 0704737305, 0730117373',
  email: 'afghanart.af@gmail.com',
  address: 'چهارراهی صدارت، سرک وزارت داخله سابقه، مارکیت مطابع صنعتی جاوید، منزل دوم دوکان نمبر A2 14-15',
};

const PrintableBill = ({ order, customer }) => {
  const { t } = useTranslation();
  const billRef = useRef(null);
  const [pageSize, setPageSize] = useState('A4');
  const [systemLogo, setSystemLogo] = useState(`/logo.jpeg?v=${Date.now()}`);
  const [systemName, setSystemName] = useState('بیرق سازی افغان');

  useEffect(() => {
    // Always use the local logo file and default name
    setSystemLogo(`/logo.jpeg?v=${Date.now()}`);
    setSystemName('بیرق سازی افغان');
  }, []);

  const handlePrint = () => {
    printBillFromRef(billRef, pageSize);
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
          price_estimate: order.price_per_unit || order.price_estimate || 0,
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

  const itemsSubtotal = items.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
  const discount = parseFloat(order.discount) || 0;
  const tax = parseFloat(order.tax) || 0;
  const grandTotal = order.total_estimated_amount != null
    ? parseFloat(order.total_estimated_amount)
    : order.net_amount != null && order.net_amount !== ''
      ? parseFloat(order.net_amount)
      : parseFloat(order.total_amount) ||
        itemsSubtotal ||
        0;
  const subtotalBeforeDiscount =
    order.total_amount != null && !Number.isNaN(parseFloat(order.total_amount))
      ? parseFloat(order.total_amount)
      : itemsSubtotal > 0
        ? itemsSubtotal
        : discount > 0
          ? grandTotal + discount - tax
          : grandTotal;

  const totalPaid = order.payments?.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0) ?? 
    (order.total_paid != null ? parseFloat(order.total_paid) : 0);
  const remaining = Math.max(0, grandTotal - totalPaid);
  const layout = getBillLayout(pageSize);
  const thCell = {
    border: '1px solid #0047AB',
    padding: layout.thPadding,
    textAlign: 'center',
    fontSize: `${layout.thFontSize}px`,
    lineHeight: 1.2,
  };

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
        className="printable-bill bg-white shadow-lg mx-auto"
        style={{ ...getBillContainerStyle(pageSize), padding: 0 }}
      >
        {/* Blue Header with Logo */}
        <div className="flex items-stretch" style={{ height: `${layout.headerHeight}px` }}>
          {/* Left side - Blue with Logo */}
          <div className="flex items-center justify-center" style={{ 
            width: '35%', 
            backgroundColor: '#0047AB',
            padding: layout.headerPadding
          }}>
            <img 
              src={systemLogo} 
              alt="Wahid Afghan Logo" 
              style={{ 
                width: `${layout.logoSize}px`, 
                height: `${layout.logoSize}px`, 
                borderRadius: '50%', 
                objectFit: 'cover',
                border: `${layout.logoBorder}px solid white`,
                backgroundColor: 'white'
              }} 
            />
          </div>
          
          {/* Middle - Yellow with Company Name */}
          <div className="flex items-center justify-center" style={{ 
            width: '40%', 
            backgroundColor: '#FFD700',
            padding: layout.headerPadding
          }}>
            <h1 style={{ 
              fontSize: `${layout.titleFontSize}px`, 
              fontWeight: 'bold',
              color: '#000',
              textAlign: 'center',
              fontFamily: 'Arial, sans-serif',
              margin: 0,
            }} dir="rtl">
              {systemName}
            </h1>
          </div>

          {/* Right side - White with Receipt label and bill number */}
          <div className="flex items-center justify-center" style={{ 
            width: '25%',
            backgroundColor: '#fff',
            position: 'relative',
            padding: layout.headerPadding
          }}>
            <div style={{
              position: 'absolute',
              left: 0,
              top: '30%',
              transform: 'translateY(-50%)',
              backgroundColor: '#0047AB',
              color: 'white',
              padding: layout.billLabelPadding,
              fontSize: `${layout.billLabelFontSize}px`,
              fontWeight: 'bold',
              clipPath: 'polygon(0 0, 100% 0, 85% 50%, 100% 100%, 0 100%)',
              fontFamily: 'Arial, sans-serif'
            }} dir="rtl">
               نمبر بل
            </div>
            <div style={{
              position: 'absolute',
              bottom: layout.compact ? '4px' : '10px',
              right: layout.compact ? '6px' : '10px',
              fontSize: `${layout.serialFontSize}px`,
              fontWeight: 'bold',
              color: '#0047AB'
            }} dir="rtl">
              نمبر مسلسل: {billNo}
            </div>
          </div>
        </div>

        {/* Customer Info Section */}
        <div style={{ padding: layout.infoPadding, backgroundColor: '#f8f9fa' }} dir="rtl">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: layout.compact ? '2px' : '8px' }}>
            <div style={{ fontSize: `${layout.infoFontSize}px` }}>
              <span style={{ fontWeight: 'bold' }}>تاریخ:</span>
              <span style={{ marginRight: '10px' }}>
                {billDateParts
                  ? `${billDateParts.year}/${billDateParts.month}/${billDateParts.day}`
                  : t('orders.billDateNotSet')}
              </span>
            </div>
          </div>
          <div style={{ fontSize: `${layout.infoFontSize}px`, marginBottom: `${layout.infoMarginBottom}px`, borderBottom: '1px dotted #999', paddingBottom: layout.compact ? '1px' : '3px' }}>
            <span style={{ fontWeight: 'bold' }}>اسم مشتری:</span>
            <span style={{ marginRight: '10px' }}>{customerName}</span>
          </div>
          <div style={{ fontSize: `${layout.infoFontSize}px`, marginBottom: `${layout.infoMarginBottom}px`, borderBottom: '1px dotted #999', paddingBottom: layout.compact ? '1px' : '3px' }}>
            <span style={{ fontWeight: 'bold' }}>شماره تماس:</span>
            <span style={{ marginRight: '10px' }}>{customerPhone}</span>
          </div>
          <div style={{ fontSize: `${layout.infoFontSize}px`, borderBottom: '1px dotted #999', paddingBottom: layout.compact ? '1px' : '3px' }}>
            <span style={{ fontWeight: 'bold' }}>آدرس مشتری:</span>
            <span style={{ marginRight: '10px' }}>{customerAddress}</span>
          </div>
          {order.notes && String(order.notes).trim() ? (
            <div style={{ fontSize: `${layout.infoFontSize}px`, marginTop: layout.compact ? '2px' : '8px', paddingTop: layout.compact ? '2px' : '8px', borderTop: '1px dotted #ccc' }} dir="rtl">
              <span style={{ fontWeight: 'bold' }}>{t('orders.billNotesHeading')}:</span>
              <span style={{ marginRight: '10px', whiteSpace: 'pre-wrap' }}>{order.notes}</span>
            </div>
          ) : null}
        </div>

        {/* Table */}
        <div style={{ padding: layout.tableWrapPadding }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: `${layout.tableMarginTop}px` }}>
            <thead>
              <tr style={{ backgroundColor: '#0047AB', color: 'white' }}>
                <th style={{ ...thCell, width: `${layout.colIndex}px` }} dir="rtl">شماره</th>
                <th style={{ ...thCell, textAlign: 'right' }} dir="rtl">تفصیلات</th>
                <th style={{ ...thCell, width: `${layout.colSize}px` }} dir="rtl">سایز</th>
                <th style={{ ...thCell, width: `${layout.colQty}px` }} dir="rtl">تعداد</th>
                <th style={{ ...thCell, width: `${layout.colPrice}px` }} dir="rtl">قیمت</th>
                <th style={{ ...thCell, width: `${layout.colTotal}px` }} dir="rtl">قیمت مجموعی</th>
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
                const desc = row.item_name || row.item?.name || '';
                const flagSize = row.flag_size || '';
                const flagStandSize = row.flag_stand_size || '';
                const sizeDisplay = flagSize && flagStandSize ? `${flagSize} / ${flagStandSize}` : flagSize || flagStandSize || '';
                
                const tdBase = {
                  border: '1px solid #ddd',
                  padding: layout.tdPadding,
                  textAlign: 'center',
                  fontSize: `${layout.tdFontSize}px`,
                  lineHeight: 1.2,
                };
                return (
                  <tr key={row.id || idx} style={{ backgroundColor: idx % 2 === 0 ? '#f8f9fa' : '#fff' }}>
                    <td style={{ 
                      ...tdBase,
                      color: '#0047AB',
                      fontWeight: 'bold',
                      fontSize: `${layout.indexFontSize}px`
                    }}>{idx + 1}</td>
                    <td style={{ ...tdBase, textAlign: 'right' }} dir="rtl">{desc}</td>
                    <td style={tdBase}>{sizeDisplay}</td>
                    <td style={tdBase}>{qty}</td>
                    <td style={tdBase}>
                      {perPrice && `AFN ${parseFloat(perPrice).toFixed(0)}`}
                    </td>
                    <td style={{ ...tdBase, fontWeight: 'bold' }}>
                      {total && `AFN ${parseFloat(total).toFixed(0)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div style={{ padding: layout.totalsPadding, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }} dir="rtl">
          {/* Left side - Total box */}
          <div style={{ 
            border: layout.compact ? '2px solid #0047AB' : '3px solid #0047AB',
            padding: layout.totalsBoxPadding,
            clipPath: 'polygon(0 0, 100% 0, 90% 50%, 100% 100%, 0 100%)',
            minWidth: `${layout.totalsBoxMinWidth}px`
          }}>
            {discount > 0 ? (
              <>
                <div style={{ fontSize: `${layout.paidFontSize}px`, textAlign: 'center', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 'bold' }}>مجموع:</span>{' '}
                  {subtotalBeforeDiscount.toFixed(0)}
                </div>
                <div style={{ fontSize: `${layout.paidFontSize}px`, textAlign: 'center', marginBottom: '3px', color: '#b91c1c' }}>
                  <span style={{ fontWeight: 'bold' }}>تخفیف:</span> {discount.toFixed(0)}
                </div>
              </>
            ) : null}
            <div style={{ fontSize: `${layout.totalsTitleSize}px`, fontWeight: 'bold', textAlign: 'center' }}>
              مجموع پول:
            </div>
            <div style={{ fontSize: `${layout.totalsValueSize}px`, fontWeight: 'bold', textAlign: 'center', marginTop: layout.compact ? '1px' : '5px' }}>
              {grandTotal.toFixed(0)}
            </div>
          </div>

          {/* Right side - Receipt and Balance */}
          <div style={{ flex: 1, paddingRight: layout.compact ? '16px' : '40px' }}>
            <div style={{ fontSize: `${layout.paidFontSize}px`, marginBottom: layout.compact ? '3px' : '10px', borderBottom: '1px dotted #999', paddingBottom: layout.compact ? '2px' : '5px' }}>
              <span style={{ fontWeight: 'bold' }}>رسید:</span>
              <span style={{ marginRight: '10px' }}>{totalPaid.toFixed(0)}</span>
            </div>
            <div style={{ fontSize: `${layout.paidFontSize}px`, marginBottom: layout.compact ? '3px' : '10px', borderBottom: '1px dotted #999', paddingBottom: layout.compact ? '2px' : '5px' }}>
              <span style={{ fontWeight: 'bold' }}>باقی مانده:</span>
              <span style={{ marginRight: '10px' }}>{remaining.toFixed(0)}</span>
            </div>
            <div style={{ textAlign: 'center', marginTop: `${layout.signatureMarginTop}px`, fontSize: `${layout.paidFontSize}px` }}>
               مهر و امضاء
              <div style={{ borderTop: '1px solid #000', marginTop: `${layout.signatureLineMargin}px`, width: `${layout.signatureWidth}px`, marginLeft: 'auto', marginRight: 'auto' }}></div>
            </div>
          </div>
        </div>

        {/* Yellow Footer */}
        <div style={{ 
          backgroundColor: '#FFD700', 
          padding: layout.footerPadding,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: `${layout.footerMarginTop}px`,
          position: 'relative'
        }}>
          {/* Left side - Contact info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: layout.compact ? '8px' : '15px', fontSize: `${layout.footerFontSize}px` }}>
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
            padding: layout.footerAddressPadding,
            fontSize: `${layout.footerAddressSize}px`,
            clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 15% 100%, 0 50%)',
            textAlign: 'right',
            maxWidth: `${layout.footerAddressMaxWidth}px`
          }} dir="rtl">
            آدرس: <span style={{ marginRight: '5px' }}>{BILL_FOOTER.address}</span>
          </div>
        </div>
      </div>

      <style>{getBillPrintCss(pageSize)}</style>
    </div>
  );
};

export default PrintableBill;
