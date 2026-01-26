import mongoose from 'mongoose';

const weeklyMenuSchema = new mongoose.Schema({
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    }, // e.g., "Menu da Semana - Janeiro 2026"
    description: String,
    startDate: {
        type: Date,
        required: true,
        index: true
    },
    endDate: {
        type: Date,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['draft', 'active', 'expired', 'archived'],
        default: 'draft',
        index: true
    },
    items: [{
        menuItem: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MenuItem'
        },
        // Allow overriding prices for weekly specials
        specialPrice: Number,
        specialDescription: String, // Optional custom description for this week
        featured: { type: Boolean, default: true },
        displayOrder: Number // For custom ordering within weekly menu
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    activatedAt: Date,
    activatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    archivedAt: Date,
    archivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

// Compound index for finding active menus
weeklyMenuSchema.index({ restaurant: 1, status: 1 });
weeklyMenuSchema.index({ restaurant: 1, startDate: 1, endDate: 1 });

// Auto-update status based on dates
weeklyMenuSchema.methods.updateStatus = function () {
    const now = new Date();

    if (this.status === 'active') {
        if (now > this.endDate) {
            this.status = 'expired';
            return this.save();
        }
    }

    if (this.status === 'draft' && this.startDate <= now && now <= this.endDate) {
        // Can be activated if date range is valid
        // But don't auto-activate, require manual activation
    }

    return Promise.resolve(this);
};

// Static method to get current active menu
weeklyMenuSchema.statics.getActiveMenu = async function (restaurantId) {
    const now = new Date();
    return this.findOne({
        restaurant: restaurantId,
        status: 'active',
        startDate: { $lte: now },
        endDate: { $gte: now }
    }).populate('items.menuItem');
};

// Static method to deactivate other menus when activating one
weeklyMenuSchema.statics.deactivateOthers = async function (restaurantId, exceptId = null) {
    const query = {
        restaurant: restaurantId,
        status: 'active'
    };
    if (exceptId) {
        query._id = { $ne: exceptId };
    }

    return this.updateMany(query, {
        $set: { status: 'draft' }
    });
};

export default mongoose.model('WeeklyMenu', weeklyMenuSchema);
