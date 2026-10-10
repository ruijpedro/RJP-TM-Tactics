# RJP TM Tactics — V1.3.0 (Portugal)

Aplicação independente **Trophy Manager** para Android (APK construída pelo GitHub Actions) e WebApp/PWA. Projeto desenvolvido para utilização no telemóvel, sem extensões do Chrome ou Edge.

## Correção de compilação V1.1.1

O GitHub Actions falhava em `android-actions/setup-android@v3`: esse action tentava instalar o pacote SDK legado `tools`, que deixou de estar disponível. O workflow utiliza agora `android-actions/setup-android@v4` e solicita apenas `platform-tools`; SDK 35 e build-tools 35 são instalados a seguir.

O `versionCode` da APK é construído a partir da versão semântica e do número da execução, para preservar atualizações quando a assinatura é idêntica. A mudança de versão não elimina a necessidade de reutilizar a mesma chave de assinatura.

**Novidade V1.1:** comparação de dois jogadores por posição, ranking técnico e propostas de mudança de posição apenas informativas. Nenhum dado ou tática é alterado automaticamente no TM.

## Já implementado

- **Onze ideal**: avalia as competências por posição e encontra a melhor combinação de 11 jogadores *sem os repetir*, usando atribuição global otimizada (algoritmo húngaro).
- **Onze formações de origem + táticas livres**: 3-2-3-1-1, 4-3-3, 4-2-3-1, 4-4-2, 4-1-4-1, 4-3-1-2, 4-4-1-1, 3-5-2, 3-4-3, 5-3-2 e 4-2-2-2.
- **Aptidão posicional**: distingue posição favorita e mudanças de corredor/setor; considera rotina, condição (se fornecida), lesões, suspensão e exclusão.
- **Rankings por posição**, alternativas para o onze, pontos a melhorar, cartas simples com atributos.
- **Recomendação de estilo de jogo**: alas, passe curto, direto, remate exterior e transições, usando indicadores heurísticos e explicações.
- **Importação na APK**: abre `trophymanager.com` num WebView próprio, permite iniciar sessão na conta do jogador e tocar **Importar** na página **Plantel → Jogadores**; tenta ler `players_ar` carregado pelo próprio TM. Não necessita Tampermonkey, nem de licença do Tactics Pro. A integração com a interface real do TM requer validação no teu dispositivo.
- Importação manual de **JSON ou CSV**; editor de jogadores; exportação do plantel; guarda local e funcionamento PWA offline após primeiro carregamento.
- Interface PT-PT, ícone RJP TM personalizado e código completo no ZIP.

## O que esta versão ainda NÃO faz

- Não altera automaticamente o onze no site do TM; as sugestões são para aplicares manualmente.
- Não obtém sessão/login do Edge (o WebView usa cookies próprios); o primeiro login é feito pelo utilizador no domínio oficial.
- Não faz scraping de adversários, mercado ou scout nem pedidos automáticos aos servidores do TM.
- Não replica cálculos internos nem os R5/R6/REC oficiais; os pesos foram concebidos como um **índice RJP heurístico (0–100)**, e os resultados não devem ser tomados como previsão garantida.
- A compilação APK não foi testada num dispositivo Android real neste ambiente; o workflow está preparado para gerar um **APK debug** em GitHub Actions.

## Instalar WebApp (mais rápido)

A pasta `webapp/` continua disponível como versão estática de consulta, mas o GitHub Pages publica a compilação atual de `src/` para evitar divergências com a APK. Publica o repositório no GitHub e escolhe **Settings → Pages → Build and deployment → Source: GitHub Actions**. O workflow `Publicar RJP TM Tactics no GitHub Pages` recompila a WebApp em cada alteração relevante. Depois abre o endereço HTTPS do Pages no Android (Edge ou Chrome) e escolhe «Adicionar ao ecrã inicial».

Na WebApp, por razões de segurança dos navegadores, a importação tem de ser por ficheiro JSON/CSV ou inserção manual. A WebApp não consegue ler os cookies, o conteúdo da sessão nem as páginas protegidas abertas no Edge.

## Gerar APK Android no GitHub (sem Android Studio)

1. Cria um repositório no GitHub, por exemplo `RJP_TM_Tactics`.
2. Descompacta **os ficheiros da raiz** deste ZIP na raiz do repositório e faz o commit. A pasta `.github/workflows/` deve ficar exatamente na raiz (e não dentro de outra pasta).
3. Vai a **Actions → Compilar APK Android - RJP TM Tactics → Run workflow** (ou faz um `push` para `main`).
4. O fluxo instala Node 22, Java 21 e o Android SDK; testa o motor tático; compila a WebApp; gera o projeto Android Capacitor, instala o plugin nativo RJP e o ícone personalizado, compila o APK debug e publica-o em **Artifacts**. O `versionCode` utiliza a versão da app e o número da execução, aumentando nas versões posteriores.
5. Descarrega `RJP-TM-Tactics-APK-Android`, extrai `app-debug.apk` e instala no Android (autoriza a instalação de ficheiros desse tipo se necessário).

