import { Router } from 'express';
import authRoutes from './authRoutes';
import adminRoutes from './adminRoutes';
import customerRoutes from './customerRoutes';
import qsaRoutes from './qsaRoutes';
import qaRoutes from './qaRoutes';
import consultantRoutes from './consultantRoutes';
import commentRoutes from './commentRoutes';
import analyticsRoutes from './analyticsRoutes';
import fileRoutes from './fileRoutes';
import complianceRoutes from './complianceExportRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/customer', customerRoutes);
router.use('/qsa', qsaRoutes);
router.use('/qa', qaRoutes);
router.use('/consultant', consultantRoutes);
router.use('/comments', commentRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/files', fileRoutes);
router.use('/compliance', complianceRoutes);

export default router;
