## V1.7.0 — Previsão do adversário

- Plantel adversário separado do plantel do utilizador; importação de JSON e leitura experimental dos dados públicos `players_ar`, quando realmente expostos na página que o utilizador abre no navegador integrado. A captura exige toque e confirmação explícita do clube.
- Registo facultativo dos onze titulares por jogo; frequências de titularidade e formação observada.
- Estimativa do melhor onze teórico do rival e do onze provável com bónus limitado para titulares recorrentes.
- Fragilidades possíveis dos setores e comparação indicativa com a nossa equipa. Recomendações informativas, nunca automação no TM.
- Quando o site não mostra os atributos do rival, a APP indica a limitação e permite importar JSON manualmente, sem inventar jogadores.

# V1.6.0 — Captura local do próximo jogo
- Captura do texto visível da página TM (calendário/preview), pelo WebView, mediante autorização explícita.
- Parser de adversário/data/local com confirmação antes de aplicar, sem misturar resultados de clubes diferentes.
- Alternativa por colagem manual na WebApp; preserva tudo de V1.5, incluindo cinco estrangeiros e assinatura persistente.
- Não recolhe histórico tático automaticamente nem garante compatibilidade com todos os formatos de preview do TM.

## V1.5.0 — Observador de Adversários (11/10/2026)

- Entrada manual / JSON dos últimos jogos observados, até 15 por adversário.
- Resumos de frequência por formação, estilo, ataque, mentalidade e golos.
- Plano A / Plano B, confiança da amostra e comparação com o 3-2-3-1-1 habitual.
- Propostas de alteração apenas se os dados sustentarem uma diferença relevante; sem mudanças automáticas.
- Arquitetura preparada para compilar diretamente desde a V1.3 com assinatura estável.

## V1.4.0 — Estrangeiros e atualizações

- Limite configurável de 5 estrangeiros no total de titulares e suplentes.
- Atribuição ótima de jogadores com limite máximo de estrangeiros.
- Importação do país dos jogadores e do clube pelo TM, quando disponível.
- Classificação manual Nacional/Estrangeiro; avisos para nacionalidade desconhecida.
- Assinatura persistente obrigatória no workflow Android e ferramenta de configuração no Codespaces.

# Notas das versões

## 1.3.0 — Treino + / Mercado
- Treino prioritário por jogador e posição, ponderado pelo valor de cada atributo para o papel.
- Apresentação de metas orientativas 12/15/18, carências e dados em falta.
- Perfil de recrutamento com critérios essenciais, acessórios e comparação com atuais titulares.
- Todas as recomendações locais, sem alterar a conta TM.
- Mantido o editor de táticas livres, onze automático e comparação de jogadores.

## 1.2.0 — Editor de táticas livres
- Criação e guarda de até 30 táticas com posições personalizadas.
- Exemplo 3-2-3-1-1 e motor de análise das formações personalizadas.

## 1.1.1 — Android SDK
- GitHub Actions com setup-android@v4.
