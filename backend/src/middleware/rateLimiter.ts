import rateLimit from 'express-rate-limit';

const SERVER_BUSY_MESSAGE = {
  success: false,
  message: 'Servers are currently busy. Please try again later.',
};

// Rate-limit test bypass is strictly prohibited in production environments
const isTestOrDevBypassAllowed =
  process.env.NODE_ENV !== 'production' &&
  (process.env.NODE_ENV === 'test' ||
    process.env.ENABLE_TEST_BYPASS === 'true' ||
    process.env.NODE_ENV === 'development');

const shouldBypass = (req: any): boolean => {
  return isTestOrDevBypassAllowed && req.headers['x-test-bypass'] === 'true';
};

// Strict limiter for authentication endpoints (login)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP per window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: SERVER_BUSY_MESSAGE,
  skip: shouldBypass,
});

// Stricter limiter specifically for forgot-password requests to prevent abuse/spam
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP per window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: SERVER_BUSY_MESSAGE,
  skip: shouldBypass,
});

// Upload endpoint limiter to prevent storage flooding
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Limit each IP to 60 upload actions per 15 mins
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: SERVER_BUSY_MESSAGE,
  skip: shouldBypass,
});

// General API protection limiter
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: SERVER_BUSY_MESSAGE,
  skip: shouldBypass,
});
