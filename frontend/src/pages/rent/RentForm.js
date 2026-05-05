import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeftIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import PageHeader from '../../components/common/PageHeader';
import api from '../../services/api';
import { useTranslation } from '../../i18n/fallback';
import LocalizedDateInput from '../../components/common/LocalizedDateInput';

const RentForm = () => {
  const { id } = useParams();
  const location = useLocation();
  const isEdit = Boolean(id) && location.pathname.endsWith('/edit');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    shop_no: '',
    tenant_name: '',
    tenant_phone: '',
    owner_name: '',
    rent_date: new Date().toISOString().split('T')[0],
    duration_count: 1,
    period_type: 'monthly',
    rent_amount: '',
    notes: '',
    is_active: true
  });

  useEffect(() => {
    if (!isEdit) return;
    const fetchShop = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/shops/${id}/`);
        setFormData({
          shop_no: response.data.shop_no || '',
          tenant_name: response.data.tenant_name || '',
          tenant_phone: response.data.tenant_phone || '',
          owner_name: response.data.owner_name || '',
          rent_date: response.data.rent_date || '',
          duration_count: response.data.duration_count || 1,
          period_type: response.data.period_type || 'monthly',
          rent_amount: response.data.rent_amount || '',
          notes: response.data.notes || '',
          is_active: response.data.is_active ?? true
        });
      } finally {
        setLoading(false);
      }
    };
    fetchShop();
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/api/shops/${id}/`, formData);
      } else {
        await api.post('/api/shops/', formData);
      }
      navigate('/rent');
    } catch (error) {
      console.error('Error saving shop:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2 p-3 space-y-3">
        <PageHeader
          title={isEdit ? t('rent.editShop') : t('rent.addShop')}
          subtitle={t('rent.subtitle')}
          icon={BuildingStorefrontIcon}
          actions={
            <button
              type="button"
              onClick={() => navigate('/rent')}
              className="btn-form-red flex items-center gap-1"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              {t('common.back')}
            </button>
          }
        />

        <form onSubmit={handleSubmit} className="bg-gradient-to-br from-white to-blue-50/70 dark:from-gray-800 dark:to-gray-800 rounded-xl shadow-lg border border-blue-100/70 dark:border-gray-700 p-3 md:p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('rent.shopNo')}</label>
              <input
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white/90 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                placeholder={t('rent.shopNo')}
                value={formData.shop_no}
                onChange={(e) => setFormData({ ...formData, shop_no: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('rent.tenant')}</label>
              <input
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white/90 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                placeholder={t('rent.tenant')}
                value={formData.tenant_name}
                onChange={(e) => setFormData({ ...formData, tenant_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('common.phone')}</label>
              <input
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white/90 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                placeholder={t('common.phone')}
                value={formData.tenant_phone}
                onChange={(e) => setFormData({ ...formData, tenant_phone: e.target.value })}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('rent.ownerName')}</label>
              <input
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white/90 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                placeholder={t('rent.ownerNamePlaceholder')}
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('rent.rentDate')}</label>
              <LocalizedDateInput
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white/90 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                value={formData.rent_date}
                onChange={(dateValue) => setFormData({ ...formData, rent_date: dateValue })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('rent.duration')}</label>
              <input
                type="number"
                min="1"
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white/90 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                placeholder={t('rent.duration')}
                value={formData.duration_count}
                onChange={(e) => setFormData({ ...formData, duration_count: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('rent.periodType')}</label>
              <select
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white/90 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                value={formData.period_type}
                onChange={(e) => setFormData({ ...formData, period_type: e.target.value })}
              >
                <option value="weekly">{t('rent.weekly')}</option>
                <option value="monthly">{t('rent.monthly')}</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('rent.rentAmount')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white/90 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                placeholder={t('rent.rentAmount')}
                value={formData.rent_amount}
                onChange={(e) => setFormData({ ...formData, rent_amount: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('common.notes')}</label>
            <textarea
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white/90 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
              rows={2}
              placeholder={t('common.notesPlaceholder')}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="btn-form-green"
            >
              {loading ? t('common.loading') : t('common.save')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/rent')}
              className="btn-form-red"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RentForm;
