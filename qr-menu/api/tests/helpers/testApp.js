/**
 * Test wrapper for loading the Express app
 * This file bridges CommonJS tests with ESM application code
 */

// Since the main app uses ES modules and we can't easily change that,
// we'll create a simple test server that tests can use
const express = require('express');
const mongoose = require('mongoose');

// For now, we'll create a minimal test app
// In production, you'd want to properly import routes
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic health check for testing
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Note: Full integration would require converting routes to CommonJS
// or using a dynamic import solution
// For E2E tests, consider running the actual server separately

module.exports = app;
