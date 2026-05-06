import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requestLogger } from './shared/middleware/logger';
import { errorHandler, notFoundHandler } from './shared/middleware/errorHandler';
import { logger } from './shared/utils/logger';
import authRoutes from './modules/auth/auth.routes';
import agentsRoutes from './modules/agents/agents.routes';
import plansRoutes from './modules/plans/plans.routes';
import customersRoutes from './modules/subscribers/customers.routes';
import subscribersRoutes from './modules/subscribers/subscribers.routes';
import commissionsRoutes from './modules/commissions/commissions.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import exportRoutes from './modules/export/export.routes';
import applicationsRoutes from './modules/applications/applications.routes';
import auditLogRoutes from './modules/audit-logs/auditLog.routes';
import usersRoutes from './modules/users/users.routes';
import documentsRoutes from './modules/documents/documents.routes';
import eventsRoutes from './modules/events/events.routes';
import branchesRoutes from './modules/branches/branches.routes';
import agentApplicationsRoutes from './modules/agent-applications/agent-applications.routes';
import referrersRoutes from './modules/referrers/referrers.routes';
import { dataPurgeService } from './shared/services/dataPurge.service';

dotenv.config();

const app: Application = express();
const PORT = Number(process.env.PORT) || 5000;

// Middleware
// Allow all origins in production (Railway), specific origins in development
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? '*' 
  : ['http://localhost:3000', 'http://192.168.1.56:3000', 'http://192.168.1.5:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  exposedHeaders: ['Content-Disposition']
}));
// Increase body size limit to 50MB for image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(requestLogger);

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'UrbanConnect ISP Backend API is running' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchesRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/subscribers', subscribersRoutes);
app.use('/api/commissions', commissionsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/agent-applications', agentApplicationsRoutes);
app.use('/api/referrers', referrersRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start data purge scheduler
  dataPurgeService.startScheduler();
});
