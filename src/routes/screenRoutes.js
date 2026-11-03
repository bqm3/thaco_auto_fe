import { Router } from 'express';
import {
  getPublicScreen,
  getAdminScreens,
  createScreen,
  updateScreen,
  deleteScreen
} from '../controllers/screenController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// Public endpoint for live appointment board TV display
router.get('/public/:slug', getPublicScreen);
router.get('/:slug', (req, res, next) => {
  // If requesting specific admin screen endpoints, bypass or handle
  return getPublicScreen(req, res, next);
});

// Admin screens management (requires authentication)
router.get('/', authenticate, getAdminScreens);
router.post('/', authenticate, createScreen);
router.put('/:slug', authenticate, updateScreen);
router.delete('/:slug', authenticate, deleteScreen);

export default router;
