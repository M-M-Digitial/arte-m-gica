import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
// imagescript é nativa de Deno — o pngjs via esm.sh falhava em runtime no
// edge (PNG.sync.read), e máscara + carimbo eram pulados em silêncio.
import { compositeMoldLines, buildEditMask, buildEditMaskFromInteriorMask } from "../_shared/mold-image.ts";
import { ART_EDITOR_INSTRUCTIONS, buildArtGenerationPrompt } from "../_shared/art-prompt.ts";
import { reviewGeneratedArt } from "../_shared/art-curator.ts";
import { bytesToBase64 } from "../_shared/image-bytes.ts";
import { normalizeCreativeBrief, cleanBriefText } from "../_shared/art-direction.ts";
import { buildArtLayout, type ArtLayout } from "../_shared/art-layout.ts";
import { IMAGE_MODELS, imageModelFor, imageOutputSize } from "../_shared/image-models.ts";
import { packJobContext, unpackJobContext } from "../_shared/art-job-context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COTA_MENSAL = 30; // artes com IA por usuário/mês (admins: ilimitado)

// A geração roda como job em background na OpenAI (Responses API): o "start"
// cria o job e devolve o id; o front consulta "status" até a imagem ficar
// pronta. Nenhuma requisição fica presa esperando a IA — o fluxo antigo de
// stream morria quando a conexão edge→OpenAI caía no silêncio antes do final.


const normalizeTheme = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const themeStoryDirections: Array<[RegExp, string]> = [
  [/safari|selva|savana/, "savana infantil ao ar livre com animais baby reconheciveis, como girafa, leao, elefante ou zebra, folhagem, acacias, ceu e terra quente; proibido usar biblioteca, livros, sala de estudo ou ambiente interno"],
  [/era.*gelo|gelo/, "paisagem gelada ao ar livre com neve, geleiras, ceu azul e elenco variado do tema; proibido usar sala interna ou floresta tropical"],
  [/jardim|floral|borboleta|boho/, "jardim encantado com flores em escalas variadas, folhas, borboletas e profundidade delicada"],
  [/mar|sereia|oceano|fundo.*mar/, "cenario submarino com ondas, corais, bolhas, conchas e fauna marinha em camadas"],
  [/fazenda|fazendinha|arraia|junina/, "cenario rural festivo com madeira, cerca, vegetacao, bandeirolas ou elementos de fazenda coerentes"],
  [/astronauta|espaco|galaxia/, "cenario espacial com planetas, estrelas, foguete e profundidade cosmica, mantendo leitura infantil"],
  [/dinossauro/, "paisagem pre-historica com vegetacao, rochas, vulcao distante e dinossauros em escalas variadas"],
  [/circo/, "picadeiro infantil com lona, luzes, estrelas, bandeirolas e personagens circenses em camadas"],
  [/princesa|bela.*fera|conto.*fada|castelo/, "conto de fadas com castelo, jardim, ornamentos elegantes e brilho controlado, sem perder o foco infantil"],
  [/carro|corrida|hot.*wheel/, "pista de corrida dinamica com bandeira quadriculada, curvas, velocidade e contraste forte"],
  [/heroi|vingador|aranha|batman/, "cidade em perspectiva com acao em quadrinhos, raios, formas dinamicas e foco heroico"],
  [/baby.*shark|tubarao/, "fundo do mar infantil com familia de tubaroes, corais, bolhas e agua azul ou rosa conforme a variante escolhida"],
];

const getThemeStoryDirection = (temaNome: string) => {
  const normalized = normalizeTheme(temaNome);
  const matched = themeStoryDirections.find(([pattern]) => pattern.test(normalized));
  return matched?.[1]
    ?? `interprete literalmente o tema "${temaNome}" e use somente personagens, cenario, objetos e simbolos que o tornem reconhecivel em ate dois segundos; nao invente ambiente de outro tema`;
};




const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });


const isModerationError = (text: string) =>
  /moderation_blocked|content_policy|safety/i.test(text);

const MAX_ALICE_REFERENCE_IMAGES = 8;
const MAX_ALICE_REFERENCE_BYTES = 8 * 1024 * 1024;

type AliceReferenceCandidate = {
  url: string;
  kind: string;
  role: string;
};

type AliceReferenceImage = AliceReferenceCandidate & {
  dataUrl: string;
};

const normalizeLibraryKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const slugifyTheme = (value: string) =>
  normalizeLibraryKey(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function isAliceStorageUrl(value: string, supabaseUrl: string): boolean {
  try {
    const candidate = new URL(value);
    const origin = new URL(supabaseUrl).origin;
    return candidate.protocol === "https:"
      && candidate.origin === origin
      && candidate.pathname.startsWith("/storage/v1/object/public/");
  } catch {
    return false;
  }
}

function orderAliceCandidates(candidates: AliceReferenceCandidate[]) {
  const rank = (candidate: AliceReferenceCandidate) => {
    if (candidate.kind === "papel" && candidate.role === "body") return 0;
    if (candidate.kind === "papel" && candidate.role === "top") return 1;
    if (candidate.kind === "clipart" && candidate.role === "principal") return 2;
    if (candidate.kind === "clipart") return 3;
    if (candidate.kind === "placa") return 4;
    return 5;
  };

  const seen = new Set<string>();
  return candidates
    .filter((candidate) => {
      if (!candidate.url || seen.has(candidate.url)) return false;
      seen.add(candidate.url);
      return true;
    })
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, MAX_ALICE_REFERENCE_IMAGES);
}

async function loadAliceReferenceImages(
  adminDb: any,
  temaNome: string,
  supabaseUrl: string,
): Promise<{ themeSlug: string; images: AliceReferenceImage[] }> {
  const { data: themeRows, error: themeError } = await adminDb
    .from("modelos_prontos_temas")
    .select("slug,name");
  if (themeError) console.warn("Alice theme lookup failed:", themeError.message);

  const themeKey = normalizeLibraryKey(temaNome);
  const exactTheme = (themeRows ?? []).find(
    (row: { name?: string }) => normalizeLibraryKey(row.name ?? "") === themeKey,
  );
  // Never silently substitute another variant (e.g. Baby Shark rosa/azul).
  const relatedTheme = exactTheme;
  const themeSlug = relatedTheme?.slug ?? slugifyTheme(temaNome);

  const { data: assets, error: assetsError } = await adminDb
    .from("tema_assets")
    .select("url,kind,role")
    .eq("theme_slug", themeSlug);

  if (assetsError) console.warn("Alice asset lookup failed:", assetsError.message);

  const candidates: AliceReferenceCandidate[] = [];
  for (const asset of orderAliceCandidates(
    ((assets ?? []) as Array<{ url?: string; kind?: string; role?: string | null }>)
      .filter((asset) => asset.url)
      .map((asset) => ({
        url: asset.url!,
        kind: asset.kind ?? "asset",
        role: asset.role ?? "",
      })),
  )) {
    candidates.push(asset);
  }

  const ordered = orderAliceCandidates(candidates).filter((candidate) =>
    isAliceStorageUrl(candidate.url, supabaseUrl),
  );

  const images = (await Promise.all(ordered.map(async (candidate) => {
    try {
      const response = await fetch(candidate.url, { headers: { Accept: "image/*" }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) {
        console.warn("Alice reference fetch failed:", response.status, candidate.url);
        return null;
      }

      const contentType = (response.headers.get("content-type") ?? "")
        .split(";", 1)[0]
        .trim()
        .toLowerCase();
      if (!/^(image\/(png|jpeg|webp|gif))$/.test(contentType)) {
        console.warn("Alice reference ignored: unsupported content type", contentType);
        return null;
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength === 0 || bytes.byteLength > MAX_ALICE_REFERENCE_BYTES) {
        console.warn("Alice reference ignored: invalid size", bytes.byteLength);
        return null;
      }

      return {
        ...candidate,
        dataUrl: `data:${contentType};base64,${bytesToBase64(bytes)}`,
      } satisfies AliceReferenceImage;
    } catch (error) {
      console.warn("Alice reference fetch error:", error);
      return null;
    }
  }))).filter((image): image is AliceReferenceImage => Boolean(image));

  return { themeSlug, images };
}

// ---- START: cria o job em background na OpenAI ----
async function handleStart(body: Record<string, unknown>, OPENAI_API_KEY: string) {
  const { moldeName, temaNome, temaColors, nome, idade, frase, corDominante, fonteEstilo, desenhoEstilo, densidadeVisual, quality: qualityRaw, qualityRetry, qualityCorrection } = body as Record<string, any>;

  const quality = qualityRaw === "low" ? "low" : "high";

  if (!moldeName || !temaNome || !nome) {
    return jsonResponse({ error: "Campos obrigatórios: moldeName, temaNome, nome" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminDb = createClient(supabaseUrl, supabaseKey);

  // ---- COTA MENSAL (admins ilimitado) ----
  const userId = body.__userId as string;
  const userEmail = body.__userEmail as string;
  if (userId) {
    const { data: roleRow } = await adminDb
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      const inicioMes = new Date();
      inicioMes.setUTCDate(1); inicioMes.setUTCHours(0, 0, 0, 0);
      const { count } = await adminDb
        .from("geracoes_ia")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", inicioMes.toISOString());
      if ((count ?? 0) >= COTA_MENSAL) {
        return jsonResponse({
          error: `Você já usou suas ${COTA_MENSAL} artes com IA deste mês! Elas renovam dia 1º. Enquanto isso, o Compositor de Kits é ilimitado 💖`,
          code: "QUOTA_EXCEEDED",
        });
      }
    }
  }

  const aliceLibrary = await loadAliceReferenceImages(adminDb, temaNome, supabaseUrl);
  const aliceReferences = aliceLibrary.images;
  const hasAliceReferences = aliceReferences.length > 0;

  const brief = normalizeCreativeBrief({
    ...((body.creativeBrief ?? {}) as Record<string, unknown>),
    density: densidadeVisual,
    drawing: desenhoEstilo,
  });
  const editable = body.editablePersonalization === true;
  let artLayout: ArtLayout | null = null;
  const { data: moldRecord } = await adminDb.from("moldes")
    .select("template_png_url,mask_url,faces_url").eq("name", moldeName).maybeSingle();
  const moldeTemplateUrl = moldRecord?.template_png_url;
  const moldeMaskUrl = moldRecord?.mask_url;
  if (!moldeTemplateUrl || !isAliceStorageUrl(moldeTemplateUrl, supabaseUrl)) {
    return jsonResponse({ error: "Gabarito oficial indisponivel para este molde." }, 400);
  }
  if (editable) {
    if (!moldRecord?.faces_url || !isAliceStorageUrl(moldRecord.faces_url, supabaseUrl)) {
      return jsonResponse({ error: "Este molde ainda nao tem um mapa seguro para personalizacao editavel.", code: "MOLD_LAYOUT_MISSING" }, 400);
    }
    const faceResponse = await fetch(moldRecord.faces_url, { signal: AbortSignal.timeout(15000) });
    if (!faceResponse.ok) throw new Error("Nao foi possivel carregar as faces do molde.");
    const faceData = await faceResponse.json();
    artLayout = buildArtLayout({ width: faceData.W, height: faceData.H, faces: faceData.faces }, moldeName);
  }
  const themeStoryDirection = getThemeStoryDirection(String(temaNome));
  const colors = Array.isArray(temaColors) ? temaColors.filter((c: unknown) => typeof c === "string" && /^#[a-f0-9]{6}$/i.test(c)).slice(0, 6) : [];
  const colorsDesc = `Paleta do tema: ${colors.join(", ")}. Cor de destaque: ${/^#[a-f0-9]{6}$/i.test(corDominante ?? "") ? corDominante : "coordenada com o tema"}.`;
  if (!hasAliceReferences) {
    return jsonResponse({ error: "Nao encontramos referencias visuais utilizaveis da Alice para este tema. Nenhuma arte generica foi gerada.", code: "ALICE_REFERENCES_MISSING" }, 400);
  }

  // Baixa o template do molde
  let templateBytes: Uint8Array | null = null;
  let outputSize = "1024x1536";
  if (moldeTemplateUrl) {
    try {
      const tmplRes = await fetch(moldeTemplateUrl, { signal: AbortSignal.timeout(15000) });
      if (tmplRes.ok) {
        const buf = new Uint8Array(await tmplRes.arrayBuffer());
        templateBytes = buf;
        let w = 0, h = 0;
        if (buf[0] === 0x89 && buf[1] === 0x50) {
          w = (buf[16] << 24) | (buf[17] << 16) | (buf[18] << 8) | buf[19];
          h = (buf[20] << 24) | (buf[21] << 16) | (buf[22] << 8) | buf[23];
        } else if (buf[0] === 0xff && buf[1] === 0xd8) {
          let i = 2;
          while (i < buf.length) {
            if (buf[i] !== 0xff) break;
            const marker = buf[i + 1];
            const len = (buf[i + 2] << 8) | buf[i + 3];
            if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
              h = (buf[i + 5] << 8) | buf[i + 6];
              w = (buf[i + 7] << 8) | buf[i + 8];
              break;
            }
            i += 2 + len;
          }
        }
        if (w > 0 && h > 0) {
          const ratio = w / h;
          outputSize = imageOutputSize(w, h, quality);
          console.log(`Template ${w}x${h} ratio=${ratio.toFixed(2)} -> output ${outputSize}`);
        }
      } else {
        console.warn("Template fetch failed:", tmplRes.status);
      }
    } catch (e) {
      console.warn("Template fetch error:", e);
    }
  }

  // Prefer the mask generated from the real mold geometry. The old
  // flood-fill fallback leaks through dashed fold lines on several molds.
  let maskDataUrl: string | null = null;
  let interiorMaskBytes: Uint8Array | null = null;
  if (typeof moldeMaskUrl === "string" && isAliceStorageUrl(moldeMaskUrl, supabaseUrl)) {
    try {
      const maskRes = await fetch(moldeMaskUrl, { headers: { Accept: "image/*" } });
      if (maskRes.ok) interiorMaskBytes = new Uint8Array(await maskRes.arrayBuffer());
      else console.warn("Mold mask fetch failed:", maskRes.status);
    } catch (e) {
      console.warn("Mold mask fetch error:", e);
    }
  }
  if (templateBytes && templateBytes[0] === 0x89 && templateBytes[1] === 0x50) {
    try {
      const maskBytes = interiorMaskBytes
        ? await buildEditMaskFromInteriorMask(interiorMaskBytes, templateBytes)
        : await buildEditMask(templateBytes);
      if (maskBytes) {
        maskDataUrl = `data:image/png;base64,${bytesToBase64(new Uint8Array(maskBytes))}`;
        console.log("Edit mask built.");
      }
    } catch (e) {
      console.warn("Failed to build edit mask; continuing without it:", e);
    }
  }

  if (!templateBytes || !maskDataUrl) {
    return jsonResponse({ error: "Gabarito ou mascara tecnica indisponivel; geracao interrompida antes de consumir IA.", code: "MOLD_TEMPLATE_MISSING" }, 400);
  }
  const usedSafeFallback = false;
  const curatorCorrection = cleanBriefText(qualityCorrection, 900);
  const activePrompt = buildArtGenerationPrompt({ moldeName, temaNome, themeStoryDirection, colorsDesc, brief, editable, artLayout, nome, idade, frase, fonteEstilo, qualityRetry, curatorCorrection });

  const createJob = async (withMask: boolean) => {
    const content: Array<Record<string, unknown>> = [{ type: "input_text", text: activePrompt }];
    if (templateBytes) {
      content.push({
        type: "input_image",
        image_url: `data:image/png;base64,${bytesToBase64(templateBytes)}`,
        detail: "high",
      });
    }
    if (aliceReferences.length > 0) {
      content.push({
        type: "input_text",
        text: "COMPONENTES VISUAIS DISPONIVEIS NO ACERVO ALICE: use os personagens para identidade do tema, mas nunca use a arte final como planta de composicao. Construa um layout inedito e altere pelo menos tres decisoes estruturais em relacao a qualquer referencia conhecida: construcao do fundo, cores, ordem das funcoes por face, agrupamento/escala dos personagens, moldura da personalizacao, elementos de cenario ou padrao de acabamento. Nao trace, nao reconstrua e nao faca colagem literal de kit pronto.",
      });
      for (const reference of aliceReferences) {
        content.push({
          type: "input_text",
          text: `REFERENCIA ALICE DO TEMA "${temaNome}": tipo ${reference.kind}, funcao ${reference.role || "apoio"}. Interprete conforme essa funcao; papel e cenario nao sao personagem, placa nao e fundo, personagem nao e textura.`,
        });
        content.push({
          type: "input_image",
          image_url: reference.dataUrl,
          detail: "high",
        });
      }
    }
    const tool: Record<string, unknown> = {
      type: "image_generation",
      model: imageModelFor(quality),
      size: outputSize,
      quality,
      moderation: "low",
      action: "edit",
    };
    if (withMask && maskDataUrl) tool.input_image_mask = { image_url: maskDataUrl };
    return await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: IMAGE_MODELS.curator,
        instructions: ART_EDITOR_INSTRUCTIONS,
        background: true,
        store: true,
        metadata: packJobContext(userId, { moldeName, moldeTemplateUrl, temaNome, nome, idade, brief, artLayout }),
        input: [{ role: "user", content }],
        tools: [tool],
        tool_choice: { type: "image_generation" },
      }),
    });
  };

  let res = await createJob(true);
  if (!res.ok) {
    const txt = await res.text();
    console.error("OpenAI create error:", res.status, txt);
    if (res.status === 429) {
      return jsonResponse({ error: "Muitas requisições. Aguarde alguns segundos e tente de novo." }, 429);
    }
    if (isModerationError(txt) && !usedSafeFallback) {
      return jsonResponse({
        error: "A OpenAI bloqueou este tema por segurança.",
        code: "OPENAI_MODERATION_BLOCKED",
      });
    }
    // Only a mask-specific 400 may be retried; quota/auth/provider failures never trigger a second paid job.
    if (res.status !== 400 || !/mask/i.test(txt)) {
      return jsonResponse({ error: `Erro no servico de IA: ${res.status}. Nenhum modelo alternativo foi acionado.` }, 502);
    }
    res = await createJob(false);
    if (!res.ok) {
      const txt2 = await res.text();
      console.error("OpenAI create (sem máscara) error:", res.status, txt2);
      if (res.status === 429) {
        return jsonResponse({ error: "Muitas requisições. Aguarde alguns segundos e tente de novo." }, 429);
      }
      if (isModerationError(txt2) && !usedSafeFallback) {
        return jsonResponse({
          error: "A OpenAI bloqueou este tema por segurança.",
          code: "OPENAI_MODERATION_BLOCKED",
        });
      }
      return jsonResponse({ error: `Erro no serviço de IA: ${res.status}` }, 500);
    }
  }

  const job = await res.json();
  if (!job?.id) {
    console.error("OpenAI create sem id:", JSON.stringify(job).slice(0, 400));
    return jsonResponse({ error: "A IA não iniciou a geração. Tente novamente." }, 500);
  }

  // job criado — registra o uso da cota (best-effort)
  if (userId) {
    const { error } = await adminDb.from("geracoes_ia").insert({ user_id: userId, email: userEmail });
    if (error) console.warn("registro de cota falhou:", error.message);
  }

  console.log(
    "Job criado:",
    job.id,
    "status:",
    job.status,
    "quality:",
    quality,
    "Alice refs:",
    aliceReferences.length,
    "theme:",
    aliceLibrary.themeSlug,
  );
  return jsonResponse({
    jobId: job.id,
    usedSafeFallback,
    referenceCount: aliceReferences.length,
    referenceThemeSlug: aliceLibrary.themeSlug,
    imageModel: imageModelFor(quality),
    artLayout,
  });
}

