import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDate } from '../../i18n/dateUtils';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PrintablePurchaseBill from '../../components/PrintablePurchaseBill';
import { useTranslation } from '../../i18n/fallback';

const PurchaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchase();
  }, [id]);

  const fetchPurchase = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/purchases/${id}/`);
      setPurchase(res.data);
    } catch (err) {
      console.error('Error fetching purchase:', err);
      setPurchase(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this purchase?')) return;
    
    try {
      await api.delete(`/api/purchases/${id}/`);
      addToast(t('purchases.toastDeleted'), 'success');
      navigate('/purchases');
    } catch (err) {
      console.error('Error deleting purchase:', err);
      addToast(t('purchases.failedToDelete'), 'error');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'paid': 'bg-green-100 text-green-800',
      'partial': 'bg-yellow-100 text-yellow-800',
      'due': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">{t('purchases.purchaseNotFound')}</p>
        <button
          onClick={() => navigate('/purchases')}
          className="mt-4 text-blue-600 hover:underline"
        >
          {t('purchases.backToPurchases')}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 p-4 rounded-t-xl flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-bold text-white">{purchase.item_name}</h1>
              <p className="text-xs text-blue-100">{t('purchases.purchaseDetails')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/purchases/${id}/edit`)}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all"
            >
              <PencilIcon className="h-4 w-4" />
              {t('common.edit')}
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-500/80 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all"
            >
              <TrashIcon className="h-4 w-4" />
              {t('common.delete')}
            </button>
            <button
              onClick={() => navigate('/purchases')}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-1.5 rounded-lg transition-all"
              title={t('common.close')}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <PrintablePurchaseBill purchase={purchase} />

          {/* Purchase Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 bg-blue-600 border-b border-blue-700">
              <h2 className="text-sm font-semibold text-white">{t('purchases.purchaseInformation')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">ID</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('purchases.billNumber')}</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Item</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Supplier</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Quantity</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Cost</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('purchases.paid')}</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Remaining</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('purchases.forPress')}</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800">
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{purchase.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{purchase.bill_number || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{purchase.item_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{purchase.supplier_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{purchase.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">AFN {purchase.cost}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">AFN {purchase.total_paid}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">AFN {purchase.remaining_amount}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {formatDate(purchase.purchase_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        purchase.is_for_press 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {purchase.is_for_press ? t('common.yes') : t('common.no')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(purchase.payment_status)}`}>
                        {purchase.payment_status.charAt(0).toUpperCase() + purchase.payment_status.slice(1)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Description */}
          {purchase.description && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 bg-blue-600 border-b border-blue-700">
                <h2 className="text-sm font-semibold text-white">{t('common.description')}</h2>
              </div>
              <div className="px-4 py-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">{purchase.description}</p>
              </div>
            </div>
          )}

          {Array.isArray(purchase.purchase_items) && purchase.purchase_items.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 bg-blue-600 border-b border-blue-700">
                <h2 className="text-sm font-semibold text-white">{t('purchases.formPurchaseItemsTitle')}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Item</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Quantity</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('purchases.formUnitCost')}</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('purchases.formLineTotal')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {purchase.purchase_items.map((line, idx) => (
                      <tr key={`line-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{line.item_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{parseFloat(line.quantity || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">AFN {parseFloat(line.unit_cost || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">AFN {parseFloat(line.line_total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payment History */}
          {purchase.payments && purchase.payments.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 bg-blue-600 border-b border-blue-700">
                <h2 className="text-sm font-semibold text-white">{t('purchases.paymentHistory')} ({purchase.payment_count})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('purchases.amount')}</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('purchases.method')}</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('purchases.reference')}</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {purchase.payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">AFN {payment.amount}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{payment.payment_method}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{payment.reference || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {formatDate(payment.payment_date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseDetails;
