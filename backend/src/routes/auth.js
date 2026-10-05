import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const tokenFor = (user) => jwt.sign({ sub: user.id, role: user.role, ver: user.tokenVersion || 0 }, process.env.JWT_SECRET || 'local-development-secret-change-me', { expiresIn: '7d' });
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, college: user.college, preferences: user.preferences, notificationSettings: user.notificationSettings });
const checkValidation = (request) => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) throw Object.assign(new Error(errors.array()[0].msg), { status: 400 });
};

router.post('/register',
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2 to 80 characters'),
  body('email').isEmail().withMessage('Enter a valid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['student', 'owner']).withMessage('Choose student or owner'),
  async (request, response, next) => {
    try {
      checkValidation(request);
      const email = request.body.email.toLowerCase();
      if (await User.exists({ email })) return response.status(409).json({ message: 'An account with this email already exists' });
      const user = await User.create({
        name: request.body.name,
        email,
        passwordHash: await bcrypt.hash(request.body.password, 12),
        role: request.body.role || 'student',
        phone: request.body.phone,
        college: request.body.college
      });
      response.status(201).json({ token: tokenFor(user), user: publicUser(user) });
    } catch (error) { next(error); }
  }
);

router.post('/login',
  body('email').isEmail().withMessage('Enter a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
  async (request, response, next) => {
    try {
      checkValidation(request);
      const user = await User.findOne({ email: request.body.email.toLowerCase() }).select('+passwordHash');
      if (!user || !(await bcrypt.compare(request.body.password, user.passwordHash))) {
        return response.status(401).json({ message: 'Email or password is incorrect' });
      }
      if (user.isBlocked) return response.status(403).json({ message: 'This account has been blocked' });
      response.json({ token: tokenFor(user), user: publicUser(user) });
    } catch (error) { next(error); }
  }
);

router.post('/logout', requireAuth, async (request, response, next) => {
  try {
    await User.updateOne({ _id: request.user.id }, { $inc: { tokenVersion: 1 } });
    response.status(204).end();
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, (request, response) => response.json({ user: publicUser(request.user) }));

export default router;