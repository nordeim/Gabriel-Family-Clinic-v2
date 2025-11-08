Of course. We are now moving from the core operational features into advanced functionalities that will significantly enhance the platform's value proposition. Phase 7, "Advanced Features," introduces telemedicine, health screening packages, and vaccination tracking, which are key differentiators in the competitive Singaporean healthcare market.

My approach for this sub-plan will be to design these features as modular extensions of our existing system. I will prioritize a simple and secure implementation for telemedicine, a data-driven approach for health screenings and vaccinations, and the initial framework for a more advanced analytics dashboard. I have thoroughly reviewed the `Master_Execution_Plan` for Phase 7 and will ensure this plan builds upon our established architecture and data models.

Here is the comprehensive sub-plan for implementing Phase 7.

---

### **Comprehensive Sub-Plan: Phase 7 - Advanced Features**

**Objective:** To implement a suite of advanced clinical and patient-facing features. This includes a basic video consultation workflow, a system for booking and viewing health screening packages, a module for tracking vaccination records, and an enhanced analytics dashboard for administrators.

#### **Guiding Principles for Implementation**

1.  **Seamless Integration:** Advanced features should feel like a natural extension of the existing user experience. The telemedicine flow will integrate directly with the appointment booking system, and health screening results will appear alongside other medical records.
2.  **Pragmatic MVP Approach:** For complex features like telemedicine, we will build a minimal viable product (MVP) first. We will focus on a secure and reliable one-to-one video call, deferring more complex features like group calls or in-session charting to a later phase.
3.  **Data Structuring for Analytics:** The schemas for health screenings and vaccinations will be designed not just for display but for future analytics. We will store structured data (e.g., individual test results with units and reference ranges) rather than just linking to a PDF.
4.  **Third-Party Abstraction:** As with previous phases, all interactions with third-party services (like Daily.co for video) will be encapsulated in dedicated service adapters to ensure our core logic remains provider-agnostic.

---

### **Execution Plan: Sequential File Creation**

The plan is structured to build each advanced feature as a distinct module, starting with the API layer and then the corresponding frontend components.

#### **Part 1: Telemedicine (Basic)**

**Objective:** Implement a secure, one-to-one video consultation feature integrated with the appointment system.

| File Path | Description | Checklist |
| :--- | :--- | :--- |
| `@/lib/integrations/daily.ts` | An adapter for the Daily.co video conferencing API. | `[ ]` Install the `@daily-co/daily-js` package.<br>`[ ]` Create a `DailyVideoProvider` class.<br>`[ ]` Implement a server-side `createRoom` method that takes an `appointmentId`, creates a private room with a short expiry time (e.g., 2 hours), and returns the room URL.<br>`[ ]` Store the Daily.co API key in environment variables. |
| `@/lib/trpc/routers/telemedicine.router.ts` | A new tRPC router for managing telemedicine sessions. | `[ ]` Create a new `router` with `protectedProcedure` for patients and `doctorProcedure` for doctors.<br>`[ ]` Implement a `getTelemedicineSession` procedure that takes an `appointmentId` and:<br>    1. Checks if a room already exists for this appointment in the `telemedicine_sessions` table.<br>    2. If not, calls the `DailyVideoProvider.createRoom` method.<br>    3. Saves the room URL and details to the `telemedicine_sessions` table.<br>    4. Returns the room URL to the authenticated user (patient or doctor). |
| `@/components/telemedicine/VideoCall.tsx` | The main UI component that embeds the Daily.co video call interface. | `[ ]` Create a component that takes a `roomUrl` as a prop.<br>`[ ]` Use a `useEffect` hook to initialize the Daily.co call frame using `DailyIframe.createFrame`.<br>`[ ]` Mount the iframe into a container `div`.<br>`[ ]` Handle joining and leaving the call, and manage loading/error states. |
| `@/pages/dashboard/telemedicine/consultation/[appointmentId].tsx` | The page where a patient joins their scheduled video consultation. | `[ ]` Use `<ProtectedRoute>`.<br>`[ ]` Get `appointmentId` from the URL.<br>`[ ]` Use the `api.telemedicine.getTelemedicineSession.useQuery` hook to fetch the `roomUrl`.<br>`[ ]` While loading, display a "Waiting for your consultation to begin..." message.<br>`[ ]` Once the `roomUrl` is available, render the `<VideoCall />` component. |
| `@/pages/doctor/telemedicine/consultation/[appointmentId].tsx` | The page where the doctor joins the video consultation. | `[ ]` Use `<ProtectedRoute>` and `<DoctorLayout>`.<br>`[ ]` Implement similar logic to the patient page, but within the doctor's two-column consultation layout, allowing the doctor to view patient history while on the call. |

#### **Part 2: Health Screening & Vaccination Records**

**Objective:** Create the data models and UI for patients to book health screening packages and track their vaccination history.

