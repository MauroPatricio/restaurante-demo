import express from 'express';
import currencyService from '../services/currencyService.js';

const router = express.Router();

router.get('/rates', async (req, res) => {
    try {
        const rates = await currencyService.getRates();
        res.json({ rates });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch currency rates' });
    }
});

router.get('/convert', async (req, res) => {
    try {
        const { amount, from, to } = req.query;
        if (!amount || !from || !to) {
            return res.status(400).json({ error: 'Missing parameters: amount, from, to' });
        }
        const converted = await currencyService.convert(Number(amount), from, to);
        res.json({ amount: Number(amount), from, to, converted });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
