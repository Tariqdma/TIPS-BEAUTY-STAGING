import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './src/components/layout/Header';
import { HomePage } from './src/pages/customer/HomePage';
import { ProductDetailsPage } from './src/pages/customer/ProductDetailsPage';
import { CartPage } from './src/pages/customer/CartPage';
import { CheckoutPage } from './src/pages/customer/CheckoutPage';
import { OrderTrackingPage } from './src/pages/customer/OrderTrackingPage';
import { SettingsPage } from './src/pages/customer/SettingsPage';
import { AIChatPage } from './src/pages/customer/AIChatPage';
import { PaymentProofPage } from './src/pages/customer/PaymentProofPage';
import { LoyaltyPage } from './src/pages/customer/LoyaltyPage';
import { ReturnsPage } from './src/pages/customer/ReturnsPage';
import { useStore } from './src/context/StoreContext';
import { LoginPage } from './src/pages/auth/LoginPage';
import { SignupPage } from './src/pages/auth/SignupPage';
import { useAuth } from './src/context/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

function App() {
  const { cartCount } = useStore(); // Note: Header takes cartCount prop but now we are inside StoreProvider in main.tsx? 
  // Wait, looking at previous App.tsx, StoreProvider wasn't wrapping App inside App.tsx, meaning it's in main.tsx.
  // Let's assume standard context usage.

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 font-sans text-gray-900" dir="rtl">
      <Header cartCount={cartCount} />
      <main>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/product/:id" element={<ProductDetailsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/track-order" element={
            <ProtectedRoute>
              <OrderTrackingPage />
            </ProtectedRoute>
          } />
          <Route path="/payment-proof" element={<ProtectedRoute><PaymentProofPage /></ProtectedRoute>} />
          <Route path="/loyalty" element={<ProtectedRoute><LoyaltyPage /></ProtectedRoute>} />
          <Route path="/returns" element={<ProtectedRoute><ReturnsPage /></ProtectedRoute>} />
          <Route path="/ai-chat" element={<AIChatPage />} />

          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected Routes */}
          <Route path="/checkout" element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />

          <Route path="*" element={<div className="p-10 text-center">الصفحة غير موجودة</div>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
