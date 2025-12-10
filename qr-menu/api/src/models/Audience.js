import mongoose from 'mongoose';
const AudienceSchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
  phone: String
},{timestamps:true});
export default mongoose.model('Audience', AudienceSchema);