import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Building2,
  Users,
  Tv,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Phone,
  ArrowRight
} from 'lucide-react';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    orgs: 0,
    users: 0,
    screens: 0
  });
  const [orgsList, setOrgsList] = useState([]);
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [orgsRes, screensRes] = await Promise.all([
          api.get('/orgs?limit=5'),
          api.get('/screens?limit=6')
        ]);

        let userCount = 0;
        if (isAdmin) {
          try {
            const usersRes = await api.get('/users?limit=1');
            userCount = usersRes.pagination?.total || 0;
          } catch (e) {
            console.error('Cannot load users count:', e);
          }
        }

        setStats({
          orgs: orgsRes.pagination?.total || 0,
          users: userCount,
          screens: screensRes.pagination?.total || 0
        });
        setOrgsList(orgsRes.data || []);
        setScreens(screensRes.data || []);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [isAdmin]);

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #004085 0%, #00529c 100%)',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '2rem',
        marginBottom: '2rem',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.15)', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            {isAdmin ? <ShieldCheck size={14} /> : <CheckCircle2 size={14} />}
            <span>{isAdmin ? 'Quản trị viên Hệ thống' : 'Nhân viên Phụ trách Đơn vị'}</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.4rem' }}>
            Xin chào, {user?.full_name}!
          </h1>
          <p style={{ color: '#dbeafe', fontSize: '0.95rem', maxWidth: '600px' }}>
            {isAdmin
              ? 'Toàn quyền quản trị danh mục đơn vị, phân bổ nhân sự, và cấu hình các màn hình đặt hẹn dịch vụ tại showroom.'
              : `Bạn đang được phân quyền quản lý ${user?.assigned_orgs?.length || 0} đơn vị: ${user?.assigned_orgs?.map(o => o.name).join(', ') || 'Chưa gán'}.`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/organizations" className="btn btn-secondary" style={{ background: '#ffffff', color: '#004085', fontWeight: 700 }}>
            <Building2 size={17} />
            <span>Xem Đơn vị</span>
          </Link>
          <Link to="/screens" className="btn btn-secondary" style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.25)' }}>
            <Tv size={17} />
            <span>Cài đặt Màn hình TV</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: isAdmin ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <Building2 size={26} />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stats.orgs}</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
              {isAdmin ? 'Tổng đơn vị / Chi nhánh' : 'Đơn vị bạn phụ trách'}
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <Users size={26} />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stats.users}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                Nhân sự trong hệ thống
              </div>
            </div>
          </div>
        )}

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}>
            <Tv size={26} />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stats.screens}</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
              Màn hình hẹn dịch vụ TV
            </div>
          </div>
        </div>
      </div>

      {/* Two columns: Organizations overview & Screens */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
        {/* Organizations Overview */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 style={{ fontSize: '1.15rem' }}>Chi Nhánh &amp; Đơn Vị Hoạt Động</h2>
              <p style={{ fontSize: '0.825rem', color: '#64748b' }}>Các đơn vị thuộc phạm vi quản lý</p>
            </div>
            <Link to="/organizations" className="btn btn-outline btn-sm">
              Xem tất cả
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {orgsList.map((org) => (
              <div
                key={org.id}
                style={{
                  padding: '1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span className="badge badge-staff" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                      {org.code}
                    </span>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>
                      {org.name}
                    </h3>
                  </div>
                  {org.address && (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} />
                      <span>{org.address}</span>
                    </div>
                  )}
                </div>

                <Link to="/organizations" className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
                  <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Live Appointment Screens */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 style={{ fontSize: '1.15rem' }}>Màn hình Lịch hẹn TV Showroom</h2>
              <p style={{ fontSize: '0.825rem', color: '#64748b' }}>Màn hình hiển thị tự động trên tivi dịch vụ</p>
            </div>
            <Link to="/screens" className="btn btn-outline btn-sm">
              Quản lý
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {screens.map((sc) => (
              <div
                key={sc.id}
                style={{
                  padding: '1.15rem',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.2rem' }}>
                    {sc.name}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', gap: '0.75rem' }}>
                    <span>Tab: <strong>{sc.sheet_name || sc.sheetName}</strong></span>
                    <span>•</span>
                    <span>Tải lại: <strong>{sc.refresh_sec || sc.refresh}s</strong></span>
                  </div>
                </div>

                <a
                  href={`/display/${sc.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm"
                  style={{ gap: '0.4rem' }}
                >
                  <Tv size={15} />
                  <span>Mở bảng TV ↗</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
