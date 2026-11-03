import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Modal from '../components/Modal';
import {
  Tv,
  Plus,
  ExternalLink,
  Edit2,
  Trash2,
  Copy,
  Building2,
  Check,
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const DEFAULT_SCREEN = {
  slug: '',
  name: '',
  organization_id: '',
  sheet_url: '',
  sheet_name: 'LichHen',
  mode: 'auto',
  page_size: 6,
  min_row_h: 70,
  interval_sec: 10,
  refresh_sec: 60,
  anim: 'slide',
  date_mode: 'today',
  fixed_date: '',
  sort_time: true,
  title: 'KHÁCH HÀNG ĐẶT LỊCH HẸN',
  date_label: 'NGÀY:',
  logo: '',
  title_font_size: 48,
  date_font_size: 31,
  data_font_size: 24,
  color_head: '#4472c4',
  color1: '#cfd5ea',
  color2: '#e9ebf5',
  color_text: '#00529c',
  color_title: '#ff0000',
  empty_message: 'Hôm nay chưa có lịch hẹn',
  load_error_message: 'Không thể tải dữ liệu từ Google Sheet'
};

export default function Screens() {
  const { isAdmin } = useAuth();
  const [screens, setScreens] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState('');
  const [error, setError] = useState('');

  // Pagination, Search, Sorting State
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('id');
  const [order, setOrder] = useState('desc');
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScreen, setEditingScreen] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_SCREEN);
  const [submitting, setSubmitting] = useState(false);

  const fetchScreensAndOrgs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: search.trim(),
        sortBy,
        order
      });

      const [screensRes, orgsRes] = await Promise.all([
        api.get(`/screens?${queryParams.toString()}`),
        api.get('/orgs?limit=100')
      ]);

      setScreens(screensRes.data || []);
      setPagination(screensRes.pagination || { total: 0, totalPages: 1 });
      setOrganizations(orgsRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreensAndOrgs();
  }, [page, limit, sortBy, order]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchScreensAndOrgs();
  };

  const handleOpenAdd = () => {
    setEditingScreen(null);
    setFormData({
      ...DEFAULT_SCREEN,
      organization_id: organizations.length > 0 ? organizations[0].id : ''
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sc) => {
    setEditingScreen(sc);
    setFormData({
      ...DEFAULT_SCREEN,
      ...sc,
      organization_id: sc.organization_id || ''
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleCopyLink = (slug) => {
    const url = `${window.location.origin}/display/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(''), 2500);
  };

  const handleDelete = async (slug, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa màn hình "${name}"?`)) return;
    try {
      await api.delete(`/screens/${slug}`);
      fetchScreensAndOrgs();
    } catch (err) {
      alert(err.message || 'Lỗi khi xóa màn hình');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (editingScreen) {
        await api.put(`/screens/${editingScreen.slug}`, formData);
      } else {
        await api.post('/screens', formData);
      }
      setIsModalOpen(false);
      fetchScreensAndOrgs();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
            Quản Lý Màn Hình Đặt Hẹn Dịch Vụ (TV Display)
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Hệ thống hiển thị lịch hẹn tự động từ Google Sheet tại khu vực tiếp nhận dịch vụ
          </p>
        </div>

        <button onClick={handleOpenAdd} className="btn btn-primary">
          <Plus size={18} />
          <span>Thêm Màn Hình Mới</span>
        </button>
      </div>

      {/* Search & Sort Controls */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Tìm theo tên màn hình, slug, sheet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>Sắp xếp:</label>
            <select
              className="form-select"
              value={`${sortBy}_${order}`}
              onChange={(e) => {
                const [sb, ord] = e.target.value.split('_');
                setSortBy(sb);
                setOrder(ord);
                setPage(1);
              }}
              style={{ width: '180px' }}
            >
              <option value="id_desc">Mới tạo nhất</option>
              <option value="id_asc">Cũ nhất</option>
              <option value="name_asc">Tên màn hình (A → Z)</option>
              <option value="name_desc">Tên màn hình (Z → A)</option>
              <option value="slug_asc">Đường dẫn slug (A → Z)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>Hiển thị:</label>
            <select
              className="form-select"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              style={{ width: '90px' }}
            >
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
            </select>
          </div>

          <button type="submit" className="btn btn-secondary">
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Grid of Screens */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Đang tải cấu hình màn hình...</div>
      ) : screens.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Tv size={48} style={{ margin: '0 auto 1rem', color: '#cbd5e1' }} />
          <h3 style={{ fontSize: '1.1rem', color: '#475569', marginBottom: '0.5rem' }}>
            Chưa có màn hình nào được cài đặt
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            Nhấp "Thêm Màn Hình Mới" để tạo màn hình hiển thị lịch hẹn showroom.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
          {screens.map((sc) => {
            const displayUrl = `${window.location.origin}/display/${sc.slug}`;
            return (
              <div key={sc.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="badge badge-staff">
                    <Building2 size={12} /> {sc.organization_name || 'Chung'}
                  </span>
                  <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                    Tab: {sc.sheet_name || sc.sheetName}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.35rem' }}>
                  {sc.name}
                </h3>

                <a
                  href={`/display/${sc.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '0.75rem' }}
                >
                  <span>/{sc.slug}</span>
                  <ExternalLink size={13} />
                </a>

                <div style={{
                  fontSize: '0.8rem',
                  color: '#64748b',
                  background: '#f8fafc',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  wordBreak: 'break-all'
                }}>
                  {sc.sheet_url || sc.sheetUrl ? (sc.sheet_url || sc.sheetUrl).slice(0, 70) + '...' : 'Chưa có link Google Sheet'}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                  <a
                    href={`/display/${sc.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ gap: '0.35rem' }}
                  >
                    <Tv size={14} />
                    <span>Mở TV</span>
                  </a>

                  <button
                    onClick={() => handleCopyLink(sc.slug)}
                    className="btn btn-secondary btn-sm"
                    style={{ gap: '0.35rem' }}
                  >
                    {copiedSlug === sc.slug ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                    <span>{copiedSlug === sc.slug ? 'Đã sao chép' : 'Copy link'}</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(sc)}
                    className="btn btn-secondary btn-sm"
                  >
                    <Edit2 size={14} />
                    <span>Sửa</span>
                  </button>

                  <button
                    onClick={() => handleDelete(sc.slug, sc.name)}
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#dc2626', marginLeft: 'auto' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Hiển thị <strong>{screens.length}</strong> / <strong>{pagination.total}</strong> màn hình (Trang {page}/{pagination.totalPages})
          </div>

          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn btn-secondary btn-sm"
            >
              <ChevronLeft size={16} />
              <span>Trước</span>
            </button>

            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-secondary'}`}
                style={{ minWidth: '32px' }}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="btn btn-secondary btn-sm"
            >
              <span>Sau</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Screen Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingScreen ? `Cấu hình Màn hình: ${editingScreen.name}` : 'Thêm Màn Hình Lịch Hẹn'}
        maxWidth="850px"
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: '6px',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Section 1: Thông tin cơ bản */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.35rem', marginBottom: '1rem' }}>
              1. Thông Tin Cơ Bản &amp; Đường Dẫn
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Tên màn hình *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: THACO Hải Phòng 01"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Đường dẫn slug (/...) *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: thaco-hai-phong-01"
                  required
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().trim() })}
                />
                <div className="form-text">Chỉ gồm chữ thường không dấu, số và gạch ngang.</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Đơn vị trực thuộc</label>
              <select
                className="form-select"
                value={formData.organization_id}
                onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
              >
                <option value="">-- Chọn đơn vị sở hữu --</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Section 2: Dữ liệu Google Sheet */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.35rem', margin: '1.25rem 0 1rem' }}>
              2. Kết Nối Google Sheet
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Link Google Sheet</label>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={formData.sheet_url || formData.sheetUrl}
                  onChange={(e) => setFormData({ ...formData, sheet_url: e.target.value, sheetUrl: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tên tab sheet</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="LichHen"
                  value={formData.sheet_name || formData.sheetName}
                  onChange={(e) => setFormData({ ...formData, sheet_name: e.target.value, sheetName: e.target.value })}
                />
              </div>
            </div>

            {/* Section 3: Hiển thị & Cuộn trang */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.35rem', margin: '1.25rem 0 1rem' }}>
              3. Cài Đặt Hiển Thị &amp; Chuyển Trang TV
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Chế độ phân trang</label>
                <select
                  className="form-select"
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                >
                  <option value="auto">Tự động vừa màn hình</option>
                  <option value="fixed">Cố định số dòng</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Số dòng cố định</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={formData.page_size || formData.pageSize}
                  onChange={(e) => setFormData({ ...formData, page_size: Number(e.target.value), pageSize: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Chuyển trang sau (giây)</label>
                <input
                  type="number"
                  min="2"
                  className="form-control"
                  value={formData.interval_sec || formData.interval}
                  onChange={(e) => setFormData({ ...formData, interval_sec: Number(e.target.value), interval: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tải lại sheet (giây)</label>
                <input
                  type="number"
                  min="10"
                  className="form-control"
                  value={formData.refresh_sec || formData.refresh}
                  onChange={(e) => setFormData({ ...formData, refresh_sec: Number(e.target.value), refresh: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Section 4: Màu sắc */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.35rem', margin: '1.25rem 0 1rem' }}>
              4. Bảng Màu Tùy Chỉnh
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.775rem' }}>Đầu bảng</label>
                <input
                  type="color"
                  className="form-control"
                  style={{ height: '40px', padding: '2px' }}
                  value={formData.color_head || formData.colorHead}
                  onChange={(e) => setFormData({ ...formData, color_head: e.target.value, colorHead: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.775rem' }}>Dòng lẻ</label>
                <input
                  type="color"
                  className="form-control"
                  style={{ height: '40px', padding: '2px' }}
                  value={formData.color1}
                  onChange={(e) => setFormData({ ...formData, color1: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.775rem' }}>Dòng chẵn</label>
                <input
                  type="color"
                  className="form-control"
                  style={{ height: '40px', padding: '2px' }}
                  value={formData.color2}
                  onChange={(e) => setFormData({ ...formData, color2: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.775rem' }}>Màu chữ</label>
                <input
                  type="color"
                  className="form-control"
                  style={{ height: '40px', padding: '2px' }}
                  value={formData.color_text || formData.colorText}
                  onChange={(e) => setFormData({ ...formData, color_text: e.target.value, colorText: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.775rem' }}>Tiêu đề</label>
                <input
                  type="color"
                  className="form-control"
                  style={{ height: '40px', padding: '2px' }}
                  value={formData.color_title || formData.colorTitle}
                  onChange={(e) => setFormData({ ...formData, color_title: e.target.value, colorTitle: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Hủy
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Đang lưu...' : (editingScreen ? 'Lưu thay đổi' : 'Tạo màn hình')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
