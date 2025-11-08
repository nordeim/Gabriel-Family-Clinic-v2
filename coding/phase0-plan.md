Of course. The meticulous planning of the database schema must now be matched by an equally meticulous plan for the foundational codebase. Phase 0 is about establishing the development environment, tooling, and core project structure that will ensure consistency, quality, and developer velocity for the entire 18-month roadmap.

I have analyzed the `Master_Execution_Plan` for Phase 0 and cross-referenced it with the `Project_Architecture_Document` and the provided reference configuration files. I will adapt the best practices from the T3 stack (a popular, type-safe Next.js starter) referenced in your files, but I will customize them to align perfectly with our project's specific needs, such as using Supabase instead of Prisma/NextAuth and adhering to our established file structure.

Here is the comprehensive sub-plan for implementing Phase 0.

---

### **Comprehensive Sub-Plan: Phase 0 - Foundation & Setup**

**Objective:** To create a complete, configured, and validated project skeleton. This includes setting up the development environment, defining coding standards, establishing the CI/CD pipeline, and creating the foundational file structure. By the end of this phase, a new developer should be able to clone the repository, install dependencies, and run a working "Hello World" application connected to the database with a single command.

#### **Guiding Principles for Codebase Setup**

1.  **Type-Safety First:** Every configuration and line of code will prioritize end-to-end type safety, from the database schema to the frontend components.
2.  **Developer Experience (DX):** Tooling will be configured for maximum efficiency, with auto-formatting, linting, and clear conventions to minimize cognitive overhead.
3.  **Convention over Configuration:** We will establish and document clear conventions for file structure, naming, and state management, following the `Project_Architecture_Document`.
4.  **Automation:** All quality checks (linting, formatting, type-checking) will be automated and enforced through Git hooks and the CI pipeline.
5.  **Pragmatism:** While inspired by best practices (like the T3 stack), every choice will be pragmatic and tailored to our specific stack (Supabase, Mantine UI, tRPC) and team size.

---

### **Execution Plan: Sequential File Creation**

I will create the necessary files in a logical order, starting from the core project definition and moving to tooling, configuration, and finally, the application's entry points.

#### **Part 1: Core Project Definition**

**Objective:** Define the project's identity, dependencies, and core scripts.

| File Path | Description | Checklist |
| :--- | :--- | :--- |
| `package.json` | The heart of the project. It will be customized from the reference to include our specific stack: Supabase client instead of Prisma, and dependencies for Mantine UI and tRPC. Scripts will be streamlined for our workflow. | `[ ]` Define project name, version, and type.<br>`[ ]` Add dependencies: `next`, `react`, `react-dom`, `@supabase/supabase-js`, `@mantine/core`, `zustand`, `react-hook-form`, `zod`, tRPC stack.<br>`[ ]` Add devDependencies: `typescript`, `eslint`, `prettier`, `postcss`, `tailwindcss`, `@types/*`.<br>`[ ]` Define core scripts: `dev`, `build`, `start`, `lint`, `format`, `type-check`.<br>`[ ]` Remove Prisma/NextAuth-specific dependencies and scripts. |
| `.gitignore` | A comprehensive file to prevent committing unnecessary files (e.g., `node_modules`, `.env.local`, build artifacts) to version control. | `[ ]` Ignore `node_modules`, `.next`, `out`.<br>`[ ]` Ignore all `.env*` files except `.env.example`.<br>`[ ]` Ignore OS-specific files (e.g., `.DS_Store`, `Thumbs.db`).<br>`[ ]` Ignore log files and test reports. |

#### **Part 2: TypeScript and Tooling Configuration**

**Objective:** Configure TypeScript, ESLint, Prettier, and PostCSS to enforce our coding standards and enable modern features.

| File Path | Description | Checklist |
| :--- | :--- | :--- |
| `tsconfig.json` | TypeScript compiler configuration. It will be adapted from the reference to align with Next.js 15+ best practices and our specific path aliases from the architecture document. | `[ ]` Set up base compiler options (`target: "es2022"`, `strict: true`, etc.).<br>`[ ]` Configure module resolution (`moduleResolution: "Bundler"`).<br>`[ ]` Enable Next.js plugin.<br>`[ ]` Define path aliases (`@/*` pointing to `src/`).<br>`[ ]` Set `include` and `exclude` paths correctly. |
| `eslint.config.js` | ESLint configuration for code quality and consistency. It will be a modern, flat config file adapted from the reference to include rules for React, Next.js, and TypeScript. | `[ ]` Set up flat config structure.<br>`[ ]` Extend from `next/core-web-vitals` and `typescript-eslint`.<br>`[ ]` Define rules for consistent type imports and unused variable warnings.<br>`[ ]` Ignore build directories like `.next`. |
| `prettier.config.js` | Prettier configuration for automated code formatting. It will be configured to work with the Tailwind CSS plugin for automatic class sorting. | `[ ]` Define the configuration file.<br>`[ ]` Add `prettier-plugin-tailwindcss`.<br>`[ ]` (Optional) Add `.prettierrc` for editor integration with basic rules (e.g., `semi: true`, `singleQuote: false`). |
| `postcss.config.js` | PostCSS configuration required for Tailwind CSS to process stylesheets. | `[ ]` Define the configuration file.<br>`[ ]` Include the `@tailwindcss/postcss` plugin. |
| `.vscode/settings.json` | (Optional but recommended) VS Code workspace settings to ensure a consistent developer experience for the team (e.g., format on save). | `[ ]` Configure default formatter to Prettier.<br>`[ ]` Enable format on save.<br>`[ ]` Enable ESLint validation for all relevant files. |

