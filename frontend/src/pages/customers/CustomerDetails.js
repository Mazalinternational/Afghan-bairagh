import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  EnvelopeIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { formatDate } from '../../i18n/dateUtils';

const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payAmount, setPayAmount] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/customers/${id}/`);
      setCustomer(res.data);
    } catch (err) {
      console.error('Error fetching customer:', err);
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePayPreviousBalance = async () => {
    if (!customer) return;
    const remaining = parseFloat(customer.previous_balance_remaining ?? customer.previous_balance ?? 0);
    if (!remaining || remaining <= 0) {
      alert('No previous balance remaining for this customer.');
      return;
    }
    const amountNum = parseFloat(payAmount || remaining);
    if (!amountNum || amountNum <= 0) {
      alert('Please enter a valid amount to pay.');
      return;
    }
    setIsPaying(true);
    try {
      const res = await api.post(`/api/customers/${id}/pay_previous_balance/`, {
        amount: amountNum,
      });
      setCustomer(res.data.customer);
      setPayAmount('');
      alert('Previous balance payment recorded successfully.');
    } catch (err) {
      console.error('Error paying previous balance:', err);
      alert(err.response?.data?.error || 'Failed to record payment.');
    } finally {
      setIsPaying(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    
    try {
      await api.delete(`/api/customers/${id}/`);
      navigate('/customers');
    } catch (err) {
      console.error('Error deleting customer:', err);
      alert('Error deleting customer');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <p className="text-gray-500 dark:text-gray-400">Customer not found</p>
        <button
          onClick={() => navigate('/customers')}
          className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
        >
          Back to Customers
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 p-2 sm:p-3 md:p-4">
      {/* Header */}
      <div className="bg-gray-800 dark:bg-gray-800 p-3 sm:p-4 rounded-xl shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button onClick={() => navigate('/customers')} className="text-white hover:text-gray-300 dark:hover:text-gray-400">
            <ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white">{customer.name}</h1>
            <p className="text-xs sm:text-sm text-gray-300 dark:text-gray-400">Customer Details</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => navigate(`/customers/${id}/edit`)}
            className="bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center gap-1.5 sm:gap-2 hover:bg-blue-700 text-xs sm:text-sm flex-1 sm:flex-initial justify-center"
          >
            <PencilIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center gap-1.5 sm:gap-2 hover:bg-red-700 text-xs sm:text-sm flex-1 sm:flex-initial justify-center"
          >
            <TrashIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Customer Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
            Customer Information
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
            <div className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Previous Balance: </span>
              <span>
                AFN {(parseFloat(customer.previous_balance || 0)).toFixed(2)}
              </span>
              {typeof customer.previous_balance_remaining !== 'undefined' && (
                <>
                  <span className="mx-1">|</span>
                  <span className="font-semibold">Remaining: </span>
                  <span className={parseFloat(customer.previous_balance_remaining || 0) > 0 ? 'text-red-600' : 'text-green-600'}>
                    AFN {(parseFloat(customer.previous_balance_remaining || 0)).toFixed(2)}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-24 px-2 py-1 text-[10px] border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-200"
              />
              <button
                type="button"
                disabled={isPaying}
                onClick={handlePayPreviousBalance}
                className="px-2 py-1 text-[10px] rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isPaying ? 'Paying...' : 'Pay Previous Balance'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto -mx-2 sm:mx-0">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-800 dark:bg-gray-700">
              <tr>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white uppercase tracking-wider">Name</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white uppercase tracking-wider">Phone</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white uppercase tracking-wider">Email</th>
                <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white uppercase tracking-wider">Date</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white uppercase tracking-wider">Address</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800">
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-3 sm:px-4 py-2 sm:py-4 text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-white">{customer.name}</td>
                <td className="px-3 sm:px-4 py-2 sm:py-4 text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-white">{customer.phone}</td>
                <td className="px-3 sm:px-4 py-2 sm:py-4 text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-white">{customer.email || '-'}</td>
                <td className="px-2 sm:px-3 py-2 sm:py-4 text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-white">
                  {formatDate(customer.registration_date)}
                </td>
                <td className="px-3 sm:px-4 py-2 sm:py-4 text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-white">{customer.address}</td>
                <td className="px-3 sm:px-4 py-2 sm:py-4 text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-white">{customer.notes || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
          <div className="p-3 sm:p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <UserIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Name</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{customer.name}</p>
              </div>
            </div>

            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <PhoneIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Phone</span>
                </div>
                <p className="text-sm text-gray-900 dark:text-white">{customer.phone}</p>
              </div>
            </div>

            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <EnvelopeIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Email</span>
                </div>
                <p className="text-sm text-gray-900 dark:text-white">{customer.email || '-'}</p>
              </div>
            </div>

            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <DocumentTextIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Registration Date</span>
                </div>
                <p className="text-sm text-gray-900 dark:text-white">
                  {formatDate(customer.registration_date)}
                </p>
              </div>
            </div>

            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <MapPinIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Address</span>
                </div>
                <p className="text-sm text-gray-900 dark:text-white">{customer.address}</p>
              </div>
            </div>

            {customer.notes && (
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <DocumentTextIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Notes</span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white">{customer.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetails;
