// This file contains the key translation changes needed for EmployeeDetails.js
// Apply these changes to the original file:

// 1. Add import at top:
import { useTranslation } from '../../i18n/fallback';

// 2. Add in component:
const { t } = useTranslation();

// 3. Replace tab labels array (around line 700):
const tabs = [
  { id: 'details', label: t('employees.details'), icon: UserIcon },
  { id: 'advances', label: t('employees.advances'), icon: CurrencyDollarIcon },
  { id: 'salary', label: t('employees.salaryPayments'), icon: CalendarIcon },
  { id: 'loans', label: t('employees.loans'), icon: DocumentTextIcon }
];

// 4. Key text replacements:
// "Monthly Salary" → t('employees.monthlySalary')
// "Balance Owed" → t('employees.balanceOwed')
// "Pending Advances" → t('employees.pendingAdvances')
// "Net Salary" → t('employees.netSalary')
// "Total Loans" → t('employees.totalLoans')
// "Total Tips" → t('employees.totalTips')
// "Active" → t('employees.active')
// "Inactive" → t('employees.inactive')
// "Export PDF" → t('employees.exportPdf')
// "Print" → t('common.print')
// "Edit" → t('common.edit')
// "Personal Information" → t('employees.personalInformation')
// "Employment Information" → t('employees.employmentInformation')
// "Name" → t('common.name')
// "Father Name" → t('employees.fatherName')
// "NID" → t('employees.nid')
// "Phone" → t('common.phone')
// "Address" → t('common.address')
// "Join Date" → t('employees.joinDate')
// "Status" → t('common.status')
// "Add Advance" → t('employees.addAdvance')
// "Advances are automatically deducted..." → t('employees.advancesAutoDeducted')
