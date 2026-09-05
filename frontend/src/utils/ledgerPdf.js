import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const COMPANY = {
  nameEn: 'Afghan Flag',
  nameDari: 'بیرق سازی افغان',
  phones: '0744841167, 0704737305, 0730117373',
  email: 'afghanart.af@gmail.com',
  address: 'چهارراهی صدارت، سرک وزارت داخله سابقه، مارکیت مطابع صنعتی جاوید، منزل دوم دوکان نمبر A2 14-15',
  logoPath: '/logo.jpeg',
};

const DARI = {
  customerLedger: 'دفتر حساب مشتری',
  supplierLedger: 'دفتر حساب تأمین‌کننده',
  customer: 'مشتری',
  supplier: 'تأمین‌کننده',
  name: 'نام',
  phone: 'شماره تماس',
  address: 'آدرس',
  serial: 'نمبر مسلسل',
  contact: 'شخص تماس',
  reportDate: 'تاریخ راپور',
  previousBalance: 'باقی‌مانده قبلی',
  totalBilled: 'مجموع بل',
  totalPurchases: 'مجموع خریداری',
  totalPaid: 'مجموع پرداخت شده',
  totalDue: 'مجموع باقی‌مانده',
  billHistory: 'تاریخچه تمام بل‌ها',
  billHistoryHint: 'قطارهای سبز هر پرداخت همان بل است',
  allPayments: 'تمام پرداخت‌ها (هر مبلغ پرداخت)',
  paymentsReceivedHint: 'هر باری که پول دریافت شده',
  paymentsPaidHint: 'هر باری که پول پرداخت شده',
  billRef: 'نمبر بل',
  type: 'نوع',
  date: 'تاریخ',
  items: 'اقلام',
  item: 'جنس',
  qty: 'تعداد',
  billAmount: 'مبلغ بل',
  paid: 'پرداخت شده',
  due: 'باقی‌مانده',
  status: 'حالت',
  towardBill: 'مربوط بل',
  method: 'طریقه پرداخت',
  amountPaid: 'مبلغ پرداخت',
  notes: 'یادداشت',
  noBills: 'هیچ بلی موجود نیست',
  noPayments: 'هیچ پرداختی موجود نیست',
  order: 'سفارش',
  sale: 'فروش',
  directSale: 'فروش مستقیم',
  opening: 'بیلانس افتتاحیه',
  paymentN: (n) => `پرداخت ${n}`,
  received: 'دریافت شد',
  paidStatus: 'پرداخت شده',
  itemsCount: (n) => `${n} قلم`,
};

function translateStatus(value) {
  const key = String(value || '').trim().toLowerCase();
  const map = {
    paid: 'پرداخت شده',
    partial: 'قسمی',
    due: 'باقی‌مانده',
    pending: 'در انتظار',
    completed: 'تکمیل شده',
    cancelled: 'لغو شده',
    canceled: 'لغو شده',
    'in progress': 'در جریان',
    processing: 'در جریان',
    delivered: 'تحویل شده',
    received: 'دریافت شد',
  };
  return map[key] || value || '-';
}

function translateMethod(value) {
  const key = String(value || '').trim().toLowerCase();
  const map = {
    cash: 'نقد',
    bank: 'بانک',
    'bank transfer': 'انتقال بانکی',
    transfer: 'انتقال',
    card: 'کارت',
    hawala: 'حواله',
    cheque: 'چک',
    check: 'چک',
    partial: 'قسمی',
    full: 'مکمل',
  };
  return map[key] || value || 'نقد';
}

