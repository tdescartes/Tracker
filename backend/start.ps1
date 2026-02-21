# Start the FastAPI backend server
Write-Host "Starting Tracker backend..." -ForegroundColor Cyan

# Activate virtual environment if it exists
if (Test-Path ".\venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    .\venv\Scripts\Activate.ps1
} elseif (Test-Path ".\.venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    .\.venv\Scripts\Activate.ps1
}

# Load .env if present
if (Test-Path ".\.env") {
    Write-Host "Loading .env file..." -ForegroundColor Yellow
    Get-Content .\.env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim())
        }
    }
}

# Run uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
