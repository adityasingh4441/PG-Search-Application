import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function requireAuth(request, _response, next) {
  try {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return next(Object.assign(new Error('Sign in to continue'), { status: 401 }));
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'local-development-secret-change-me');
    const user = await User.findById(payload.sub);
    if (!user || user.isBlocked) return next(Object.assign(new Error('This account is unavailable'), { status: 401 }));
    if ((payload.ver || 0) !== (user.tokenVersion || 0)) return next(Object.assign(new Error('Your session has ended. Sign in again.'), { status: 401 }));
    request.user = user;
    return next();
  } catch {
    return next(Object.assign(new Error('Your session is invalid or expired'), { status: 401 }));
  }
}

export function requireRole(...roles) {
  return (request, _response, next) => {
    if (!request.user || !roles.includes(request.user.role)) {
      return next(Object.assign(new Error('You do not have permission to do that'), { status: 403 }));
    }
    return next();
  };
}