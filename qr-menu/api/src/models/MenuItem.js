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
    type: String,
    required: true,
    index: true
  },
  price: {
    type: Number,
    required: true
  },
  photo: {
    type: String // URL or path to image
  },
  available: {
    type: Boolean,
    default: true
  },
  eta: {
    type: Number, // minutes to prepare
    default: 15
  },
  customizationOptions: [{
    name: String, // e.g., "Size", "Spice Level"
    type: { type: String, enum: ['single', 'multiple'] },
    required: { type: Boolean, default: false },
    options: [{
      name: String, // e.g., "Large", "Medium", "Small"
      priceModifier: { type: Number, default: 0 }
    }]
  }],
  allergens: [String],
  nutritionalInfo: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number
  },
  popular: {
    type: Boolean,
    default: false
  },
  orderCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Index for popular items queries
MenuItemSchema.index({ restaurant: 1, popular: 1 });
MenuItemSchema.index({ restaurant: 1, category: 1, available: 1 });

export default mongoose.model('MenuItem', MenuItemSchema);