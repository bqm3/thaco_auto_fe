import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Modal from '../components/Modal';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Users,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Organizations() {
  const { isAdmin } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination, Search, Sorting State
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('name');
  const [order, setOrder] = useState('asc');
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    phone: '',
    email: '',
    description: '',
    is_active: true
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchOrgs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: search.trim(),
        sortBy,
        order
      });
      const res = await api.get(`/orgs?${queryParams.toString()}`);
      setOrgs(res.data || []);
      setPagination(res.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, [page, limit, sortBy, order]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrgs();
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setOrder('asc');
    }
    setPage(1);
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) return <ArrowUpDown size={14} style={{ color: '#94a3b8', marginLeft: '4px' }} />;
    return order === 'asc'
      ? <ArrowUp size={14} style={{ color: 'var(--primary)', marginLeft: '4px' }} />
      : <ArrowDown size={14} style={{ color: 'var(--primary)', marginLeft: '4px' }} />;
  };

  const handleOpenAdd = () => {
    setEditingOrg(null);
    setFormData({
      code: '',
      name: '',
      address: '',
      phone: '',
      email: '',
      description: '',
      is_active: true
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (org) => {
    setEditingOrg(org);
    setFormData({
      code: org.code,
      name: org.name,
      address: org.address || '',
      phone: org.phone || '',
      email: org.email || '',
      description: org.description || '',
      is_active: org.is_active
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa đơn vị "${name}"?`)) return;
    try {
      await api.delete(`/orgs/${id}`);
      fetchOrgs();
    } catch (err) {
      alert(err.message || 'Lỗi khi xóa đơn vị');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (editingOrg) {
        await api.put(`/orgs/${editingOrg.id}`, formData);
      } else {
        await api.post('/orgs', formData);
      }
      setIsModalOpen(false);
      fetchOrgs();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
            Danh Sách Đơn Vị &amp; Chi Nhánh
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            {isAdmin
              ? 'Quản lý toàn bộ chi nhánh THACO AUTO Hải Phòng & phân công nhân sự quản lý'
              : 'Các đơn vị / chi nhánh bạn được phân công quản lý'}
          </p>
        </div>

        {isAdmin && (
          <button onClick={handleOpenAdd} className="btn btn-primary">
            <Plus size={18} />
            <span>Thêm Đơn Vị Mới</span>
          </button>
        )}
      </div>

      {/* Filter / Search & Sort Controls */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Tìm kiếm theo mã, tên đơn vị, địa chỉ, số điện thoại..."
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
              <option value="name_asc">Tên đơn vị (A → Z)</option>
              <option value="name_desc">Tên đơn vị (Z → A)</option>
              <option value="code_asc">Mã đơn vị (A → Z)</option>
              <option value="code_desc">Mã đơn vị (Z → A)</option>
              <option value="created_at_desc">Mới tạo nhất</option>
              <option value="created_at_asc">Cũ nhất</option>
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
              <option value={5}>5 dòng</option>
              <option value={10}>10 dòng</option>
              <option value={20}>20 dòng</option>
              <option value={50}>50 dòng</option>
            </select>
          </div>

          <button type="submit" className="btn btn-secondary">
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Grid of Organizations */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Đang tải danh sách đơn vị...</div>
      ) : orgs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Building2 size={48} style={{ margin: '0 auto 1rem', color: '#cbd5e1' }} />
          <h3 style={{ fontSize: '1.1rem', color: '#475569', marginBottom: '0.5rem' }}>Không tìm thấy đơn vị nào</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            {search ? 'Thử tìm kiếm với từ khóa khác' : 'Chưa có đơn vị nào trong hệ thống'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {orgs.map((org) => (
            <div key={org.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <span className="badge badge-staff" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                  {org.code}
                </span>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      onClick={() => handleOpenEdit(org)}
                      className="btn btn-secondary btn-sm"
                      title="Chỉnh sửa đơn vị"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(org.id, org.name)}
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#dc2626' }}
                      title="Xóa đơn vị"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.65rem' }}>
                {org.name}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.85rem', color: '#475569', flex: 1, marginBottom: '1.25rem' }}>
                {org.address && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <MapPin size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#64748b' }} />
                    <span>{org.address}</span>
                  </div>
                )}
                {org.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Phone size={16} style={{ flexShrink: 0, color: '#64748b' }} />
                    <span>{org.phone}</span>
                  </div>
                )}
                {org.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={16} style={{ flexShrink: 0, color: '#64748b' }} />
                    <span>{org.email}</span>
                  </div>
                )}
                {org.description && (
                  <p style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.825rem', fontStyle: 'italic' }}>
                    {org.description}
                  </p>
                )}
              </div>

              {/* Metrics & Staff info footer */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginTop: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.825rem', color: '#64748b', marginBottom: '0.65rem' }}>
                  <span>Màn hình TV: <strong>{org.screen_count || 0}</strong></span>
                  <span>Mã: <strong>{org.code}</strong></span>
                </div>

                {org.assigned_staff && org.assigned_staff.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={12} />
                      <span>Nhân sự phụ trách:</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {org.assigned_staff.map((st) => (
                        <span key={st.id} className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                          {st.full_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Hiển thị <strong>{orgs.length}</strong> / <strong>{pagination.total}</strong> đơn vị (Trang {page}/{pagination.totalPages})
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

      {/* Create / Edit Modal (Admin Only) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingOrg ? 'Chỉnh Sửa Đơn Vị' : 'Thêm Đơn Vị Mới'}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Mã đơn vị *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: HP01"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tên đơn vị / Showroom *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: THACO AUTO Hải Phòng - Chi nhánh Lê Hồng Phong"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Địa chỉ</label>
              <input
                type="text"
                className="form-control"
                placeholder="VD: Số 336 Lê Hồng Phong, Hải Phòng"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Điện thoại</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: 0225 3828 111"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="VD: haiphong@thaco.com.vn"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mô tả / Ghi chú</label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Mô tả về đơn vị..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Hủy
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Đang lưu...' : (editingOrg ? 'Lưu thay đổi' : 'Tạo đơn vị')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
