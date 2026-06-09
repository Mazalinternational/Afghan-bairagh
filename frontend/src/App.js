import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/dashboard/Dashboard';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import OrdersList from './pages/orders/OrdersList';
import CreateOrder from './pages/orders/CreateOrder';
import OrderDetails from './pages/orders/OrderDetails';
import OrderQuotation from './pages/orders/OrderQuotation';
import CustomersList from './pages/customers/CustomersList';
import CustomerDetails from './pages/customers/CustomerDetails';
import CustomerForm from './pages/customers/CustomerForm';
import CustomerLedger from './pages/customers/CustomerLedger';
import EmployeesList from './pages/employees/EmployeesList';
import EmployeeForm from './pages/employees/EmployeeForm';
import EmployeeDetails from './pages/employees/EmployeeDetails';
import EmployeeAdvance from './pages/employees/EmployeeAdvance';
import InventoryList from './pages/inventory/InventoryList';
import InventoryForm from './pages/inventory/InventoryForm';
import InventoryDetails from './pages/inventory/InventoryDetails';
import PurchaseList from './pages/purchases/PurchaseList';
import PurchaseForm from './pages/purchases/PurchaseForm';
import PurchaseDetails from './pages/purchases/PurchaseDetails';
import SupplierList from './pages/suppliers/SupplierList';
import SupplierForm from './pages/suppliers/SupplierForm';
import SupplierLedger from './pages/suppliers/SupplierLedger';
import ExpenseList from './pages/expenses/ExpenseList';
import ExpenseForm from './pages/expenses/ExpenseForm';
import ExpenseDetails from './pages/expenses/ExpenseDetails';
import RozNamchaList from './pages/roznamcha/RozNamchaList';
import RozNamchaForm from './pages/roznamcha/RozNamchaForm';
import RozNamchaDetails from './pages/roznamcha/RozNamchaDetails';
import Reports from './pages/reports/Reports';
import RecordLookup from './pages/reports/RecordLookup';
import SalesList from './pages/sales/SalesList';
import CreateSale from './pages/sales/CreateSale';
import SaleDetails from './pages/sales/SaleDetails';
import EditSale from './pages/sales/EditSale';
import DirectSalesList from './pages/sales/DirectSalesList';
import CreateDirectSale from './pages/sales/CreateDirectSale';
import DirectSaleDetails from './pages/sales/DirectSaleDetails';
import Settings from './pages/settings/Settings';
import UserManagement from './pages/users/UserManagement';
import QuotationsList from './pages/quotations/QuotationsList';
import CreateQuotation from './pages/quotations/CreateQuotation';
import QuotationDetails from './pages/quotations/QuotationDetails';
import RentList from './pages/rent/RentList';
import RentForm from './pages/rent/RentForm';
import RentDetails from './pages/rent/RentDetails';
import PrintingPressPage from './pages/printing/PrintingPressPage';
import PrintingRecordDetails from './pages/printing/PrintingRecordDetails';
import PrintingFormPage from './pages/printing/PrintingFormPage';
import BankPage from './pages/bank/BankPage';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { DarkModeProvider } from './context/DarkModeContext';
import { LanguageProvider } from './context/LanguageContext';
import { SettingsProvider } from './context/SettingsContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import PublicRoute from './components/common/PublicRoute';

