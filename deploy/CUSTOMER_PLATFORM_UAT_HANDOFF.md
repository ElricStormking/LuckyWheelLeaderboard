# Customer Platform Merchant API UAT Handoff

## Base URLs

- Game URL base: `http://<GCP_PUBLIC_IP>:3000`
- Merchant API base: `http://<GCP_PUBLIC_IP>:4003/merchant-api`

## Network Allowlist Clarification

Use these values differently:

- inbound launch endpoint that Customer Platform calls:
  - `http://34.81.237.79:4003/merchant-api/integration/launch`
- outbound Merchant API source IP that Customer Platform should allow-list for deposit eligibility SOAP/WCF calls:
  - `34.81.237.79`

Do not allow-list `34.81.237.79:4003` for the SOAP/WCF server-to-server call. The allow-list entry should be the source IP only.

## Endpoint To Call

`POST /integration/launch`

Full example:

`http://<GCP_PUBLIC_IP>:4003/merchant-api/integration/launch`

## Required Header

- `X-Integration-Guid: <shared-guid>`

## Request Body

```json
{
  "playerId": "merchant-player-789",
  "initialEligibility": {
    "depositQualified": true
  },
  "timestamp": 1761216000
}
```

## Notes

- `timestamp` must be current Unix time in seconds.
- `playerId` must be the customer-platform player identifier to test.
- `initialEligibility` is bootstrap launch data only. The game does not treat it as the final gameplay decision.
- The returned `data.url` should be treated as an opaque launch URL and opened directly.

## Expected Success Response Shape

```json
{
  "success": true,
  "errorCode": 0,
  "errorMessage": "",
  "data": {
    "url": "http://<GCP_PUBLIC_IP>:3000/?...",
    "sessionId": "lw_sess_xxx",
    "expiresAt": "2026-03-23T10:15:00.000Z"
  }
}
```

## Common Failure Cases

- `1001`: invalid or missing `X-Integration-Guid`
- `1002`: invalid or expired timestamp
- `1004`: merchant inactive
- `1005`: caller IP not allowed
- `4000`: invalid request body
- `7001`: Lucky Wheel platform launch failed

## Test Sequence

1. Call Merchant API launch.
2. Confirm `success=true`.
3. Open the returned `data.url` in a browser.
4. Verify the player can enter the game.
5. Verify Lucky Wheel eligibility and spin flow work for that launched player.

## Customer Platform SOAP/WCF Note

If deposit-eligibility UAT is enabled, Merchant API will call the customer platform SOAP/WCF service from the server side. The browser does not call that service directly.

For the current GCP UAT environment:

- launch traffic comes into Merchant API on `34.81.237.79:4003`
- deposit-eligibility SOAP/WCF allow-listing should use outbound source IP `34.81.237.79`

## Reference Docs In Repo

- `LuckyWheel_API_Integration_Documentation_for_Public.md`
- `openapi/merchant-api.openapi.json`
