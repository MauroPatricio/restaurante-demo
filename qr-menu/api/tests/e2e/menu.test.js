import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { randomEmail, randomPhone } from '../helpers/utils.js';
import User from '../../src/models/User.js';
import Restaurant from '../../src/models/Restaurant.js';
import Category from '../../src/models/Category.js';
import MenuItem from '../../src/models/MenuItem.js';
import UserRestaurantRole from '../../src/models/UserRestaurantRole.js';
import Role from '../../src/models/Role.js';

describe('Menu Items E2E Tests', () => {
    let authToken;
    let restaurantId;
    let categoryId;
    let userId;

    beforeAll(async () => {
        // Create a test user (owner) FIRST
        const userData = {
            name: 'Menu Test Owner',
            email: randomEmail(),
            password: 'Test@1234',
            phone: randomPhone(),
        };

        const user = await User.create(userData);
        userId = user._id;

        // Create a test restaurant WITH OWNER
        const restaurant = await Restaurant.create({
            name: 'Test Restaurant Menu',
            email: randomEmail(),
            phone: randomPhone(),
            address: 'Test Address',
            currency: 'MZN',
            timezone: 'Africa/Maputo',
            owner: userId  // Add owner field
        });
        restaurantId = restaurant._id;

        // Create subscription for restaurant to pass checkSubscription middleware
        const { createTestSubscription, updateRestaurantSubscription } = await import('../helpers/utils.js');
        const subscription = await createTestSubscription(restaurantId);
        await updateRestaurantSubscription(restaurantId, subscription._id);

        // Find or create owner role
        let ownerRole = await Role.findOne({ name: 'owner' });
        if (!ownerRole) {
            ownerRole = await Role.create({ name: 'owner', description: 'Restaurant Owner' });
        }

        // Create user-restaurant-role association
        await UserRestaurantRole.create({
            user: userId,
            restaurant: restaurantId,
            role: ownerRole._id,
            active: true,
            isDefault: true
        });

        // Login to get token
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: userData.email,
                password: userData.password
            });

        authToken = loginResponse.body.token;

        // Select restaurant to get scoped token
        const selectResponse = await request(app)
            .post('/api/auth/select-restaurant')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ restaurantId });

        authToken = selectResponse.body.token;

        // Create a category
        const category = await Category.create({
            restaurant: restaurantId,
            name: 'Test Category',
            displayOrder: 1
        });
        categoryId = category._id;
    });

    afterAll(async () => {
        // Cleanup
        await MenuItem.deleteMany({ restaurant: restaurantId });
        await Category.deleteMany({ restaurant: restaurantId });
        await UserRestaurantRole.deleteMany({ user: userId });
        await Restaurant.deleteOne({ _id: restaurantId });
        await User.deleteOne({ _id: userId });
    });

    describe('POST /api/menu-items', () => {
        it('should create a new menu item successfully', async () => {
            const menuItemData = {
                name: 'Test Dish',
                description: 'Delicious test dish',
                category: categoryId.toString(),
                price: 250,
                prepTime: 20,
                ingredients: ['Ingredient 1', 'Ingredient 2'],
                tags: ['Spicy', 'Popular']
            };

            const response = await request(app)
                .post('/api/menu-items')
                .set('Authorization', `Bearer ${authToken}`)
                .send(menuItemData)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'Menu item created successfully');
            expect(response.body).toHaveProperty('menuItem');
            expect(response.body.menuItem.name).toBe(menuItemData.name);
            expect(response.body.menuItem.price).toBe(menuItemData.price);
        });

        it('should fail when not authenticated', async () => {
            await request(app)
                .post('/api/menu-items')
                .send({
                    name: 'Test Dish',
                    category: categoryId,
                    price: 250
                })
                .expect(401);
        });
    });

    describe('GET /api/menu-items/restaurant/:restaurantId', () => {
        beforeAll(async () => {
            // Create a menu item for testing
            await MenuItem.create({
                restaurant: restaurantId,
                name: 'Existing Dish',
                description: 'Test dish',
                category: categoryId,
                price: 300,
                available: true
            });
        });

        it('should get all menu items for a restaurant', async () => {
            const response = await request(app)
                .get(`/api/menu-items/restaurant/${restaurantId}`)
                .expect(200);

            expect(response.body).toHaveProperty('menuItems');
            expect(response.body).toHaveProperty('total');
            expect(Array.isArray(response.body.menuItems)).toBe(true);
            expect(response.body.menuItems.length).toBeGreaterThan(0);
        });
    });
});
