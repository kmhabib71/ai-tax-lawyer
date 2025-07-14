import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Check if the user is trying to access admin routes
    if (req.nextUrl.pathname.startsWith("/admin")) {
      // Only allow admin access (you can add admin role check here)
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    // Allow access to protected routes for authenticated users
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Check if the route requires authentication
        const protectedRoutes = ["/dashboard", "/chat", "/profile", "/admin"];
        const isProtectedRoute = protectedRoutes.some(route => 
          req.nextUrl.pathname.startsWith(route)
        );

        if (isProtectedRoute) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
};