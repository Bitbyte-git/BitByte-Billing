import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { encrypt, decrypt } from '../utils/crypto.js';

const MAX_SESSION_SECONDS = 3 * 60;

function sessionDurationSeconds() {
  const value = process.env.JWT_EXPIRES_IN?.trim();
  const match = value?.match(/^(\d+)([smhd])?$/i);

  if (!match) return MAX_SESSION_SECONDS;

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase() || 's';
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[unit];

  return Math.min(amount * multiplier, MAX_SESSION_SECONDS);
}

function sign(user) {
  return jwt.sign(
    { sub: user._id, role: user.role },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: sessionDurationSeconds() }
  );
}

export async function register(req, res, next) {
  try {
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const userData = { ...req.body, email: req.body.email.toLowerCase(), passwordHash };
    if (req.body.role === 'Accountant') {
      userData.encryptedPassword = encrypt(req.body.password);
    }
    const user = await User.create(userData);
    res.status(201).json({ user: sanitize(user), token: sign(user) });
  } catch (err) {
    next(err);
  }
}

export async function registerClientPublic(req, res, next) {
  try {
    const { name, companyName, email, phone, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email: email.toLowerCase(), phone, passwordHash, role: 'Client' });
    
    const { nextClientId } = await import('../utils/idGenerator.js');
    const ClientModel = (await import('../models/Client.js')).default;
    
    await ClientModel.create({
      clientId: await nextClientId(),
      fullName: name,
      companyName,
      email: email.toLowerCase(),
      phone,
      registeredBy: user._id
    });
    
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

export async function removeUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    if (user.role === 'Admin') throw Object.assign(new Error('Cannot delete admin'), { status: 403 });
    await user.deleteOne();
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
}

export async function viewCredentials(req, res, next) {
  try {
    console.log('viewCredentials request for ID:', req.params.id, 'body:', req.body);
    const { pin } = req.body;
    if (pin !== (process.env.ADMIN_PIN || '1234')) {
      return next(Object.assign(new Error('Invalid secret code'), { status: 401 }));
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(Object.assign(new Error('User not found'), { status: 404 }));
    }
    if (!user.encryptedPassword) {
      return next(Object.assign(new Error('Credentials not available for this user. Only accountant passwords are stored encrypted.'), { status: 404 }));
    }
    res.json({ email: user.email, password: decrypt(user.encryptedPassword) });
  } catch (err) {
    next(err);
  }
}
