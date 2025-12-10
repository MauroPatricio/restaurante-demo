import mongoose from 'mongoose';

const FeedbackSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        index: true
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true
    },
    emotions: [{
        type: String,
        enum: ['love', 'happy', 'neutral', 'sad', 'angry']
    }],
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    comment: String,
    aspects: {
        food: { type: Number, min: 1, max: 5 },
        service: { type: Number, min: 1, max: 5 },
        ambiance: { type: Number, min: 1, max: 5 },
        speed: { type: Number, min: 1, max: 5 }
    }
}, { timestamps: true });

// Index for analytics queries
FeedbackSchema.index({ restaurant: 1, createdAt: -1 });
FeedbackSchema.index({ rating: 1 });

export default mongoose.model('Feedback', FeedbackSchema);
