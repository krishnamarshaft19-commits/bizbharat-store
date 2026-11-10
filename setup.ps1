# ============================================================
# BIZBHARAT - Supabase Setup Script
# ============================================================
# Run from project root:  powershell -ExecutionPolicy Bypass -File setup.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$PROJECT_REF = "dxitvxmwnnoxrlbacnjv"

Write-Host ""
Write-Host "BIZBHARAT - Supabase Setup" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""

# --- Step 1: Supabase Login ---
Write-Host "[Step 1] Supabase Login" -ForegroundColor Yellow
Write-Host "  Go to: https://supabase.com/dashboard/account/tokens" -ForegroundColor Gray
Write-Host "  Generate a new token, copy it, and paste it below." -ForegroundColor Gray
Write-Host ""

$token = Read-Host -Prompt "Paste your Supabase Access Token"

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "ERROR: No token provided. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host "  Logging in..." -ForegroundColor Gray
supabase login --token $token 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Login failed. Check your token." -ForegroundColor Red
    exit 1
}

Write-Host "  OK - Logged in." -ForegroundColor Green
Write-Host ""

# --- Step 2: Link project ---
Write-Host "[Step 2] Linking project $PROJECT_REF" -ForegroundColor Yellow

supabase link --project-ref $PROJECT_REF 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to link project." -ForegroundColor Red
    exit 1
}

Write-Host "  OK - Project linked." -ForegroundColor Green
Write-Host ""

# --- Step 3: Database migration ---
Write-Host "[Step 3] Running database migration" -ForegroundColor Yellow

supabase db push 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  db push failed, trying direct execution..." -ForegroundColor Yellow
    $sqlPath = Join-Path $PSScriptRoot "supabase\migrations\001_create_orders_table.sql"
    $sqlContent = Get-Content -Path $sqlPath -Raw -Encoding UTF8
    supabase db execute --sql $sqlContent 2>&1
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK - Database migration complete." -ForegroundColor Green
} else {
    Write-Host "  WARNING: Migration may have failed. Run the SQL manually in Supabase Dashboard." -ForegroundColor Yellow
}
Write-Host ""

# --- Step 4: Set SITE_URL secret ---
Write-Host "[Step 4] Setting SITE_URL secret" -ForegroundColor Yellow
$siteUrl = Read-Host -Prompt "Enter your site URL (e.g. https://yoursite.com or http://localhost:3000)"

if ([string]::IsNullOrWhiteSpace($siteUrl)) {
    $siteUrl = "http://localhost:3000"
    Write-Host "  Using default: $siteUrl" -ForegroundColor Gray
}

supabase secrets set "SITE_URL=$siteUrl" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK - SITE_URL set." -ForegroundColor Green
} else {
    Write-Host "  WARNING: Failed to set SITE_URL." -ForegroundColor Yellow
}
Write-Host ""

# --- Step 5: Deploy Edge Functions ---
Write-Host "[Step 5] Deploy Edge Functions" -ForegroundColor Yellow
Write-Host ""
Write-Host "  The following functions will be deployed:" -ForegroundColor Gray
Write-Host "    - create-order" -ForegroundColor Gray
Write-Host "    - payment-callback" -ForegroundColor Gray
Write-Host "    - download-pdf" -ForegroundColor Gray
Write-Host "    - verify-order" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host -Prompt "Deploy now? (y/n)"

if ($confirm -eq "y" -or $confirm -eq "Y") {
    $functions = @("create-order", "payment-callback", "download-pdf", "verify-order")
    foreach ($fn in $functions) {
        Write-Host "  Deploying $fn ..." -ForegroundColor Gray -NoNewline
        supabase functions deploy $fn --no-verify-jwt 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host " OK" -ForegroundColor Green
        } else {
            Write-Host " FAILED" -ForegroundColor Red
        }
    }
} else {
    Write-Host "  Skipped. Deploy later with:" -ForegroundColor Gray
    Write-Host "    supabase functions deploy create-order --no-verify-jwt" -ForegroundColor Gray
    Write-Host "    supabase functions deploy payment-callback --no-verify-jwt" -ForegroundColor Gray
    Write-Host "    supabase functions deploy download-pdf --no-verify-jwt" -ForegroundColor Gray
    Write-Host "    supabase functions deploy verify-order --no-verify-jwt" -ForegroundColor Gray
}
Write-Host ""

# --- Step 6: Storage buckets reminder ---
Write-Host "[Step 6] Storage Buckets (Manual)" -ForegroundColor Yellow
Write-Host "  Create these in Supabase Dashboard -> Storage:" -ForegroundColor Gray
Write-Host "    1. Bucket 'pdfs'   -> PRIVATE" -ForegroundColor Gray
Write-Host "    2. Bucket 'covers' -> PUBLIC" -ForegroundColor Gray
Write-Host "  URL: https://supabase.com/dashboard/project/$PROJECT_REF/storage/buckets" -ForegroundColor Gray
Write-Host ""

# --- Done ---
Write-Host "==========================" -ForegroundColor Cyan
Write-Host "SETUP COMPLETE" -ForegroundColor Green
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Edge Functions:" -ForegroundColor White
Write-Host "  https://$PROJECT_REF.supabase.co/functions/v1/create-order" -ForegroundColor Gray
Write-Host "  https://$PROJECT_REF.supabase.co/functions/v1/payment-callback" -ForegroundColor Gray
Write-Host "  https://$PROJECT_REF.supabase.co/functions/v1/download-pdf" -ForegroundColor Gray
Write-Host "  https://$PROJECT_REF.supabase.co/functions/v1/verify-order" -ForegroundColor Gray
Write-Host ""
Write-Host "Your secrets (PAYU_MERCHANT_KEY, PAYU_MERCHANT_SALT, PAYU_ENV, SITE_URL)" -ForegroundColor White
Write-Host "are stored in Supabase and never exposed to the browser." -ForegroundColor Gray
Write-Host ""
