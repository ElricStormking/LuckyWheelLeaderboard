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

## First-Time Server Setup

1. Copy `.env.production.example` to `.env.production`.
2. Edit `.env.production` with the real public game URL, bearer token, merchant secrets, and Customer Platform settings.
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
- `05_verify_services.ps1` checks game, admin, API, and Merchant API endpoints.
- If GCP firewall is not open, external browser access to public IP ports will fail even if service is healthy on VM.
