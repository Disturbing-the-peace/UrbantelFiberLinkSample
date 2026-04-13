import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requestLogger } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import agentsRoutes from './routes/agents.routes';
import plansRoutes from './routes/plans.routes';
import customersRoutes from './routes/customers.routes';
import subscribersRoutes from './routes/subscribers.routes';
import commissionsRoutes from './routes/commissions.routes';
import analyticsRoutes from './routes/analytics.routes';
import exportRoutes from './routes/export.routes';
import applicationsRoutes from './routes/applications.routes';
import auditLogRoutes from './routes/auditLog.routes';
import usersRoutes from './routes/users.routes';
import documentsRoutes from './routes/documents.routes';
import { dataPurgeService } from './services/dataPurge.service';

dotenv.config();

const app: Application = express();
const PORT = Number(process.env.PORT) || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://192.168.1.56:3000', 'http://192.168.1.5:3000'],
  credentials: true
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

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Accessible at:`);
  console.log(`  - http://localhost:${PORT}`);
  console.log(`  - http://192.168.1.56:${PORT}`);
  
  // Start data purge scheduler
  dataPurgeService.startScheduler();
});
