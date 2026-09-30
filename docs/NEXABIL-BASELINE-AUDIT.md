# NEXABIL Baseline Audit

Date: 2026-09-29  
Repository: `arvnabil/Hermes-Studio`  
Upstream lineage: `JPeetz/Hermes-Studio` → `outsourc-e/hermes-workspace`  
Scope: baseline audit and safe deployment/rebrand preparation only

## Executive summary

NEXABIL is an existing full-stack Hermes management UI, not an empty product shell. The repository already contains chat, sessions, profiles, agents, memory, skills, MCP settings, cron/jobs, approvals, crews, workflow editing, tasks, audit, analytics, logs, terminal, workspace/files, health, and realtime UI. The central integration boundary is the Hermes HTTP gateway configured by `HERMES_API_URL`, with optional `HERMES_API_TOKEN` authentication.

The principal deployment issue found was `docker-compose.yml`: it previously built and started a second `hermes-agent` service and published port `8642`. It is now Studio-only and joins a configurable external Docker network. The existing Hermes container remains outside this repository's Compose lifecycle.

No Company, Departments, AI Employee Builder, organizational intelligence, LifeBot intelligence, CEO dashboard, 3D office, or Hermes3D integration was implemented.

## 1. Current architecture

- Frontend: React 19, TypeScript, Vite, TanStack Start/Router, TanStack Query, Zustand, Tailwind CSS, Recharts, Monaco, xterm, PWA assets.
- Server: Node HTTP entrypoint (`server-entry.js`) serving the built client and forwarding requests to the TanStack Start server bundle in `dist/server/server.js`.
- API: file-based TanStack route handlers under `src/routes/api/`; the Studio server acts as the authenticated browser-facing API and proxy/orchestration layer.
- Hermes client boundary: `src/server/gateway-capabilities.ts` and `src/server/hermes-api.ts`, plus the OpenAI-compatible client in `src/server/openai-compat-api.ts`.
- UI organization: route screens under `src/screens/`, shared components under `src/components/`, client helpers under `src/lib/`, and local stores under `src/server/`.
- Deployment: Node 22 Docker image, Studio-only Compose deployment, optional Redis, persistent `.runtime` volume.

## 2. Existing features

The feature inventory and route tree confirm the following existing areas:

- Dashboard and system metrics.
- Chat, multimodal attachments, sessions, history, titles, pinned sessions, streaming, tool-call rendering, approvals, and cost/context indicators.
- Profiles: list, read, create, rename, activate, delete; profile-scoped workspaces and agent configuration.
- Agent library: built-in personas plus custom agent create/edit/delete, persisted in `.runtime/agents.json`.
- Memory and knowledge: memory list/read/write/search, memory editor/browser, knowledge graph/list/read/search.
- Skills: installed/workspace skills, hub search, install/uninstall, settings.
- MCP server management and reload.
- Cron/jobs: list, create/update/delete, pause/resume/run, output, and Hermes-backed scheduling.
- Approvals and audit trail.
- Crews, built-in/custom templates, dispatch, usage, member status, and visual workflow builder.
- Tasks/Kanban with local CRUD, move, filters, assignment, tags, and event publication.
- Analytics, operations/conductor views, logs, provider usage, and system health.
- Files/workspace browser, terminal sessions, terminal streaming, resize/input/close.
- Settings, provider configuration, OAuth helpers, themes, PWA/mobile access, onboarding, search, shortcuts, voice input, and exports.

`FEATURES-INVENTORY.md` is the detailed inventory; the route tree and screen directories are the implementation index.

## 3. Hermes API integration points

The configured base URL is `process.env.HERMES_API_URL`, defaulting to `http://127.0.0.1:8642` when unset. `HERMES_API_TOKEN` is converted to an outbound Bearer header when present. Relevant integrations include:

- Health and capability probing: `/health`, `/v1/models`, `/v1/chat/completions`, `/api/sessions`, `/api/skills`, `/api/memory`, `/api/config`, and `/api/jobs`.
- Sessions/messages: `/api/sessions`, session detail/messages/search/fork/update/delete, active run/status endpoints.
- Enhanced chat: `/api/sessions/:id/chat/stream` through `src/server/hermes-api.ts`.
- Portable chat: `/v1/chat/completions` through `src/server/openai-compat-api.ts`.
- Provider/model/config: `/v1/models`, Hermes config and provider paths, with local config-path access where explicitly supported.
- Memory/skills/jobs/MCP/config: corresponding proxy routes under `src/routes/api/`.
- Approvals: Hermes session approve/deny endpoints.
- Conductor/crews: Hermes jobs and sessions are used for dispatch and monitoring.
- Logs and filesystem features: some data is read from the Hermes home/workspace paths (`HERMES_HOME`, `HERMES_WORKSPACE_DIR`, and related configuration), not from the public network.

