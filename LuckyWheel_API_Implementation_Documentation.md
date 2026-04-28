# Lucky Wheel Production Integration API Documentation

**Version:** 2.8  
**Last Updated:** April 24, 2026

**Change Highlights**
- Upgrades the Lucky Wheel integration document from prototype guidance to a production target contract.
- Adds production bearer authentication for player and admin endpoints.
- Adds merchant HMAC signature authentication for merchant-to-Lucky-Wheel session launch requests.
- Replaces public launch hash authentication with shared GUID header authentication plus timestamp freshness validation.
- Removes `merchantId` from the public launch request and resolves the single merchant from `MERCHANT_INTEGRATION_ID`.
- Simplifies public launch bootstrap eligibility to `initialEligibility.depositQualified`.
- Defines a formal external response envelope and error-code contract.
- Publishes OpenAPI artifacts for Lucky Wheel Server and Merchant API.
- Adds observability, request tracing, auditability, and rate-limit requirements.
- Uses hybrid eligibility: Lucky Wheel Server enforces live-event and daily-spin usage, while Customer Platform provides deposit eligibility through Merchant API and supplies the preferred deposit URL through launch `depositUrl`.
- Starts wiring Merchant API to the live Customer Platform SOAP/WCF operation `LuckyWheel_Deposit_isEligible`.
- Replaces the old placeholder REST upstream contract with the actual SOAP request, response, auth, and rollout plan.

---

## Table of Contents

1. Integration Application and Activation
2. Overview
3. Runtime Architecture
4. Environments and Base URLs
5. Security Model
6. Merchant-to-Lucky-Wheel Signature Generation
7. Common Request and Response Contract
8. External Error Codes
9. Lucky Wheel Server API
10. Merchant API
11. Customer Platform Upstream Contract
12. OpenAPI Publications
13. Observability, Tracing, and Auditability
14. Rate Limits and Security Controls
15. Production Migration Notes

---

## 1. Integration Application and Activation

### Information Required from Merchant Before Production Activation

- internal merchant identifier used to configure `MERCHANT_INTEGRATION_ID`
- merchant display name and operating brand
- merchant callback contact and operational escalation contact
- merchant public egress IP ranges for allow-listing
- player-auth trust model:
  - JWT issuer and audience, or
  - OAuth2/OpenID Connect discovery URL, or
  - JWKS URL for signature validation
- merchant launch secret used for HMAC request signing
- merchant production and sandbox launch origins
- target localization rollout requirements
- agreed request-per-minute profile for launch traffic

### Information Returned by Lucky Wheel Platform After Activation

- production and sandbox base URLs
- Merchant API launch integration path, required `X-Integration-Guid` header, timestamp tolerance, and public launch request shape
- confirmation that public launch merchant resolution is server-configured from `MERCHANT_INTEGRATION_ID`
- request-signing verification rules and timestamp tolerance
- trace header and log-field conventions
- OpenAPI publication locations
- rate-limit profile
- support and incident contact channels

---

## 2. Overview

This document defines the production integration contract for the current Lucky Wheel platform. It preserves the current Lucky Wheel gameplay model while upgrading the interface to a production-ready standard.

The platform has four runtime roles:

- Merchant Frontend or Customer Platform: initiates player launch
- Merchant API: customer-platform-facing launch bridge and deposit-eligibility service
- Lucky Wheel Server: authoritative game backend for events, eligibility, spins, rankings, and player state
- Lucky Wheel Admin Tool: source of truth for event scheduling and content

### Production Gameplay Rule

Each player may spin Lucky Wheel at most once per event day.

Final eligibility is derived by Lucky Wheel Server from:

- the current live event resolved from Lucky Wheel Admin Tool configuration
- the player's used spins inside the current event-day window
- the event's configured daily spin limit, which is currently `1`
- Customer Platform deposit eligibility resolved through Merchant API, with the preferred deposit URL supplied at launch

The event-day window is always derived from the event timezone, not from browser local time.

---

## 3. Runtime Architecture

### 3.1 Merchant -> Lucky Wheel Server

Merchant backend signs a session-launch request and creates a Lucky Wheel player session. Lucky Wheel Server resolves the current live event from the Lucky Wheel Admin Tool configuration, then returns a short-lived player access token, refresh token, and launch URL.

### 3.2 Player Client -> Lucky Wheel Server

The game client calls bearer-protected Lucky Wheel endpoints for:

- localization
- event bootstrap
- leaderboard
- prizes
- player summary
- player history
- eligibility
- spin execution
- realtime SSE

### 3.3 Lucky Wheel Server -> Merchant API

