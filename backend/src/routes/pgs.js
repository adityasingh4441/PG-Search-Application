import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import PG from '../models/PG.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const validateListing = [
  body('name').trim().isLength({ min: 3, max: 120 }).withMessage('PG name must be 3 to 120 characters'),
  body('description').trim().isLength({ min: 10, max: 4000 }).withMessage('Add a description of at least 10 characters'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().isLength({ min: 2, max: 100 }).withMessage('Enter a city between 2 and 100 characters'),
  body('area').trim().notEmpty().withMessage('Area is required'),
  body('rent').isFloat({ min: 0 }).withMessage('Rent must be a positive amount'),
  body('deposit').optional().isFloat({ min: 0 }).withMessage('Deposit cannot be negative'),
  body('gender').optional().isIn(['Any', 'Women', 'Men']).withMessage('Invalid preference')
];

function checkValidation(request) {
  const errors = validationResult(request);
  if (!errors.isEmpty()) throw Object.assign(new Error(errors.array()[0].msg), { status: 400 });
}

function listingPayload(body) {
  const payload = { ...body };
  delete payload.ownerId;
  delete payload.status;
  delete payload.rating;
  delete payload.reviewCount;
  if (body.location?.coordinates?.length === 2) {
    const [longitude, latitude] = body.location.coordinates.map(Number);
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      throw Object.assign(new Error('Location coordinates are invalid'), { status: 400 });
    }
    payload.location = { type: 'Point', coordinates: [longitude, latitude] };
  } else {
    delete payload.location;
  }
  return payload;
}

router.get('/', async (request, response, next) => {
  try {
    const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
    const limit = Math.min(48, Math.max(1, Number.parseInt(request.query.limit, 10) || 12));
    const filter = { status: 'approved' };
    if (request.query.q) filter.$text = { $search: String(request.query.q).slice(0, 100) };
    if (request.query.city) {
      const city = String(request.query.city).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { city: new RegExp(`^${city}$`, 'i') },
        { city: { $exists: false }, address: new RegExp(city, 'i') }
      ];
    }
    if (request.query.name) filter.name = new RegExp(String(request.query.name).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (request.query.area) filter.area = new RegExp(String(request.query.area).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (request.query.gender && ['Any', 'Women', 'Men'].includes(request.query.gender)) filter.gender = request.query.gender;
    const amenities = [
      ...String(request.query.amenities || '').split(','),
      ...(request.query.amenity ? [String(request.query.amenity)] : [])
    ].filter(Boolean);
    if (amenities.length) filter.amenities = { $all: [...new Set(amenities)] };
    const minRent = Number(request.query.minRent);
    const maxRent = Number(request.query.maxRent);
    if (Number.isFinite(minRent) || Number.isFinite(maxRent)) {
      filter.rent = {};
      if (Number.isFinite(minRent)) filter.rent.$gte = minRent;
      if (Number.isFinite(maxRent)) filter.rent.$lte = maxRent;
    }
    const sorts = { price_asc: { rent: 1 }, price_desc: { rent: -1 }, rating: { rating: -1 }, newest: { createdAt: -1 } };
    const sort = sorts[request.query.sort] || sorts.newest;
    const [items, total] = await Promise.all([
      PG.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).populate('ownerId', 'name phone').lean(),
      PG.countDocuments(filter)
    ]);
    response.json({ items, page, pages: Math.ceil(total / limit), total });
  } catch (error) { next(error); }
});

router.get('/nearby', async (request, response, next) => {
  try {
    const longitude = Number(request.query.lng);
    const latitude = Number(request.query.lat);
    const radius = Math.min(50000, Math.max(100, Number(request.query.radius) || 5000));
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return response.status(400).json({ message: 'Provide valid lng and lat coordinates' });
    const items = await PG.find({ status: 'approved', location: { $near: { $geometry: { type: 'Point', coordinates: [longitude, latitude] }, $maxDistance: radius } } })
      .limit(48).populate('ownerId', 'name phone').lean();
    response.json({ items, total: items.length });
  } catch (error) { next(error); }
});

