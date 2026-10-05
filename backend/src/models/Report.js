import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  pgId: { type: mongoose.Schema.Types.ObjectId, ref: 'PG', required: true },
  reason: { type: String, enum: ['unsafe', 'misleading', 'fraud', 'harassment', 'other'], required: true },
  details: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
  status: { type: String, enum: ['new', 'reviewing', 'resolved', 'rejected'], default: 'new', index: true }
}, { timestamps: true });

reportSchema.index({ reporterId: 1, createdAt: -1 });

export default mongoose.model('Report', reportSchema);
