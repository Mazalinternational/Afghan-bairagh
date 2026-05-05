import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/fallback';
import { ArrowLeftIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../i18n/dateUtils';

const RozNamchaDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t, formatDate } = useTranslation();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchEntry();
  }, [id]);

  const fetchEntry = async () => {
    try {
      const response = await api.get(`/api/roznamcha/${id}/`);
      setEntry(response.data);
    } catch (err) {
      console.error('Error fetching entry:', err);
      addToast(t('rozNamcha.failedToFetch'), 'error');
      navigate('/roznamcha');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/api/roznamcha/${id}/`);
      addToast(t('rozNamcha.entryDeleted'), 'success');
      navigate('/roznamcha');
    } catch (err) {
      console.error('Error deleting entry:', err);
      addToast(t('rozNamcha.failedToDelete'), 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }
  
  if (!entry) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">{t('rozNamcha.entryNotFound')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('modals.confirmDelete')}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t('modals.deleteEntryMessage')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors"
              >
                {t('modals.yesDelete')}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow dark:shadow-gray-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/roznamcha')}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Roz Namcha Details</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/roznamcha/${id}/edit`)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
          >
            <PencilIcon className="h-5 w-5" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors"
          >
            <TrashIcon className="h-5 w-5" />
            Delete
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow dark:shadow-gray-900/50 overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 w-1/3">Item Name</td>
                <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{entry.item_name}</td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">Date</td>
                <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{formatDate(entry.date)}</td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">Description</td>
                <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{entry.description || 'N/A'}</td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">Cost/Price</td>
                <td className="px-4 sm:px-6 py-4 text-sm font-bold text-blue-600 dark:text-blue-400">AFN {parseFloat(entry.cost_price).toFixed(2)}</td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">Created</td>
                <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{formatDateTime(entry.created_at)}</td>
              </tr>
              {entry.updated_at && (
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">Last Updated</td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{formatDateTime(entry.updated_at)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RozNamchaDetails;
