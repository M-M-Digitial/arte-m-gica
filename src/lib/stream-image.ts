import { createParser } from "eventsource-parser";
import { supabase } from "@/integrations/supabase/client";

type Frame = { dataUrl: string; isFinal: boolean };

export type StreamMeta = Record<string, any>;

const findBase64Image = (value: unknown): string | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, any>;
  for (const key of ["b64_json", "partial_image_b64", "image_b64", "base64", "imageBase64", "mockupBase64"]) {
    if (typeof record[key] === "string") {
      return record[key].startsWith("data:image") ? record[key].split(",")[1] : record[key];
    }
  }
  for (const nested of Object.values(record)) {
    if (Array.isArray(nested)) {
      for (const item of nested) {
        const found = findBase64Image(item);
        if (found) return found;
      }
    } else if (nested && typeof nested === "object") {
      const found = findBase64Image(nested);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Stream an edge function that returns SSE with `image_generation.partial_image`,
 * `image_generation.completed`, and a final `meta.uploaded` event.
 *
 * - `onFrame` is called for each partial image and for the completed image.
 * - `onMeta` is called when the function emits `meta.uploaded` (after upload to Storage).
 * - Throws on HTTP error or when a JSON `{ error }` payload is received instead of SSE.
 */
export async function streamImageEdgeFunction(
  functionName: string,
  body: unknown,
  handlers: {
    onFrame?: (frame: Frame) => void;
    onMeta?: (meta: StreamMeta) => void;
  }
): Promise<void> {
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
    body: JSON.stringify(body ?? {}),
  });

  // Handle both SSE streams and plain JSON responses.
  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    let errMsg = `Erro ${res.status}`;
    try {
      if (isJson) {
        const j = await res.json();
        if (j?.error) errMsg = j.error;
      } else {
        const t = await res.text();
        if (t) errMsg = t;
      }
    } catch {}
    const err = new Error(errMsg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  if (isJson) {
    const payload = await res.json();
    if (payload?.error) {
      throw new Error(payload.error);
    }
    handlers.onMeta?.(payload);
    const b64 = findBase64Image(payload);
    if (b64 && handlers.onFrame) {
      handlers.onFrame({ dataUrl: `data:image/png;base64,${b64}`, isFinal: true });
    }
    return;
  }

  if (!res.body) {
    throw new Error("Resposta sem stream.");
  }

  const parser = createParser({
    onEvent(ev) {
      if (ev.event?.includes("image_generation") || ev.event?.includes("partial_image")) {
        try {
          const payload = JSON.parse(ev.data);
          const b64 = findBase64Image(payload);
          if (b64 && handlers.onFrame) {
            handlers.onFrame({
              dataUrl: `data:image/png;base64,${b64}`,
              isFinal: ev.event?.includes("completed") || ev.event?.includes("final"),
            });
          }
        } catch {}
      } else if (ev.event === "meta.uploaded") {
        try {
          const payload = JSON.parse(ev.data);
          handlers.onMeta?.(payload);
        } catch {}
      }
    },
  });

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.feed(value);
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}
