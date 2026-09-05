import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProductListPage } from './pages/products/ProductListPage';
import { ProductFormPage } from './pages/products/ProductFormPage';
import { OrderListPage } from './pages/orders/OrderListPage';
import { LogisticsPage } from './pages/LogisticsPage';
import { WarehousesPage } from './pages/WarehousesPage';
import { MarketingPage } from './pages/MarketingPage';
import { BIPage } from './pages/BIPage';
import { CategoriesPage } from './pages/CategoriesPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<AdminLoginPage />} />
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />

        {/* Order Management */}
        <Route path="orders" element={<OrderListPage />} />
        <Route path="logistics" element={<LogisticsPage />} />
        <Route path="warehouses" element={<WarehousesPage />} />

        {/* Inventory & Products */}
        <Route path="products" element={<ProductListPage />} />
        <Route path="products/new" element={<ProductFormPage />} />
        <Route path="products/edit/:id" element={<ProductFormPage />} />
        <Route path="categories" element={<CategoriesPage />} />

        {/* Marketing & Insights */}
        <Route path="marketing" element={<MarketingPage />} />
        <Route path="bi" element={<BIPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
