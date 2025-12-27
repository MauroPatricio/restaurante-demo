import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../index.js';
import { randomEmail, randomPhone } from '../helpers/utils.js';
import User from '../../src/models/User.js';

describe('Authentication E2E Tests', () => {
    let server;

    beforeAll(async () => {
        // Using actual test database
    });

    afterAll(async () => {
        // Cleanup: Remove test users
        await User.deleteMany({ email: { $regex: 'test-.*@example.com' } });
        if (server) {
            server.close();
        }
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                name: 'Test User',
                email: randomEmail(),
                password: 'Test@1234',
                phone: randomPhone(),
                address: 'Test Address, Maputo'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'User registered successfully');
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user.email).toBe(userData.email);
            expect(response.body.user).not.toHaveProperty('password');
        });

        it('should fail when email already exists', async () => {
            const userData = {
                name: 'Test User',
                email: randomEmail(),
                password: 'Test@1234',
                phone: randomPhone(),
                address: 'Test Address'
            };

            // Register first time
            await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            // Try to register again with same email
            await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);
        });
    });

    describe('POST /api/auth/login', () => {
        let testUser;
        const testPassword = 'Test@1234';

        beforeAll(async () => {
            // Create a test user for login tests
            const userData = {
                name: 'Login Test User',
                email: randomEmail(),
                password: testPassword,
                phone: randomPhone(),
            };

            testUser = await User.create(userData);
        });

        it('should login successfully with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testPassword
                })
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Login successful');
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user.email).toBe(testUser.email);
        });

        it('should fail with invalid email', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: testPassword
                })
                .expect(401);

            expect(response.body).toHaveProperty('error');
        });

        it('should fail with invalid password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'WrongPassword123'
                })
                .expect(401);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('POST /api/auth/refresh', () => {
        let validToken;

        beforeAll(async () => {
            const userData = {
                name: 'Refresh Test User',
                email: randomEmail(),
                password: 'Test@1234',
                phone: randomPhone(),
            };

            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send(userData);

            validToken = registerResponse.body.token;
        });

        it('should refresh token successfully', async () => {
            const response = await request(app)
                .post('/api/auth/refresh')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('token');
            expect(response.body.token).toBeTruthy();
        });

        it('should fail without token', async () => {
            await request(app)
                .post('/api/auth/refresh')
                .expect(401);
        });
    });

    describe('GET /api/auth/me', () => {
        let authToken;
        let userId;

        beforeAll(async () => {
            const userData = {
                name: 'Me Test User',
                email: randomEmail(),
                password: 'Test@1234',
                phone: randomPhone(),
            };

            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send(userData);

            authToken = registerResponse.body.token;
            userId = registerResponse.body.user._id;
        });

        it('should get current user profile', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('user');
            expect(response.body.user).not.toHaveProperty('password');
        });

        it('should fail without authentication', async () => {
            await request(app)
                .get('/api/auth/me')
                .expect(401);
        });
    });
});
