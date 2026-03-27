import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { config } from './config';

const app: Application = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:3000', 
    'http://localhost:8080', 
    'http://localhost:8081', 
    'http://127.0.0.1:8080',
    'http://127.0.0.1:5173',
    'http://10.108.141.40:8080',
    'http://10.108.141.41:8080', 
    'http://172.26.208.1:8080',
    'https://rdinterlocks.vercel.app',
    'https://rdinterlocks.vercel.app/' // Robustness for trailing slash
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// API Routes
app.use('/api/v1', routes);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Welcome to RD Interlock Factory Operations API',
    version: '1.0.0',
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth',
      workers: '/api/v1/workers',
      production: '/api/v1/production',
      dispatch: '/api/v1/dispatch',
      expenses: '/api/v1/expenses',
      cashbook: '/api/v1/cash',
      stock: '/api/v1/stock',
      reports: '/api/v1/reports',
      dashboard: '/api/v1/dashboard/summary',
      settings: '/api/v1/settings',
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(errorHandler);

export default app;
