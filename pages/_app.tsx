// pages/_app.tsx

import "@/styles/globals.css";
import "@mantine/core/styles.css";

import type { AppType } from "next/app";
import { Inter } from "next/font/google";
import { MantineProvider } from "@mantine/core";
import { TRPCReactProvider } from "@/lib/trpc/react";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { theme } from "@/styles/theme";
import { Layout } from "@/components/layout/Layout";
import { cn } from "@/lib/utils";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";

// Configure the Inter font for self-hosting. This improves performance and prevents layout shift.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans", // This creates a CSS variable for our font.
});

/**
 * The main App component. It wraps every page with global providers and layout.
 * - TRPCReactProvider: Provides the tRPC client for type-safe API calls.
 * - MantineProvider: Provides the theme and components for the UI library.
 * - AuthProvider: Manages and provides the user's authentication state.
 * - Layout: Provides the consistent Header, Footer, and page structure.
 * - FeedbackWidget: Provides the global user feedback collection tool.
 */
const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    // Use a div as the root wrapper and apply the font variable class.
    // This is semantically more correct than <main> at this top level.
    <div className={cn("font-sans", inter.variable)}>
      <TRPCReactProvider>
        <MantineProvider theme={theme} defaultColorScheme="auto">
          <AuthProvider>
            <Layout>
              <Component {...pageProps} />
            </Layout>
            <FeedbackWidget />
          </AuthProvider>
        </MantineProvider>
      </TRPCReactProvider>
    </div>
  );
};

export default MyApp;
