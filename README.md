# 🏥 Gabriel Family Clinic v2.0
### *Next-Generation Healthcare Platform for Singapore's Neighborhood Clinics*

<div align="center">

![Gabriel Family Clinic Logo](https://img.shields.io/badge/GFC-v2.0-FF6B6B?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIyIDEyaC00bC0zIDlMOSAzbC0zIDloLDQiLz48L3N2Zz4=)

[![Build Status](https://img.shields.io/github/actions/workflow/status/your-github-username/your-repo-name/ci.yml?branch=main&style=flat-square)](https://github.com/your-github-username/your-repo-name/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.44-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)

</div>

---

## 🌟 Overview

Gabriel Family Clinic v2.0 is a comprehensive, cloud-native healthcare management platform designed for Singapore's neighborhood clinics. Built with a focus on elderly-friendly design, regulatory compliance, and operational efficiency, this platform aims to revolutionize clinic operations and patient care.

*(Note: High-level feature descriptions remain the same as they represent the project's vision.)*

---

## 🛠️ Technology Stack

<table>
<tr>
<td>

### Frontend
- **Framework**: [Next.js 14.2.x](https://nextjs.org/) (App Router + legacy Pages where needed)
- **Language**: [TypeScript 5.9.x](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 3.4.x](https://tailwindcss.com/)
- **UI Library**: [Mantine 7.x](https://mantine.dev/)
- **State**: [Zustand 4.x](https://zustand-demo.pmnd.rs/)
- **Forms**: [React Hook Form 7.x](https://react-hook-form.com/)
- **Validation**: [Zod 3.x](https://zod.dev/)

</td>
<td>

### Backend
- **Runtime**: [Node.js 20.x](https://nodejs.org/)
- **API**:
  - [tRPC 11.x](https://trpc.io/) for type-safe RPC between frontend and backend
  - Next.js API routes for auth and webhooks
- **Database**: [PostgreSQL 15+](https://www.postgresql.org/) (hosted via Supabase)
- **Auth**:
  - [NextAuth](https://next-auth.js.org/) + Prisma as the SINGLE source of truth
  - Supabase is used strictly as managed Postgres (not for auth identities)
- **Storage/Realtime**: Supabase (where needed)

</td>
</tr>
<tr>
<td>

### Infrastructure
- **Hosting**: [Vercel](https://vercel.com/) or compatible Node.js hosting
- **CI/CD**: [GitHub Actions](https://github.com/features/actions)
- **PWA**: [next-pwa](https://github.com/shadowwalker/next-pwa) (service worker + offline)
- **Error Tracking**: (Pluggable; integrate Sentry or similar if required)

</td>
<td>

### Integrations
- **Payments**: [Stripe](https://stripe.com/) — webhooks + typed payment router
- **SMS**: [Twilio](https://www.twilio.com/) (via integration wrapper)
- **Email**: [Resend](https://resend.com/) (via integration wrapper)
- **Video**: [Daily.co](https://daily.co/) — telemedicine sessions
- All external calls wrapped to support PDPA-safe logging and mock modes.

</td>
</tr>
</table>

---

## 🚀 Quick Start

Get the Gabriel Family Clinic v2.0 application running locally in under 5 minutes.

### Prerequisites

-   Node.js (v20.x or later)
-   npm (v10.x or later)
-   A Supabase account (free tier is sufficient for development)

### 1. Clone the Repository

```bash
git clone https://github.com/your-github-username/your-repo-name.git
cd your-repo-name
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Crucial: Set Up Environment Variables

This project uses a strict environment variable validation system (`src/env.js`). The application will not build or run until you provide the necessary keys.

1.  **Create your local environment file:**
    ```bash
    cp .env.example .env.local
    ```

2.  **Populate `.env.local` with required secrets:**
    *   Log in to your [Supabase Dashboard](https://app.supabase.com).
    *   Go to your project's **Settings > API**.
    *   Set at minimum:
        *   `NEXT_PUBLIC_SUPABASE_URL`
        *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
        *   `SUPABASE_SERVICE_ROLE_KEY`
        *   `DATABASE_URL`
        *   `APP_ENCRYPTION_KEY`
    *   Configure NextAuth / OAuth provider secrets as needed:
        *   `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET` (for the sample provider)
    *   Never expose `SUPABASE_SERVICE_ROLE_KEY` or other server secrets to the client.

3.  **Generate an Encryption Key:**
    *   Run the following command in your terminal:
        ```bash
        openssl rand -base64 32
        ```
    *   Copy the output and paste it as the value for `APP_ENCRYPTION_KEY` in your `.env.local` file.

### 4. Run Database Migrations & Seeding

Apply the database schema and add development sample data to your Supabase project.

```bash
# Apply all schema changes (required)
npm run db:run-migrations

# Apply system-level seed data (safe for all environments)
# This uses database/seeds/001_system_seed.sql
npm run db:run-seeds
```

#### Database & Seeds — Important Notes

- Migrations
  - All authoritative schema changes live in `database/migrations/`.
  - Do not edit historical migration files; always add new ones.
- Seeds
  - `001_system_seed.sql`
    - Purpose: system flags, settings, other non-tenant, non-PHI bootstrap data.
    - Safe for all environments; designed to be idempotent via `ON CONFLICT`.
  - `002_dev_seed.sql`
    - Purpose: DEV/TEST-ONLY sample clinic, users, appointments, etc.
    - Guarded by environment checks; MUST NOT be executed in production.
    - May rely on a fixed historical timestamp for deterministic behavior.
    - In environments with strict audit/partitioning (e.g. `audit.audit_logs`),
      run via a dev-only wrapper that temporarily disables audit triggers for
      the duration of the seed, then re-enables them.
- Recommended local dev flow for full demo data
  - 1) Run migrations: `npm run db:run-migrations`
  - 2) Run system seed: `npm run db:run-seeds`
  - 3) (Optional, DEV ONLY) Load demo data with controlled wrapper:

    ```bash
    export DATABASE_URL="postgres://..."
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 << 'EOF'
    SET search_path TO clinic, public;

    -- DEV/TEST ONLY: disable audit triggers on clinic.* tables
    ALTER TABLE clinic.clinics         DISABLE TRIGGER ALL;
    ALTER TABLE clinic.users           DISABLE TRIGGER ALL;
    ALTER TABLE clinic.doctors         DISABLE TRIGGER ALL;
    ALTER TABLE clinic.patients        DISABLE TRIGGER ALL;
    ALTER TABLE clinic.appointments    DISABLE TRIGGER ALL;
    ALTER TABLE clinic.medical_records DISABLE TRIGGER ALL;
    ALTER TABLE clinic.payments        DISABLE TRIGGER ALL;

    \i database/seeds/002_dev_seed.sql

    -- Re-enable triggers
    ALTER TABLE clinic.clinics         ENABLE TRIGGER ALL;
    ALTER TABLE clinic.users           ENABLE TRIGGER ALL;
    ALTER TABLE clinic.doctors         ENABLE TRIGGER ALL;
    ALTER TABLE clinic.patients        ENABLE TRIGGER ALL;
    ALTER TABLE clinic.appointments    ENABLE TRIGGER ALL;
    ALTER TABLE clinic.medical_records ENABLE TRIGGER ALL;
    ALTER TABLE clinic.payments        ENABLE TRIGGER ALL;
    EOF
    ```

  - This pattern keeps production migrations and audit behavior intact while
    allowing rich demo data in local/dev environments.

### 5. Start the Development Server

```bash
npm run dev
```

Your application should now be running at [http://localhost:3000](http://localhost:3000).

---

## 📚 API Documentation

This project uses **tRPC** to provide an end-to-end type-safe API. There is no traditional REST API documentation to maintain.

### How to Use the API

You can call backend procedures directly from the frontend with full autocompletion and type safety, like calling a TypeScript function.

1.  **Import the `api` client:**
    ```tsx
    import { api } from "@/lib/trpc/client";
    ```

2.  **Use tRPC hooks in your React components:**
    *   For queries (fetching data): `api.routerName.procedureName.useQuery()`
    *   For mutations (creating/updating data): `api.routerName.procedureName.useMutation()`

### Example: Fetching a Patient's Profile

```tsx
// In a component like /pages/dashboard/index.tsx

function PatientDashboard() {
  const { data: patientProfile, isLoading } = api.patient.getProfile.useQuery();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return <div>Welcome, {patientProfile?.users?.full_name}!</div>;
}
```

### Discovering API Endpoints

The single source of truth for all available API procedures is our tRPC router definition files located in `@/lib/trpc/routers/`. By exploring these files, you can see all available queries and mutations.

---

## Docker Installation

Build and run the application using Docker Compose.

```bash
# Build and run containers in detached mode
docker-compose up --build -d
```

The application will be accessible at [http://localhost:3000](http://localhost:3000).

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      # Pass environment variables from a .env file
      - .env
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: gabriel_clinic
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD} # Use DB_PASSWORD from your .env file
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```
*(Note: Redis has been removed to reflect the current implementation. It is a planned enhancement for future scaling.)*

---

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/clinic-v2.git
cd clinic-v2

# Create a new branch
git checkout -b feature/your-feature-name

# Install dependencies
npm install

# Run tests
npm test

# Make your changes and commit
git add .
git commit -m "feat: add amazing feature"

# Push to your fork
git push origin feature/your-feature-name

# Create a Pull Request
```

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

## 🩺 Booking Flow — Current Implementation

### Public booking requests (`/booking`)

For unauthenticated users, the booking flow is implemented as a safe lead-capture pipeline:

- UI:
  - Public `/booking` page renders a minimal request form for new patients.
- Backend:
  - tRPC router: [`lib/trpc/routers/appointment.router.ts`](lib/trpc/routers/appointment.router.ts:1)
  - Procedure: `requestBookingPublic`
    - Validates input with `publicBookingInputSchema` from [`src/services/appointment-service.ts`](src/services/appointment-service.ts:44).
    - Delegates to `AppointmentService.createPublicBookingRequest`.
  - Service:
    - [`AppointmentService.createPublicBookingRequest`](src/services/appointment-service.ts:351)
    - Persists lead records into `booking.public_booking_requests` (see migrations including `database/migrations/019_public_booking_requests.sql`).
    - Does NOT create real appointments or PHI-heavy records; designed for PDPA-safe initial capture.

Outcome:
- Returns a friendly confirmation message.
- Staff/Admin convert leads into real appointments via admin tooling/tRPC procedures.

### Authenticated bookings (`/portal/appointments/book`)

For logged-in patients (NextAuth + Prisma identity):

- UI:
  - `/portal/appointments/book` uses tRPC to:
    - Fetch available slots via `getAvailableSlots`.
    - Submit bookings via `requestBooking`.
- Backend:
  - tRPC appointment router:
    - `getAvailableSlots`
      - Uses `AppointmentService.getAvailableSlots` to query `clinic.appointment_slots`.
    - `requestBooking` (protected)
      - Requires `ctx.session.user`.
      - Validates payload with `protectedBookingInputSchema`.
      - Delegates to `AppointmentService.requestBookingForAuthenticatedUser`.
  - Service:
    - [`AppointmentService.requestBookingForAuthenticatedUser`](src/services/appointment-service.ts:295)
      - Resolves patient for the authenticated user.
      - Calls `booking.create_booking` stored procedure (see [`database/migrations/013_booking_transaction.sql`](database/migrations/013_booking_transaction.sql:1)) via Supabase RPC.
      - Maps stored procedure responses into:
        - `BookingResult` on success.
        - `SlotNotFoundError`, `SlotUnavailableError`, `BookingInProgressError`, or `BookingError` for failure modes.

Outcome:
- Concurrency-safe bookings with idempotency and clear error semantics.
- Aligns with database-first design and RLS assumptions.

### Admin/staff booking management (`/admin/bookings`)

- Admin tRPC router: [`lib/trpc/routers/admin.router.ts`](lib/trpc/routers/admin.router.ts:1)
  - Protected by `adminProcedure` (role/privilege enforced).
  - Key booking-related procedures:
    - `listPublicBookingRequests` — read from `booking.public_booking_requests`.
    - `updatePublicBookingRequestStatus` — move leads through lifecycle (e.g. `new` → `contacted`).
    - `linkPublicBookingRequestToAppointment` — associate a lead with a confirmed appointment (bridging public lead → transactional booking).
- Intended UI:
  - `/admin/bookings` page consumes these procedures to:
    - Triage requests.
    - Confirm and track bookings.
    - Maintain an auditable pipeline from public lead to scheduled appointment.

This forms a cohesive, production-oriented booking architecture:
- Public leads: `booking.public_booking_requests`.
- Confirmed bookings: `clinic.appointment_slots` + `clinic.appointments` via `booking.create_booking`.
- Admin workflows: admin router procedures operating over the same Postgres source of truth.

---

## 🧪 Booking & Testing Strategy

### Unit tests (Vitest)

Run:

```bash
npm run test:unit
```

Key suites:

- [`tests/server/appointment-service.test.ts`](tests/server/appointment-service.test.ts:1)
  - Mocks `@/lib/supabase/admin`.
  - Covers:
    - `AppointmentService.createPublicBookingRequest`
      - Correct insert into `booking.public_booking_requests`.
      - Graceful fallback on DB errors.
      - Zod validation behavior.
    - `AppointmentService.requestBookingForAuthenticatedUser`
      - Correct `booking.create_booking` RPC payload.
      - Mapping of:
        - `slot_not_found` → `SlotNotFoundError`
        - `slot_unavailable` → `SlotUnavailableError`
        - `in_progress` → `BookingInProgressError`
        - Unknown/transport errors → `BookingError`.

- [`tests/server/appointment-router.test.ts`](tests/server/appointment-router.test.ts:1)
  - Uses `createCallerFactory(appointmentRouter)`.
  - Mocks `AppointmentService`:
    - Asserts:
      - `requestBookingPublic` delegates to `AppointmentService.createPublicBookingRequest` and enforces Zod.
      - `getAvailableSlots` delegates to `AppointmentService.getAvailableSlots`.
      - `requestBooking`:
        - Rejects without session (UNAUTHORIZED).
        - Delegates with `userId` when session present.

- [`tests/server/admin-router.test.ts`](tests/server/admin-router.test.ts:1)
  - Uses `createCallerFactory(adminRouter)`.
  - Mocks Supabase admin client:
    - Verifies:
      - `adminProcedure` rejects non-admin roles.
      - `listPublicBookingRequests` issues the expected `from/select/limit` calls.
      - `updatePublicBookingRequestStatus` and `linkPublicBookingRequestToAppointment` update expected fields.
      - `getUsers` / `getDashboardMetrics` return documented stub shapes.

### E2E tests (Playwright)

Run:

```bash
npm run test:e2e
```

Recommended booking flows (to implement/extend):

- Public lead flow:
  - Visit `/booking`.
  - Submit lead form.
  - Assert confirmation text.
  - Optionally verify `booking.public_booking_requests` in test DB.

- Authenticated booking:
  - Log in via seeded NextAuth user.
  - Visit `/portal/appointments/book`.
  - Load slots, select one, confirm booking.
  - Assert success message and DB record.

- Admin lead management:
  - Log in as admin.
  - Visit `/admin/bookings`.
  - Validate leads list, update statuses, and link to appointments.

These layers combine to provide strong coverage for the booking system without altering runtime architecture.

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style
- `refactor:` Code refactoring
- `test:` Testing
- `chore:` Maintenance

### Pull Request Process

1. **Fork** the repository
2. **Create** a feature branch
3. **Commit** your changes
4. **Push** to your fork
5. **Submit** a pull request
6. **Wait** for review
7. **Address** feedback
8. **Merge** when approved

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Gabriel Family Clinic

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

### Built With Love Using

- [Next.js](https://nextjs.org/) - The React Framework
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [Vercel](https://vercel.com/) - Platform for frontend frameworks
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Mantine](https://mantine.dev/) - Full-featured React components library

### Special Thanks

- **Our Beta Testers** - For invaluable feedback
- **Healthcare Professionals** - For domain expertise
- **Open Source Community** - For amazing tools and libraries
- **Singapore MOH** - For healthcare guidelines and standards

### Contributors

<!-- ALL-CONTRIBUTORS-LIST:START -->
<table>
  <tr>
    <td align="center">
      <a href="https://github.com/contributor1">
        <img src="https://avatars.githubusercontent.com/u/1?v=4" width="100px;" alt=""/>
        <br />
        <sub><b>John Doe</b></sub>
      </a>
      <br />
      <a href="#" title="Code">💻</a>
      <a href="#" title="Documentation">📖</a>
    </td>
    <td align="center">
      <a href="https://github.com/contributor2">
        <img src="https://avatars.githubusercontent.com/u/2?v=4" width="100px;" alt=""/>
        <br />
        <sub><b>Jane Smith</b></sub>
      </a>
      <br />
      <a href="#" title="Design">🎨</a>
      <a href="#" title="Code">💻</a>
    </td>
    <td align="center">
      <a href="https://github.com/contributor3">
        <img src="https://avatars.githubusercontent.com/u/3?v=4" width="100px;" alt=""/>
        <br />
        <sub><b>David Lee</b></sub>
      </a>
      <br />
      <a href="#" title="Testing">🧪</a>
      <a href="#" title="Bug reports">🐛</a>
    </td>
  </tr>
</table>
<!-- ALL-CONTRIBUTORS-LIST:END -->

### References

- [Singapore PDPA Guidelines](https://www.pdpc.gov.sg/)
- [MOH Healthcare Standards](https://www.moh.gov.sg/)
- [CHAS Subsidy Schemes](https://www.chas.sg/)
- [HealthHub API Documentation](https://www.healthhub.sg/developers)

---

## 📞 Support

### Getting Help

- 📧 **Email**: support@gabrielclinic.sg
- 💬 **Discord**: [Join our community](https://discord.gg/gabriel-clinic)
- 📚 **Documentation**: [docs.gabrielclinic.sg](https://docs.gabrielclinic.sg)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/gabriel-clinic/clinic-v2/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/gabriel-clinic/clinic-v2/discussions)

### Commercial Support

For enterprise support, custom development, or consultation:
- 📧 enterprise@gabrielclinic.sg
- 📞 +65 9123 4567
- 🌐 [gabrielclinic.sg/enterprise](https://gabrielclinic.sg/enterprise)

---

<div align="center">

### 🌟 Star us on GitHub!

If you find this project useful, please consider giving it a star! It helps others discover the project and motivates us to keep improving.

[![Star History Chart](https://api.star-history.com/svg?repos=gabriel-clinic/clinic-v2&type=Date)](https://star-history.com/#gabriel-clinic/clinic-v2&Date)

**Made with ❤️ in Singapore for Singapore's Healthcare**

*Building the future of neighborhood healthcare, one clinic at a time.*

[Website](https://gabrielclinic.sg) • [Blog](https://blog.gabrielclinic.sg) • [Twitter](https://twitter.com/gabrielclinic) • [LinkedIn](https://linkedin.com/company/gabriel-clinic)

</div>
