import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import PrintableQuotation from '../../components/orders/PrintableQuotation';
import { formatDate } from '../../i18n/dateUtils';

const OrderQuotation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/orders/${id}/`);
      const orderData = res.data;
      setOrder(orderData);
      
      if (orderData.customer) {
        if (typeof orderData.customer === 'number' || typeof orderData.customer === 'string') {
          try {
            const customerRes = await api.get(`/api/customers/${orderData.customer}/`);
            setCustomer(customerRes.data);
          } catch (customerErr) {
            console.error('Error fetching customer:', customerErr);
          }
        } else if (typeof orderData.customer === 'object' && orderData.customer.name) {
          setCustomer(orderData.customer);
        }
      }
      
      if (!orderData.payments || orderData.payments.length === 0) {
        try {
          const paymentsRes = await api.get(`/api/order-payments/?order=${id}`);
          const paymentsList = paymentsRes.data.results || paymentsRes.data || [];
          setOrder(prev => ({
            ...prev,
            payments: Array.isArray(paymentsList) ? paymentsList : []
          }));
        } catch (paymentsErr) {
          console.error('Error fetching payments:', paymentsErr);
        }
      }
    } catch (err) {
      console.error(err);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-center text-gray-500 dark:text-gray-400">Order not found</p>
        <button
          onClick={() => navigate('/orders')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 p-2 sm:p-3">
      <div className="bg-blue-600 dark:bg-blue-700 p-3 rounded-xl shadow-md flex justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/orders')} className="text-white hover:text-gray-200">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-bold text-white text-lg">Quotation - Order #{order.id}</h1>
            <p className="text-xs text-blue-100">
              {formatDate(order.order_date || order.created_at)}
            </p>
          </div>
        </div>
      </div>

      <PrintableQuotation order={order} customer={customer || (order.customer && typeof order.customer === 'object' ? order.customer : null)} />
    </div>
  );
};

export default OrderQuotation;
