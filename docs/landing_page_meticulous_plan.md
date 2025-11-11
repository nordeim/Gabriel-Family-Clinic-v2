# Gabriel Family Clinic v2.0 — Landing Page Meticulous Plan

Date: 2025-11-11  
Owner: AI Coding Agent (Kilo Code)  
Scope: Static landing experience (`static/index.html`, `static/styles/globals.css`, `static/js/landing.js`)

---

## 1. Objectives

Design and implement a static landing page that:

- Embodies the "Healthcare with Heart" philosophy from `project_high-level-vision.md`.
- Feels premium, trustworthy, warm, and elderly-friendly.
- Is production-grade in usability, accessibility, and perceived performance.
- Serves as the canonical UX reference for future Next.js implementation.
- Is implemented as a self-contained static mockup:
  - `static/index.html`
  - `static/styles/globals.css`
  - `static/js/landing.js`

Constraints:

- Static HTML/CSS/JS only (no frameworks at runtime).
- Use Google Fonts.
- Shadcn-UI-inspired components (tokens, radii, shadows, interactions) implemented via CSS/utility classes; no direct dependency.
- Reuse concepts from existing global styles (colors, spacing, typography) but tuned to the vision.
- JS separated into `static/js/landing.js` for clarity, performance, and future adaptability.

---

## 2. Vision Translation

From `DESIGN_PRINCIPLES`:

1) Warmth
- Palette: soft coral (#FF6B6B), sage green (#2E7D68 / #8BC6A2), warm neutrals (#FFF7F2, #FDEFEA, #F5F5F5), deep navy/ink for text (#1F2933).
- Visuals: subtle illustration-like blocks and silhouette hero imagery; space for real Singapore families and neighborhood landmarks.
- Tone: plain-English headlines, friendly microcopy, optional small bilingual cues.

2) Trust
- Clear display of:
  - Clinic name and tagline.
  - Security/compliance badges (PDPA, MOH).
  - Transparent pricing summary for core services.
  - Realistic placeholder testimonials (with avatars) and ratings.
  - Doctor cards with credentials (not gimmicky).

3) Simplicity
- IA: A single scroll page with 6 clear sections:
  1. Hero + primary CTA.
  2. Why choose us (3–4 pillars).
  3. Services & transparent pricing.
  4. Doctors & care team.
  5. Live-like queue/slots preview + quick booking CTA.
  6. Testimonials + contact & footer.
- Navigation: sticky top bar with 4–5 anchors; max 1–2 prominent CTAs:
  - "Book an Appointment"
  - "Call Clinic"

4) Accessibility
- Large type and touch targets (min 18px body, 48px buttons).
- High-contrast default; optional toggle for "Senior Mode" (even larger font, stronger contrast).
- Optimized for mobile-first:
  - Vertical stacking, full-width buttons, safe tap areas.
- Minimal animation:
  - Gentle fades/slide-ups; disabled/reduced for users preferring reduced motion.

---

## 3. Page Structure (static/index.html)

Semantic, accessible layout:

- `<header>`:
  - Top bar:
    - Logo/brand lockup "Gabriel Family Clinic".
    - Sub-label: "Neighborhood Family Health · Serangoon / Singapore".
  - Right side:
    - Language hint pills (EN / 中文 / BM / தமிழ்) — visual only (no heavy i18n).
    - "Call Now" button with tel: link.
    - Primary CTA: "Book Appointment".

- `<nav>` (within header, sticky):
  - Links (anchor scroll):
    - "Home" → `#top`
    - "Why Us" → `#why-us`
    - "Services" → `#services`
    - "Our Doctors" → `#doctors`
    - "Patients" → `#for-patients`
    - "Contact" → `#contact`
  - On mobile:
    - Hamburger toggling accessible nav drawer (implemented via JS).

