import { Router } from 'express';
import {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization
} from '../controllers/orgController.js';
import { authenticate } from '../middlewares/auth.js';
import { requireAdmin } from '../middlewares/role.js';

const router = Router();

router.use(authenticate);

router.get('/', getOrganizations);
router.get('/:id', getOrganizationById);
router.post('/', requireAdmin, createOrganization);
router.put('/:id', requireAdmin, updateOrganization);
router.delete('/:id', requireAdmin, deleteOrganization);

export default router;
