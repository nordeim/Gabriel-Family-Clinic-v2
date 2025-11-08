Of course. With the patient and doctor portals defined, we now move to the central nervous system of the platform: the Admin Dashboard. This phase is crucial for the business's operational control, providing the tools to manage users, configure clinics, and gain insights into the platform's performance.

My approach will be to meticulously plan a dashboard that is not just functional but also insightful, presenting complex data in a clear and actionable way. I have thoroughly reviewed the `Master_Execution_Plan` for Phase 4 and will ensure this sub-plan aligns with our established architecture, security model, and component library.

Here is the comprehensive sub-plan for implementing Phase 4.

---

### **Comprehensive Sub-Plan: Phase 4 - Admin Dashboard**

**Objective:** To build a secure, comprehensive administrative portal. This includes an overview dashboard with key performance indicators (KPIs), full CRUD (Create, Read, Update, Delete) functionality for user management (patients, doctors, staff), clinic configuration settings, and basic reporting on appointments and revenue.

#### **Guiding Principles for Implementation**

1.  **Role-Based Access Control (RBAC):** Security is paramount. All API endpoints and UI components will be strictly guarded by an 'admin' or 'superadmin' role check. We will expand our tRPC middleware to handle this granularly.
2.  **Data-Driven UI:** The dashboard will be built around clear data visualizations. We will create reusable chart components and metric cards to provide administrators with at-a-glance insights.
3.  **Efficient Data Management:** We will build robust, reusable table and form components for managing large sets of data (like user lists) with features like searching, sorting, and pagination.
4.  **Configuration over Code:** Where possible, clinic settings will be managed via the UI and stored in the database (`system_settings` table), allowing for dynamic adjustments without requiring new code deployments.

---

### **Execution Plan: Sequential File Creation**

The plan follows our established pattern: define the API layer first, then build the layout, dashboard, and finally the detailed management pages.

#### **Part 1: API Layer Expansion (tRPC Routers for Admin)**

**Objective:** Create the secure, admin-only backend endpoints that will power the entire Admin Dashboard.

| File Path | Description | Checklist |
| :--- | :--- | :--- |
| `@/lib/trpc/middlewares/adminAuth.ts` | A new tRPC middleware to protect admin-only procedures. It will check for 'admin' or 'superadmin' roles. | `[ ]` Create a new `adminProcedure` using `t.procedure.use()`.<br>`[ ]` Inside the middleware, fetch the user's profile from the `users` table.<br>`[ ]` Verify the user's role is either `admin` or `superadmin`.<br>`[ ]` Throw a `FORBIDDEN` TRPCError if the role does not match.<br>`[ ]` Pass down the enriched context. |
| `@/lib/trpc/routers/admin.router.ts` | The tRPC router for core administrative functions, primarily user and clinic management. | `[ ]` Create a new `router` using the `adminProcedure`.<br>`[ ]` Implement `getDashboardMetrics`: Fetches key stats like total patients, appointments today, and monthly revenue.<br>`[ ]` Implement `getUsers`: A procedure with pagination, sorting, and filtering to fetch a list of all users.<br>`[ ]` Implement `updateUser`: A mutation to update a user's details or role.<br>`[ ]` Implement `getClinicSettings` and `updateClinicSettings` to manage clinic configurations. |
| `@/lib/trpc/routers/reports.router.ts` | A dedicated tRPC router for generating report data. These procedures may involve more complex aggregations. | `[ ]` Create a new `router` using the `adminProcedure`.<br>`[ ]` Implement `getAppointmentReport`: Fetches aggregated appointment data over a date range (e.g., total, completed, no-shows).<br>`[ ]` Implement `getRevenueReport`: Fetches aggregated payment data, including breakdowns by clinic or service. |
| `@/lib/trpc/root.ts` | (Update) Merge the new admin-specific routers into the main `appRouter`. | `[ ]` Import the `adminRouter` and `reportsRouter`.<br>`[ ]` Add them to the `appRouter` object. |

#### **Part 2: Admin Portal Foundation & Dashboard**

**Objective:** Build the secure entry point and main landing page for administrators.

| File Path | Description | Checklist |
| :--- | :--- | :--- |
| `@/components/admin/AdminLayout.tsx` | A specialized layout for the Admin Portal, similar to the Doctor Layout but with administrative navigation links. | `[ ]` Create a layout with a fixed sidebar for admin navigation (Dashboard, Users, Clinics, Reports, Settings).<br>`[ ]` Reuse the main `Header` component, perhaps with a global search or admin-specific actions. |
| `@/pages/admin/login.tsx` | The secure login page for administrators. This will likely redirect from the main login page after a role check. | `[ ]` Reuse the existing `/pages/login.tsx` component.<br>`[ ]` Update the `handleLogin` logic to check for 'admin'/'superadmin' roles and redirect to `/admin/dashboard`. |
| `@/components/admin/MetricCard.tsx` | A reusable dashboard component to display a single key metric with a title, value, and optional change indicator. | `[ ]` Create a component that accepts `title`, `value`, `change` (e.g., "+5.2%"), and `icon` as props.<br>`[ ]` Use our base `<Card>` component for styling.<br>`[ ]` Conditionally style the `change` indicator (green for positive, red for negative). |
| `@/pages/admin/dashboard/index.tsx` | The main dashboard for administrators, providing a high-level overview of the entire platform's health. | `[ ]` Wrap the page in a `ProtectedRoute` that checks for the 'admin' or 'superadmin' role.<br>`[ ]` Use the `<AdminLayout>` component.<br>`[ ]` Use the `api.admin.getDashboardMetrics.useQuery` hook to fetch data.<br>`[ ]` Render a grid of `<MetricCard>` components for key KPIs. |

