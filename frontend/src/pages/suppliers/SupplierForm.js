import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from '../../i18n/fallback';
import PageHeader from '../../components/common/PageHeader';

const SupplierForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    phone_secondary: '',
    email: '',
    address: '',
    previous_balance: 0
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEdit) {
      fetchSupplier();
    }
  }, [id, isEdit]);

  const fetchSupplier = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/suppliers/${id}/`);
      setFormData({
        name: res.data.name || '',
        contact_person: res.data.contact_person || '',
        phone: res.data.phone || '',
        phone_secondary: res.data.phone_secondary || '',
        email: res.data.email || '',
        address: res.data.address || '',
        previous_balance: res.data.previous_balance || 0
      });
    } catch (err) {
      console.error('Error fetching supplier:', err);
      addToast(t('suppliers.failedToFetchDetails'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = t('suppliers.supplierNameRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/api/suppliers/${id}/`, formData);
        addToast(t('suppliers.supplierUpdated'), 'success');
      } else {
        await api.post('/api/suppliers/', formData);
        addToast(t('suppliers.supplierCreated'), 'success');
      }
      navigate('/suppliers');
    } catch (err) {
      console.error('Error saving supplier:', err);
      if (err.response?.data) {
        setErrors(err.response.data);
        addToast(t('suppliers.failedToSave'), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2 p-3 space-y-3">
        <PageHeader
          title={isEdit ? t('suppliers.editSupplier') : t('suppliers.addSupplierForm')}
          subtitle={isEdit ? t('suppliers.updateInfo') : t('suppliers.createNew')}
          icon={BuildingStorefrontIcon}
          actions={
            <button
              type="button"
              onClick={() => navigate('/suppliers')}
              className="btn-form-green"
            >
              {t('suppliers.title')}
            </button>
          }
        />

        <div className="p-3">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <UserIcon className="h-3.5 w-3.5 inline mr-1" />
                  {t('suppliers.name')} *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-2 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={t('suppliers.enterSupplierName')}
                />
                {errors.name && (
                  <p className="text-red-500 text-[10px] mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <UserIcon className="h-3.5 w-3.5 inline mr-1" />
                  {t('suppliers.contactPerson')}
                </label>
                <input
                  type="text"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleChange}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('suppliers.enterContactPerson')}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <PhoneIcon className="h-3.5 w-3.5 inline mr-1" />
                  {t('suppliers.phone')}
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('suppliers.enterPhone')}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <PhoneIcon className="h-3.5 w-3.5 inline mr-1" />
                  {t('suppliers.phone')} 2
                </label>
                <input
                  type="tel"
                  name="phone_secondary"
                  value={formData.phone_secondary}
                  onChange={handleChange}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`${t('suppliers.enterPhone')} (optional)`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <EnvelopeIcon className="h-3.5 w-3.5 inline mr-1" />
                  {t('suppliers.email')}
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('suppliers.enterEmail')}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Previous Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="previous_balance"
                  value={formData.previous_balance}
                  onChange={handleChange}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter previous balance"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <MapPinIcon className="h-3.5 w-3.5 inline mr-1" />
                {t('suppliers.address')}
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={2}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('suppliers.enterAddress')}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-form-green disabled:opacity-50"
              >
                {loading ? t('suppliers.saving') : (isEdit ? t('suppliers.updateSupplier') : t('suppliers.createSupplier'))}
              </button>
              <button
                type="button"
                onClick={() => navigate('/suppliers')}
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

export default SupplierForm;
