import { supabase } from "@/integrations/supabase/client";

type Frame = { dataUrl: string; isFinal: boolean };

export type JobMeta = Record<string, any>;

const POLL_INTERVAL_MS = 4000;
const JOB_TIMEOUT_MS = 8 * 60_000;

async function callFunction(functionName: string, payload: unknown): Promise<any> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
  const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? anon;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anon,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload ?? {}),
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* resposta sem corpo JSON */
  }
  if (!res.ok) {
    const err = new Error(json?.error ?? `Erro ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return json ?? {};
}

/**
 * Roda uma geração de imagem como job em background (gerar-arte / gerar-mockup):
 * inicia o job, consulta o status a cada poucos segundos e entrega o resultado.
 *
 * - `onFrame` recebe a imagem final (dataUrl) quando o job termina.
 * - `onMeta` recebe o payload final ({ imageUrl, imageBase64 } ou { mockupUrl, mockupBase64 }).
 * - Temas bloqueados pela moderação são retentados uma vez em modo seguro (safeMode).
 * - Lança erro em HTTP != 2xx, `{ error }` (cota, validação) ou timeout.
 */
export async function runImageGenerationJob(
  functionName: string,
  body: unknown,
  handlers: {
    onFrame?: (frame: Frame) => void;
    onMeta?: (meta: JobMeta) => void;
  }
): Promise<void> {
  const startJob = async (extra: Record<string, unknown> = {}) =>
    callFunction(functionName, { ...(body as Record<string, unknown>), ...extra });

  let created = await startJob();
  if (created?.code === "OPENAI_MODERATION_BLOCKED") {
    created = await startJob({ safeMode: true });
  }
  if (created?.error) throw new Error(created.error);
  let jobId: string | undefined = created?.jobId;
  if (!jobId) throw new Error("Não consegui iniciar a geração. Tente novamente.");

  const moldeTemplateUrl = (body as Record<string, unknown>)?.["moldeTemplateUrl"];
  let safeRetried = false;
  let startedAt = Date.now();

  while (true) {
    if (Date.now() - startedAt > JOB_TIMEOUT_MS) {
      throw new Error("A geração demorou demais. Tente novamente.");
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const st = await callFunction(functionName, { action: "status", jobId, moldeTemplateUrl });

    if (st?.status === "done") {
      handlers.onMeta?.(st);
      const dataUrl = st.imageBase64 ?? st.mockupBase64;
      if (typeof dataUrl === "string" && handlers.onFrame) {
        handlers.onFrame({ dataUrl, isFinal: true });
      }
      return;
    }

    if (st?.status === "error") {
      if (st.code === "OPENAI_MODERATION_BLOCKED" && !safeRetried) {
        safeRetried = true;
        const retry = await startJob({ safeMode: true });
        if (retry?.error || !retry?.jobId) {
          throw new Error(retry?.error ?? "A OpenAI bloqueou este tema por segurança.");
        }
        jobId = retry.jobId;
        startedAt = Date.now();
        continue;
      }
      throw new Error(st.error ?? "Erro na geração. Tente novamente.");
    }
    // "processing" → continua consultando
  }
}
