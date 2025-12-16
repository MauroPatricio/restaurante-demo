import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../src/models/User.js';
import Restaurant from '../src/models/Restaurant.js';
import Subscription from '../src/models/Subscription.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('❌ MONGO_URI / MONGODB_URI not configured in .env');
  process.exit(1);
}

const options = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 5
};

const sample = {
  name: process.env.SAMPLE_USER_NAME || 'Admin Sample',
  email: process.env.SAMPLE_USER_EMAIL || 'admin@example.com',
  password: process.env.SAMPLE_USER_PASSWORD || 'Password123!',
  phone: process.env.SAMPLE_USER_PHONE || '0000000000',
  restaurantName: process.env.SAMPLE_RESTAURANT_NAME || 'Sample Restaurant',
  restaurantAddress: process.env.SAMPLE_RESTAURANT_ADDRESS || 'Sample Address'
};

async function run() {
  try {
    await mongoose.connect(mongoUri, options);
    console.log('✅ Connected to MongoDB for seeding sample user');

    const existing = await User.findOne({ email: sample.email });
    if (existing) {
      console.log(`ℹ️  User with email ${sample.email} already exists (id=${existing._id})`);
      const token = jwt.sign({ userId: existing._id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
      console.log('➡️  Use these credentials to login:');
      console.log(`   email: ${sample.email}`);
      console.log(`   password: ${sample.password}`);
      console.log(`   token: ${token}`);
      process.exit(0);
    }


    // Create user (password will be hashed by model pre-save)
    const user = await User.create({
      name: sample.name,
      email: sample.email,
      password: sample.password,
      phone: sample.phone,
      role: 'owner',
      active: true
    });

    // Create restaurant with owner set to created user
    const restaurant = await Restaurant.create({
      name: sample.restaurantName,
      address: sample.restaurantAddress,
      email: sample.email,
      phone: sample.phone,
      owner: user._id
    });

    // Create subscription (trial)
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const subscription = await Subscription.create({
      restaurant: restaurant._id,
      status: 'trial',
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
      amount: 0
    });

    restaurant.subscription = subscription._id;
    await restaurant.save();

    // Link restaurant to user and save
    user.restaurant = restaurant._id;
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });

    console.log('✅ Sample user created successfully');
    console.log('➡️  Credentials:');
    console.log(`   email: ${sample.email}`);
    console.log(`   password: ${sample.password}`);
    console.log(`   token: ${token}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create sample user:', err?.message || err);
    process.exit(1);
  }
}

run();
