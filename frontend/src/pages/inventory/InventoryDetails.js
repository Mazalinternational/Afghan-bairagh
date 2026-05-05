import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from '../../i18n/fallback';
import { formatDate } from '../../i18n/dateUtils';

const InventoryDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/inventory/items/${id}/`);
      setItem(res.data);
    } catch (err) {
      console.error('Error fetching item:', err);
      setItem(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('inventory.detailsDeleteConfirm'))) return;

    try {
      await api.delete(`/api/inventory/items/${id}/`);
      addToast(t('inventory.toastItemDeleted'), 'success');
      navigate('/inventory');
    } catch (err) {
      console.error('Error deleting item:', err);
      addToast(t('inventory.toastItemDeleteFailed'), 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <p className="text-gray-500 dark:text-gray-400">{t('inventory.detailsNotFound')}</p>
        <button
          onClick={() => navigate('/inventory')}
          className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
        >
          {t('inventory.detailsBackToList')}
        </button>
      </div>
    );
  }

  const typeLabel =
    item.item_type === 'raw_material' ? t('inventory.rawMaterial') : t('inventory.finishedProduct');
  const statusLabel = item.is_low_stock ? t('inventory.lowStock') : t('inventory.inStock');

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 p-2 sm:p-3 md:p-4">
      <div className="bg-blue-50 dark:bg-gray-800 p-3 sm:p-4 rounded-xl shadow-md border border-blue-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button onClick={() => navigate('/inventory')} className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            <ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg md:text-2xl font-bold text-gray-900 dark:text-white">{item.name}</h1>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{t('inventory.detailsPageSubtitle')}</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => navigate(`/inventory/${id}/edit`)}
            className="bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial justify-center hover:bg-blue-700 transition-colors"
          >
            <PencilIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {t('inventory.detailsEdit')}
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial justify-center hover:bg-red-700 transition-colors"
          >
            <TrashIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {t('inventory.detailsDelete')}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white">{t('inventory.detailsSectionInfo')}</h2>
        </div>

        <div className="hidden md:block overflow-x-auto -mx-2 sm:mx-0">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-800 dark:bg-gray-700">
              <tr>
                <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white uppercase tracking-wider">{t('inventory.detailsTableId')}</th>
                <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white uppercase tracking-wider">{t('inventory.name')}</th>
                <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white uppercase tracking-wider">{t('inventory.sku')}</th>
                <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white uppercase tracking-wider">{t('inventory.type')}</th>
                <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white uppercase tracking-wider">{t('inventory.detailsTableCategory')}</th>
                <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white uppercase tracking-wider">{t('inventory.detailsTableUnitPrice')}</th>
                <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white uppercase tracking-wider">{t('inventory.detailsTableCurrentStock')}</th>
                <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white uppercase tracking-wider">{t('inventory.detailsTableMinStock')}</th>
                <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white uppercase tracking-wider">{t('inventory.detailsTableCreated')}</th>
                <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white uppercase tracking-wider">{t('inventory.detailsTableUpdated')}</th>
                <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white uppercase tracking-wider">{t('inventory.status')}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800">
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-4 text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-white">{item.id}</td>
                <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-4 text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-white">{item.name}</td>
                <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-4 text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-white">{item.sku}</td>
                <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-4 text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-white">{typeLabel}</td>
                <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-4 text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-white">{item.category_name}</td>
                <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-4 text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-white">AFN {item.unit_price}</td>
                <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-4 text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-white">{item.current_stock}</td>
                <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-4 text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-white">{item.minimum_stock}</td>
                <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-4 text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-white">{formatDate(item.created_at)}</td>
                <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-4 text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-white">{formatDate(item.updated_at)}</td>
                <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-4 text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-white">
                  <span className={`inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-xs font-medium ${
                    item.is_low_stock
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  }`}>
                    {statusLabel}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700 p-3 sm:p-4 space-y-3">
          <div>
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">{t('inventory.detailsTableId')}</label>
            <p className="text-xs font-semibold text-gray-900 dark:text-white mt-0.5">{item.id}</p>
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">{t('inventory.name')}</label>
            <p className="text-xs font-semibold text-gray-900 dark:text-white mt-0.5">{item.name}</p>
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">{t('inventory.sku')}</label>
            <p className="text-xs text-gray-900 dark:text-white mt-0.5">{item.sku}</p>
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">{t('inventory.type')}</label>
            <p className="text-xs text-gray-900 dark:text-white mt-0.5">{typeLabel}</p>
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">{t('inventory.detailsTableCategory')}</label>
            <p className="text-xs text-gray-900 dark:text-white mt-0.5">{item.category_name}</p>
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">{t('inventory.detailsTableUnitPrice')}</label>
            <p className="text-xs text-gray-900 dark:text-white mt-0.5">AFN {item.unit_price}</p>
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">{t('inventory.detailsTableCurrentStock')}</label>
            <p className="text-xs text-gray-900 dark:text-white mt-0.5">{item.current_stock}</p>
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">{t('inventory.detailsTableMinStock')}</label>
            <p className="text-xs text-gray-900 dark:text-white mt-0.5">{item.minimum_stock}</p>
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">{t('inventory.detailsTableCreated')}</label>
            <p className="text-xs text-gray-900 dark:text-white mt-0.5">{formatDate(item.created_at)}</p>
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">{t('inventory.detailsTableUpdated')}</label>
            <p className="text-xs text-gray-900 dark:text-white mt-0.5">{formatDate(item.updated_at)}</p>
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">{t('inventory.status')}</label>
            <p className="mt-0.5">
              <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-medium ${
                item.is_low_stock
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              }`}>
                {statusLabel}
              </span>
            </p>
          </div>
        </div>
      </div>

      {item.description && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white">{t('inventory.detailsSectionDescription')}</h2>
          </div>
          <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{item.description}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryDetails;
