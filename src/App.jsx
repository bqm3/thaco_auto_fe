import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Organizations from './pages/Organizations';
import UsersPage from './pages/Users';
import Posts from './pages/Posts';
import Screens from './pages/Screens';
import DisplayScreen from './pages/DisplayScreen';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        
        {/* Live TV Appointment Board display - public without auth */}
        <Route path="/display/:slug" element={<DisplayScreen />} />
        <Route path="/:slug" element={<DisplayScreen />} />

        {/* Authenticated Admin & Staff Portal */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/organizations" element={<Organizations />} />
          <Route
            path="/users"
            element={
              <ProtectedRoute adminOnly>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          {/* Quản lý bài viết tạm đóng theo yêu cầu */}
          <Route path="/posts" element={<Navigate to="/" replace />} />
          <Route path="/screens" element={<Screens />} />
        </Route>

        {/* Redirects */}
        <Route path="/admin" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
