import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true, trim: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const enquirySchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  pgId: { type: mongoose.Schema.Types.ObjectId, ref: 'PG', required: true },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  messages: { type: [messageSchema], default: [] },
  status: { type: String, enum: ['new', 'contacted', 'closed'], default: 'new', index: true }
}, { timestamps: true });

export default mongoose.model('Enquiry', enquirySchema);