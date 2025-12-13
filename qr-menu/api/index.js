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
(async () => {
  const publicIP = await getPublicIP();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📡 Tentando conectar ao MongoDB...');
  console.log(`🌐 SEU IP PÚBLICO: ${publicIP}`);
  console.log(`🔌 PORTA DO SERVIDOR: ${PORT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  mongoose
    .connect(process.env.MONGO_URI || 5000, {
      serverSelectionTimeoutMS: 30000, // ✅ 30 segundos timeout
      socketTimeoutMS: 45000, // ✅ 45 segundos socket
      maxPoolSize: 10, // ✅ Limite de conexões
      minPoolSize: 5, // ✅ Mínimo de conexões
      retryWrites: true, // ✅ Re-tentar escritas
      w: 'majority' // ✅ Write concern
    })
    .then(() => {
      console.log('✅ Conectado ao MongoDB com SUCESSO');
      console.log(`✓ IP ${publicIP} está whitelistado corretamente\n`);

      // Start subscription monitoring cron job após conexão bem-sucedida
      try {
        startSubscriptionMonitoring();
        console.log('✓ Monitoramento de assinaturas iniciado');
      } catch (err) {
        console.log('⚠️  Aviso: Não foi possível iniciar monitoramento:', err.message);
      }
    })
    .catch((err) => {
      console.log('\n❌ ERRO ao conectar MongoDB:', err.message);
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 ADICIONE ESTE IP NA WHITELIST DO MONGODB ATLAS:');
      console.log(`   🌐 IP: ${publicIP}`);
      console.log(`   🔌 Porta (servidor): ${PORT}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n🔧 Como adicionar na whitelist:');
      console.log('   1. Acesse: https://cloud.mongodb.com/');
      console.log('   2. Selecione seu Cluster');
      console.log('   3. Vá em "Network Access" (Acesso à Rede)');
      console.log('   4. Clique "ADD IP ADDRESS"');
      console.log(`   5. Digite: ${publicIP}`);
      console.log('   6. Clique "Confirm"');
      console.log('\n💡 Outras verificações:');
      console.log('   - String de conexão no .env (MONGO_URI)');
      console.log('   - DNS funcionando (use Google DNS 8.8.8.8)');
      console.log('\n⚠️  Servidor vai iniciar mesmo assim, mas sem banco de dados!\n');
    });
})();

// **Inicializando Express**
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
initializeFirebase();

// Middleware de erro
app.use((err, req, res, next) => {
  console.error('❌ Erro:', err);
  res.status(500).send({ message: err.message });
});

// Configuração do servidor HTTP
server.listen(PORT, () => {
  console.log(`\n🚀 Servidor disponivel e escutando na porta ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ Acesse: http://localhost:${PORT}\n`);
});

export { io };