Lucky Wheel Server calls Merchant API to retrieve Customer Platform deposit eligibility and the Customer Platform deposit URL for the current player and event. This is a server-to-server integration and is not publicly callable by player clients.

### 3.4 Merchant API -> Customer Platform

Merchant API resolves deposit eligibility through the Customer Platform SOAP/WCF service `iBetService.svc` using `LuckyWheel_Deposit_isEligible`. Lucky Wheel still owns event scheduling, event-day boundaries, and used-spin counting.

---

## 4. Environments and Base URLs

| Environment | Lucky Wheel Server | Merchant API |
|---|---|---|
| Production | `https://api.luckywheel.example.com/api/v2` | `https://merchant-api.luckywheel.example.com/merchant-api/v1` |
| Sandbox | `https://sandbox-api.luckywheel.example.com/api/v2` | `https://sandbox-merchant-api.luckywheel.example.com/merchant-api/v1` |

Final production hostnames are assigned during onboarding. All examples in this document use the paths above.

---

## 5. Security Model

### 5.1 Merchant-to-Lucky-Wheel Authentication

Merchant session-launch requests must use merchant signature authentication.

Required headers:

- `X-Merchant-Id`
- `X-Timestamp`
- `X-Nonce`
- `X-Signature`
- `X-Request-Id` recommended
- `traceparent` recommended

Security rules:

- timestamp tolerance: `300` seconds maximum drift
- future timestamps are rejected
- nonce replay protection window: minimum `10` minutes
- signature verification failure returns `401`
- allow-listed merchant IPs may be enforced in addition to signature validation

### 5.2 Player Authentication

All player endpoints must require:

`Authorization: Bearer <player_access_token>`

Token requirements:

- signed JWT
- short-lived access token, recommended TTL `15` minutes
- refresh token rotation enabled
- `jti` required for revocation and replay detection

Required access-token claims:

- `sub`: player identifier
- `merchantId`
- `sessionId`
- `scope`
- `iat`
- `exp`
- `jti`

Recommended optional claims:

- `locale`
- `siteCode`
- `roles`

### 5.3 Admin Authentication

Admin endpoints must require:

`Authorization: Bearer <operator_access_token>`

Required operator claims:

- `sub`
- `roles`
- `permissions`
- `iat`
- `exp`
- `jti`

### 5.4 Lucky Wheel Server -> Merchant API Authentication

Lucky Wheel Server must call Merchant API using:

- `Authorization: Bearer <service_token>`
- mutual TLS in production
- request tracing headers

Current implementation notes:

- the current codebase uses a shared internal bearer token configured by `MERCHANT_API_SERVICE_TOKEN`
- local development falls back to a shared development token when `MERCHANT_API_SERVICE_TOKEN` is not set
- signed service JWTs remain a future enhancement option, but are not the current implementation

### 5.5 Customer Platform -> Merchant API Public Launch Authentication

Customer Platform must call Merchant API public launch using a shared integration GUID header plus request timestamp freshness validation.

- required header: `X-Integration-Guid`
- required body fields: `playerId`, `initialEligibility.depositQualified`, `timestamp`
- `timestamp` uses Unix time in seconds
- timestamp tolerance: `300` seconds maximum drift
- future timestamps are rejected
- missing `playerId` or invalid `initialEligibility.depositQualified` returns public launch error code `4000`
- missing or invalid integration GUID returns public launch error code `1001`
- missing, non-integer, or expired timestamp returns public launch error code `1002`
- Merchant API resolves merchant identity from `MERCHANT_INTEGRATION_ID` server config; `merchantId` is not part of the public request contract
- inactive configured merchant returns public launch error code `1004`
- caller IP outside `MERCHANT_INTEGRATION_ALLOWED_IPS` returns public launch error code `1005`
- missing or invalid `MERCHANT_INTEGRATION_ID` is treated as server misconfiguration and returns `7001`

Mutual TLS is recommended in addition to the caller IP allow-list enforced by Merchant API.

### 5.6 Merchant API -> Customer Platform Eligibility Authentication

Merchant API authenticates to Customer Platform using the Customer Platform SOAP/WCF credentials assigned during onboarding.

Required Customer Platform integration inputs:

- `CUSTOMER_PLATFORM_COMP_ACCESSKEY`
- `CUSTOMER_PLATFORM_SITE_ID`
- Customer Platform `iBetService.svc` endpoint URL
- Merchant API egress IP allow-listing at Customer Platform

Current upstream operation:

