import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['trial', 'active', 'suspended', 'cancelled', 'expired'],
    default: 'trial'
  },
  currentPeriodStart: {
    type: Date,
    required: true
  },
  currentPeriodEnd: {
    type: Date,
    required: true
  },
  amount: {
    type: Number,
    default: 10000 // 10,000 MT per month
  },
  currency: {
    type: String,
    default: 'MT'
  },
  graceEndDate: {
    type: Date // Date when grace period ends and suspension occurs
  },
  paymentHistory: [{
    date: Date,
    amount: Number,
    method: String,
    reference: String,
    status: { type: String, enum: ['pending', 'completed', 'failed'] }
  }],
  remindersSent: {
    sevenDays: { type: Boolean, default: false },
    threeDays: { type: Boolean, default: false },
    oneDay: { type: Boolean, default: false },
    overdue: { type: Boolean, default: false }
  }
}, { timestamps: true });

// Method to check if subscription is valid
SubscriptionSchema.methods.isValid = function () {
  const now = new Date();

  // Expired or cancelled are never valid
  if (this.status === 'expired' || this.status === 'cancelled') {
    return false;
  }

  // Active and trial are valid
  if (this.status === 'active' || this.status === 'trial') {
    // But only if not past end date
    return now <= this.currentPeriodEnd;
  }

  // Suspended with grace period
  if (this.status === 'suspended' && this.graceEndDate && now < this.graceEndDate) {
    return true;
  }

  return false;
};

// Method to check if subscription is expired
SubscriptionSchema.methods.isExpired = function () {
  const now = new Date();
  return now > this.currentPeriodEnd || this.status === 'expired';
};

// Method to get days until expiry (negative if expired)
SubscriptionSchema.methods.getDaysUntilExpiry = function () {
  const now = new Date();
  const diffTime = this.currentPeriodEnd - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Method to get days expired (0 if not expired)
SubscriptionSchema.methods.getDaysExpired = function () {
  if (!this.isExpired()) return 0;
  const now = new Date();
  const diffTime = now - this.currentPeriodEnd;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Method to check if first month (trial period)
SubscriptionSchema.methods.isTrialPeriod = function () {
  return this.status === 'trial';
};

// Method to check if in grace period
SubscriptionSchema.methods.isInGracePeriod = function () {
  if (!this.graceEndDate) return false;
  const now = new Date();
  return this.status === 'suspended' && now < this.graceEndDate;
};

export default mongoose.model('Subscription', SubscriptionSchema);
