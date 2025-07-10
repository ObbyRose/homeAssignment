import dotenv from 'dotenv';
dotenv.config();
console.log("DEBUG: MONGO_URI =", JSON.stringify(process.env.MONGO_URI));

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { connectDB } from './database/connection';
import { initGridFS } from './database/gridFS';
import documentRoutes from './routes/documentRoutes';

const app = express();
const PORT = config.port;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
// Document Routes
app.use('/api/documents', documentRoutes);

// Basic route
app.get('/', (req: Request, res: Response) => {
	res.json({
		message: 'Express Server API',
		status: 'running',
		version: '1.0.0',
		timestamp: new Date().toISOString(),
		environment: config.environment,
		endpoints: {
			health: 'GET /health',
			documents: 'POST /api/documents/upload',
			compare: 'POST /api/documents/compare/:id',
			details: 'GET /api/documents/:id',
			download: 'GET /api/documents/output/:id'
		}
	});
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
	res.json({
		status: 'healthy',
		uptime: process.uptime(),
		timestamp: new Date().toISOString(),
		version: '1.0.0',
		environment: config.environment
	});
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
	console.error(err.stack);
	res.status(500).json({
		success: false,
		error: 'Something went wrong!',
		message: config.nodeEnv === 'development' ? err.message : 'Internal server error',
		timestamp: new Date().toISOString()
	});
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
	res.status(404).json({
		success: false,
		error: 'Route not found',
		path: req.originalUrl,
		timestamp: new Date().toISOString()
	});
});

// Start server
const startServer = async () => {
	try {
		try {
			await connectDB.connect();
			console.log('✅ MongoDB connected successfully');
			initGridFS();
			console.log('✅ GridFS initialized successfully');
		} catch (dbError) {
			console.log('⚠️ MongoDB connection failed, starting server without database');
		}
		
		// Start Express server
		app.listen(PORT, () => {
			console.log(`Express Server is running on port ${PORT}`);
			console.log(`Health check: http://localhost:${PORT}/health`);
			console.log(`Environment: ${config.environment}`);
			console.log(`Database: ${connectDB.getConnectionStatus() ? 'Connected' : 'Disconnected'}`);
		});
	} catch (error) {
		console.error('❌ Failed to start server:', error);
		process.exit(1);
	}
};

startServer();

export default app;