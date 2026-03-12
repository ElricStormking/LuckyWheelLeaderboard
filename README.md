# Lucky Wheel Prototype

This workspace now follows the 4-part Lucky Wheel architecture: player client, authoritative game server, Merchant API, and admin tool.

## What is implemented

- `apps/contracts`: shared DTOs and enums for `/api/v2`, including locale and spin-quota contract types
- `apps/api`: Prisma-backed NestJS API with transactional spin resolution, admin overview/dashboard endpoints, localized event content, archived event browsing, history endpoints, and SSE realtime updates
- `apps/merchant-api`: standalone NestJS Merchant API stub that returns spin quota sourced from a Customer Platform-facing fixture
- `apps/game`: Phaser 3 portrait client with period selection, archived-event browsing, language switching, localized overlays, and placeholder visuals
- `apps/admin`: writable operations console for event setup, roulette config, prizes, rules, platform links, eligibility monitoring, participants, spins, and audit review

## Phase 1 API

- `GET /api/v2/config/localization`
- `GET /api/v2/events/current`
- `GET /api/v2/events?status=live,ended,finalized&page=1`
- `GET /api/v2/events/:eventId`
- `GET /api/v2/events/:eventId/leaderboard?limit=30`
- `GET /api/v2/events/:eventId/prizes`
- `GET /api/v2/events/:eventId/me`
- `GET /api/v2/events/:eventId/me/history?page=1`
- `GET /api/v2/me/lucky-wheel/history/events?page=1`
- `GET /api/v2/events/:eventId/eligibility`
- `GET /api/v2/events/:eventId/realtime`
- `POST /api/v2/spins`
- `GET /api/v2/admin/overview`
- `GET /api/v2/admin/events/:eventId/editor`
- `GET /api/v2/admin/events/:eventId/dashboard`
- `GET /api/v2/admin/events/:eventId/eligibility?page=1&pageSize=12`
- `GET /api/v2/admin/events/:eventId/participants?page=1&pageSize=12`
- `GET /api/v2/admin/events/:eventId/spins?page=1&pageSize=12`
- `GET /api/v2/admin/events/:eventId/audit?page=1&pageSize=12`
- `POST /api/v2/admin/events`
- `PATCH /api/v2/admin/events/:eventId`
- `POST /api/v2/admin/events/:eventId/publish`
- `POST /api/v2/admin/events/:eventId/cancel`
- `POST /api/v2/admin/events/:eventId/finalize`

## Merchant API

- `GET /merchant-api/v1/health`
- `GET /merchant-api/v1/lucky-wheel/players/:playerId/events/:eventId/eligibility`

All read endpoints support `?locale=en|ms|zh-CN`. The Phaser client bootstraps locale from `?lang=`, local storage, or browser language, then forwards that locale to the API.

The client never decides spin outcomes or eligibility. The Lucky Wheel server now resolves quota by calling the standalone Merchant API over HTTP. A dev-only eligibility override is still available, but the on-screen switch only appears when the game is launched with `?dev=1`.

## Workspace

- Root workspace is structured for `pnpm`, matching the plan.
- The current shell does not have a working `pnpm` binary, so `npm install` is the fallback for local verification if network access is available.

Common dev commands:

- `npm run dev:merchant-api`
- `npm run dev:api`
- `npm run dev:game`
- `npm run dev:admin`

Lifecycle configuration:

- `EVENT_AUTO_FINALIZE_GRACE_MINUTES`
  - optional
  - default: `30`
  - meaning: after an event reaches `endAt`, the scheduler leaves it in `ended` for this many minutes before auto-finalizing rankings

Player result visibility:

- when an event first reaches `ended`, players can still open the event period, but leaderboard and rank results stay hidden
- during that grace window, the client shows: `Event Result is be calculated, it will be shown after 30 minutes.`
- once the event becomes `finalized`, the archived leaderboard and player rank/prize summary become visible

## Playtest

1. `npm install --cache .npm-cache --ignore-scripts`
2. `npm run db:setup`
3. `npm run build`
4. `npm run playtest`

Windows note:

- If `npm run db:setup` fails with `EPERM ... query_engine-windows.dll.node`, stop the running API/playtest stack or Prisma Studio first, then rerun `npm run db:setup`.
- Helpful check: `cmd /c netstat -ano | findstr ":3000 :4000 :4002 :4003"`

Playtest URLs:

- Game: `http://localhost:3000`
- API health check target: `http://localhost:4000/api/v2/events/current`
- Merchant API health check: `http://localhost:4003/merchant-api/v1/health`
- Admin tool: `http://localhost:4002`

Locale examples:

- `http://localhost:3000/?lang=en`
- `http://localhost:3000/?lang=ms`
- `http://localhost:3000/?lang=zh-CN`
- `http://localhost:3000/?lang=en&dev=1`

## Phase Status

- Phase 4 is implemented for localization, platform links, merchant-API-driven quota, and the admin authoring surface.
- Phase 5 now includes overlap validation, event lifecycle scheduling, configurable auto-finalize grace after `endAt`, finalization snapshots, audit logging, participant/spin inspection, and admin eligibility monitoring.
- Remaining work is production hardening beyond the prototype scope: auth/roles, monitoring export, and real merchant authentication.
