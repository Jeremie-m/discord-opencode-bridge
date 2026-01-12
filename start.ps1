# Discord-OpenCode Bridge Startup Script
# Reads configuration from .env and starts both services

$ErrorActionPreference = "Stop"

# Load .env file
$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# Get project path from env or use default
$projectPath = $env:OPENCODE_DEFAULT_PROJECT_PATH
if (-not $projectPath) {
    $projectPath = "D:\Dev"
}

# Validate project path exists
if (-not (Test-Path $projectPath)) {
    Write-Host "ERROR: Project path does not exist: $projectPath" -ForegroundColor Red
    Write-Host "Please set OPENCODE_DEFAULT_PROJECT_PATH in .env" -ForegroundColor Yellow
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Discord-OpenCode Bridge" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "OpenCode will run from: $projectPath" -ForegroundColor Green
Write-Host ""

# Start OpenCode server in the project directory
$opencodeJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    & opencode serve --port 4096
} -ArgumentList $projectPath

Write-Host "[opencode] Server starting from $projectPath..." -ForegroundColor Blue

# Wait a moment for OpenCode to start
Start-Sleep -Seconds 3

# Start the bridge from the script directory
Write-Host "[bridge] Starting Discord bridge..." -ForegroundColor Green
Set-Location $PSScriptRoot

# Run the bridge in foreground
try {
    & npx tsx watch src/index.ts
}
finally {
    # Cleanup: stop OpenCode server when bridge exits
    Write-Host "`nStopping OpenCode server..." -ForegroundColor Yellow
    Stop-Job $opencodeJob -ErrorAction SilentlyContinue
    Remove-Job $opencodeJob -ErrorAction SilentlyContinue
}
