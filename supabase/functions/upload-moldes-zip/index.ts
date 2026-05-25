import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IMAGE_EXTS: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const admin = createClient(supabaseUrl, serviceKey);

    // Verifica papel admin
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem enviar moldes." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const form = await req.formData();
    const file = form.get("file");
    const defaultCategory = (form.get("category") as string) || "Geral";

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Arquivo ZIP não enviado." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const zipBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(zipBuffer);

    type Result = { name: string; status: "ok" | "error"; message?: string };
    const results: Result[] = [];

    const entries = Object.values(zip.files).filter(
      (f: any) => !f.dir && !f.name.startsWith("__MACOSX/") && !f.name.split("/").pop()?.startsWith("."),
    );

    for (const entry of entries) {
      const filename = (entry as any).name.split("/").pop() as string;
      const dotIdx = filename.lastIndexOf(".");
      if (dotIdx <= 0) {
        results.push({ name: filename, status: "error", message: "Sem extensão" });
        continue;
      }
      const ext = filename.slice(dotIdx + 1).toLowerCase();
      const baseName = filename.slice(0, dotIdx);
      const contentType = IMAGE_EXTS[ext];
      if (!contentType) {
        results.push({ name: filename, status: "error", message: `Tipo não suportado: .${ext}` });
        continue;
      }

      try {
        const bytes = await (entry as any).async("uint8array");
        const safeName = `${Date.now()}_${slugify(baseName) || "molde"}.${ext}`;

        const { error: upErr } = await admin.storage
          .from("moldes")
          .upload(safeName, bytes, { contentType, upsert: false });

        if (upErr) throw new Error(upErr.message);

        const { data: pub } = admin.storage.from("moldes").getPublicUrl(safeName);

        const isPdf = ext === "pdf";
        const insertRow = {
          name: prettify(baseName),
          category: defaultCategory,
          image_url: isPdf ? null : pub.publicUrl,
          template_pdf_url: isPdf ? pub.publicUrl : null,
          emoji: "📦",
          popular: false,
          sort_order: 0,
        };

        const { error: insErr } = await admin.from("moldes").insert(insertRow);
        if (insErr) throw new Error(insErr.message);

        results.push({ name: filename, status: "ok" });
      } catch (e) {
        results.push({
          name: filename,
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
