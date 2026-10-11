#!/usr/bin/env bash
set -euo pipefail
# Executar dentro de um GitHub Codespace do teu repositório, após login GitHub.
if ! command -v gh >/dev/null; then echo 'Falta GitHub CLI (gh). Usa o Codespaces ou instala o gh.'; exit 1; fi
if ! command -v keytool >/dev/null; then echo 'Falta Java/keytool. Instala JDK 21 no Codespace.'; exit 1; fi
REPO="$(gh repo view --json nameWithOwner --jq '.nameWithOwner')"
if [ -z "$REPO" ]; then echo 'Repositório GitHub não identificado.'; exit 1; fi
KEY="$HOME/.android/rjp-tm-tactics-debug.keystore"
mkdir -p "$HOME/.android"; umask 077
if [ ! -f "$KEY" ]; then
  keytool -genkeypair -noprompt -keystore "$KEY" \
   -alias androiddebugkey -keyalg RSA -keysize 3072 -validity 12000 \
   -storepass android -keypass android -dname 'CN=RJP TM Tactics, O=RJP, C=PT'
fi
# Guarda só a representação base64 no Github Actions Secrets. Nunca coloca a chave no repo.
base64 -w 0 "$KEY" | gh secret set RJP_ANDROID_DEBUG_KEYSTORE_BASE64 -R "$REPO"
printf '\n✓ Chave de assinatura permanente configurada em %s.\n' "$REPO"
printf 'IMPORTANTE: guarda um backup privado do ficheiro %s fora do Codespaces.\n' "$KEY"
echo 'Em Actions, executa Compilar APK Android - RJP TM Tactics.'
