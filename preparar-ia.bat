@echo off
setlocal

REM SWAGWEAR - PREPARACAO DO PROVADOR VIRTUAL
REM Este arquivo nao armazena tokens nem sobrescreve um .env existente.

echo.
echo ==========================================
echo       SWAGWEAR - PREPARANDO IA
echo ==========================================
echo.

cd /d "%~dp0"

if not exist "assets" (
    mkdir "assets"
    echo [OK] Pasta assets criada.
) else (
    echo [OK] Pasta assets ja existe.
)

if not exist "assets\produtos" (
    mkdir "assets\produtos"
    echo [OK] Pasta assets\produtos criada.
) else (
    echo [OK] Pasta assets\produtos ja existe.
)

if exist ".env" (
    echo [OK] .env ja existe.
    echo [SEGURANCA] O arquivo existente NAO foi sobrescrito.
) else (
    (
        echo # SWAGWEAR - VARIAVEIS DE AMBIENTE
        echo DATABASE_URL=
        echo DATABASE_SSL=true
        echo DATABASE_SSL_REJECT_UNAUTHORIZED=false
        echo APP_ORIGIN=http://localhost:3000
        echo JWT_SECRET=
        echo REPLICATE_API_TOKEN=
        echo TRYON_MOCK=true
        echo PORT=3000
    ) > ".env"
    echo [OK] Arquivo .env criado.
)

if exist ".gitignore" (
    echo [OK] .gitignore encontrado.
) else (
    echo [AVISO] .gitignore nao foi encontrado. Adicione .env antes de publicar o projeto.
)

echo.
echo ==========================================
echo        PREPARACAO CONCLUIDA
echo ==========================================
echo.
echo Coloque a imagem da camiseta em:
echo assets\produtos\oversized-shadow-tee-tryon.png
echo.
echo Coloque o token Replicate diretamente no .env:
echo REPLICATE_API_TOKEN=SEU_TOKEN
echo.
echo Enquanto nao testar a IA real, mantenha TRYON_MOCK=true.
echo Nunca envie o arquivo .env ao GitHub.
echo.
pause

