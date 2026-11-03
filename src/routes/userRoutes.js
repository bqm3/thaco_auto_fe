import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getRoles
} from '../controllers/userController.js';
import { authenticate } from '../middlewares/auth.js';
import { requireAdmin } from '../middlewares/role.js';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/roles', getRoles);
router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
