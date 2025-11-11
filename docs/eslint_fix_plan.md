# ESLint Failure — Meticulous Fix Plan

Date: 2025-11-11  
Owner: AI Coding Agent (Kilo Code)  
Status: Planning only (no config changes applied yet)

---

## 1. Problem Statement

Current command:

- `npm run lint` (configured as `eslint .`)

Failure:

- Error:
  - `TypeError: Config (unnamed): Unexpected undefined config at user-defined index 0.`

Evidence:

- `eslint.config.js` exists but only contains comments:
  - It explains that the project intends to rely on `.eslintrc.json` rather than flat config.
  - It does NOT export any configuration.
- ESLint 8.57.1 supports both:
  - Traditional `.eslintrc.*`
  - Flat config via `eslint.config.js`
- When `eslint.config.js` is present but exports nothing (undefined), ESLint treats it as a flat config array with an invalid/undefined entry -> causes the observed error.

Conclusion:

- This is a tooling misconfiguration, independent of landing page logic.
- Fix requires making the ESLint configuration unambiguous and valid.

---

## 2. Constraints & Goals

Constraints:

- Do not introduce experimental or unstable configs without clear justification.
- Respect Next.js and existing repo conventions.
- Keep lint behavior as close as possible to original intent documented in AGENT.md and troubleshooting docs.

Goals:

- Ensure `npm run lint` runs successfully without config errors.
- Prefer `.eslintrc.json` as the single source of truth (as the comment in eslint.config.js states).
- Avoid accidental changes to lint rules beyond what is necessary to make the configuration valid.

---

## 3. Options Considered

### Option A — Remove or Rename `eslint.config.js`

- Rely solely on `.eslintrc.json`.
- Pros:
  - Straightforward.
  - Aligns with comment: "We will use the standard `.eslintrc.json` for now".
- Cons:
  - Requires file deletion/rename (slightly more intrusive).
  - If future tooling expects `eslint.config.js`, may need re-introduction.

### Option B — Make `eslint.config.js` a Thin Proxy to `.eslintrc.json`

Implement `eslint.config.js` as:

```js
// eslint.config.js
// Bridge file to support environments that auto-detect flat config.
// We intentionally delegate to the legacy `.eslintrc.json` for now.

import fs from "node:fs";
import path from "node:path";

/** @type {import("eslint").Linter.FlatConfig[]} */
const legacyConfig = JSON.parse(
  fs.readFileSync(path.resolve(".eslintrc.json"), "utf8")
);

export default legacyConfig;
```

- Pros:
  - Preserves a single source of truth in `.eslintrc.json`.
  - Satisfies ESLint's expectation that `eslint.config.js` exports a valid config.
- Cons:
  - Flat config format is different from `.eslintrc.json` (this naive bridge is not fully correct).
  - Risky: `.eslintrc.json` schema != FlatConfig schema.

=> Not acceptable without a proper conversion, which is non-trivial and overkill here.

### Option C — Provide a Minimal, Valid Flat Config in `eslint.config.js`

- Replace comments with a real flat config, e.g.:

```js
import js from "@eslint/js";

export default [
  js.configs.recommended,
];
```

- Pros:
  - Fixes error.
- Cons:
  - Ignores existing `.eslintrc.json` rules (Next.js, TypeScript, project-specific).
  - Changes lint behavior significantly — not acceptable.

---

## 4. Selected Approach

We will take a precise, low-risk approach:

- Treat `.eslintrc.json` as canonical.
- Neutralize `eslint.config.js` so ESLint does NOT attempt to use it as flat config.

Implementation decision:

1) Rename `eslint.config.js` to `eslint.config.js.note` or similar, OR
2) Replace its contents with an explicit comment that prevents flat-config usage by ensuring it is not considered as config when run via standard ESLint (Node resolution):

However, ESLint’s flat config loader triggers on presence of `eslint.config.js` exporting default. A file with only comments should not be treated as a valid flat config module, but in our scenario the runner reports an undefined config, indicating the environment loads it and sees no valid export.

The safest and clearest fix:

- Option A: Remove or rename `eslint.config.js`.

Concretely:

- `eslint.config.js`:
  - [ ] Rename to `eslint.config.js.docs` (or similar), keeping explanatory comments but making sure ESLint no longer treats it as configuration.
- `.eslintrc.json`:
  - [ ] Confirm it exists and contains the intended Next.js + TypeScript + project ruleset (already indicated by repo docs).
  - [ ] No changes unless we see lint rule mismatches.

This:
- Restores the “standard `.eslintrc.json` for now” behavior exactly as intended.
- Minimizes changes.
- Is easily auditable and reversible.

---

## 5. Execution Checklist

Planned steps (to be applied next):

1) Validate `.eslintrc.json` presence:
   - [ ] Read `.eslintrc.json` to confirm it has valid JSON and intended rules.
2) Update eslint.config.js:
   - [ ] Rename or remove eslint.config.js so ESLint does not consider it.
   - Preferred: rename to `eslint.config.js.note` to retain documentation without affecting config resolution.
3) Re-run:
   - [ ] `npm run lint`
   - [ ] `npm run type-check`
   - [ ] `npm run build`
   - [ ] Capture and document any remaining warnings/errors.
4) Documentation:
   - [ ] Add a short note to `docs/task_completion_report_landing_page_integration.md` or a new ESLint report file confirming:
     - The config fix.
     - That lint/type/build now pass or list remaining actionable warnings.

---

## 6. Plan Validation

- Addresses the exact root cause:
  - ESLint trying to load an undefined flat config from eslint.config.js.
- Avoids:
  - Overwriting or ignoring existing `.eslintrc.json` rules.
  - Introducing a partial or incorrect flat config conversion.
- Fully aligned with:
  - Project comments.
  - AGENT.md guidance to be conservative with tooling changes.
  - The Meticulous Approach (clear reasoning, minimal blast radius, documented outcome).

No changes have been applied yet; this file records the approved plan. Next step: implement the rename/removal of eslint.config.js and re-run lint/type/build according to this checklist.