The gateway capability layer degrades to portable mode when enhanced Hermes endpoints are missing; this is an intentional compatibility boundary, not a second backend.

## 4. Existing profile/agent lifecycle

Profiles are managed through `src/server/profiles-browser.ts` and API routes for list/read/create/rename/activate/delete. The active profile and profile configuration are read/written in the configured Hermes home/profile locations. Agent definitions are separate Studio-managed records: built-in personas are immutable, custom agents are created/updated/deleted through the agent API and persisted to `.runtime/agents.json`. Crew members reference persona/session/profile data and are dispatched through Hermes sessions/jobs.

## 5. Existing realtime architecture

There are two complementary streaming paths:

1. Hermes-native streaming: Studio forwards Hermes session chat streams and normalizes Hermes events into browser-friendly SSE events.
2. Studio event bus: `src/server/chat-event-bus.ts` and `src/server/event-store.ts` publish local/UI events, expose an SSE endpoint under `src/routes/api/events.ts`, support heartbeats and `Last-Event-ID` replay, and provide replay through `src/routes/api/events/replay.ts`.

Chat also uses `src/routes/api/chat-events.ts` and client realtime hooks. Terminal streaming has its own SSE/PTY path. This architecture allows UI updates for local task/crew state while Hermes remains the source of agent execution events.

## 6. Existing persistence/state

Hermes-owned or Hermes-backed data includes sessions, messages, agent execution, provider/gateway configuration, memory, skills, jobs, approvals, and Hermes logs/config paths.

Studio-local data includes:

- `.runtime/agents.json`
- `.runtime/crews.json`
- `.runtime/tasks.json`
- `.runtime/workflows.json`
- `.runtime/templates.json`
- run/event data managed by local stores
- local session fallback files when Redis is not configured
- browser `localStorage` for settings, themes, pinned items, conductor layout/settings/history, drafts, and some UI preferences
- optional Redis data for Studio session/token/user persistence when `REDIS_URL` is explicitly configured

The Docker deployment mounts `.runtime` as `studio-sessions`; Redis remains optional. `.env` is ignored and must not be committed.

## 7. Existing security model

- Optional Studio password protection via `HERMES_PASSWORD`.
- Cryptographically random session tokens, HttpOnly/SameSite cookie, timing-safe password comparison, Redis-backed token persistence when available.
- Request authentication checks on API handlers, local/private-network handling for local deployments, and JSON content-type checks on mutating routes.
- Rate limiting on authentication and selected API paths.
- Zod request validation in important handlers, traversal checks for static serving, and explicit path/workspace guards.
- Hermes Bearer token is server-side configuration and is not intended to be exposed to the browser.

Risks remain: password protection is opt-in; the integrated terminal and filesystem features are powerful; local/private-network allowances should be reviewed before internet-facing deployment; and `HERMES_API_URL` must point only to a trusted Hermes gateway.

## 8. Existing Docker architecture

`Dockerfile` builds the Vite/TanStack application in Node 22 Alpine and runs only `server-entry.js` as an unprivileged `hermes` user. The original Compose file coupled Studio to a newly built `hermes-agent`; that violated the Home Server requirement. The current `docker-compose.yml` builds only `nexabil-studio`, persists `.runtime`, optionally runs Redis, and joins an external network named by `HERMES_DOCKER_NETWORK` (default `hermes_default`). Hermes is neither built, started, nor published by this Compose file.

The external network must already exist and `HERMES_API_URL` must be the service name/port reachable from that network. Public exposure should terminate at the Studio/reverse-proxy boundary; Hermes should not be published directly.

## 9. Existing extension points

- New Hermes API capabilities: `src/server/gateway-capabilities.ts`, `src/server/hermes-api.ts`, `src/server/openai-compat-api.ts`, and new `src/routes/api/*` handlers.
- UI screens/navigation: `src/routes/`, `src/screens/`, `src/components/`, `src/router.tsx`.
- Agent/profile lifecycle: `src/server/agent-definitions-store.ts`, `src/server/profiles-browser.ts`, and profile/agent API routes.
- Crews/workflows/templates/tasks: corresponding stores and `src/routes/api/crews`, `src/routes/api/tasks`.
- Realtime: `chat-event-bus.ts`, `event-store.ts`, SSE route handlers, and chat realtime hooks.
- Persistence: local stores, `local-session-store.ts`, `redis-client.ts`, and `.runtime` volume.
- Auth/policy: `auth-middleware.ts` and `rate-limit.ts`.
- Branding: `src/routes/__root.tsx`, auth/onboarding/connection screens, `public/manifest.json`, and app metadata.

