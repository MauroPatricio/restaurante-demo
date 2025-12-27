/**
 * Criar usuário admin simples
 */

import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

async function createAdminUser() {
    try {
        console.log('🔧 Criando usuário admin...\n');

        const userData = {
            name: 'Admin Demo',
            email: 'admin@demo.com',
            password: 'Admin@123',
            phone: '+258841111111'
        };

        const response = await axios.post(`${API_URL}/auth/register`, userData);

        console.log('✅ Usuário criado com sucesso!\n');
        console.log('📋 CREDENCIAIS:\n');
        console.log(`   Email: ${userData.email}`);
        console.log(`   Senha: ${userData.password}\n`);
        console.log('🔗 Login em: http://localhost:5173\n');

    } catch (error) {
        if (error.response?.data?.error?.includes('already exists')) {
            console.log('ℹ️  Usuário já existe!\n');
            console.log('📋 Use as credenciais:\n');
            console.log('   Email: admin@demo.com');
            console.log('   Senha: Admin@123\n');
            console.log('🔗 Login em: http://localhost:5173\n');
        } else {
            console.error('❌ Erro:', error.response?.data || error.message);
        }
    }
}

createAdminUser();