- SOAP 1.1 action: `http://tempuri.org/IiBetService/LuckyWheel_Deposit_isEligible`
- request fields: `CompAccesskey`, `SiteID`, `Account`, `RecordDate`
- production transport requirement: mutual TLS or private network path when available, plus IP allow-listing

`RecordDate` is date-sensitive business input, not an auth field. Merchant API must derive it from the Lucky Wheel event-day timezone and send the date in `YYYY-MM-DDT00:00:00` form.

---

## 6. Merchant-to-Lucky-Wheel Signature Generation

### 6.1 Canonical Request

Merchant signatures use HMAC-SHA256 over the following canonical request string:

```text
<HTTP_METHOD>\n
<REQUEST_PATH>\n
<UNIX_TIMESTAMP>\n
<NONCE>\n
<SHA256_HEX_OF_RAW_BODY>
```

Example:

```text
POST
/api/v2/player/session/launch
1761040800
7f2a5b91-0fd5-4dd8-8cf1-0f3f4f6f0a0e
4a1f8f1ccf8bcbccf8a45e0f0a7f280d9757ac1e1f3db95f3f6b1d4e3c7f62f1
```

### 6.2 Signature Formula

```text
signature = HEX(HMAC_SHA256(merchantSecret, canonicalRequest))
```

### 6.3 Verification Requirements

- header names are case-insensitive
- request path must exclude scheme, host, and query string
- raw body hash must be computed from the exact transmitted bytes
- nonce must be unique per merchant inside the replay-protection window
- signature comparison must use constant-time comparison

### 6.4 Node.js Example

```javascript
const crypto = require('crypto');

function signRequest({ method, path, timestamp, nonce, rawBody, merchantSecret }) {
  const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');
  const canonical = [method.toUpperCase(), path, String(timestamp), nonce, bodyHash].join('\n');
  return crypto.createHmac('sha256', merchantSecret).update(canonical).digest('hex');
}
```

---

## 7. Common Request and Response Contract

### 7.1 Required Common Headers

| Header | Direction | Required | Description |
|---|---|---|---|
| `Authorization` | Client -> Server | Conditional | Required for bearer-protected endpoints |
| `X-Request-Id` | Client -> Server | Recommended | Caller-generated request correlation ID |
| `traceparent` | Client -> Server | Recommended | W3C trace context |
| `tracestate` | Client -> Server | Optional | W3C trace state |
| `Idempotency-Key` | Client -> Server | Required for spin | Deduplicates retry attempts |
| `X-RateLimit-Limit` | Server -> Client | When rate-limited endpoints apply | Route limit |
| `X-RateLimit-Remaining` | Server -> Client | When rate-limited endpoints apply | Remaining allowance |
| `X-RateLimit-Reset` | Server -> Client | When rate-limited endpoints apply | Reset epoch seconds |

### 7.2 Success Envelope

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "requestId": "0dc2f7d0-f9ca-4eb8-ae09-d64e37fa32d6",
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
    "timestamp": "2026-03-21T09:30:00.000Z",
    "version": "v2"
  }
}
```

### 7.3 Error Envelope

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "LW-AUTH-001",
    "message": "Player access token is invalid or expired.",
    "retryable": false,
    "details": {
      "tokenType": "access"
    }
  },
  "meta": {
    "requestId": "0dc2f7d0-f9ca-4eb8-ae09-d64e37fa32d6",
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
    "timestamp": "2026-03-21T09:30:00.000Z",
    "version": "v2"
  }
}
```

### 7.4 HTTP Status Usage

| Status | Usage |
|---|---|
| `200` | Successful read or accepted business result |
| `201` | Session created |
| `400` | Invalid request payload or parameter |
| `401` | Authentication failure |
| `403` | Authenticated but not allowed |
| `404` | Resource not found |
| `409` | Conflict, duplicate request, or replay |
| `422` | Business rule denial |
| `429` | Rate-limited |
| `500` | Internal server error |
| `502` | Upstream gateway error |
| `503` | Upstream unavailable |
| `504` | Upstream timeout |

### 7.5 Idempotency

`POST /api/v2/spins` must require `Idempotency-Key`.

Rules:

- keys are unique per player session and route
- successful duplicate retries must return the original committed result
- conflicting payload reuse must return `409`

---

## 8. External Error Codes

