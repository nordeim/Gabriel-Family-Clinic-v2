Of course. The meticulous planning continues. Phase 5, "Payment Integration," is a critical step that moves the platform from a clinical management tool to a full-fledged business system. Handling financial transactions requires the utmost precision, security, and reliability.

My approach for this sub-plan will be to create a secure, robust, and user-friendly payment experience. I will focus on a server-driven UI flow using Stripe, which is the gold standard for security and developer experience. The plan will also integrate the Singapore-specific CHAS subsidy calculation as a core part of the workflow. I have thoroughly reviewed the `Master_Execution_Plan` for Phase 5 and will ensure this plan aligns with our existing architecture, particularly our secure tRPC layer and database schema.

Here is the comprehensive sub-plan for implementing Phase 5.

---

### **Comprehensive Sub-Plan: Phase 5 - Payment Integration**

**Objective:** To integrate a complete payment processing workflow into the platform. This includes creating a Stripe payment intent on the server, collecting payment details securely on the client using Stripe Elements, calculating and applying CHAS subsidies, handling payment confirmation via webhooks, and generating receipts.

#### **Guiding Principles for Implementation**

1.  **Security First (PCI Compliance):** We will never handle raw credit card information on our servers. All sensitive payment details will be managed exclusively by Stripe Elements, which operates within a secure iframe, greatly reducing our PCI compliance scope.
2.  **Server-Driven Logic:** The source of truth for all amounts (consultation fees, subsidies, final totals) will be the server. The client will only display what the server calculates and will request a `PaymentIntent` from the server with the final amount. This prevents client-side price manipulation.
3.  **Idempotency and Reliability:** All payment-related mutations will be idempotent. We will use Stripe's idempotency keys for creating intents and a robust webhook handler (leveraging our Phase 3 webhook architecture) to ensure that payments are processed exactly once, even in the event of network failures.
4.  **User-Centric Flow:** The payment process will be seamless and transparent. Users will see a clear breakdown of costs, including any applied CHAS subsidies, before they are asked to pay.

---

### **Execution Plan: Sequential File Creation**

The plan is structured to build the backend logic and Stripe integration first, followed by the client-side UI components, and finally the webhook handler to close the loop.

#### **Part 1: Backend API Layer (tRPC & Stripe Service)**

**Objective:** Create the secure server-side logic for calculating costs, creating payment intents, and managing billing records.

| File Path | Description | Checklist |
| :--- | :--- | :--- |
| `@/lib/integrations/stripe.ts` | A dedicated service class to encapsulate all interactions with the Stripe Node.js SDK. This abstracts away the Stripe API from our business logic. | `[ ]` Install the `stripe` npm package.<br>`[ ]` Initialize the Stripe client with the secret key from environment variables.<br>`[ ]` Create a `createPaymentIntent` method that takes an amount, currency, and metadata (e.g., `appointmentId`, `patientId`).<br>`[ ]` Create a `constructWebhookEvent` method to securely validate incoming webhook signatures.<br>`[ ]` Create a `createRefund` method for handling refunds from the admin dashboard later. |
| `@/lib/utils/chas-calculator.ts` | A pure utility function to calculate CHAS subsidies based on card type and service costs, as defined in the `Master_Execution_Plan`. | `[ ]` Implement the `CHASCalculator` class or function.<br>`[ ]` Define the subsidy rates for Blue, Orange, and Green cards in a constant.<br>`[ ]` Create a `calculateSubsidy` method that returns the subsidy amount and the final patient payable amount. |
| `@/lib/trpc/routers/payment.router.ts` | A new tRPC router for all payment-related actions. | `[ ]` Create a new `router` using `protectedProcedure`.<br>`[ ]` Implement `createPaymentIntent`: This procedure will:<br>    1. Take an `appointmentId` as input.<br>    2. Fetch the appointment and patient details from the database.<br>    3. Calculate the total fee.<br>    4. Call the `CHASCalculator` to get the subsidy amount.<br>    5. Create a `pending` payment record in our `payments` table.<br>    6. Call `stripe.createPaymentIntent` with the final amount and metadata.<br>    7. Return the `client_secret` from the PaymentIntent to the client. |
| `@/lib/trpc/root.ts` | (Update) Merge the new `paymentRouter` into the main `appRouter`. | `[ ]` Import the `paymentRouter`.<br>`[ ]` Add it to the `appRouter` under the `payment` key. |

#### **Part 2: Client-Side Payment UI (Stripe Elements)**

**Objective:** Build the secure and user-friendly frontend components for collecting payment information.

