import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveMockupPersona, type PartyAudience } from "../_shared/mockup-persona.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// O mockup roda como job em background na OpenAI (Responses API): o "start"
// cria o job e devolve o id; o front consulta "status" até a imagem ficar
// pronta. Mesmo modelo do gerar-arte — nenhuma conexão fica presa esperando.

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isModerationError = (text: string) =>
  /moderation_blocked|content_policy|safety/i.test(text);

function getProductGeometry(moldeName: string): string {
  const normalized = moldeName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/milk/.test(normalized)) {
    return "caixa vertical inspirada em embalagem de leite: corpo retangular alto e topo gable fechado com duas águas dobradas; sem alça, sem abertura vazada e sem tampa separada";
  }
  if (/gable|lunch box/.test(normalized)) {
    return "caixa gable vertical com duas abas superiores formando uma alça vazada central, laterais trapezoidais e base retangular";
  }
  if (/bala/.test(normalized)) {
    return "caixa bala horizontal, corpo central alongado e extremidades fechadas como papel de bala, simétricas e bem definidas; sem alça";
  }
  if (/piramide/.test(normalized)) {
    return "caixa pirâmide de base quadrada, quatro faces triangulares unidas no topo e fechamento delicado; sem alça rígida";
  }
  if (/cone/.test(normalized)) {
    return "cone de papel vertical com ponta inferior e abertura circular superior, usado para doces; sem faces retangulares";
  }
  if (/cubo/.test(normalized)) {
    return "caixa cúbica com seis faces quadradas, tampa fechada e arestas retas; sem alça";
  }
  if (/hexagonal|sextavada/.test(normalized)) {
    return "caixa vertical de seção hexagonal, seis faces laterais iguais e tampa hexagonal; sem alça";
  }
  if (/travesseiro/.test(normalized)) {
    return "caixa pillow horizontal, corpo levemente curvo e duas abas laterais arqueadas fechadas; sem tampa e sem alça";
  }
  if (/fatia/.test(normalized)) {
    return "caixa em formato de fatia triangular de bolo, baixa, com ponta frontal e fundo largo; sem alça";
  }
  if (/maleta/.test(normalized)) {
    return "caixa maleta retangular, baixa e larga, com fechamento superior e pequena alça integrada proporcional";
  }
  if (/casinha/.test(normalized)) {
    return "caixa casinha vertical com paredes retas e telhado de duas águas claramente fechado";
  }
  if (/coracao/.test(normalized)) {
    return "caixa baixa em formato de coração, com base e tampa acompanhando exatamente o contorno curvo; sem alça";
  }
  if (/gaveta/.test(normalized)) {
    return "caixa gaveta horizontal com luva externa e gaveta interna discretamente aparente; sem alça superior";
  }
  if (/pipoca/.test(normalized)) {
    return "caixa de pipoca alta, base estreita e abertura superior larga com quatro faces trapezoidais; sem tampa e sem alça";
  }
  if (/sacolinha|sacola/.test(normalized)) {
    return "sacola de papel vertical com laterais sanfonadas e duas alças finas proporcionais no topo";
  }
  return `produto de papel no formato comercial reconhecível de ${moldeName}, seguindo sua estrutura real e sem adicionar alças, vazados ou tampas que não pertençam ao modelo`;
}

interface QualityReview {
  approved: boolean;
  score: number;
  geometry_ok: boolean;
  personalization_ok: boolean;
  product_prominence_ok: boolean;
  scene_ok: boolean;
  finish_ok: boolean;
  issues: string[];
  correction_prompt: string;
}