| Code | HTTP | Retryable | Description |
|---|---|---|---|
| `LW-AUTH-001` | `401` | No | Player access token is missing, invalid, or expired |
| `LW-AUTH-002` | `401` | No | Refresh token is invalid, expired, or revoked |
| `LW-AUTH-003` | `401` | No | Player session has been revoked |
| `LW-AUTH-004` | `403` | No | Operator token lacks required permission |
| `LW-MERCHANT-001` | `401` | No | Merchant signature is invalid |
| `LW-MERCHANT-002` | `401` | No | Merchant timestamp is outside allowed window |
| `LW-MERCHANT-003` | `409` | No | Merchant nonce replay detected |
| `LW-MERCHANT-004` | `403` | No | Merchant caller IP is not allowed |
| `LW-REQ-001` | `400` | No | Request payload failed validation |
| `LW-REQ-002` | `409` | No | Idempotency key conflicts with a different payload |
| `LW-PLAYER-001` | `404` | No | Player not found |
| `LW-EVENT-001` | `404` | No | Event not found |
| `LW-EVENT-002` | `422` | No | Event is not live |
| `LW-ELIG-001` | `422` | No | Daily spin already used |
| `LW-ELIG-002` | `422` | No | Deposit is required before spin is allowed |
| `LW-SPIN-001` | `409` | No | Duplicate spin submission detected |
| `LW-SPIN-002` | `422` | No | Spin cannot be executed in current state |
| `LW-UPSTREAM-001` | `503` | Yes | Merchant API unavailable |
| `LW-UPSTREAM-002` | `503` | Yes | Customer Platform unavailable |
| `LW-UPSTREAM-003` | `504` | Yes | Customer Platform timed out |
| `LW-RATE-001` | `429` | Yes | Route rate limit exceeded |
| `LW-SYS-001` | `500` | Yes | Internal server error |

---

## 9. Lucky Wheel Server API

All Lucky Wheel Server endpoints are under:

`/api/v2`

### 9.1 Merchant Session Endpoints

#### `POST /api/v2/player/session/launch`

Creates a player session from a merchant-signed request.

Authentication:

- merchant signature headers required

Request body:

```json
{
  "merchantPlayerId": "merchant-player-789",
  "device": {
    "platform": "android",
    "userAgent": "Mozilla/5.0"
  }
}
```

Lucky Wheel Server resolves the current live event from the Admin Tool event schedule during session creation.

Success response:

```json
{
  "success": true,
  "data": {
    "sessionId": "lw_sess_8f6c4d8f",
    "launchUrl": "https://app.luckywheel.example.com/?eventId=evt_2026_march&playerId=merchant-player-789&sessionId=lw_sess_8f6c4d8f",
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "expiresAt": "2026-03-21T10:15:00.000Z"
  },
  "error": null,
  "meta": {
    "requestId": "req_launch_001",
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
    "timestamp": "2026-03-21T10:00:00.000Z",
    "version": "v2"
  }
}
```

#### `POST /api/v2/player/session/refresh`

Rotates player tokens.

Authentication:

- refresh token in request body

Request body:

```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

### 9.2 Player Endpoints

All endpoints below require:

`Authorization: Bearer <player_access_token>`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/config/localization` | Resolve requested and supported locales |
| `GET` | `/events/current` | Get current event and player bootstrap data |
| `GET` | `/events` | List events |
| `GET` | `/events/{eventId}` | Get localized event detail |
| `GET` | `/events/{eventId}/leaderboard` | Get leaderboard |
| `GET` | `/events/{eventId}/prizes` | Get prize tiers |
| `GET` | `/events/{eventId}/me` | Get player summary |
| `GET` | `/events/{eventId}/me/history` | Get player spin history |
| `GET` | `/me/lucky-wheel/history/events` | Get archived event history |
| `GET` | `/events/{eventId}/eligibility` | Get daily spin eligibility |
| `GET` | `/events/{eventId}/realtime` | Subscribe to SSE updates |
| `POST` | `/spins` | Execute a spin |

### 9.3 Eligibility Response

`GET /api/v2/events/{eventId}/eligibility`

Example success payload:

```json
{
  "success": true,
  "data": {
    "eventId": "evt_2026_march",
    "eventStatus": "live",
    "eligibilityStatus": "PLAYABLE_NOW",
    "grantedSpinCount": 1,
    "usedSpinCount": 0,
    "remainingSpinCount": 1,
    "spinAllowanceSource": "lucky_wheel_server",
    "buttonLabel": "SPIN NOW",
    "wheelVisualState": "normal",
    "messageKey": "eligibility.playableNow"
  },
  "error": null,
  "meta": {
    "requestId": "req_eligibility_001",
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
    "timestamp": "2026-03-21T10:00:00.000Z",
    "version": "v2"
  }
}
```

Eligibility rules:

