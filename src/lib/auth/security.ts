import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./config";
import { apiRateLimit } from "./rate-limit";
import { validateRequest } from "./validation";

// Security headers for API responses
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Content-Security-Policy", "default-src 'self'");
  
  return response;
}

// Secure API wrapper with authentication and rate limiting
export function withSecurity(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean;
    requireAdmin?: boolean;
    rateLimit?: boolean;
    validateInput?: boolean;
  } = {}
) {
  return async (req: NextRequest, context?: any) => {
    try {
      // Request validation
      if (options.validateInput) {
        const validation = validateRequest(req);
        if (!validation.success) {
          return NextResponse.json(
            { error: "Invalid request", details: validation.errors },
            { status: 400 }
          );
        }
      }

      // Rate limiting
      if (options.rateLimit) {
        const rateResult = apiRateLimit(req);
        if (!rateResult.success) {
          return NextResponse.json(
            { 
              error: "Rate limit exceeded", 
              limit: rateResult.limit,
              reset: rateResult.reset 
            },
            { status: 429 }
          );
        }
      }

      // Authentication check
      if (options.requireAuth) {
        const session = await getServerSession(authOptions);
        if (!session) {
          return NextResponse.json(
            { error: "Authentication required" },
            { status: 401 }
          );
        }

        // Admin check
        if (options.requireAdmin) {
          // You can add admin role check here
          // For now, we'll just check if user exists
          if (!session.user) {
            return NextResponse.json(
              { error: "Admin access required" },
              { status: 403 }
            );
          }
        }
      }

      // Call the actual handler
      const response = await handler(req, context);
      
      // Add security headers
      return addSecurityHeaders(response);
    } catch (error) {
      console.error("Security wrapper error:", error);
      
      const response = NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
      
      return addSecurityHeaders(response);
    }
  };
}

// Session management utilities
export async function getUserSession(req: NextRequest) {
  const session = await getServerSession(authOptions);
  return session;
}

export async function requireUserSession(req: NextRequest) {
  const session = await getUserSession(req);
  if (!session) {
    throw new Error("Authentication required");
  }
  return session;
}

// CSRF protection (simple implementation)
export function generateCSRFToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

export function validateCSRFToken(token: string, expectedToken: string): boolean {
  return token === expectedToken;
}

// Log security events
export function logSecurityEvent(event: {
  type: 'AUTH_SUCCESS' | 'AUTH_FAILURE' | 'RATE_LIMIT' | 'INVALID_INPUT' | 'ADMIN_ACCESS';
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: any;
}) {
  // In production, you'd send this to a logging service
  console.log(`[SECURITY] ${event.type}:`, {
    timestamp: new Date().toISOString(),
    ...event,
  });
}

// Environment validation
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!process.env.NEXTAUTH_SECRET) {
    errors.push("NEXTAUTH_SECRET is not set");
  }
  
  if (!process.env.NEXTAUTH_URL) {
    errors.push("NEXTAUTH_URL is not set");
  }
  
  if (!process.env.GOOGLE_CLIENT_ID) {
    errors.push("GOOGLE_CLIENT_ID is not set");
  }
  
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    errors.push("GOOGLE_CLIENT_SECRET is not set");
  }
  
  if (!process.env.MONGODB_URI) {
    errors.push("MONGODB_URI is not set");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}