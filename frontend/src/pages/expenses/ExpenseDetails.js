import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { formatDate, formatDateTime } from '../../i18n/dateUtils';

const ExpenseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchExpense();
  }, [id]);

  const fetchExpense = async () => {
    try {
      const response = await api.get(`/api/expenses/${id}/`);
      setExpense(response.data);
    } catch (err) {
      console.error('Error fetching expense:', err);
      addToast('Failed to fetch expense', 'error');
      navigate('/expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/api/expenses/${id}/`);
      addToast('Expense deleted successfully', 'success');
      navigate('/expenses');
    } catch (err) {
      console.error('Error deleting expense:', err);
      addToast('Failed to delete expense', 'error');
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen"><div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" /></div>;
  if (!expense) return <div className="text-center py-8"><p className="text-gray-500">Expense not found</p></div>;

  return (
    <div className="space-y-6">
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/expenses')}><ArrowLeftIcon className="h-5 w-5" /></button>
          <h1 className="text-2xl font-bold dark:text-white">Expense Details</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/expenses/${id}/edit`)} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"><PencilIcon className="h-5 w-5" />Edit</button>
          <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700"><TrashIcon className="h-5 w-5" />Delete</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <tbody className="divide-y divide-gray-200">
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">Description</td>
              <td className="px-6 py-4 text-sm text-gray-900">{expense.description}</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-medium text-gray-700 bg-gray-50">Amount</td>
              <td className="px-6 py-4 text-sm text-blue-600 font-bold">AFN {parseFloat(expense.amount).toFixed(2)}</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-medium text-gray-700 bg-gray-50">Category</td>
              <td className="px-6 py-4 text-sm text-gray-900">{expense.category_display}</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-medium text-gray-700 bg-gray-50">Date</td>
              <td className="px-6 py-4 text-sm text-gray-900">{formatDate(expense.expense_date)}</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-medium text-gray-700 bg-gray-50">Notes</td>
              <td className="px-6 py-4 text-sm text-gray-900">{expense.notes || 'N/A'}</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-medium text-gray-700 bg-gray-50">Created</td>
              <td className="px-6 py-4 text-sm text-gray-900">{formatDateTime(expense.created_at)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExpenseDetails;