1. Lucky Wheel Server loads the event and verifies that it is live.
2. Lucky Wheel Server computes the current event-day window from the event timezone.
3. Lucky Wheel Server counts spins already used in that window.
4. Lucky Wheel Server applies the event's daily spin limit to the used-spin count.
5. Lucky Wheel Server calls Merchant API to obtain Customer Platform deposit eligibility and a normalized deposit URL.
6. Lucky Wheel Server returns `GO_TO_DEPOSIT` with `depositUrl` when Customer Platform says deposit is required. The preferred source is the launch-time `depositUrl`; Merchant API fallback remains available if launch did not provide one.

`depositUrl` is returned only when `eligibilityStatus` is `GO_TO_DEPOSIT`.

### 9.4 Spin Endpoint

`POST /api/v2/spins`

Required headers:

- `Authorization`
- `Idempotency-Key`
- `X-Request-Id` recommended
- `traceparent` recommended

Request body:

```json
{
  "eventId": "evt_2026_march"
}
```

Success response:

```json
{
  "success": true,
  "data": {
    "segmentIndex": 1,
    "scoreDelta": 80,
    "runningEventTotal": 4630,
    "rewardType": "score",
    "rewardValue": 80,
    "rank": 12,
    "leaderboardChanged": true
  },
  "error": null,
  "meta": {
    "requestId": "req_spin_001",
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
    "timestamp": "2026-03-21T10:02:00.000Z",
    "version": "v2"
  }
}
```

