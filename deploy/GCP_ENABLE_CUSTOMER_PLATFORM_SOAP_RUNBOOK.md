# GCP Customer Platform SOAP Enablement Runbook

This runbook enables the real Customer Platform SOAP/WCF call for `LuckyWheel_Deposit_isEligible` on the current GCP UAT VM.

Current server:

- host: `34.81.237.79`
- ssh user: `ehooraygm`
- remote app dir: `/home/ehooraygm/LuckyWheelLeaderboard`
- env file: `/home/ehooraygm/LuckyWheelLeaderboard/.env.production`
- compose service: `merchant-api`

Current known state before change:

- `CUSTOMER_PLATFORM_SOAP_ENABLED=false`
- `CUSTOMER_PLATFORM_SOAP_URL` is not configured
- `CUSTOMER_PLATFORM_COMP_ACCESSKEY` is not configured
- Merchant API eligibility currently returns `decisionId` values that start with `cp_fixture_`

## 1. Preconditions

Before changing the server, confirm all of these are ready:

- Customer Platform has provided the real `iBetService.svc` URL.
- Customer Platform has provided the real `CompAccesskey`.
- Customer Platform has confirmed the correct `SiteID`.
- Customer Platform has allow-listed Merchant API outbound IP `34.81.237.79` for the SOAP/WCF call.
- You know the real Customer Platform deposit page URL to use for `CUSTOMER_PLATFORM_DEPOSIT_URL`.

## 2. Open SSH Session

From local Windows PowerShell:

```powershell
$Key = "D:\Project_Top30_Luckywheel\GCP_Server_SSHKey\gcp_ubuntu_rsa"
$HostName = "ehooraygm@34.81.237.79"
ssh -i $Key -o StrictHostKeyChecking=no $HostName
```

## 3. Back Up The Remote Env File

On the VM:

```bash
cd /home/ehooraygm/LuckyWheelLeaderboard
cp .env.production ".env.production.bak.$(date +%Y%m%d-%H%M%S)"
```

## 4. Update `.env.production`

Edit the file on the VM:

```bash
cd /home/ehooraygm/LuckyWheelLeaderboard
nano .env.production
```

Set or update these keys:

```dotenv
CUSTOMER_PLATFORM_SOAP_ENABLED=true
CUSTOMER_PLATFORM_SOAP_URL=http://<customer-host>/iBetService.svc
CUSTOMER_PLATFORM_COMP_ACCESSKEY=<real-comp-access-key>
CUSTOMER_PLATFORM_SITE_ID=A
CUSTOMER_PLATFORM_DEPOSIT_URL=https://<customer-deposit-page>
CUSTOMER_PLATFORM_RECORD_DATE_TIMEZONE=Asia/Taipei
CUSTOMER_PLATFORM_TIMEOUT_MS=5000
```

Rules while editing:

- keep only one active line for each `CUSTOMER_PLATFORM_*` key
- remove or comment out old duplicate lines
- do not change `MERCHANT_API_SERVICE_TOKEN`
- do not change `MERCHANT_INTEGRATION_GUID` unless you are intentionally rotating it

## 5. Sanity Check The Saved Config

Still on the VM:

```bash
cd /home/ehooraygm/LuckyWheelLeaderboard
python3 - <<'PY'
from pathlib import Path
keys = [
    "CUSTOMER_PLATFORM_SOAP_ENABLED",
    "CUSTOMER_PLATFORM_SOAP_URL",
    "CUSTOMER_PLATFORM_COMP_ACCESSKEY",
    "CUSTOMER_PLATFORM_SITE_ID",
    "CUSTOMER_PLATFORM_DEPOSIT_URL",
    "CUSTOMER_PLATFORM_RECORD_DATE_TIMEZONE",
    "CUSTOMER_PLATFORM_TIMEOUT_MS",
]
vals = {}
for line in Path(".env.production").read_text().splitlines():
    if "=" in line and not line.lstrip().startswith("#"):
        k, v = line.split("=", 1)
        vals[k] = v
for key in keys:
    value = vals.get(key, "")
    if key == "CUSTOMER_PLATFORM_COMP_ACCESSKEY":
        print(f"{key}=<set>" if value else f"{key}=<missing>")
    else:
        print(f"{key}={value or '<missing>'}")
PY
```

Expected result:

- `CUSTOMER_PLATFORM_SOAP_ENABLED=true`
- `CUSTOMER_PLATFORM_SOAP_URL` is present
- `CUSTOMER_PLATFORM_COMP_ACCESSKEY=<set>`
- `CUSTOMER_PLATFORM_SITE_ID` is correct

