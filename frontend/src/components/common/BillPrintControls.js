import React from 'react';
import { PrinterIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n/fallback';

const BillPrintControls = ({ pageSize, onPageSizeChange, onPrint, className = '' }) => {
  const { t } = useTranslation();

  return (
    <div className={`flex flex-wrap items-center justify-end gap-2 no-print ${className}`}>
      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <span>{t('common.printSize')}</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(e.target.value)}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="A4">A4</option>
          <option value="A5">A5 (portrait)</option>
        </select>
      </label>
      <button
        type="button"
        onClick={onPrint}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
      >
        <PrinterIcon className="h-4 w-4" />
        {t('common.print')}
      </button>
    </div>
  );
};

export default BillPrintControls;