Business-denied response example:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "LW-ELIG-001",
    "message": "Daily spin already used.",
    "retryable": false,
    "details": {
      "eligibilityStatus": "ALREADY_SPIN"
    }
  },
  "meta": {
    "requestId": "req_spin_002",
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
    "timestamp": "2026-03-21T10:03:00.000Z",
    "version": "v2"
  }
}
```

### 9.5 Realtime SSE

`GET /api/v2/events/{eventId}/realtime`

Requirements:

- bearer authentication required
- media type `text/event-stream`
- heartbeat comments at least every `15` seconds
- server must emit `traceparent` and `X-Request-Id` in the initial HTTP response

Documented event types:

- `event:statusChanged`
- `event:countdownSync`
- `leaderboard:top30`
- `player:scoreChanged`
- `player:rankChanged`

---

## 10. Merchant API

Internal Merchant API endpoints are under:

`/merchant-api/v1`

Merchant API is the customer-platform-facing launch bridge and the runtime deposit-eligibility bridge between Lucky Wheel Server and Customer Platform.

Internal endpoint authentication:

- `Authorization: Bearer <service_token>`
- mutual TLS required in production

### Customer Platform Launch Integration

Merchant API also exposes a customer-platform-facing launch endpoint:

`POST /merchant-api/integration/launch`

This endpoint is intended for customer platform backend integration and uses shared GUID header authentication plus timestamp freshness validation:

- required header: `X-Integration-Guid`
- required request body fields: `playerId`, `initialEligibility.depositQualified`, `timestamp`
- `merchantId` is not part of the public launch contract; Merchant API resolves the single merchant from `MERCHANT_INTEGRATION_ID`

It returns:

- Lucky Wheel game URL
- generated session ID
- launch expiry timestamp

`initialEligibility` in this flow is customer-platform-supplied bootstrap data only. Lucky Wheel accepts it for launch-time UX, but it is not authoritative for gameplay. Lucky Wheel still reloads and re-validates eligibility after launch.

Legacy callers that still send an extra `merchantId` field are ignored by the current implementation.
Player locale is not part of the customer-platform launch contract. Lucky Wheel resolves locale client-side from browser or device settings, with optional local client preference overrides.
Customer Platform also does not need to send a separate player display name. Merchant API and Lucky Wheel use `playerId` as the player label for this launch flow.
Customer Platform also does not send `eventId`. Merchant API and Lucky Wheel resolve the current live event from the Lucky Wheel Admin Tool configuration during launch.

Unlike the sample wallet game, Lucky Wheel does not expose balance-transfer, transfer-history, or wallet callback APIs.

### 10.1 `GET /merchant-api/v1/health`

Success payload:

```json
{
  "success": true,
  "data": {
    "service": "merchant-api",
    "status": "online",
    "upstreamSource": "customer_platform",
    "updatedAt": "2026-03-21T09:30:00.000Z"
  },
  "error": null,
  "meta": {
    "requestId": "req_health_001",
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
    "timestamp": "2026-03-21T09:30:00.000Z",
    "version": "v1"
  }
}
```

### 10.2 `GET /merchant-api/v1/lucky-wheel/players/{playerId}/events/{eventId}/eligibility`

Purpose:

- retrieve Customer Platform deposit eligibility and Merchant API normalized deposit URL for the player

Success payload:

```json
{
  "success": true,
  "data": {
    "eventId": "evt_2026_march",
    "playerId": "player_demo_001",
    "depositQualified": false,
    "depositUrl": "https://merchant.example.com/deposit?playerId=player_demo_001&eventId=evt_2026_march",
    "decisionId": "cp_live_player_demo_001_evt_2026_march_1761040798000",
    "upstreamSource": "customer_platform",
    "evaluatedAt": "2026-03-21T09:29:58.000Z",
    "expiresAt": "2026-03-21T09:44:58.000Z",
    "updatedAt": "2026-03-21T09:30:00.000Z"
  },
  "error": null,
  "meta": {
    "requestId": "req_merchant_elig_001",
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
    "timestamp": "2026-03-21T09:30:00.000Z",
    "version": "v1"
  }
}
```

Required response fields:

- `playerId`
- `eventId`
- `depositQualified`
- `decisionId`
- `evaluatedAt`
- `expiresAt`
- `updatedAt`

`depositUrl` is required when `depositQualified` is `false`.

Implementation notes:

- Merchant API maps `playerId` to Customer Platform `Account`
- Merchant API currently derives `RecordDate` from `CUSTOMER_PLATFORM_RECORD_DATE_TIMEZONE`
- Merchant API synthesizes `decisionId` and `expiresAt`; the upstream SOAP response does not provide either field
- Customer Platform now supplies the preferred current-domain deposit link through launch `depositUrl`
- Merchant API still returns `depositUrl` in this internal response when `depositQualified=false`
- when no launch deposit URL is available to the Lucky Wheel web flow, Merchant API fallback uses configured `CUSTOMER_PLATFORM_DEPOSIT_URL`

### 10.3 `POST /merchant-api/integration/launch`

Purpose:

- create a Lucky Wheel launch session for a customer-platform player

Request payload:

Required header:

```text
X-Integration-Guid: 11111111-1111-1111-1111-111111111111
```

The request body does not include `merchantId`. If a legacy caller still sends it, the current implementation ignores that extra field.

```json
{
  "playerId": "merchant-player-789",
  "initialEligibility": {
    "depositQualified": true
  },
  "depositUrl": "https://www.customer-current-domain.com/deposit",
  "timestamp": 1761216000
}
```

Success payload:

```json
{
  "success": true,
  "errorCode": 0,
  "errorMessage": "",
  "data": {
    "url": "https://merchant-api.luckywheel.example.com/?playerId=merchant-player-789&sessionId=lw_sess_8f6c4d8f",
    "sessionId": "lw_sess_8f6c4d8f",
    "expiresAt": "2026-03-23T10:15:00.000Z"
  }
}
```

Authentication notes:

- `X-Integration-Guid` is the shared launch credential
- `timestamp` is validated only as a freshness check
- Merchant API resolves merchant identity from `MERCHANT_INTEGRATION_ID` server config
- `initialEligibility` is not part of launch authentication. Only `depositQualified` is required in the bootstrap object.
- `depositUrl` is optional but recommended for production customer-platform domains. It must be a top-level absolute `http` or `https` URL.
- `DepositURL` is also accepted as a compatibility alias, but `depositUrl` is preferred.
- invalid `playerId` or invalid `initialEligibility.depositQualified` returns `4000`
- missing or invalid `MERCHANT_INTEGRATION_ID` returns `7001`
- `url` is an opaque launch URL; callers must not parse or construct internal Lucky Wheel query parameters

Lucky Wheel resolves the current live `eventId` internally during launch. Customer Platform does not submit event configuration, but it may submit `initialEligibility` bootstrap data and the preferred `depositUrl`. The bootstrap data is not authoritative for gameplay; the deposit-rule decision still comes from the SOAP/WCF eligibility call.

---

## 11. Customer Platform Upstream Contract

Merchant API resolves deposit-related eligibility from Customer Platform through the SOAP/WCF service documented by Customer Platform.

### 11.1 Upstream Service

- service endpoint: `http://<customer-platform-host>/iBetService.svc`
- WSDL: `http://<customer-platform-host>/iBetService.svc?wsdl`
- SOAP 1.1 action: `http://tempuri.org/IiBetService/LuckyWheel_Deposit_isEligible`
- binding style: document/literal

### 11.2 Upstream Request Mapping

Merchant API keeps its internal REST contract for Lucky Wheel Server:

`GET /merchant-api/v1/lucky-wheel/players/{playerId}/events/{eventId}/eligibility`

It translates that request into the following SOAP call:

