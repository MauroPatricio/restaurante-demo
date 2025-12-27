import mongoose from 'mongoose';

const MenuItemSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subcategory',
    index: true
  },
  price: {
    type: Number,
    required: true
  },
  // --- Image Fields ---
  imageUrl: {
    type: String,
    default: ''
  },
  imagePublicId: {
    type: String,
    default: ''
  },
  // --- New Attributes ---
  sku: { type: String, unique: true, sparse: true },
  ingredients: [String],
  allergens: [String], // Gluten, Lactose, etc.
  prepTime: { type: Number, default: 15 }, // minutes
  featured: { type: Boolean, default: false }, // Chef's recommendation
  photo: { type: String }, // Legacy field, use imageUrl instead
  tags: [String], // Spicy, Vegan, Sugar-free
  portionSize: String, // Small, Medium, Large
  variablePrice: { type: Boolean, default: false },
  costPrice: { type: Number, default: 0 }, // For margin calculation
  stockControlled: { type: Boolean, default: false },
  stock: { type: Number, default: 0 }, // Current inventory count
  seasonal: String, // e.g. "Summer"

  // Operational
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  highlightColor: String, // Hex code

  // Existing fields
  available: { type: Boolean, default: true },
  eta: { type: Number, default: 15 }, // Keeping for backward compat, mapped to prepTime usually
  customizationOptions: [{
    name: String,
    type: { type: String, enum: ['single', 'multiple'] },
    required: { type: Boolean, default: false },
    options: [{
      name: String,
      priceModifier: { type: Number, default: 0 }
    }]
  }],
  nutritionalInfo: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number
  },
  popular: { type: Boolean, default: false },
  orderCount: { type: Number, default: 0 }
}, { timestamps: true });

// Index for popular items queries
MenuItemSchema.index({ restaurant: 1, popular: 1 });
MenuItemSchema.index({ restaurant: 1, category: 1, available: 1 });

export default mongoose.model('MenuItem', MenuItemSchema);