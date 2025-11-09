
// Re-export canonical TRPC React provider and client from the src implementation.
// This avoids duplication between `lib/` and `src/` and keeps the transformer
// configuration in one place (`src/trpc/react.tsx`).

export { TRPCReactProvider, api } from "../../src/trpc/react";
