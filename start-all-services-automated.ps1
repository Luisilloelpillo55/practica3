# Script para iniciar TODOS los servicios automáticamente
# Guardalo como: start-all-services-v2.ps1
# Ejecuta: powershell -ExecutionPolicy Bypass -File start-all-services-v2.ps1

# Set execution policy if needed
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

# Colors for output
function Write-Status($message, $type = "info") {
    $colors = @{
        "success" = "Green"
        "error" = "Red"
        "info" = "Cyan"
        "warning" = "Yellow"
    }
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $message" -ForegroundColor $colors[$type]
}

$workDir = "C:\Users\Luis\Desktop\Practica1\mi-practica"

# Check if directory exists
if (-not (Test-Path $workDir)) {
    Write-Status "ERROR: Working directory not found: $workDir" "error"
    exit 1
}

Write-Status "Starting all services from: $workDir" "info"
Write-Status "This will open 5 new terminal windows:" "warning"
Write-Status "  1. Users Service (port 3001)" "info"
Write-Status "  2. Groups Service (port 3002)" "info"
Write-Status "  3. Tickets Service (port 3003)" "info"
Write-Status "  4. API Gateway (port 3008)" "info"
Write-Status "  5. Frontend Angular (port 4200)" "info"

# Start each service in a new terminal window
Write-Status "Starting Users Service..." "info"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workDir'; Write-Host 'Users Service starting...'; npm run start:users" -WindowStyle Maximized

Start-Sleep -Seconds 1

Write-Status "Starting Groups Service..." "info"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workDir'; Write-Host 'Groups Service starting...'; npm run start:groups" -WindowStyle Maximized

Start-Sleep -Seconds 1

Write-Status "Starting Tickets Service..." "info"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workDir'; Write-Host 'Tickets Service starting...'; npm run start:tickets" -WindowStyle Maximized

Start-Sleep -Seconds 1

Write-Status "Starting API Gateway..." "info"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workDir'; Write-Host 'API Gateway starting...'; npm run start:gateway" -WindowStyle Maximized

Start-Sleep -Seconds 2

Write-Status "Starting Frontend..." "info"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workDir'; Write-Host 'Frontend starting...'; npm start" -WindowStyle Maximized

Write-Status "All services started! Check the new terminal windows for logs." "success"
Write-Status "Frontend should be available at: http://localhost:4200" "info"
Write-Status "API Gateway should be available at: http://localhost:3008/health" "info"
Write-Status "This window will close in 5 seconds..." "warning"

Start-Sleep -Seconds 5
