import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import PaymentReceipt from '../PaymentReceipt';
import { normalizeNumeralString, parseLocaleFloat } from '../../utils/numerals';

const PaymentModal = ({ isOpen, onClose, onPaymentAdd, dueAmount, initialAmount, isFullPayment = true, paymentDetails }) => {
  const [amount, setAmount] = useState(initialAmount || '');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [fullPayment, setFullPayment] = useState(isFullPayment);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  useEffect(() => {
    if (fullPayment) {
      setAmount(dueAmount?.toFixed(2) || '');
    }
  }, [fullPayment, dueAmount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const paymentAmount = parseLocaleFloat(amount) || 0;
    if (paymentAmount > 0 && paymentAmount <= dueAmount) {
      const paymentData = {
        amount: paymentAmount,
        payment_method: paymentMethod,
        is_full_payment: fullPayment,
        notes: notes.trim()
      };
      
      const result = await onPaymentAdd(paymentData);
      
      // Prepare receipt data
      const receipt = {
        id: result?.id || Date.now(),
        amount: paymentAmount,
        payment_method: paymentMethod,
        payment_date: new Date().toISOString(),
        notes: notes.trim(),
        total_amount: dueAmount + (paymentDetails?.previous_paid || 0),
        previous_paid: paymentDetails?.previous_paid || 0,
        remaining_amount: dueAmount - paymentAmount,
        type: paymentDetails?.type || 'customer',
        customer_name: paymentDetails?.customer_name,
        supplier_name: paymentDetails?.supplier_name,
        phone: paymentDetails?.phone,
        address: paymentDetails?.address,
        item_name: paymentDetails?.item_name,
        reference: paymentDetails?.reference
      };
      
      setReceiptData(receipt);
      setShowReceipt(true);
      setAmount('');
      setNotes('');
      setFullPayment(true);
    }
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setReceiptData(null);
    onClose();
  };

  if (!isOpen) return null;

  if (showReceipt && receiptData) {
    return <PaymentReceipt payment={receiptData} onClose={handleCloseReceipt} />;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add Payment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="bg-blue-50 p-3 rounded-lg mb-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Amount to pay: AFN {dueAmount?.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-gray-600">Net: AFN {dueAmount?.toFixed(2) || '0.00'} − Paid: AFN 0.00 = Due: AFN {dueAmount?.toFixed(2) || '0.00'}</p>
            </div>
            
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                checked={fullPayment}
                onChange={(e) => {
                  setFullPayment(e.target.checked);
                  if (e.target.checked) {
                    setAmount(dueAmount?.toFixed(2) || '');
                  } else {
                    setAmount('');
                  }
                }}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">
                Full Payment
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount Paid
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(normalizeNumeralString(e.target.value));
                  setFullPayment(false);
                }}
                disabled={fullPayment}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter payment amount"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Max: AFN {dueAmount?.toFixed(2) || '0.00'}
              </p>
              {amount && (
                <p className="mt-1 text-xs text-gray-600">
                  Balance due: AFN {(dueAmount - (parseLocaleFloat(amount) || 0)).toFixed(2)}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="check">Check</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