| Merchant API / Lucky Wheel field | Customer Platform SOAP field | Notes |
|---|---|---|
| `playerId` | `Account` | direct mapping |
| configured site | `SiteID` | supplied from `CUSTOMER_PLATFORM_SITE_ID` |
| configured access key | `CompAccesskey` | supplied from `CUSTOMER_PLATFORM_COMP_ACCESSKEY` |
| event-day date | `RecordDate` | date-only decision input; Merchant API sends `YYYY-MM-DDT00:00:00` |

Representative SOAP body:

```xml
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <LuckyWheel_Deposit_isEligible xmlns="http://tempuri.org/">
      <CompAccesskey>customer-platform-access-key</CompAccesskey>
      <SiteID>A</SiteID>
      <Account>player_demo_001</Account>
      <RecordDate>2026-04-01T00:00:00</RecordDate>
    </LuckyWheel_Deposit_isEligible>
  </soap:Body>
</soap:Envelope>
```

### 11.3 Upstream Response Mapping

Representative success response shape:

```xml
<LuckyWheel_Deposit_isEligibleResponse xmlns="http://tempuri.org/">
  <LuckyWheel_Deposit_isEligibleResult>
    <Code></Code>
    <ErrorMsg></ErrorMsg>
    <Memo></Memo>
    <Status>true</Status>
  </LuckyWheel_Deposit_isEligibleResult>
  <IsEligible>false</IsEligible>
</LuckyWheel_Deposit_isEligibleResponse>
```

Relevant response fields:

| SOAP field | Meaning | Merchant API handling |
|---|---|---|
| `Status` | service-level success or failure | must be checked first |
| `IsEligible` | deposit-rule decision | used only when `Status=true` |
| `Code` | upstream service code | log and surface in diagnostics |
| `ErrorMsg` | upstream failure detail | log and map to `503`/`504` |
| `Memo` | optional upstream memo | log for debugging only |

Important note:

- for the Lucky Wheel integration, the Customer Platform SOAP/WCF response only needs to return the deposit-rule decision (`Status` / `IsEligible`)
- Customer Platform should provide the preferred current-domain deposit link through launch `depositUrl`
- Merchant API may still parse upstream `DepositUrl` if Customer Platform continues returning it for backward compatibility, but the Lucky Wheel web flow should not depend on that field
- when no launch `depositUrl` is available, Merchant API synthesizes fallback `depositUrl` from configured `CUSTOMER_PLATFORM_DEPOSIT_URL`

### 11.4 Upstream Client Requirements

- per-request timeout: `2000ms`
- initial implementation uses direct SOAP POST from Merchant API
- retry policy should be limited to retryable transport failures only
- trace context propagation required
- circuit breaker is recommended before production scale rollout
- response caching is controlled by Merchant API because the upstream SOAP response does not publish a TTL

### 11.5 Required Upstream Failure Mapping

| Upstream Condition | Merchant API Result |
|---|---|
| `Status=true` and `IsEligible=true` | `200` with `depositQualified=true` |
| `Status=true` and `IsEligible=false` | `200` with `depositQualified=false` and Merchant API normalized `depositUrl` |
| `Status=false` | `503` Merchant API upstream failure |
| SOAP fault or non-`200` HTTP status | `503` Merchant API upstream failure |
| upstream timeout | `504` Merchant API upstream timeout |

### 11.6 Current Implementation Status

- Merchant API now includes a real SOAP client path for `LuckyWheel_Deposit_isEligible`
- local development may still run with fixture-mode fallback unless `CUSTOMER_PLATFORM_SOAP_ENABLED=true` or a real `CUSTOMER_PLATFORM_COMP_ACCESSKEY` is configured
- Lucky Wheel Server does not need a contract change; it continues calling Merchant API over the existing internal REST endpoint

---

## 12. OpenAPI Publications

The production contract is published in the repository under:

- `openapi/lucky-wheel-server.openapi.json`
- `openapi/merchant-api.openapi.json`

Publication requirements:

- OpenAPI version `3.0.3` or later
- validated in CI on every contract change
- versioned together with this document
- published to merchant onboarding and internal developer portals

---

## 13. Observability, Tracing, and Auditability

### 13.1 Request Tracing

All production services must accept and propagate:

- `X-Request-Id`
- `traceparent`
- `tracestate`

The following paths must preserve trace continuity:

Customer Platform launch request -> Merchant API -> Lucky Wheel Server
Lucky Wheel eligibility check -> Merchant API -> Customer Platform -> Lucky Wheel spin transaction -> SSE updates

### 13.2 Structured Logging

