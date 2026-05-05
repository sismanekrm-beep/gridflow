import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider } from './contexts/AuthContext';

import Login         from './pages/Login';
import Register      from './pages/Register';
import AppShell      from './components/AppShell';
import Dashboard     from './pages/Dashboard';
import Categories    from './pages/Categories';
import Products      from './pages/Products';
import LabelPrep     from './pages/LabelPrep';
import Addresses     from './pages/Addresses';
import AddressLabelPrep from './pages/AddressLabelPrep';
import Designs       from './pages/Designs';
import Settings      from './pages/Settings';
import LabelDesigner from './pages/LabelDesigner';
import AccountManagement from './pages/AccountManagement';

import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Routes>
            {/* Public auth pages */}
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Designer - accessible to all (guest or auth) */}
            <Route path="/label-designer/:formatId" element={<LabelDesigner />} />

            {/* Main app - ALL accessible (guest mode supported) */}
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/label-prep" replace />} />
              <Route path="/dashboard"      element={<Dashboard />} />
              <Route path="/categories"     element={<Categories />} />
              <Route path="/products"       element={<Products />} />
              <Route path="/label-prep"     element={<LabelPrep />} />
              <Route path="/addresses"      element={<Addresses />} />
              <Route path="/address-labels" element={<AddressLabelPrep />} />
              <Route path="/designs"        element={<Designs />} />
              <Route path="/settings"       element={<Settings />} />
              <Route path="/account"        element={<AccountManagement />} />
            </Route>

            <Route path="*" element={<Navigate to="/label-prep" replace />} />
          </Routes>
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  );
}
