import mongoose from 'mongoose';

const RestaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  address: {
    street: String,
    city: String,
    district: String,
    country: { type: String, default: 'Mozambique' }
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  logo: {
    type: String // URL or path to logo image
  },
  description: String,
  cuisine: [String], // e.g., ["Italian", "Portuguese"]
  settings: {
    taxRate: {
      type: Number,
      default: 0 // percentage
    },
    serviceChargeRate: {
      type: Number,
      default: 0 // percentage
    },
    operatingHours: {
      monday: { open: String, close: String, closed: { type: Boolean, default: false } },
      tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
      wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
      thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
      friday: { open: String, close: String, closed: { type: Boolean, default: false } },
      saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
      sunday: { open: String, close: String, closed: { type: Boolean, default: false } }
    },
    currency: {
      type: String,
      default: 'MT'
    },
    enableDelivery: {
      type: Boolean,
      default: true
    },
    enableTakeaway: {
      type: Boolean,
      default: true
    },
    deliveryRadius: {
      type: Number, // kilometers
      default: 10
    },
    minOrderAmount: {
      type: Number,
      default: 0
    },
    printerConfig: {
      enabled: { type: Boolean, default: false },
      ipAddress: String,
      port: Number
    }
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Method to check if restaurant is operational
RestaurantSchema.methods.isOperational = function () {
  const day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
  const hours = this.settings?.operatingHours?.[day];

  if (!hours || hours.closed) return false;

  // Could add time checking logic here
  return this.active;
};

export default mongoose.model('Restaurant', RestaurantSchema);