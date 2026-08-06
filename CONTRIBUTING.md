# Como colaborar

Este repositorio e a fonte oficial do MoldePronto e do Meu Atelie Digital.
O trabalho deve acontecer em branches e pull requests. Um push em `main`
aciona o deploy de producao do MoldePronto.

## Ambiente

Use Node.js 24 e npm. Ha duas formas suportadas:

1. GitHub Codespaces: abra o repositorio e escolha `Code > Codespaces > Create`.
2. Local: clone o repositorio e execute `npm ci`.

O servidor do MoldePronto inicia com:

```bash
npm run dev:gerador
```

O Meu Atelie Digital inicia com:

```bash
npm run dev:escola
```

As duas aplicacoes usam a porta `8080`.

## Fluxo de trabalho

1. Atualize `main` antes de criar a branch.
2. Use `feat/descricao`, `fix/descricao`, `docs/descricao` ou `chore/descricao`.
3. Mantenha cada pull request focado em uma mudanca verificavel.
4. Preencha o template do pull request e aguarde o CI.
5. Faca merge somente depois da revisao de outra pessoa da equipe.

Nao envie commits diretamente para `main`. O plano atual do GitHub nao libera
protecao de branch para este repositorio privado, por isso essa regra precisa
ser seguida pela equipe ate a conta ser atualizada.

## Verificacao obrigatoria

```bash
npm run lint
npm test
npx tsc -b --pretty false
npm run build:gerador
npm run build:escola
```

Mudancas no compositor ou no curador tambem devem executar:

```bash
npm run audit:compositions
```

Essa auditoria consulta os temas, moldes e assets de producao no Supabase.

## Banco, funcoes e assets

- Toda alteracao de banco deve entrar como migration em `supabase/migrations/`.
- Edge Functions ficam em `supabase/functions/` e sao publicadas pelo Supabase CLI.
- JSONs tecnicos de faces ficam em `supabase/assets/mold-faces/`.
- Imagens licenciadas permanecem no Drive da Alice e no Supabase Storage.
- Registre origem, hash, licenca e destino dos assets nas migrations.
- Nunca copie para o GitHub os diretorios `output/`, videos, caches ou extracoes de QA.

## Segredos

Nunca versione `.env.local`, chaves OpenAI, service role do Supabase, tokens ou
chaves SSH. Variaveis `VITE_` sao publicas no bundle; portanto nao podem conter
segredos. Use GitHub Secrets, Codespaces Secrets e Supabase Secrets.
