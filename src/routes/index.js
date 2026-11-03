import { Router } from 'express';
import authRoutes from './authRoutes.js';
import orgRoutes from './orgRoutes.js';
import userRoutes from './userRoutes.js';
import postRoutes from './postRoutes.js';
import screenRoutes from './screenRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/orgs', orgRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/screens', screenRoutes);

// Compatibility route with original thaco_auto for /api/admin/screens
router.use('/admin/screens', screenRoutes);

export default router;
