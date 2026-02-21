# Run this script in PowerShell as Administrator
# It will create the tracker_user and tracker_db in PostgreSQL 16 (port 5432)

$PSQL = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
$PG_HBA = "C:\Program Files\PostgreSQL\16\data\pg_hba.conf"
$PG_HBA_BAK = "$PG_HBA.bak"
$SERVICE = "postgresql-x64-16"
$DB_PASSWORD = "tracker_pass_2024"

Write-Host "=== Step 1: Backing up pg_hba.conf ===" -ForegroundColor Cyan
Copy-Item $PG_HBA $PG_HBA_BAK -Force
Write-Host "Backup saved to $PG_HBA_BAK"

Write-Host "=== Step 2: Setting auth to trust ===" -ForegroundColor Cyan
(Get-Content $PG_HBA) -replace 'scram-sha-256', 'trust' | Set-Content $PG_HBA

Write-Host "=== Step 3: Restarting PostgreSQL ===" -ForegroundColor Cyan
Restart-Service $SERVICE -Force
Start-Sleep -Seconds 3
Write-Host "PostgreSQL restarted."

Write-Host "=== Step 4: Creating user and database ===" -ForegroundColor Cyan
& $PSQL -U postgres -c "CREATE USER tracker_user WITH PASSWORD '$DB_PASSWORD';" 2>&1
& $PSQL -U postgres -c "CREATE DATABASE tracker_db OWNER tracker_user;" 2>&1
& $PSQL -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE tracker_db TO tracker_user;" 2>&1
Write-Host "User and database created."

Write-Host "=== Step 5: Restoring pg_hba.conf ===" -ForegroundColor Cyan
Copy-Item $PG_HBA_BAK $PG_HBA -Force
Write-Host "pg_hba.conf restored."

Write-Host "=== Step 6: Restarting PostgreSQL again ===" -ForegroundColor Cyan
Restart-Service $SERVICE -Force
Start-Sleep -Seconds 3
Write-Host "PostgreSQL restarted with scram-sha-256 auth."

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
Write-Host "tracker_user password: $DB_PASSWORD"
Write-Host "The backend/.env file has already been created with the correct DATABASE_URL."
