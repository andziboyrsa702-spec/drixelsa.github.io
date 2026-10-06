$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$privateDir = Join-Path $env:LOCALAPPDATA 'Drixel'
$privatePath = Join-Path $privateDir 'yoco-test-webhook.json'
$endpoint = 'https://drixel-api.drixelsa.workers.dev/api/payments/yoco/webhook'
Write-Host 'Yoco TEST setup. No real payments will be enabled.'
Write-Host 'Get the TEST secret key from Yoco > e-Commerce integrations > Checkout API.'
$secureKey = Read-Host 'Paste TEST secret key here (hidden)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
  $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer).Trim()
  if (-not $key.StartsWith('sk_test_')) { throw 'Use a Yoco TEST secret key beginning sk_test_.' }
  $headers = @{ Authorization = "Bearer $key" }
  try { $existing = Invoke-RestMethod -Uri 'https://payments.yoco.com/api/webhooks' -Headers $headers -Method Get } catch { throw 'Yoco could not list webhooks. Check the test secret key and account access.' }
  $match = @($existing.subscriptions | Where-Object { $_.url -eq $endpoint -and $_.mode -eq 'test' })
  if ($match.Count -gt 0) {
    $saved = $null
    if (Test-Path -LiteralPath $privatePath) { $saved = Get-Content -LiteralPath $privatePath -Raw | ConvertFrom-Json }
    if ($saved -and $saved.id -eq $match[0].id) {
      $secureWebhook = ConvertTo-SecureString $saved.encryptedSecret
      Write-Host 'Reusing the existing webhook signing secret saved securely for this Windows user.'
    } else {
    Write-Host 'A test webhook already exists. Enter its saved signing secret; do not create a duplicate.'
    $secureWebhook = Read-Host 'Existing webhook signing secret (hidden)' -AsSecureString
    }
    $webhookPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureWebhook)
    try { $webhookSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($webhookPointer).Trim() } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($webhookPointer) }
  } else {
    $body = @{ name = 'Drixel checkout test'; url = $endpoint } | ConvertTo-Json -Compress
    try { $registration = Invoke-RestMethod -Uri 'https://payments.yoco.com/api/webhooks' -Headers $headers -Method Post -ContentType 'application/json' -Body $body } catch { throw 'Yoco webhook registration failed. Check the account webhook limit and test API access.' }
    if ($registration.mode -ne 'test') { throw 'Unexpected webhook mode. Test setup stopped.' }
    $webhookSecret = $registration.secret
  }
  if ($registration) {
    New-Item -ItemType Directory -Force -Path $privateDir | Out-Null
    $encrypted = ConvertFrom-SecureString (ConvertTo-SecureString $webhookSecret -AsPlainText -Force)
    @{ id = $registration.id; encryptedSecret = $encrypted } | ConvertTo-Json | Set-Content -LiteralPath $privatePath
    Write-Host 'Webhook signing secret saved encrypted outside the repository for this Windows user.'
  }
  if (-not $webhookSecret.StartsWith('whsec_')) { throw 'Invalid webhook signing secret.' }
  $key | npx wrangler secret put YOCO_SECRET_KEY
  if ($LASTEXITCODE -ne 0) { throw 'Yoco key upload failed.' }
  $webhookSecret | npx wrangler secret put YOCO_WEBHOOK_SECRET
  if ($LASTEXITCODE -ne 0) { throw 'Webhook secret upload failed. Keep the signing secret securely for retry.' }
  $configPath = Join-Path $PSScriptRoot 'wrangler.jsonc'
  $config = Get-Content -LiteralPath $configPath -Raw
  $config = $config -replace '"CARD_PAYMENTS_ENABLED"\s*:\s*"false"', '"CARD_PAYMENTS_ENABLED": "true"'
  $config = $config -replace '"YOCO_MODE"\s*:\s*"(?:test|live)"', '"YOCO_MODE": "test"'
  [IO.File]::WriteAllText($configPath, $config, (New-Object Text.UTF8Encoding($false)))
  Write-Host 'Test keys configured. Run npm --prefix worker run deploy from the project folder.'
  Write-Host 'Complete a Yoco TEST payment and verify that the order says test_paid. Do not dispatch test orders.'
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  $key = $null; $headers = $null; $webhookSecret = $null; $registration = $null
}
