# Gabriel Family Clinic v2.0 - Gemini Context

This document provides a comprehensive overview of the Gabriel Family Clinic v2.0 project, designed to give an AI assistant the necessary context to understand and contribute to the codebase.

## Project Overview

Gabriel Family Clinic v2.0 is a comprehensive, cloud-native healthcare management platform designed for Singapore's neighborhood family clinics. It aims to modernize clinic operations, improve patient care, and ensure regulatory compliance (PDPA & MOH). The platform is built with an "elderly-friendly" design philosophy.

The system consists of three main user-facing portals:
1.  **Patient Portal:** For booking appointments, viewing medical records, and making payments.
2.  **Doctor Portal:** For managing schedules, conducting consultations, and writing prescriptions.
3.  **Admin Dashboard:** For multi-clinic management, analytics, and system configuration.

## Architecture

The project follows a "Progressive Enhancement" philosophy, prioritizing maintainability, security, and user experience. It uses a modern, serverless architecture built on Vercel and Supabase.

- **Frontend:** A Next.js (Pages Router) application built with TypeScript and styled with Tailwind CSS and the Mantine component library.
- **Backend:** A combination of Next.js API Routes and a type-safe tRPC API.
- **Database:** PostgreSQL managed by Supabase, utilizing its Auth, Storage, and Realtime features.
- **Infrastructure:** Hosted on Vercel, with CI/CD managed by GitHub Actions.
- **Key Patterns:** The codebase utilizes several design patterns, including the Repository pattern for data access, a Service Layer for business logic, and a Factory pattern for notifications.

## Technology Stack

- **Framework:** [Next.js 14.2.5](https://nextjs.org/)
- **Language:** [TypeScript 5.5.3](https://www.typescriptlang.org/)
- **API:** [tRPC 11.0.0-rc.464](https://trpc.io/)
- **Database:** [PostgreSQL 15+](https://www.postgresql.org/) (via Supabase)
- **Authentication:** [Supabase Auth](https://supabase.com/docs/guides/auth)
- **Styling:** [Tailwind CSS 3.4.6](https://tailwindcss.com/) & [Mantine 7.11.1](https://mantine.dev/)
- **State Management:** [Zustand 4.5.4](https://zustand-demo.pmnd.rs/)
- **Forms:** [React Hook Form 7.52.1](https://react-hook-form.com/)
- **Validation:** [Zod 3.23.8](https://zod.dev/)
- **Deployment:** Vercel
- **CI/CD:** GitHub Actions

## Building and Running

### Prerequisites

-   Node.js (v20.x or later)
-   npm (v10.x or later)
-   A Supabase account (free tier is sufficient)

### Local Development

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Crucial: Set Up Environment Variables:**
    The application will not build or run until you provide the necessary keys in a `.env.local` file.
    
    a. **Create the file:**
    ```bash
    cp .env.example .env.local
    ```

    b. **Populate with Supabase Credentials:**
    - In your [Supabase Dashboard](https://app.supabase.com), go to **Settings > API**.
    - Copy the **Project URL** to `NEXT_PUBLIC_SUPABASE_URL`.
    - Copy the `anon` `public` key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
    - Copy the `service_role` `secret` key to `SUPABASE_SERVICE_ROLE_KEY`.
    - Go to **Settings > Database > Connection string > URI**.
    - Copy the URI to `DATABASE_URL`, replacing `[YOUR-PASSWORD]` with your database password.

    c. **Generate Encryption Key:**
    - Run `openssl rand -base64 32` in your terminal.
    - Copy the output to `APP_ENCRYPTION_KEY`.

3.  **Run Database Migrations & Seeding:**
    ```bash
    # Apply all schema changes
    npm run db:run-migrations

    # (Optional but Recommended) Add sample data
    npm run db:run-seeds
    ```

4.  **Start the Development Server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

### Key `npm` Scripts

- `dev`: Starts the Next.js development server.
- `build`: Creates a production-ready build of the application.
- `start`: Starts the production server (requires `npm run build` first).
- `lint`: Runs ESLint to check for code quality and style issues.
- `format:write`: Formats all code using Prettier.
- `type-check`: Runs the TypeScript compiler to check for type errors.
- `db:run-migrations`: Executes database migrations from `database/migrations`.
- `db:run-seeds`: Executes database seed scripts from `database/seeds`.

## Development Conventions

- **API:** The project uses **tRPC** for an end-to-end type-safe API. Backend procedures can be called from the frontend with full autocompletion. The API client is available at `@/lib/trpc/client`, and all routers are defined in `@/lib/trpc/routers/`.
- **Code Style:** The project uses ESLint and Prettier. Run `npm run lint` and `npm run format:write` before committing.
- **Commit Messages:** Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.
- **File Structure:** The `src/` directory is organized by feature and function. A detailed file hierarchy can be found in the `Project_Architecture_Document.md`.
- **Security:** Security is a primary concern. The architecture includes a Web Application Firewall (WAF), Content Security Policy (CSP), JWT for authentication, and Row-Level Security (RLS) in the database.