## 10. Features that already satisfy Nexabil requirements

The current management layer already provides the operational foundation for an AI-company control plane: multi-profile operation, agent library and lifecycle, sessions/chat, memory, skills, MCP, cron, approvals, crews, visual workflows, tasks, audit, analytics, logs, terminal/workspace access, health, and realtime updates. These should be treated as existing capability to stabilize and integrate, not rewritten.

## 11. Missing Nexabil-specific features

Not implemented in this baseline, by explicit scope: Company, Departments, AI Employee Builder, organizational intelligence, LifeBot intelligence, CEO dashboard, 3D office, and Hermes3D integration. There is no evidence in this repository that these should be added to the Hermes management layer before the connection is proven against the Home Server.

## Verification status

- Repository checkout: complete from `arvnabil/Hermes-Studio`.
- `pnpm install`: passed after allowing the repository's existing native build scripts; pnpm 11 also required the added `pnpm-workspace.yaml` allowlist.
- `pnpm build`: passed; Vite completed client and SSR builds. Existing large-chunk warnings remain.
- `pnpm test`: 170 passed, 20 failed. The failures are in `src/test/event-store.test.ts` and `src/test/analytics.test.ts`, during `rmSync()` cleanup of temporary SQLite directories on Windows (`EPERM`, permission denied). Other 14 test files passed.
- Docker Compose validation: passed with a temporary non-secret `.env` that was deleted immediately afterward; the rendered config contains only `nexabil-studio` plus the optional Redis profile and an external network.
- Local server smoke: passed on `http://127.0.0.1:3100` with HTTP 200 for `/` and `/api/connection-status`; the latter correctly reported `disconnected` because no Hermes instance was available at the local test URL.
- Home Server UI verification: not claimed. No Home Server URL, Docker network, or credentials were available in this workspace; no credentials were requested or committed.

## Report

### A. What works

The source-level management features listed above are implemented, routed, and covered by a mix of unit/component/e2e tests. The gateway compatibility design supports both enhanced Hermes mode and portable OpenAI-compatible mode.

### B. What does not work or remains unverified

Live Home Server connectivity and every end-to-end UI workflow remain unverified until the deployment is run on the Home Server with its real `HERMES_API_URL`, network, and optional token. Build/test results must be treated as the authoritative local verification once complete.

### C. What communicates directly with Hermes

Gateway health/capability probing, session/message/chat APIs, models/providers/config, memory, skills, jobs/cron, approvals, logs/config paths, workspace paths, and conductor/crew dispatch paths.

### D. What data comes from Hermes

Gateway health/capabilities, sessions/messages/runs, agent execution/tool events, models/provider state, memory/skills/jobs, approvals, Hermes configuration, and Hermes logs/files where the configured filesystem is mounted.

### E. What data is local to Hermes Studio

Custom agent definitions, crews, crew templates, workflow graphs, Kanban tasks, local event/run tracking, UI settings, browser preferences, and fallback session/token/user state.

### F. Existing features to keep

Keep the entire current Hermes management layer, especially capability probing, enhanced/portable fallback, SSE replay, profile isolation, local persistence fallbacks, approvals, and the existing tests.

### G. Features that should become Nexabil-specific

The deferred organizational/product layer—Company, Departments, AI Employee Builder, organizational intelligence, LifeBot, CEO dashboard, and Hermes3D—should be added as explicit extensions around the current management layer after live Hermes compatibility is demonstrated.

### H. Likely extension files

See section 9; the highest-value boundaries are `src/server/gateway-capabilities.ts`, `src/server/hermes-api.ts`, `src/routes/api/`, the existing stores, and the route/screen navigation layers.

### I. Architectural risks

The main risks are the breadth of filesystem/terminal power, opt-in authentication, version drift in Hermes enhanced endpoints, local file stores in multi-instance deployments, external Docker network naming, and assumptions about a mounted Hermes home directory. The current capability probing and portable fallback reduce—but do not eliminate—Hermes version risk.

### J. Recommended next implementation phase

Deploy Studio-only Compose on the Home Server, join the existing Hermes network, set `HERMES_API_URL` and optional `HERMES_API_TOKEN`, enable Studio authentication, run the full smoke matrix against the live instance, and record endpoint/version compatibility. Only after that should Nexabil-specific organizational features be designed around proven extension points.

## Attribution

NEXABIL is a fork of Hermes Studio by JPeetz and retains the upstream Hermes Studio/hermes-workspace lineage. LICENSE, copyright notices, MIT terms, upstream attribution, and third-party notices remain in the repository. NEXABIL branding does not claim authorship of the original Hermes projects.
