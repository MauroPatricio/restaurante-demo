const { test, expect } = require('@playwright/test');

/**
 * Automated UI Tests for Table Management System
 * Tests all functionalities and detects bugs
 */

// Configuration
const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:5000';
const LOGIN_EMAIL = 'admin@restaurante.com';
const LOGIN_PASSWORD = 'Admin@1234';

test.describe('Table Management System - Automated Tests', () => {

    // Before each test: login
    test.beforeEach(async ({ page }) => {
        console.log('🔐 Logging in...');
        await page.goto(`${BASE_URL}/login`);

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Fill login form
        await page.fill('input[type="email"], input[name="email"]', LOGIN_EMAIL);
        await page.fill('input[type="password"], input[name="password"]', LOGIN_PASSWORD);

        // Click login button
        await page.click('button[type="submit"]');

        // Wait for redirect
        await page.waitForURL(/dashboard|mesas|tables/, { timeout: 10000 });
        console.log('✅ Login successful');
    });

    test('Test 1: Navigate to Tables page', async ({ page }) => {
        console.log('📍 Test 1: Navigate to Tables page');

        // Find "Mesas" or "Tables" link
        const tablesLink = page.locator('text=/Mesas|Tables/i').first();
        await tablesLink.click();

        // Wait for tables to load
        await page.waitForSelector('[class*="stat-card"], [class*="table-card"]', { timeout: 10000 });

        // Take screenshot
        await page.screenshot({ path: 'test-screenshots/01-tables-page.png', fullPage: true });

        // Verify tables are visible
        const tableCards = await page.locator('[class*="stat-card"], [class*="table-card"]').count();
        console.log(`✅ Found ${tableCards} table cards`);

        expect(tableCards).toBeGreaterThan(0);
    });

    test('Test 2: View Table Session Modal', async ({ page }) => {
        console.log('👁️ Test 2: View Table Session Modal');

        // Navigate to tables
        await page.click('text=/Mesas|Tables/i');
        await page.waitForSelector('[class*="stat-card"], [class*="table-card"]');

        // Find Eye icon button (View Orders)
        const eyeButton = page.locator('button[title*="Ver Pedidos"], button[title*="View Orders"]').first();

        if (await eyeButton.count() === 0) {
            console.log('🔍 Eye button not found by title, trying by icon...');
            // Try finding by SVG icon
            await page.click('button:has(svg)');
        } else {
            await eyeButton.click();
        }

        // Wait for modal to appear
        await page.waitForSelector('[class*="modal"]', { timeout: 5000 });

        // Take screenshot of modal
        await page.screenshot({ path: 'test-screenshots/02-session-modal.png' });

        // Check modal content
        const modalVisible = await page.locator('[class*="modal"]').isVisible();
        console.log(`✅ Modal visible: ${modalVisible}`);

        // Check for session elements
        const hasDuration = await page.locator('text=/Duração|Duration/i').count() > 0;
        const hasOrders = await page.locator('text=/Pedidos|Orders/i').count() > 0;
        const hasRevenue = await page.locator('text=/Receita|Revenue|Total/i').count() > 0;

        console.log(`📊 Modal contains - Duration: ${hasDuration}, Orders: ${hasOrders}, Revenue: ${hasRevenue}`);

        // Check for "Liberar Mesa" button
        const freeTableButton = await page.locator('text=/Liberar Mesa|Free Table/i').count() > 0;
        console.log(`🔘 Free Table button visible: ${freeTableButton}`);

        expect(modalVisible).toBe(true);
    });

    test('Test 3: Close Modal', async ({ page }) => {
        console.log('❌ Test 3: Close Modal');

        // Navigate and open modal
        await page.click('text=/Mesas|Tables/i');
        await page.waitForSelector('[class*="stat-card"]');

        // Click eye button
        await page.click('button:has(svg)');
        await page.waitForSelector('[class*="modal"]');

        // Find and click close button
        const closeButton = page.locator('button:has-text("Fechar"), button:has-text("Close")').first();
        await closeButton.click();

        // Wait for modal to disappear
        await page.waitForSelector('[class*="modal"]', { state: 'hidden', timeout: 5000 });

        const modalHidden = await page.locator('[class*="modal"]').isVisible() === false;
        console.log(`✅ Modal closed: ${modalHidden}`);

        expect(modalHidden).toBe(true);
    });

    test('Test 4: Check for Console Errors', async ({ page }) => {
        console.log('🐛 Test 4: Check for Console Errors');

        const errors = [];
        const warnings = [];

        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            } else if (msg.type() === 'warning') {
                warnings.push(msg.text());
            }
        });

        // Navigate to tables
        await page.click('text=/Mesas|Tables/i');
        await page.waitForSelector('[class*="stat-card"]', { timeout: 10000 });

        // Open modal
        await page.click('button:has(svg)');
        await page.waitForSelector('[class*="modal"]', { timeout: 5000 });

        // Wait a bit for any async errors
        await page.waitForTimeout(2000);

        console.log(`❌ Errors found: ${errors.length}`);
        console.log(`⚠️ Warnings found: ${warnings.length}`);

        if (errors.length > 0) {
            console.log('Console Errors:');
            errors.forEach(err => console.log(`  - ${err}`));
        }

        if (warnings.length > 0) {
            console.log('Console Warnings:');
            warnings.forEach(warn => console.log(`  - ${warn}`));
        }

        // Critical errors should fail the test
        const criticalErrors = errors.filter(e => !e.includes('DevTools'));
        expect(criticalErrors.length).toBe(0);
    });

    test('Test 5: Verify Table Status Display', async ({ page }) => {
        console.log('📊 Test 5: Verify Table Status Display');

        await page.click('text=/Mesas|Tables/i');
        await page.waitForSelector('[class*="stat-card"]');

        // Check for status badges
        const statuses = await page.locator('[class*="status-badge"], [class*="badge"]').count();
        console.log(`✅ Found ${statuses} status badges`);

        // Take screenshot
        await page.screenshot({ path: 'test-screenshots/05-table-statuses.png', fullPage: true });

        expect(statuses).toBeGreaterThan(0);
    });

    test('Test 6: Test i18n Translations', async ({ page }) => {
        console.log('🌍 Test 6: Test i18n Translations');

        await page.click('text=/Mesas|Tables/i');
        await page.waitForSelector('[class*="stat-card"]');

        // Check Portuguese texts (default)
        const hasMesas = await page.locator('text=/Mesas/i').count() > 0;
        console.log(`🇵🇹 Portuguese text found: ${hasMesas}`);

        // Take screenshot in Portuguese
        await page.screenshot({ path: 'test-screenshots/06-portuguese.png' });

        // Try to find language selector (if exists)
        const langSelector = page.locator('select[id*="lang"], button[title*="Language"], button[title*="Idioma"]');

        if (await langSelector.count() > 0) {
            console.log('🔄 Language selector found, testing translations...');
            // This would test language switching
        } else {
            console.log('ℹ️ No language selector found in current view');
        }

        expect(hasMesas).toBe(true);
    });

    test('Test 7: API Integration Check', async ({ page }) => {
        console.log('🔌 Test 7: API Integration Check');

        const apiCalls = [];

        page.on('response', response => {
            if (response.url().includes('/api/')) {
                apiCalls.push({
                    url: response.url(),
                    status: response.status(),
                    method: response.request().method()
                });
            }
        });

        await page.click('text=/Mesas|Tables/i');
        await page.waitForSelector('[class*="stat-card"]');

        // Wait for API calls
        await page.waitForTimeout(2000);

        console.log(`📡 API calls made: ${apiCalls.length}`);
        apiCalls.forEach(call => {
            console.log(`  ${call.method} ${call.url} - Status: ${call.status}`);
        });

        // Check for successful API calls
        const successfulCalls = apiCalls.filter(call => call.status >= 200 && call.status < 300);
        console.log(`✅ Successful API calls: ${successfulCalls.length}`);

        expect(successfulCalls.length).toBeGreaterThan(0);
    });

});

