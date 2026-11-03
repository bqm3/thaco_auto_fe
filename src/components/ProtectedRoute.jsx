import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#00529c',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Đang tải hệ thống...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', maxWidth: '500px', margin: '3rem auto' }}>
        <h2 style={{ color: '#dc2626', marginBottom: '0.5rem' }}>Quyền Truy Cập Bị Từ Chối</h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
          Bạn không có quyền quản trị viên (Admin) để truy cập chức năng này.
        </p>
        <a href="/" className="btn btn-primary" style={{ display: 'inline-block' }}>
          Quay lại Bảng điều khiển
        </a>
      </div>
    );
  }

  return children;
}
