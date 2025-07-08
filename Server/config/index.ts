import dotenv from 'dotenv';
import { ServerConfig } from '../types';

// Load environment variables
dotenv.config();

// Server configuration with defaults
export const config: ServerConfig = {
	port: parseInt(process.env.PORT || '5000', 10),
	environment: process.env.NODE_ENV || 'development',
	nodeEnv: process.env.NODE_ENV || 'development',
	mongoUri: process.env.MONGO_URI?.trim() || ''
};

export default config; 