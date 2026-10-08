# Project instructions

- Read the relevant source and documentation before changing behavior. Ask when required context is missing.
- Use current stable dependencies, keep exact versions and the lockfile, and review known vulnerabilities.
- Keep domain calculations separate from presentation and authenticated data access.
- Do not install or start Docker or a local Supabase stack. Prepare code and migrations for the independent Supabase project selected by the user.
- Preserve work outside the requested scope. Do not connect this project to existing Supabase accounts or other products.
- Distinguish code checks from verification of SQL, Auth, Storage and deployment. Never describe pending backend checks as completed.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
