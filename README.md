# Arte Mágica

Base compartilhada de dois produtos para artesãs:

- **Meu Ateliê Digital**: nove assistentes de IA para atendimento, vendas, conteúdo, catálogo, pós-venda, impressão, curadoria de moldes, revisão e agenda. As respostas seguem a regra de ouro de brevidade: uma entrega por resposta.
- **MoldePronto**: gerador de moldes personalizados para exportação em PDF, PNG e SVG. Inclui o Compositor de Kits (composição local com a biblioteca de temas), o Criar com IA (personalização em quiz de 7 perguntas; geração via job em background da OpenAI Responses API com gpt-image-2), o histórico "Minhas Artes" e a "Galeria" universal (tabela `minhas_artes`), com refazer trocando só o nome. Miniaturas das galerias saem do transformador de imagens do Storage (`src/lib/thumb.ts`).

O modo **Meu Ateliê Digital** é publicado em `https://www.appateliedigital.com.br/agentes-artesaos/`, sem substituir o aplicativo existente na raiz do domínio. A mesma rota também aceita o host sem `www` quando ele chega ao servidor principal.

## Meu Ateliê Digital

As assistentes disponíveis em `/agentes` são Nina, Iris, Clara, Violeta, Sofia, Bella, Elisa e Maia. O chat usa a OpenAI Responses API com streaming, pesquisa pública, citações, leitura de imagens, transcrição de áudio e memória por usuária.

O backend está em `supabase/functions/chat-agente/`. As conversas e memórias ficam no Postgres com RLS; anexos ficam em um bucket privado e são acessados por URLs assinadas.

## Produtos e builds

```bash
npm install
npm run dev             # Meu Ateliê Digital em http://localhost:8080
npm run dev:escola      # Meu Ateliê Digital
npm run dev:gerador     # MoldePronto
npm run build:escola
npm run build:gerador
```

Os perfis ficam em `src/config/products.ts`, com variáveis públicas específicas em `.env.escola` e `.env.gerador`. O workflow de produção usa `npm run build:escola`.

## Acesso e Hotmart

O Meu Ateliê Digital oferece acesso vitalício por 9x de R$ 9,21 ou R$ 67 à vista. O gate usa `src/components/RequireAssinatura.tsx` e a tabela `assinaturas`, com correspondência pelo e-mail autenticado.

O webhook `supabase/functions/hotmart-webhook/` ativa compras aprovadas e revoga reembolsos, cancelamentos e chargebacks. Ele exige `HOTMART_HOTTOK`; sem o segredo, falha de forma fechada. O checkout público pode ser configurado por `VITE_HOTMART_CHECKOUT_URL` ou pelo painel `/admin/assinaturas`.

## Infraestrutura

- Supabase: projeto `qdwhwxboocplmnmczkfj`.
- OpenAI: `gpt-5.4-mini` para chat e memória; `gpt-4o-mini-transcribe` para áudio; `gpt-image-2` para artes e mockups (jobs em background — o front consulta o status, nada fica preso esperando).
- Deploy: push na `main` publica o MoldePronto (raiz, VPS autobox) via `deploy-gerador.yml`; a escola publica por `deploy.yml` (dispatch manual) na VPS crmcreator com esquema de releases. O nginx serve `index.html` com `no-cache` e `assets/` imutável.
- Segredos das Edge Functions: `OPENAI_API_KEY` e `HOTMART_HOTTOK`.

## Verificação

```bash
npm test
npx tsc -b --pretty false
npm run build:escola
```
