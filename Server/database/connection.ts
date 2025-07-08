import mongoose from 'mongoose';
import { config } from '../config';

class ConnectDB {
	private static instance: ConnectDB;
	private isConnected = false;

	private constructor() {}

	public static getInstance(): ConnectDB {
		if (!ConnectDB.instance) {
			ConnectDB.instance = new ConnectDB();
		}
		return ConnectDB.instance;
	}

	public async connect(): Promise<void> {
		if (this.isConnected) {
			console.log('Database already connected');
			return;
		}
		try {
			console.log('🔗 Attempting to connect to MongoDB...');
			console.log('🔍 Raw URI:', JSON.stringify(config.mongoUri));

			console.log('📍 URI:', config.mongoUri.replace(/\/\/.*@/, '//***:***@')); // Hide credentials
			
			await mongoose.connect(config.mongoUri, {

				maxPoolSize: 10,
				serverSelectionTimeoutMS: 5000,
				socketTimeoutMS: 45000,
				bufferCommands: false
			});
			
			this.isConnected = true;
			console.log('✅ MongoDB connected successfully');

			// Handle connection events
			mongoose.connection.on('error', (error: Error) => {
				console.error('❌ MongoDB connection error:', error);
				this.isConnected = false;
			});

			mongoose.connection.on('disconnected', () => {
				console.log('⚠️ MongoDB disconnected');
				this.isConnected = false;
			});

			mongoose.connection.on('reconnected', () => {
				console.log('🔄 MongoDB reconnected');
				this.isConnected = true;
			});

		} catch (error) {
			console.error('❌ Failed to connect to MongoDB:', error);
			console.error('💡 Check your MongoDB Atlas credentials and network connection');
			throw error;
		}
	}

	public async disconnect(): Promise<void> {
		if (!this.isConnected) {
			return;
		}

		try {
			await mongoose.disconnect();
			this.isConnected = false;
			console.log('✅ MongoDB disconnected successfully');
		} catch (error) {
			console.error('❌ Error disconnecting from MongoDB:', error);
			throw error;
		}
	}

	public getConnectionStatus(): boolean {
		return this.isConnected && mongoose.connection.readyState === 1;
	}

	public getConnectionInfo() {
		return {
			isConnected: this.isConnected,
			readyState: mongoose.connection.readyState,
			host: mongoose.connection.host,
			port: mongoose.connection.port,
			name: mongoose.connection.name
		};
	}
}

export const connectDB = ConnectDB.getInstance();
export default connectDB; 