import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import router from './src/routes/index.js';
import { initializeFirebase } from './src/services/firebaseService.js';
import { startSubscriptionMonitoring } from './src/services/scheduledJobs.js';

// Carregando variáveis de ambiente
dotenv.config();

// Ensure JWT secret is set in production to avoid silent insecurity
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is required in production. Set JWT_SECRET in environment variables.');
  process.exit(1);
} else if (!process.env.JWT_SECRET) {
  console.warn('⚠️  Warning: JWT_SECRET is not set. Using defaults may be insecure for production.');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 4000;

// Função para obter IP público
async function getPublicIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    return 'Não foi possível obter IP';
  }
}

// Conectar ao MongoDB (não bloqueia o servidor)
// Conectar ao MongoDB (não bloqueia o servidor)
(async () => {
  const publicIP = await getPublicIP();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📡 Tentando conectar ao MongoDB...');
  console.log(`🌐 SEU IP PÚBLICO: ${publicIP}`);
  console.log(`🔌 PORTA DO SERVIDOR: ${PORT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Accept either MONGO_URI or MONGODB_URI (some projects use different names)
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('❌ Nenhuma variável de ambiente de conexão MongoDB encontrada. Defina MONGO_URI ou MONGODB_URI no .env');
    console.error('🔧 Exemplo: MONGO_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/mydb?retryWrites=true&w=majority');
    return;
  }

  const options = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 5,
    retryWrites: true,
    w: 'majority'
  };

  // Global handlers to avoid crashes on unhandled errors during network operations
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });

  // Try to connect with retries to avoid transient DNS/network issues crashing the process
  async function connectWithRetry(uri, opts, maxAttempts = 5, initialDelay = 3000) {
    let attempt = 0;
    let delay = initialDelay;
    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        await mongoose.connect(uri, opts);
        console.log(`✅ Conectado ao MongoDB (attempt ${attempt})`);
        // Log detailed connection info when successful
        try {
          const masked = uri.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@');
          const m = uri.match(/@([^\/]+)\/?([^?]*)/);
          const hosts = m ? m[1] : '<unknown-hosts>';
          const dbName = m && m[2] ? m[2] : (opts && opts.dbName) || 'default';
          console.log('\n🔒 MongoDB connection details (masked):');
          console.log(`   URI: ${masked}`);
          console.log(`   Hosts: ${hosts}`);
          console.log(`   Database: ${dbName}`);
          console.log(`   Mongoose readyState: ${mongoose.connection.readyState}\n`);
        } catch (e) {
          console.log('⚠️  Não foi possível extrair detalhes da URI do MongoDB:', e?.message || e);
        }
        return true;
      } catch (err) {
        console.warn(`⚠️  Falha ao conectar MongoDB (attempt ${attempt}):`, err?.message || err);
        if (attempt >= maxAttempts) {
          console.error('\n❌ ERRO ao conectar MongoDB após tentativas:', err?.message || err);
          return false;
        }
        console.log(`→ Reattempting in ${delay}ms...`);
        await new Promise((res) => setTimeout(res, delay));
        delay *= 2; // exponential backoff
      }
    }
    return false;
  }

  const connected = await connectWithRetry(mongoUri, options, 4, 3000);

  if (connected) {
    console.log(`✓ IP ${publicIP} está whitelistado corretamente\n`);
    // Attach connection lifecycle listeners
    mongoose.connection.on('connected', () => {
      console.log('📡 Mongoose event: connected');
    });
    mongoose.connection.on('reconnected', () => {
      console.log('🔁 Mongoose event: reconnected');
    });
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  Mongoose event: disconnected');
    });
    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose event: error', err?.message || err);
    });
  } else {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Possíveis causas e ações:');
    console.log('   - Seu IP público não está na Network Access (whitelist) do MongoDB Atlas');
    console.log('   - String de conexão está incorreta (verifique usuário/senha/cluster)');
    console.log('   - Cluster está offline ou há problema de rede/DNS');
    console.log('\n   → Acesse: https://cloud.mongodb.com/ e adicione o IP listado acima em Network Access');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️  Servidor vai iniciar mesmo assim, mas sem banco de dados!\n');
  }
})();

// **Inicializando Express**
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Configuração de CORS adicional
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Rotas da API
app.use('/api', router);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
const receiptsDir = path.join(uploadsDir, 'receipts');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir);
}

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('join-restaurant', (restaurantId) => {
    socket.join(`restaurant-${restaurantId}`);
    console.log(`Socket ${socket.id} joined restaurant ${restaurantId}`);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// Make io available globally for real-time updates
app.set('io', io);

// Initialize Firebase Admin SDK for push notifications
try {
  initializeFirebase();
} catch (err) {
  console.error('⚠️  Firebase initialization failed:', err?.message || err);
}

// Middleware de erro
app.use((err, req, res, next) => {
  console.error('❌ Erro:', err);
  res.status(500).send({ message: err.message });
});

// Configuração do servidor HTTP
try {
  server.listen(PORT, () => {
    console.log(`\n🚀 Servidor disponivel e escutando na porta ${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✓ Acesse: http://localhost:${PORT}\n`);

    // Start subscription monitoring after server is listening
    try {
      startSubscriptionMonitoring();
      console.log('✓ Monitoramento de assinaturas iniciado\n');
    } catch (err) {
      console.log('⚠️  Aviso: Não foi possível iniciar monitoramento:', err?.message || err);
    }
  });
} catch (err) {
  console.error('❌ Erro ao iniciar servidor:', err?.message || err);
  process.exit(1);
}

export { io };
