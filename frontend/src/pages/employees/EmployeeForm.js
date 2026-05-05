import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  IdentificationIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserCircleIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n/fallback';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import LocalizedDateInput from '../../components/common/LocalizedDateInput';

const EmployeeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    father_name: '',
    nid: '',
    phone: '',
    address: '',
    salary: '',
    join_date: '',
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEdit) {
      fetchEmployee();
    }
  }, [id, isEdit]);

  const fetchEmployee = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/employees/${id}/`);
      setFormData({
        name: res.data.name || '',
        father_name: res.data.father_name || '',
        nid: res.data.nid || '',
        phone: res.data.phone || '',
        address: res.data.address || '',
        salary: res.data.salary || '',
        join_date: res.data.join_date || '',
        is_active: res.data.is_active !== undefined ? res.data.is_active : true
      });
    } catch (err) {
      console.error('Error fetching employee:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = t('employees.nameRequired');
    }
    
    if (!formData.father_name.trim()) {
      newErrors.father_name = t('employees.fatherNameRequired');
    }
    
    if (!formData.nid.trim()) {
      newErrors.nid = t('employees.nidRequired');
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = t('employees.phoneRequired');
    }
    
    if (!formData.address.trim()) {
      newErrors.address = t('employees.addressRequired');
    }
    
    if (!formData.salary || formData.salary <= 0) {
      newErrors.salary = t('employees.salaryRequired');
    }
    
    if (!formData.join_date) {
      newErrors.join_date = t('employees.joinDateRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        salary: formData.salary ? parseFloat(formData.salary) : '',
      };

      if (isEdit) {
        await api.put(`/api/employees/${id}/`, submitData);
      } else {
        await api.post('/api/employees/', submitData);
      }
      navigate('/employees');
    } catch (err) {
      console.error('Error saving employee:', err);
      if (err.response?.data) {
        if (typeof err.response.data === 'object' && !Array.isArray(err.response.data)) {
          setErrors(err.response.data);
        } else {
          setErrors({ non_field_errors: err.response.data });
        }
      } else {
        setErrors({ non_field_errors: [t('employees.failedToSave')] });
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
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2">
          <div className="space-y-2 sm:space-y-3 p-2 sm:p-3 md:p-4">
        {/* Header */}
        <PageHeader
          title={isEdit ? t('employees.editEmployeePageTitle') : t('employees.addEmployeePageTitle')}
          subtitle={isEdit ? t('employees.editEmployeePageSubtitle') : t('employees.addEmployeePageSubtitle')}
          icon={UserGroupIcon}
          actions={
            <button
              type="button"
              onClick={() => navigate('/employees')}
              className="btn-form-red flex items-center gap-1"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              {t('common.back')}
            </button>
          }
        />

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name, Father Name, NID Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <UserIcon className="h-3.5 w-3.5 inline mr-1" />
                {t('common.name')} *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('employees.enterName')}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <UserCircleIcon className="h-3.5 w-3.5 inline mr-1" />
                {t('employees.fatherName')} *
              </label>
              <input
                type="text"
                name="father_name"
                value={formData.father_name}
                onChange={handleChange}
                className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                  errors.father_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('employees.enterFatherName')}
              />
              {errors.father_name && (
                <p className="text-red-500 text-xs mt-1">{errors.father_name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <IdentificationIcon className="h-3.5 w-3.5 inline mr-1" />
                {t('employees.nid')} *
              </label>
              <input
                type="text"
                name="nid"
                value={formData.nid}
                onChange={handleChange}
                className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                  errors.nid ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('employees.enterNid')}
              />
              {errors.nid && (
                <p className="text-red-500 text-xs mt-1">{errors.nid}</p>
              )}
            </div>
          </div>

          {/* Phone, Salary, Join Date Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <PhoneIcon className="h-3.5 w-3.5 inline mr-1" />
                {t('common.phone')} *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('employees.enterPhone')}
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <CurrencyDollarIcon className="h-3.5 w-3.5 inline mr-1" />
                {t('employees.salary')} (AFN) *
              </label>
              <input
                type="number"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                  errors.salary ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('employees.enterSalary')}
              />
              {errors.salary && (
                <p className="text-red-500 text-xs mt-1">{errors.salary}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <CalendarIcon className="h-3.5 w-3.5 inline mr-1" />
                {t('employees.joinDate')} *
              </label>
              <LocalizedDateInput
                name="join_date"
                value={formData.join_date}
                onChange={(dateValue) => {
                  setFormData((prev) => ({
                    ...prev,
                    join_date: dateValue
                  }));
                  if (errors.join_date) {
                    setErrors((prev) => ({ ...prev, join_date: '' }));
                  }
                }}
                className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                  errors.join_date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.join_date && (
                <p className="text-red-500 text-xs mt-1">{errors.join_date}</p>
              )}
            </div>
          </div>

          {/* Address and Status Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <MapPinIcon className="h-3.5 w-3.5 inline mr-1" />
                {t('common.address')} *
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                  errors.address ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('employees.enterAddress')}
              />
              {errors.address && (
                <p className="text-red-500 text-xs mt-1">{errors.address}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.status')}
              </label>
              <div className="flex items-center mt-4">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                />
                <label className="ml-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  {t('employees.activeEmployee')}
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-form-green disabled:opacity-50"
            >
              {loading ? t('common.saving') : (isEdit ? t('employees.updateEmployee') : t('employees.createEmployee'))}
            </button>
            <button
              type="button"
              onClick={() => navigate('/employees')}
              className="btn-form-red"
            >
              {t('common.cancel')}
            </button>
          </div>
          </form>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeForm;
