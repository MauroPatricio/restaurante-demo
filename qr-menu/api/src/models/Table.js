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
  assignedWaiter: String,
  occupiedAt: Date,
  minConsumption: Number
}, { timestamps: true });
export default mongoose.model('Table', TableSchema);