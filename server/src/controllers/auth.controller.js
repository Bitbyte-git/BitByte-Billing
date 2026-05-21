import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

function sign(user) {
  return jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

export async function register(req, res, next) {
  try {
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const user = await User.create({ ...req.body, email: req.body.email.toLowerCase(), passwordHash });
    res.status(201).json({ user: sanitize(user), token: sign(user) });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    res.json({ user: sanitize(user), token: sign(user) });
  } catch (err) {
    next(err);
  }
}

export function me(req, res) {
  res.json({ user: sanitize(req.user) });
}

export function logout(_req, res) {
  res.json({ message: 'Logged out' });
}

export async function listUsers(_req, res, next) {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json(users.map(sanitize));
  } catch (err) {
    next(err);
  }
}

function sanitize(user) {
  return { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, status: user.status };
}
