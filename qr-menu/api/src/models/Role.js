import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    permissions: [{
        type: String
    }],
    // System roles cannot be deleted
    isSystem: {
        type: Boolean,
        default: false
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        // If null, it's a global system role or default role template
        default: null
    }
}, { timestamps: true });

export default mongoose.model('Role', RoleSchema);
