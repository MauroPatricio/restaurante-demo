import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Restaurant from './src/models/Restaurant.js';
import MenuItem from './src/models/MenuItem.js';
import Category from './src/models/Category.js';

dotenv.config();

/**
 * Migration Script: Menu Structure
 * 
 * This script:
 * 1. Creates a default "Sem Categoria" (Uncategorized) category for each restaurant
 * 2. Migrates existing menu items to use ObjectId references for categories
 * 3. Adds imageUrl and imagePublicId fields to existing items
 */

const migrateMenuStructure = async () => {
    try {
        console.log('🚀 Starting menu structure migration...\n');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get all restaurants
        const restaurants = await Restaurant.find({});
        console.log(`📊 Found ${restaurants.length} restaurants\n`);

        let totalCategoriesCreated = 0;
        let totalItemsMigrated = 0;
        let totalItemsSkipped = 0;

        for (const restaurant of restaurants) {
            console.log(`\n🏪 Processing restaurant: ${restaurant.name} (${restaurant._id})`);

            // Check if restaurant already has categories
            const existingCategories = await Category.find({ restaurant: restaurant._id });

            if (existingCategories.length === 0) {
                // Create default category
                const defaultCategory = new Category({
                    name: 'Sem Categoria',
                    description: 'Categoria padrão para itens não categorizados',
                    restaurant: restaurant._id,
                    displayOrder: 0,
                    isActive: true
                });

                await defaultCategory.save();
                console.log(`   ✅ Created default category: ${defaultCategory._id}`);
                totalCategoriesCreated++;

                // Migrate menu items for this restaurant
                const menuItems = await MenuItem.find({ restaurant: restaurant._id });
                console.log(`   📋 Found ${menuItems.length} menu items to migrate`);

                for (const item of menuItems) {
                    try {
                        // Check if item already has ObjectId category
                        if (item.category && mongoose.Types.ObjectId.isValid(item.category)) {
                            console.log(`   ⏭️  Skipping item "${item.name}" - already migrated`);
                            totalItemsSkipped++;
                            continue;
                        }

                        // Find or create category based on old string value
                        let category;
                        if (item.category && typeof item.category === 'string') {
                            // Try to find existing category with this name
                            category = await Category.findOne({
                                restaurant: restaurant._id,
                                name: item.category
                            });

                            if (!category) {
                                // Create new category from old string value
                                category = new Category({
                                    name: item.category,
                                    description: `Migrated from menu item: ${item.name}`,
                                    restaurant: restaurant._id,
                                    displayOrder: existingCategories.length + totalCategoriesCreated,
                                    isActive: true
                                });
                                await category.save();
                                console.log(`   ✅ Created category "${category.name}" from item`);
                                totalCategoriesCreated++;
                            }
                        } else {
                            // Use default category
                            category = defaultCategory;
                        }

                        // Update menu item
                        item.category = category._id;

                        // Initialize image fields if not present
                        if (!item.imageUrl) {
                            item.imageUrl = item.photo || '';
                        }
                        if (!item.imagePublicId) {
                            item.imagePublicId = '';
                        }

                        // Clear subcategory if it's a string (will need manual reassignment)
                        if (item.subcategory && typeof item.subcategory === 'string') {
                            console.log(`   ⚠️  Clearing string subcategory "${item.subcategory}" for item "${item.name}"`);
                            item.subcategory = undefined;
                        }

                        await item.save();
                        console.log(`   ✅ Migrated item: ${item.name}`);
                        totalItemsMigrated++;

                    } catch (itemError) {
                        console.error(`   ❌ Error migrating item "${item.name}":`, itemError.message);
                    }
                }
            } else {
                console.log(`   ℹ️  Restaurant already has ${existingCategories.length} categories - skipping`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 Migration Summary:');
        console.log('='.repeat(60));
        console.log(`✅ Categories created: ${totalCategoriesCreated}`);
        console.log(`✅ Menu items migrated: ${totalItemsMigrated}`);
        console.log(`⏭️  Menu items skipped: ${totalItemsSkipped}`);
        console.log('='.repeat(60));

        // Validation
        console.log('\n🔍 Validating migration...');

        const allItems = await MenuItem.find({});
        const invalidItems = allItems.filter(item =>
            !item.category || !mongoose.Types.ObjectId.isValid(item.category)
        );

        if (invalidItems.length > 0) {
            console.log(`\n⚠️  Warning: ${invalidItems.length} items still have invalid categories:`);
            invalidItems.forEach(item => {
                console.log(`   - ${item.name} (${item._id}): category = ${item.category}`);
            });
        } else {
            console.log('✅ All menu items have valid category references!');
        }

        console.log('\n✅ Migration completed successfully!\n');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB\n');
    }
};

// Run migration
migrateMenuStructure()
    .then(() => {
        console.log('🎉 Migration script finished');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Migration script failed:', error);
        process.exit(1);
    });
