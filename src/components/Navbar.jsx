import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, LogOut, User, Shield, Building2 } from 'lucide-react';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout, isAdmin } = useAuth();

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={onToggleSidebar}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', padding: '0.5rem' }}
          title="Mở menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary)' }}>
            HỆ THỐNG ĐIỀU HÀNH THACO AUTO
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Khu vực Hải Phòng &amp; Các chi nhánh
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ textAlign: 'right', display: 'none', minWidth: '180px' }} className="user-desktop-info">
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.full_name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'flex-end', marginTop: '2px' }}>
            {isAdmin ? (
              <span className="badge badge-admin">
                <Shield size={12} /> Quản trị viên (Toàn quyền)
              </span>
            ) : (
              <span className="badge badge-staff">
                <Building2 size={12} /> {user?.assigned_orgs?.length || 0} Đơn vị phụ trách
              </span>
            )}
          </div>
        </div>

        <button
          onClick={logout}
          className="btn btn-secondary btn-sm"
          title="Đăng xuất"
          style={{ gap: '0.35rem' }}
        >
          <LogOut size={16} />
          <span>Đăng xuất</span>
        </button>
      </div>

      <style>{`
        @media (min-width: 640px) {
          .user-desktop-info {
            display: block !important;
          }
        }
      `}</style>
    </header>
  );
}