- `<main>` sections:

  1) Hero (`#top`)
     - Two-column layout (stack on mobile):
       - Left:
         - Headline: "Healthcare with Heart, in Your Neighborhood."
         - Subtext emphasizing same-day appointments, Healthier SG alignment, elderly-friendly care.
         - Primary CTA button: "Book an Appointment".
         - Secondary: "View Clinic Hours".
         - Trust row:
           - Small stats: "4.9★ Google Rating", "Same-day slots", "Medisave & CHAS friendly".
       - Right:
         - Card showing:
           - Next available slots (static sample).
           - Compact "Quick Booking" form (Name, Mobile, Reason, Preferred Slot dropdown).
           - This form is local-only (no network); used for UX + validation demo.

  2) Why Us (`#why-us`)
     - Three or four feature cards:
       - "Senior-Friendly Experience"
       - "Transparent & Digital-First"
       - "Trusted Family Doctors"
       - "Aligned with Healthier SG"
     - Each uses icon-like emoji + short, readable bullets.

  3) Services & Pricing (`#services`)
     - Two columns:
       - Core services:
         - "Family Medicine"
         - "Chronic Care (Diabetes, Hypertension)"
         - "Health Screening Packages"
         - "Vaccinations"
       - Transparent price cards:
         - Simple card listing from-price.
     - CTA: "See Full Price List (PDF)" as a placeholder link.

  4) Our Doctors (`#doctors`)
     - 2–3 doctor cards:
       - Photo placeholder, name, credentials, languages.
       - Short, human bio.
       - Badge: "Healthier SG Ready".
     - Emphasis on warmth and trust, not stocky corporate.

  5) For Patients (`#for-patients`)
     - A 3-step strip:
       - Step 1: "Book online in under 1 minute."
       - Step 2: "Check in with your mobile number."
       - Step 3: "View records & follow-ups securely."
     - Highlight: Large icons, short lines, accessible.

  6) Testimonials & Contact (`#contact`)
     - Testimonials slider or grid:
       - 2–3 short quotes, with large text and clear contrast.
     - Contact block:
       - Clinic address, map teaser (static).
       - Phone (tel:), WhatsApp, email.
       - Opening hours.
       - Simple contact form (Name, Email, Message) with validation.

- `<footer>`
  - Links: Privacy, PDPA, Terms.
  - Copyright.
  - "Proudly serving Serangoon families since 20XX."
  - Social / MOH/PDPA badge row as visual placeholders.

---

## 4. Styling Plan (static/styles/globals.css)

Design tokens and architecture:

1) CSS Reset and Base
- Use a modern, minimal reset:
  - Box-sizing: border-box.
  - Remove default margins.
  - Consistent font-smoothing.
- Set base font-size ~ 16px; line-height ~ 1.6.

2) Typography
- Google Fonts:
  - Primary: "Inter" or "Nunito Sans" for body (friendly, legible).
  - Accent: "DM Sans" or "Poppins" for headings.
- Classes:
  - `.text-display`, `.text-xl`, `.text-lg`, `.text-body`, `.text-label`.
  - Responsive scaling for large screens.

3) Color System
- CSS variables under `:root`:
  - `--bg-body`, `--bg-soft`, `--bg-elevated`
  - `--primary`, `--primary-soft`, `--primary-contrast`
  - `--accent`, `--accent-soft`
  - `--border-soft`, `--text-main`, `--text-muted`, `--danger`
- Ensure contrast ratios ≥ WCAG AA for primary text.

4) Layout Utilities
- `.container` with max-width (1200–1280px) and padding.
- Flex and grid helpers:
  - `.flex-center`, `.stack`, `.grid-2`, etc.
- Responsive breakpoints:
  - `--bp-md: 768px`, `--bp-lg: 1024px`.

5) Shadcn-inspired Components (no dependency)
- Button variants:
  - `.btn`, `.btn-primary`, `.btn-outline`, `.btn-ghost`, `.btn-lg`, `.btn-block`.
  - Rounded `border-radius: 999px` for main CTAs; subtle shadows.
- Cards:
  - `.card`, `.card-soft`, `.card-elevated` with smooth radius, border, shadow.
- Inputs:
  - `.field`, `.field-label`, `.input`, `.select`, `.textarea`.
  - Focus ring using `--primary`.
