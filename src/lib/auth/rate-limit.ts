import { NextRequest } from "next/server";

// Simple in-memory rate limiter (for production, use Redis or database)
const rateLimit = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

export function createRateLimit(options: RateLimitOptions) {
  return (req: NextRequest, identifier?: string) => {
    const key = identifier || getClientIdentifier(req);
    const now = Date.now();
    
    // Clean expired entries
    if (rateLimit.has(key)) {
      const entry = rateLimit.get(key)!;
      if (now > entry.resetTime) {
        rateLimit.delete(key);
      }
    }
    
    // Get or create entry
    const entry = rateLimit.get(key) || {
      count: 0,
      resetTime: now + options.windowMs,
    };
    
    // Check if limit exceeded
    if (entry.count >= options.maxRequests) {
      return {
        success: false,
        limit: options.maxRequests,
        remaining: 0,
        reset: new Date(entry.resetTime),
      };
    }
    
    // Increment count
    entry.count++;
    rateLimit.set(key, entry);
    
    return {
      success: true,
      limit: options.maxRequests,
      remaining: options.maxRequests - entry.count,
      reset: new Date(entry.resetTime),
    };
  };
}

function getClientIdentifier(req: NextRequest): string {
  // Try to get IP address
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0] || "anonymous";
  
  // You can also use user ID if available
  const userAgent = req.headers.get("user-agent") || "";
  
  return `${ip}:${userAgent.slice(0, 50)}`;
}

// Pre-configured rate limiters
export const apiRateLimit = createRateLimit({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

export const chatRateLimit = createRateLimit({
  maxRequests: 20,
  windowMs: 10 * 60 * 1000, // 10 minutes
});

export const authRateLimit = createRateLimit({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
});