import { NextRequest } from "next/server";

export interface ValidationResult {
  success: boolean;
  errors?: string[];
  data?: any;
}

// Input sanitization
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") return "";
  
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential XSS characters
    .slice(0, 10000); // Limit length
}

export function sanitizeObject(obj: any): any {
  if (typeof obj !== "object" || obj === null) return obj;
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Strong password validation
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Chat message validation
export function validateChatMessage(message: string): ValidationResult {
  const errors: string[] = [];
  
  if (!message || message.trim().length === 0) {
    errors.push("Message cannot be empty");
  }
  
  if (message.length > 2000) {
    errors.push("Message too long (max 2000 characters)");
  }
  
  // Check for potential spam patterns
  const spamPatterns = [
    /(.)\1{10,}/, // Repeated characters
    /https?:\/\/[^\s]+/gi, // URLs (can be adjusted based on needs)
  ];
  
  for (const pattern of spamPatterns) {
    if (pattern.test(message)) {
      errors.push("Message contains suspicious content");
      break;
    }
  }
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    data: sanitizeInput(message),
  };
}

// Request validation middleware
export function validateRequest(req: NextRequest): ValidationResult {
  const errors: string[] = [];
  
  // Check content type for POST requests
  if (req.method === "POST" || req.method === "PUT") {
    const contentType = req.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      errors.push("Content-Type must be application/json");
    }
  }
  
  // Check for required headers
  const userAgent = req.headers.get("user-agent");
  if (!userAgent) {
    errors.push("User-Agent header is required");
  }
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// User profile validation
export function validateUserProfile(profile: any): ValidationResult {
  const errors: string[] = [];
  
  if (!profile.name || profile.name.trim().length < 2) {
    errors.push("Name must be at least 2 characters long");
  }
  
  if (!profile.email || !validateEmail(profile.email)) {
    errors.push("Valid email is required");
  }
  
  if (profile.userType && !["salaried", "freelancer", "business", "landlord"].includes(profile.userType)) {
    errors.push("Invalid user type");
  }
  
  if (profile.language && !["en", "bn"].includes(profile.language)) {
    errors.push("Invalid language");
  }
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    data: sanitizeObject(profile),
  };
}