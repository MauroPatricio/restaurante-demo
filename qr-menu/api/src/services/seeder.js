import Role from '../models/Role.js';

export const seedRoles = async () => {
    try {
        const roles = [
            {
                name: 'Owner',
                description: 'Full access to all restaurant resources',
                permissions: ['all'],
                isSystem: true
            },
            {
                name: 'Admin',
                description: 'Access to everything except subscription/payment settings',
                permissions: ['manage_menu', 'manage_tables', 'manage_orders', 'manage_staff', 'view_reports'],
                isSystem: true
            },
            {
                name: 'Manager',
                description: 'Can manage operations but not configuration',
                permissions: ['manage_menu', 'manage_tables', 'manage_orders', 'manage_staff'],
                isSystem: true
            },
            {
                name: 'Waiter',
                description: 'Can manage orders and tables',
                permissions: ['take_orders', 'manage_tables'],
                isSystem: true
            },
            {
                name: 'Kitchen',
                description: 'Can view and update order status',
                permissions: ['view_orders', 'update_order_status'],
                isSystem: true
            },
            {
                name: 'Delivery',
                description: 'Delivery personnel access',
                permissions: ['view_delivery_orders', 'update_delivery_status'],
                isSystem: true
            }
        ];

        for (const role of roles) {
            await Role.findOneAndUpdate(
                { name: role.name, isSystem: true },
                role,
                { upsert: true, new: true }
            );
        }
        console.log('✓ Roles seeded successfully');

        await migrateUsers(roles);

    } catch (error) {
        console.error('Role seeding error:', error);
    }
};

const migrateUsers = async (rolesList) => {
    try {
        // Use native collection to bypass schema validation for legacy string roles
        const User = (await import('../models/User.js')).default;
        const users = await User.collection.find({}).toArray();

        let migratedCount = 0;

        for (const user of users) {
            // Check if role is a string (legacy)
            if (typeof user.role === 'string') {
                // Find matching role document (case insensitive)
                const roleName = user.role.charAt(0).toUpperCase() + user.role.slice(1);
                // Mapping specific known legacy lowercase to Proper Case
                // 'owner', 'admin', 'manager', 'waiter', 'kitchen', 'delivery'
                const targetRole = await Role.findOne({
                    name: { $regex: new RegExp(`^${user.role}$`, 'i') }
                });

                if (targetRole) {
                    await User.collection.updateOne(
                        { _id: user._id },
                        { $set: { role: targetRole._id } }
                    );
                    migratedCount++;
                } else {
                    console.warn(`Could not find matching role for user ${user.email} (role: ${user.role})`);
                }
            }
        }

        if (migratedCount > 0) {
            console.log(`✓ Migrated ${migratedCount} users to new Role schema`);
        }

    } catch (error) {
        console.error('User migration error:', error);
    }
};
