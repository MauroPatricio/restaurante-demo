import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Account from '../models/Account.js';
import Restaurant from '../models/Restaurant.js';

dotenv.config();

// PGC-NIRF Mozambique – Plano de Contas Completo
// nature: 'debit' = Ativos e Gastos (saldo normal a Débito)
//         'credit' = Passivos, Capital Próprio e Rendimentos (saldo normal a Crédito)
const PGC_ACCOUNTS = [
    // ─────────────────────────────────────────────
    // CLASSE 1 – MEIOS FINANCEIROS
    // ─────────────────────────────────────────────
    { code: '11', name: 'Caixa', type: 'asset', class: 1, nature: 'debit', isGroup: true, description: 'Dinheiro físico em caixa' },
    { code: '111', name: 'Caixa Geral', type: 'asset', class: 1, nature: 'debit', parentCode: '11' },
    { code: '12', name: 'Bancos', type: 'asset', class: 1, nature: 'debit', isGroup: true },
    { code: '121', name: 'Depósitos à ordem', type: 'asset', class: 1, nature: 'debit', parentCode: '12' },
    { code: '122', name: 'Depósitos com pré-aviso', type: 'asset', class: 1, nature: 'debit', parentCode: '12' },
    { code: '13', name: 'Outros instrumentos financeiros', type: 'asset', class: 1, nature: 'debit', isGroup: true },
    { code: '131', name: 'Carteiras Móveis (M-Pesa / e-Mola)', type: 'asset', class: 1, nature: 'debit', parentCode: '13' },

    // ─────────────────────────────────────────────
    // CLASSE 2 – INVENTÁRIOS E ACTIVOS BIOLÓGICOS
    // ─────────────────────────────────────────────
    { code: '21', name: 'Compras', type: 'asset', class: 2, nature: 'debit', isGroup: true },
    { code: '211', name: 'Mercadorias', type: 'asset', class: 2, nature: 'debit', parentCode: '21' },
    { code: '212', name: 'Matérias-primas, auxiliares e materiais', type: 'asset', class: 2, nature: 'debit', parentCode: '21' },
    { code: '22', name: 'Mercadorias', type: 'asset', class: 2, nature: 'debit', isGroup: true },
    { code: '221', name: 'Mercadorias em trânsito', type: 'asset', class: 2, nature: 'debit', parentCode: '22' },
    { code: '26', name: 'Matérias primas, auxiliares e materiais', type: 'asset', class: 2, nature: 'debit', isGroup: true },
    { code: '261', name: 'Matérias primas', type: 'asset', class: 2, nature: 'debit', parentCode: '26' },
    { code: '262', name: 'Produtos auxiliares', type: 'asset', class: 2, nature: 'debit', parentCode: '26' },
    { code: '263', name: 'Materiais', type: 'asset', class: 2, nature: 'debit', parentCode: '26' },

    // ─────────────────────────────────────────────
    // CLASSE 3 – INVESTIMENTOS DE CAPITAL
    // ─────────────────────────────────────────────
    { code: '32', name: 'Activos Tangíveis', type: 'asset', class: 3, nature: 'debit', isGroup: true },
    { code: '321', name: 'Construções', type: 'asset', class: 3, nature: 'debit', parentCode: '32' },
    { code: '322', name: 'Equipamento básico', type: 'asset', class: 3, nature: 'debit', parentCode: '32' },
    { code: '323', name: 'Equipamento de transporte', type: 'asset', class: 3, nature: 'debit', parentCode: '32' },
    { code: '324', name: 'Equipamento administrativo', type: 'asset', class: 3, nature: 'debit', parentCode: '32' },

    // ─────────────────────────────────────────────
    // CLASSE 4 – CONTAS A RECEBER, CONTAS A PAGAR...
    // ─────────────────────────────────────────────
    { code: '41', name: 'Clientes', type: 'asset', class: 4, nature: 'debit', isGroup: true },
    { code: '411', name: 'Clientes c/c', type: 'asset', class: 4, nature: 'debit', parentCode: '41' },
    { code: '42', name: 'Fornecedores', type: 'liability', class: 4, nature: 'credit', isGroup: true },
    { code: '421', name: 'Fornecedores c/c', type: 'liability', class: 4, nature: 'credit', parentCode: '42' },
    { code: '44', name: 'Estado', type: 'liability', class: 4, nature: 'credit', isGroup: true },
    { code: '443', name: 'IVA', type: 'liability', class: 4, nature: 'credit', isGroup: true, parentCode: '44' },
    { code: '4432', name: 'IVA Dedutível', type: 'asset', class: 4, nature: 'debit', isTaxAccount: true, parentCode: '443' },
    { code: '4433', name: 'IVA Liquidado', type: 'liability', class: 4, nature: 'credit', isTaxAccount: true, parentCode: '443' },
    { code: '4435', name: 'IVA a Pagar', type: 'liability', class: 4, nature: 'credit', isTaxAccount: true, parentCode: '443' },
    { code: '4436', name: 'IVA Apuramento', type: 'liability', class: 4, nature: 'credit', isTaxAccount: true, parentCode: '443' },
    { code: '46', name: 'Outros Devedores e Credores', type: 'liability', class: 4, nature: 'credit', isGroup: true },
    { code: '462', name: 'Pessoal', type: 'liability', class: 4, nature: 'credit', parentCode: '46', isGroup: true },
    { code: '4621', name: 'Remunerações a pagar', type: 'liability', class: 4, nature: 'credit', parentCode: '462' },

    // ─────────────────────────────────────────────
    // CLASSE 5 – CAPITAL PRÓPRIO
    // ─────────────────────────────────────────────
    { code: '51', name: 'Capital', type: 'equity', class: 5, nature: 'credit', isGroup: true },
    { code: '511', name: 'Capital Social', type: 'equity', class: 5, nature: 'credit', parentCode: '51' },
    { code: '59', name: 'Resultados Transitados', type: 'equity', class: 5, nature: 'credit' },

    // ─────────────────────────────────────────────
    // CLASSE 6 – GASTOS E PERDAS POR NATUREZA
    // ─────────────────────────────────────────────
    { code: '61', name: 'Custo dos inventários vendidos ou consumidos', type: 'expense', class: 6, nature: 'debit', isGroup: true },
    { code: '611', name: 'Custo das mercadorias vendidas ou consumidas', type: 'expense', class: 6, nature: 'debit', parentCode: '61' },
    { code: '62', name: 'Gastos com o pessoal', type: 'expense', class: 6, nature: 'debit', isGroup: true },
    { code: '621', name: 'Remunerações dos órgãos sociais', type: 'expense', class: 6, nature: 'debit', parentCode: '62' },
    { code: '622', name: 'Remunerações dos trabalhadores', type: 'expense', class: 6, nature: 'debit', parentCode: '62' },
    { code: '63', name: 'Fornecimentos e serviços de terceiros', type: 'expense', class: 6, nature: 'debit', isGroup: true },
    { code: '632', name: 'FSE – Água, Energia, Combustíveis', type: 'expense', class: 6, nature: 'debit', parentCode: '63' },
    { code: '635', name: 'FSE – Comunicações', type: 'expense', class: 6, nature: 'debit', parentCode: '63' },

    // ─────────────────────────────────────────────
    // CLASSE 7 – RENDIMENTOS E GANHOS POR NATUREZA
    // ─────────────────────────────────────────────
    { code: '71', name: 'Vendas', type: 'revenue', class: 7, nature: 'credit', isGroup: true },
    { code: '711', name: 'Venda de Refeições / Restaurante', type: 'revenue', class: 7, nature: 'credit', parentCode: '71' },
    { code: '712', name: 'Venda de Bebidas', type: 'revenue', class: 7, nature: 'credit', parentCode: '71' },
    { code: '72', name: 'Prestação de serviços', type: 'revenue', class: 7, nature: 'credit', isGroup: true },
    { code: '721', name: 'Serviços de Delivery', type: 'revenue', class: 7, nature: 'credit', parentCode: '72' },

    // ─────────────────────────────────────────────
    // CLASSE 8 – RESULTADOS
    // ─────────────────────────────────────────────
    { code: '81', name: 'Resultado Líquido do Período', type: 'equity', class: 8, nature: 'credit' }
];

