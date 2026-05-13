import jsPDF from 'jspdf';
// Import autoTable plugin - side effect import that extends jsPDF prototype
// This must be imported to extend jsPDF.prototype.autoTable
import 'jspdf-autotable';
import { formatDate } from '../i18n/dateUtils';

// Verify plugin is loaded
if (typeof jsPDF.prototype.autoTable === 'undefined') {
  console.warn('jspdf-autotable plugin may not be loaded correctly');
}

const formatMonthYear = (dateInput) => {
  if (!dateInput) return 'N/A';
  const lang = (localStorage.getItem('i18nextLng') || 'en').toLowerCase();
  const locale = lang === 'prs' || lang === 'ps' || lang.startsWith('fa') ? 'fa-AF-u-ca-persian' : 'en-US';
  return new Date(dateInput).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
};

/**
 * Export customer details to PDF
 */
export const exportCustomerToPDF = (customer, orders, payments, extra = {}) => {
  const {
    sales = [],
    directSales = [],
    salePayments = [],
    directSalePayments = [],
  } = extra;
  try {
    // Create jsPDF instance - autoTable should be available if plugin loaded
    const doc = new jsPDF();
    
    // Verify autoTable is available
    if (typeof doc.autoTable !== 'function') {
      console.error('autoTable is not a function on jsPDF instance');
      console.error('jsPDF prototype:', Object.getOwnPropertyNames(jsPDF.prototype));
      throw new Error('PDF table plugin not loaded. Please refresh the page.');
    }
    
    const pageWidth = doc.internal.pageSize.getWidth();
    let startY = 20;

    // Title
    doc.setFontSize(18);
    doc.setTextColor(31, 41, 55);
    doc.text('Customer Details Report', pageWidth / 2, startY, { align: 'center' });
    startY += 10;

    // Customer Information
    doc.setFontSize(12);
    doc.setTextColor(75, 85, 99);
    doc.text(`Report Date: ${formatDate(new Date())}`, pageWidth - 20, startY, { align: 'right' });
    startY += 10;

    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text('Customer Information', 14, startY);
    startY += 8;

    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    const serialRow =
      (customer.manual_serial_no || '').trim() !== ''
        ? [[`Serial No.:`, customer.manual_serial_no]]
        : [];
    const customerInfo = [
      [`Name:`, customer.name || 'N/A'],
      ...serialRow,
      [`Phone:`, customer.phone || 'N/A'],
      [`Email:`, customer.email || 'N/A'],
      [`Address:`, customer.address || 'N/A'],
      [`Created:`, customer.created_at ? formatDate(customer.created_at) : 'N/A']
    ];

    customerInfo.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, startY);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 50, startY);
      startY += 6;
    });

    startY += 5;

    // Summary (orders + regular sales + direct sales; paid includes order + sale + direct sale payments)
    const totalOrdersAmt = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount || o.total) || 0), 0);
    const totalSalesAmt = sales.reduce(
      (sum, s) => sum + (parseFloat(s.net_amount ?? s.total_amount) || 0),
      0
    );
    const totalDirectAmt = directSales.reduce(
      (sum, d) => sum + (parseFloat(d.net_amount ?? d.total_amount) || 0),
      0
    );
    const totalBilled = totalOrdersAmt + totalSalesAmt + totalDirectAmt;
    const orderPaid = payments.reduce(
      (sum, p) => sum + (parseFloat(p.amount_paid || p.amount) || 0),
      0
    );
    const salePaidSum = salePayments.reduce(
      (sum, p) => sum + (parseFloat(p.amount_paid || p.amount) || 0),
      0
    );
    const directPaidSum = directSalePayments.reduce(
      (sum, p) => sum + (parseFloat(p.amount_paid || p.amount) || 0),
      0
    );
    const totalPaidAll = orderPaid + salePaidSum + directPaidSum;
    const totalDueAll = Math.max(0, totalBilled - totalPaidAll);

    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text('Financial Summary', 14, startY);
    startY += 8;

    doc.autoTable({
      startY: startY,
      head: [['Metric', 'Amount (AFN)']],
      body: [
        ['Total billed (orders + sales)', totalBilled.toFixed(2)],
        ['Total paid (all payment types)', totalPaidAll.toFixed(2)],
        ['Total due', totalDueAll.toFixed(2)]
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 }
    });

    startY = doc.lastAutoTable.finalY + 15;

    // Orders Table
    if (orders.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text('Order History', 14, startY);
      startY += 8;

      doc.autoTable({
        startY: startY,
        head: [['Order ID', 'Date', 'Items', 'Total', 'Paid', 'Due', 'Status']],
        body: orders.map(order => [
          order.id || 'N/A',
          order.order_date ? formatDate(order.order_date) : 'N/A',
          order.items || 'N/A',
          (parseFloat(order.total_amount || order.total) || 0).toFixed(2),
          (parseFloat(order.total_paid || 0) || 0).toFixed(2),
          Math.max(0, (parseFloat(order.due_amount || order.due) || 0)).toFixed(2),
          order.status || 'N/A'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 }
      });

      startY = doc.lastAutoTable.finalY + 15;
    }

    if (sales.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text('Sales (invoices)', 14, startY);
      startY += 8;
      doc.autoTable({
        startY: startY,
        head: [['Sale', 'Date', 'Items', 'Total', 'Paid', 'Due', 'Status']],
        body: sales.map((s) => [
          `S-${s.id}`,
          s.sale_date ? formatDate(s.sale_date) : s.created_at ? formatDate(s.created_at) : 'N/A',
          s.item_count != null ? `${s.item_count} items` : 'N/A',
          (parseFloat(s.net_amount ?? s.total_amount) || 0).toFixed(2),
          (parseFloat(s.total_paid) || 0).toFixed(2),
          Math.max(0, parseFloat(s.due) || 0).toFixed(2),
          s.status || 'N/A',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 8 },
      });
      startY = doc.lastAutoTable.finalY + 15;
    }

    if (directSales.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text('Direct sales', 14, startY);
      startY += 8;
      doc.autoTable({
        startY: startY,
        head: [['Direct sale', 'Date', 'Items', 'Total', 'Paid', 'Due', 'Status']],
        body: directSales.map((d) => [
          `DS-${d.id}`,
          d.sale_date ? formatDate(d.sale_date) : d.created_at ? formatDate(d.created_at) : 'N/A',
          d.item_count != null ? `${d.item_count} items` : 'N/A',
          (parseFloat(d.net_amount ?? d.total_amount) || 0).toFixed(2),
          (parseFloat(d.total_paid) || 0).toFixed(2),
          Math.max(0, parseFloat(d.due) || 0).toFixed(2),
          d.status || 'N/A',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11] },
        styles: { fontSize: 8 },
      });
      startY = doc.lastAutoTable.finalY + 15;
    }

    // Payments Table
    if (payments.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text('Payment History', 14, startY);
      startY += 8;

      doc.autoTable({
        startY: startY,
        head: [['Date', 'Amount (AFN)', 'Method', 'Reference']],
        body: payments.map(payment => [
          payment.payment_date ? formatDate(payment.payment_date) : 'N/A',
          (parseFloat(payment.amount_paid || payment.amount) || 0).toFixed(2),
          payment.payment_method || 'N/A',
          payment.reference || '-'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
        styles: { fontSize: 9 }
      });
      startY = doc.lastAutoTable.finalY + 15;
    }

    const allExtraPayments = [
      ...salePayments.map((p) => ({
        ...p,
        _kind: 'Sale payment',
        _ref: p.sale_id ?? p.sale,
      })),
      ...directSalePayments.map((p) => ({
        ...p,
        _kind: 'Direct sale payment',
        _ref: p.direct_sale_id ?? p.direct_sale,
      })),
    ];
    if (allExtraPayments.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text('Sale payments', 14, startY);
      startY += 8;
      doc.autoTable({
        startY: startY,
        head: [['Kind', 'Toward', 'Date', 'Amount (AFN)', 'Method']],
        body: allExtraPayments.map((p) => [
          p._kind,
          typeof p._ref === 'object' && p._ref?.id != null ? `#${p._ref.id}` : String(p._ref ?? '—'),
          p.payment_date ? formatDate(p.payment_date) : 'N/A',
          (parseFloat(p.amount_paid || p.amount) || 0).toFixed(2),
          p.payment_method || 'N/A',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241] },
        styles: { fontSize: 8 },
      });
    }

    doc.save(`Customer_${customer.name}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('Error generating customer PDF:', error);
    alert(`Failed to generate PDF: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Export supplier details to PDF
 */
export const exportSupplierToPDF = (supplier, purchases, payments) => {
  try {
    const doc = new jsPDF();
    
    if (typeof doc.autoTable !== 'function') {
      throw new Error('PDF table plugin not loaded. Please refresh the page.');
    }
    const pageWidth = doc.internal.pageSize.getWidth();
    let startY = 20;

    // Title
    doc.setFontSize(18);
    doc.setTextColor(31, 41, 55);
    doc.text('Supplier Details Report', pageWidth / 2, startY, { align: 'center' });
    startY += 10;

    doc.setFontSize(12);
    doc.setTextColor(75, 85, 99);
    doc.text(`Report Date: ${formatDate(new Date())}`, pageWidth - 20, startY, { align: 'right' });
    startY += 10;

    // Supplier Information
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text('Supplier Information', 14, startY);
    startY += 8;

    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    const supplierInfo = [
      [`Name:`, supplier.name || 'N/A'],
      [`Contact Person:`, supplier.contact_person || 'N/A'],
      [`Phone:`, supplier.phone || 'N/A'],
      [`Email:`, supplier.email || 'N/A'],
      [`Address:`, supplier.address || 'N/A'],
      [`Balance:`, `AFN ${(parseFloat(supplier.calculated_balance || supplier.balance || 0)).toFixed(2)}`]
    ];

    supplierInfo.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, startY);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 50, startY);
      startY += 6;
    });

    startY += 5;

    // Summary
    const totalPurchases = purchases.reduce((sum, p) => sum + (parseFloat(p.cost) || 0), 0);
    const totalPaid = purchases.reduce((sum, p) => sum + (parseFloat(p.total_paid) || 0), 0);
    const totalDue = purchases.reduce((sum, p) => sum + (parseFloat(p.remaining_amount) || 0), 0);

    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text('Financial Summary', 14, startY);
    startY += 8;

    doc.autoTable({
      startY: startY,
      head: [['Metric', 'Amount (AFN)']],
      body: [
        ['Total Purchases', totalPurchases.toFixed(2)],
        ['Total Paid', totalPaid.toFixed(2)],
        ['Total Due', totalDue.toFixed(2)]
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 }
    });

    startY = doc.lastAutoTable.finalY + 15;

    // Purchases Table
    if (purchases.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text('Purchase History', 14, startY);
      startY += 8;

      doc.autoTable({
        startY: startY,
        head: [['Bill #', 'Date', 'Item', 'Quantity', 'Cost', 'Paid', 'Due', 'Status']],
        body: purchases.map(purchase => [
          purchase.bill_number || purchase.id || 'N/A',
          purchase.purchase_date ? formatDate(purchase.purchase_date) : 'N/A',
          purchase.item_name || 'N/A',
          purchase.quantity || 'N/A',
          (parseFloat(purchase.cost) || 0).toFixed(2),
          (parseFloat(purchase.total_paid) || 0).toFixed(2),
          (parseFloat(purchase.remaining_amount) || 0).toFixed(2),
          purchase.payment_status || 'N/A'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 7 }
      });

      startY = doc.lastAutoTable.finalY + 15;
    }

    // Payments Table
    if (payments && payments.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text('Payment History', 14, startY);
      startY += 8;

      doc.autoTable({
        startY: startY,
        head: [['Date', 'Amount (AFN)', 'Method', 'Reference']],
        body: payments.map(payment => [
          payment.payment_date ? formatDate(payment.payment_date) : 'N/A',
          (parseFloat(payment.amount) || 0).toFixed(2),
          payment.payment_method || 'N/A',
          payment.reference || '-'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
        styles: { fontSize: 9 }
      });
    }

    doc.save(`Supplier_${supplier.name}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('Error generating supplier PDF:', error);
    alert(`Failed to generate PDF: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Export employee details to PDF
 */
export const exportEmployeeToPDF = (employee, advances, salaryPayments, loans) => {
  try {
    const doc = new jsPDF();
    
    if (typeof doc.autoTable !== 'function') {
      throw new Error('PDF table plugin not loaded. Please refresh the page.');
    }
    const pageWidth = doc.internal.pageSize.getWidth();
    let startY = 20;

    // Title
    doc.setFontSize(18);
    doc.setTextColor(31, 41, 55);
    doc.text('Employee Details Report', pageWidth / 2, startY, { align: 'center' });
    startY += 10;

    doc.setFontSize(12);
    doc.setTextColor(75, 85, 99);
    doc.text(`Report Date: ${formatDate(new Date())}`, pageWidth - 20, startY, { align: 'right' });
    startY += 10;

    // Employee Information
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text('Employee Information', 14, startY);
    startY += 8;

    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    const employeeInfo = [
      [`Name:`, employee.name || 'N/A'],
      [`Father Name:`, employee.father_name || 'N/A'],
      [`NID:`, employee.nid || 'N/A'],
      [`Phone:`, employee.phone || 'N/A'],
      [`Address:`, employee.address || 'N/A'],
      [`Monthly Salary:`, `AFN ${(parseFloat(employee.salary) || 0).toFixed(2)}`],
      [`Join Date:`, employee.join_date ? formatDate(employee.join_date) : 'N/A'],
      [`Status:`, employee.is_active ? 'Active' : 'Inactive']
    ];

    employeeInfo.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, startY);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 50, startY);
      startY += 6;
    });

    startY += 5;

    // Financial Summary
    const totalAdvances = advances.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
    const pendingAdvances = advances.filter(a => !a.is_deducted).reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
    const totalSalaryPaid = salaryPayments.reduce((sum, s) => sum + (parseFloat(s.net_paid) || 0), 0);
    const totalAdvanceDeducted = salaryPayments.reduce((sum, s) => sum + (parseFloat(s.advance_deducted) || 0), 0);
    const totalLoans = loans.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);

    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text('Financial Summary', 14, startY);
    startY += 8;

    doc.autoTable({
      startY: startY,
      head: [['Metric', 'Amount (AFN)']],
      body: [
        ['Monthly Salary', (parseFloat(employee.salary) || 0).toFixed(2)],
        ['Pending Advances', pendingAdvances.toFixed(2)],
        ['Net Salary', (parseFloat(employee.net_salary) || parseFloat(employee.salary) - pendingAdvances).toFixed(2)],
        ['Total Advances', totalAdvances.toFixed(2)],
        ['Total Salary Paid', totalSalaryPaid.toFixed(2)],
        ['Total Advances Deducted', totalAdvanceDeducted.toFixed(2)],
        ['Total Loans', totalLoans.toFixed(2)]
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 }
    });

    startY = doc.lastAutoTable.finalY + 15;

    // Advances Table
    if (advances.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text('Advances', 14, startY);
      startY += 8;

      doc.autoTable({
        startY: startY,
        head: [['Date', 'Amount (AFN)', 'Status', 'Deduction Date', 'Return Plan']],
        body: advances.map(advance => [
          advance.date_given ? formatDate(advance.date_given) : 'N/A',
          (parseFloat(advance.amount) || 0).toFixed(2),
          advance.is_deducted ? 'Deducted' : 'Pending',
          advance.deduction_date ? formatDate(advance.deduction_date) : '-',
          (advance.return_plan || '').substring(0, 40) || '-'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [251, 191, 36] },
        styles: { fontSize: 8 }
      });

      startY = doc.lastAutoTable.finalY + 15;
    }

    // Salary Payments Table
    if (salaryPayments.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text('Salary Payments', 14, startY);
      startY += 8;

      doc.autoTable({
        startY: startY,
        head: [['Month', 'Base Salary', 'Advance Deducted', 'Net Paid', 'Payment Date']],
        body: salaryPayments.map(payment => [
          payment.month ? formatMonthYear(payment.month) : 'N/A',
          (parseFloat(payment.base_salary) || 0).toFixed(2),
          (parseFloat(payment.advance_deducted) || 0).toFixed(2),
          (parseFloat(payment.net_paid) || 0).toFixed(2),
          payment.payment_date ? formatDate(payment.payment_date) : 'N/A'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
        styles: { fontSize: 9 }
      });

      startY = doc.lastAutoTable.finalY + 15;
    }

    // Loans Table
    if (loans.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text('Loans', 14, startY);
      startY += 8;

      doc.autoTable({
        startY: startY,
        head: [['Date', 'Amount (AFN)', 'Paid', 'Remaining', 'Interest Rate', 'Status']],
        body: loans.map(loan => {
          const remaining = parseFloat(loan.remaining_amount || (loan.amount - (loan.amount_paid || 0))) || 0;
          return [
            loan.loan_date ? formatDate(loan.loan_date) : 'N/A',
            (parseFloat(loan.amount) || 0).toFixed(2),
            (parseFloat(loan.amount_paid) || 0).toFixed(2),
            remaining.toFixed(2),
            loan.interest_rate ? `${loan.interest_rate}%` : '0%',
            loan.status || 'Active'
          ];
        }),
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] },
        styles: { fontSize: 8 }
      });
    }

    doc.save(`Employee_${employee.name}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('Error generating employee PDF:', error);
    alert(`Failed to generate PDF: ${error.message || 'Unknown error'}`);
  }
};
