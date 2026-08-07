# Colaboracao no GitHub

Repositorio oficial: `https://github.com/M-M-Digitial/arte-m-gica`

O repositorio e privado. Atualmente `marcoss2019` e `gustavors22` possuem
permissao administrativa. Novos integrantes devem receber permissao `Write`;
use `Maintain` somente para liderancas e evite distribuir `Admin`.

## Edicao totalmente online

1. Entre no repositorio pelo navegador.
2. Selecione `Code > Codespaces > Create codespace on main`.
3. Espere o `npm ci` automatico terminar.
4. Crie uma branch antes de editar.
5. Rode `npm run dev:gerador` e abra a porta encaminhada `8080`.
6. Envie a branch e abra um pull request.

Link direto para criar um ambiente:
`https://codespaces.new/M-M-Digitial/arte-m-gica?quickstart=1`

## O que esta no GitHub

- frontend React/Vite dos dois produtos;
- compositor, exportadores SVG/PDF/PNG e curador deterministico;
- Supabase Edge Functions e migrations;
- scripts de ingestao, auditoria e preparacao de assets;
- metadados tecnicos de faces dos 21 moldes;
- workflows de CI e deploy;
- metodologia de curadoria e documentacao operacional.

## O que permanece externo

- Postgres, Auth, Storage e Edge Functions publicadas: Supabase;
- originais licenciados: Drive da Alice;
- chaves OpenAI, Hotmart, Supabase service role e SSH: cofres de segredos;
- imagens, videos e relatorios temporarios de QA: somente ambiente local.

Esses arquivos externos nao devem ser duplicados no Git. O repositorio guarda
migrations, hashes e manifestos suficientes para identificar a origem e o uso.

## Deploy

- merge/push em `main`: publica o MoldePronto pelo `deploy-gerador.yml`;
- `deploy.yml`: publica o Meu Atelie Digital por acionamento manual;
- Edge Functions: publicar explicitamente com o Supabase CLI.

O plano atual nao habilita protecao de branch em repositorio privado. Ate a
atualizacao do plano, a equipe deve usar pull request e revisao por processo.

## Segredos configurados no GitHub

O deploy usa estes nomes, sem expor seus valores:

- `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_TARGET_DIR`;
- `ESCOLA_VPS_HOST`, `ESCOLA_VPS_USER`, `ESCOLA_VPS_KEY`, `ESCOLA_VPS_BASE`.

Segredos do Supabase devem ser gerenciados no painel/CLI do Supabase, nao no
bundle Vite.
