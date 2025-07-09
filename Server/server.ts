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

const app = express();
const PORT = config.port;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Basic route
app.get('/', (req: Request, res: Response) => {
	res.json({
		message: 'Express Server API',
		status: 'running',
		version: '1.0.0',
		timestamp: new Date().toISOString(),
		endpoints: {
			health: 'GET /health',
			apiStatus: 'GET /api/status'
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

// API status endpoint
app.get('/api/status', (req: Request, res: Response) => {
	res.json({
		message: 'Express Server API is working!',
		version: '1.0.0',
		environment: config.environment,
		features: [
			'Basic Express server',
			'CORS enabled',
			'Security headers',
			'Request logging'
		]
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
			console.log('   To fix: Install MongoDB locally or use MongoDB Atlas');
		}
		
		// Start Express server
		app.listen(PORT, () => {
			console.log(`🚀 Express Server is running on port ${PORT}`);
			console.log(`📱 Health check: http://localhost:${PORT}/health`);
			console.log(`🌐 API status: http://localhost:${PORT}/api/status`);
			console.log(`🔧 Environment: ${config.environment}`);
			console.log(`🗄️ Database: ${connectDB.getConnectionStatus() ? 'Connected' : 'Disconnected'}`);
		});
	} catch (error) {
		console.error('❌ Failed to start server:', error);
		process.exit(1);
	}
};

startServer();

export default app;
