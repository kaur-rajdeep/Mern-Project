import { Request, Response, NextFunction } from 'express';

/**
 * Recursively sanitizes an object or array by removing keys that start with '$'
 * or contain a '.' to prevent NoSQL operator injection in MongoDB queries.
 */
function sanitize(obj: any): void {
  if (!obj || typeof obj !== 'object') {
    return;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'object' && obj[i] !== null) {
        sanitize(obj[i]);
      }
    }
    return;
  }

  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitize(obj[key]);
    }
  }
}

/**
 * Express middleware to sanitize req.body, req.query, and req.params against NoSQL injection.
 */
export const mongoSanitize = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  next();
};
