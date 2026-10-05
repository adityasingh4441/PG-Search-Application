import mongoose from 'mongoose';

const preferencesSchema = new mongoose.Schema({
  location: { type: String, trim: true, maxlength: 120, default: 'GLA University, Mathura' },
  gender: { type: String, enum: ['', 'Any', 'Women', 'Men'], default: '' },
  minRent: { type: Number, min: 0, default: null },
  maxRent: { type: Number, min: 0, default: null },
  amenities: [{ type: String, trim: true }]
}, { _id: false });

const notificationSettingsSchema = new mongoose.Schema({
  messages: { type: Boolean, default: true },
  listingUpdates: { type: Boolean, default: true }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  phone: { type: String, trim: true, maxlength: 30 },
  college: { type: String, trim: true, maxlength: 120 },
  role: { type: String, enum: ['student', 'owner', 'admin'], default: 'student' },
  isBlocked: { type: Boolean, default: false },
  tokenVersion: { type: Number, default: 0 },
  preferences: { type: preferencesSchema, default: () => ({}) },
  notificationSettings: { type: notificationSettingsSchema, default: () => ({}) },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PG' }],
  recentlyViewed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PG' }]
}, { timestamps: true });

export default mongoose.model('User', userSchema);