// Bug Detection and Reporting
test.describe('Bug Detection Tests', () => {

    test('Bug Check: Missing Elements', async ({ page }) => {
        console.log('🔍 Bug Check: Missing Elements');

        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', LOGIN_EMAIL);
        await page.fill('input[type="password"]', LOGIN_PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForURL(/dashboard/);

        await page.click('text=/Mesas|Tables/i');
        await page.waitForSelector('[class*="stat-card"]');

        // Check for broken images
        const images = await page.locator('img').all();
        let brokenImages = 0;

        for (const img of images) {
            const src = await img.getAttribute('src');
            if (src && (src.includes('undefined') || src === '')) {
                brokenImages++;
                console.log(`❌ Broken image found: ${src}`);
            }
        }

        // Check for empty text nodes
        const emptyTexts = await page.locator(':text("")').count();

        console.log(`🖼️ Broken images: ${brokenImages}`);
        console.log(`📝 Empty text nodes: ${emptyTexts}`);

        expect(brokenImages).toBe(0);
    });

    test('Bug Check: Network Errors', async ({ page }) => {
        console.log('🌐 Bug Check: Network Errors');

        const failedRequests = [];

        page.on('requestfailed', request => {
            failedRequests.push({
                url: request.url(),
                failure: request.failure()
            });
        });

        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', LOGIN_EMAIL);
        await page.fill('input[type="password"]', LOGIN_PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForURL(/dashboard/);

        await page.click('text=/Mesas|Tables/i');
        await page.waitForTimeout(3000);

        console.log(`🚫 Failed requests: ${failedRequests.length}`);
        failedRequests.forEach(req => {
            console.log(`  ❌ ${req.url} - ${req.failure?.errorText}`);
        });

        expect(failedRequests.length).toBe(0);
    });

});

console.log('🎯 Test suite ready to run!');
console.log('Run with: npx playwright test');
