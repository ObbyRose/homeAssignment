import dotenv from 'dotenv';
dotenv.config();
console.log('Before dotenv.config():');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

dotenv.config();

console.log('\nAfter dotenv.config():');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGO_URI:', process.env.MONGO_URI);
console.log('HUGGINGFACE_API_KEY:', process.env.HUGGINGFACE_API_KEY); 