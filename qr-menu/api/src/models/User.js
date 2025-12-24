import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  phone: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true,
    select: false // Don't include password in queries by default
  },
  address: { // New field for Owner registration
    type: String
  },
  // Legacy fields removed: role, restaurants (now handled by UserRestaurantRole)

  isDefaultPassword: {
    type: Boolean,
    default: false
  },
  fcmToken: {
    type: String // Firebase Cloud Messaging token for push notifications
  },
  avatar: String,
  active: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  // For delivery personnel
  deliveryProfile: {
    vehicleType: { type: String, enum: ['motorcycle', 'bicycle', 'car', 'foot'] },
    vehicleNumber: String,
    currentLocation: {
      latitude: Number,
      longitude: Number,
      updatedAt: Date
    },
    available: { type: Boolean, default: false },
    rating: { type: Number, default: 5 },
    completedDeliveries: { type: Number, default: 0 }
  }
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// Method to sanitize user data (remove sensitive fields)
UserSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model('User', UserSchema);