async function seedPGCNIRF() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Ligação ao MongoDB estabelecida. A iniciar seeding PGC-NIRF...\n');

        const restaurantId = process.argv[2];
        if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
            console.error('❌ ERRO: Deve fornecer um ID de restaurante válido como argumento.');
            console.log('Uso: node seed_pgc_nirf.js <RestaurantID>');
            process.exit(1);
        }

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            console.error('❌ Restaurante não encontrado!');
            process.exit(1);
        }

        console.log(`🏢 A criar contas para: ${restaurant.name} (${restaurantId})\n`);

        const createdAccounts = {};

        for (const data of PGC_ACCOUNTS) {
            let parentId = null;
            if (data.parentCode && createdAccounts[data.parentCode]) {
                parentId = createdAccounts[data.parentCode];
            }

            const accountFilter = { restaurant: restaurantId, code: data.code };
            const accountPayload = {
                restaurant: restaurantId,
                code: data.code,
                name: data.name,
                type: data.type,
                nature: data.nature || (data.type === 'asset' || data.type === 'expense' ? 'debit' : 'credit'),
                description: data.description || '',
                class: data.class,
                isGroup: data.isGroup || false,
                isTaxAccount: data.isTaxAccount || false,
                parent: parentId,
                active: true,
                costCenter: 'Geral'
            };

            const updatedAccount = await Account.findOneAndUpdate(
                accountFilter,
                accountPayload,
                { new: true, upsert: true }
            );

            createdAccounts[data.code] = updatedAccount._id;
            console.log(`  [${data.nature === 'debit' ? 'D' : 'C'}] ${updatedAccount.code.padEnd(6)} – ${updatedAccount.name}`);
        }

        console.log(`\n✅ Seeding PGC-NIRF concluído! ${PGC_ACCOUNTS.length} contas processadas.`);
        console.log('ℹ️  IVA: 16% conforme Lei 32/2007 de Moçambique.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro durante o seeding:', error);
        process.exit(1);
    }
}

seedPGCNIRF();
