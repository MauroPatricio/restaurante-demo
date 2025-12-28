// Script para regenerar QR Code da Mesa 1 com URL correta
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Table from './src/models/Table.js';
import QRCode from 'qrcode';
import { generateQRCodeUrl } from './src/utils/qrSecurity.js';

dotenv.config();

async function regenerateQRCode() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find Mesa 1 without populate
        const table = await Table.findOne({ number: 1 });

        if (!table) {
            console.log('❌ Mesa 1 not found!');
            process.exit(1);
        }

        console.log(`📍 Mesa 1 found (ID: ${table._id})`);
        console.log(`   Restaurant ID: ${table.restaurant}`);

        // Generate new QR Code URL
        const qrUrl = generateQRCodeUrl(table.restaurant.toString(), table._id.toString());
        console.log(`\n🔗 New QR URL: ${qrUrl}`);

        // Generate QR Code image
        const qrCode = await QRCode.toDataURL(qrUrl);

        // Update table with new QR Code
        table.qrCode = qrCode;
        await table.save();

        console.log(`✅ QR Code regenerated successfully!`);
        console.log(`\n📱 Refresh Admin Dashboard and scan the new QR code from Tables > Mesa 1`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

regenerateQRCode();
