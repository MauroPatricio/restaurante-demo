import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
        maxlength: [100, 'Category name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
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

// Compound index for efficient queries
categorySchema.index({ restaurant: 1, displayOrder: 1 });
categorySchema.index({ restaurant: 1, isActive: 1 });

// Ensure unique category names per restaurant
categorySchema.index({ restaurant: 1, name: 1 }, { unique: true });

// Virtual for subcategories count
categorySchema.virtual('subcategoriesCount', {
    ref: 'Subcategory',
    localField: '_id',
    foreignField: 'category',
    count: true
});

// Virtual for items count
categorySchema.virtual('itemsCount', {
    ref: 'MenuItem',
    localField: '_id',
    foreignField: 'category',
    count: true
});

// Ensure virtuals are included in JSON
categorySchema.set('toJSON', { virtuals: true });
categorySchema.set('toObject', { virtuals: true });

const Category = mongoose.model('Category', categorySchema);

export default Category;
