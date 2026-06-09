import { createParser } from "eventsource-parser";
import { supabase } from "@/integrations/supabase/client";

type Frame = { dataUrl: string; isFinal: boolean };

export type StreamMeta = Record<string, any>;

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

  // Error: edge function returned JSON instead of SSE
  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok || !res.body || contentType.includes("application/json")) {
    let errMsg = `Erro ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) errMsg = j.error;
    } catch {}
    const err = new Error(errMsg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const parser = createParser({
    onEvent(ev) {
      if (ev.event === "image_generation.partial_image" || ev.event === "image_generation.completed") {
        try {
          const payload = JSON.parse(ev.data);
          if (payload?.b64_json && handlers.onFrame) {
            handlers.onFrame({
              dataUrl: `data:image/png;base64,${payload.b64_json}`,
              isFinal: ev.event === "image_generation.completed",
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
