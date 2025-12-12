import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import router from './src/routes/index.js';
import { initializeFirebase } from './src/services/firebaseService.js';
import { startSubscriptionMonitoring } from './src/services/scheduledJobs.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(cors());
app.use(express.json());
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

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/qr-menu-restaurant', {
  serverSelectionTimeoutMS: 30000, // 30 seconds timeout
  socketTimeoutMS: 45000, // 45 seconds socket
  maxPoolSize: 10, // Connection pool limit
  minPoolSize: 5, // Minimum connections
  retryWrites: true, // Retry writes on failure
  w: 'majority' // Write concern
})
  .then(() => {
    console.log('✓ Connected to MongoDB');

    // Start subscription monitoring cron job
    startSubscriptionMonitoring();
    console.log('✓ Subscription monitoring started');

    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => {
      console.log(`Servidor disponivel e escutando na porta ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((error) => {
    console.log('O servidor nao conseguiu se connectar com o mongoBD devido falta de permissoes de servidor');
    if (error.name === 'MongooseServerSelectionError') {
      console.log('HINT: Check if your IP address is whitelisted in MongoDB Atlas.');
    }
    console.error('✗ MongoDB connection error:', error);
    process.exit(1);
  });

export { io };