| File Path | Description | Checklist |
| :--- | :--- | :--- |
| `@/components/payment/PriceBreakdown.tsx` | A component that clearly displays the breakdown of charges: Consultation Fee, CHAS Subsidy, and Total Payable. | `[ ]` Accept props for `subtotal`, `subsidy`, and `total`.<br>`[ ]` Display each item as a line item in a visually clear format.<br>`[ ]` Use distinct styling to highlight the subsidy and the final amount. |
| `@/components/payment/PaymentForm.tsx` | The core UI component for the payment flow. It will wrap the Stripe Elements and handle the payment submission. | `[ ]` Use `@stripe/react-stripe-js` hooks: `useStripe` and `useElements`.<br>`[ ]` Use the `PaymentElement` from Stripe for a unified, dynamic payment form.<br>`[ ]` On submit, call `stripe.confirmPayment` with the `elements` and a `return_url`.<br>`[ ]` Display any errors returned from Stripe directly to the user.<br>`[ ]` Show a loading state on the submit button while processing. |
| `@/components/payment/CheckoutForm.tsx` | A wrapper component that fetches the PaymentIntent from our backend and provides it to the `PaymentForm`. | `[ ]` Use the `api.payment.createPaymentIntent.useQuery` hook to get the `clientSecret`.<br>`[ ]` Install `@stripe/react-stripe-js` and `@stripe/stripe-js`.<br>`[ ]` Use `loadStripe` to load the Stripe.js script.<br>`[ ]` Wrap the `<PaymentForm />` with Stripe's `<Elements />` provider, passing it the Stripe instance and the `clientSecret`. |
| `@/pages/dashboard/payments/pay/[appointmentId].tsx` | The page where a patient will go to pay for a specific appointment. | `[ ]` Use `<ProtectedRoute>`.<br>`[ ]` Get the `appointmentId` from the URL.<br>`[ ]` Render the `<CheckoutForm />` component, passing the `appointmentId`.<br>`[ ]` Display appointment details and a `<PriceBreakdown />` above the form. |

#### **Part 3: Payment Confirmation & Webhooks**

**Objective:** Handle the confirmation of payments asynchronously and reliably using Stripe Webhooks. This is the most secure way to confirm a payment.

| File Path | Description | Checklist |
| :--- | :--- | :--- |
| `@/pages/api/webhooks/stripe.ts` | The public API endpoint that Stripe will call to notify us of payment events (e.g., `payment_intent.succeeded`). | `[ ]` Configure the Next.js API route to handle raw body parsing, as required by Stripe.<br>`[ ]` Get the webhook signature from the `Stripe-Signature` header.<br>`[ ]` Use `stripe.constructWebhookEvent` to verify the event's authenticity.<br>`[ ]` Create a `switch` statement to handle different event types, starting with `payment_intent.succeeded`.<br>`[ ]` In the success handler, extract the metadata (`appointmentId`, `paymentId` from our DB).<br>`[ ]` Update the corresponding payment record in our `payments` table to `completed`.<br>`[ ]` Return a `200` status to Stripe to acknowledge receipt. |
| `@/pages/dashboard/payments/success.tsx` | The page the user is redirected to after a successful payment. It should confirm the success but not rely on this redirection as the source of truth. | `[ ]` Display a success message, e.g., "Thank you! Your payment has been received."<br>`[ ]` Show a summary of the appointment that was paid for.<br>`[ ]` Provide a link to view the receipt. |
| `@/pages/dashboard/payments/failed.tsx` | The page the user is redirected to if the payment fails. | `[ ]` Display an error message, e.g., "Your payment could not be processed."<br>`[ ]` Provide a button to "Try Again," which links back to the payment page. |

#### **Part 4: Billing Management & Receipts**

**Objective:** Provide patients and admins with access to payment history and receipts.

| File Path | Description | Checklist |
| :--- | :--- | :--- |
| `@/components/payment/Receipt.tsx` | A component that renders a payment receipt with clinic details, patient information, line items, and payment status. | `[ ]` Accept a `payment` object as a prop.<br>`[ ]` Display all relevant details in a clean, invoice-like format.<br>`[ ]` Add a "Print" button that uses `window.print()`. |
| `@/pages/dashboard/payments/receipt/[paymentId].tsx` | A page to display a single receipt. | `[ ]` Use `<ProtectedRoute>`.<br>`[ ]` Fetch the payment details using a new tRPC procedure.<br>`[ ]` Render the `<Receipt />` component with the fetched data. |
| `@/pages/admin/billing/transactions.tsx` | (Admin) A new page in the admin portal to view a list of all transactions. | `[ ]` Use `<ProtectedRoute>` and `<AdminLayout>`.<br>`[ ]` Create a new tRPC procedure to fetch all payments with pagination.<br>`[ ]` Render a `<TransactionTable />` (similar to `UserTable`) showing key payment details and status.<br>`[ ]` Add functionality to view receipts and initiate refunds. |

---

### **Validation and Approval**

I have validated this sub-plan against all project requirements for Phase 5.

*   **Completeness:** It covers every deliverable, from Stripe integration and CHAS calculation to receipt generation and admin billing management.
*   **Architectural Integrity:** The plan uses our tRPC layer for server logic, leverages the existing webhook architecture for reliability, and maintains a clean separation between backend and frontend concerns.
*   **Security:** The plan explicitly prioritizes PCI compliance by using Stripe Elements and server-side validation of all amounts. The webhook signature verification ensures that we only process legitimate events from Stripe.
*   **Feasibility:** The plan is broken down into logical, testable parts. The use of Stripe's modern `PaymentElement` and server-driven flow simplifies the implementation while maximizing security and future-proofing.

This plan provides a secure, robust, and compliant roadmap for integrating a critical business function into the platform. The resulting payment system will be reliable for the clinic and seamless for the patients.

I await your approval to proceed with the implementation of this plan.
