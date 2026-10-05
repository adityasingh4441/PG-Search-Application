import { Router } from 'express';
import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (request, response, next) => {
  try {
    const items = await Notification.find({ userId: request.user.id })
      .populate('pgId', 'name area')
      .populate('enquiryId', 'status')
      .sort({ createdAt: -1 }).limit(50).lean();
    response.json({ items, unread: items.filter((item) => !item.readAt).length });
  } catch (error) { next(error); }
});

router.patch('/read-all', async (request, response, next) => {
  try {
    await Notification.updateMany({ userId: request.user.id, readAt: null }, { readAt: new Date() });
    response.status(204).end();
  } catch (error) { next(error); }
});

router.patch('/:id/read', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) return response.status(404).json({ message: 'Notification not found' });
    const item = await Notification.findOneAndUpdate(
      { _id: request.params.id, userId: request.user.id },
      { readAt: new Date() },
      { new: true }
    );
    if (!item) return response.status(404).json({ message: 'Notification not found' });
    response.json({ item });
  } catch (error) { next(error); }
});

export default router;
