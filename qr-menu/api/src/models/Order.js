import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  table: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table'
  },
  orderType: {
    type: String,
    enum: ['dine-in', 'takeaway', 'delivery'],
    default: 'dine-in',
    index: true
  },
  items: [{
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true
    },
    qty: {
      type: Number,
      required: true,
      min: 1
    },
    customizations: [{
      optionName: String,
      selectedValue: String,
      priceModifier: Number
    }],
    itemPrice: Number, // Price at time of order
    subtotal: Number
  }],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  subtotal: Number,
  discount: {
    type: Number,
    default: 0
  },
  couponCode: String,
  tax: {
    type: Number,
    default: 0
  },
  serviceCharge: {
    type: Number,
    default: 0
  },
  deliveryFee: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  customerName: String,
  phone: {
    type: String,
    required: true
  },
  email: String,
  deliveryAddress: {
    street: String,
    city: String,
    district: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    instructions: String
  },
  paymentMethod: {
    type: String,
    enum: ['mpesa', 'emola', 'visa', 'cash', 'pending'], // Added 'visa' as generic card
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  paymentReference: String,
  estimatedReadyTime: Date,
  actualReadyTime: Date,
  completedAt: Date,
  notes: String,
  feedback: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Feedback'
  },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }]
}, { timestamps: true });

// Indexes for various queries
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ restaurant: 1, status: 1 });
OrderSchema.index({ restaurant: 1, createdAt: -1 });
OrderSchema.index({ phone: 1 });

export default mongoose.model('Order', OrderSchema);