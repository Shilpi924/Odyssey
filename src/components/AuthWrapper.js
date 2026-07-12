"use client";

import { SessionProvider } from "next-auth/react";
import ThemeProvider from "./ThemeProvider";

export default function AuthWrapper({ children, initialDisplay }) {
  return <SessionProvider><ThemeProvider initialDisplay={initialDisplay}>{children}</ThemeProvider></SessionProvider>;
}
