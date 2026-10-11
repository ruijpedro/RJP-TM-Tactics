# Atualizações Android — RJP TM Tactics V1.4.0

## Porque o Android pede para desinstalar?
O Android compara o ID (`pt.rjp.tmtactics`) e o certificado da APK anterior. Uma APK produzida num runner GitHub novo costuma ter chave debug diferente. Não é possível recuperar a chave privada a partir da APK instalada.

## Configuração única obrigatória
1. Coloca todo o ZIP no repositório no GitHub (inclusive `.github`).
2. No repositório escolhe **Code → Codespaces → Create codespace on main** (no telemóvel podes usar Edge em modo desktop).
3. No terminal do Codespaces executa:

   ```bash
   bash scripts/configurar-assinatura-github.sh
   ```

4. O script gera uma chave privada de testes local ao Codespaces e coloca o seu conteúdo codificado em `Settings → Secrets and variables → Actions` com o nome **RJP_ANDROID_DEBUG_KEYSTORE_BASE64**, sem publicar a chave na árvore Git.
5. **Faz uma cópia de segurança privada da keystore** (`~/.android/rjp-tm-tactics-debug.keystore` no Codespaces). A perda dessa chave impossibilita atualizações com a assinatura correspondente; nunca a coloques num repositório público.
6. Faz **Actions → Compilar APK Android - RJP TM Tactics → Run workflow**. O passo *Validar assinatura persistente* passa apenas quando encontra a chave.

Caso prefiras usar o teu PC, gera a debug.keystore aí e cria o segredo do GitHub manualmente com o base64 do ficheiro. Tem de ser a **mesma** chave em todas as futuras versões.

## Primeira migração
Se a V1.3 antiga foi compilada sem segredo (assinatura temporária), **a próxima APK pode não conseguir atualizar essa instalação**. Nesse caso, antes de desinstalar usa **Plantel → Exportar** para guardar os jogadores. Guarda também as tuas formações no separador Táticas, usando **Exportar táticas**. Instala uma única vez a APK V1.4 assinada com a chave persistente, e importa os ficheiros. Depois, as próximas APK assinadas com a mesma chave e código de versão superior são instaláveis por cima, sem apagar os dados.

> Assinatura persistente permite **atualizar sem desinstalar**; não equivale a instalação automática silenciosa. Ao distribuir APKs pelo GitHub tens de descarregar/abrir a nova APK e confirmar a instalação no Android. Para atualizações automáticas geridas pelo sistema operativo, usa Google Play ou outro sistema de distribuição com atualização administrada.

## Diagnóstico
- `INSTALL_FAILED_UPDATE_INCOMPATIBLE`: chave da APK antiga diferente da nova (ou ID diferente).
- `INSTALL_FAILED_VERSION_DOWNGRADE`: o `versionCode` novo é inferior ao instalado. A nossa preparação gera um código crescente por versão e número de execução.
- `No signing key configured`: faltou configurar o segredo ou não ficou no repositório certo.
- Se queres saber se duas APKs são compatíveis, compara as impressões SHA-256 com `apksigner verify --print-certs nome.apk`.

Esta é uma **APK debug para uso pessoal/testes**. Para publicar ao público recomenda-se uma assinatura release, gerida de forma separada.