// ---- STATUS: consulta o job; quando pronto, compõe as linhas + sobe pro Storage ----
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
    return jsonResponse({ error: `Erro ao consultar a geração: ${res.status}` }, 500);
  }
  const job = await res.json();
  try {
    body = { ...body, ...unpackJobContext(job.metadata, body.__userId as string) };
  } catch {
    return jsonResponse({ error: "Esta geracao nao pertence a sua sessao ou precisa ser reiniciada.", code: "JOB_ACCESS_DENIED" }, 403);
  }

  if (job.status === "queued" || job.status === "in_progress") {
    return jsonResponse({ status: "processing" });
  }

  if (job.status !== "completed") {
    const errText = JSON.stringify(job.error ?? job.incomplete_details ?? {});
    console.error("Job não completou:", job.status, errText);
    if (isModerationError(errText)) {
      return jsonResponse({
        status: "error",
        error: "A OpenAI bloqueou este tema por segurança.",
        code: "OPENAI_MODERATION_BLOCKED",
      });
    }
    return jsonResponse({ status: "error", error: "A IA não conseguiu gerar a imagem. Tente novamente." });
  }

  const call = (job.output ?? []).find((o: Record<string, unknown>) => o.type === "image_generation_call");
  const b64 = typeof call?.result === "string" ? call.result : null;
  if (!b64) {
    console.error("Job completou sem imagem:", JSON.stringify((job.output ?? []).map((o: Record<string, unknown>) => o.type)));
    return jsonResponse({ status: "error", code: "IMAGE_PROVIDER_NO_OUTPUT", error: "A API nao entregou uma imagem para este tema. Nenhuma arte generica foi criada. Tente novamente ou revise as referencias." });
  }

  let bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  // Compõe as linhas do molde por cima da arte final (garantia determinística).
  // O resultado vai na resposta (composited/compositeError) — falha aqui não
  // pode mais ser silenciosa.
  let composited = false;
  let compositeError: string | null = null;
  let templateBytes: Uint8Array | null = null;
  const moldeTemplateUrl = typeof body.moldeTemplateUrl === "string" ? body.moldeTemplateUrl : "";
  if (moldeTemplateUrl) {
    try {
      const tmplRes = await fetch(moldeTemplateUrl);
      if (!tmplRes.ok) throw new Error(`template ${tmplRes.status}`);
      templateBytes = new Uint8Array(await tmplRes.arrayBuffer());
      bytes = new Uint8Array(await compositeMoldLines(templateBytes, bytes));
      composited = true;
      console.log("Mold lines composited successfully.");
    } catch (e) {
      compositeError = e instanceof Error ? e.message : String(e);
      console.warn("Composite step skipped:", e);
    }
  }

  if (moldeTemplateUrl && !composited) {
    return jsonResponse({
      status: "error",
      error: "A arte nao recebeu o contorno tecnico do molde e nao foi liberada.",
      code: "MOLD_COMPOSITE_FAILED",
      compositeError,
    });
  }

  const qualityReview = await reviewGeneratedArt(
    bytes,
    templateBytes,
    {
      moldeName: typeof body.moldeName === "string" ? body.moldeName : "",
      temaNome: typeof body.temaNome === "string" ? body.temaNome : "",
      nome: typeof body.nome === "string" ? body.nome : "",
      idade: typeof body.idade === "string" ? body.idade : "",
      brief: normalizeCreativeBrief(body.brief),
      artLayout: body.artLayout as ArtLayout | null,
    },
    OPENAI_API_KEY,
    (await loadAliceReferenceImages(
      createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!),
      String(body.temaNome), Deno.env.get("SUPABASE_URL")!,
    )).images,
  );
  if (!qualityReview) {
    console.warn("Art curator did not return a valid review. Output blocked.");
    return jsonResponse({
      status: "error",
      error: "A curadoria nao conseguiu validar a arte. Nenhuma versao sem aprovacao foi entregue.",
      code: "ART_QUALITY_UNAVAILABLE",
    });
  }
  if (!qualityReview.approved) {
    console.warn("Art rejected by commercial curator:", qualityReview.score, qualityReview.issues);
    return jsonResponse({
      status: "error",
      error: "A composicao nao passou na curadoria. Ajuste o briefing ou tente uma nova arte.",
      code: "ART_QUALITY_REJECTED",
      qualityReview,
      artLayout: body.artLayout,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const fileName = `arte_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
  const filePath = `public/${fileName}`;
  const { error: upErr } = await supabase.storage
    .from("artes-geradas")
    .upload(filePath, bytes, { contentType: "image/png", upsert: false });
  if (upErr) {
    console.error("upload error:", upErr);
    return jsonResponse({
      status: "done",
      imageUrl: null,
      artLayout: body.artLayout,
      imageBase64: `data:image/png;base64,${bytesToBase64(bytes)}`,
      composited,
      compositeError,
      qualityReview,
    });
  }
  const { data: pub } = supabase.storage.from("artes-geradas").getPublicUrl(filePath);
  return jsonResponse({
    status: "done",
    imageUrl: pub.publicUrl,
    artLayout: body.artLayout,
    imageBase64: `data:image/png;base64,${bytesToBase64(bytes)}`,
    composited,
    compositeError,
    qualityReview,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const body = (await req.json()) as Record<string, unknown>;
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const authDb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: authError } = await authDb.auth.getUser(token);
    if (authError || !user) return jsonResponse({ error: "Entre na sua conta para gerar uma arte." }, 401);
    body.__userId = user.id;
    body.__userEmail = user.email;

    if (body.action === "status") {
      return await handleStatus(body, OPENAI_API_KEY);
    }

    return await handleStart(body, OPENAI_API_KEY);
  } catch (error) {
    console.error("gerar-arte error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