function responseOutputText(response: Record<string, any>): string {
  return ((response.output ?? []) as Array<Record<string, any>>)
    .filter((item) => item.type === "message")
    .flatMap((item) => Array.isArray(item.content) ? item.content : [])
    .filter((item) => item?.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n");
}

async function reviewMockup(
  imageBase64: string,
  context: { moldeName: string; temaNome: string; nome: string; idade: string; formato: string; partyAudience?: PartyAudience },
  OPENAI_API_KEY: string,
): Promise<QualityReview | null> {
  const geometry = getProductGeometry(context.moldeName);
  const persona = resolveMockupPersona(context.temaNome, context.idade, context.partyAudience ?? "auto");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5.4-mini",
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 900,
      instructions: `Você é o curador final de um estúdio brasileiro de papelaria personalizada. Avalie com rigor de fotografia publicitária profissional. Reprove erros pequenos de geometria, texto, recorte, material, iluminação, composição ou adequação ao público da festa. Aprove somente com nota mínima 90 e todos os critérios booleanos verdadeiros.`,
      input: [{
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Avalie este mockup de divulgação.\nProduto: ${context.moldeName}.\nTema: ${context.temaNome}.\nPúblico obrigatório: ${persona.label}.\nRegra de público: ${persona.reviewRule}\nGeometria obrigatória: ${geometry}.\nNome exato: ${context.nome || "sem nome"}.\nIdade exata: ${context.idade || "sem idade"}.\nFormato: ${context.formato === "story" ? "vertical 9:16" : "quadrado 1:1"}.\nO produto deve estar inteiro, em foco e ser inequivocamente o elemento principal. A maior dimensão visível do produto deve ocupar aproximadamente 65% a 90% do quadro, com margem suficiente para não cortar nenhuma parte; avalie a proporção conforme a geometria, sem exigir que produtos altos e estreitos ocupem a mesma área de produtos largos. O cenário deve parecer uma festa real, sem linhas técnicas, textos sobrepostos, marcas d'água, mãos ou deformações. Gere um correction_prompt curto e acionável mesmo quando aprovado.`,
          },
          { type: "input_image", image_url: `data:image/png;base64,${imageBase64}`, detail: "high" },
        ],
      }],
      text: {
        format: {
          type: "json_schema",
          name: "mockup_quality_review",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              approved: { type: "boolean" },
              score: { type: "integer", minimum: 0, maximum: 100 },
              geometry_ok: { type: "boolean" },
              personalization_ok: { type: "boolean" },
              product_prominence_ok: { type: "boolean" },
              scene_ok: { type: "boolean" },
              finish_ok: { type: "boolean" },
              issues: { type: "array", items: { type: "string" }, maxItems: 6 },
              correction_prompt: { type: "string" },
            },
            required: [
              "approved",
              "score",
              "geometry_ok",
              "personalization_ok",
              "product_prominence_ok",
              "scene_ok",
              "finish_ok",
              "issues",
              "correction_prompt",
            ],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    console.warn("Mockup quality review failed:", response.status, await response.text().catch(() => ""));
    return null;
  }

  try {
    const parsed = JSON.parse(responseOutputText(await response.json())) as QualityReview;
    const allCriteria = parsed.geometry_ok && parsed.personalization_ok && parsed.product_prominence_ok && parsed.scene_ok && parsed.finish_ok;
    return {
      ...parsed,
      approved: parsed.approved && parsed.score >= 90 && allCriteria,
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 6) : [],
    };
  } catch (error) {
    console.warn("Mockup quality review parse failed:", error);
    return null;
  }
}

