import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import Report from '../models/Report.js';
import PG from '../models/PG.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (request, response, next) => {
  try {
    const items = await Report.find({ reporterId: request.user.id })
      .populate('pgId', 'name area')
      .sort({ createdAt: -1 }).lean();
    response.json({ items });
  } catch (error) { next(error); }
});

router.post('/',
  body('pgId').isMongoId().withMessage('Choose a valid PG'),
  body('reason').isIn(['unsafe', 'misleading', 'fraud', 'harassment', 'other']).withMessage('Choose a report reason'),
  body('details').trim().isLength({ min: 10, max: 2000 }).withMessage('Details must be 10 to 2000 characters'),
  async (request, response, next) => {
    try {
      const errors = validationResult(request);
      if (!errors.isEmpty()) return response.status(400).json({ message: errors.array()[0].msg });
      const pg = await PG.findOne({ _id: request.body.pgId, status: 'approved' }).select('_id');
      if (!pg) return response.status(404).json({ message: 'PG not found' });
      const item = await Report.create({ reporterId: request.user.id, pgId: pg._id, reason: request.body.reason, details: request.body.details });
      await item.populate('pgId', 'name area');
      response.status(201).json({ item });
    } catch (error) { next(error); }
  }
);

export default router;
