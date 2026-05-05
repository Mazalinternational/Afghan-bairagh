import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { formatDate } from '../../i18n/dateUtils';

const ViewOrder = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/api/orders/${id}/`);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'processing': 'bg-blue-100 text-blue-800'
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Order not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/orders')}
                className="p-1 bg-white/20 hover:bg-white/30 rounded-md transition-all text-white"
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2">
                <div>
                  <h1 className="text-sm font-bold text-white">Order #{order.id}</h1>
                  <p className="text-xs text-blue-100">View order details</p>
                </div>
                {order.id === 4 && (
                  <span className="px-2 py-0.5 bg-yellow-400 text-yellow-900 rounded-full text-[9px] font-semibold">
                    23/02/2026
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate(`/orders/${order.id}/edit`)}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-3 py-1 rounded-lg flex items-center gap-1 transition-all text-xs font-semibold"
            >
              <PencilIcon className="h-3.5 w-3.5" />
              Edit
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Order Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Order ID</label>
                  <p className="text-gray-900">#{order.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Flag Size</label>
                  <p className="text-gray-900">{order.flag_size}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Quantity</label>
                  <p className="text-gray-900">{order.quantity}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Created Date</label>
                  <p className="text-gray-900">{formatDate(order.created_at)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Customer Name</label>
                  <p className="text-gray-900">{order.customer?.name}</p>
                </div>
                {order.customer?.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-gray-900">{order.customer.phone}</p>
                  </div>
                )}
                {order.customer?.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-gray-900">{order.customer.email}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-semibold text-gray-900">AFN {(parseFloat(order.total_amount) || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Paid Amount:</span>
                <span className="font-semibold text-green-600">AFN {((parseFloat(order.total_amount) || 0) - (parseFloat(order.due_amount || order.due) || 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                <span className="text-gray-600">Due Amount:</span>
                <span className="font-bold text-red-600">AFN {(parseFloat(order.due_amount || order.due) || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewOrder;
