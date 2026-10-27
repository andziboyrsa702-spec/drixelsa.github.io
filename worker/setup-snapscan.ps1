$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
Write-Host 'Use keys for your SnapScan MERCHANT account, not a personal SnapScan login.'
foreach ($name in @('SNAPSCAN_API_KEY','SNAPSCAN_WEBHOOK_AUTH_KEY')) {
  Write-Host "Enter $name in the hidden Wrangler prompt. Do not paste it into chat."
  npx wrangler secret put $name
  if ($LASTEXITCODE -ne 0) { throw "Secret upload failed: $name" }
}
Write-Host 'Ask SnapScan merchant support to configure your authenticated webhook at:'
Write-Host 'https://drixel-api.drixelsa.workers.dev/api/payments/snapscan/webhook'
Write-Host 'Save the SnapCode in Admin > Settings > Store, then enable SnapScan.'
Write-Host 'Deploy from the project folder: npm --prefix worker run deploy'
Write-Host 'Keep SnapScan disabled until the webhook is configured and a controlled payment has been verified.'
