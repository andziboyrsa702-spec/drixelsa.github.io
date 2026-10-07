$ErrorActionPreference = "Stop"
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    $configPath = Join-Path $PSScriptRoot "wrangler.jsonc"
    $config = [IO.File]::ReadAllText($configPath)
    if ($config -notmatch '"crons"\s*:\s*\[\s*"\*/5 \* \* \* \*"\s*\]' -and $config -notmatch '"crons"\s*:\s*\[\s*"\* \* \* \* \*"\s*\]') { throw "Unexpected cron configuration. Check wrangler.jsonc before changing it." }
    $config = $config -replace '("crons"\s*:\s*\[\s*")\*/5 \* \* \* \*("\s*\])', '${1}* * * * *${2}'
    [IO.File]::WriteAllText($configPath, $config, (New-Object System.Text.UTF8Encoding($false)))
    & npx firebase deploy --only "firestore:rules,firestore:indexes" --project drixel-sa
    if ($LASTEXITCODE -ne 0) { throw "Firestore rules/index deployment failed." }
    Write-Host "Wait for campaign_jobs status/dueAt index to show Enabled in Firebase > Firestore > Indexes."
    Push-Location $PSScriptRoot
    try {
    & npm ci
    if ($LASTEXITCODE -ne 0) { throw "Dependency installation failed." }
    & npm run deploy
    if ($LASTEXITCODE -ne 0) { throw "Email queue deployment failed." }
    Write-Host "Both email queues now run every minute. Existing payment settings and secrets were preserved."
    Write-Host "Queued does not mean delivered. Check Resend Emails for Delivered, Bounced, Failed or Delayed."
    } finally { Pop-Location }
} finally { Pop-Location }
