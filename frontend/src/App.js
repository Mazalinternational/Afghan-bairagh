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
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={
                <Layout>
                  <Dashboard />
                </Layout>
              } />
              <Route path="/orders" element={
                <Layout>
                  <OrdersList />
                </Layout>
              } />
              <Route path="/orders/create" element={
                <Layout>
                  <CreateOrder />
                </Layout>
              } />
              <Route path="/orders/:id" element={
                <Layout>
                  <OrderDetails />
                </Layout>
              } />
              <Route path="/orders/:id/edit" element={
                <Layout>
                  <CreateOrder />
                </Layout>
              } />
              <Route path="/orders/:id/quotation" element={
                <Layout>
                  <OrderQuotation />
                </Layout>
              } />
              <Route path="/customers" element={
                <Layout>
                  <CustomersList />
                </Layout>
              } />
              <Route path="/customers/create" element={
                <Layout>
                  <CustomerForm />
                </Layout>
              } />
              <Route path="/customers/:id" element={
                <Layout>
                  <CustomerDetails />
                </Layout>
              } />
              <Route path="/customers/:id/edit" element={
                <Layout>
                  <CustomerForm />
                </Layout>
              } />
              <Route path="/customers/:id/ledger" element={
                <Layout>
                  <CustomerLedger />
                </Layout>
              } />
              <Route path="/employees" element={
                <Layout>
                  <EmployeesList />
                </Layout>
              } />
              <Route path="/employees/create" element={
                <Layout>
                  <EmployeeForm />
                </Layout>
              } />
              <Route path="/employees/:id/edit" element={
                <Layout>
                  <EmployeeForm />
                </Layout>
              } />
              <Route path="/employees/:id" element={
                <Layout>
                  <EmployeeDetails />
                </Layout>
              } />
              <Route path="/employees/advance" element={
                <Layout>
                  <EmployeeAdvance />
                </Layout>
              } />
              <Route path="/inventory" element={
                <Layout>
                  <InventoryList />
                </Layout>
              } />
              <Route path="/inventory/create" element={
                <Layout>
                  <InventoryForm />
                </Layout>
              } />
              <Route path="/inventory/:id" element={
                <Layout>
                  <InventoryDetails />
                </Layout>
              } />
              <Route path="/inventory/:id/edit" element={
                <Layout>
                  <InventoryForm />
                </Layout>
              } />
              <Route path="/purchases" element={
                <Layout>
                  <PurchaseList />
                </Layout>
              } />
              <Route path="/purchases/create" element={
                <Layout>
                  <PurchaseForm />
                </Layout>
              } />
              <Route path="/purchases/:id" element={
                <Layout>
                  <PurchaseDetails />
                </Layout>
              } />
              <Route path="/purchases/:id/edit" element={
                <Layout>
                  <PurchaseForm />
                </Layout>
              } />
              <Route path="/suppliers" element={
                <Layout>
                  <SupplierList />
                </Layout>
              } />
              <Route path="/suppliers/create" element={
                <Layout>
                  <SupplierForm />
                </Layout>
              } />
              <Route path="/suppliers/:id/edit" element={
                <Layout>
                  <SupplierForm />
                </Layout>
              } />
              <Route path="/suppliers/:id/ledger" element={
                <Layout>
                  <SupplierLedger />
                </Layout>
              } />
              <Route path="/expenses" element={
                <Layout>
                  <ExpenseList />
                </Layout>
              } />
              <Route path="/expenses/new" element={
                <Layout>
                  <ExpenseForm />
                </Layout>
              } />
              <Route path="/expenses/:id" element={
                <Layout>
                  <ExpenseDetails />
                </Layout>
              } />
              <Route path="/expenses/:id/edit" element={
                <Layout>
                  <ExpenseForm />
                </Layout>
              } />
              <Route path="/roznamcha" element={
                <Layout>
                  <RozNamchaList />
                </Layout>
              } />
              <Route path="/roznamcha/create" element={
                <Layout>
                  <RozNamchaForm />
                </Layout>
              } />
              <Route path="/roznamcha/:id" element={
                <Layout>
                  <RozNamchaDetails />
                </Layout>
              } />
              <Route path="/roznamcha/:id/edit" element={
                <Layout>
                  <RozNamchaForm />
                </Layout>
              } />
              <Route path="/reports" element={
                <Layout>
                  <Reports />
                </Layout>
              } />
              <Route path="/records/search" element={
                <Layout>
                  <RecordLookup />
                </Layout>
              } />
              <Route path="/sales" element={
                <Layout>
                  <SalesList />
                </Layout>
              } />
              <Route path="/sales/create" element={
                <Layout>
                  <CreateSale />
                </Layout>
              } />
              <Route path="/sales/:id" element={
                <Layout>
                  <SaleDetails />
                </Layout>
              } />
              <Route path="/sales/:id/edit" element={
                <Layout>
                  <EditSale />
                </Layout>
              } />
              <Route path="/sales/direct" element={
                <Layout>
                  <DirectSalesList />
                </Layout>
              } />
              <Route path="/sales/direct/create" element={
                <Layout>
                  <CreateDirectSale />
                </Layout>
              } />
              <Route path="/sales/direct/:id" element={
                <Layout>
                  <DirectSaleDetails />
                </Layout>
              } />
              <Route path="/sales/direct/:id/edit" element={
                <Layout>
                  <CreateDirectSale />
                </Layout>
              } />
              <Route path="/settings" element={
                <Layout>
                  <Settings />
                </Layout>
              } />
              <Route path="/users" element={
                <Layout>
                  <UserManagement />
                </Layout>
              } />
              <Route path="/rent" element={
                <Layout>
                  <RentList />
                </Layout>
              } />
              <Route path="/rent/create" element={
                <Layout>
                  <RentForm />
                </Layout>
              } />
              <Route path="/rent/:id" element={
                <Layout>
                  <RentDetails />
                </Layout>
              } />
              <Route path="/rent/:id/edit" element={
                <Layout>
                  <RentForm />
                </Layout>
              } />
              <Route path="/printing" element={
                <Layout>
                  <PrintingPressPage />
                </Layout>
              } />
              <Route path="/printing/create" element={
                <Layout>
                  <PrintingFormPage />
                </Layout>
              } />
              <Route path="/printing/:id/edit" element={
                <Layout>
                  <PrintingFormPage />
                </Layout>
              } />
              <Route path="/printing/:id" element={
                <Layout>
                  <PrintingRecordDetails />
                </Layout>
              } />
              <Route path="/bank" element={
                <Layout>
                  <BankPage />
                </Layout>
              } />
              <Route path="/quotations" element={
                <Layout>
                  <QuotationsList />
                </Layout>
              } />
              <Route path="/quotations/create" element={
                <Layout>
                  <CreateQuotation />
                </Layout>
              } />
              <Route path="/quotations/:id" element={
                <Layout>
                  <QuotationDetails />
                </Layout>
              } />
              <Route path="/quotations/:id/edit" element={
                <Layout>
                  <CreateQuotation />
                </Layout>
              } />
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
