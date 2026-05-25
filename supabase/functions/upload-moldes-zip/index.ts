import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const prettify = (s: string) => {
  const clean = s.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "Geral";
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
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles").select("role")
      .eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Apenas administradores." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const form = await req.formData();
    const file = form.get("file");
    const bucket = (form.get("bucket") as string)?.trim();
    const prefix = ((form.get("prefix") as string) || "").trim().replace(/^\/+|\/+$/g, "");
    const storagePath = ((form.get("storage_path") as string) || "").trim().replace(/^\/+|\/+$/g, "");
    const registerInMoldes = String(form.get("register_in_moldes") || "false") === "true";
    const defaultCategory = ((form.get("default_category") as string) || "Geral").trim() || "Geral";

    if (!(file instanceof File) || !bucket || !storagePath) {
      return new Response(JSON.stringify({ error: "Arquivo ou bucket inválido." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: buckets } = await admin.storage.listBuckets();
    if (!buckets?.some((b) => b.name === bucket)) {
      return new Response(JSON.stringify({ error: `Bucket "${bucket}" não encontrado.` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bytes = await file.arrayBuffer();
    const { error: uploadError } = await admin.storage.from(bucket).upload(storagePath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (registerInMoldes) {
      const dotIdx = file.name.lastIndexOf(".");
      const ext = dotIdx > 0 ? file.name.slice(dotIdx + 1).toLowerCase() : "";
      if (["png", "jpg", "jpeg", "webp", "svg", "pdf"].includes(ext)) {
        const { data: publicData } = admin.storage.from(bucket).getPublicUrl(storagePath);
        const pathWithoutPrefix = prefix && storagePath.startsWith(`${prefix}/`)
          ? storagePath.slice(prefix.length + 1)
          : storagePath;
        const folderSegs = pathWithoutPrefix.split("/").filter(Boolean).slice(0, -1);
        const isPdf = ext === "pdf";
        const baseName = dotIdx > 0 ? file.name.slice(0, dotIdx) : file.name;
        const derivedCategory = folderSegs.length > 0
          ? prettify(folderSegs.join(" / "))
          : defaultCategory;

        const { error: moldError } = await admin.from("moldes").insert({
          name: prettify(baseName),
          category: derivedCategory,
          image_url: isPdf ? null : publicData.publicUrl,
          template_pdf_url: isPdf ? publicData.publicUrl : null,
          emoji: "📦",
          popular: false,
          sort_order: 0,
        });

        if (moldError) {
          return new Response(JSON.stringify({ error: moldError.message }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      bucket,
      prefix,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("upload-moldes-zip error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