**Nota:** o APK debug está assinado com a chave debug da própria compilação. Para uma atualização sobre a APK já instalada, é necessário que **ambas** sejam assinadas com a **mesma chave** e conservem o mesmo `appId` (`pt.rjp.tmtactics`). O Android não instala uma atualização assinada com outra chave por cima da anterior. Para distribuição estável, configura futuramente uma assinatura de lançamento (*release*) persistente no GitHub Secrets/Actions.

## Atualizar a APK sem desinstalar (assinatura permanente)

O Android **só permite atualizar a aplicação sem a desinstalar** quando o `appId` e a chave de assinatura se mantêm. Este projeto conserva o `appId` `pt.rjp.tmtactics` e incrementa o `versionCode` no workflow, mas uma assinatura debug nova é normalmente gerada em cada máquina/runner do GitHub.

**Recomendado: configurar a chave antes da primeira instalação.** Cria uma única chave debug persistente num computador com Java:

```bash
mkdir -p ~/.android
keytool -genkeypair -v -keystore ~/.android/debug.keystore -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android -dname "CN=Android Debug,O=Android,C=US"
base64 -w0 ~/.android/debug.keystore
```

O comando `base64 -w0` é para Linux. Em Windows podes usar PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\CAMINHO\debug.keystore"))`. Guarda a saída com cuidado.

No repositório GitHub, vai a **Settings → Secrets and variables → Actions → New repository secret**. Nome: `RJP_ANDROID_DEBUG_KEYSTORE_BASE64`. Valor: todo o conteúdo base64 da chave. O workflow repõe a mesma chave antes de compilar. **Nunca publiques a chave no repositório**. Conserva uma cópia privada: perder a chave impede atualizar a aplicação já instalada com outra assinatura.

Caso não configures este segredo, a compilação do APK continua a funcionar, mas o GitHub mostra um aviso de que a próxima APK poderá não instalar sobre a anterior. Para publicação na Play Store, será necessário usar um processo de assinatura *release* separado.

## Desenvolvimento local

```bash
npm install
npm test
npm run dev
npm run build
npx cap add android
node scripts/prepare-android.mjs
npx cap sync android
npx cap open android
```

Após alterações do WebApp, volta a executar `npm run build` e `npx cap sync android`. O projeto Android é gerado localmente ou pelo workflow; por isso **não está incluída uma pasta `android/` pré-gerada** no ZIP.

## Como importar diretamente do TM na APK

1. Abre `RJP TM Tactics` e vai ao separador **Importar**.
2. Toca **Abrir Trophy Manager na APP**.
3. Inicia sessão **no site oficial** dentro do navegador integrado (não na nossa interface).
4. Navega para **Plantel → Jogadores** e aguarda pela lista.
5. Toca **✓ Importar** no topo do navegador. A aplicação recolhe só o conjunto `players_ar` exposto nessa página.
6. Regressas à análise com os jogadores importados para armazenamento **local** no telemóvel.

Se a versão móvel não disponibilizar a estrutura `players_ar`, a aplicação informa que não conseguiu importar. Podes então usar JSON, CSV ou edição manual. **Não existem rotinas para contornar autenticação nem proteção do TM.**

## Estrutura de dados JSON aceite

```json
{
  "players": [
    {"id":"101","name":"Exemplo TM","fp":"M C","age":25,"routine":21,"condition":96,
     "str":12,"sta":12,"pac":13,"mar":8,"tac":10,"wor":16,"pos":14,"pas":17,
     "cro":8,"tec":18,"hea":10,"fin":11,"lon":13,"set":10}
  ]
}
```

A estrutura `players_ar` com campos `id`, `name`, `fp`, `asi`, `rec`, `routine` e skills numéricas também é reconhecida. O CSV precisa de cabeçalho e é separado por vírgula. Guarda-redes usam `han, one, ref, ari, jum, com, kic, thr` em vez da lista de atributos dos jogadores de campo.

## Limitações e critérios do motor

