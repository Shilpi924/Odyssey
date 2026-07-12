import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthWrapper from "@/components/AuthWrapper";
import BottomNavigation from "@/components/layout/BottomNavigation";
import { cookies } from "next/headers";
import { parseDisplayPreferences, THEME_COOKIE } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Odyssey — Trail intelligence for every group",
  description: "AI-powered hiking recommendations, offline-ready trail maps, and live GPS tracking.",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#0f172a",
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const initialDisplay = parseDisplayPreferences(cookieStore.get(THEME_COOKIE)?.value);
  return (
    <html
      lang="en"
      data-theme={initialDisplay.resolvedTheme}
      data-contrast={initialDisplay.highContrast ? 'high' : 'standard'}
      data-motion={initialDisplay.reducedMotion ? 'reduced' : 'full'}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col transition-colors duration-300">
        <AuthWrapper initialDisplay={initialDisplay}>{children}</AuthWrapper>
        <BottomNavigation />
      </body>
    </html>
  );
}
