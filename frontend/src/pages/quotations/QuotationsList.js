import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, EyeIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon, PencilIcon, TrashIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useTranslation } from '../../i18n/fallback';
import PageHeader from '../../components/common/PageHeader';
import { formatDate } from '../../i18n/dateUtils';

const QuotationsList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [deleteModal, setDeleteModal] = useState(null);

  useEffect(() => {
    fetchQuotations();
  }, [currentPage, searchTerm]);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/quotations/', {
        params: {
          page: currentPage,
          search: searchTerm
        }
      });
      setQuotations(response.data.results || []);
      setTotalItems(response.data.count || 0);
      setTotalPages(Math.ceil((response.data.count || 0) / 5));
    } catch (error) {
      console.error('Error fetching quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleDelete = (id, customerName) => {
    setDeleteModal({ id, customerName });
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/api/quotations/${deleteModal.id}/`);
      setQuotations(quotations.filter(q => q.id !== deleteModal.id));
      setDeleteModal(null);
      fetchQuotations();
    } catch (error) {
      console.error('Error deleting quotation:', error);
      alert('Failed to delete quotation');
    }
  };

  return (
    <div className="p-3 space-y-3">
      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">{t('quotations.confirmDelete')}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">
              {t('quotations.deleteMessage')} <strong className="text-gray-900 dark:text-gray-100">{deleteModal.customerName}</strong>?
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 text-white py-1.5 px-3 text-xs rounded hover:bg-red-700 transition-colors"
              >
                {t('quotations.yesDelete')}
              </button>
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-1.5 px-3 text-xs rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        title={t('quotations.title')}
        subtitle={t('quotations.subtitle')}
        icon={DocumentTextIcon}
        actions={
          <button
            onClick={() => navigate('/quotations/create')}
            className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {t('quotations.newQuotation')}
          </button>
        }
      />

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-3">
        <div className="mb-3">
          <div className="relative">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('quotations.searchByCustomer')}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-blue-600">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-white">{t('quotations.id')}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-white">{t('quotations.customer')}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-white">{t('quotations.date')}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-white">{t('quotations.amount')}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-white">{t('quotations.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {quotations.map((quotation) => (
                    <tr key={quotation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">#{quotation.id}</td>
                      <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">
                        {quotation.customer_name || 'N/A'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">
                        {formatDate(quotation.quotation_date)}
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white">
                        AFN {parseFloat(quotation.total_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/quotations/${quotation.id}`)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            title="View Quotation"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/quotations/${quotation.id}/edit`)}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                            title="Edit Quotation"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(quotation.id, quotation.customer_name)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete Quotation"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {quotations.length === 0 && (
                <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
                  {t('quotations.noQuotationsFound')}
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="mt-3 flex justify-between items-center">
                <div className="text-xs text-gray-700 dark:text-gray-300">
                  Showing {((currentPage - 1) * 5) + 1} to {Math.min(currentPage * 5, totalItems)} of {totalItems}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <ChevronLeftIcon className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-2 text-xs text-gray-700 dark:text-gray-300">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <ChevronRightIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default QuotationsList;
