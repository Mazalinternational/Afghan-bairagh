import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  TableCellsIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import { useTranslation } from '../../i18n/fallback';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

function getFilenameFromDisposition(cd, fallback) {
  if (!cd) return fallback;
  const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i.exec(cd);
  return match?.[1] ? match[1].replace(/['"]/g, '').trim() : fallback;
}

const PRESETS = [
  { id: 'daily', labelKey: 'settings.backupDaily' },
  { id: 'weekly', labelKey: 'settings.backupWeekly' },
  { id: 'monthly', labelKey: 'settings.backupMonthly' },
  { id: 'yearly', labelKey: 'settings.backupYearly' },
  { id: 'custom', labelKey: 'settings.backupCustomRange' },
];

const BackupPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [downloading, setDownloading] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [rangePreset, setRangePreset] = useState('daily');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const canManageBackup = useMemo(
    () => !!user && (user.role === 'admin' || user.is_superuser === true),
    [user]
  );

  const buildParams = (exportType) => {
    const params = { export: exportType, preset: rangePreset };
    if (rangePreset === 'custom') {
      if (!dateFrom || !dateTo) {
        addToast(t('settings.backupCustomDateRequired'), 'error');
        return null;
      }
      params.date_from = dateFrom;
      params.date_to = dateTo;
    }
    return params;
  };

  const downloadBackup = async (exportType) => {
    const params = buildParams(exportType);
    if (!params) return;

    setDownloading(exportType);
    try {
      const response = await api.get('/api/auth/backup/download/', {
        params,
        responseType: 'blob',
        skipAuthRetry: true,
      });
      const fallbackName =
        exportType === 'excel'
          ? `system_backup_${rangePreset}.xlsx`
          : exportType === 'sql'
            ? `system_backup_${rangePreset}.sql`
            : `system_backup_${rangePreset}.zip`;
      const filename = getFilenameFromDisposition(
        response.headers['content-disposition'],
        fallbackName
      );
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast(t('settings.backupDownloadStarted'), 'success');
    } catch (error) {
      let message = t('settings.backupDownloadFailed');
      const data = error.response?.data;
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          const parsed = JSON.parse(text);
          if (parsed.detail) message = parsed.detail;
        } catch {
          // ignore
        }
      } else if (data?.detail) {
        message = data.detail;
      }
      addToast(message, 'error');
    } finally {
      setDownloading(null);
    }
  };

  const restoreBackup = async () => {
    if (!restoreFile) {
      addToast(t('settings.backupRestoreChooseFile'), 'error');
      return;
    }

    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append('file', restoreFile);
      const response = await api.post('/api/auth/backup/restore/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        skipAuthRetry: true,
      });
      addToast(response.data?.detail || t('settings.backupRestoreSuccess'), 'success');
      setRestoreFile(null);
    } catch (error) {
      let message = t('settings.backupRestoreFailed');
      if (error.response?.data?.detail) {
        message = error.response.data.detail;
      }
      addToast(message, 'error');
    } finally {
      setRestoring(false);
    }
  };

  const exportCards = [
    {
      id: 'excel',
      title: t('settings.backupExcel'),
      desc: t('settings.backupExcelDesc'),
      icon: TableCellsIcon,
      accent: 'from-blue-500 to-blue-600',
      ring: 'ring-blue-200 dark:ring-blue-800',
    },
    {
      id: 'sql',
      title: t('settings.backupSql'),
      desc: t('settings.backupSqlDesc'),
      icon: DocumentTextIcon,
      accent: 'from-indigo-500 to-indigo-600',
      ring: 'ring-indigo-200 dark:ring-indigo-800',
    },
    {
      id: 'both',
      title: t('settings.backupBoth'),
      desc: t('settings.backupBothDesc'),
      icon: ArchiveBoxIcon,
      accent: 'from-emerald-500 to-emerald-600',
      ring: 'ring-emerald-200 dark:ring-emerald-800',
      recommended: true,
    },
  ];

  return (
    <div className="min-h-full w-full min-w-0 max-w-full bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 px-3 py-4 sm:px-5 sm:py-6 pb-8">
      <div className="w-full max-w-5xl mx-auto space-y-4">
        <PageHeader
          title={t('settings.backupPageTitle')}
          subtitle={t('settings.backupPageSubtitle')}
          icon={ArrowDownTrayIcon}
          actions={
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="btn-form-red text-xs flex items-center gap-1"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              {t('common.back')}
            </button>
          }
        />

        {authLoading && (
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-xl shadow p-4 text-xs text-gray-500 dark:text-gray-400">
            {t('settings.backupAuthLoading')}
          </div>
        )}

        {!authLoading && !user && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-xs text-amber-800 dark:text-amber-300">
            {t('settings.backupNeedsLogin')}
          </div>
        )}

        {!authLoading && user && !canManageBackup && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-xs text-amber-800 dark:text-amber-300">
            {t('settings.backupNeedsAdmin')}
          </div>
        )}

        {/* Period + full backup */}
        <section className="relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-md border border-blue-100 dark:border-gray-700">
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-blue-400/15 dark:bg-blue-500/10 rounded-full pointer-events-none" />

          <div className="relative z-10 p-3 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <CalendarDaysIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                    {t('settings.backupCreateTitle')}
                  </h2>
                </div>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 max-w-2xl leading-snug">
                  {t('settings.backupRangeIntro')}
                </p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[9px] font-semibold">
                <CheckCircleIcon className="h-3 w-3" />
                {t('settings.backupAlwaysFullBadge')}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                {t('settings.backupPreset')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((preset) => {
                  const active = rangePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={!canManageBackup}
                      onClick={() => setRangePreset(preset.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                        active
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                      } disabled:opacity-50`}
                    >
                      {t(preset.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>

            {rangePreset === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg bg-blue-50/70 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-2.5">
                <div>
                  <label className="block text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                    {t('settings.backupDateFrom')}
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    disabled={!canManageBackup}
                    className="w-full px-2 py-1.5 text-[11px] border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                    {t('settings.backupDateTo')}
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    disabled={!canManageBackup}
                    className="w-full px-2 py-1.5 text-[11px] border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <p className="sm:col-span-2 text-[10px] text-blue-700 dark:text-blue-300">
                  {t('settings.backupCustomLabelNote')}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {exportCards.map((card) => {
                const Icon = card.icon;
                const busy = downloading === card.id;
                return (
                  <button
                    key={card.id}
                    type="button"
                    disabled={!canManageBackup || !!downloading}
                    onClick={() => downloadBackup(card.id)}
                    className={`group text-left rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 px-2.5 py-2 transition-all hover:shadow-sm disabled:opacity-50 ring-1 ${card.ring}`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${card.accent} text-white`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-[11px] font-semibold text-gray-900 dark:text-white truncate">
                            {busy ? t('common.loading') : card.title}
                          </h3>
                          {card.recommended && (
                            <span className="text-[8px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-1 py-0.5 rounded shrink-0">
                              {t('settings.backupRecommended')}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight truncate">
                          {card.desc}
                        </p>
                      </div>
                      <ArrowDownTrayIcon className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2">
              {t('settings.backupFullDataNote')}
            </p>
          </div>
        </section>

        {/* Restore */}
        <section className="relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-md border border-red-100 dark:border-red-900/40">
          <div className="relative z-10 p-3 sm:p-4 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <CloudArrowUpIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
              <h2 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                {t('settings.backupRestoreSection')}
              </h2>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-400">{t('settings.backupRestoreIntro')}</p>
            <p className="text-[11px] text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-md px-2.5 py-1.5">
              {t('settings.backupRestoreWarning')}
            </p>

            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <label className="flex-1 cursor-pointer">
                <span className="sr-only">{t('settings.backupRestoreChooseFile')}</span>
                <input
                  type="file"
                  accept=".sql,.zip"
                  disabled={!canManageBackup || restoring}
                  onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                  className="w-full px-2.5 py-2 text-[11px] border border-dashed border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700/50 dark:text-white file:mr-2 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:bg-red-50 file:text-red-700 dark:file:bg-red-900/40 dark:file:text-red-200"
                />
              </label>
              <button
                type="button"
                onClick={restoreBackup}
                disabled={!canManageBackup || restoring || !restoreFile}
                className="inline-flex items-center justify-center gap-1 px-3 py-2 text-[11px] rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 shrink-0"
              >
                {restoring ? (
                  <>
                    <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                    {t('settings.backupRestoring')}
                  </>
                ) : (
                  <>
                    <CloudArrowUpIcon className="h-3.5 w-3.5" />
                    {t('settings.backupRestoreButton')}
                  </>
                )}
              </button>
            </div>
            {restoreFile && (
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {restoreFile.name}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default BackupPage;
