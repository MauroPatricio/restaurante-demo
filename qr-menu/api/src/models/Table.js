import mongoose from 'mongoose';

const TableSchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
  number: Number,
  capacity: { type: Number, default: 4 },
  qrCode: String,
  // New Enhanced Fields
  location: String, // e.g. "Varanda", "Salão"
  status: {
    type: String,
    enum: ['free', 'occupied', 'reserved', 'cleaning', 'closed'],
    default: 'free'
  },
  type: String, // e.g. "Round", "Square", "Booth"
  accessibility: { type: Boolean, default: false },
  joinable: { type: Boolean, default: false },
  assignedWaiter: String, // Legacy field - kept for compatibility
  assignedWaiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  occupiedAt: Date,
  minConsumption: Number,
  // Table Session Management
  currentSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TableSession'
  },
  lastStatusChange: {
    type: Date,
    default: Date.now
  },
  statusChangedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual to populate waiter details
TableSchema.virtual('waiter', {
  ref: 'User',
  localField: 'assignedWaiterId',
  foreignField: '_id',
  justOne: true
});

export default mongoose.model('Table', TableSchema);