import React, { useRef, useState } from 'react';
import { formatBillDateParts } from '../utils/billFormat';
import { useTranslation } from '../i18n/fallback';
import BillPrintControls from './common/BillPrintControls';
import { getBillContainerStyle, getBillLayout, getBillPrintCss, printBillFromRef } from '../utils/billPrintSizes';

const BILL_FOOTER = {
  phones: '0744841167, 0704737305, 0730117373',
  email: 'afghanart.af@gmail.com',
  address: 'چهارراهی صدارت، سرک وزارت داخله سابقه، مارکیت مطابع صنعتی جاوید، منزل دوم دوکان نمبر A2 14-15',
};

const PrintablePurchaseBill = ({ purchase }) => {
  const billRef = useRef(null);
  const [pageSize, setPageSize] = useState('A4');
  const { t } = useTranslation();

  if (!purchase) return null;

  const billDateParts = formatBillDateParts(purchase.purchase_date);
  const lines = Array.isArray(purchase.purchase_items) && purchase.purchase_items.length > 0
    ? purchase.purchase_items
    : [{
        item_name: purchase.item_name || '',
        quantity: purchase.quantity || 0,
        unit_cost: purchase.quantity ? (parseFloat(purchase.cost || 0) / parseFloat(purchase.quantity || 1)) : 0,
      }];

  const handlePrint = () => {
    printBillFromRef(billRef, pageSize);
  };

  const layout = getBillLayout(pageSize);
  const thCell = {
    border: '1px solid #0047AB',
    padding: layout.thPadding,
    textAlign: 'center',
    fontSize: `${layout.thFontSize}px`,
  };
  const tdBase = {
    border: '1px solid #ddd',
    padding: layout.tdPadding,
    textAlign: 'center',
    fontSize: `${layout.tdFontSize}px`,
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

      <div ref={billRef} className="printable-bill bg-white shadow-lg mx-auto" style={{ ...getBillContainerStyle(pageSize), padding: 0 }}>
        <div className="flex items-stretch" style={{ height: `${layout.headerHeight}px` }}>
          <div className="flex items-center justify-center" style={{ width: '35%', backgroundColor: '#0047AB', color: 'white' }}>
            <div style={{ fontSize: layout.compact ? '12px' : '20px', fontWeight: 'bold' }} dir="rtl">{t('purchases.purchaseBill')}</div>
          </div>
          <div className="flex items-center justify-center" style={{ width: '40%', backgroundColor: '#FFD700' }}>
            <h1 style={{ fontSize: `${layout.titleFontSize}px`, fontWeight: 'bold', margin: 0 }} dir="rtl">بیرق سازی افغان</h1>
          </div>
          <div className="flex items-center justify-center" style={{ width: '25%', backgroundColor: '#fff', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: '30%', transform: 'translateY(-50%)', backgroundColor: '#0047AB', color: 'white', padding: layout.billLabelPadding, fontSize: `${layout.billLabelFontSize}px`, fontWeight: 'bold', clipPath: 'polygon(0 0, 100% 0, 85% 50%, 100% 100%, 0 100%)' }} dir="rtl">
              {t('purchases.billNumber')}
            </div>
            <div style={{ position: 'absolute', bottom: layout.compact ? '4px' : '10px', right: layout.compact ? '6px' : '10px', fontWeight: 'bold', color: '#0047AB', fontSize: `${layout.serialFontSize}px` }}>
              #{purchase.bill_number || purchase.id}
            </div>
          </div>
        </div>

        <div style={{ padding: layout.infoPadding, backgroundColor: '#f8f9fa' }} dir="rtl">
          <div style={{ fontSize: `${layout.infoFontSize}px`, marginBottom: `${layout.infoMarginBottom}px`, borderBottom: '1px dotted #999', paddingBottom: layout.compact ? '1px' : '3px' }}>
            <span style={{ fontWeight: 'bold' }}>{t('common.date')}:</span>
            <span style={{ marginRight: '10px' }}>{billDateParts ? `${billDateParts.year}/${billDateParts.month}/${billDateParts.day}` : '-'}</span>
          </div>
          <div style={{ fontSize: `${layout.infoFontSize}px`, borderBottom: '1px dotted #999', paddingBottom: layout.compact ? '1px' : '3px' }}>
            <span style={{ fontWeight: 'bold' }}>{t('purchases.supplier')}:</span>
            <span style={{ marginRight: '10px' }}>{purchase.supplier_name || '-'}</span>
          </div>
        </div>

        <div style={{ padding: layout.tableWrapPadding }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: `${layout.tableMarginTop}px` }}>
          <thead>
            <tr style={{ backgroundColor: '#0047AB', color: 'white' }}>
              <th style={{ ...thCell, width: `${layout.colIndex}px` }}>#</th>
              <th style={{ ...thCell, textAlign: 'right' }} dir="rtl">{t('purchases.item')}</th>
              <th style={{ ...thCell, width: `${layout.colQty + 20}px` }} dir="rtl">{t('purchases.quantity')}</th>
              <th style={{ ...thCell, width: `${layout.colTotal}px` }} dir="rtl">{t('purchases.formUnitCost')}</th>
              <th style={{ ...thCell, width: `${layout.colTotal}px` }} dir="rtl">{t('purchases.formLineTotal')}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => {
              const qty = parseFloat(line.quantity || 0);
              const unitCost = parseFloat(line.unit_cost || 0);
              const lineTotal = parseFloat(line.line_total || (qty * unitCost));
              return (
                <tr key={`purchase-line-${idx}`} style={{ backgroundColor: idx % 2 === 0 ? '#f8f9fa' : '#fff' }}>
                  <td style={{ ...tdBase, color: '#0047AB', fontWeight: 'bold' }}>{idx + 1}</td>
                  <td style={{ ...tdBase, textAlign: 'right' }} dir="rtl">{line.item_name}</td>
                  <td style={tdBase}>{qty.toFixed(2)}</td>
                  <td style={tdBase}>AFN {unitCost.toFixed(2)}</td>
                  <td style={{ ...tdBase, fontWeight: 'bold' }}>AFN {lineTotal.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        <div style={{ padding: layout.totalsPadding, display: 'flex', justifyContent: 'space-between' }} dir="rtl">
          <div style={{ border: layout.compact ? '2px solid #0047AB' : '3px solid #0047AB', padding: layout.totalsBoxPadding, clipPath: 'polygon(0 0, 100% 0, 90% 50%, 100% 100%, 0 100%)' }}>
            <div style={{ fontSize: `${layout.totalsTitleSize}px`, fontWeight: 'bold', textAlign: 'center' }}>{t('purchases.formTotalCostSimple')}</div>
            <div style={{ fontSize: `${layout.totalsValueSize}px`, fontWeight: 'bold', textAlign: 'center' }}>{parseFloat(purchase.cost || 0).toFixed(2)}</div>
          </div>
          <div style={{ minWidth: layout.compact ? '140px' : '220px' }}>
            <div style={{ fontSize: `${layout.paidFontSize}px`, marginBottom: layout.compact ? '4px' : '10px', borderBottom: '1px dotted #999', paddingBottom: layout.compact ? '2px' : '5px' }}>
              <span style={{ fontWeight: 'bold' }}>{t('purchases.paid')}:</span>
              <span style={{ marginRight: '10px' }}>{parseFloat(purchase.total_paid || 0).toFixed(2)}</span>
            </div>
            <div style={{ fontSize: `${layout.paidFontSize}px`, borderBottom: '1px dotted #999', paddingBottom: layout.compact ? '2px' : '5px' }}>
              <span style={{ fontWeight: 'bold' }}>{t('purchases.remaining')}:</span>
              <span style={{ marginRight: '10px' }}>{parseFloat(purchase.remaining_amount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFD700', padding: layout.footerPadding, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: `${layout.footerFontSize}px` }}>📞 {BILL_FOOTER.phones} &nbsp; | &nbsp; 📧 {BILL_FOOTER.email}</div>
          <div style={{ backgroundColor: '#0047AB', color: 'white', padding: layout.footerAddressPadding, fontSize: `${layout.footerAddressSize}px`, clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 15% 100%, 0 50%)' }} dir="rtl">
            آدرس: {BILL_FOOTER.address}
          </div>
        </div>
      </div>
      <style>{getBillPrintCss(pageSize)}</style>
    </div>
  );
};

export default PrintablePurchaseBill;

