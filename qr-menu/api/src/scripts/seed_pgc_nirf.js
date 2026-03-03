import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Account from '../models/Account.js';
import Restaurant from '../models/Restaurant.js';

dotenv.config();

// PGC-NIRF Mozambique Base Chart of Accounts
const PGC_ACCOUNTS = [
    // CLASSE 1 (Meios Financeiros)
    { code: '11', name: 'Caixa', type: 'asset', class: 1, isGroup: true },
    { code: '111', name: 'Caixa Central', type: 'asset', class: 1, parentCode: '11' },
    { code: '112', name: 'Fundos Fixos de Maneio (Trocos)', type: 'asset', class: 1, parentCode: '11' },

    { code: '12', name: 'Bancos', type: 'asset', class: 1, isGroup: true },
    { code: '121', name: 'Depósitos à Ordem', type: 'asset', class: 1, parentCode: '12' },
    { code: '13', name: 'Carteiras Móveis (M-Pesa / e-Mola)', type: 'asset', class: 1 },

    // CLASSE 2 (Contas a Receber e a Pagar / Third Parties)
    { code: '21', name: 'Clientes', type: 'asset', class: 2, isGroup: true },
    { code: '211', name: 'Clientes c/c', type: 'asset', class: 2, parentCode: '21' },
    { code: '212', name: 'Clientes - Títulos a Receber', type: 'asset', class: 2, parentCode: '21' },
    { code: '218', name: 'Clientes de Cobrança Duvidosa', type: 'asset', class: 2, parentCode: '21' },

    { code: '22', name: 'Fornecedores', type: 'liability', class: 2, isGroup: true },
    { code: '221', name: 'Fornecedores c/c', type: 'liability', class: 2, parentCode: '22' },

    // Taxes (Estado) 
    { code: '24', name: 'Estado', type: 'liability', class: 2, isGroup: true },
    { code: '243', name: 'Imposto sobre o Valor Acrescentado (IVA)', type: 'liability', class: 2, isGroup: true, parentCode: '24' },
    { code: '2432', name: 'IVA Dedutível', type: 'asset', class: 2, isTaxAccount: true, parentCode: '243' },
    { code: '2433', name: 'IVA Liquidado', type: 'liability', class: 2, isTaxAccount: true, parentCode: '243' },
    { code: '2434', name: 'IVA a Recuperar', type: 'asset', class: 2, isTaxAccount: true, parentCode: '243' },
    { code: '2435', name: 'IVA a Pagar', type: 'liability', class: 2, isTaxAccount: true, parentCode: '243' },
    { code: '2436', name: 'IVA - Apuramento', type: 'liability', class: 2, isTaxAccount: true, parentCode: '243' },

    { code: '25', name: 'Trabalhadores (Vencimentos a Pagar)', type: 'liability', class: 2 },

    // CLASSE 3 (Inventários e Ativos Biológicos)
    { code: '31', name: 'Mercadorias (Bebidas, Comida Embalada)', type: 'asset', class: 3 },
    { code: '32', name: 'Matérias-Primas (Ingredientes Cozinha)', type: 'asset', class: 3 },
    { code: '33', name: 'Produtos Acabados (Pratos Confecionados)', type: 'asset', class: 3 },

    // CLASSE 4 (Investimentos de Capital)
    { code: '41', name: 'Ativos Tangíveis (Mobiliário, Equipamentos)', type: 'asset', class: 4 },

    // CLASSE 5 (Capital Próprio)
    { code: '51', name: 'Capital Social', type: 'equity', class: 5 },
    { code: '59', name: 'Resultados Transitados', type: 'equity', class: 5 },
    { code: '81', name: 'Resultado Líquido do Período', type: 'equity', class: 8 },

    // CLASSE 6 (Gastos e Perdas)
    { code: '61', name: 'Custo das Mercadorias Vendidas (CMV)', type: 'expense', class: 6 },
    { code: '62', name: 'Gastos com Pessoal (Salários)', type: 'expense', class: 6 },
    { code: '63', name: 'Fornecimentos e Serviços de Terceiros (FSE)', type: 'expense', class: 6, isGroup: true },
    { code: '632', name: 'Fornecimentos (Água, Energia, Combustíveis)', type: 'expense', class: 6, parentCode: '63' },
    { code: '633', name: 'Serviços Especializados (Contabilidade, IT)', type: 'expense', class: 6, parentCode: '63' },
    { code: '634', name: 'Alugueres e Rendas', type: 'expense', class: 6, parentCode: '63' },
    { code: '638', name: 'Marketing e Publicidade', type: 'expense', class: 6, parentCode: '63' },
    { code: '639', name: 'Outros FSE', type: 'expense', class: 6, parentCode: '63' },
    { code: '64', name: 'Impostos e Taxas', type: 'expense', class: 6 },

    // CLASSE 7 (Rendimentos e Ganhos)
    { code: '71', name: 'Vendas', type: 'revenue', class: 7, isGroup: true },
    { code: '711', name: 'Venda de Refeições / Restaurante', type: 'revenue', class: 7, parentCode: '71' },
    { code: '712', name: 'Venda de Bebidas', type: 'revenue', class: 7, parentCode: '71' },
    { code: '72', name: 'Prestações de Serviços', type: 'revenue', class: 7, isGroup: true },
    { code: '721', name: 'Serviço de Delivery / Taxas de Entrega', type: 'revenue', class: 7, parentCode: '72' },
    { code: '722', name: 'Serviço de Catering / Eventos', type: 'revenue', class: 7, parentCode: '72' },
    { code: '78', name: 'Outros Rendimentos', type: 'revenue', class: 7 }
];

async function seedPGCNIRF() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB. Starting PGC-NIRF Seeding...');

        // Verify restaurant target
        const restaurantId = process.argv[2];
        if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
            console.error('CRITICAL: You must provide a valid Restaurant ID as an argument.');
            console.log('Usage: node seed_pgc_nirf.js <RestaurantID>');
            process.exit(1);
        }

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            console.error('Restaurant not found!');
            process.exit(1);
        }

        console.log(`Seeding PGC-NIRF Accounts for Restaurant: ${restaurant.name} (${restaurantId})`);

        // Track created accounts to assign parents quickly
        const createdAccounts = {};

        for (const data of PGC_ACCOUNTS) {
            let parentId = null;
            if (data.parentCode && createdAccounts[data.parentCode]) {
                parentId = createdAccounts[data.parentCode];
            }

            // Upsert Logic (Update if exists, insert if new)
            const accountFilter = { restaurant: restaurantId, code: data.code };
            const accountPayload = {
                restaurant: restaurantId,
                code: data.code,
                name: data.name,
                type: data.type,
                class: data.class,
                isGroup: data.isGroup || false,
                isTaxAccount: data.isTaxAccount || false,
                parent: parentId,
                active: true,
                costCenter: 'Geral' // Defaulting everything to Geral, can be changed later
            };

            const updatedAccount = await Account.findOneAndUpdate(
                accountFilter,
                accountPayload,
                { new: true, upsert: true }
            );

            createdAccounts[data.code] = updatedAccount._id;
            console.log(`[OK] PGC-NIRF Account: ${updatedAccount.code} - ${updatedAccount.name}`);
        }

        console.log('\n✅ PGC-NIRF Seeding Completed Successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error during seeding:', error);
        process.exit(1);
    }
}

seedPGCNIRF();
