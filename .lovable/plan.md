# Otimizar geração de arte (mantendo OpenAI direto)

## Diagnóstico

`gerar-arte` e `gerar-mockup` chamam `gpt-image-2` na OpenAI **sem streaming** com `quality: "high"`. O usuário fica 40–90s no spinner. Depois ainda rodamos `compositeMoldLines` (pngjs) + upload no Storage antes de responder.

## Mudanças

### 1. Streaming SSE da OpenAI → cliente (maior ganho de UX percebida)
A OpenAI suporta `stream: true` + `partial_images: 2` em `/v1/images/edits` e `/v1/images/generations` com `gpt-image-2`. Mudanças:

- Edge function envia `stream: true, partial_images: 2` no body (multipart aceita esses campos).
- Em vez de `await response.json()`, a function devolve `new Response(response.body, { headers: { ...cors, "Content-Type": "text/event-stream" } })` — proxy puro do SSE.
- Cliente passa a usar `fetch` direto na URL da function (não `supabase.functions.invoke`, que bufferiza) e parseia eventos com `eventsource-parser`.
- UI mostra cada `image_generation.partial_image` como `<img>` com `filter: blur(16px)`; no `image_generation.completed` remove o blur.

Resultado: primeiro preview em ~5–10s, final em ~25–40s. A espera deixa de ser "tela morta".

### 2. Baixar `quality` de `high` para `medium`
`gpt-image-2` em `medium` é ~2x mais rápido e já entrega fidelidade ótima para molde decorado (linhas técnicas são re-estampadas depois pelo `compositeMoldLines`). Aplicar em `gerar-arte` e `gerar-mockup`.

### 3. Composição + upload em background
Hoje a function só responde após compositar PNG e fazer upload. Mudança:

- Assim que o evento `completed` chega, o cliente já tem o b64 final e renderiza.
- Composição (`compositeMoldLines`) e upload no Storage rodam em `EdgeRuntime.waitUntil(...)`.
- Gravar a `imageUrl` final numa tabela `artes_geradas` (criar se não existir) chaveada por um `jobId` gerado no início; cliente faz Realtime subscribe nessa linha para receber a URL pública quando ficar pronta (necessária só para "Salvar" / "Baixar PDF").

### 4. Toggle "Rascunho rápido" no wizard
Adicionar opção no passo final: **Rascunho** (`quality: "low"`, ~10–15s) vs **Final** (`quality: "medium"`). Permite iterar tema/cor barato antes do render final.

### 5. Mesma migração em `gerar-mockup`
Aplicar streaming + `medium` + composição/upload em background no `gerar-mockup` também (mesmo sintoma hoje, e ainda está sem `quality` explícito).

## Arquivos afetados

- `supabase/functions/gerar-arte/index.ts` — adicionar `stream`+`partial_images`, retornar SSE proxy, mover composição/upload pra `waitUntil`, aceitar param `quality`.
- `supabase/functions/gerar-mockup/index.ts` — mesmas mudanças.
- `src/pages/Criar.tsx` (e qualquer outro consumidor) — trocar `invoke` por `fetch` streaming, parser SSE, estado `previewDataUrl`+`isFinal`, blur CSS, toggle Rascunho/Final, subscribe Realtime para URL final.
- Nova tabela `artes_jobs` (id, user_id, image_url, status) + RLS + GRANTs, ou reuso de tabela existente se já houver.
- `package.json` — adicionar `eventsource-parser`.

## Riscos

- `partial_images` no endpoint `/images/edits` com multipart: confirmar no primeiro deploy lendo o stream; se a OpenAI não emitir parciais em edits, manter pelo menos `stream: true` (chega só o `completed`, mas evita timeout de Edge Function e o ganho do `medium` já reduz bastante o tempo).
- Realtime na tabela de jobs exige RLS correto — usuário só vê suas próprias linhas.

## Fora de escopo
- Trocar modelo (Gemini/Nano Banana muda muito o estilo).
- Cache de artes idênticas.
