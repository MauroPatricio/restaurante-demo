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
    // CLASSE 1 – Meios Financeiros Líquidos
    // ─────────────────────────────────────────────
    { code: '11', name: 'Caixa', type: 'asset', class: 1, nature: 'debit', isGroup: true, description: 'Dinheiro físico em caixa' },
    { code: '111', name: 'Caixa Central', type: 'asset', class: 1, nature: 'debit', parentCode: '11', description: 'Caixa central do estabelecimento' },
    { code: '112', name: 'Fundos Fixos de Maneio (Trocos)', type: 'asset', class: 1, nature: 'debit', parentCode: '11', description: 'Fundo de troco permanente' },

    { code: '12', name: 'Bancos', type: 'asset', class: 1, nature: 'debit', isGroup: true, description: 'Depósitos bancários' },
    { code: '121', name: 'Depósitos à Ordem', type: 'asset', class: 1, nature: 'debit', parentCode: '12', description: 'Contas bancárias à ordem (BCI, BIM, Absa, etc.)' },

    { code: '13', name: 'Carteiras Móveis (M-Pesa / e-Mola)', type: 'asset', class: 1, nature: 'debit', description: 'Saldo em carteiras de dinheiro móvel' },

    // ─────────────────────────────────────────────
    // CLASSE 2 – Terceiros (Receivables & Payables)
    // ─────────────────────────────────────────────
    { code: '21', name: 'Clientes', type: 'asset', class: 2, nature: 'debit', isGroup: true, description: 'Valores a receber de clientes' },
    { code: '211', name: 'Clientes c/c', type: 'asset', class: 2, nature: 'debit', parentCode: '21', description: 'Clientes em conta corrente' },
    { code: '212', name: 'Clientes – Títulos a Receber', type: 'asset', class: 2, nature: 'debit', parentCode: '21' },
    { code: '218', name: 'Clientes de Cobrança Duvidosa', type: 'asset', class: 2, nature: 'debit', parentCode: '21' },

    { code: '22', name: 'Fornecedores', type: 'liability', class: 2, nature: 'credit', isGroup: true, description: 'Valores a pagar a fornecedores' },
    { code: '221', name: 'Fornecedores c/c', type: 'liability', class: 2, nature: 'credit', parentCode: '22', description: 'Fornecedores em conta corrente' },
    { code: '228', name: 'Fornecedores – Facturas em Recepção e Conferência', type: 'liability', class: 2, nature: 'credit', parentCode: '22' },

    // IVA e Estado
    { code: '24', name: 'Estado e Outros Entes Públicos', type: 'liability', class: 2, nature: 'credit', isGroup: true, description: 'Obrigações fiscais com o Estado de Moçambique' },
    { code: '241', name: 'Imposto sobre o Rendimento (IRPC/IRPS)', type: 'liability', class: 2, nature: 'credit', parentCode: '24' },
    { code: '243', name: 'Imposto sobre o Valor Acrescentado (IVA – 16%)', type: 'liability', class: 2, nature: 'credit', isGroup: true, parentCode: '24', description: 'Conta-mãe para contas de IVA (taxa 16% – Lei 32/2007)' },
    { code: '2432', name: 'IVA Dedutível', type: 'asset', class: 2, nature: 'debit', isTaxAccount: true, parentCode: '243', description: 'IVA suportado nas compras (recuperável)' },
    { code: '2433', name: 'IVA Liquidado', type: 'liability', class: 2, nature: 'credit', isTaxAccount: true, parentCode: '243', description: 'IVA cobrado nas vendas (a entregar ao Estado)' },
    { code: '2434', name: 'IVA a Recuperar', type: 'asset', class: 2, nature: 'debit', isTaxAccount: true, parentCode: '243', description: 'Saldo credor do IVA Dedutível > Liquidado' },
    { code: '2435', name: 'IVA a Pagar', type: 'liability', class: 2, nature: 'credit', isTaxAccount: true, parentCode: '243', description: 'Saldo devedor após apuramento (IVA Liquidado > Dedutível)' },
    { code: '2436', name: 'IVA – Apuramento', type: 'liability', class: 2, nature: 'credit', isTaxAccount: true, parentCode: '243', description: 'Conta utilizada no apuramento mensal de IVA' },

    { code: '25', name: 'Trabalhadores – Remunerações a Pagar', type: 'liability', class: 2, nature: 'credit', description: 'Salários e ordenados por pagar ao pessoal' },
    { code: '26', name: 'Accionistas / Sócios', type: 'equity', class: 2, nature: 'credit', description: 'Relações com os sócios da empresa' },

    // ─────────────────────────────────────────────
    // CLASSE 3 – Inventários e Activos Biológicos
    // ─────────────────────────────────────────────
    { code: '31', name: 'Mercadorias (Bebidas, Comida Embalada)', type: 'asset', class: 3, nature: 'debit', description: 'Stock de mercadorias para revenda' },
    { code: '32', name: 'Matérias-Primas (Ingredientes de Cozinha)', type: 'asset', class: 3, nature: 'debit', description: 'Matérias-primas consumidas na produção de refeições' },
    { code: '33', name: 'Produtos Acabados (Pratos Confeccionados)', type: 'asset', class: 3, nature: 'debit', description: 'Refeições prontas a servir' },

    // ─────────────────────────────────────────────
    // CLASSE 4 – Investimentos e Activos Fixos
    // ─────────────────────────────────────────────
    { code: '41', name: 'Activos Tangíveis – Mobiliário e Equipamentos', type: 'asset', class: 4, nature: 'debit', description: 'Mesas, cadeiras, equipamentos de cozinha, etc.' },
    { code: '42', name: 'Activos Intangíveis (Software, Licenças)', type: 'asset', class: 4, nature: 'debit', description: 'Activos intangíveis como software e licenças' },
    { code: '43', name: 'Amortizações Acumuladas', type: 'asset', class: 4, nature: 'credit', description: 'Conta contra-activo para depreciação acumulada' },

    // ─────────────────────────────────────────────
    // CLASSE 5 – Capital Próprio
    // ─────────────────────────────────────────────
    { code: '51', name: 'Capital Social', type: 'equity', class: 5, nature: 'credit', description: 'Capital subscrito pelos sócios/accionistas' },
    { code: '55', name: 'Reservas', type: 'equity', class: 5, nature: 'credit', description: 'Reservas legais e outras reservas' },
    { code: '56', name: 'Resultados Transitados', type: 'equity', class: 5, nature: 'credit', description: 'Resultados de anos anteriores não distribuídos' },
    { code: '59', name: 'Resultado Líquido do Exercício', type: 'equity', class: 5, nature: 'credit', description: 'Lucro ou prejuízo do período actual' },

    // ─────────────────────────────────────────────
    // CLASSE 6 – Gastos e Perdas
    // ─────────────────────────────────────────────
    { code: '61', name: 'Custo das Mercadorias Vendidas (CMV)', type: 'expense', class: 6, nature: 'debit', description: 'Custo do stock consumido nas vendas (COGS)' },
    { code: '62', name: 'Gastos com o Pessoal', type: 'expense', class: 6, nature: 'debit', isGroup: true, description: 'Todos os encargos com trabalhadores' },
    { code: '621', name: 'Remunerações', type: 'expense', class: 6, nature: 'debit', parentCode: '62', description: 'Salários e ordenados brutos' },
    { code: '622', name: 'Encargos sobre Remunerações (INSS)', type: 'expense', class: 6, nature: 'debit', parentCode: '62', description: 'Contribuições para o INSS (entidade empregadora 4%)' },

    { code: '63', name: 'Fornecimentos e Serviços de Terceiros (FSE)', type: 'expense', class: 6, nature: 'debit', isGroup: true, description: 'Bens e serviços fornecidos por terceiros' },
    { code: '632', name: 'Fornecimentos – Água, Energia, Combustíveis', type: 'expense', class: 6, nature: 'debit', parentCode: '63' },
    { code: '633', name: 'Serviços Especializados (Contabilidade, IT)', type: 'expense', class: 6, nature: 'debit', parentCode: '63' },
    { code: '634', name: 'Alugueres e Rendas', type: 'expense', class: 6, nature: 'debit', parentCode: '63' },
    { code: '635', name: 'Comunicações (Internet, Telefone)', type: 'expense', class: 6, nature: 'debit', parentCode: '63' },
    { code: '638', name: 'Marketing e Publicidade', type: 'expense', class: 6, nature: 'debit', parentCode: '63' },
    { code: '639', name: 'Outros FSE', type: 'expense', class: 6, nature: 'debit', parentCode: '63' },

    { code: '64', name: 'Impostos e Taxas', type: 'expense', class: 6, nature: 'debit', description: 'Impostos sobre actividade (excluindo IVA e IRPC)' },
    { code: '68', name: 'Outros Gastos e Perdas', type: 'expense', class: 6, nature: 'debit', description: 'Outros gastos não categorizados' },

    // ─────────────────────────────────────────────
    // CLASSE 7 – Rendimentos e Ganhos
    // ─────────────────────────────────────────────
    { code: '71', name: 'Vendas', type: 'revenue', class: 7, nature: 'credit', isGroup: true, description: 'Rendimentos de vendas de produtos e refeições' },
    { code: '711', name: 'Venda de Refeições / Restaurante', type: 'revenue', class: 7, nature: 'credit', parentCode: '71', description: 'Receita de venda de pratos e menus' },
    { code: '712', name: 'Venda de Bebidas', type: 'revenue', class: 7, nature: 'credit', parentCode: '71', description: 'Receita de venda de bebidas' },
    { code: '713', name: 'Venda de Mercadorias e Produtos', type: 'revenue', class: 7, nature: 'credit', parentCode: '71', description: 'Receita de venda de outros produtos' },

    { code: '72', name: 'Prestações de Serviços', type: 'revenue', class: 7, nature: 'credit', isGroup: true, description: 'Rendimentos de serviços prestados' },
    { code: '721', name: 'Serviço de Delivery / Taxas de Entrega', type: 'revenue', class: 7, nature: 'credit', parentCode: '72', description: 'Taxas cobradas por serviço de entrega ao domicílio' },
    { code: '722', name: 'Serviço de Catering / Eventos', type: 'revenue', class: 7, nature: 'credit', parentCode: '72', description: 'Receita de eventos e catering externo' },
    { code: '723', name: 'Serviço de Room Service', type: 'revenue', class: 7, nature: 'credit', parentCode: '72', description: 'Receita de serviço aos quartos (se hoteleiro)' },

    { code: '75', name: 'Subsídios, Donativos e Legados à Exploração', type: 'revenue', class: 7, nature: 'credit', description: 'Subsídios e apoios recebidos' },
    { code: '78', name: 'Outros Rendimentos e Ganhos', type: 'revenue', class: 7, nature: 'credit', description: 'Rendimentos não classificáveis noutras contas' },

    // ─────────────────────────────────────────────
    // CLASSE 8 – Resultados
    // ─────────────────────────────────────────────
    { code: '81', name: 'Resultado Líquido do Período', type: 'equity', class: 8, nature: 'credit', description: 'Apuramento do resultado líquido (Cr = Lucro, Db = Prejuízo)' }
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
