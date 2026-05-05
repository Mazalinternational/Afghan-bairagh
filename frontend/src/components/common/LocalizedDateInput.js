import React from 'react';
import DatePicker from 'react-multi-date-picker';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import gregorian from 'react-date-object/calendars/gregorian';
import { useTranslation } from '../../i18n/fallback';

const persianAfghanDariLocale = {
  name: 'persian_dari_af',
  months: [
    ['حمل', 'حم'],
    ['ثور', 'ثو'],
    ['جوزا', 'جو'],
    ['سرطان', 'سر'],
    ['اسد', 'اسد'],
    ['سنبله', 'سن'],
    ['میزان', 'می'],
    ['عقرب', 'عق'],
    ['قوس', 'قو'],
    ['جدی', 'جد'],
    ['دلو', 'دل'],
    ['حوت', 'حو']
  ],
  weekDays: [
    ['شنبه', 'شن'],
    ['یکشنبه', 'یک'],
    ['دوشنبه', 'دو'],
    ['سه‌شنبه', 'سه'],
    ['چهارشنبه', 'چه'],
    ['پنجشنبه', 'پن'],
    ['جمعه', 'جم']
  ],
  digits: ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'],
  meridiems: [
    ['قبل از ظهر', 'ق.ظ'],
    ['بعد از ظهر', 'ب.ظ']
  ]
};

const isDariLike = (lang) => {
  const normalized = String(lang || '').toLowerCase();
  return normalized === 'prs' || normalized === 'ps' || normalized.startsWith('fa');
};

const toYmd = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const LocalizedDateInput = ({
  value,
  onChange,
  className = '',
  required = false,
  placeholder = '',
  ...rest
}) => {
  const { i18n } = useTranslation();
  const useShamsiPicker = isDariLike(i18n.language);
  const portalTarget = typeof document !== 'undefined' ? document.body : undefined;

  if (!useShamsiPicker) {
    return (
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        className={className}
        required={required}
        {...rest}
      />
    );
  }

  const pickerValue = (() => {
    if (!value) return null;
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return new DateObject({ date: parsed }).convert(persian, persianAfghanDariLocale);
  })();

  return (
    <DatePicker
      value={pickerValue}
      onChange={(selected) => {
        const pickedValue = Array.isArray(selected) ? selected[0] : selected;
        if (!pickedValue) {
          onChange?.('');
          return;
        }
        const jsDate = pickedValue.toDate?.();
        if (!jsDate || Number.isNaN(jsDate.getTime())) {
          onChange?.('');
          return;
        }
        onChange?.(toYmd(jsDate));
      }}
      calendar={persian}
      locale={persianAfghanDariLocale}
      calendarPosition="bottom-right"
      inputClass={className}
      format="YYYY/MM/DD"
      placeholder={placeholder}
      required={required}
      portal
      portalTarget={portalTarget}
      zIndex={9999}
      {...rest}
    />
  );
};

export default LocalizedDateInput;