- Badges / Pills:
  - `.pill`, `.pill-soft`, `.badge`.
- Navigation:
  - `.navbar`, `.navbar-brand`, `.navbar-links`, `.navbar-toggle`, `.navbar-menu`.

6) Accessibility & Senior Mode
- Define `.sr-only` helper.
- Define `.senior-mode` body modifier:
  - Larger font-sizes.
  - Higher contrast colors.
  - Possibly disable subtle shadows/gradients.
- JS toggles this class via a button.

7) Animations
- Simple motion:
  - `.fade-in`, `.slide-up` with small durations.
- Respect prefers-reduced-motion:
  - Disable animations if user prefers reduced motion.

---

## 5. JavaScript Plan (static/js/landing.js)

No frameworks, only small progressive enhancements:

Features:

1) Smooth Anchor Scrolling
- Intercept clicks on internal nav links.
- Use `scrollIntoView({ behavior: "smooth" })` with `requestAnimationFrame` fallback.
- Respect `prefers-reduced-motion` (scroll instantly if set).

2) Mobile Nav Toggle
- Toggle `.is-open` on `.navbar-menu` when hamburger is clicked.
- Trap focus minimally and close on ESC and backdrop click.
- ARIA:
  - `aria-expanded` on toggle button.
  - Ensure nav is announced properly.

3) Senior Mode Toggle
- Button (e.g., in header or footer) toggles `.senior-mode` on `<body>`.
- Persist choice in `localStorage` (`gfc_senior_mode`).
- On load:
  - Read preference and apply.

4) Quick Booking Form (Hero)
- Validate on submit (client-side only, non-network):
  - Required: name, phone, reason, slot.
  - Phone: basic Singapore format check (`^[689]\\d{7}$` or simple numeric length, configurable).
- If valid:
  - Prevent real submission.
  - Show success toast/banner: “Thank you! Our team will call to confirm your slot.”
- If invalid:
  - Show inline error messages.
- No backend calls; illustrative only.

5) Contact Form (Footer)
- Similar validation:
  - Required: name, email, message.
  - Email: simple regex.
- On success:
  - Show “Message received” toast.
- Again, static only.

6) Lightweight Observers (Optional)
- IntersectionObserver to apply `.in-view` animations.
- Guarded by `prefers-reduced-motion`.

Performance considerations:

- Single small JS bundle:
  - No dependencies.
  - Namespaced functions (e.g., `GFC.initLanding()`).
- Defer script:
  - Use `defer` in HTML for non-blocking load.

---

## 6. Implementation Steps

Phase 1 — Planning (this document)
- Define structure, components, interactions, and constraints. (Completed)

Phase 2 — Static Files Creation
1. Create `static/index.html`
   - Implement full semantic structure and sections per plan.
   - Link `static/styles/globals.css` and `static/js/landing.js`.
   - Include Google Fonts link tags.
2. Create `static/styles/globals.css`
   - Implement tokens, base styles, utilities, Shadcn-inspired components, layout, and responsive rules.
3. Create `static/js/landing.js`
   - Implement:
     - Initialization (`DOMContentLoaded` or `defer` + IIFE).
     - Smooth scrolling.
     - Nav toggle.
     - Senior mode toggle (with localStorage).
     - Form validations and feedback.
     - Optional animation triggers with reduced-motion respect.

Phase 3 — Review & Refinement
- Check:
  - Visual hierarchy and aesthetics (desktop + mobile).
  - Accessibility (landmarks, alt text placeholders, focus, contrast).
  - Performance (no blocking assets beyond fonts; minimal JS).
- Adjust copy to reflect:
  - Singapore context.
  - Healthier SG and CHAS/Medisave-friendly messaging.
  - Warm, trustworthy tone.

Phase 4 — Integration Baseline
- Leave this static mockup as:
  - Visual and UX reference for future Next.js pages.
  - A staging ground that can be proxied or embedded into the current app’s landing route.

This plan is now staged and will be followed meticulously to implement the static landing page files next.