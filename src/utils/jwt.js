import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'thaco_auto_hp_secret_key_2026_jwt_token_secure';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}
