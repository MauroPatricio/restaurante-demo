import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/qr-menu';

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        const UserSchema = new mongoose.Schema({ name: String, email: String }, { strict: false });
        const User = mongoose.model('User', UserSchema);
        
        const UserRestaurantRoleSchema = new mongoose.Schema({ user: mongoose.Schema.Types.ObjectId, restaurant: mongoose.Schema.Types.ObjectId, active: Boolean }, { strict: false });
        const UserRestaurantRole = mongoose.model('UserRestaurantRole', UserRestaurantRoleSchema);
        
        const RestaurantSchema = new mongoose.Schema({ name: String, owner: mongoose.Schema.Types.ObjectId }, { strict: false });
        const Restaurant = mongoose.model('Restaurant', RestaurantSchema);
        
        const SubscriptionSchema = new mongoose.Schema({ restaurant: mongoose.Schema.Types.ObjectId, status: String }, { strict: false });
        const Subscription = mongoose.model('Subscription', SubscriptionSchema);

        const users = await User.find({ name: /mauro/i });
        const userId = users[0]._id;
        console.log('User:', users[0].email);

        const userRoles = await UserRestaurantRole.find({ user: userId, active: true }).select('restaurant');
        const roleRestaurantIds = userRoles.map(ur => ur.restaurant).filter(Boolean);

        const userRestaurants = await Restaurant.find({
            $or: [
                { owner: userId },
                { _id: { $in: roleRestaurantIds } }
            ]
        });

        console.log('UserRestaurants length:', userRestaurants.length);

        if (userRestaurants.length > 0) {
            const restaurantIds = userRestaurants.map(r => r._id);
            const subscriptions = await Subscription.find({
                restaurant: { $in: restaurantIds }
            }).populate('restaurant', 'name email logo');
            
            const validSubscriptions = subscriptions.filter(sub => sub.restaurant);

            const restaurantStatuses = validSubscriptions.map(sub => ({
                restaurantId: sub.restaurant._id,
                restaurantName: sub.restaurant.name,
                status: sub.status
            }));
            
            console.log(JSON.stringify(restaurantStatuses, null, 2));
        }

    } catch(err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
