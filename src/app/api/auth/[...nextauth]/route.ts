import NextAuth from "next-auth/next";
import { authConfig } from "~/server/auth/config";

// `authConfig` is exported from `src/server/auth/config.ts` and is already typed
// as `NextAuthOptions`. Call NextAuth with that typed config directly to avoid
// `any` casts which break the project's ESLint rules.
const handler = NextAuth(authConfig);

export const { GET, POST } = handler;
