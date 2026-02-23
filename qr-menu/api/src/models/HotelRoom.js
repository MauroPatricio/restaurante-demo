import mongoose from 'mongoose';

const HotelRoomSchema = new mongoose.Schema({
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true
    },
    number: {
        type: String, // "101", "Suíte A", etc.
        required: true
    },
    floor: {
        type: String,
        default: '1'
    },
    label: {
        type: String // e.g. "Quarto Duplo", "Suíte Presidencial"
    },
    active: {
        type: Boolean,
        default: true,
        index: true
    },
    qrCode: {
        type: String // base64 data URL
    },
    qrToken: {
        type: String // HMAC token embedded in the QR URL
    },
    notes: {
        type: String // Staff internal notes
    }
}, { timestamps: true });

// Compound index to ensure room number unique per restaurant
HotelRoomSchema.index({ restaurant: 1, number: 1 }, { unique: true });

export default mongoose.model('HotelRoom', HotelRoomSchema);
