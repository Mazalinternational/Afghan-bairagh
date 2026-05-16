import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import PrintableQuotation from '../../components/orders/PrintableQuotation';
import { useTranslation } from '../../i18n/fallback';
import { formatDate } from '../../i18n/dateUtils';

const QuotationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [quotation, setQuotation] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotationDetails();
  }, [id]);

  const fetchQuotationDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/quotations/${id}/`);
      const quotationData = res.data;
      setQuotation(quotationData);
      
      if (quotationData.customer) {
        if (typeof quotationData.customer === 'number' || typeof quotationData.customer === 'string') {
          try {
            const customerRes = await api.get(`/api/customers/${quotationData.customer}/`);
            setCustomer(customerRes.data);
          } catch (customerErr) {
            console.error('Error fetching customer:', customerErr);
          }
        } else if (typeof quotationData.customer === 'object' && quotationData.customer.name) {
          setCustomer(quotationData.customer);
        }
      }
    } catch (err) {
      console.error(err);
      setQuotation(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-8 w-8 animate-spin border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">{t('quotations.quotationNotFound')}</p>
        <button
          onClick={() => navigate('/quotations')}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {t('quotations.backToQuotations')}
        </button>
      </div>
    );
  }

  const orderFormatted = {
    ...quotation,
    order_date: quotation.quotation_date,
    total_estimated_amount: quotation.total_amount,
    order_items: quotation.quotation_items,
    payments: []
  };

  return (
    <div className="space-y-3 p-2">
      <div className="bg-blue-50 dark:bg-gray-800 p-3 rounded-xl shadow-md border border-blue-100 dark:border-gray-700 flex justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/quotations')} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white text-base">{t('quotations.title')} #{quotation.id}</h1>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {formatDate(quotation.quotation_date)}
            </p>
            {(quotation.manual_serial_no || '').trim() !== '' && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {t('customers.manualSerialNo')}: <span className="font-medium text-gray-800 dark:text-gray-200">{quotation.manual_serial_no}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <PrintableQuotation order={orderFormatted} customer={customer || (quotation.customer && typeof quotation.customer === 'object' ? quotation.customer : null)} />
    </div>
  );
};

export default QuotationDetails;
