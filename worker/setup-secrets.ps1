$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
Write-Host 'Select your private Firebase service-account JSON. Its contents will not be printed.'
$servicePath = Read-Host 'Full path to JSON file (outside the repository)'
$servicePath = $servicePath.Trim('"')
$service = Get-Content -LiteralPath $servicePath -Raw | ConvertFrom-Json
if ($service.project_id -ne 'drixel-sa') { throw 'The service account must belong to drixel-sa.' }
# Wrangler reads this secret from stdin; the command contains no key material.
$service | ConvertTo-Json -Compress -Depth 10 | npx wrangler secret put FIREBASE_SERVICE_ACCOUNT
if ($LASTEXITCODE -ne 0) { throw 'Firebase secret upload failed.' }
foreach ($name in @('RESEND_API_KEY','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET')) {
  Write-Host "Enter $name into the Wrangler prompt. Do not paste it into chat."
  npx wrangler secret put $name
  if ($LASTEXITCODE -ne 0) { throw "Secret upload failed: $name" }
}
Write-Host 'Deploy the Worker next, then configure PUBLIC_SITE_URL and the Resend webhook.'