function num(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return num(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pdfDate(value, formatDate) {
  if (!value) return '-';
  try {
    if (typeof formatDate === 'function') {
      const formatted = formatDate(value);
      if (formatted) return String(formatted);
    }
  } catch {
    /* fallback */
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toISOString().slice(0, 10);
}

function filePart(name) {
  const cleaned = String(name || 'ledger')
    .replace(/[^\w-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return cleaned.slice(0, 40) || 'ledger';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sortPayments(list) {
  return [...(list || [])].sort(
    (a, b) =>
      new Date(a.payment_date || a.created_at || a.date || 0) -
      new Date(b.payment_date || b.created_at || b.date || 0)
  );
}

function mergePayments(...lists) {
  const seen = new Set();
  const merged = [];
  lists.flat().forEach((p) => {
    if (!p) return;
    const key =
      p.id != null
        ? `id-${p.id}`
        : `x-${p.payment_date || p.created_at || ''}-${p.amount_paid ?? p.amount ?? ''}-${p.payment_method || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(p);
  });
  return sortPayments(merged);
}

function paymentOrderId(p) {
  return (
    p.order_id ||
    (p.order && typeof p.order === 'object' ? p.order.id : null) ||
    (typeof p.order === 'number' ? p.order : null)
  );
}

function paymentSaleId(p) {
  return (
    p.sale_id ??
    (p.sale && typeof p.sale === 'object' ? p.sale.id : null) ??
    (typeof p.sale === 'number' ? p.sale : null)
  );
}

function paymentDirectSaleId(p) {
  return (
    p.direct_sale_id ??
    (p.direct_sale && typeof p.direct_sale === 'object' ? p.direct_sale.id : null) ??
    (typeof p.direct_sale === 'number' ? p.direct_sale : null)
  );
}

function payAmount(p) {
  return num(p.amount_paid ?? p.amount);
}

async function loadLogoDataUrl() {
  try {
    const res = await fetch(`${window.location.origin}${COMPANY.logoPath}`);
    if (!res.ok) return '';
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

function companyHeaderHtml(title, logoUrl) {
  const logo = logoUrl
    ? `<img src="${logoUrl}" alt="Afghan Flag logo" style="width:78px;height:78px;border-radius:50%;object-fit:cover;border:4px solid #fff;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.25);" />`
    : `<div style="width:78px;height:78px;border-radius:50%;background:#fff;color:#0047AB;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;border:4px solid #fff;">AF</div>`;
  return `
    <div style="display:flex;align-items:stretch;min-height:96px;">
      <div style="width:28%;background:#0047AB;display:flex;align-items:center;justify-content:center;padding:12px 10px;">
        ${logo}
      </div>
      <div style="width:44%;background:#FFD700;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 12px;text-align:center;">
        <div style="font-size:26px;font-weight:800;color:#111;line-height:1.2;" dir="rtl">${escapeHtml(COMPANY.nameDari)}</div>
      </div>
      <div style="width:28%;background:#fff;position:relative;border-bottom:4px solid #0047AB;">
        <div dir="rtl" style="position:absolute;left:0;top:18px;background:#0047AB;color:#fff;font-weight:800;font-size:13px;padding:8px 18px 8px 12px;clip-path:polygon(0 0,100% 0,86% 50%,100% 100%,0 100%);">
          ${escapeHtml(title)}
        </div>
        <div dir="rtl" style="position:absolute;right:12px;bottom:10px;color:#0047AB;font-size:11px;font-weight:700;">
          ${escapeHtml(COMPANY.nameDari)}
        </div>
      </div>
    </div>
  `;
}

function companyFooterHtml() {
  return `
    <div style="margin-top:18px;background:#FFD700;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
      <div style="font-size:11px;font-weight:600;">
        📞 ${escapeHtml(COMPANY.phones)} &nbsp;|&nbsp; 📧 ${escapeHtml(COMPANY.email)}
      </div>
      <div style="background:#0047AB;color:#fff;padding:8px 18px 8px 28px;font-size:11px;clip-path:polygon(12% 0,100% 0,100% 100%,12% 100%,0 50%);max-width:58%;text-align:right;" dir="rtl">
        آدرس: ${escapeHtml(COMPANY.address)}
      </div>
    </div>
  `;
}

function summaryCardsHtml(cards) {
  return `<div style="display:flex;gap:8px;margin:12px 0;" dir="rtl">
    ${cards
      .map(
        (c) => `<div style="flex:1;border:1px solid ${c.border};border-right:5px solid ${c.border};border-radius:6px;padding:9px 11px;background:${c.bg};text-align:right;">
          <div style="font-size:11px;color:#4b5563;font-weight:700;">${escapeHtml(c.label)}</div>
          <div style="font-size:16px;font-weight:800;color:${c.color};margin-top:4px;">افغانی ${escapeHtml(c.value)}</div>
        </div>`
      )
      .join('')}
  </div>`;
}

function tableWrap(title, hint, thead, tbody) {
  return `
    <div dir="rtl" style="display:flex;align-items:baseline;justify-content:space-between;margin:16px 0 6px;border-bottom:2px solid #0047AB;padding-bottom:4px;">
      <div style="font-size:15px;font-weight:800;color:#0047AB;">${escapeHtml(title)}</div>
      ${hint ? `<div style="font-size:10px;color:#6b7280;">${escapeHtml(hint)}</div>` : ''}
    </div>
    <table dir="rtl" style="width:100%;border-collapse:collapse;font-size:11px;text-align:right;">
      <thead>${thead}</thead>
      <tbody>${tbody}</tbody>
    </table>
  `;
}

function th(cols) {
  return `<tr>${cols
    .map(
      (c) =>
        `<th style="background:#0047AB;color:#fff;padding:7px 8px;text-align:right;font-size:10px;font-weight:700;">${escapeHtml(c)}</th>`
    )
    .join('')}</tr>`;
}

function billRow(cells) {
  return `<tr style="background:#f8fafc;">${cells
    .map(
      (c, i) =>
        `<td style="border:1px solid #bfdbfe;padding:7px 8px;font-weight:${i === 0 ? 800 : 600};">${c}</td>`
    )
    .join('')}</tr>`;
}

function paymentRow(cells, colCount) {
  const filled = [...cells];
  while (filled.length < colCount) filled.push('');
  return `<tr style="background:#ecfdf5;">${filled
    .map(
      (c) =>
        `<td style="border:1px solid #a7f3d0;padding:5px 8px;color:#065f46;font-size:10px;">${c}</td>`
    )
    .join('')}</tr>`;
}

function partyBox(title, lines) {
  return `<div dir="rtl" style="margin:12px 14px 0;border:1px solid #bfdbfe;background:#eff6ff;border-radius:6px;padding:10px 12px;text-align:right;">
    <div style="font-weight:800;color:#0047AB;margin-bottom:4px;font-size:13px;">${escapeHtml(title)}</div>
    ${lines.filter(Boolean).map((l) => `<div style="font-size:12px;margin:3px 0;">${l}</div>`).join('')}
  </div>`;
}

async function htmlToPdfDownload(html, filename) {
  const host = document.createElement('div');
  host.style.cssText =
    'position:fixed;left:-14000px;top:0;width:1120px;background:#fff;z-index:-1;padding:0;';
  host.innerHTML = html;
  document.body.appendChild(host);
  try {
    await new Promise((resolve) => setTimeout(resolve, 120));
    const canvas = await html2canvas(host, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      imageTimeout: 6000,
    });
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * pageW) / canvas.width;
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0.5) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
      heightLeft -= pageH;
    }
    pdf.save(filename);
  } finally {
    host.remove();
  }
}

function paymentsTableRows(allPayLog, formatDate) {
  return sortPayments(allPayLog)
    .reverse()
    .map(
      (p) => `<tr>
        <td style="border:1px solid #d1d5db;padding:6px 8px;">${escapeHtml(pdfDate(p.date, formatDate))}</td>
        <td style="border:1px solid #d1d5db;padding:6px 8px;">${escapeHtml(p.ref)}</td>
        <td style="border:1px solid #d1d5db;padding:6px 8px;">${escapeHtml(translateMethod(p.method))}</td>
        <td style="border:1px solid #d1d5db;padding:6px 8px;color:#047857;font-weight:800;">افغانی ${money(p.amount)}</td>
        <td style="border:1px solid #d1d5db;padding:6px 8px;">${escapeHtml(p.notes || '-')}</td>
      </tr>`
    )
    .join('');
}

function appendPaymentLines({ pays, billCells, allPayLog, ref, formatDate, colCount, receivedLabel }) {
  pays.forEach((p, i) => {
    const amt = payAmount(p);
    const date = pdfDate(p.payment_date || p.created_at, formatDate);
    const method = translateMethod(p.payment_method || 'cash');
    billCells.push(
      paymentRow(
        [
          '',
          `↳ ${DARI.paymentN(i + 1)}`,
          escapeHtml(date),
          escapeHtml(method),
          '',
          `<b>افغانی ${money(amt)}</b>`,
          '',
          receivedLabel,
        ],
        colCount
      )
    );
    allPayLog.push({
      date: p.payment_date || p.created_at,
      ref,
      method,
      amount: amt,
      notes: p.notes || p.reference || '',
    });
  });
}

/**
 * Download customer ledger PDF: all bills + each payment amount, company header/logo.
 */
export async function exportCustomerLedgerToPdf({
  customer,
  ledgerRows = [],
  payments = [],
  salePayments = [],
  directSalePayments = [],
  balancePayments = [],
  totals = {},
  formatDate,
}) {
  if (!customer) throw new Error('Customer not loaded');
  const logoUrl = await loadLogoDataUrl();
  const today = new Date().toISOString().slice(0, 10);
  const allPayLog = [];
  const billCells = [];

  if (num(customer.previous_balance) > 0 || (balancePayments && balancePayments.length)) {
    const total = num(customer.previous_balance);
    const paid = num(customer.previous_balance_paid);
    const due = num(customer.previous_balance_remaining ?? Math.max(0, total - paid));
    const ref = customer.previous_balance_reference || DARI.previousBalance;
    billCells.push(
      billRow([
        escapeHtml(ref),
        DARI.previousBalance,
        escapeHtml(pdfDate(customer.created_at, formatDate)),
        '-',
        `افغانی ${money(total)}`,
        `<span style="color:#047857;font-weight:800;">افغانی ${money(paid)}</span>`,
        `<span style="color:#b91c1c;font-weight:800;">افغانی ${money(due)}</span>`,
        due <= 0 ? DARI.paidStatus : paid > 0 ? translateStatus('partial') : translateStatus('due'),
      ])
    );
    appendPaymentLines({
      pays: sortPayments(balancePayments),
      billCells,
      allPayLog,
      ref,
      formatDate,
      colCount: 8,
      receivedLabel: DARI.received,
    });
  }

  ledgerRows.forEach((row) => {
    if (row.kind === 'order') {
      const order = row.entity || {};
      const orderPays = mergePayments(
        payments.filter((p) => paymentOrderId(p) === order.id),
        order.payments || []
      );
      const total = num(order.total_amount ?? order.total_estimated_amount ?? order.total);
      const due = Math.max(0, num(order.due_amount ?? order.due));
      const paidFromPays = orderPays.reduce((s, p) => s + payAmount(p), 0);
      const paid = num(order.total_paid ?? order.paid_amount) || paidFromPays || Math.max(0, total - due);
      const items =
        Array.isArray(order.order_items) && order.order_items.length
          ? order.order_items
              .map((it) => it.manual_item_name || it.item_name || it.flag_size || 'item')
              .join(', ')
          : order.item_count != null
            ? DARI.itemsCount(order.item_count)
            : `${order.flag_size || '-'} x ${order.quantity ?? '-'}`;
      const ref = `#${order.id}`;
      billCells.push(
        billRow([
          escapeHtml(ref),
          DARI.order,
          escapeHtml(pdfDate(order.created_at || order.order_date, formatDate)),
          escapeHtml(items),
          `افغانی ${money(total)}`,
          `<span style="color:#047857;font-weight:800;">افغانی ${money(paid)}</span>`,
          `<span style="color:#b91c1c;font-weight:800;">افغانی ${money(due)}</span>`,
          escapeHtml(translateStatus(order.status)),
        ])
      );
      appendPaymentLines({
        pays: orderPays,
        billCells,
        allPayLog,
        ref,
        formatDate,
        colCount: 8,
        receivedLabel: DARI.received,
      });
      return;
    }

    if (row.kind === 'sale') {
      const s = row.entity || {};
      const sPays = mergePayments(
        salePayments.filter((p) => paymentSaleId(p) === s.id),
        s.payments || []
      );
      const ref = `S-${s.id}`;
      billCells.push(
        billRow([
          escapeHtml(ref),
          DARI.sale,
          escapeHtml(pdfDate(s.created_at || s.sale_date, formatDate)),
          escapeHtml(s.item_count != null ? DARI.itemsCount(s.item_count) : '-'),
          `افغانی ${money(s.net_amount ?? s.total_amount)}`,
          `<span style="color:#047857;font-weight:800;">افغانی ${money(s.total_paid)}</span>`,
          `<span style="color:#b91c1c;font-weight:800;">افغانی ${money(s.due)}</span>`,
          escapeHtml(translateStatus(s.status)),
        ])
      );
      appendPaymentLines({
        pays: sPays,
        billCells,
        allPayLog,
        ref,
        formatDate,
        colCount: 8,
        receivedLabel: DARI.received,
      });
      return;
    }

    const d = row.entity || {};
    const dPays = mergePayments(
      directSalePayments.filter((p) => paymentDirectSaleId(p) === d.id),
      d.payments || []
    );
    const net = num(d.net_amount ?? d.total_amount);
    const paid = num(d.total_paid);
    const ref = `DS-${d.id}`;
    billCells.push(
      billRow([
        escapeHtml(ref),
        DARI.directSale,
        escapeHtml(pdfDate(d.created_at || d.sale_date, formatDate)),
        escapeHtml(d.item_count != null ? DARI.itemsCount(d.item_count) : '-'),
        `افغانی ${money(net)}`,
        `<span style="color:#047857;font-weight:800;">افغانی ${money(paid)}</span>`,
        `<span style="color:#b91c1c;font-weight:800;">افغانی ${money(Math.max(0, net - paid))}</span>`,
        escapeHtml(translateStatus(d.status)),
      ])
    );
    appendPaymentLines({
      pays: dPays,
      billCells,
      allPayLog,
      ref,
      formatDate,
      colCount: 8,
      receivedLabel: DARI.received,
    });
  });

  const html = `
    <div dir="rtl" style="font-family:Tahoma,'Segoe UI',Arial,sans-serif;color:#111827;background:#fff;">
      ${companyHeaderHtml(DARI.customerLedger, logoUrl)}
      ${partyBox(DARI.customer, [
        `<b>${DARI.name}:</b> ${escapeHtml(customer.name || '-')}`,
        `<b>${DARI.phone}:</b> ${escapeHtml(customer.phone || '-')}`,
        customer.address ? `<b>${DARI.address}:</b> ${escapeHtml(customer.address)}` : '',
        (customer.manual_serial_no || '').trim()
          ? `<b>${DARI.serial}:</b> ${escapeHtml(customer.manual_serial_no)}`
          : '',
        `<b>${DARI.reportDate}:</b> ${escapeHtml(today)}`,
      ])}
      <div style="padding:0 14px 8px;">
        ${summaryCardsHtml([
          { label: DARI.previousBalance, value: money(totals.previousBalanceDue), border: '#7c3aed', color: '#6d28d9', bg: '#f5f3ff' },
          { label: DARI.totalBilled, value: money(totals.totalBilled), border: '#0047AB', color: '#0047AB', bg: '#eff6ff' },
          { label: DARI.totalPaid, value: money(totals.totalPaid), border: '#047857', color: '#047857', bg: '#ecfdf5' },
          { label: DARI.totalDue, value: money(totals.totalDue), border: '#b91c1c', color: '#b91c1c', bg: '#fef2f2' },
        ])}
        ${tableWrap(
          DARI.billHistory,
          DARI.billHistoryHint,
          th([DARI.billRef, DARI.type, DARI.date, DARI.items, DARI.billAmount, DARI.paid, DARI.due, DARI.status]),
          billCells.join('') ||
            `<tr><td colspan="8" style="padding:10px;text-align:center;border:1px solid #ddd;">${escapeHtml(DARI.noBills)}</td></tr>`
        )}
        ${tableWrap(
          DARI.allPayments,
          DARI.paymentsReceivedHint,
          th([DARI.date, DARI.towardBill, DARI.method, DARI.amountPaid, DARI.notes]),
          paymentsTableRows(allPayLog, formatDate) ||
            `<tr><td colspan="5" style="padding:10px;text-align:center;border:1px solid #ddd;">${escapeHtml(DARI.noPayments)}</td></tr>`
        )}
      </div>
      ${companyFooterHtml()}
    </div>
  `;

  await htmlToPdfDownload(html, `Customer_Ledger_${filePart(customer.name)}_${today}.pdf`);
}

/**
 * Download supplier ledger PDF: all bills + each payment amount, company header/logo.
 */
export async function exportSupplierLedgerToPdf({
  supplier,
  purchases = [],
  balancePayments = [],
  totals = {},
  formatDate,
}) {
  if (!supplier) throw new Error('Supplier not loaded');
  const logoUrl = await loadLogoDataUrl();
  const today = new Date().toISOString().slice(0, 10);

  const opening =
    num(supplier.previous_balance) > 0 || (balancePayments && balancePayments.length)
      ? {
          bill_number: supplier.previous_balance_reference || DARI.opening,
          item_name: DARI.previousBalance,
          quantity: '-',
          cost: supplier.previous_balance,
          total_paid: supplier.previous_balance_paid || 0,
          remaining_amount: supplier.previous_balance_remaining ?? 0,
          payment_status:
            num(supplier.previous_balance_remaining) <= 0
              ? 'paid'
              : num(supplier.previous_balance_paid) > 0
                ? 'partial'
                : 'due',
          purchase_date: supplier.created_at,
          payments: balancePayments || [],
          isOpeningBalance: true,
        }
      : null;

  const rows = [...purchases];
  if (opening) rows.push(opening);
  rows.sort((a, b) => new Date(b.purchase_date || 0) - new Date(a.purchase_date || 0));

  const allPayLog = [];
  const billCells = [];
  rows.forEach((purchase) => {
    const nestedPays = mergePayments(purchase.payments || []);
    const cost = num(purchase.cost);
    const paid = num(
      purchase.total_paid ?? nestedPays.reduce((sum, p) => sum + num(p.amount ?? p.amount_paid), 0)
    );
    const due =
      purchase.remaining_amount != null ? num(purchase.remaining_amount) : Math.max(0, cost - paid);
    const bill = purchase.bill_number || (purchase.isOpeningBalance ? DARI.opening : `#${purchase.id}`);
    const itemLabel =
      Array.isArray(purchase.purchase_items) && purchase.purchase_items.length
        ? purchase.purchase_items.map((it) => it.item_name || it.name).filter(Boolean).join(', ')
        : purchase.item_name || '-';
    billCells.push(
      billRow([
        escapeHtml(bill),
        escapeHtml(itemLabel),
        escapeHtml(String(purchase.quantity ?? '-')),
        `افغانی ${money(cost)}`,
        `<span style="color:#047857;font-weight:800;">افغانی ${money(paid)}</span>`,
        `<span style="color:#b91c1c;font-weight:800;">افغانی ${money(due)}</span>`,
        escapeHtml(purchase.purchase_date ? pdfDate(purchase.purchase_date, formatDate) : '-'),
        escapeHtml(translateStatus(purchase.payment_status)),
      ])
    );
    nestedPays.forEach((p, i) => {
      const amt = num(p.amount ?? p.amount_paid);
      billCells.push(
        paymentRow(
          [
            '',
            `↳ ${DARI.paymentN(i + 1)}`,
            escapeHtml(translateMethod(p.payment_method || 'cash')),
            '',
            `<b>افغانی ${money(amt)}</b>`,
            '',
            escapeHtml(pdfDate(p.payment_date || p.created_at, formatDate)),
            DARI.paidStatus,
          ],
          8
        )
      );
      allPayLog.push({
        date: p.payment_date || p.created_at,
        ref: bill,
        method: p.payment_method || 'cash',
        amount: amt,
        notes: p.notes || p.reference || '',
      });
    });
  });

  const html = `
    <div dir="rtl" style="font-family:Tahoma,'Segoe UI',Arial,sans-serif;color:#111827;background:#fff;">
      ${companyHeaderHtml(DARI.supplierLedger, logoUrl)}
      ${partyBox(DARI.supplier, [
        `<b>${DARI.name}:</b> ${escapeHtml(supplier.name || '-')}`,
        `<b>${DARI.phone}:</b> ${escapeHtml(supplier.phone || '-')}`,
        supplier.contact_person ? `<b>${DARI.contact}:</b> ${escapeHtml(supplier.contact_person)}` : '',
        supplier.address ? `<b>${DARI.address}:</b> ${escapeHtml(supplier.address)}` : '',
        `<b>${DARI.reportDate}:</b> ${escapeHtml(today)}`,
      ])}
      <div style="padding:0 14px 8px;">
        ${summaryCardsHtml([
          { label: DARI.previousBalance, value: money(totals.previousBalanceDue), border: '#7c3aed', color: '#6d28d9', bg: '#f5f3ff' },
          { label: DARI.totalPurchases, value: money(totals.totalPurchases), border: '#0047AB', color: '#0047AB', bg: '#eff6ff' },
          { label: DARI.totalPaid, value: money(totals.totalPaid), border: '#047857', color: '#047857', bg: '#ecfdf5' },
          { label: DARI.totalDue, value: money(totals.totalDue), border: '#b91c1c', color: '#b91c1c', bg: '#fef2f2' },
        ])}
        ${tableWrap(
          DARI.billHistory,
          DARI.billHistoryHint,
          th([DARI.billRef, DARI.item, DARI.qty, DARI.billAmount, DARI.paid, DARI.due, DARI.date, DARI.status]),
          billCells.join('') ||
            `<tr><td colspan="8" style="padding:10px;text-align:center;border:1px solid #ddd;">${escapeHtml(DARI.noBills)}</td></tr>`
        )}
        ${tableWrap(
          DARI.allPayments,
          DARI.paymentsPaidHint,
          th([DARI.date, DARI.towardBill, DARI.method, DARI.amountPaid, DARI.notes]),
          paymentsTableRows(allPayLog, formatDate) ||
            `<tr><td colspan="5" style="padding:10px;text-align:center;border:1px solid #ddd;">${escapeHtml(DARI.noPayments)}</td></tr>`
        )}
      </div>
      ${companyFooterHtml()}
    </div>
  `;

  await htmlToPdfDownload(html, `Supplier_Ledger_${filePart(supplier.name)}_${today}.pdf`);
}
