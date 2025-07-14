"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

const errorMessages = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The sign in link is no longer valid.",
  Default: "An error occurred during sign in.",
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") as keyof typeof errorMessages;
  const errorMessage = errorMessages[error] || errorMessages.Default;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 bg-white shadow-lg">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Authentication Error
          </h1>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/auth/signin">Try Again</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Go Home</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}