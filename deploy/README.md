# Deployment Scripts (Local Execution)

All scripts are run on local Windows PowerShell and connect to the server via SSH.

## Execution Order

1. `.\deploy\01_check_prerequisites.ps1`
2. `.\deploy\02_service_stop.ps1` (optional, maintenance mode)
3. `.\deploy\03_package_and_upload.ps1`
4. `.\deploy\04_service_start.ps1`
5. `.\deploy\05_verify_services.ps1`

## Common Usage

```powershell
.\deploy\01_check_prerequisites.ps1
.\deploy\02_service_stop.ps1
.\deploy\03_package_and_upload.ps1 -CreateRemoteBackup
.\deploy\04_service_start.ps1 -Build
.\deploy\05_verify_services.ps1
```

## Prisma Studio

```powershell
.\deploy\open-prisma-studio.ps1
```

This opens an SSH tunnel to the GCP VM and runs Prisma Studio against the live SQLite database on `127.0.0.1` only.

## First-Time Server Setup

1. Copy `.env.production.example` to `.env.production`.
2. Edit `.env.production` with the real public game URL, bearer token, merchant secrets, upload URLs, and Customer Platform settings.
3. Upload `.env.production` to the remote app directory:
   - `/home/ehooraygm/LuckyWheelLeaderboard/.env.production`

The deploy upload script intentionally does not upload your local `.env.production` or the SSH key folder.
If `.env.production` already exists on the server, future deploys preserve it automatically.

## Right-Click Safe Execution

If PowerShell windows still close immediately on your machine, run the `.cmd` launchers instead:

- `01_check_prerequisites.cmd`
- `02_service_stop.cmd`
- `03_package_and_upload.cmd`
- `04_service_start.cmd`
- `05_verify_services.cmd`

Scripts now pause by default (good for right-click "Run with PowerShell").
If you do not want to pause, add `-NoPause`:

```powershell
.\01_check_prerequisites.ps1 -NoPause
.\02_service_stop.ps1 -NoPause
```

## Notes

- SSH key path is configured in `.\deploy\deploy.config.ps1`.
- `01_check_prerequisites.ps1` auto-fixes SSH key ACL when "bad permissions" is detected on a new machine.
- The Docker Compose stack is rooted at `.\docker-compose.yml`.
- The API uses a persistent Docker volume for SQLite data at `/data/dev.db`.
- The API now also uses a persistent Docker volume for uploaded prize images at `/uploads`.
- `05_verify_services.ps1` checks game, admin, API, and Merchant API endpoints.
- If GCP firewall is not open, external browser access to public IP ports will fail even if service is healthy on VM.

## GCP UAT Port Model

Recommended for HTTP public-IP UAT:

- public: `3000` game
- public: `4003` Merchant API
- restricted/internal only: `4000` platform API
- restricted/internal only: `4002` admin

The current compose file binds API and admin to `127.0.0.1` on the VM for safer test exposure.
Use SSH tunneling when you need remote access to admin or direct API debugging.

## Required `.env.production` Values For UAT

At minimum set:

- `LUCKY_WHEEL_CLIENT_BASE_URL=http://<GCP_PUBLIC_IP>:3000`
- `UPLOAD_PUBLIC_BASE_URL=http://<GCP_PUBLIC_IP>:3000/api/uploads`
- `UPLOAD_ROOT=/uploads`
- `MERCHANT_API_SERVICE_TOKEN=<long-random-token>`
- `MERCHANT_INTEGRATION_ID=<customer-merchant-id>`
- `MERCHANT_INTEGRATION_GUID=<shared-guid>`
- `LUCKY_WHEEL_PLATFORM_MERCHANT_SECRET=<shared-signing-secret>`
- `MERCHANT_INTEGRATION_ALLOWED_IPS=<customer-platform-egress-ip-or-*>`
- `LUCKY_WHEEL_FILL_TEST_LEADERBOARD=false`

If Customer Platform SOAP/WCF eligibility should be exercised in UAT, also set:

- `CUSTOMER_PLATFORM_SOAP_ENABLED=true`
- `CUSTOMER_PLATFORM_SOAP_URL=<real-customer-platform-wsdl-endpoint>`
- `CUSTOMER_PLATFORM_COMP_ACCESSKEY=<real-access-key>`
- `CUSTOMER_PLATFORM_SITE_ID=<real-site-id>`
- `CUSTOMER_PLATFORM_DEPOSIT_URL=<real-deposit-url>`

## Persistence

For Linux production-like UAT on the GCP Ubuntu VM:

- keep `/data` and `/uploads` on persistent Docker volumes
- uploaded admin images must survive `docker compose up -d --build`
- do not point `UPLOAD_ROOT` inside the app source tree on the server

## Extra References

- `deploy/GCP_UAT_CHECKLIST.md`
- `deploy/CUSTOMER_PLATFORM_UAT_HANDOFF.md`
