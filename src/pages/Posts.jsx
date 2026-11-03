import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Modal from '../components/Modal';
import {
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  Building2,
  Calendar,
  User,
  AlertCircle,
  Eye,
  CheckCircle,
  Clock
} from 'lucide-react';

export default function Posts() {
  const { user, isAdmin } = useAuth();
  const [posts, setPosts] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [viewingPost, setViewingPost] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    organization_id: '',
    summary: '',
    content: '',
    thumbnail: '',
    status: 'published'
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchPostsAndOrgs = async () => {
    try {
      setLoading(true);
      const [postsData, orgsData] = await Promise.all([
        api.get(`/posts?organization_id=${selectedOrg}&status=${statusFilter}&search=${encodeURIComponent(search)}`),
        api.get('/orgs')
      ]);
      setPosts(postsData);
      setOrganizations(orgsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostsAndOrgs();
  }, [selectedOrg, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPostsAndOrgs();
  };

  const handleOpenAdd = () => {
    setEditingPost(null);
    const defaultOrgId = organizations.length > 0 ? organizations[0].id : '';
    setFormData({
      title: '',
      organization_id: defaultOrgId,
      summary: '',
      content: '',
      thumbnail: '',
      status: 'published'
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingPost(p);
    setFormData({
      title: p.title,
      organization_id: p.organization_id,
      summary: p.summary || '',
      content: p.content || '',
      thumbnail: p.thumbnail || '',
      status: p.status || 'published'
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenPreview = (p) => {
    setViewingPost(p);
    setIsPreviewOpen(true);
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bài viết "${title}"?`)) return;
    try {
      await api.delete(`/posts/${id}`);
      fetchPostsAndOrgs();
    } catch (err) {
      alert(err.message || 'Lỗi khi xóa bài viết');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (editingPost) {
        await api.put(`/posts/${editingPost.id}`, formData);
      } else {
        await api.post('/posts', formData);
      }
      setIsModalOpen(false);
      fetchPostsAndOrgs();
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
            Quản Lý Bài Viết &amp; Thông Báo Dịch Vụ
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            {isAdmin
              ? 'Toàn quyền tạo, quản lý và đăng bài cho tất cả các đơn vị THACO AUTO Hải Phòng'
              : 'Đăng và quản lý bài viết thuộc các đơn vị bạn được phân quyền phụ trách'}
          </p>
        </div>

        <button onClick={handleOpenAdd} className="btn btn-primary">
          <Plus size={18} />
          <span>Tạo Bài Viết Mới</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 250px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Tìm theo tiêu đề, nội dung bài viết..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          </div>

          <div style={{ width: '220px' }}>
            <select
              className="form-select"
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
            >
              <option value="">-- Tất cả đơn vị --</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ width: '160px' }}>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">-- Trạng thái --</option>
              <option value="published">Đã xuất bản</option>
              <option value="draft">Bản nháp</option>
            </select>
          </div>

          <button type="submit" className="btn btn-secondary">
            Lọc kết quả
          </button>
        </form>
      </div>

      {/* Post List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Đang tải bài viết...</div>
      ) : posts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <FileText size={48} style={{ margin: '0 auto 1rem', color: '#cbd5e1' }} />
          <h3 style={{ fontSize: '1.1rem', color: '#475569', marginBottom: '0.5rem' }}>
            Không tìm thấy bài viết nào
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            Hãy bấm "Tạo Bài Viết Mới" để xuất bản thông báo cho đơn vị của bạn.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {posts.map((post) => (
            <div
              key={post.id}
              className="card"
              style={{ padding: '1.25rem 1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}
            >
              <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-staff">
                    <Building2 size={12} /> {post.org_name}
                  </span>
                  {post.status === 'published' ? (
                    <span className="badge badge-success">Đã xuất bản</span>
                  ) : (
                    <span className="badge badge-neutral">Bản nháp</span>
                  )}
                  <span style={{ fontSize: '0.775rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} />
                    {new Date(post.created_at).toLocaleDateString('vi-VN')}
                  </span>
                  <span style={{ fontSize: '0.775rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={13} />
                    {post.author_name}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {post.title}
                </h3>

                {post.summary && (
                  <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                    {post.summary}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => handleOpenPreview(post)}
                  className="btn btn-secondary btn-sm"
                  title="Xem nội dung chi tiết"
                >
                  <Eye size={15} />
                  <span>Xem</span>
                </button>
                <button
                  onClick={() => handleOpenEdit(post)}
                  className="btn btn-secondary btn-sm"
                  title="Chỉnh sửa bài viết"
                >
                  <Edit2 size={15} />
                  <span>Sửa</span>
                </button>
                <button
                  onClick={() => handleDelete(post.id, post.title)}
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#dc2626' }}
                  title="Xóa bài viết"
                >
                  <Trash2 size={15} />
                  <span>Xóa</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPost ? 'Chỉnh Sửa Bài Viết' : 'Tạo Bài Viết Mới'}
        maxWidth="750px"
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

            <div className="form-group">
              <label className="form-label">Đơn vị trực thuộc *</label>
              <select
                className="form-select"
                required
                value={formData.organization_id}
                onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.code})
                  </option>
                ))}
              </select>
              <div className="form-text">
                {isAdmin
                  ? 'Admin có thể xuất bản bài viết cho bất kỳ đơn vị nào.'
                  : 'Bạn chỉ có thể chọn các đơn vị mà Admin đã gán quyền quản lý cho bạn.'}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tiêu đề bài viết *</label>
              <input
                type="text"
                className="form-control"
                placeholder="VD: Chương trình tri ân khách hàng tháng 11/2026..."
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tóm tắt ngắn</label>
              <textarea
                className="form-control"
                rows="2"
                placeholder="Tóm tắt nội dung thông báo..."
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nội dung chi tiết *</label>
              <textarea
                className="form-control"
                rows="6"
                placeholder="Nhập nội dung bài viết / thông báo chi tiết..."
                required
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Link ảnh đại diện (Thumbnail)</label>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://..."
                  value={formData.thumbnail}
                  onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Trạng thái đăng bài</label>
                <select
                  className="form-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="published">Xuất bản ngay (Published)</option>
                  <option value="draft">Lưu bản nháp (Draft)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Hủy
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Đang lưu...' : (editingPost ? 'Lưu thay đổi' : 'Đăng bài viết')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Chi Tiết Bài Viết"
        maxWidth="750px"
      >
        {viewingPost && (
          <div className="modal-body">
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span className="badge badge-staff">{viewingPost.org_name}</span>
              <span className="badge badge-success">{viewingPost.status}</span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>
              {viewingPost.title}
            </h2>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
              <span>Tác giả: <strong>{viewingPost.author_name}</strong></span>
              <span>Ngày đăng: <strong>{new Date(viewingPost.created_at).toLocaleString('vi-VN')}</strong></span>
            </div>

            {viewingPost.summary && (
              <div style={{ padding: '0.85rem 1rem', background: '#f1f5f9', borderRadius: '8px', fontStyle: 'italic', marginBottom: '1.25rem', color: '#334155' }}>
                {viewingPost.summary}
              </div>
            )}

            <div
              style={{ lineHeight: 1.7, fontSize: '0.95rem', color: '#1e293b' }}
              dangerouslySetInnerHTML={{ __html: viewingPost.content }}
            />
          </div>
        )}
        <div className="modal-footer">
          <button type="button" onClick={() => setIsPreviewOpen(false)} className="btn btn-secondary">
            Đóng
          </button>
        </div>
      </Modal>
    </div>
  );
}
