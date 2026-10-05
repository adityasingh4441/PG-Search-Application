import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Enquiry from '../models/Enquiry.js';
import Notification from '../models/Notification.js';
import PG from '../models/PG.js';
import User from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

async function createNotification(userId, type, message, pgId, enquiryId) {
  const user = await User.findById(userId).select('notificationSettings');
  if (!user) return;
  if (type === 'listing' && user.notificationSettings?.listingUpdates === false) return;
  if (type !== 'listing' && user.notificationSettings?.messages === false) return;
  await Notification.create({ userId, type, message, pgId, enquiryId });
}

router.post('/', requireRole('student'),
  body('pgId').isMongoId().withMessage('Choose a valid stay'),
  body('message').trim().isLength({ min: 10, max: 2000 }).withMessage('Message must be 10 to 2000 characters'),
  async (request, response, next) => {
    try {
      const errors = validationResult(request);
      if (!errors.isEmpty()) return response.status(400).json({ message: errors.array()[0].msg });
      const pg = await PG.findOne({ _id: request.body.pgId, status: 'approved' });
      if (!pg) return response.status(404).json({ message: 'Stay not found' });
      const enquiry = await Enquiry.create({
        studentId: request.user.id,
        ownerId: pg.ownerId,
        pgId: pg.id,
        message: request.body.message,
        messages: [{ senderId: request.user.id, body: request.body.message }]
      });
      await createNotification(pg.ownerId, 'enquiry', `New enquiry for ${pg.name}`, pg._id, enquiry._id);
      response.status(201).json({ enquiry });
    } catch (error) { next(error); }
  }
);

router.get('/', async (request, response, next) => {
  try {
    const filter = request.user.role === 'owner' ? { ownerId: request.user.id } : { studentId: request.user.id };
    const items = await Enquiry.find(filter)
      .populate('pgId', 'name area rent images status')
      .populate('studentId', 'name email phone')
      .populate('ownerId', 'name')
      .populate('messages.senderId', 'name role')
      .sort({ updatedAt: -1 }).lean();
    response.json({ items });
  } catch (error) { next(error); }
});

router.post('/:id/messages',
  body('message').trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be 1 to 2000 characters'),
  async (request, response, next) => {
    try {
      const errors = validationResult(request);
      if (!errors.isEmpty()) return response.status(400).json({ message: errors.array()[0].msg });
      if (!mongoose.isValidObjectId(request.params.id)) return response.status(404).json({ message: 'Conversation not found' });
      const enquiry = await Enquiry.findOne({
        _id: request.params.id,
        $or: [{ studentId: request.user.id }, { ownerId: request.user.id }]
      });
      if (!enquiry) return response.status(404).json({ message: 'Conversation not found' });
      const recipientId = enquiry.studentId.equals(request.user.id) ? enquiry.ownerId : enquiry.studentId;
      enquiry.messages.push({ senderId: request.user.id, body: request.body.message });
      await enquiry.save();
      await createNotification(recipientId, 'message', 'New message about your PG enquiry', enquiry.pgId, enquiry._id);
      await enquiry.populate('messages.senderId', 'name role');
      response.status(201).json({ message: enquiry.messages.at(-1) });
    } catch (error) { next(error); }
  }
);

router.patch('/:id/status', requireRole('owner'), async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id) || !['contacted', 'closed'].includes(request.body.status)) {
      return response.status(400).json({ message: 'Choose a valid enquiry status' });
    }
    const item = await Enquiry.findOneAndUpdate({ _id: request.params.id, ownerId: request.user.id }, { status: request.body.status }, { new: true });
    if (!item) return response.status(404).json({ message: 'Enquiry not found' });
    await createNotification(item.studentId, 'listing', `Your enquiry status is now ${item.status}`, item.pgId, item._id);
    response.json({ item });
  } catch (error) { next(error); }
});

export default router;