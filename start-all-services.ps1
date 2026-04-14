# Script para iniciar todos los servicios de la aplicación (Windows)
# Uso: .\start-all-services.ps1

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "INICIANDO TODOS LOS SERVICIOS" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Define los servicios a ejecutar
$services = @(
    @{ name = "API Gateway"; port = 3000; script = "start:gateway"; color = "Yellow" },
    @{ name = "Users Service"; port = 3001; script = "start:users"; color = "Magenta" },
    @{ name = "Groups Service"; port = 3002; script = "start:groups"; color = "Cyan" },
    @{ name = "Tickets Service"; port = 3003; script = "start:tickets"; color = "Green" },
    @{ name = "Angular Frontend"; port = 4200; script = "start"; color = "Blue" }
)

# Inicia cada servicio en un proceso separado
foreach ($service in $services) {
    Write-Host "▶ Iniciando $($service.name) en puerto $($service.port)..." -ForegroundColor $service.color
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run $($service.script)" -NoNewWindow
    Start-Sleep -Milliseconds 800
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "✓ TODOS LOS SERVICIOS HAN SIDO INICIADOS" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Servicios ejecutándose en:" -ForegroundColor Yellow
$services | ForEach-Object {
    Write-Host "  • $($_.name): http://localhost:$($_.port)" -ForegroundColor White
}
Write-Host ""
Write-Host "API Gateway actuará como proxy central en puerto 3000" -ForegroundColor Cyan
Write-Host "Frontend estará disponible en http://localhost:4200" -ForegroundColor Cyan
Write-Host ""
Write-Host "CTRL+C en cada ventana para detener los servicios" -ForegroundColor Yellow
