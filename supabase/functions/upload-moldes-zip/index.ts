import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
  gif: "image/gif", svg: "image/svg+xml", pdf: "application/pdf",
  json: "application/json", txt: "text/plain", csv: "text/csv",
  mp4: "video/mp4", mp3: "audio/mpeg", wav: "audio/wav",
  zip: "application/zip", ttf: "font/ttf", otf: "font/otf",
  woff: "font/woff", woff2: "font/woff2",
};

const slugifySegment = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const prettify = (s: string) => {
  const clean = s.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles").select("role")
      .eq("user_id", userId).eq("role", "admin").maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem enviar." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const form = await req.formData();
    const file = form.get("file");
    const bucket = (form.get("bucket") as string)?.trim();
    const prefix = ((form.get("prefix") as string) || "").trim().replace(/^\/+|\/+$/g, "");
    const registerInMoldes = (form.get("register_in_moldes") as string) === "true";
    const defaultCategory = (form.get("category") as string) || "Geral";

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Arquivo ZIP não enviado." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!bucket) {
      return new Response(JSON.stringify({ error: "Bucket não informado." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Garante que o bucket existe
    const { data: buckets } = await admin.storage.listBuckets();
    if (!buckets?.some((b) => b.name === bucket)) {
      return new Response(JSON.stringify({ error: `Bucket "${bucket}" não encontrado.` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const zipBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(zipBuffer);

    type Result = { path: string; status: "ok" | "error"; message?: string };
    const results: Result[] = [];

    const entries = Object.values(zip.files).filter(
      (f: any) =>
        !f.dir &&
        !f.name.startsWith("__MACOSX/") &&
        !f.name.split("/").pop()?.startsWith("."),
    );

    for (const entry of entries) {
      const rawPath = (entry as any).name as string;
      // Preserva estrutura de pastas, sanitiza cada segmento
      const segments = rawPath.split("/").filter(Boolean).map(slugifySegment).filter(Boolean);
      if (segments.length === 0) continue;
      const filename = segments[segments.length - 1];
      const folderSegs = segments.slice(0, -1);

      const dotIdx = filename.lastIndexOf(".");
      const ext = dotIdx > 0 ? filename.slice(dotIdx + 1).toLowerCase() : "";
      const contentType = MIME[ext] || "application/octet-stream";

      const storagePath = [prefix, ...folderSegs, filename].filter(Boolean).join("/");

      try {
        const bytes = await (entry as any).async("uint8array");
        const { error: upErr } = await admin.storage
          .from(bucket)
          .upload(storagePath, bytes, { contentType, upsert: true });
        if (upErr) throw new Error(upErr.message);

        // Registro opcional na tabela moldes (apenas imagens/PDF)
        if (registerInMoldes && (["png","jpg","jpeg","webp","svg","pdf"].includes(ext))) {
          const { data: pub } = admin.storage.from(bucket).getPublicUrl(storagePath);
          const isPdf = ext === "pdf";
          const baseName = filename.slice(0, dotIdx);
          const category = folderSegs.length > 0 ? prettify(folderSegs.join(" / ")) : defaultCategory;
          await admin.from("moldes").insert({
            name: prettify(baseName),
            category,
            image_url: isPdf ? null : pub.publicUrl,
            template_pdf_url: isPdf ? pub.publicUrl : null,
            emoji: "📦",
            popular: false,
            sort_order: 0,
          });
        }

        results.push({ path: storagePath, status: "ok" });
      } catch (e) {
        results.push({
          path: storagePath,
          status: "error",
          message: e instanceof Error ? e.message : "Erro desconhecido",
        });
      }
    }

    const okCount = results.filter((r) => r.status === "ok").length;
    return new Response(
      JSON.stringify({
        total: results.length,
        success: okCount,
        failed: results.length - okCount,
        bucket,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("upload-moldes-zip error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
