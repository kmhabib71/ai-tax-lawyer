"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useTranslation } from "@/contexts/LanguageContext";

export default function Navigation() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { t } = useTranslation();

  const navItems = [
    { href: "/", label: t("nav.home") },
    { href: "/dashboard", label: t("nav.dashboard") },
    { href: "/calculator", label: t("nav.calculator") },
    { href: "/optimizer", label: t("nav.optimizer") },
    { href: "/chat", label: t("nav.chat") },
    { href: "/pricing", label: t("nav.pricing") },
    { href: "/profile", label: t("nav.profile") },
    { href: "/onboarding", label: "Setup" },
    { href: "/test-scraping", label: "Test Scraping" },
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">⚖️</span>
              <span className="text-xl font-bold text-gray-800">
                {t("home.title")}
              </span>
            </Link>

            <div className="hidden md:flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            {status === "loading" ? (
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            ) : session ? (
              <div className="flex items-center space-x-4">
                <div className="hidden md:flex items-center space-x-2">
                  <img
                    src={session.user?.image || "/default-avatar.png"}
                    alt="Profile"
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {session.user?.name || session.user?.email}
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={() => signOut()}>
                  {t("auth.signout")}
                </Button>
              </div>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => signIn()}>
                  {t("auth.signin")}
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => signIn()}
                >
                  {t("auth.signup")}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