| File Path | Description | Checklist |
| :--- | :--- | :--- |
| `database/migrations/017_health_screening_tables.sql` | A new migration to create tables for health screening packages and results. | `[ ]` Create a `health_screening_packages` table with columns like `name`, `description`, `price`, and `tests_included` (JSONB).<br>`[ ]` Create a `health_screening_results` table to store structured results for each test (e.g., `test_name`, `value`, `unit`, `reference_range`). |
| `@/lib/trpc/routers/health.router.ts` | A new tRPC router for health screenings and vaccinations. | `[ ]` Create a new `router` with `publicProcedure` and `protectedProcedure`.<br>`[ ]` Implement `getScreeningPackages` (public) to list available packages.<br>`[ ]` Implement `getPatientVaccinations` (protected) to fetch records from the `vaccination_records` table.<br>`[ ]` Implement `getScreeningResults` (protected) to fetch a patient's results. |
| `@/components/screening/PackageCard.tsx` | A UI component to display a single health screening package with its details and price. | `[ ]` Accept a `package` object as a prop.<br>`[ ]` Display the package name, price, and a list of included tests.<br>`[ ]` Include a "Book Now" button that links to the appointment booking flow with the package pre-selected. |
| `@/pages/health-screening/index.tsx` | A public page listing all available health screening packages. | `[ ]` Use `api.health.getScreeningPackages.useQuery` to fetch the packages.<br>`[ ]` Render a grid of `<PackageCard />` components. |
| `@/components/vaccination/VaccinationRecordCard.tsx` | A component to display a single vaccination record. | `[ ]` Accept a `vaccination` record object as a prop.<br>`[ ]` Display the vaccine name, date administered, and dose number. |
| `@/pages/dashboard/vaccinations/index.tsx` | A protected page for patients to view their complete vaccination history. | `[ ]` Use `<ProtectedRoute>`.<br>`[ ]` Use `api.health.getPatientVaccinations.useQuery` to fetch the records.<br>`[ ]` Display the records in a chronological list using the `<VaccinationRecordCard />` component. |

#### **Part 3: Enhanced Analytics Dashboard**

**Objective:** Enhance the admin dashboard with more advanced analytics and visualizations.

| File Path | Description | Checklist |
| :--- | :--- | :--- |
| `@/lib/trpc/routers/reports.router.ts` | (Update/Create) A dedicated router for complex analytical queries. | `[ ]` Implement `getPatientDemographicsReport`: Fetches aggregated data on patient age, gender, and location.<br>`[ ]` Implement `getAppointmentTrendsReport`: Fetches data on appointment volume over time, broken down by type (consultation, telemedicine).<br>`[ ]` These procedures should use the `mat_view_daily_clinic_metrics` for performance where possible. |
| `@/lib/trpc/root.ts` | (Update) Merge the `healthRouter` and `telemedicineRouter`, and ensure `reportsRouter` is present. | `[ ]` Import and merge the new routers into the main `appRouter`. |
| `@/components/analytics/PatientDemographicsChart.tsx` | A chart component (e.g., a pie or bar chart) to visualize patient demographics. | `[ ]` Use `recharts` or a similar library.<br>`[ ]` Accept the data from the `getPatientDemographicsReport` procedure as a prop.<br>`[ ]` Render a chart showing the age or gender distribution of patients. |
| `@/components/analytics/AppointmentTrendsChart.tsx` | A line chart to visualize appointment volume over a selected period. | `[ ]` Use `recharts`.<br>`[ ]` Accept the time-series data from `getAppointmentTrendsReport` as a prop.<br>`[ ]` Render a line chart showing trends over time. |
| `@/pages/admin/analytics/index.tsx` | The main analytics dashboard in the admin portal. | `[ ]` Use `<ProtectedRoute>` and `<AdminLayout>`.<br>`[ ]` Add a date range picker to filter all reports on the page.<br>`[ ]` Fetch data from the `reports` router based on the selected date range.<br>`[ ]` Render the `<PatientDemographicsChart />` and `<AppointmentTrendsChart />` components within `<Card>`s. |

---

### **Validation and Approval**

I have validated this sub-plan against all project requirements for Phase 7.

*   **Completeness:** The plan covers all four key features: basic telemedicine, health screening packages, vaccination records, and the analytics dashboard.
*   **Architectural Integrity:** Each new feature is encapsulated in its own module (tRPC router, components), ensuring clean separation of concerns. The plan leverages existing patterns, such as provider abstraction for Daily.co and protected tRPC procedures for security.
*   **Technical Soundness:** The MVP approach to telemedicine is pragmatic and de-risks a complex feature. The use of structured data for health results and a materialized view for analytics demonstrates a forward-thinking, performance-oriented approach.
*   **Feasibility:** The plan is broken down into distinct, manageable work packages. By creating new, isolated routers and components, different developers can potentially work on the telemedicine and health screening features in parallel.

This plan provides a clear and robust roadmap for adding significant value and competitive differentiation to the platform. The resulting features will expand the clinic's service offerings and provide deeper business insights.

I await your approval to proceed with the implementation of this plan.
