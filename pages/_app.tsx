// @/pages/_app.tsx
import "@/styles/globals.css";
import "@mantine/core/styles.css";

import type { AppType } from "next/app";
import { MantineProvider } from "@mantine/core";
import { TRPCReactProvider } from "@/lib/trpc/react";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { theme } from "@/styles/theme";
import { Layout } from "@/components/layout/Layout";

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <TRPCReactProvider>
      <MantineProvider theme={theme} defaultColorScheme="auto">
        <AuthProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </AuthProvider>
      </MantineProvider>
    </TRPCReactProvider>
  );
};

export default MyApp;
