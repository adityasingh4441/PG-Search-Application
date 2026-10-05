import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['enquiry', 'message', 'listing'], required: true },
  message: { type: String, required: true, trim: true, maxlength: 240 },
  pgId: { type: mongoose.Schema.Types.ObjectId, ref: 'PG' },
  enquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enquiry' },
  readAt: { type: Date, default: null }
}, { timestamps: true });

notificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