- Os **valores 0–100** são índices próprios de adequação; quanto maior, melhor para o modelo, **não** percentagem de probabilidade de vitória.
- Pesos posicionais aproximados, inspirados na discussão pública sobre atributos-chave do jogo. As regras internas não são disponibilizadas pelo TM.
- Os fatores de adaptação posicional e o impacto da condição são também estimativas.
- O algoritmo escolhe a melhor combinação para **cada formação** e ordena as formações pelo índice médio do onze. Não prevê comportamentos detalhados do motor do jogo, química, adversário ou instruções específicas.
- Estes resultados devem ser comparados com os teus próprios relatórios de jogo e refinados conforme a experiência real.

## Privacidade e direitos

- A App não pede, recebe nem armazena a palavra-passe do TM em código próprio. O login ocorre na página HTTPS do Trophy Manager; o Android WebView guarda as suas próprias cookies.
- O plantel é processado localmente. Não existe backend nem partilha automática na nuvem.
- O projeto é **independente e não afiliado ao Trophy Manager**, nem ao autor de Tactics Pro/Saber Nasr. Não reutiliza nem contorna o carregador/licenças do Tactics Pro.
- Fontes de estudo: [TM Compare Players R6 (MIT)](https://greasyfork.org/en/scripts/515818-tm-compare-players-r6) e [TM Position Analysis & Ranking](https://greasyfork.org/en/scripts/591412-trophy-manager-player-position-analysis-ranking), usadas como referência pública, **sem copiar os motores/código**. Os coeficientes da aplicação são próprios.

## Testes

`npm test` executa testes de posições, cálculo global do onze, seleção por formação, indisponibilidades e importador CSV/JSON.


## V1.2.0 — Táticas livres e personalizadas

- Novo separador **Táticas**: criar, editar, guardar, apagar e importar/exportar até 30 táticas.
- Exemplo pronto **3-2-3-1-1**: GR + 3 DC + 2 DMC + 3 MC + 1 OMC + 1 F.
- Editor por posição para os 10 jogadores de campo, sem restringir formações a uma lista fixa.
- As táticas guardadas entram na análise global, no melhor onze e na comparação automática; o plantel não é alterado.
- As táticas são preservadas quando se importa um novo plantel. O backup de táticas é independente do plantel.
- Os cálculos são heurísticos; a disposição deverá ser confirmada no Trophy Manager.

## V1.3.0 — Treino individual e recrutamento (10 de outubro de 2026)

Nesta versão, a app mantém as táticas livres da V1.2, incluindo o **3-2-3-1-1**, e adiciona o novo separador **Treino +**, com dois modos:

**Treino por jogador:** escolhe um jogador e, por defeito, a sua melhor posição **estimada e compatível** com as suas posições favoritas (podes escolher manualmente outra função). O programa cruza os atributos reais 1–20 com as ponderações por posição e uma meta indicativa à escolha: Base 12, Competitivo 15, Elevado 18. Ordena até cinco carências prioritárias, mostra valores atuais, metas, importância relativa, áreas de treino relacionadas, atributos sem dados e aviso de idade/desenvolvimento. Atributos ausentes/zero são tratados como *não fornecidos*, nunca como uma capacidade zero a corrigir. O treino não é aplicado automaticamente no TM.

**Perfil de contratação:** para cada posição, incluindo central (DC), trinco (DMC), médio-centro (MC), médio ofensivo (OMC) e avançado (F), apresenta atributos indispensáveis, secundários, mínimos orientativos, checklist de compra e os três melhores jogadores que já tens nessa posição. Não pesquisa o mercado, não calcula preços reais nem compra jogadores automaticamente.

Os perfis são **heurísticas RJP independentes**, elaboradas a partir dos atributos e papéis públicos no TM. Metas 12/15/18 são filtros arbitrários de análise para comparação, não escalões ou requisitos oficiais. A evolução real depende de treinador, fase de desenvolvimento, potencial, instalações e aleatoriedade; não se promete crescimento de skills. Fontes públicas consultadas: [Trophy Manager – Player Positions & Most important skills](https://tm2016.wixsite.com/home/single-post/2016/03/13/player-positions-most-important-skills) e [How To Develop Your Young Stars](https://tmireland.wordpress.com/2011/01/14/how-to-develop-your-young-stars/), guias históricos não necessariamente atualizados ao motor de 2026.

**Compatibilidade:** mantém `appId` `pt.rjp.tmtactics` e armazenamento local `rjp_tm_tactics_v1` para preservar jogadores e táticas importadas nas atualizações, desde que a APK seja assinada com a mesma chave. A versão é V1.3.0, com workflow `android-actions/setup-android@v4`.

**Validação:** `npm test` inclui 22 testes (importação, táticas personalizadas, análise, treino, défices, ausência de dados, níveis de referência, mercado e workflow). Esta embalagem ainda não demonstra uma compilação APK local real: o npm não respondeu dentro do limite do ambiente, pelo que é necessário validar no GitHub Actions.
