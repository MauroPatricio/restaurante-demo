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
    enum: ['trial', 'active', 'suspended', 'cancelled'], 
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
SubscriptionSchema.methods.isValid = function() {
  const now = new Date();
  return this.status === 'active' || 
         this.status === 'trial' || 
         (this.status === 'suspended' && this.graceEndDate && now < this.graceEndDate);
};

// Method to check if first month (trial period)
SubscriptionSchema.methods.isTrialPeriod = function() {
  return this.status === 'trial';
};

export default mongoose.model('Subscription', SubscriptionSchema);
