import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthWrapper from "@/components/AuthWrapper";
import BottomNavigation from "@/components/layout/BottomNavigation";

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

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthWrapper>{children}</AuthWrapper>
        <BottomNavigation />
      </body>
    </html>
  );
}
