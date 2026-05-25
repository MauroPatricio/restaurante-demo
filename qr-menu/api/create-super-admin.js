import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Compatibilidade de caminhos no ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

// Importar bcrypt dinamicamente (suporta bcrypt ou bcryptjs)
let bcrypt;
try {
    bcrypt = (await import('bcrypt')).default || await import('bcrypt');
} catch (err) {
    try {
        bcrypt = (await import('bcryptjs')).default || await import('bcryptjs');
    } catch (err2) {
        console.error("❌ O pacote bcrypt/bcryptjs não foi encontrado. Execute 'npm install bcrypt' primeiro.");
        process.exit(1);
    }
}

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/qr-menu';

async function createSuperAdmin() {
    try {
        console.log('⏳ A ligar à base de dados MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado com sucesso!');

        // Importação dinâmica dos modelos
        const User = (await import('./src/models/User.js')).default;
        const Role = (await import('./src/models/Role.js')).default;
        const UserRestaurantRole = (await import('./src/models/UserRestaurantRole.js')).default;

        // 1. Verificar ou criar o Cargo de System Admin
        let adminRole = await Role.findOne({ name: 'System Admin' });
        if (!adminRole) {
            adminRole = new Role({
                name: 'System Admin',
                isSystem: true,
                permissions: ['all'],
                description: 'Acesso total à plataforma SaaS'
            });
            await adminRole.save();
            console.log('✅ Cargo "System Admin" criado na base de dados.');
        }

        const adminEmail = 'admin@nhiquelaservicos.com';
        const adminPassword = 'Admin@123456';

        // 2. Verificar ou criar o Utilizador
        let adminUser = await User.findOne({ email: adminEmail });
        if (adminUser) {
            console.log('⚠️ O utilizador Super Admin já existe. A repor a senha e permissões...');
        } else {
            adminUser = new User({
                name: 'Administração Nhiquela',
                email: adminEmail,
                phone: '+258840000000', // Campo obrigatório
                active: true,
                isEmailVerified: true
            });
        }

        // ATENÇÃO: O Model User.js já tem um hook pre('save') que faz o hash automaticamente!
        // Passamos a senha em texto limpo para evitar a "dupla encriptação".
        adminUser.password = adminPassword;
        adminUser.isDefaultPassword = true; // Força o redirecionamento para alterar a senha

        await adminUser.save();

        // 3. Atribuir o papel global através da nova tabela relacional (UserRestaurantRole)
        let userRole = await UserRestaurantRole.findOne({ user: adminUser._id, role: adminRole._id });
        if (!userRole) {
            await UserRestaurantRole.create({
                user: adminUser._id,
                role: adminRole._id,
                active: true
            });
        }

        console.log('\n🎉 SUPER ADMIN CRIADO COM SUCESSO! 🎉');
        console.log('--------------------------------------------------');
        console.log(`📧 E-mail: ${adminEmail}`);
        console.log(`🔑 Senha:  ${adminPassword}`);
        console.log('--------------------------------------------------\n');
        console.log('👉 Utilize estas credenciais para aceder ao portal.');

    } catch (error) {
        console.error('\n❌ Erro fatal ao criar o Super Admin:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Ligação encerrada.');
        process.exit(0);
    }
}

createSuperAdmin();