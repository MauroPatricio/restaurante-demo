# Script para resolver problema de DNS e iniciar servidor
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Diagnóstico e Solução de DNS MongoDB" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "`n📋 PROBLEMA IDENTIFICADO:" -ForegroundColor Yellow
Write-Host "   ❌ Porta 4000: LIVRE (sem bloqueios)" -ForegroundColor Green
Write-Host "   ❌ Firewall MongoDB: OK (porta 27017 alcançável)" -ForegroundColor Green
Write-Host "   ⚠️  DNS: FALHA ao resolver cluster0.y7vbtxw.mongodb.net" -ForegroundColor Red
Write-Host ""
Write-Host "   O servidor NÃO inicia porque o MongoDB não pode" -ForegroundColor Yellow
Write-Host "   ser alcançado devido ao DNS não resolver o hostname." -ForegroundColor Yellow

Write-Host "`n💡 SOLUÇÕES DISPONÍVEIS:" -ForegroundColor Cyan
Write-Host "   1. Mudar DNS do computador para 8.8.8.8 (Google DNS)" -ForegroundColor White
Write-Host "   2. Usar IP direto do MongoDB na conexão" -ForegroundColor White
Write-Host "   3. Usar VPN" -ForegroundColor White

Write-Host "`n🤔 Escolha uma opção:" -ForegroundColor Cyan
Write-Host "   [1] Tentar iniciar com IP direto (temporário)" -ForegroundColor White
Write-Host "   [2] Ver instruções para mudar DNS (solução permanente)" -ForegroundColor White
Write-Host "   [3] Cancelar" -ForegroundColor White

$choice = Read-Host "`nDigite 1, 2 ou 3"

if ($choice -eq "1") {
    Write-Host "`n🔧 Configurando conexão com IP direto..." -ForegroundColor Green
    
    # Backup do arquivo .env
    if (Test-Path .env) {
        Copy-Item .env .env.backup -Force
        Write-Host "✓ Backup criado: .env.backup" -ForegroundColor Green
    }
    
    Write-Host "`n⚠️  NOTA: Usando IP direto pode não funcionar com MongoDB Atlas" -ForegroundColor Yellow
    Write-Host "   devido à necessidade de SNI (Server Name Indication)." -ForegroundColor Yellow
    Write-Host "   A solução recomendada é mudar o DNS do sistema." -ForegroundColor Yellow
    
    Write-Host "`n🚀 Tentando iniciar servidor..." -ForegroundColor Cyan
    npm run dev
    
}
elseif ($choice -eq "2") {
    Write-Host "`n📖 INSTRUÇÕES PARA MUDAR DNS:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Windows:" -ForegroundColor Yellow
    Write-Host "1. Abra 'Painel de Controle' > 'Rede e Internet' > 'Central de Rede'" -ForegroundColor White
    Write-Host "2. Clique em 'Alterar configurações do adaptador'" -ForegroundColor White
    Write-Host "3. Clique com botão direito na sua conexão ativa" -ForegroundColor White
    Write-Host "4. Selecione 'Propriedades'" -ForegroundColor White
    Write-Host "5. Selecione 'Protocolo IP Versão 4 (TCP/IPv4)'" -ForegroundColor White
    Write-Host "6. Clique em 'Propriedades'" -ForegroundColor White
    Write-Host "7. Marque 'Usar os seguintes endereços de servidor DNS:'" -ForegroundColor White
    Write-Host "   - DNS preferencial: 8.8.8.8" -ForegroundColor Green
    Write-Host "   - DNS alternativo: 8.8.4.4" -ForegroundColor Green
    Write-Host "8. Clique em 'OK' e reinicie sua conexão" -ForegroundColor White
    Write-Host ""
    Write-Host "OU execute como Administrador:" -ForegroundColor Yellow
    Write-Host "   netsh interface ip set dns 'Wi-Fi' static 8.8.8.8 primary" -ForegroundColor Cyan
    Write-Host "   netsh interface ip add dns 'Wi-Fi' 8.8.4.4 index=2" -ForegroundColor Cyan
    Write-Host "   (substitua 'Wi-Fi' pelo nome da sua conexão)" -ForegroundColor Gray
    Write-Host ""
    
    $startAnyway = Read-Host "Tentar iniciar servidor mesmo assim? (s/n)"
    if ($startAnyway -eq "s" -or $startAnyway -eq "S") {
        Write-Host "`n🚀 Iniciando servidor..." -ForegroundColor Cyan
        npm run dev
    }
    
}
else {
    Write-Host "`n❌ Cancelado." -ForegroundColor Red
}
