import mongoose from 'mongoose';

const UserRestaurantRoleSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true
    },
    role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        required: true
    },
    active: {
        type: Boolean,
        default: true
    },
    isDefault: {
        type: Boolean,
        default: false
    } // Helps in auto-selecting context on login if multiple exist
}, { timestamps: true });

// Compound unique index to prevent duplicate roles for same user in same restaurant
UserRestaurantRoleSchema.index({ user: 1, restaurant: 1 }, { unique: true });

export default mongoose.model('UserRestaurantRole', UserRestaurantRoleSchema);