## 6. Recreate Only The Merchant API Container

On the VM:

```bash
cd /home/ehooraygm/LuckyWheelLeaderboard
sudo docker compose --env-file .env.production -f docker-compose.yml up -d --force-recreate merchant-api
sudo docker compose --env-file .env.production -f docker-compose.yml ps merchant-api
```

Optional log check right after restart:

```bash
cd /home/ehooraygm/LuckyWheelLeaderboard
sudo docker compose --env-file .env.production -f docker-compose.yml logs --tail=100 merchant-api
```

## 7. Verify Merchant API Health

On the VM:

```bash
cd /home/ehooraygm/LuckyWheelLeaderboard
MERCHANT_TOKEN=$(grep '^MERCHANT_API_SERVICE_TOKEN=' .env.production | tail -n 1 | cut -d= -f2- | tr -d '\r')
curl -s -H "Authorization: Bearer $MERCHANT_TOKEN" http://127.0.0.1:4003/merchant-api/v1/health
```

Expected result:

```json
{"service":"merchant-api","status":"online","upstreamSource":"customer_platform","updatedAt":"..."}
```

## 8. Verify The Real SOAP Eligibility Path

Get the current live event id:

```bash
cd /home/ehooraygm/LuckyWheelLeaderboard
CURRENT_EVENT_ID=$(curl -s http://127.0.0.1:4000/api/v2/events/current | python3 -c "import sys, json; print(json.load(sys.stdin)['event']['id'])")
echo "$CURRENT_EVENT_ID"
```

Call the internal Merchant API eligibility endpoint:

```bash
cd /home/ehooraygm/LuckyWheelLeaderboard
MERCHANT_TOKEN=$(grep '^MERCHANT_API_SERVICE_TOKEN=' .env.production | tail -n 1 | cut -d= -f2- | tr -d '\r')
PLAYER_ID="merchant-player-789"
CURRENT_EVENT_ID=$(curl -s http://127.0.0.1:4000/api/v2/events/current | python3 -c "import sys, json; print(json.load(sys.stdin)['event']['id'])")
curl -s -H "Authorization: Bearer $MERCHANT_TOKEN" "http://127.0.0.1:4003/merchant-api/v1/lucky-wheel/players/${PLAYER_ID}/events/${CURRENT_EVENT_ID}/eligibility"
```

Pass criteria:

- response succeeds
- `decisionId` starts with `cp_live_`
- not `cp_fixture_`
- `depositQualified` matches the Customer Platform SOAP decision
- if `depositQualified=false`, a `depositUrl` is returned

## 9. Optional Public Launch Verification

Run this only from an IP that is allowed by `MERCHANT_INTEGRATION_ALLOWED_IPS`, or temporarily add your test IP first.

PowerShell example:

```powershell
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$headers = @{
  "X-Integration-Guid" = "<value from remote .env.production>"
}
$body = @{
  playerId = "merchant-player-789"
  initialEligibility = @{
    depositQualified = $true
  }
  timestamp = $timestamp
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
  -Method Post `
  -Uri "http://34.81.237.79:4003/merchant-api/integration/launch" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $body
```

Important:

- use the actual deployed `X-Integration-Guid` from remote `.env.production`
- do not assume the sample GUID in the public documentation matches the server
- `initialEligibility` is bootstrap data only; the real gameplay decision is still the later server-to-server SOAP check

## 10. Failure Patterns

If the eligibility call still returns `cp_fixture_`:

- `merchant-api` was restarted before the env file was saved correctly
- duplicate env lines exist and the wrong value is still winning
- the container was not recreated after the env change

If the eligibility call returns `503`:

- SOAP URL is wrong
- Customer Platform did not allow-list `34.81.237.79`
- `CompAccesskey` is wrong
- upstream SOAP service timed out

If the health endpoint works but eligibility fails:

- Merchant API is online, but the upstream SOAP dependency is failing
- inspect logs:

```bash
cd /home/ehooraygm/LuckyWheelLeaderboard
sudo docker compose --env-file .env.production -f docker-compose.yml logs --tail=200 merchant-api
```

## 11. Quick Success Checklist

- remote `.env.production` has real SOAP settings
- `sudo docker compose ... up -d --force-recreate merchant-api` completed
- `GET /merchant-api/v1/health` works
- `GET /merchant-api/v1/lucky-wheel/players/<playerId>/events/<eventId>/eligibility` returns `cp_live_`
- public launch still works for the configured integration GUID
