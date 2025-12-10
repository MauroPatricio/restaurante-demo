import mongoose from 'mongoose';
const TableSchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
  number: Number,
  qrCode: String
},{timestamps:true});
export default mongoose.model('Table', TableSchema);