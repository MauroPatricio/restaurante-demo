# 🛑 Parar Servidor na Porta 3000
Write-Host "`n🔍 Procurando processos na porta 3000..." -ForegroundColor Cyan

$processes = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | 
    Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    Write-Host "📋 Processos encontrados:" -ForegroundColor Yellow
    foreach ($pid in $processes) {
        $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "   PID: $pid - $($proc.ProcessName)" -ForegroundColor White
        }
    }
    
    $confirm = Read-Host "`n⚠️  Deseja parar estes processos? (s/n)"
    
    if ($confirm -eq "s" -or $confirm -eq "S") {
        foreach ($pid in $processes) {
            try {
                Stop-Process -Id $pid -Force -ErrorAction Stop
                Write-Host "✓ Processo $pid parado" -ForegroundColor Green
            } catch {
                Write-Host "✗ Erro ao parar processo $pid" -ForegroundColor Red
            }
        }
        Write-Host "`n✅ Porta 3000 liberada!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Cancelado." -ForegroundColor Red
    }
} else {
    Write-Host "✓ Nenhum processo na porta 3000" -ForegroundColor Green
}
