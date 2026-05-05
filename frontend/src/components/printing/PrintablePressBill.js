import React, { useRef } from 'react';
import { PrinterIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n/fallback';
import { formatBillDateParts, formatNumberTrimZeros } from '../../utils/billFormat';

const BILL_FOOTER = {
  phones: '0744841167, 0704737305, 0730117373',
  email: 'afghanart.af@gmail.com',
  address: 'چهارراهی صدارت، سرک وزارت داخله سابقه، مارکیت مطابع صنعتی جاوید، منزل دوم دوکان نمبر A2 14-15',
};

const PrintablePressBill = ({ record }) => {
  const { t } = useTranslation();
  const billRef = useRef(null);

  if (!record) return null;

  const billDateParts = formatBillDateParts(record.job_date || record.purchase_date);
  const lines = Array.isArray(record.items) ? record.items : (Array.isArray(record.purchase_items) ? record.purchase_items : []);

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
          <PrinterIcon className="h-4 w-4" /> {t('printing.printBill')}
        </button>
      </div>
      <div ref={billRef} className="printable-bill bg-white shadow-lg mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: 0 }}>
        <div className="flex items-stretch" style={{ height: '100px' }}>
          <div className="flex items-center justify-center" style={{ width: '35%', backgroundColor: '#0047AB', color: 'white' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{t('printing.billTitle')}</div>
          </div>
          <div className="flex items-center justify-center" style={{ width: '40%', backgroundColor: '#FFD700' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 'bold' }} dir="rtl">بیرق سازی افغان</h1>
          </div>
          <div className="flex items-center justify-center" style={{ width: '25%', backgroundColor: '#fff', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: '30%', transform: 'translateY(-50%)', backgroundColor: '#0047AB', color: 'white', padding: '8px 16px', fontWeight: 'bold', clipPath: 'polygon(0 0, 100% 0, 85% 50%, 100% 100%, 0 100%)' }} dir="rtl">
              {t('printing.billNumber')}
            </div>
            <div style={{ position: 'absolute', bottom: '10px', right: '10px', fontWeight: 'bold', color: '#0047AB' }}>
              #{record.bill_number || record.id}
            </div>
          </div>
        </div>

        <div style={{ padding: '15px 20px', backgroundColor: '#f8f9fa' }} dir="rtl">
          <div style={{ fontSize: '14px', marginBottom: '5px', borderBottom: '1px dotted #999', paddingBottom: '3px' }}>
            <span style={{ fontWeight: 'bold' }}>{t('common.date')}:</span>
            <span style={{ marginRight: '10px' }}>{billDateParts ? `${billDateParts.year}/${billDateParts.month}/${billDateParts.day}` : '-'}</span>
          </div>
          <div style={{ fontSize: '14px', borderBottom: '1px dotted #999', paddingBottom: '3px' }}>
            <span style={{ fontWeight: 'bold' }}>{t('printing.printer')}:</span>
            <span style={{ marginRight: '10px' }}>{record.printer_name || record.supplier_name || '-'}</span>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0047AB', color: 'white' }}>
              <th style={{ border: '1px solid #0047AB', padding: '8px', textAlign: 'center', width: '45px' }}>#</th>
              <th style={{ border: '1px solid #0047AB', padding: '8px', textAlign: 'right' }} dir="rtl">{t('printing.flagName')}</th>
              <th style={{ border: '1px solid #0047AB', padding: '8px', textAlign: 'center', width: '90px' }} dir="rtl">{t('printing.size')}</th>
              <th style={{ border: '1px solid #0047AB', padding: '8px', textAlign: 'center', width: '70px' }} dir="rtl">{t('printing.qty')}</th>
              <th style={{ border: '1px solid #0047AB', padding: '8px', textAlign: 'center', width: '95px' }} dir="rtl">{t('printing.totalMeters')}</th>
              <th style={{ border: '1px solid #0047AB', padding: '8px', textAlign: 'center', width: '105px' }} dir="rtl">{t('printing.perMeterPrice')}</th>
              <th style={{ border: '1px solid #0047AB', padding: '8px', textAlign: 'center', width: '110px' }} dir="rtl">{t('printing.totalPrice')}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => {
              const total = parseFloat(line.line_total || 0);
              const qtyVal = line.qty ?? line.job_qty;
              const qtyDisplay =
                qtyVal != null && qtyVal !== '' ? formatNumberTrimZeros(qtyVal) : '-';
              const metersDisplay =
                line.total_meters != null && line.total_meters !== ''
                  ? formatNumberTrimZeros(line.total_meters)
                  : '-';
              return (
                <tr key={`print-line-${idx}`} style={{ backgroundColor: idx % 2 === 0 ? '#f8f9fa' : '#fff' }}>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center', color: '#0047AB', fontWeight: 'bold' }}>{idx + 1}</td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'right' }} dir="rtl">{line.flag_name || line.item_name || '-'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>{line.size || line.flag_size || '-'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>{qtyDisplay}</td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>{metersDisplay}</td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>
                    AFN {formatNumberTrimZeros(line.per_meter_price || line.unit_cost || 0, '0')}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>
                    AFN {formatNumberTrimZeros(total, '0')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between' }} dir="rtl">
          <div style={{ border: '3px solid #0047AB', padding: '15px 35px', clipPath: 'polygon(0 0, 100% 0, 90% 50%, 100% 100%, 0 100%)' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', textAlign: 'center' }}>{t('printing.totalPrice')}</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center' }}>
            {formatNumberTrimZeros(parseFloat(record.total_price || record.cost || 0), '0')}
          </div>
          </div>
          <div style={{ minWidth: '220px' }}>
            <div style={{ fontSize: '14px', marginBottom: '10px', borderBottom: '1px dotted #999', paddingBottom: '5px' }}>
              <span style={{ fontWeight: 'bold' }}>{t('purchases.paid')}:</span>
              <span style={{ marginRight: '10px' }}>{formatNumberTrimZeros(parseFloat(record.total_paid || 0), '0')}</span>
            </div>
            <div style={{ fontSize: '14px', borderBottom: '1px dotted #999', paddingBottom: '5px' }}>
              <span style={{ fontWeight: 'bold' }}>{t('purchases.remaining')}:</span>
              <span style={{ marginRight: '10px' }}>{formatNumberTrimZeros(parseFloat(record.remaining_amount || 0), '0')}</span>
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

export default PrintablePressBill;

