import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useTranslation } from '../../i18n/fallback';
import PrintablePressBill from '../../components/printing/PrintablePressBill';

const PrintingRecordDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecord = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/printing-jobs/${id}/`);
        setRecord(res.data);
      } catch (err) {
        console.error(err);
        setRecord(null);
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-4">
        <button onClick={() => navigate('/printing')} className="btn-form-red text-xs flex items-center gap-1">
          <ArrowLeftIcon className="h-4 w-4" /> {t('common.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="mx-2 space-y-2">
        <button onClick={() => navigate('/printing')} className="btn-form-red text-xs flex items-center gap-1">
          <ArrowLeftIcon className="h-4 w-4" /> {t('common.back')}
        </button>
        <PrintablePressBill record={record} />
      </div>
    </div>
  );
};

export default PrintingRecordDetails;

