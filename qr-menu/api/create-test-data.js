/**
 * Script de Teste E2E Automatizado
 * 
 * Este script cria automaticamente:
 * - 1 Restaurante de teste
 * - 3 Categorias (Entradas, Principais, Bebidas)
 * - 6 Items de menu
 * - 1 Mesa com QR Code
 * 
 * E gera o link pronto para testar!
 */

import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Cores para console
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

const log = {
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    link: (msg) => console.log(`${colors.cyan}🔗 ${msg}${colors.reset}`)
};

async function createTestData() {
    try {
        log.info('Iniciando criação de dados de teste...\n');

        // 1. Criar usuário e fazer login
        log.info('1/6 - Criando usuário de teste...');
        const userData = {
            name: 'Demo User',
            email: `demo${Date.now()}@test.com`,
            password: 'Demo@123',
            phone: '+258841234567'
        };

        const registerRes = await axios.post(`${API_URL}/auth/register`, userData);
        const token = registerRes.data.token;
        log.success(`Usuário criado: ${userData.email}`);

        // 2. Criar restaurante
        log.info('2/6 - Criando restaurante...');
        const timestamp = Date.now();
        const restaurantData = {
            name: 'Restaurante Demo E2E',
            email: `restaurante${timestamp}@demo.com`,
            phone: '+258847778888',
            address: 'Av. Julius Nyerere, Maputo',
            currency: 'MZN',
            timezone: 'Africa/Maputo'
        };

        const restaurantRes = await axios.post(`${API_URL}/restaurants`, restaurantData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const restaurantId = restaurantRes.data.restaurant.id;
        log.success(`Restaurante criado: ${restaurantData.name} (ID: ${restaurantId})`);

        // Selecionar restaurante
        const selectRes = await axios.post(`${API_URL}/auth/select-restaurant`,
            { restaurantId },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const scopedToken = selectRes.data.token;

        // 3. Criar categorias
        log.info('3/6 - Criando categorias...');
        const categories = [
            { name: 'Entradas', description: 'Aperitivos e entradas' },
            { name: 'Pratos Principais', description: 'Pratos principais' },
            { name: 'Bebidas', description: 'Bebidas e sucos' }
        ];

        const categoryIds = [];
        for (const cat of categories) {
            const res = await axios.post(`${API_URL}/categories`,
                { ...cat, restaurant: restaurantId },
                { headers: { Authorization: `Bearer ${scopedToken}` } }
            );
            categoryIds.push(res.data.category._id);
            log.success(`  - ${cat.name} criada`);
        }

        // 4. Criar items de menu
        log.info('4/6 - Criando items de menu...');
        const menuItems = [
            {
                name: 'Salada Caesar',
                description: 'Alface, croutons, parmesão e molho caesar',
                category: categoryIds[0],
                price: 250,
                prepTimeMinutes: 10,
                available: true
            },
            {
                name: 'Bruschetta',
                description: 'Pão italiano com tomate, manjericão e azeite',
                category: categoryIds[0],
                price: 180,
                prepTimeMinutes: 8,
                available: true
            },
            {
                name: 'Pizza Margherita',
                description: 'Molho de tomate, mozzarella e manjericão',
                category: categoryIds[1],
                price: 450,
                prepTimeMinutes: 20,
                available: true
            },
            {
                name: 'Frango Grelhado',
                description: 'Peito de frango grelhado com legumes',
                category: categoryIds[1],
                price: 380,
                prepTimeMinutes: 25,
                available: true
            },
            {
                name: 'Coca-Cola 500ml',
                description: 'Refrigerante gelado',
                category: categoryIds[2],
                price: 50,
                prepTimeMinutes: 2,
                available: true
            },
            {
                name: 'Suco Natural',
                description: 'Suco natural de frutas da época',
                category: categoryIds[2],
                price: 80,
                prepTimeMinutes: 5,
                available: true
            }
        ];

        for (const item of menuItems) {
            await axios.post(`${API_URL}/menu-items`,
                { ...item, restaurant: restaurantId },
                { headers: { Authorization: `Bearer ${scopedToken}` } }
            );
            log.success(`  - ${item.name} (${item.price} MZN)`);
        }

        // 5. Criar mesa com QR Code
        log.info('5/6 - Criando mesa com QR Code...');
        const tableData = {
            restaurant: restaurantId,
            number: 1,
            capacity: 4,
            location: 'Área Principal',
            type: 'Quadrada'
        };

        const tableRes = await axios.post(`${API_URL}/tables`, tableData, {
            headers: { Authorization: `Bearer ${scopedToken}` }
        });
        const tableId = tableRes.data.table._id;
        log.success(`Mesa ${tableData.number} criada com QR Code`);

        // 6. Gerar links
        log.info('6/6 - Gerando links de acesso...\n');

        console.log('\n' + '='.repeat(70));
        console.log('🎉  DADOS DE TESTE CRIADOS COM SUCESSO!');
        console.log('='.repeat(70) + '\n');

        console.log('📋 INFORMAÇÕES DO TESTE:\n');
        console.log(`   Restaurante: ${restaurantData.name}`);
        console.log(`   ID: ${restaurantId}`);
        console.log(`   Mesa: ${tableData.number}`);
        console.log(`   Items no Menu: ${menuItems.length}`);
        console.log(`   Categorias: ${categories.length}\n`);

        console.log('🔐 CREDENCIAIS DE LOGIN:\n');
        console.log(`   Email: ${userData.email}`);
        console.log(`   Senha: ${userData.password}\n`);

        console.log('🌐 LINKS PARA TESTAR:\n');

        log.link('Admin Dashboard:');
        console.log(`   http://localhost:5173\n`);

        log.link('Client Menu (via QR Code simulado):');
        console.log(`   http://localhost:5175/menu/${restaurantId}?table=${tableId}\n`);

        log.link('Client Menu (direto):');
        console.log(`   http://localhost:5175/menu/${restaurantId}\n`);

        console.log('='.repeat(70) + '\n');

        console.log('📝 PRÓXIMOS PASSOS:\n');
        console.log('1. Abra o Admin Dashboard em: http://localhost:5173');
        console.log(`2. Faça login com: ${userData.email} / ${userData.password}`);
        console.log('3. Explore o menu criado, visualize a mesa');
        console.log('4. Abra o Client Menu no link acima');
        console.log('5. Faça um pedido de teste');
        console.log('6. Veja o pedido aparecer no Admin em tempo real!\n');

        // Salvar informações em arquivo
        const testInfo = {
            timestamp: new Date().toISOString(),
            credentials: {
                email: userData.email,
                password: userData.password
            },
            ids: {
                restaurant: restaurantId,
                table: tableId,
                categories: categoryIds
            },
            links: {
                admin: 'http://localhost:5173',
                clientWithTable: `http://localhost:5175/menu/${restaurantId}?table=${tableId}`,
                clientDirect: `http://localhost:5175/menu/${restaurantId}`
            }
        };

        // Escrever arquivo com informações
        const fs = await import('fs');
        fs.writeFileSync('test-info.json', JSON.stringify(testInfo, null, 2));
        log.success('Informações salvas em: test-info.json\n');

        return testInfo;

    } catch (error) {
        log.error('Erro ao criar dados de teste:');
        console.error(error.response?.data || error.message);
        process.exit(1);
    }
}

// Executar
console.log('\n🚀 Script de Teste E2E Automatizado\n');
createTestData().then(() => {
    log.success('Script concluído com sucesso!');
    process.exit(0);
});
