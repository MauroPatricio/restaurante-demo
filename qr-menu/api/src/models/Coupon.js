import mongoose from 'mongoose';

const CouponSchema = new mongoose.Schema({
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true
    },
    code: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        index: true
    },
    type: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },
    value: {
        type: Number,
        required: true
    },
    minOrderAmount: {
        type: Number,
        default: 0
    },
    maxDiscountAmount: {
        type: Number // Max discount for percentage coupons
    },
    validFrom: {
        type: Date,
        default: Date.now
    },
    validTo: {
        type: Date,
        required: true
    },
    usageLimit: {
        type: Number,
        default: null // null means unlimited
    },
    usedCount: {
        type: Number,
        default: 0
    },
    perUserLimit: {
        type: Number,
        default: 1
    },
    usedBy: [{
        user: String, // phone number or user ID
        usedAt: Date
    }],
    active: {
        type: Boolean,
        default: true
    },
    description: String,
    applicableItems: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem'
    }], // Empty means all items
    applicableCategories: [String]
}, { timestamps: true });

// Compound index for faster coupon code lookups
CouponSchema.index({ code: 1, restaurant: 1 }, { unique: true });

// Method to check if coupon is valid
CouponSchema.methods.isValid = function (userId = null) {
    const now = new Date();

    // Check active status
    if (!this.active) return { valid: false, reason: 'Coupon is not active' };

    // Check date validity
    if (now < this.validFrom) return { valid: false, reason: 'Coupon not yet valid' };
    if (now > this.validTo) return { valid: false, reason: 'Coupon has expired' };

    // Check usage limit
    if (this.usageLimit && this.usedCount >= this.usageLimit) {
        return { valid: false, reason: 'Coupon usage limit reached' };
    }

    // Check per-user limit
    if (userId && this.perUserLimit) {
        const userUsage = this.usedBy.filter(u => u.user === userId).length;
        if (userUsage >= this.perUserLimit) {
            return { valid: false, reason: 'You have already used this coupon' };
        }
    }

    return { valid: true };
};

// Method to calculate discount
CouponSchema.methods.calculateDiscount = function (orderAmount) {
    if (orderAmount < this.minOrderAmount) {
        return 0;
    }

    if (this.type === 'percentage') {
        let discount = (orderAmount * this.value) / 100;
        if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
            discount = this.maxDiscountAmount;
        }
        return Math.round(discount * 100) / 100;
    } else {
        return this.value;
    }
};

export default mongoose.model('Coupon', CouponSchema);
