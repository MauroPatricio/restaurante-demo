import mongoose from 'mongoose';

const subcategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Subcategory name is required'],
        trim: true,
        maxlength: [100, 'Subcategory name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category is required'],
        index: true
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: [true, 'Restaurant is required'],
        index: true
    },
    displayOrder: {
        type: Number,
        default: 0,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
subcategorySchema.index({ category: 1, displayOrder: 1 });
subcategorySchema.index({ restaurant: 1, isActive: 1 });
subcategorySchema.index({ category: 1, isActive: 1 });

// Ensure unique subcategory names per category
subcategorySchema.index({ category: 1, name: 1 }, { unique: true });

// Virtual for items count
subcategorySchema.virtual('itemsCount', {
    ref: 'MenuItem',
    localField: '_id',
    foreignField: 'subcategory',
    count: true
});

// Ensure virtuals are included in JSON
subcategorySchema.set('toJSON', { virtuals: true });
subcategorySchema.set('toObject', { virtuals: true });

// Pre-save hook to ensure category and restaurant match
subcategorySchema.pre('save', async function (next) {
    if (this.isNew || this.isModified('category')) {
        const Category = mongoose.model('Category');
        const category = await Category.findById(this.category);

        if (!category) {
            return next(new Error('Category not found'));
        }

        if (category.restaurant.toString() !== this.restaurant.toString()) {
            return next(new Error('Subcategory restaurant must match category restaurant'));
        }
    }
    next();
});

const Subcategory = mongoose.model('Subcategory', subcategorySchema);

export default Subcategory;