async function storeMockup(bytes: Uint8Array) {
  const base64 = `data:image/png;base64,${bytesToBase64(bytes)}`;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const fileName = `mockup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
  const filePath = `public/${fileName}`;
  const { error } = await supabase.storage
    .from("artes-geradas")
    .upload(filePath, bytes, { contentType: "image/png", upsert: false });
  if (error) {
    console.error("upload error:", error);
    return { mockupUrl: null, mockupBase64: base64 };
  }
  const { data } = supabase.storage.from("artes-geradas").getPublicUrl(filePath);
  return { mockupUrl: data.publicUrl, mockupBase64: base64 };
}

async function handleStart(body: Record<string, unknown>, OPENAI_API_KEY: string) {
  const {
    arteImageUrl,
    moldeName,
    temaNome,
    nome,
    idade,
    formato,
    quality: qualityRaw,
    safeMode,
    partyAudience,
    qualityRetry,
  } = body as Record<string, any>;

  if (
    typeof arteImageUrl !== "string" ||
    !/^(https?:|data:image)/.test(arteImageUrl) ||
    !moldeName ||
    !temaNome
  ) {
    return jsonResponse({ error: "Campos obrigatórios: arteImageUrl, moldeName, temaNome" }, 400);
  }

  const quality = qualityRaw === "low" ? "low" : qualityRaw === "high" ? "high" : "medium";

  const formatoDesc = formato === "story"
    ? "formato vertical 9:16 para Stories do Instagram"
    : "formato quadrado 1:1 para Feed do Instagram";

  const personalizacao = [nome && `nome "${nome}"`, idade && `idade "${idade}"`]
    .filter(Boolean)
    .join(" e ");

  const productGeometry = getProductGeometry(String(moldeName));
  const persona = resolveMockupPersona(String(temaNome), typeof idade === "string" ? idade : "", partyAudience ?? "auto");

  const themeDescription = safeMode
    ? "com a identidade visual exata da imagem anexa"
    : `com o tema "${temaNome}"`;
  const safeModeRule = safeMode
    ? "- Nao identifique, descreva ou recrie personagens da referencia. Preserve os pixels da arte anexa e limite a geracao ao volume de papel, iluminacao e cenario generico coordenado."
    : "- Preserve todos os personagens e elementos tematicos exatamente como aparecem na referencia.";
  const qualityRetryRule = qualityRetry
    ? `- Esta é uma segunda tentativa porque a curadoria rejeitou o cenário anterior. Priorize rigorosamente a linguagem de ${persona.label}, aumente os sinais visuais de festa e elimine qualquer elemento proibido para esse público.`
    : "";

  const prompt = `Crie uma fotografia publicitária realista de papelaria personalizada para redes sociais (${formatoDesc}).

PRODUTO PRINCIPAL: ${moldeName} finalizado, montado e pronto para entrega, ${themeDescription}${personalizacao ? `, com ${personalizacao}` : ""}.

REFERÊNCIA OBRIGATÓRIA:
- A imagem anexa é a arte final aprovada vinda do acervo do Drive e deve ser reutilizada como textura de impressão do produto.
- Esta é uma tarefa de montagem de mockup, não de criação ou redesenho de arte.
- Não crie outra estampa, não redesenhe personagens, não troque ilustrações ou ornamentos e não altere paleta, nome ou idade.
- Trate a planificação fornecida como mapa de superfície. A IA deve criar somente o volume tridimensional, os materiais, a iluminação e o cenário.
- O nome e a idade da referência devem permanecer legíveis e escritos exatamente como no arquivo aprovado.
${safeModeRule}
${qualityRetryRule}

CONSTRUÇÃO DO PRODUTO:
- Converta o molde planificado no ${moldeName} tridimensional correto, respeitando o padrão real de papelaria personalizada.
- Geometria obrigatória: ${productGeometry}.
- Mostre apenas dobras, tampas, abas ou alças que realmente pertençam a esse modelo; não misture estruturas de outros moldes.
- Aplique cada parte da arte nas faces correspondentes, sem linhas de corte ou vinco visíveis no produto montado.
- Mostre uma unidade principal grande, inteira e nítida, em ângulo de três quartos; a maior dimensão do produto deve ocupar cerca de 65% a 88% do quadro, respeitando a proporção real do molde e sem cortes.
- O produto deve ser o ponto de maior contraste e nitidez, sem ficar escondido por doces, balões ou outros objetos.

CENÁRIO FICTÍCIO:
- Público e linguagem visual obrigatórios: ${persona.label}.
- ${persona.sceneDirection}
- ${persona.forbiddenDirection}
- Monte uma mesa de aniversário verossímil inspirada no tema, sem reproduzir uma festa existente.
- Use bolo, bandejas, doces, balões e pequenos elementos de decoração coordenados com a paleta da arte.
- Fundo com profundidade suave e decoração reconhecível; produto principal totalmente em foco.
- Fotografia editorial premium, iluminação natural difusa, materiais de papel reais, acabamento limpo e sombras coerentes.
- Composição pronta para anúncio: margem visual adequada, sem cortar o produto e sem áreas vazias excessivas.

NÃO INCLUIR:
- textos sobrepostos, legendas, marcas d'água, molduras ou logos;
- mãos, pessoas em destaque ou objetos cobrindo a caixa;
- molde aberto/planificado, linhas técnicas, deformações, texto ilegível ou personalização diferente da referência;
- várias cópias competindo com o produto principal.`;

  const size = formato === "story" ? "1024x1536" : "1024x1024";

  const content: Array<Record<string, unknown>> = [
    { type: "input_text", text: prompt },
    { type: "input_image", image_url: arteImageUrl, detail: "high" },
  ];

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5.4-mini",
      background: true,
      store: true,
      input: [{ role: "user", content }],
      tools: [{
        type: "image_generation",
        model: "gpt-image-2",
        size,
        quality,
        moderation: "low",
        action: "edit",
      }],
      tool_choice: { type: "image_generation" },
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("OpenAI create error:", res.status, txt);
    if (res.status === 429) {
      return jsonResponse({ error: "Muitas requisições. Aguarde alguns segundos." }, 429);
    }
    return jsonResponse({ error: `Erro no serviço de IA: ${res.status}` }, 500);
  }

  const job = await res.json();
  if (!job?.id) {
    console.error("OpenAI create sem id:", JSON.stringify(job).slice(0, 400));
    return jsonResponse({ error: "A IA não iniciou o mockup. Tente novamente." }, 500);
  }

  console.log("Mockup job criado:", job.id, "status:", job.status);
  return jsonResponse({ jobId: job.id });
}

async function handleStatus(body: Record<string, unknown>, OPENAI_API_KEY: string) {
  const jobId = typeof body.jobId === "string" ? body.jobId : "";
  if (!/^resp_[a-zA-Z0-9_-]+$/.test(jobId)) {
    return jsonResponse({ error: "jobId inválido" }, 400);
  }

  const res = await fetch(`https://api.openai.com/v1/responses/${jobId}`, {
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("OpenAI poll error:", res.status, txt);
    return jsonResponse({ error: `Erro ao consultar o mockup: ${res.status}` }, 500);
  }
  const job = await res.json();

  if (job.status === "queued" || job.status === "in_progress") {
    return jsonResponse({ status: "processing" });
  }

  if (job.status !== "completed") {
    const errText = JSON.stringify(job.error ?? job.incomplete_details ?? {});
    console.error("Mockup job não completou:", job.status, errText);
    if (isModerationError(errText)) {
      return jsonResponse({
        status: "error",
        error: "A API não conseguiu montar o mockup preservando a arte original. Nenhuma arte substituta foi criada.",
        code: "MOCKUP_SOURCE_PRESERVATION_FAILED",
      });
    }
    return jsonResponse({ status: "error", error: "A IA não conseguiu gerar o mockup. Tente novamente." });
  }

  const output = (job.output ?? []) as Array<Record<string, any>>;
  const call = output.find((o) => o.type === "image_generation_call" && o.status === "completed");
  const b64 = typeof call?.result === "string" ? call.result : null;
  if (!b64) {
    const imageCallFailed = output.some((item) => item.type === "image_generation_call" && item.status === "failed");
    console.error("Mockup completou sem imagem:", JSON.stringify(output.map((o) => ({ type: o.type, status: o.status }))));
    if (imageCallFailed) {
      return jsonResponse({
        status: "error",
        error: "A API não conseguiu montar o mockup preservando a arte original. Nenhuma arte substituta foi criada.",
        code: "MOCKUP_SOURCE_PRESERVATION_FAILED",
      });
    }
    return jsonResponse({ status: "error", error: "A IA não retornou o mockup. Tente novamente." });
  }

  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const moldeName = typeof body.moldeName === "string" ? body.moldeName : "";
  const qualityContext = {
    moldeName,
    temaNome: typeof body.temaNome === "string" ? body.temaNome : "",
    nome: typeof body.nome === "string" ? body.nome : "",
    idade: typeof body.idade === "string" ? body.idade : "",
    formato: body.formato === "story" ? "story" : "feed",
    partyAudience: body.partyAudience === "infantil" || body.partyAudience === "teen" || body.partyAudience === "adulto"
      ? body.partyAudience
      : "auto",
  };

  const qualityReview = moldeName
    ? await reviewMockup(b64, qualityContext, OPENAI_API_KEY)
    : null;

  if (qualityReview && !qualityReview.approved) {
    console.warn("Mockup rejeitado pela curadoria:", qualityReview.score, qualityReview.issues.join(" | "));
    return jsonResponse({
      status: "error",
      error: "A foto não atingiu o padrão de cenário, montagem e público da festa. Nenhuma versão inadequada foi entregue.",
      code: "MOCKUP_QUALITY_REJECTED",
      qualityReview,
    });
  }

  const stored = await storeMockup(bytes);
  return jsonResponse({
    status: "done",
    ...stored,
    qualityReview,
    partyPersona: resolveMockupPersona(qualityContext.temaNome, qualityContext.idade, qualityContext.partyAudience).key,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const body = (await req.json()) as Record<string, unknown>;

    if (body.action === "status") {
      return await handleStatus(body, OPENAI_API_KEY);
    }
    return await handleStart(body, OPENAI_API_KEY);
  } catch (error) {
    console.error("gerar-mockup error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
