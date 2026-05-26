# AWS Server Deployment

Target server:

- Host: `47.236.166.230`
- User: `root`
- OS: AlmaLinux 8.10 x64
- Remote app directory: `/opt/LuckyWheelLeaderboard`

The AWS deploy wrapper follows the existing GCP Docker Compose flow, but packages only the files needed to build the containers:

- `apps/`
- `docker/`
- `docker-compose.yml`
- root package and TypeScript config files

It does not archive this folder, so `ALYSG-Unix-TW20060318.pem` is never uploaded as application source.

## First-Time Deployment

Run from the project root. `-UseGcpJump` routes SSH/SCP through the existing GCP server because the AWS firewall allow-lists `34.81.237.79`.

```powershell
.\AWS_Server_Deployment\deploy-aws.ps1 -All -UseGcpJump -CreateRemoteBackup -NoPause
```

`-All` performs:

1. local prerequisite and SSH checks
2. Docker installation/start on AlmaLinux
3. source package upload
4. `.env.production` upload with public URLs rewritten to `https://ibetlucky.org`
5. `docker compose up -d --build`
6. local endpoint verification on the server

## Code-Only Redeploy

After the first deployment, avoid overwriting the remote environment file unless needed:

```powershell
.\AWS_Server_Deployment\deploy-aws.ps1 -Check -Upload -Start -Build -Verify -UseGcpJump -CreateRemoteBackup -NoPause
```

## Required Cloud Firewall / Security Group Ports

Allow inbound TCP:

- `22`: SSH from your deployment workstation IP
- `80`: HTTP redirect and ACME certificate renewal
- `443`: public game over HTTPS
- `4002`: public admin tool, protected by admin login
- `4003`: public Merchant API integration endpoint, if the customer platform calls it directly

Keep these restricted unless explicitly needed:

- `4000`: platform API, intended for internal Docker/network access
- `3000`: game container, intended for localhost reverse-proxy access

## Public URLs

After deployment:

- Game: `https://ibetlucky.org`
- Admin: `https://ibetlucky.org/admin`
- Merchant launch endpoint: `http://47.236.166.230:4003/merchant-api/integration/launch`
