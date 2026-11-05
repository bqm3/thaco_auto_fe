import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Tv,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  X
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { user, isAdmin } = useAuth();

  return (
    <>
      {isOpen && <div className="mobile-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img
            src="/image/LOGO-THACO-AUTO-white.png"
            alt="THACO AUTO"
            className="sidebar-logo"
            onError={(e) => {
              // Fallback text if image missing
              e.target.style.display = 'none';
            }}
          />
          {/* <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.5px' }}>
            THACO AUTO HP
          </span> */}
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              padding: '4px'
            }}
            className="mobile-close-btn"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-menu">
          <div style={{ fontSize: '0.725rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', padding: '0 0.5rem 0.25rem' }}>
            Menu Chính
          </div>

          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <LayoutDashboard size={19} />
            <span>Tổng quan</span>
          </NavLink>

          <NavLink
            to="/organizations"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <Building2 size={19} />
            <span>Đơn vị / Chi nhánh</span>
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/users"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <Users size={19} />
              <span>Quản lý Nhân sự</span>
            </NavLink>
          )}

          {/* Quản lý bài viết tạm đóng theo yêu cầu */}

          <NavLink
            to="/screens"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <Tv size={19} />
            <span>Màn hình Dịch vụ</span>
          </NavLink>

          {/* <div style={{ fontSize: '0.725rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', padding: '1rem 0.5rem 0.25rem' }}>
            Màn hình Trực tiếp
          </div>

          <a
            href="/display/thaco-hai-phong-01"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-item"
            style={{ color: '#38bdf8' }}
          >
            <ExternalLink size={17} />
            <span>Màn hình HP 01 ↗</span>
          </a>

          <a
            href="/display/thaco-hai-phong-02"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-item"
            style={{ color: '#38bdf8' }}
          >
            <ExternalLink size={17} />
            <span>Màn hình HP 02 ↗</span>
          </a> */}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: isAdmin ? '#b91c1c' : '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}
            >
              {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.full_name}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {isAdmin ? <ShieldCheck size={13} color="#f87171" /> : <UserCheck size={13} color="#38bdf8" />}
                <span>{user?.role_name || user?.role}</span>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media (min-width: 1025px) {
            .mobile-close-btn {
              display: none !important;
            }
          }
        `}</style>
      </aside>
    </>
  );
}
