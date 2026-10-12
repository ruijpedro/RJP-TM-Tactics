# Correção do teste 28 — RJP TM Tactics V1.7.0

No GitHub Actions, o teste **fluxo Android exige chave persistente: se estiver ausente a compilação falha** foi escrito para a política anterior, que bloqueava builds sem segredos. O workflow foi simplificado para permitir builds de teste, mas o teste ficou desatualizado.

**Correção:** atualizar `tests/foreigners.test.js` para validar a política atual (utilizar a chave persistente se existir e for válida; caso contrário, gerar uma APK debug temporária). Nenhuma alteração ao motor tático.

Este ZIP completo também contém o workflow simples em `.github/workflows/android-apk.yml` e documentação atualizada.

Podes substituir os ficheiros na raiz do repositório e executar **Actions → Run workflow**. A APK completa continua por confirmar no runner Android.
