import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
const masked = uri ? uri.replace(/:(?:[^:@]+)@/, ':***@') : undefined;
console.log('MONGO_URI (or MONGODB_URI):', masked);
if (!uri) {
  console.error('❌ Nenhuma variável de conexão encontrada. Defina MONGO_URI ou MONGODB_URI no .env');
  process.exit(2);
}

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ Conectado ao MongoDB com sucesso');
  await mongoose.disconnect();
  process.exit(0);
} catch (err) {
  console.error('❌ Erro de conexão:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(3);
}
