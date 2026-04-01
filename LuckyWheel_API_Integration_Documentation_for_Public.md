# Lucky Wheel Public Integration API Documentation

**Version:** 1.9  
**Last Updated:** April 1, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Customer Platform Onboarding](#customer-platform-onboarding)
3. [Base URL](#base-url)
4. [Authentication](#authentication)
5. [Common Response Format](#common-response-format)
6. [Error Codes](#error-codes)
7. [Public API Endpoints](#public-api-endpoints)
   - [Launch Game](#1-launch-game)
8. [Deposit Eligibility Resolution](#deposit-eligibility-resolution)
9. [Launch Flow](#launch-flow)
10. [Data Types](#data-types)

---

## Overview

This document describes the customer-platform-facing API contract for integrating the Lucky Wheel game.

The public integration supports:

- launching Lucky Wheel for a player
- returning a Lucky Wheel game URL

Deposit eligibility for gameplay is resolved server-to-server after launch. Merchant API calls the Customer Platform SOAP/WCF service on behalf of Lucky Wheel Platform; player browsers never call that SOAP service directly.



All public integration endpoints use **HTTP POST** and exchange **JSON** payloads.

---

## Customer Platform Onboarding

### Information Required from Customer Platform

- source IP whitelist for public integration requests
- target localization rollout requirements
- merchant operational contact
- production and sandbox calling environments
- production and sandbox `iBetService.svc` SOAP endpoint URLs for deposit checks
- `CompAccesskey`, `SiteID`, and required Merchant API egress IP allow-listing for the server-to-server deposit-eligibility call

### Information Returned by Lucky Wheel Provider

- shared `X-Integration-Guid` credential
- production and sandbox Merchant API base URLs
- allowed request timestamp tolerance
- Merchant API egress IP information for Customer Platform SOAP allow-listing when needed

---

## Base URL

| Environment | Base URL |
|------------|----------|
| Production | `https://merchant-api.luckywheel.example.com/merchant-api` |
| Sandbox | `https://sandbox-merchant-api.luckywheel.example.com/merchant-api` |

All public integration endpoints are prefixed with `/integration/`.

---

## Authentication

Every public Lucky Wheel API request must include:

1. header `X-Integration-Guid`
2. body field `timestamp`
3. a caller IP that is allowlisted for the merchant

`X-Integration-Guid` is the shared customer-platform credential assigned during onboarding. `timestamp` is used for freshness validation only.

### Timestamp Rules

- `timestamp` uses Unix time in seconds
- requests should be sent immediately after creation
- future timestamps are rejected
- requests outside the allowed time window are rejected with error `1002`

Use a tolerance target of **300 seconds** unless a different value is provided during onboarding.

---

## Common Response Format

All public Lucky Wheel API responses use this structure:

```json
{
  "success": true,
  "errorCode": 0,
  "errorMessage": "",
  "data": {}
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | `true` on success, `false` on failure |
| `errorCode` | integer | `0` on success, otherwise a business error code |
| `errorMessage` | string | Empty on success, otherwise a message describing the failure |
| `data` | object/null | Response payload on success, otherwise `null` |

Public integration endpoints return HTTP `200` for both success and business errors. Always check `success` and `errorCode`.

---

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| `0` | SUCCESS | Request completed successfully |
| `1001` | INVALID_INTEGRATION_GUID | Integration GUID is missing or invalid |
| `1002` | TIMESTAMP_EXPIRED | Timestamp is invalid or outside the allowed time window |
| `1004` | MERCHANT_INACTIVE | Merchant is inactive |
| `1005` | IP_NOT_ALLOWED | Caller IP is not allowlisted |
| `4000` | INVALID_REQUEST | Required request fields are missing or invalid |
| `7001` | PLATFORM_LAUNCH_FAILED | Lucky Wheel platform launch failed |
| `9999` | INTERNAL_ERROR | Internal server error |

---

## Public API Endpoints

### 1. Launch Game

Launches Lucky Wheel for a player and returns the game URL.

**Endpoint:** `POST /integration/launch`

#### Request

Required header:

| Header | Required | Description |
|--------|----------|-------------|
| `X-Integration-Guid` | Yes | Shared GUID credential assigned during onboarding |

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `playerId` | string | Yes | Customer-platform player identifier |
| `initialEligibility` | object | Yes | Customer-platform bootstrap eligibility snapshot used only for launch-time UX |
| `timestamp` | integer | Yes | Unix timestamp in seconds used for freshness validation |

Lucky Wheel also does not require a separate player display name from Customer Platform. The game uses `playerId` as the player label for this integration flow.

#### Authentication Notes

`initialEligibility` is not part of authentication. It is customer-platform bootstrap data only.

#### Header Example

```text
X-Integration-Guid: 11111111-1111-1111-1111-111111111111
```

#### Request Example

```json
{
  "playerId": "merchant-player-789",
  "initialEligibility": {
    "depositQualified": true
  },
  "timestamp": 1761216000
}
```

#### Response

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

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Lucky Wheel launch URL |
| `sessionId` | string | Generated Lucky Wheel session ID |
| `expiresAt` | string | Launch session expiry time in ISO 8601 format |

### Eligibility Behavior

Lucky Wheel accepts customer-platform `initialEligibility` during launch as bootstrap data only.

- `initialEligibility` is not authoritative for gameplay and is not generated by Lucky Wheel
- the Lucky Wheel frontend loads eligibility from Lucky Wheel Platform after the game opens
- Lucky Wheel Platform derives the daily-spin portion of eligibility from its own gameplay state and the player's used spins
- Lucky Wheel Platform also calls Merchant API, which resolves Customer Platform deposit eligibility through the Customer Platform SOAP/WCF operation `LuckyWheel_Deposit_isEligible`
- Merchant API currently uses configured `SiteID`, `CompAccesskey`, and the Lucky Wheel event-day date to call Customer Platform server-to-server
- the current live WSDL exposes the eligibility decision but does not currently publish a deposit URL, so Merchant API uses the configured Customer Platform deposit page URL when the player must deposit
- if Customer Platform says the player has not met the deposit rule, Lucky Wheel returns a `GO_TO_DEPOSIT` state and the Customer Platform deposit URL
- Lucky Wheel re-checks both daily-spin usage and deposit eligibility again before processing a spin

---

## Deposit Eligibility Resolution

Lucky Wheel uses a server-to-server deposit eligibility check during gameplay.

### How It Works

1. Customer Platform launches the game through `POST /integration/launch`.
2. Lucky Wheel frontend loads the latest player state from Lucky Wheel Platform after launch.
3. Lucky Wheel Platform calls Merchant API to resolve deposit eligibility for the current player and event.
4. Merchant API calls the Customer Platform SOAP/WCF service `LuckyWheel_Deposit_isEligible`.
5. Customer Platform returns the deposit-rule decision.
6. Merchant API returns the normalized eligibility result to Lucky Wheel Platform.
7. Lucky Wheel Platform combines that deposit decision with its own event and daily-spin checks before allowing spin.

### Important Notes

- this Customer Platform call is server-to-server only
- player browsers do not call the Customer Platform SOAP/WCF API directly
- launch-time `initialEligibility` is bootstrap data only and is not the authoritative gameplay decision
- Lucky Wheel re-checks deposit eligibility again before processing a spin request

---

## Launch Flow

The public integration flow is shown below.

![Lucky Wheel Public API Integration Diagram](LuckyWheel_Dataflow_Diagram_Public.png)

### Public Flow Summary

1. Customer Platform calls `POST /integration/launch` with `playerId`, `initialEligibility`, `timestamp`, and the required `X-Integration-Guid` header
2. Merchant API creates a Lucky Wheel session
3. Merchant API returns the Lucky Wheel game URL
4. Customer Platform opens the Lucky Wheel frontend and may use its own `initialEligibility` as launch-time bootstrap data
5. Lucky Wheel frontend loads the latest game state from Lucky Wheel Platform
6. Lucky Wheel Platform combines its own gameplay checks with Customer Platform deposit eligibility from Merchant API before allowing spin
7. Merchant API resolves that deposit eligibility by calling the Customer Platform SOAP/WCF service, not by trusting the bootstrap `initialEligibility`


---

## Data Types

### Initial Eligibility Bootstrap

Customer Platform sends `initialEligibility` on launch as a bootstrap object. The current recommended shape is:

| Field | Type | Description |
|-------|------|-------------|
| `depositQualified` | boolean | Customer Platform's latest deposit-rule decision at launch time |

No additional bootstrap fields are required. `initialEligibility` is not part of launch authentication and is not authoritative for Lucky Wheel gameplay decisions.
