export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Quyền truy cập bị từ chối: Chỉ Quản trị viên mới được thực hiện thao tác này' });
  }
  next();
}

export function hasOrgAccess(user, orgId) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  const targetId = Number(orgId);
  return Array.isArray(user.org_ids) && user.org_ids.includes(targetId);
}