Every request log should include:

- `requestId`
- `traceId`
- `merchantId`
- `playerId`
- `sessionId`
- `eventId`
- route and method
- response status
- error code when present
- upstream latency
- rate-limit decision

Sensitive secrets, GUID credentials, tokens, and signatures must never be written to logs.

### 13.3 Metrics

Minimum metrics set:

- request count by route, status, and caller type
- p50, p95, and p99 latency by route
- auth failure count
- customer-platform GUID rejection count
- merchant HMAC rejection count
- Merchant API launch success, error, and timeout count
- Merchant API deposit-eligibility success, error, and timeout count
- player token refresh success and failure count
- spin success, denial, and conflict count
- eligibility result distribution
- Customer Platform circuit-breaker open count
- SSE connection count and disconnect reason

### 13.4 Audit Events

Audit records must be retained for:

- session launch creation
- refresh-token rotation and revocation
- spin execution
- eligibility denial with upstream reason
- admin event changes
- rate-limit blocks on protected routes

---

## 14. Rate Limits and Security Controls

### 14.1 Recommended Rate Limits

| Route Group | Limit Key | Suggested Limit |
|---|---|---|
| Merchant session launch | per merchant | `60 req/min` |
| Player read APIs | per player access token | `120 req/min` |
| Spin execution | per player access token | `12 req/min` |
| Realtime SSE connects | per player access token | `6 concurrent streams` |
| Admin read APIs | per operator token | `120 req/min` |
| Merchant API public launch | per merchant | `60 req/min` |
| Merchant API eligibility | per service principal | `300 req/min` |

### 14.2 Required Security Controls

- bearer-token revocation list or session-state validation
- refresh-token rotation with reuse detection
- replay protection for merchant nonces
- per-route authorization checks
- IP allow-listing for merchant launch endpoints
- mutual TLS for service-to-service calls in production
- WAF or API gateway protection on public edges

---

## 15. Production Migration Notes

### 15.1 Concrete Customer Platform SOAP Rollout Plan

1. Provision sandbox Customer Platform SOAP credentials and confirm Merchant API egress IP allow-listing.
2. Configure Merchant API with `CUSTOMER_PLATFORM_SOAP_URL`, `CUSTOMER_PLATFORM_COMP_ACCESSKEY`, `CUSTOMER_PLATFORM_SITE_ID`, `CUSTOMER_PLATFORM_TIMEOUT_MS`, `CUSTOMER_PLATFORM_RECORD_DATE_TIMEZONE`, `CUSTOMER_PLATFORM_DEPOSIT_URL` as fallback only, and optional `CUSTOMER_PLATFORM_SOAP_ENABLED`.
3. Enable the live SOAP path in sandbox first while retaining fixture fallback for local/offline development.
4. Validate that Merchant API logs and metrics capture upstream `Code`, `ErrorMsg`, latency, timeout count, and `Status=false` rejection count.
5. Confirm the business rule for `RecordDate` against the Lucky Wheel event timezone and document any timezone exceptions per merchant/site.
6. Confirm that Customer Platform launch callers always send the preferred current-domain `depositUrl`; keep `CUSTOMER_PLATFORM_DEPOSIT_URL` only as an operational fallback.
7. After sandbox validation, remove or narrow fixture-mode usage in production deployments and enforce live SOAP credentials.

### 15.2 Remaining Follow-up Items

- add automated integration tests around SOAP success, timeout, SOAP fault, and `Status=false` cases
- decide whether Merchant API should cache positive eligibility snapshots or always re-fetch
- confirm the final production endpoint hostnames and transport hardening requirements

Compared with the current prototype runtime, the following changes are required before go-live:

1. Replace the fixed demo player with token-derived player identity.
2. Require bearer authentication on all player and admin endpoints.
3. Add merchant-signed `POST /api/v2/player/session/launch`.
4. Add refresh-token rotation for player sessions.
5. Replace DTO-only public responses with the formal success and error envelope.
6. Enforce `Idempotency-Key` on spin execution.
7. Protect Merchant API with service auth and mutual TLS.
8. Resolve deposit-related eligibility and Customer Platform deposit URL through Merchant API while keeping Lucky Wheel-owned event scheduling and used-spin counting.
9. Publish and validate OpenAPI specs in CI.
10. Add tracing, structured logs, metrics, audit events, and rate limits.
11. Standardize public launch on `X-Integration-Guid` plus Unix `timestamp`, resolve merchant identity from `MERCHANT_INTEGRATION_ID`, and keep public bootstrap eligibility limited to `initialEligibility.depositQualified`.
