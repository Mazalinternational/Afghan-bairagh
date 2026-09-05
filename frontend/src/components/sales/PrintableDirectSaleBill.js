import React, { useRef, useState } from 'react';
import { useTranslation } from '../../i18n/fallback';
import { formatBillDateParts } from '../../utils/billFormat';
import BillPrintControls from '../common/BillPrintControls';
import { getBillContainerStyle, getBillLayout, getBillPrintCss, printBillFromRef } from '../../utils/billPrintSizes';

const BILL_FOOTER = {
  phones: '0744841167, 0704737305, 0730117373',
  email: 'afghanart.af@gmail.com',
  address: 'چهارراهی صدارت، سرک وزارت داخله سابقه، مارکیت مطابع صنعتی جاوید، منزل دوم دوکان نمبر A2 14-15',
};

const PrintableDirectSaleBill = ({ sale }) => {
  const { t } = useTranslation();
  const billRef = useRef(null);
  const [pageSize, setPageSize] = useState('A4');
  const [systemLogo] = useState(`/logo.jpeg?v=${Date.now()}`);
  const [systemName] = useState('بیرق سازی افغان');

  const handlePrint = () => {
    printBillFromRef(billRef, pageSize);
  };

  if (!sale) return null;

  const customerName = sale.customer_name_display || sale.customer_name || '';
  const billNo = sale.id;
  const billDateParts = formatBillDateParts(sale.sale_date ?? sale.created_at);
  const shouldShowDate = sale.show_date_on_bill !== false;

  const items = sale.items || [];
  const displayItems = [...items];
  while (displayItems.length < 11) {
    displayItems.push({ id: `empty-${displayItems.length}`, item_name: '', quantity: '', price_per_unit: '', total: '' });
  }

  const discount = parseFloat(sale.discount) || 0;
  const itemsSubtotal = items.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
  const grandTotal = parseFloat(sale.net_amount || 0);
  const subtotalBeforeDiscount =
    sale.total_amount != null && !Number.isNaN(parseFloat(sale.total_amount))
      ? parseFloat(sale.total_amount)
      : itemsSubtotal > 0
        ? itemsSubtotal
        : discount > 0
          ? grandTotal + discount
          : grandTotal;
  const totalPaid = parseFloat(sale.total_paid || 0);
  const remaining = Math.max(0, grandTotal - totalPaid);
  const layout = getBillLayout(pageSize);
  const thCell = {
    border: '1px solid #0047AB',
    padding: layout.thPadding,
    textAlign: 'center',
    fontSize: `${layout.thFontSize}px`,
    lineHeight: 1.2,
  };
  const tdBase = {
    border: '1px solid #ddd',
    padding: layout.tdPadding,
    textAlign: 'center',
    fontSize: `${layout.tdFontSize}px`,
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

      <div ref={billRef} className="printable-bill bg-white shadow-lg mx-auto" style={{ ...getBillContainerStyle(pageSize), padding: '0' }}>
        <div className="flex items-stretch" style={{ height: `${layout.headerHeight}px` }}>
          <div className="flex items-center justify-center" style={{ width: '35%', backgroundColor: '#0047AB', padding: layout.headerPadding }}>
            <img src={systemLogo} alt="Logo" style={{ width: `${layout.logoSize}px`, height: `${layout.logoSize}px`, borderRadius: '50%', objectFit: 'cover', border: `${layout.logoBorder}px solid white`, backgroundColor: 'white' }} />
          </div>
          <div className="flex items-center justify-center" style={{ width: '40%', backgroundColor: '#FFD700', padding: layout.headerPadding }}>
            <h1 style={{ fontSize: `${layout.titleFontSize}px`, fontWeight: 'bold', color: '#000', textAlign: 'center', margin: 0 }} dir="rtl">{systemName}</h1>
          </div>
          <div className="flex items-center justify-center" style={{ width: '25%', backgroundColor: '#fff', position: 'relative', padding: layout.headerPadding }}>
            <div style={{ position: 'absolute', left: 0, top: '30%', transform: 'translateY(-50%)', backgroundColor: '#0047AB', color: 'white', padding: layout.billLabelPadding, fontSize: `${layout.billLabelFontSize}px`, fontWeight: 'bold', clipPath: 'polygon(0 0, 100% 0, 85% 50%, 100% 100%, 0 100%)' }} dir="rtl">نمبر بل</div>
            <div style={{ position: 'absolute', bottom: layout.compact ? '4px' : '10px', right: layout.compact ? '6px' : '10px', fontSize: `${layout.serialFontSize}px`, fontWeight: 'bold', color: '#0047AB' }} dir="rtl">
              نمبر مسلسل: {billNo}
              {(sale.manual_serial_no || '').trim() !== ''
                ? ` · ${String(sale.manual_serial_no).trim()}`
                : ''}
            </div>
          </div>
        </div>

        <div style={{ padding: layout.infoPadding, backgroundColor: '#f8f9fa' }} dir="rtl">
          {shouldShowDate && (
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
          )}
          <div style={{ fontSize: `${layout.infoFontSize}px`, marginBottom: `${layout.infoMarginBottom}px`, borderBottom: '1px dotted #999', paddingBottom: layout.compact ? '1px' : '3px' }}>
            <span style={{ fontWeight: 'bold' }}>اسم مشتری:</span>
            <span style={{ marginRight: '10px' }}>{customerName}</span>
          </div>
          {sale.notes && String(sale.notes).trim() ? (
            <div style={{ fontSize: `${layout.infoFontSize}px`, marginTop: layout.compact ? '2px' : '8px', paddingTop: layout.compact ? '2px' : '8px', borderTop: '1px dotted #ccc' }} dir="rtl">
              <span style={{ fontWeight: 'bold' }}>{t('orders.billNotesHeading')}:</span>
              <span style={{ marginRight: '10px', whiteSpace: 'pre-wrap' }}>{sale.notes}</span>
            </div>
          ) : null}
        </div>

        <div style={{ padding: layout.tableWrapPadding }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: `${layout.tableMarginTop}px` }}>
            <thead>
              <tr style={{ backgroundColor: '#0047AB', color: 'white' }}>
                <th style={{ ...thCell, width: `${layout.colIndex}px` }} dir="rtl">شماره</th>
                <th style={{ ...thCell, textAlign: 'right' }} dir="rtl">تفصیلات</th>
                <th style={{ ...thCell, width: `${layout.colSize}px` }} dir="rtl">سایز</th>
                <th style={{ ...thCell, width: `${layout.colDesign}px` }} dir="rtl">دیزاین</th>
                <th style={{ ...thCell, width: `${layout.colQty}px` }} dir="rtl">تعداد</th>
                <th style={{ ...thCell, width: `${layout.colPrice}px` }} dir="rtl">قیمت</th>
                <th style={{ ...thCell, width: `${layout.colTotal}px` }} dir="rtl">قیمت مجموعی</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((row, idx) => (
                <tr key={row.id || idx} style={{ backgroundColor: idx % 2 === 0 ? '#f8f9fa' : '#fff' }}>
                  <td style={{ ...tdBase, color: '#0047AB', fontWeight: 'bold', fontSize: `${layout.indexFontSize}px` }}>{idx + 1}</td>
                  <td style={{ ...tdBase, textAlign: 'right' }} dir="rtl">{row.item_name || ''}</td>
                  <td style={tdBase}>{row.flag_size || ''}</td>
                  <td style={tdBase} dir="rtl">{row.quality_design_type || ''}</td>
                  <td style={tdBase}>{row.quantity || ''}</td>
                  <td style={tdBase}>{row.price_per_unit && parseFloat(row.price_per_unit).toFixed(0)}</td>
                  <td style={{ ...tdBase, fontWeight: 'bold' }}>{row.total && parseFloat(row.total).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: layout.totalsPadding, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }} dir="rtl">
          <div style={{ border: layout.compact ? '2px solid #0047AB' : '3px solid #0047AB', padding: layout.totalsBoxPadding, clipPath: 'polygon(0 0, 100% 0, 90% 50%, 100% 100%, 0 100%)', minWidth: `${layout.totalsBoxMinWidth}px` }}>
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
            <div style={{ fontSize: `${layout.totalsTitleSize}px`, fontWeight: 'bold', textAlign: 'center' }}>مجموع پول:</div>
            <div style={{ fontSize: `${layout.totalsValueSize}px`, fontWeight: 'bold', textAlign: 'center', marginTop: layout.compact ? '1px' : '5px' }}>{grandTotal.toFixed(0)}</div>
          </div>
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

        <div style={{ backgroundColor: '#FFD700', padding: layout.footerPadding, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: `${layout.footerMarginTop}px` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: layout.compact ? '8px' : '15px', fontSize: `${layout.footerFontSize}px` }}>
            <div><span>📞</span> <span>{BILL_FOOTER.phones}</span></div>
            <div><span>📧</span> <span>{BILL_FOOTER.email}</span></div>
          </div>
          <div style={{ backgroundColor: '#0047AB', color: 'white', padding: layout.footerAddressPadding, fontSize: `${layout.footerAddressSize}px`, clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 15% 100%, 0 50%)', textAlign: 'right', maxWidth: `${layout.footerAddressMaxWidth}px` }} dir="rtl">
            آدرس: <span style={{ marginRight: '5px' }}>{BILL_FOOTER.address}</span>
          </div>
        </div>
      </div>

      <style>{getBillPrintCss(pageSize)}</style>
    </div>
  );
};

export default PrintableDirectSaleBill;
