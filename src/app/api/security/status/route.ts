import { NextRequest, NextResponse } from "next/server";
import { withSecurity, validateEnvironment } from "@/lib/auth/security";

async function getSecurityStatus(request: NextRequest) {
  const envValidation = validateEnvironment();
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      valid: envValidation.valid,
      errors: envValidation.errors,
    },
    security: {
      headers: "enabled",
      rateLimiting: "enabled",
      inputValidation: "enabled",
      authentication: "enabled",
      middleware: "enabled",
    },
    features: {
      nextAuth: "enabled",
      mongodb: "enabled",
      openai: "enabled",
      supabase: "enabled",
    },
  });
}

export const GET = withSecurity(getSecurityStatus, {
  requireAuth: true,
  requireAdmin: true,
  rateLimit: true,
  validateInput: true,
});