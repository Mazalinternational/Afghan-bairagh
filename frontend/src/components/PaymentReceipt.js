import React from 'react';
import { PrinterIcon } from '@heroicons/react/24/outline';
import { formatDate, formatDateTime } from '../i18n/dateUtils';

const PaymentReceipt = ({ payment, onClose }) => {
  const formatPaymentMethod = (method) => {
    const key = String(method || '').toLowerCase();
    if (key === 'cash') return 'نقدی';
    if (key === 'card') return 'کارت';
    if (key === 'bank_transfer') return 'انتقال بانکی';
    if (key === 'check') return 'چک';
    return method || 'نامشخص';
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full" style={{ maxWidth: '320px' }}>
        {/* Header - Hide on print */}
        <div className="bg-blue-600 p-2 rounded-t-lg flex justify-between items-center print:hidden">
          <h2 className="text-sm font-bold text-white">رسید پرداخت</h2>
          <div className="flex gap-1">
            <button
              onClick={handlePrint}
              className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-xs flex items-center gap-1"
            >
              <PrinterIcon className="h-3 w-3" />
              چاپ
            </button>
            <button
              onClick={onClose}
              className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-xs"
            >
              بستن
            </button>
          </div>
        </div>

        {/* Receipt Content - Thermal Printer Optimized */}
        <div className="p-3 text-xs thermal-receipt">
          {/* Company Header */}
          <div className="text-center mb-2 border-b border-dashed border-gray-400 pb-2">
            <h1 className="text-sm font-bold">Afghan Flag Company</h1>
            <p className="text-[10px]">رسید پرداخت</p>
            <p className="text-[9px] mt-1">#{payment.id} | {formatDateTime(payment.payment_date || payment.created_at)}</p>
          </div>

          {/* Customer/Supplier Info */}
          <div className="mb-2 text-[10px]">
            <p className="font-semibold">{payment.type === 'supplier' ? 'تأمین‌کننده:' : 'مشتری:'}</p>
            <p>{payment.supplier_name || payment.customer_name}</p>
            {payment.phone && <p>تلفن: {payment.phone}</p>}
          </div>

          {/* Transaction Details */}
          <div className="border-t border-b border-dashed border-gray-400 py-2 mb-2">
            <div className="flex justify-between text-[10px] mb-1">
              <span>توضیحات:</span>
              <span className="font-medium">{payment.item_name || 'پرداخت'}</span>
            </div>
            <div className="flex justify-between text-[10px] mb-1">
              <span>روش:</span>
              <span className="font-medium">{formatPaymentMethod(payment.payment_method)}</span>
            </div>
            {payment.reference && (
              <div className="flex justify-between text-[10px]">
                <span>مرجع:</span>
                <span className="font-medium">{payment.reference}</span>
              </div>
            )}
          </div>

          {/* Amount Summary */}
          <div className="space-y-1 mb-2">
            <div className="flex justify-between text-[10px]">
              <span>مبلغ مجموعی:</span>
              <span>AFN {parseFloat(payment.total_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>پرداخت قبلی:</span>
              <span>AFN {parseFloat(payment.previous_paid || 0).toFixed(2)}</span>
            </div>
            
            {/* Payment History */}
            {payment.payment_history && payment.payment_history.length > 0 && (
              <div className="border-t border-dashed border-gray-400 pt-1 mt-1">
                <p className="text-[9px] font-semibold mb-1">تاریخچه پرداخت:</p>
                {payment.payment_history.map((hist, idx) => (
                  <div key={idx} className="flex justify-between text-[9px] text-gray-600 ml-2">
                    <span>{formatDate(hist.date)}</span>
                    <span>AFN {parseFloat(hist.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-between text-[10px] font-bold border-t border-dashed border-gray-400 pt-1">
              <span>پرداخت فعلی:</span>
              <span>AFN {parseFloat(payment.amount || payment.amount_paid || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>مجموع پرداخت تا اکنون:</span>
              <span>AFN {(parseFloat(payment.previous_paid || 0) + parseFloat(payment.amount || payment.amount_paid || 0)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold">
              <span>باقی‌مانده:</span>
              <span>AFN {parseFloat(payment.remaining_amount || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Notes */}
          {payment.notes && (
            <div className="mb-2 text-[9px] border-t border-dashed border-gray-400 pt-2">
              <p className="font-semibold">یادداشت:</p>
              <p>{payment.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center border-t border-dashed border-gray-400 pt-2">
            <p className="text-[9px]">از پرداخت شما سپاس‌گزاریم!</p>
            <p className="text-[8px] text-gray-500 mt-1">رسید تولیدشده توسط سیستم</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          .thermal-receipt,
          .thermal-receipt * {
            visibility: visible;
          }
          .thermal-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0;
            padding: 5mm;
            background: white;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default PaymentReceipt;
