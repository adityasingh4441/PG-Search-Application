import { Router } from 'express';
import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import PG from '../models/PG.js';
import User from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/pgs/pending', async (_request, response, next) => {
  try {
    const items = await PG.find({ status: 'pending' }).populate('ownerId', 'name email').sort({ createdAt: 1 }).lean();
    response.json({ items });
  } catch (error) { next(error); }
});

router.patch('/pgs/:id/:decision', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id) || !['approve', 'reject'].includes(request.params.decision)) {
      return response.status(400).json({ message: 'Invalid listing or decision' });
    }
    const item = await PG.findByIdAndUpdate(request.params.id, { status: request.params.decision === 'approve' ? 'approved' : 'rejected' }, { new: true });
    if (!item) return response.status(404).json({ message: 'Listing not found' });
    const owner = await User.findById(item.ownerId).select('notificationSettings');
    if (owner?.notificationSettings?.listingUpdates !== false) {
      await Notification.create({
        userId: item.ownerId,
        type: 'listing',
        message: `Your listing “${item.name}” was ${item.status}.`,
        pgId: item._id
      });
    }
    response.json({ item });
  } catch (error) { next(error); }
});

router.get('/overview', async (_request, response, next) => {
  try {
    const [users, listings, pending] = await Promise.all([User.countDocuments(), PG.countDocuments(), PG.countDocuments({ status: 'pending' })]);
    response.json({ users, listings, pending });
  } catch (error) { next(error); }
});

export default router;