import { Navigate, Route, Routes } from 'react-router-dom';
import { DriverLoginPage } from './pages/DriverLoginPage';
import { DriverDashboardPage } from './pages/DriverDashboardPage';
import { useDriverAuth } from './context/DriverAuthContext';

const ProtectedDriverRoute = () => {
  const { user, isDriver, loading } = useDriverAuth();
  if (loading) return <div className="splash">جارٍ التحقق من الحساب...</div>;
  if (!user || !isDriver) return <Navigate to="/login" replace />;
  return <DriverDashboardPage />;
};

export default function App() {
  return <Routes><Route path="/login" element={<DriverLoginPage />} /><Route path="/dashboard" element={<ProtectedDriverRoute />} /><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes>;
}
