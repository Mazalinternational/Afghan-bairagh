import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import LocalizedDateInput from '../../components/common/LocalizedDateInput';
import { formatDate, formatDateLong } from '../../i18n/dateUtils';

const EmployeeAdvance = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeHistory, setEmployeeHistory] = useState(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [advanceData, setAdvanceData] = useState({
    employee_id: '',
    amount: '',
    payment_type: 'advance', // advance, salary, bonus, other
    payment_method: 'Cash',
    reference: '',
    payment_date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/api/employees/');
      setEmployees(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      addToast('Failed to fetch employees', 'error');
    }
  };

  const fetchEmployeeHistory = async (employeeId) => {
    if (!employeeId) return;
    
    setHistoryLoading(true);
    try {
      // Fetch all payments/advances for this employee
      const response = await api.get(`/api/payments/?employee=${employeeId}`);
      const payments = Array.isArray(response.data) ? response.data : response.data.results || [];
      
      // Fetch employee details
      const empResponse = await api.get(`/api/employees/${employeeId}/`);
      const employee = empResponse.data;
      
      // Calculate totals
      const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const advances = payments.filter(p => p.payment_type === 'advance');
      const totalAdvances = advances.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
      
      // Calculate salary paid (if salary payments exist)
      const salaryPayments = payments.filter(p => p.payment_type === 'salary');
      const totalSalaryPaid = salaryPayments.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
      
      // Get join date to calculate total expected salary
      const joinDate = employee.join_date ? new Date(employee.join_date) : new Date();
      const monthsWorked = Math.max(1, Math.floor((new Date() - joinDate) / (1000 * 60 * 60 * 24 * 30)));
      const expectedSalary = (parseFloat(employee.salary) || 0) * monthsWorked;
      
      setEmployeeHistory({
        employee,
        payments: payments.sort((a, b) => new Date(b.payment_date || b.created_at) - new Date(a.payment_date || a.created_at)),
        totals: {
          totalPaid,
          totalAdvances,
          totalSalaryPaid,
          expectedSalary,
          remaining: expectedSalary - totalSalaryPaid
        }
      });
    } catch (error) {
      console.error('Error fetching employee history:', error);
      addToast('Failed to fetch employee history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    setEmployeeSearch(employee.name);
    fetchEmployeeHistory(employee.id);
    setAdvanceData(prev => ({ ...prev, employee_id: employee.id }));
  };

  const handleSubmitAdvance = async (e) => {
    e.preventDefault();
    
    if (!advanceData.employee_id || !advanceData.amount || parseFloat(advanceData.amount) <= 0) {
      addToast('Please select an employee and enter a valid amount', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/payments/', {
        employee: advanceData.employee_id,
        amount: parseFloat(advanceData.amount),
        payment_type: advanceData.payment_type,
        payment_method: advanceData.payment_method,
        reference: advanceData.reference,
        payment_date: advanceData.payment_date
      });
      
      addToast('Payment recorded successfully', 'success');
      setShowAdvanceForm(false);
      setAdvanceData({
        employee_id: selectedEmployee?.id || '',
        amount: '',
        payment_type: 'advance',
        payment_method: 'Cash',
        reference: '',
        payment_date: new Date().toISOString().split('T')[0]
      });
      
      if (selectedEmployee) {
        fetchEmployeeHistory(selectedEmployee.id);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      addToast('Failed to record payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.id?.toString().includes(employeeSearch) ||
    emp.nid?.includes(employeeSearch)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 dark:bg-gray-900 p-4 rounded-lg shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/employees')} className="text-white hover:text-gray-300">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Employee Payment & Advance</h1>
            <p className="text-sm text-gray-300">Record payments and view employee history</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdvanceForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5" />Record Payment
        </button>
      </div>

      {/* Employee Search */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-600">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Search Employee (Name, ID, or NID)
        </label>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={employeeSearch}
            onChange={(e) => {
              setEmployeeSearch(e.target.value);
              if (!e.target.value) {
                setSelectedEmployee(null);
                setEmployeeHistory(null);
              }
            }}
            placeholder="Type employee name, ID, or NID..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Employee Dropdown */}
        {employeeSearch && filteredEmployees.length > 0 && !selectedEmployee && (
          <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredEmployees.map(emp => (
              <button
                key={emp.id}
                type="button"
                onClick={() => handleEmployeeSelect(emp)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              >
                <div className="font-medium text-gray-900 dark:text-white">{emp.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  ID: {emp.id} | NID: {emp.nid || 'N/A'} | Salary: AFN {emp.salary || 0}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Employee History */}
      {selectedEmployee && (
        <div className="space-y-4">
          {/* Summary Cards */}
          {employeeHistory && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative overflow-hidden bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-600 border-l-4 border-blue-500">
                  <div className="absolute -top-6 -right-6 w-20 h-20 bg-blue-700/25 dark:bg-blue-400/20 rounded-full pointer-events-none" />
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Monthly Salary</div>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    AFN {(parseFloat(employeeHistory.employee.salary) || 0).toFixed(2)}
                  </div>
                </div>
                <div className="relative overflow-hidden bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-600 border-l-4 border-green-500">
                  <div className="absolute -top-6 -right-6 w-20 h-20 bg-green-700/25 dark:bg-green-400/20 rounded-full pointer-events-none" />
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Paid</div>
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    AFN {employeeHistory.totals.totalPaid.toFixed(2)}
                  </div>
                </div>
                <div className="relative overflow-hidden bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-600 border-l-4 border-orange-500">
                  <div className="absolute -top-6 -right-6 w-20 h-20 bg-orange-700/25 dark:bg-orange-400/20 rounded-full pointer-events-none" />
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Advances</div>
                  <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                    AFN {employeeHistory.totals.totalAdvances.toFixed(2)}
                  </div>
                </div>
                <div className="relative overflow-hidden bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-600 border-l-4 border-red-500">
                  <div className="absolute -top-6 -right-6 w-20 h-20 bg-red-700/25 dark:bg-red-400/20 rounded-full pointer-events-none" />
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Remaining</div>
                  <div className={`text-xl font-bold ${
                    employeeHistory.totals.remaining >= 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    AFN {Math.abs(employeeHistory.totals.remaining).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Payment History Table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border dark:border-gray-600">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Payment History</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-800 dark:bg-gray-700 text-white dark:text-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium uppercase">Date</th>
                        <th className="px-3 py-2 text-left font-medium uppercase">Type</th>
                        <th className="px-3 py-2 text-left font-medium uppercase">Amount</th>
                        <th className="px-3 py-2 text-left font-medium uppercase">Method</th>
                        <th className="px-3 py-2 text-left font-medium uppercase">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-900 dark:text-gray-300">
                      {historyLoading ? (
                        <tr>
                          <td colSpan="5" className="px-3 py-4 text-center">
                            <div className="flex justify-center">
                              <div className="h-5 w-5 animate-spin border-2 border-blue-600 border-t-transparent rounded-full" />
                            </div>
                          </td>
                        </tr>
                      ) : employeeHistory.payments.length > 0 ? (
                        employeeHistory.payments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-3 py-2">
                              <div>{formatDate(payment.payment_date || payment.created_at)}</div>
                              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                {formatDateLong(payment.payment_date || payment.created_at)}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                payment.payment_type === 'salary' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                payment.payment_type === 'advance' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {payment.payment_type || 'Other'}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-medium">AFN {(parseFloat(payment.amount) || 0).toFixed(2)}</td>
                            <td className="px-3 py-2">{payment.payment_method || 'N/A'}</td>
                            <td className="px-3 py-2">{payment.reference || '-'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                            No payment history found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Payment Form Modal */}
      {showAdvanceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Record Payment</h3>
            <form onSubmit={handleSubmitAdvance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee *</label>
                <select
                  value={advanceData.employee_id}
                  onChange={(e) => setAdvanceData({...advanceData, employee_id: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} (ID: {emp.id}) - Salary: AFN {emp.salary || 0}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Type *</label>
                <select
                  value={advanceData.payment_type}
                  onChange={(e) => setAdvanceData({...advanceData, payment_type: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="advance">Advance</option>
                  <option value="salary">Salary</option>
                  <option value="bonus">Bonus</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={advanceData.amount}
                  onChange={(e) => setAdvanceData({...advanceData, amount: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Date *</label>
                <LocalizedDateInput
                  value={advanceData.payment_date}
                  onChange={(dateValue) => setAdvanceData({...advanceData, payment_date: dateValue})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method *</label>
                <select
                  value={advanceData.payment_method}
                  onChange={(e) => setAdvanceData({...advanceData, payment_method: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Check">Check</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference</label>
                <input
                  type="text"
                  value={advanceData.reference}
                  onChange={(e) => setAdvanceData({...advanceData, reference: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdvanceForm(false);
                    setAdvanceData({
                      employee_id: selectedEmployee?.id || '',
                      amount: '',
                      payment_type: 'advance',
                      payment_method: 'Cash',
                      reference: '',
                      payment_date: new Date().toISOString().split('T')[0]
                    });
                  }}
                  className="btn-form-red flex-1 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-form-green flex-1 text-sm disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeAdvance;
