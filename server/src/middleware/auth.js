import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function authenticate(req, _res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw Object.assign(new Error('Authentication required'), { status: 401 });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const user = await User.findById(decoded.sub);
    if (!user || user.status !== 'Active') throw Object.assign(new Error('Invalid session'), { status: 401 });
    req.user = user;
    next();
  } catch (err) {
    next(Object.assign(err, { status: err.status || 401 }));
  }
}

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user.role)) return next(Object.assign(new Error('Forbidden'), { status: 403 }));
    next();
  };
}
