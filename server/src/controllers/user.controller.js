import User from '../models/User.js';

export async function getUsers(req, res, next) {
  try {
    const users = await User.find({}, '-passwordHash').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
}
