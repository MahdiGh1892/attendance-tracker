# Architecture Rules

Design decisions that keep the app simple, local-first, and correct.

- Keep home-screen install support manifest-only (`public/manifest.webmanifest` + PNG icons in `public/`); never register a service worker or add `vite-plugin-pwa`, because a service worker keeps serving stale files in preview environments after edits.
- Keep all app data in this device's browser storage (`localStorage`), with the in-app JSON backup/restore as the only transfer path; the app has no server copy by design, so never introduce a database or sync layer.
- Represent every date as a sortable Jalali key `YYYY-MM-DD` produced by `src/lib/jalali.ts` (jalaali algorithm); never store Gregorian dates or format dates ad hoc in components.
- Compute lateness, early-leave and penalties only in `src/lib/penalty.ts` / `src/lib/store.ts`, and keep the stored record the source of truth so a rules change never silently rewrites past records.
- Keep `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` enabled in `tsconfig.json`; declare optional properties as `?: T | undefined` instead of weakening the compiler settings or casting.
- Keep the UI Persian and right-to-left, and route all user-facing numbers through the Persian digit helper in `src/lib/jalali.ts`.
