## Objetivo

Descreva o problema e o resultado esperado.

## Alteracoes

- Descreva as mudancas principais.

## Validacao

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npx tsc -b --pretty false`
- [ ] `npm run build:gerador`
- [ ] Testei visualmente em desktop e mobile quando a mudanca afeta a interface
- [ ] Executei a auditoria de composicoes quando a mudanca afeta artes ou moldes

## Risco de producao

- [ ] Nao inclui segredos, arquivos `.env.local` nem artefatos de `output/`
- [ ] Inclui migration para qualquer alteracao de banco
- [ ] Preserva nome, area segura, linhas tecnicas e formato SVG dos moldes
