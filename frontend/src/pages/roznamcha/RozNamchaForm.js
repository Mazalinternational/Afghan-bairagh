import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/fallback';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import LocalizedDateInput from '../../components/common/LocalizedDateInput';

const RozNamchaForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(!!id);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    item_name: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    transaction_type: 'debit',
    cost_price: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (id) {
      fetchEntry();
    }
  }, [id]);

  const fetchEntry = async () => {
    try {
      const response = await api.get(`/api/roznamcha/${id}/`);
      setFormData({
        item_name: response.data.item_name || '',
        date: response.data.date || new Date().toISOString().split('T')[0],
        description: response.data.description || '',
        transaction_type: response.data.transaction_type || 'debit',
        cost_price: response.data.cost_price || ''
      });
    } catch (err) {
      console.error('Error fetching entry:', err);
      addToast(t('rozNamcha.failedToFetch'), 'error');
      navigate('/roznamcha');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.item_name.trim()) {
      newErrors.item_name = t('rozNamcha.itemNameRequired');
    }
    
    if (!formData.date) {
      newErrors.date = t('rozNamcha.dateRequired');
    }
    
    if (!formData.cost_price || parseFloat(formData.cost_price) <= 0) {
      newErrors.cost_price = t('rozNamcha.costPriceRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      addToast(t('rozNamcha.fixErrors'), 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        cost_price: parseFloat(formData.cost_price)
      };
      
      if (id) {
        await api.put(`/api/roznamcha/${id}/`, payload);
        addToast(t('rozNamcha.entryUpdated'), 'success');
      } else {
        await api.post('/api/roznamcha/', payload);
        addToast(t('rozNamcha.entryCreated'), 'success');
      }
      navigate('/roznamcha');
    } catch (err) {
      console.error('Error saving entry:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || t('rozNamcha.failedToSave');
      addToast(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-3">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="bg-blue-600 p-2 rounded-t-lg flex items-center gap-2">
          <button 
            onClick={() => navigate('/roznamcha')}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <h1 className="text-base font-bold text-white">
            {id ? t('rozNamcha.editEntry') : t('rozNamcha.addEntry')}
          </h1>
        </div>

        <div className="p-3">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('rozNamcha.itemName')} *
                </label>
                <input
                  type="text"
                  name="item_name"
                  value={formData.item_name}
                  onChange={handleChange}
                  className={`w-full px-2 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 ${
                    errors.item_name ? 'border-red-500' : ''
                  }`}
                  placeholder={t('rozNamcha.enterItemName')}
                />
                {errors.item_name && (
                  <p className="mt-1 text-[10px] text-red-600 dark:text-red-400">{errors.item_name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('common.date')} *
                </label>
                <LocalizedDateInput
                  name="date"
                  value={formData.date}
                  onChange={(dateValue) => setFormData((prev) => ({ ...prev, date: dateValue }))}
                  className={`w-full px-2 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 ${
                    errors.date ? 'border-red-500' : ''
                  }`}
                />
                {errors.date && (
                  <p className="mt-1 text-[10px] text-red-600 dark:text-red-400">{errors.date}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Transaction Type *
                </label>
                <select
                  name="transaction_type"
                  value={formData.transaction_type}
                  onChange={handleChange}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('common.description')}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="2"
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder={t('rozNamcha.enterDescription')}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('rozNamcha.costPrice')} *
                </label>
                <input
                  type="number"
                  name="cost_price"
                  value={formData.cost_price}
                  onChange={handleChange}
                  step="0.01"
                  min="0.01"
                  className={`w-full px-2 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 ${
                    errors.cost_price ? 'border-red-500' : ''
                  }`}
                  placeholder="0.00"
                />
                {errors.cost_price && (
                  <p className="mt-1 text-[10px] text-red-600 dark:text-red-400">{errors.cost_price}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                disabled={submitting}
                className="btn-form-green disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? t('rozNamcha.saving') : (id ? t('rozNamcha.updateEntry') : t('rozNamcha.saveEntry'))}
              </button>
              <button
                type="button"
                onClick={() => navigate('/roznamcha')}
                className="btn-form-red"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RozNamchaForm;