#### **Part 3: Next.js and Styling Configuration**

**Objective:** Configure the Next.js framework and set up the foundation for our styling system using Tailwind CSS.

| File Path | Description | Checklist |
| :--- | :--- | :--- |
| `next.config.js` | Next.js configuration file. We will enable Strict Mode and configure image domains for Supabase Storage. The environment validation from the reference is a good practice to keep. | `[ ]` Set up basic Next.js config.<br>`[ ]` Enable `reactStrictMode: true`.<br>`[ ]` Configure `images.domains` for the Supabase project URL.<br>`[ ]` Add environment variable validation setup (from reference). |
| `tailwind.config.js`| Tailwind CSS configuration. This is where we will implement our Design System's tokens (colors, fonts, spacing) from the `Project_Requirements_Document`. | `[ ]` Configure `content` paths to scan `src/**/*.{js,ts,jsx,tsx,mdx}`.<br>`[ ]` Extend the `theme` with our custom color palette (primary coral, secondary teal, etc.).<br>`[ ]` Set the base font size to `18px` for accessibility.<br>`[ ]` Add any necessary plugins. |
| `src/styles/globals.css` | The global stylesheet. It will contain Tailwind's base layers, root CSS variables for our theme, and any global base styles. | `[ ]` Import Tailwind directives: `@tailwind base;`, `@tailwind components;`, `@tailwind utilities;`.<br>`[ ]` Define `:root` CSS variables for the color palette.<br>`[ ]` Set global `body` styles (e.g., default font, background color). |

#### **Part 4: Environment and Project Structure Setup**

**Objective:** Create the environment variable template and the foundational directory structure as defined in the architecture.

| File Path | Description | Checklist |
| :--- | :--- | :--- |
| `.env.example` | The template for all required environment variables. This serves as documentation for developers and is crucial for setting up new environments. | `[ ]` Add application variables (`NEXT_PUBLIC_APP_URL`).<br>`[ ]` Add Supabase variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).<br>`[ ]` Add placeholders for all third-party integration keys (Stripe, Twilio, etc.).<br>`[ ]` Add the `DATABASE_URL` for connecting directly to Postgres. |
| `src/env.js` | (Adapted from reference) A Zod-based schema to validate environment variables at runtime, ensuring the application fails fast if misconfigured. | `[ ]` Create a Zod schema for server-side variables.<br>`[ ]` Create a Zod schema for client-side (`NEXT_PUBLIC_`) variables.<br>`[ ]` Export the validated `env` object. |
| **Directory Structure** | The empty directory structure that will house all future code. | `[ ]` Create `src/pages`, `src/components`, `src/lib`, `src/hooks`, `src/styles`, `src/types`, `src/config`.<br>`[ ]` Create `public/images`, `public/icons`, `public/fonts`.<br>`[ ]` Create `database/migrations`, `database/seeds`.<br>`[ ]` Create `docs/` and `tests/`. |

#### **Part 5: GitHub and CI/CD Foundation**

**Objective:** Set up the GitHub repository with workflows and templates to enforce quality and automate checks.

| File Path | Description | Checklist |
| :--- | :--- | :--- |
| `.github/workflows/ci.yml` | The Continuous Integration pipeline. It will run on every push and pull request to ensure the codebase remains healthy. | `[ ]` Define triggers (`on: push`, `on: pull_request`).<br>`[ ]` Create a `lint-and-type-check` job that runs `npm run lint` and `npm run type-check`.<br>`[ ]` Create a `build` job that runs `npm run build`.<br>`[ ]` (Placeholder) Define a `test` job to be filled in later. |
| `.github/pull_request_template.md` | A template to guide developers in creating descriptive and consistent pull requests. | `[ ]` Add sections for "Description", "Related Issue", "Changes Made", and "Testing".<br>`[ ]` Include a checklist for self-review (e.g., "Tests added", "Documentation updated"). |
| `.github/CODEOWNERS` | A file to automatically request reviews from specific teams or individuals when certain files are changed. | `[ ]` Add an entry for `database/migrations/` to require review from the database owner/lead developer. |
| `README.md` | The project's main entry point, adapted from the provided `README.md` to include setup instructions specific to this codebase. | `[ ]` Add project title and banner.<br>`[ ]` Add "Quick Start" and "Installation" sections.<br>`[ ]` Add scripts usage explanation. |

---

### **Validation and Approval**

I have reviewed this sub-plan against all project documents and the provided reference files.

*   **Alignment with Architecture:** The plan directly implements the file structure, technology stack, and conventions defined in the `Project_Architecture_Document`.
*   **Best Practices:** It incorporates modern, best-practice tooling from the reference files (e.g., flat ESLint config, environment validation) while adapting them to our specific needs.
*   **Feasibility:** All steps are logical, sequential, and achievable within the "Weeks 1-2" timeline allocated for Phase 0. The output will be a robust, high-quality project foundation.
*   **Completeness:** The plan covers every deliverable listed for Phase 0 in the `Master_Execution_Plan`.

This plan provides a solid, meticulous blueprint for constructing the project's skeleton. It establishes a high bar for quality and developer experience from the very beginning.

I am ready to proceed with generating the code for each of these files. Please provide your approval.
