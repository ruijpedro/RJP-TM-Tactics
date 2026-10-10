# Segurança — RJP TM Tactics

- Não submeter nomes de utilizador, palavras-passe, cookies, tokens ou chaves do Trophy Manager no repositório ou em relatórios.
- O navegador integrado abre o domínio oficial `https://trophymanager.com/`; o login é realizado nessa página.
- O importador só tenta ler os dados visíveis na página do plantel depois do toque do utilizador em **Importar**.
- Não colocar ficheiros de assinatura (`*.jks`, `*.keystore`) dentro do ZIP ou repositório. Guardar a assinatura base64 em **GitHub Actions secrets**.
- Na V1.0.1 não há sincronização na nuvem nem suporte a extensões externas. Os dados do plantel ficam no armazenamento local da app.
- A app é independente e não afiliada ao TM ou ao autor do Tactics Pro. A integração deverá ser validada com os termos de utilização do serviço.
