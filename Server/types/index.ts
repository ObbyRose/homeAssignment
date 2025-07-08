export interface ServerConfig {
	port: number;
	environment: string;
	nodeEnv: string;
	mongoUri: string;
}

export interface EnvironmentVariables {
	PORT: string;
	NODE_ENV: string;
}

export interface ApiResponse<T = any> {
	success: boolean;
	message: string;
	data?: T;
	error?: string;
	timestamp: string;
} 