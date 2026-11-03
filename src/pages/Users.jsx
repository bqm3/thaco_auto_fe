import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Shield,
  Building2,
  CheckSquare,
  Square,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination, Search, Sorting State
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('id');
  const [order, setOrder] = useState('asc');
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    role_id: '',
    is_active: true,
    org_ids: []
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: search.trim(),
        role: roleFilter,
        sortBy,
        order
      });

      const [usersRes, rolesData, orgsRes] = await Promise.all([
        api.get(`/users?${queryParams.toString()}`),
        api.get('/users/roles'),
        api.get('/orgs?limit=100') // for assignment dropdown
      ]);

      setUsers(usersRes.data || []);
      setPagination(usersRes.pagination || { total: 0, totalPages: 1 });
      setRoles(rolesData);
      setOrganizations(orgsRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, limit, roleFilter, sortBy, order]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
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
    if (sortBy !== field) return <ArrowUpDown size={13} style={{ color: '#94a3b8', marginLeft: '4px' }} />;
    return order === 'asc'
      ? <ArrowUp size={13} style={{ color: 'var(--primary)', marginLeft: '4px' }} />
      : <ArrowDown size={13} style={{ color: 'var(--primary)', marginLeft: '4px' }} />;
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    const staffRole = roles.find(r => r.code === 'STAFF') || roles[0];
    setFormData({
      username: '',
      password: '',
      full_name: '',
      email: '',
      phone: '',
      role_id: staffRole ? staffRole.id : '',
      is_active: true,
      org_ids: []
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    const assignedIds = (u.assigned_orgs || []).map(o => o.id);
    setFormData({
      username: u.username,
      password: '',
      full_name: u.full_name,
      email: u.email || '',
      phone: u.phone || '',
      role_id: u.role_id,
      is_active: u.is_active,
      org_ids: assignedIds
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleToggleOrg = (orgId) => {
    setFormData(prev => {
      const exists = prev.org_ids.includes(orgId);
      const newOrgs = exists
        ? prev.org_ids.filter(id => id !== orgId)
        : [...prev.org_ids, orgId];
      return { ...prev, org_ids: newOrgs };
    });
  };

  const handleSelectAllOrgs = () => {
    if (formData.org_ids.length === organizations.length) {
      setFormData(prev => ({ ...prev, org_ids: [] }));
    } else {
      setFormData(prev => ({ ...prev, org_ids: organizations.map(o => o.id) }));
    }
  };

  const handleDelete = async (id, username) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${username}"?`)) return;
    try {
      await api.delete(`/users/${id}`);
      fetchData();
    } catch (err) {
      alert(err.message || 'Lỗi khi xóa người dùng');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, formData);
      } else {
        await api.post('/users', formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isStaffRole = () => {
    const selected = roles.find(r => r.id === Number(formData.role_id));
    return selected?.code === 'STAFF';
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
            Quản Lý Nhân Sự &amp; Phân Quyền Đơn Vị
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Quản trị tài khoản, phân loại Admin &amp; Nhân viên, gán một nhân viên quản lý nhiều đơn vị
          </p>
        </div>

        <button onClick={handleOpenAdd} className="btn btn-primary">
          <Plus size={18} />
          <span>Thêm Nhân Sự Mới</span>
        </button>
      </div>

      {/* Filter / Search & Sort Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 250px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Tìm theo họ tên, username, email, sđt..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          </div>

          <div style={{ width: '160px' }}>
            <select
              className="form-select"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">-- Tất cả vai trò --</option>
              <option value="ADMIN">Quản trị viên</option>
              <option value="STAFF">Nhân viên</option>
            </select>
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
              <option value="id_asc">Mã ID (Tăng dần)</option>
              <option value="id_desc">Mã ID (Giảm dần)</option>
              <option value="full_name_asc">Họ tên (A → Z)</option>
              <option value="full_name_desc">Họ tên (Z → A)</option>
              <option value="username_asc">Username (A → Z)</option>
              <option value="username_desc">Username (Z → A)</option>
              <option value="created_at_desc">Mới tạo nhất</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>Dòng/trang:</label>
            <select
              className="form-select"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              style={{ width: '80px' }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>

          <button type="submit" className="btn btn-secondary">
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Users Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Đang tải danh sách người dùng...</div>
      ) : users.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Users size={48} style={{ margin: '0 auto 1rem', color: '#cbd5e1' }} />
          <h3 style={{ fontSize: '1.1rem', color: '#475569', marginBottom: '0.5rem' }}>Không tìm thấy nhân sự nào</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc
          </p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th onClick={() => handleSort('full_name')} style={{ cursor: 'pointer' }}>
                  Họ &amp; Tên / Username {renderSortIcon('full_name')}
                </th>
                <th onClick={() => handleSort('role_code')} style={{ cursor: 'pointer' }}>
                  Vai trò {renderSortIcon('role_code')}
                </th>
                <th>Đơn vị được phân quyền quản lý</th>
                <th>Liên hệ</th>
                <th onClick={() => handleSort('is_active')} style={{ cursor: 'pointer' }}>
                  Trạng thái {renderSortIcon('is_active')}
                </th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{u.full_name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>@{u.username}</div>
                  </td>
                  <td>
                    {u.role_code === 'ADMIN' ? (
                      <span className="badge badge-admin">
                        <Shield size={12} /> Quản trị viên
                      </span>
                    ) : (
                      <span className="badge badge-staff">
                        Nhân viên
                      </span>
                    )}
                  </td>
                  <td>
                    {u.role_code === 'ADMIN' ? (
                      <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
                        ★ Toàn quyền tất cả đơn vị
                      </span>
                    ) : u.assigned_orgs && u.assigned_orgs.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {u.assigned_orgs.map((org) => (
                          <span key={org.id} className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                            <Building2 size={11} /> {org.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        Chưa gán đơn vị nào
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{u.email || '-'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.phone || ''}</div>
                  </td>
                  <td>
                    {u.is_active ? (
                      <span className="badge badge-success">Hoạt động</span>
                    ) : (
                      <span className="badge badge-warning">Đã khóa</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="btn btn-secondary btn-sm"
                        title="Chỉnh sửa tài khoản & phân quyền"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.username)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#dc2626' }}
                        title="Xóa tài khoản"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Hiển thị <strong>{users.length}</strong> / <strong>{pagination.total}</strong> nhân sự (Trang {page}/{pagination.totalPages})
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

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? `Chỉnh Sửa Nhân Sự: ${editingUser.username}` : 'Thêm Nhân Sự Mới'}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Tên đăng nhập *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: nhanvien_hp"
                  required
                  disabled={!!editingUser}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {editingUser ? 'Mật khẩu mới (để trống nếu giữ nguyên)' : 'Mật khẩu *'}
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder={editingUser ? 'Nhập mật khẩu mới...' : 'Nhập mật khẩu (tối thiểu 6 ký tự)'}
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Họ và tên *</label>
              <input
                type="text"
                className="form-control"
                placeholder="VD: Nguyễn Văn A"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="VD: a.nguyen@thaco.com.vn"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Số điện thoại</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: 0912345678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Vai trò trong hệ thống *</label>
              <select
                className="form-select"
                value={formData.role_id}
                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                required
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Organizations Assignment (1 nhân viên quản lý nhiều đơn vị) */}
            {isStaffRole() && (
              <div className="form-group" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={16} color="var(--primary)" />
                    <span>Phân quyền quản lý đơn vị (Chọn một hoặc nhiều)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllOrgs}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  >
                    {formData.org_ids.length === organizations.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {organizations.map((org) => {
                    const checked = formData.org_ids.includes(org.id);
                    return (
                      <div
                        key={org.id}
                        onClick={() => handleToggleOrg(org.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.6rem 0.75rem',
                          background: checked ? '#e0f2fe' : '#ffffff',
                          border: checked ? '1px solid #7dd3fc' : '1px solid #e2e8f0',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {checked ? (
                          <CheckSquare size={18} color="#0284c7" />
                        ) : (
                          <Square size={18} color="#94a3b8" />
                        )}
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{org.name}</span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>({org.code})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="form-text" style={{ marginTop: '0.5rem' }}>
                  * Nhân viên này sẽ chỉ có quyền xem, tạo, sửa và xóa màn hình thuộc các đơn vị được tick chọn.
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Hủy
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Đang lưu...' : (editingUser ? 'Lưu cập nhật' : 'Tạo nhân sự')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
