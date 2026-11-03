import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, KeyRound, User, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  const fillAccount = (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #002752 50%, #004085 100%)',
      padding: '1.5rem',
      position: 'relative'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden'
      }}>
        {/* Top Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #00529c 0%, #003366 100%)',
          padding: '2.5rem 2rem 2rem',
          textAlign: 'center',
          color: '#ffffff'
        }}>
          <img
            src="/image/LOGO-THACO-AUTO-white.png"
            alt="THACO AUTO"
            style={{ height: '42px', marginBottom: '1rem', objectFit: 'contain' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.25rem' }}>
            HỆ THỐNG ĐIỀU HÀNH
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#93c5fd' }}>
            THACO AUTO Khu vực Hải Phòng
          </p>
        </div>

        {/* Login Body */}
        <div style={{ padding: '2rem' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.85rem 1rem',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: '8px',
              fontSize: '0.875rem',
              marginBottom: '1.25rem'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">
                Tên đăng nhập
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="username"
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Nhập username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Mật khẩu
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type="password"
                  className="form-control"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập vào hệ thống'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          {/* Quick Demo Switcher */}
          {/* <div style={{ marginTop: '1.75rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '0.775rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.75rem', textAlign: 'center' }}>
              ⚡ Tài khoản mẫu để kiểm tra nhanh:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => fillAccount('admin', 'admin123')}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'space-between', padding: '0.5rem 0.85rem' }}
              >
                <span style={{ fontWeight: 600 }}>👑 Quản trị viên (Admin)</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>admin / admin123</span>
              </button>
              <button
                type="button"
                onClick={() => fillAccount('nhanvien1', '123456')}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'space-between', padding: '0.5rem 0.85rem' }}
              >
                <span style={{ fontWeight: 600 }}>👤 Nhân viên (HP01 &amp; HP02)</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>nhanvien1 / 123456</span>
              </button>
              <button
                type="button"
                onClick={() => fillAccount('nhanvien2', '123456')}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'space-between', padding: '0.5rem 0.85rem' }}
              >
                <span style={{ fontWeight: 600 }}>👤 Nhân viên (HP03)</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>nhanvien2 / 123456</span>
              </button>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}
