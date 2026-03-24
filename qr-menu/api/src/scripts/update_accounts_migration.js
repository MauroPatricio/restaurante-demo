import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Account from '../models/Account.js';
import Restaurant from '../models/Restaurant.js';

dotenv.config();

/**
 * Migration script to update Chart of Accounts for a restaurant.
 * 1. Delete accounts: 24, 243, 2432, 2433, 2434, 2435, 2436, 25
 * 2. Update account 64 description to "Perdas por Imparidade do Periodo"
 * 3. Add accounts: 65, 66, 68, 69
 */
async function migrate() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const r = await Restaurant.findOne({});
        if (!r) {
            console.log('No restaurant found');
            process.exit(0);
        }
        const restaurantId = r._id;
        console.log('Migrating accounts for Restaurant ID:', restaurantId);

        // 1. Delete specified accounts
        const codesToDelete = ['24', '243', '2432', '2433', '2434', '2435', '2436', '25'];
        const deleteResult = await Account.deleteMany({
            restaurant: restaurantId,
            code: { $in: codesToDelete }
        });
        console.log(`Deleted ${deleteResult.deletedCount} accounts.`);

        // 2. Update account 64 description
        const updateResult = await Account.updateOne(
            { restaurant: restaurantId, code: '64' },
            { $set: { name: 'Perdas por Imparidade do Periodo', description: 'Perdas por Imparidade do Periodo' } }
        );
        if (updateResult.matchedCount > 0) {
            console.log('Updated account 64 description.');
        } else {
            console.log('Account 64 not found, creating it...');
            await Account.create({
                restaurant: restaurantId,
                code: '64',
                name: 'Perdas por Imparidade do Periodo',
                type: 'expense',
                nature: 'debit',
                class: 6,
                active: true,
                balance: 0
            });
        }

        // 3. Add new accounts
        const newAccounts = [
            { code: '65', name: 'Perdas por Reduções de Justo Valor', type: 'expense', nature: 'debit', class: 6 },
            { code: '66', name: 'Perdas por Provisões do Periodo', type: 'expense', nature: 'debit', class: 6 },
            { code: '68', name: 'Outros Gastos e Perdas Operacionais', type: 'expense', nature: 'debit', class: 6 },
            { code: '69', name: 'Gastos e Perdas Financeiras', type: 'expense', nature: 'debit', class: 6 }
        ];

        for (const acc of newAccounts) {
            const existing = await Account.findOne({ restaurant: restaurantId, code: acc.code });
            if (!existing) {
                await Account.create({
                    ...acc,
                    restaurant: restaurantId,
                    active: true,
                    balance: 0
                });
                console.log(`Added account ${acc.code} - ${acc.name}`);
            } else {
                console.log(`Account ${acc.code} already exists.`);
            }
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

migrate();