function PrivateRoute({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <DarkModeProvider>
          <LanguageProvider>
            <SettingsProvider>
            <Router>
              <div className="App">
            <Routes>
              <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/orders" element={<PrivateRoute><OrdersList /></PrivateRoute>} />
              <Route path="/orders/create" element={<PrivateRoute><CreateOrder /></PrivateRoute>} />
              <Route path="/orders/:id" element={<PrivateRoute><OrderDetails /></PrivateRoute>} />
              <Route path="/orders/:id/edit" element={<PrivateRoute><CreateOrder /></PrivateRoute>} />
              <Route path="/orders/:id/quotation" element={<PrivateRoute><OrderQuotation /></PrivateRoute>} />
              <Route path="/customers" element={<PrivateRoute><CustomersList /></PrivateRoute>} />
              <Route path="/customers/create" element={<PrivateRoute><CustomerForm /></PrivateRoute>} />
              <Route path="/customers/:id" element={<PrivateRoute><CustomerDetails /></PrivateRoute>} />
              <Route path="/customers/:id/edit" element={<PrivateRoute><CustomerForm /></PrivateRoute>} />
              <Route path="/customers/:id/ledger" element={<PrivateRoute><CustomerLedger /></PrivateRoute>} />
              <Route path="/employees" element={<PrivateRoute><EmployeesList /></PrivateRoute>} />
              <Route path="/employees/create" element={<PrivateRoute><EmployeeForm /></PrivateRoute>} />
              <Route path="/employees/:id/edit" element={<PrivateRoute><EmployeeForm /></PrivateRoute>} />
              <Route path="/employees/:id" element={<PrivateRoute><EmployeeDetails /></PrivateRoute>} />
              <Route path="/employees/advance" element={<PrivateRoute><EmployeeAdvance /></PrivateRoute>} />
              <Route path="/inventory" element={<PrivateRoute><InventoryList /></PrivateRoute>} />
              <Route path="/inventory/create" element={<PrivateRoute><InventoryForm /></PrivateRoute>} />
              <Route path="/inventory/:id" element={<PrivateRoute><InventoryDetails /></PrivateRoute>} />
              <Route path="/inventory/:id/edit" element={<PrivateRoute><InventoryForm /></PrivateRoute>} />
              <Route path="/purchases" element={<PrivateRoute><PurchaseList /></PrivateRoute>} />
              <Route path="/purchases/create" element={<PrivateRoute><PurchaseForm /></PrivateRoute>} />
              <Route path="/purchases/:id" element={<PrivateRoute><PurchaseDetails /></PrivateRoute>} />
              <Route path="/purchases/:id/edit" element={<PrivateRoute><PurchaseForm /></PrivateRoute>} />
              <Route path="/suppliers" element={<PrivateRoute><SupplierList /></PrivateRoute>} />
              <Route path="/suppliers/create" element={<PrivateRoute><SupplierForm /></PrivateRoute>} />
              <Route path="/suppliers/:id/edit" element={<PrivateRoute><SupplierForm /></PrivateRoute>} />
              <Route path="/suppliers/:id/ledger" element={<PrivateRoute><SupplierLedger /></PrivateRoute>} />
              <Route path="/expenses" element={<PrivateRoute><ExpenseList /></PrivateRoute>} />
              <Route path="/expenses/new" element={<PrivateRoute><ExpenseForm /></PrivateRoute>} />
              <Route path="/expenses/:id" element={<PrivateRoute><ExpenseDetails /></PrivateRoute>} />
              <Route path="/expenses/:id/edit" element={<PrivateRoute><ExpenseForm /></PrivateRoute>} />
              <Route path="/roznamcha" element={<PrivateRoute><RozNamchaList /></PrivateRoute>} />
              <Route path="/roznamcha/create" element={<PrivateRoute><RozNamchaForm /></PrivateRoute>} />
              <Route path="/roznamcha/:id" element={<PrivateRoute><RozNamchaDetails /></PrivateRoute>} />
              <Route path="/roznamcha/:id/edit" element={<PrivateRoute><RozNamchaForm /></PrivateRoute>} />
              <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
              <Route path="/records/search" element={<PrivateRoute><RecordLookup /></PrivateRoute>} />
              <Route path="/sales" element={<PrivateRoute><SalesList /></PrivateRoute>} />
              <Route path="/sales/create" element={<PrivateRoute><CreateSale /></PrivateRoute>} />
              <Route path="/sales/:id" element={<PrivateRoute><SaleDetails /></PrivateRoute>} />
              <Route path="/sales/:id/edit" element={<PrivateRoute><EditSale /></PrivateRoute>} />
              <Route path="/sales/direct" element={<PrivateRoute><DirectSalesList /></PrivateRoute>} />
              <Route path="/sales/direct/create" element={<PrivateRoute><CreateDirectSale /></PrivateRoute>} />
              <Route path="/sales/direct/:id" element={<PrivateRoute><DirectSaleDetails /></PrivateRoute>} />
              <Route path="/sales/direct/:id/edit" element={<PrivateRoute><CreateDirectSale /></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
              <Route path="/users" element={<PrivateRoute><UserManagement /></PrivateRoute>} />
              <Route path="/rent" element={<PrivateRoute><RentList /></PrivateRoute>} />
              <Route path="/rent/create" element={<PrivateRoute><RentForm /></PrivateRoute>} />
              <Route path="/rent/:id" element={<PrivateRoute><RentDetails /></PrivateRoute>} />
              <Route path="/rent/:id/edit" element={<PrivateRoute><RentForm /></PrivateRoute>} />
              <Route path="/printing" element={<PrivateRoute><PrintingPressPage /></PrivateRoute>} />
              <Route path="/printing/create" element={<PrivateRoute><PrintingFormPage /></PrivateRoute>} />
              <Route path="/printing/:id/edit" element={<PrivateRoute><PrintingFormPage /></PrivateRoute>} />
              <Route path="/printing/:id" element={<PrivateRoute><PrintingRecordDetails /></PrivateRoute>} />
              <Route path="/bank" element={<PrivateRoute><BankPage /></PrivateRoute>} />
              <Route path="/quotations" element={<PrivateRoute><QuotationsList /></PrivateRoute>} />
              <Route path="/quotations/create" element={<PrivateRoute><CreateQuotation /></PrivateRoute>} />
              <Route path="/quotations/:id" element={<PrivateRoute><QuotationDetails /></PrivateRoute>} />
              <Route path="/quotations/:id/edit" element={<PrivateRoute><CreateQuotation /></PrivateRoute>} />
            </Routes>
          </div>
        </Router>
            </SettingsProvider>
          </LanguageProvider>
        </DarkModeProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
