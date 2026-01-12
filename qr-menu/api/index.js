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
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import router from './src/routes/index.js';
import { initializeFirebase } from './src/services/firebaseService.js';
import { startSubscriptionMonitoring } from './src/services/scheduledJobs.js';
import { setupWaiterCallHandlers } from './src/socket/waiterCallHandlers.js';

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
const PORT = process.env.PORT || 5000;

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

    // Seed roles
    await (await import('./src/services/seeder.js')).seedRoles();

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

// Allow CORS for Client and Admin Dashboard
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  process.env.ADMIN_URL || 'http://localhost:5173',
  'http://localhost:5174', // Client Menu alternative
  'http://localhost:5175',  // Client Menu actual port
  'http://46.62.246.24:5175',
  'http://46.62.246.24:5174',
  'http://46.62.246.24:5173',
  'http://46.62.246.24:5000',
  'http://gestaomodernaonline.com',
  'https://gestaomodernaonline.com',
  'http://menu.gestaomodernaonline.com',
  'https://menu.gestaomodernaonline.com',
  'http://api.gestaomodernaonline.com',
  'https://api.gestaomodernaonline.com',
  'https://gestaomodernaonline.com',
  'https://www.gestaomodernaonline.com',
  'http://localhost:5000'

];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Security & Performance Middleware
// In development, use more permissive helmet settings
if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
} else {
  app.use(helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false
  }));
}
app.use(compression());

// Rate Limiting (disabled in development)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  });
  app.use('/api', limiter);
}

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // In development, allow ALL origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // In production, check allowed origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make Socket.IO instance available in req for controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Configuração de CORS adicional (Legacy/Redundant if `cors()` is configured, but keeping for safety if needed, simplified)
/*
app.use((req, res, next) => {
  // Configured via cors() middleware above usually, but manual headers for debug:
  // res.header("Access-Control-Allow-Origin", "*"); // DISABLED for hardening
  next();
});
*/

// Rotas da API
app.get('/', (req, res) => {
  res.status(200).send(`
    <div style="font-family: 'Inter', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: white; text-align: center; padding: 20px;">
      <div style="padding: 24px; background: rgba(16, 185, 129, 0.1); border: 2px solid #10b981; border-radius: 24px; box-shadow: 0 0 40px rgba(16, 185, 129, 0.2); animation: fadeIn 0.8s ease-out;">
        <h1 style="font-size: 2.5rem; font-weight: 800; margin-bottom: 16px; letter-spacing: -0.025em;">🚀 API Conectada com Sucesso</h1>
        <p style="font-size: 1.15rem; color: #94a3b8; line-height: 1.6; max-width: 500px; margin: 0 auto 24px;">Você conseguiu chegar ao servidor . Este endpoint é apenas para fins de verificação.</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <span style="padding: 8px 16px; background: #1e293b; border-radius: 12px; font-size: 0.9rem; font-weight: 600; color: #10b981;">Status: OK</span>
          <span style="padding: 8px 16px; background: #1e293b; border-radius: 12px; font-size: 0.9rem; font-weight: 600; color: #10b981;">Porta: ${PORT}</span>
        </div>
      </div>
      <style>
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        body { margin: 0; }
      </style>
    </div>
  `);
});

app.get('/health', (req, res) => res.status(200).send('OK'));

// Authenticated health check with more details
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    version: '1.0.0'
  });
});

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

  socket.on('join-order', (orderId) => {
    socket.join(`order-${orderId}`);
    console.log(`Socket ${socket.id} joined order ${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// Setup Waiter Call Socket.IO handlers
setupWaiterCallHandlers(io);

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
// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
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
}

export { io };
export default app;

