import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BuildingStorefrontIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import PageHeader from '../../components/common/PageHeader';
import api from '../../services/api';
import { useTranslation } from '../../i18n/fallback';
import { useToast } from '../../context/ToastContext';

const ITEMS_PER_PAGE = 5;

const RentList = () => {
  const navigate = useNavigate();
  const { t, formatDate } = useTranslation();
  const { addToast } = useToast();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/shops/');
        if (!cancelled) setShops(response.data.results || response.data || []);
      } catch (error) {
        console.error('Error fetching shops:', error);
        if (!cancelled) addToast(t('rent.loadError'), 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [addToast, t]);

  const filteredShops = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return shops.filter((shop) => {
      if (periodFilter !== 'all' && shop.period_type !== periodFilter) return false;
      if (!q) return true;
      const hay = [
        shop.shop_no,
        shop.tenant_name,
        shop.owner_name,
        shop.period_type,
        shop.notes
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [shops, searchQuery, periodFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredShops.length / ITEMS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const pagedShops = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredShops.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredShops, page]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, periodFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleDelete = async (shop) => {
    if (!window.confirm(t('rent.deleteConfirm'))) return;
    try {
      await api.delete(`/api/shops/${shop.id}/`);
      addToast(t('rent.shopDeleted'), 'success');
      setShops((prev) => prev.filter((s) => s.id !== shop.id));
    } catch (error) {
      console.error('Delete shop failed:', error);
      addToast(t('rent.deleteError'), 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  const startItem = filteredShops.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(page * ITEMS_PER_PAGE, filteredShops.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2 p-3 space-y-3">
        <PageHeader
          title={t('rent.title')}
          subtitle={t('rent.subtitle')}
          icon={BuildingStorefrontIcon}
          actions={
            <button
              type="button"
              onClick={() => navigate('/rent/create')}
              className="btn-form-green flex items-center gap-1"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              {t('rent.addShop')}
            </button>
          }
        />

        <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-center">
          <div className="relative flex-1 min-w-[160px]">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('rent.searchPlaceholder')}
              className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 sm:min-w-[140px]"
          >
            <option value="all">{t('rent.allPeriods')}</option>
            <option value="weekly">{t('rent.weekly')}</option>
            <option value="monthly">{t('rent.monthly')}</option>
          </select>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-600">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-white">{t('rent.shopNo')}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-white">{t('rent.tenant')}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-white">{t('rent.ownerName')}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-white">{t('rent.rentDate')}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-white">{t('rent.periodType')}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-white">{t('rent.rentAmount')}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-white">{t('rent.remainingPeriods')}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-white">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {pagedShops.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                      {t('common.noRecordsFound')}
                    </td>
                  </tr>
                ) : (
                  pagedShops.map((shop) => (
                    <tr key={shop.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{shop.shop_no}</td>
                      <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{shop.tenant_name}</td>
                      <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{shop.owner_name || '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{formatDate(shop.rent_date)}</td>
                      <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{shop.period_type}</td>
                      <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                        AFN {parseFloat(shop.rent_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400">
                        {shop.remaining_periods}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/rent/${shop.id}`)}
                            className="btn-form-green p-1.5"
                            title={t('common.view')}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/rent/${shop.id}/edit`)}
                            className="btn-form-green p-1.5"
                            title={t('common.edit')}
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(shop)}
                            className="btn-form-red p-1.5"
                            title={t('rent.deleteShop')}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredShops.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
              <p className="text-[11px] text-gray-600 dark:text-gray-400">
                {startItem}–{endItem} {t('pagination.of')} {filteredShops.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 text-[11px] rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 dark:text-gray-200"
                >
                  {t('common.prev')}
                </button>
                <span className="text-[11px] text-gray-700 dark:text-gray-300 px-1">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2 py-1 text-[11px] rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 dark:text-gray-200"
                >
                  {t('common.next')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RentList;
