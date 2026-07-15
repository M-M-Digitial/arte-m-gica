# MoldePronto

SaaS para papeleiras: artes de festa personalizadas (nome, tema, molde) prontas em segundos.
No ar em **https://www.appateliedigital.com.br**.

## Como funciona

- **Compositor de Kits** (`/editor`) — motor principal, roda 100% no navegador e custa zero por arte:
  molde vetorial (SVG) + biblioteca de assets do tema (papéis, cliparts, fonte) + nome como `<text>`
  editável → SVG (abre no Canva) / PNG / PDF. 100 temas, 21 moldes, seletor de personagem.
  Código: `src/lib/compose-kit.ts` + `src/pages/Editor.tsx`.
- **Criar com IA** (`/criar`) — fallback para temas sem referência: gpt-image decora o molde
  (edge `gerar-arte`, com máscara de edição + streaming). Cota de 30 artes/usuário/mês
  (tabela `geracoes_ia`; admins ilimitado).
- **8 agentes especialistas** (`/agentes`) — edge `chat-agente` (gpt-4o-mini, multimodal: leem
  imagens anexadas). Prompts em `supabase/functions/chat-agente`.

## Monetização (Hotmart)

- Planos em `src/config/billing.ts` (Mensal R$ 39,90 / Anual R$ 349).
- Gate: `src/components/RequireAssinatura.tsx` + `src/hooks/use-subscription.ts`
  (tabela `assinaturas`, match por e-mail; admin bypassa).
- Webhook: edge `hotmart-webhook` (ativa/cancela pela Hotmart; valida secret `HOTMART_HOTTOK`).
- Painel admin: `/admin/assinaturas` (stats, liberação manual, link de checkout configurável).

## Infra

- **Supabase** projeto `qdwhwxboocplmnmczkfj` (sa-east-1): Postgres + Storage (bucket `moldes`
  com SVGs/máscaras/faces dos moldes e assets por tema em `temas/<slug>/`) + 7 edge functions.
- **Deploy**: push na `main` → GitHub Actions builda e faz rsync do `dist/` pra VPS (nginx).
  Secrets `VPS_*` no repositório.
- **Ingestão da biblioteca**: `tools/ingestao/` (PDF→SVG por potrace, detecção de faces +
  máscara de interior, ingestão de temas do Drive, upload de assets). Ver README da pasta.

## Desenvolvimento

```bash
npm install
npm run dev     # localhost:8080
npm run build
```

Secrets das edge functions: `OPENAI_API_KEY`, `HOTMART_HOTTOK`
(`npx supabase secrets set NOME=valor --project-ref qdwhwxboocplmnmczkfj`).
