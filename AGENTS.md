# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the app code. Use `src/components/` for UI, `src/hooks/` for reusable state and side effects, `src/auth/` for login and password-reset flows, `src/utils/` for pure helpers, `src/data/` for static hunting-domain data, and `src/types/` plus `src/constants/` for shared contracts. Static assets and PWA icons live in `public/`. Firebase and hosting configuration is in `src/firebase.ts`, `firebase.json`, `firestore.rules`, and `firestore.indexes.json`. Build output goes to `build/`; do not edit generated files there.

## Build, Test, and Development Commands
Use Bun for all local workflows:

- `bun install` installs dependencies.
- `bun run dev` starts the Vite dev server with HMR.
- `bun run build` runs TypeScript project checks and creates the production bundle.
- `bun run preview` serves the built app locally for a release check.
- `bun run lint` runs ESLint across the repository.

## Coding Style & Naming Conventions
This is a TypeScript React codebase with functional components and hooks. Follow the existing 2-space indentation, semicolon-free style, and prefer single quotes in `.ts` and `.tsx` files. Use `PascalCase` for components (`EintragTable.tsx`), `camelCase` for hooks and helpers (`useFirestore.ts`), and colocate small utilities near their domain. Keep Tailwind utility classes readable by grouping layout, spacing, then color/state classes. Run `bun run lint` before opening a PR; the custom ESLint rules in `eslint-rules/` are enforced.

## Testing Guidelines
There is no dedicated automated test runner configured yet. Treat `bun run build` and `bun run lint` as the minimum validation for every change. For logic-heavy updates in `src/utils/` or `src/hooks/`, add small, focused tests if you introduce a test framework later; until then, document manual verification steps in the PR. Check critical flows locally: authentication, Firestore-backed CRUD, CSV import/export, and PDF/PWA behavior.

## Commit & Pull Request Guidelines
Recent history follows concise Conventional Commit-style subjects such as `fix(EintragTable): correct column labels` and `feat(EintragTable): add configurable column visibility`. Use the same pattern: `<type>(<scope>): <imperative summary>`. Keep PRs focused, describe the user-visible change, list validation steps, and link related issues. Include screenshots or short recordings for UI changes, especially table, filter, print, or mobile layout updates.

## Security & Configuration Tips
Firebase is central to the app. Review changes to [`src/firebase.ts`](/Users/philipp.kanter/Developer/Random/streckenliste/src/firebase.ts), [`firestore.rules`](/Users/philipp.kanter/Developer/Random/streckenliste/firestore.rules), and [`firebase.json`](/Users/philipp.kanter/Developer/Random/streckenliste/firebase.json) carefully. Do not weaken Firestore rules for convenience, and verify any auth or data-access change against admin/user role boundaries before merging.
