## Objetivo

Garantir que a arte gerada respeite **exatamente** o molde escolhido — sem alterar contorno, abas, linhas de corte ou linhas de dobra. Mantemos `gpt-image-2` da OpenAI.

## Mudanças

Tudo em **`supabase/functions/gerar-arte/index.ts`** (sem alterações no frontend).

### 1. Prompt reescrito em modo "edit-in-place"

Substituir o prompt atual (que pede "desenhe o molde planificado") por um que trata a imagem de entrada como **estrutura travada**:

- "A imagem que você recebeu JÁ É o molde final."
- "NÃO redesenhe. NÃO altere contorno, abas, proporções."
- "PRESERVE linhas de corte (contínuas) e dobra (pontilhadas) idênticas."
- "Aplique decoração APENAS dentro das faces internas."
- "PRESERVE o fundo branco fora do contorno."

Mesma regra aplicada ao `fallbackPrompt` (acionado quando moderação bloqueia).

### 2. Aumentar fidelidade da chamada `/images/edits`

Adicionar ao FormData:
- `input_fidelity: "high"` — parâmetro do `gpt-image-2` que prioriza preservação da entrada.
- `quality: "high"` — melhor renderização das linhas.

### 3. Composição final com máscara (garantia determinística)

Após receber a imagem da OpenAI, pós-processar na edge function:

1. Decodificar o template PNG original (usando `pngjs` via `npm:` import).
2. Decodificar a imagem gerada.
3. Para cada pixel do template que seja **escuro e opaco** (luminância < 110, alpha > 200) — ou seja, uma linha do molde — sobrescrever o pixel correspondente da imagem gerada (com nearest-neighbor para casar dimensões diferentes).
4. Recodificar PNG e usar como resultado final.

Isso garante que **mesmo se o modelo suavizar as linhas**, o contorno/dobras/abas originais reaparecem intactos por cima.

Só roda se o template for PNG válido; caso contrário, silenciosamente usa a saída crua da IA (sem regressão).

### 4. Pipeline de upload ajustado

Subir os **bytes finais compostos** para o bucket `artes-geradas` (em vez do base64 cru da OpenAI), e devolver `imageUrl` + `imageBase64` derivados desses bytes.

## Detalhes técnicos

- Import: `import { PNG } from "https://esm.sh/pngjs@7.0.0?target=deno"` (pura JS, roda em Deno Deploy, sem deps nativas).
- A função de composição é O(W×H) — para 1024×1536 são ~1.5M pixels, executa em <500 ms.
- Mantém o fluxo existente de detecção de `moderation_blocked` → fallback prompt seguro.
- Mantém todos os parâmetros atuais da request (`moldeName`, `moldeTemplateUrl`, `temaNome`, etc.) — frontend não muda.

## Como validar

1. Gerar arte com `Caixa Milk` + tema `Safari` + nome `Maria`.
2. Conferir que o PNG retornado tem **as mesmas linhas pretas** do template `mold-milk-box.png` (contorno + dobras pontilhadas) sobrepostas à decoração.
3. Testar com tema bloqueado (ex.: `Mickey`) para confirmar que o fallback também preserva o molde.
