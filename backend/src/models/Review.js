import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  pgId: { type: mongoose.Schema.Types.ObjectId, ref: 'PG', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true, maxlength: 1200 }
}, { timestamps: true });

reviewSchema.index({ pgId: 1, userId: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);