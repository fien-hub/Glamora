import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate limiter configuration for different endpoint types
 */

// General API rate limiter - 100 requests per 15 minutes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: '15 minutes',
    });
  },
});

// Strict rate limiter for authentication endpoints - 5 requests per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login/signup requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests, even successful ones
  handler: (req: Request, res: Response) => {
    console.warn(`[RateLimit] Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'You have exceeded the maximum number of authentication attempts. Please try again in 15 minutes.',
      retryAfter: '15 minutes',
    });
  },
});

// Payment creation rate limiter - 10 requests per hour (for creating payment intents)
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 payment requests per hour
  message: {
    error: 'Too many payment requests, please try again later.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    console.warn(`[RateLimit] Payment rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many payment requests',
      message: 'You have exceeded the maximum number of payment requests. Please try again in 1 hour.',
      retryAfter: '1 hour',
    });
  },
});

// Payment history/read rate limiter - 100 requests per 15 minutes (for viewing payment history)
export const paymentReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 read requests per 15 minutes
  message: {
    error: 'Too many payment history requests, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    console.warn(`[RateLimit] Payment read rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many payment history requests',
      message: 'You are viewing payment history too frequently. Please try again later.',
      retryAfter: '15 minutes',
    });
  },
});

// Booking creation rate limiter - 20 requests per hour
export const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 booking requests per hour
  message: {
    error: 'Too many booking requests, please try again later.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    console.warn(`[RateLimit] Booking rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many booking requests',
      message: 'You have exceeded the maximum number of booking requests. Please try again in 1 hour.',
      retryAfter: '1 hour',
    });
  },
});

// Message sending rate limiter - 50 messages per 15 minutes
export const messageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 messages per windowMs
  message: {
    error: 'Too many messages sent, please slow down.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    console.warn(`[RateLimit] Message rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many messages',
      message: 'You are sending messages too quickly. Please slow down.',
      retryAfter: '15 minutes',
    });
  },
});

// File upload rate limiter - 30 uploads per hour
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // Limit each IP to 30 uploads per hour
  message: {
    error: 'Too many file uploads, please try again later.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    console.warn(`[RateLimit] Upload rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many file uploads',
      message: 'You have exceeded the maximum number of file uploads. Please try again in 1 hour.',
      retryAfter: '1 hour',
    });
  },
});

// Search rate limiter - 60 searches per 15 minutes
export const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Limit each IP to 60 searches per windowMs
  message: {
    error: 'Too many search requests, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many search requests',
      message: 'You are searching too frequently. Please try again later.',
      retryAfter: '15 minutes',
    });
  },
});

/**
 * Create a custom rate limiter with specific configuration
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: options.message,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
    handler: (req: Request, res: Response) => {
      console.warn(`[RateLimit] Custom rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: options.message,
        retryAfter: `${options.windowMs / 60000} minutes`,
      });
    },
  });
}

/**
 * Rate limiter for user-specific actions (requires authentication)
 * Uses user ID instead of IP address for more accurate tracking
 */
export function createUserRateLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: options.message,
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Use user ID from request if available, otherwise fall back to IP
    keyGenerator: (req: Request) => {
      return (req as any).user?.id || req.ip || 'unknown';
    },
    handler: (req: Request, res: Response) => {
      const userId = (req as any).user?.id;
      console.warn(`[RateLimit] User rate limit exceeded for user: ${userId || req.ip}`);
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: options.message,
        retryAfter: `${options.windowMs / 60000} minutes`,
      });
    },
  });
}

export default {
  generalLimiter,
  authLimiter,
  paymentLimiter,
  paymentReadLimiter,
  bookingLimiter,
  messageLimiter,
  uploadLimiter,
  searchLimiter,
  createRateLimiter,
  createUserRateLimiter,
};

