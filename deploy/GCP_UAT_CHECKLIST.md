# GCP Merchant API UAT Checklist

## Server

- Ubuntu VM is reachable over SSH.
- Docker Engine is installed.
- Docker Compose plugin is installed.
- GCP firewall allows:
  - `3000/tcp` for game
  - `4003/tcp` for Merchant API
- GCP firewall does not publicly expose:
  - `4000/tcp` platform API
  - `4002/tcp` admin

## Environment

- `.env.production` exists on the VM at `/home/ehooraygm/LuckyWheelLeaderboard/.env.production`.
- `LUCKY_WHEEL_CLIENT_BASE_URL` points to `http://<GCP_PUBLIC_IP>:3000`.
- `UPLOAD_PUBLIC_BASE_URL` points to `http://<GCP_PUBLIC_IP>:3000/api/uploads`.
- `UPLOAD_ROOT=/uploads`.
- `MERCHANT_API_SERVICE_TOKEN` is set explicitly.
- `MERCHANT_INTEGRATION_ID` is set explicitly.
- `MERCHANT_INTEGRATION_GUID` is set explicitly.
- `LUCKY_WHEEL_PLATFORM_MERCHANT_SECRET` is set explicitly.
- `MERCHANT_INTEGRATION_ALLOWED_IPS` is configured for the customer platform test source IPs.
- `LUCKY_WHEEL_FILL_TEST_LEADERBOARD=false`.

If SOAP eligibility is part of UAT:

- `CUSTOMER_PLATFORM_SOAP_ENABLED=true`
- `CUSTOMER_PLATFORM_SOAP_URL` is valid from the VM
- `CUSTOMER_PLATFORM_COMP_ACCESSKEY` is valid
- `CUSTOMER_PLATFORM_SITE_ID` is valid
- `CUSTOMER_PLATFORM_DEPOSIT_URL` is valid

## Compose

- `docker compose --env-file .env.production ps` shows all services healthy or running.
- API volume persists `/data`.
- API volume persists `/uploads`.
- API is reachable on VM localhost: `http://127.0.0.1:4000/api/v2/config/localization`
- Merchant API health is reachable on VM localhost with bearer token:
  - `http://127.0.0.1:4003/merchant-api/v1/health`
- Game is reachable publicly:
  - `http://<GCP_PUBLIC_IP>:3000`
- Merchant API public launch endpoint is reachable:
  - `http://<GCP_PUBLIC_IP>:4003/merchant-api/integration/launch`

## Launch Flow

- Customer platform sends `POST /merchant-api/integration/launch`.
- Request includes `X-Integration-Guid`.
- Request body includes `playerId`, `initialEligibility`, and `timestamp`.
- Merchant API returns `success=true`.
- Returned `data.url` points at the public game URL on port `3000`.
- Opening the returned URL loads the Lucky Wheel frontend successfully.

## Player Correctness

- Launched player can fetch current event and player summary successfully.
- Eligibility is resolved for the launched player, not the demo player.
- Spin works for the launched player.
- Spin history is recorded for the launched player.
- Realtime updates after spin reflect the launched player session.

## Upload Persistence

- Admin can upload prize images.
- Uploaded images remain visible after `docker compose restart api`.
- Uploaded images remain visible after `docker compose up -d --build`.

## Optional SOAP Eligibility

- Merchant API can call the customer platform SOAP endpoint from the VM.
- Merchant API returns the expected deposit-qualified or deposit-required state.
- Lucky Wheel frontend reflects that server-side eligibility result.
