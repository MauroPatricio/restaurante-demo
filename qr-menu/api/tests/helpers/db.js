import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

/**
 * Connect to mock database for testing
 */
export const connectTestDB = async () => {
    try {
        // Close existing connection if any
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }

        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();

        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('✅ Connected to in-memory test database');
    } catch (error) {
        console.error('❌ Error connecting to test database:', error);
        throw error;
    }
};

/**
 * Disconnect and close database
 */
export const closeTestDB = async () => {
    try {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        if (mongoServer) {
            await mongoServer.stop();
        }
        console.log('✅ Disconnected from test database');
    } catch (error) {
        console.error('❌ Error closing test database:', error);
        throw error;
    }
};

/**
 * Clear all collections in database
 */
export const clearTestDB = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
};

/**
 * Create test restaurant data
 */
export const createTestRestaurant = async (Restaurant) => {
    const restaurantData = {
        name: 'Test Restaurant',
        email: 'test@restaurant.com',
        phone: '+258841234567',
        address: 'Test Address, Maputo',
        logo: 'https://example.com/logo.png',
        currency: 'MZN',
        timezone: 'Africa/Maputo',
        settings: {
            acceptsOrders: true,
            acceptsDelivery: true,
            acceptsTakeaway: true,
        },
    };

    const restaurant = await Restaurant.create(restaurantData);
    return restaurant;
};

/**
 * Create test user (owner)
 */
export const createTestUser = async (User, restaurant) => {
    const userData = {
        name: 'Test Owner',
        email: 'owner@test.com',
        password: 'Test@1234',
        restaurant: restaurant._id,
        role: 'owner',
        phone: '+258841111111',
    };

    const user = await User.create(userData);
    return user;
};

/**
 * Generate auth token for tests
 */
export const generateTestToken = (user) => {
    return user.generateAuthToken();
};
