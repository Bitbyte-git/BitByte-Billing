import { validationResult } from 'express-validator';

export function validate(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(Object.assign(new Error('Validation failed'), { status: 422, details: errors.array() }));
  next();
}
