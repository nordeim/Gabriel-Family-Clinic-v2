# Textarea casing collision — fix (2025-11-09)

Summary

- Problem: The repository contained two files for the same UI component that differed only by filename case:
  - `components/ui/Textarea.tsx` (uppercase T)
  - `components/ui/textarea.tsx` (lowercase t; canonical)

  On case-insensitive filesystems (macOS default, Windows) and in CI that normalizes casing, TypeScript/Node can include both paths in the program and cause "Already included file name... differs only in casing" compile errors. This also caused inconsistent imports across the codebase.

- Fix applied (minimal & safe):
  1. Deleted the duplicate `components/ui/Textarea.tsx` file (uppercase). The canonical component is `components/ui/textarea.tsx`.
  2. Removed the temporary `tsconfig.json` exclude entry that was added earlier to work around this problem.

Files changed

- Deleted: `components/ui/Textarea.tsx` (duplicate)
- Updated: `tsconfig.json` (removed temporary exclude)
- Added: `docs/troubleshooting/textarea-casing-fix-2025-11-09.md` (this file)

Rationale and notes

- Removing the duplicate file is the long-term correct fix. The temporary `exclude` entry was used only to unblock type-checking while planning the safe delete; it has been removed.

- After this change, imports should consistently reference `@/components/ui/textarea` (lowercase). If any code still imports the uppercase path, TypeScript will show the missing module — in which case adjust the import to the lowercase canonical path.

Recommendations / follow-ups

- Run a full build in CI or locally:

  npm run build

  This will run ESLint/type-check and surface any remaining errors.

- Run a repository-wide search for any imports that reference `@/components/ui/Textarea` or `components/ui/Textarea` and update them to `textarea` if found.

- Add a short CI gate (or pre-commit hook) that fails on filename-case duplicates to prevent regressions.

- Optional: Add a tiny test or lint rule that ensures component filenames are lowercase in `components/ui/` to avoid accidental duplicates in the future.

Verification

- I ran the TypeScript type-check after removing the duplicate and updating `tsconfig.json` and the type-check completed without TypeScript errors at the time of the edit.

If you'd like, I can now run `npm run build` and fix any further build-time issues. You said you're happy to run the build yourself — let me know if you'd prefer I run it instead and iterate on any new errors.