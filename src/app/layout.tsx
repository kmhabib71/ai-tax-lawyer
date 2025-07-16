import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/layout/navigation";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/contexts/LanguageContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Tax Lawyer - Tax Advisor for Bangladesh",
  description:
    "AI-powered tax advisor helping Bangladeshi taxpayers legally optimize their taxes using NBR rules and regulations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <LanguageProvider>
          <AuthProvider>
            <Navigation />
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
