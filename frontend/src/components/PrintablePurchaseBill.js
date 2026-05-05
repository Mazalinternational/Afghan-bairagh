import React, { useRef } from 'react';
import { PrinterIcon } from '@heroicons/react/24/outline';
import { formatBillDateParts } from '../utils/billFormat';
import { useTranslation } from '../i18n/fallback';

const BILL_FOOTER = {
  phones: '0744841167, 0704737305, 0730117373',
  email: 'afghanart.af@gmail.com',
  address: 'چهارراهی صدارت، سرک وزارت داخله سابقه، مارکیت مطابع صنعتی جاوید، منزل دوم دوکان نمبر A2 14-15',
};

const PrintablePurchaseBill = ({ purchase }) => {
  const billRef = useRef(null);
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
    if (!billRef.current) return;
    const printContents = billRef.current.innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = `<div class="printable-bill">${printContents}</div>`;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  return (
    <div className="w-full flex flex-col items-center py-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-[210mm] mx-auto flex justify-end mb-4 px-4 no-print">
        <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <PrinterIcon className="h-4 w-4" /> {t('purchases.printBill')}
        </button>
      </div>

      <div ref={billRef} className="printable-bill bg-white shadow-lg mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: 0 }}>
        <div className="flex items-stretch" style={{ height: '100px' }}>
          <div className="flex items-center justify-center" style={{ width: '35%', backgroundColor: '#0047AB', color: 'white' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }} dir="rtl">{t('purchases.purchaseBill')}</div>
          </div>
          <div className="flex items-center justify-center" style={{ width: '40%', backgroundColor: '#FFD700' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 'bold' }} dir="rtl">بیرق سازی افغان</h1>
          </div>
          <div className="flex items-center justify-center" style={{ width: '25%', backgroundColor: '#fff', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: '30%', transform: 'translateY(-50%)', backgroundColor: '#0047AB', color: 'white', padding: '8px 16px', fontWeight: 'bold', clipPath: 'polygon(0 0, 100% 0, 85% 50%, 100% 100%, 0 100%)' }} dir="rtl">
              {t('purchases.billNumber')}
            </div>
            <div style={{ position: 'absolute', bottom: '10px', right: '10px', fontWeight: 'bold', color: '#0047AB' }}>
              #{purchase.bill_number || purchase.id}
            </div>
          </div>
        </div>

        <div style={{ padding: '15px 20px', backgroundColor: '#f8f9fa' }} dir="rtl">
          <div style={{ fontSize: '14px', marginBottom: '5px', borderBottom: '1px dotted #999', paddingBottom: '3px' }}>
            <span style={{ fontWeight: 'bold' }}>{t('common.date')}:</span>
            <span style={{ marginRight: '10px' }}>{billDateParts ? `${billDateParts.year}/${billDateParts.month}/${billDateParts.day}` : '-'}</span>
          </div>
          <div style={{ fontSize: '14px', borderBottom: '1px dotted #999', paddingBottom: '3px' }}>
            <span style={{ fontWeight: 'bold' }}>{t('purchases.supplier')}:</span>
            <span style={{ marginRight: '10px' }}>{purchase.supplier_name || '-'}</span>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0047AB', color: 'white' }}>
              <th style={{ border: '1px solid #0047AB', padding: '8px', textAlign: 'center', width: '60px' }}>#</th>
              <th style={{ border: '1px solid #0047AB', padding: '8px', textAlign: 'right' }} dir="rtl">{t('purchases.item')}</th>
              <th style={{ border: '1px solid #0047AB', padding: '8px', textAlign: 'center', width: '100px' }} dir="rtl">{t('purchases.quantity')}</th>
              <th style={{ border: '1px solid #0047AB', padding: '8px', textAlign: 'center', width: '120px' }} dir="rtl">{t('purchases.formUnitCost')}</th>
              <th style={{ border: '1px solid #0047AB', padding: '8px', textAlign: 'center', width: '120px' }} dir="rtl">{t('purchases.formLineTotal')}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => {
              const qty = parseFloat(line.quantity || 0);
              const unitCost = parseFloat(line.unit_cost || 0);
              const lineTotal = parseFloat(line.line_total || (qty * unitCost));
              return (
                <tr key={`purchase-line-${idx}`} style={{ backgroundColor: idx % 2 === 0 ? '#f8f9fa' : '#fff' }}>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center', color: '#0047AB', fontWeight: 'bold' }}>{idx + 1}</td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'right' }} dir="rtl">{line.item_name}</td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>{qty.toFixed(2)}</td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>AFN {unitCost.toFixed(2)}</td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>AFN {lineTotal.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between' }} dir="rtl">
          <div style={{ border: '3px solid #0047AB', padding: '15px 35px', clipPath: 'polygon(0 0, 100% 0, 90% 50%, 100% 100%, 0 100%)' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', textAlign: 'center' }}>{t('purchases.formTotalCostSimple')}</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center' }}>{parseFloat(purchase.cost || 0).toFixed(2)}</div>
          </div>
          <div style={{ minWidth: '220px' }}>
            <div style={{ fontSize: '14px', marginBottom: '10px', borderBottom: '1px dotted #999', paddingBottom: '5px' }}>
              <span style={{ fontWeight: 'bold' }}>{t('purchases.paid')}:</span>
              <span style={{ marginRight: '10px' }}>{parseFloat(purchase.total_paid || 0).toFixed(2)}</span>
            </div>
            <div style={{ fontSize: '14px', borderBottom: '1px dotted #999', paddingBottom: '5px' }}>
              <span style={{ fontWeight: 'bold' }}>{t('purchases.remaining')}:</span>
              <span style={{ marginRight: '10px' }}>{parseFloat(purchase.remaining_amount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFD700', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px' }}>📞 {BILL_FOOTER.phones} &nbsp; | &nbsp; 📧 {BILL_FOOTER.email}</div>
          <div style={{ backgroundColor: '#0047AB', color: 'white', padding: '6px 18px', fontSize: '11px', clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 15% 100%, 0 50%)' }} dir="rtl">
            آدرس: {BILL_FOOTER.address}
          </div>
        </div>
      </div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .printable-bill, .printable-bill * { visibility: visible; }
          .printable-bill { position: absolute; left: 0; top: 0; width: 210mm !important; min-height: 297mm !important; box-shadow: none !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
};

export default PrintablePurchaseBill;

