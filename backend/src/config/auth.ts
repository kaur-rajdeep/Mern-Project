import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET;
const DEFAULT_INSECURE_FALLBACK = 'panacea_infosec_jwt_super_secret_key_2026_!@#';

if (isProduction && (!JWT_SECRET || JWT_SECRET === DEFAULT_INSECURE_FALLBACK)) {
  throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is not configured or using default fallback key in production!');
}

export const AUTH_CONFIG = {
  JWT_SECRET: JWT_SECRET || DEFAULT_INSECURE_FALLBACK,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'panacea_infosec_refresh_token_secret_key_2026_!@#',
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  JWT_ALGORITHM: 'HS256' as const,
};
