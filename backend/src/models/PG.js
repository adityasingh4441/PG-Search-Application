import mongoose from 'mongoose';

const roomTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  rent: { type: Number, required: true, min: 0 },
  available: { type: Number, default: 0, min: 0 }
}, { _id: false });

const locationSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], required: true, validate: (coordinates) => coordinates.length === 2 }
}, { _id: false });

const pgSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 4000 },
  address: { type: String, required: true, trim: true },
  city: { type: String, trim: true, maxlength: 100, index: true },
  area: { type: String, required: true, trim: true, index: true },
  location: { type: locationSchema, default: undefined },
  rent: { type: Number, required: true, min: 0, index: true },
  deposit: { type: Number, default: 0, min: 0 },
  gender: { type: String, enum: ['Any', 'Women', 'Men'], default: 'Any', index: true },
  amenities: [{ type: String, trim: true }],
  images: [{ type: String, trim: true }],
  roomTypes: [roomTypeSchema],
  availability: { type: Number, default: 0, min: 0 },
  rules: [{ type: String, trim: true }],
  rating: { type: Number, default: 0, min: 0, max: 5, index: true },
  reviewCount: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true }
}, { timestamps: true });

pgSchema.index({ name: 'text', city: 'text', area: 'text', address: 'text', description: 'text' });
pgSchema.index({ location: '2dsphere' });

export default mongoose.model('PG', pgSchema);