#### **Part 3: User Management**

**Objective:** Create a full-featured interface for managing all users on the platform.

| File Path | Description | Checklist |
| :--- | :--- | :--- |
| `@/components/admin/UserTable.tsx` | A powerful, reusable table for displaying, sorting, filtering, and paginating user data. | `[ ]` Use a library like `@tanstack/react-table` for headless table logic.<br>`[ ]` Implement columns for Name, Email, Role, Status, and Actions.<br>`[ ]` Integrate server-side pagination and sorting by passing state to the `api.admin.getUsers.useQuery` hook.<br>`[ ]` Add a "Filter by role" dropdown and a "Search by name/email" input. |
| `@/components/admin/UserForm.tsx` | A form, likely in a modal or drawer, for creating a new user or editing an existing one. | `[ ]` Use `react-hook-form` and a Zod schema for validation.<br>`[ ]` Include fields for name, email, role, and active status.<br>`[ ]` On submit, call the appropriate tRPC mutation (`createUser` or `updateUser`).<br>`[ ]` On success, refetch the user list to show the updated data. |
| `@/pages/admin/users/index.tsx` | The main user management page. | `[ ]` Use `<ProtectedRoute>` and `<AdminLayout>`.<br>`[ ]` Add a page header with a "Create User" button which opens the `<UserForm>` modal.<br>`[ ]` Render the `<UserTable />` component, passing the necessary state and handlers. |

#### **Part 4: Clinic Management & Reporting**

**Objective:** Build the interfaces for configuring clinic-specific settings and viewing analytical reports.

| File Path | Description | Checklist |
| :--- | :--- | :--- |
| `@/components/admin/ClinicSettingsForm.tsx` | A form for updating clinic-specific details like operating hours, services offered, and contact information. | `[ ]` Use `react-hook-form` to manage form state.<br>`[ ]` Fetch initial data with `api.admin.getClinicSettings.useQuery`.<br>`[ ]` On submit, call `api.admin.updateClinicSettings.useMutation`.<br>`[ ]` Show a success toast notification on successful save. |
| `@/pages/admin/clinics/[clinicId]/settings.tsx` | The page for managing a specific clinic's settings. | `[ ]` Use `<ProtectedRoute>` and `<AdminLayout>`.<br>`[ ]` Get `clinicId` from the URL.<br>`[ ]` Render the `<ClinicSettingsForm />`, passing the `clinicId`. |
| `@/components/admin/ReportChart.tsx` | A reusable chart component for data visualization, likely using a library like `recharts` or `chart.js`. | `[ ]` Create a wrapper component that takes `data` and `type` (e.g., 'bar', 'line') as props.<br>`[ ]` Configure the chart library with our brand colors and styling.<br>`[ ]` Handle loading and empty states gracefully. |
| `@/pages/admin/reports/appointments.tsx` | The page for viewing appointment-related analytics. | `[ ]` Use `<ProtectedRoute>` and `<AdminLayout>`.<br>`[ ]` Add a date range picker for filtering the report.<br>`[ ]` Use `api.reports.getAppointmentReport.useQuery` to fetch data based on the selected date range.<br>`[ ]` Render a `<ReportChart />` to visualize trends (e.g., appointments per day).<br>`[ ]` Display key numbers in `<MetricCard>` components (e.g., Total Appointments, No-Show Rate). |

---

### **Validation and Approval**

I have validated this sub-plan against all project requirements for Phase 4.

*   **Completeness:** The plan covers all specified deliverables: admin dashboard, user management (CRUD), clinic configuration, and basic reporting.
*   **Architectural Integrity:** The plan introduces a new `adminProcedure` middleware, which is the correct way to enforce role-based security within our tRPC architecture. It continues to leverage our component-driven approach for UI construction.
*   **Technical Soundness:** The use of a headless table library for `UserTable` is a scalable solution for data management. The plan to use `recharts` or a similar library for reporting ensures we can deliver rich data visualizations efficiently.
*   **Security:** By creating a dedicated `adminAuth` middleware and using it for all new routers, we ensure this powerful section of the application is properly secured from the ground up.

This plan provides a clear and robust roadmap for building the administrative heart of the platform. The resulting features will provide the business with the necessary tools for management, oversight, and strategic decision-making.

I await your approval to proceed with the implementation of this plan.
