import dotenv from 'dotenv';

console.log('=== Environment Debug ===');
console.log('Before dotenv.config():');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGO_URI:', process.env.MONGO_URI);

dotenv.config();

console.log('\nAfter dotenv.config():');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGO_URI:', process.env.MONGO_URI);

console.log('\n=== .env file content ===');
import fs from 'fs';
try {
    const envContent = fs.readFileSync('.env', 'utf8');
    console.log('File exists, content:');
    console.log(envContent);
} catch (error) {
    console.log('Error reading .env:', error.message);
} 