router.get('/mine', requireAuth, requireRole('owner'), async (request, response, next) => {
  try {
    const items = await PG.find({ ownerId: request.user.id }).sort({ updatedAt: -1 }).lean();
    response.json({ items });
  } catch (error) { next(error); }
});

router.get('/favorites', requireAuth, async (request, response, next) => {
  try {
    const user = await User.findById(request.user.id).populate({ path: 'favorites', match: { status: 'approved' }, populate: { path: 'ownerId', select: 'name phone' } });
    response.json({ items: user.favorites });
  } catch (error) { next(error); }
});

router.get('/:id/reviews', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) return response.status(404).json({ message: 'Stay not found' });
    const items = await Review.find({ pgId: request.params.id }).populate('userId', 'name').sort({ createdAt: -1 }).lean();
    response.json({ items });
  } catch (error) { next(error); }
});

router.post('/:id/reviews', requireAuth, requireRole('student'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').trim().isLength({ min: 5, max: 1200 }).withMessage('Review must be 5 to 1200 characters'),
  async (request, response, next) => {
    try {
      checkValidation(request);
      const pg = await PG.findOne({ _id: request.params.id, status: 'approved' });
      if (!pg) return response.status(404).json({ message: 'Stay not found' });
      if (pg.ownerId.equals(request.user.id)) return response.status(403).json({ message: 'Owners cannot review their own stay' });
      const review = await Review.create({ pgId: pg.id, userId: request.user.id, rating: Number(request.body.rating), comment: request.body.comment });
      const stats = await Review.aggregate([{ $match: { pgId: pg._id } }, { $group: { _id: '$pgId', rating: { $avg: '$rating' }, count: { $sum: 1 } } }]);
      await PG.updateOne({ _id: pg._id }, { rating: stats[0].rating, reviewCount: stats[0].count });
      await review.populate('userId', 'name');
      response.status(201).json({ item: review });
    } catch (error) { next(error); }
  }
);

router.get('/:id', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) return response.status(404).json({ message: 'PG not found' });
    const item = await PG.findOne({ _id: request.params.id, status: 'approved' }).populate('ownerId', 'name phone').lean();
    if (!item) return response.status(404).json({ message: 'PG not found' });
    response.json({ item });
  } catch (error) { next(error); }
});

router.post('/', requireAuth, requireRole('owner'), validateListing, async (request, response, next) => {
  try {
    checkValidation(request);
    const item = await PG.create({ ...listingPayload(request.body), ownerId: request.user.id });
    response.status(201).json({ item });
  } catch (error) { next(error); }
});

router.put('/:id', requireAuth, requireRole('owner'), validateListing, async (request, response, next) => {
  try {
    checkValidation(request);
    const item = await PG.findOneAndUpdate({ _id: request.params.id, ownerId: request.user.id }, { ...listingPayload(request.body), status: 'pending' }, { new: true, runValidators: true });
    if (!item) return response.status(404).json({ message: 'Listing not found or not yours' });
    response.json({ item });
  } catch (error) { next(error); }
});

router.delete('/:id', requireAuth, requireRole('owner'), async (request, response, next) => {
  try {
    const item = await PG.findOneAndDelete({ _id: request.params.id, ownerId: request.user.id });
    if (!item) return response.status(404).json({ message: 'Listing not found or not yours' });
    response.status(204).end();
  } catch (error) { next(error); }
});

router.post('/:id/favorite', requireAuth, async (request, response, next) => {
  try {
    const pg = await PG.findOne({ _id: request.params.id, status: 'approved' });
    if (!pg) return response.status(404).json({ message: 'PG not found' });
    const isFavorite = request.user.favorites.some((id) => id.equals(pg._id));
    await User.updateOne({ _id: request.user.id }, isFavorite ? { $pull: { favorites: pg._id } } : { $addToSet: { favorites: pg._id } });
    response.json({ favorite: !isFavorite });
  } catch (error) { next(error); }
});

export default router;