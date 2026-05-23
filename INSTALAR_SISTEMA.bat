@echo off
title INSTALADOR - ERP PADARIA
color 0B

echo.
echo  ============================================================
echo       BEM-VINDO AO INSTALADOR DO ERP PADARIA
echo  ============================================================
echo.
echo  Este programa instalara o sistema automaticamente.
echo  Nao feche esta janela ate o processo terminar.
echo.
echo  REQUISITOS:
echo    - Windows 10 ou superior
echo    - Conexao com a Internet
echo    - Permissao de Administrador
echo.
echo  O sistema sera instalado em: C:\Padaria
echo.
pause

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [ERRO] Algo deu errado durante a instalacao.
    echo  Verifique a mensagem acima e tente novamente.
    echo.
    pause
    exit /b %ERRORLEVEL%
)

pause
