# Assinatura Android — modo simples e atualização futura

## Compilar imediatamente (sem Codespaces)
Carrega o projeto no GitHub e executa **Actions → Compilar APK Android → Run workflow**. Nenhuma chave é obrigatória.

- Se o segredo `RJP_ANDROID_DEBUG_KEYSTORE_BASE64` contiver uma keystore válida, será reutilizada.
- Se não existir ou estiver inválido, a compilação prossegue com uma nova chave de testes do Android.
- Nesta segunda situação, não há garantia de atualização por cima da APK instalada. Faz cópia do plantel e das táticas antes de desinstalar.

## Atualizações por cima da versão anterior (opcional)
O Android exige o mesmo identificador `pt.rjp.tmtactics`, um `versionCode` superior e o mesmo certificado de assinatura nas duas APKs. A forma fiável de assegurar isto é guardar uma keystore persistente e reutilizá-la em todas as compilações.

Se quiseres configurar essa assinatura no futuro:
1. Usa uma keystore cuja chave privada esteja guardada em local seguro; podes criá-la com `bash scripts/configurar-assinatura-github.sh` num Codespace **com autenticação e permissões suficientes**, ou usar uma keystore já criada.
2. Cria o segredo `RJP_ANDROID_DEBUG_KEYSTORE_BASE64` em **Settings → Secrets and variables → Actions**, com o conteúdo Base64 da keystore.
3. Guarda um backup privado do ficheiro keystore. Não o publiques no repositório nem neste chat.
4. Verifica no GitHub Actions o resumo **APK com assinatura persistente**.

**Atenção:** uma APK já instalada com uma chave de testes diferente não pode ser atualizada por cima; será preciso exportar dados, desinstalar e instalar a nova versão uma vez.

Não é uma atualização automática silenciosa: o Android continua a pedir confirmação da instalação quando distribuis APKs pelo GitHub.
