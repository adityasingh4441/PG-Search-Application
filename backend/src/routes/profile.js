import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import PG from '../models/PG.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const publicProfile = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  college: user.college || '',
  role: user.role,
  preferences: user.preferences,
  notificationSettings: user.notificationSettings
});

function checkValidation(request) {
  const errors = validationResult(request);
  if (!errors.isEmpty()) throw Object.assign(new Error(errors.array()[0].msg), { status: 400 });
}

router.get('/', (request, response) => response.json({ user: publicProfile(request.user) }));

router.patch('/',
  body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2 to 80 characters'),
  body('email').optional().isEmail().withMessage('Enter a valid email address'),
  body('phone').optional().trim().isLength({ max: 30 }).withMessage('Phone must be 30 characters or fewer'),
  body('college').optional().trim().isLength({ max: 120 }).withMessage('College must be 120 characters or fewer'),
  body('preferences').optional().isObject().withMessage('Preferences must be an object'),
  body('notificationSettings').optional().isObject().withMessage('Notification settings must be an object'),
  async (request, response, next) => {
    try {
      checkValidation(request);
      const user = request.user;
      for (const field of ['name', 'phone', 'college']) {
        if (Object.hasOwn(request.body, field)) user[field] = request.body[field];
      }
      if (request.body.email) user.email = request.body.email.toLowerCase();
      if (request.body.preferences) {
        const fields = ['location', 'gender', 'minRent', 'maxRent', 'amenities'];
        const preferences = user.preferences?.toObject?.() || {};
        for (const field of fields) {
          if (Object.hasOwn(request.body.preferences, field)) preferences[field] = request.body.preferences[field];
        }
        user.preferences = preferences;
      }
      if (request.body.notificationSettings) {
        const settings = user.notificationSettings?.toObject?.() || {};
        for (const field of ['messages', 'listingUpdates']) {
          if (Object.hasOwn(request.body.notificationSettings, field)) settings[field] = Boolean(request.body.notificationSettings[field]);
        }
        user.notificationSettings = settings;
      }
      await user.save();
      response.json({ user: publicProfile(user) });
    } catch (error) { next(error); }
  }
);

router.patch('/password',
  body('currentPassword').notEmpty().withMessage('Enter your current password'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  async (request, response, next) => {
    try {
      checkValidation(request);
      const user = await User.findById(request.user.id).select('+passwordHash');
      if (!(await bcrypt.compare(request.body.currentPassword, user.passwordHash))) {
        return response.status(400).json({ message: 'Current password is incorrect' });
      }
      user.passwordHash = await bcrypt.hash(request.body.newPassword, 12);
      user.tokenVersion += 1;
      await user.save();
      response.json({ signedOut: true });
    } catch (error) { next(error); }
  }
);

router.get('/reviews', async (request, response, next) => {
  try {
    const items = await Review.find({ userId: request.user.id })
      .populate('pgId', 'name area rent images status')
      .sort({ createdAt: -1 }).lean();
    response.json({ items });
  } catch (error) { next(error); }
});

router.get('/recently-viewed', async (request, response, next) => {
  try {
    const user = await User.findById(request.user.id).populate({
      path: 'recentlyViewed',
      match: { status: 'approved' },
      populate: { path: 'ownerId', select: 'name phone' }
    });
    response.json({ items: user.recentlyViewed });
  } catch (error) { next(error); }
});

router.post('/recently-viewed', body('pgId').isMongoId().withMessage('Choose a valid PG'), async (request, response, next) => {
  try {
    checkValidation(request);
    const pg = await PG.findOne({ _id: request.body.pgId, status: 'approved' }).select('_id');
    if (!pg) return response.status(404).json({ message: 'PG not found' });
    const user = await User.findById(request.user.id);
    user.recentlyViewed = [pg._id, ...user.recentlyViewed.filter((id) => !id.equals(pg._id))].slice(0, 12);
    await user.save();
    response.status(204).end();
  } catch (error) { next(error); }
});

export default router;
