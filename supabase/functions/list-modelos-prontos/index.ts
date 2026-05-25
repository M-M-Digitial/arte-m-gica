import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const prettify = (s: string) =>
  s.replace(/[-_]+/g, " ").replace(/\.[^.]+$/, "").replace(/\s+/g, " ").trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);
    const bucket = "models-prontos";

    const { data: folders, error: fErr } = await admin.storage.from(bucket).list("", {
      limit: 1000, sortBy: { column: "name", order: "asc" },
    });
    if (fErr) throw fErr;

    const themes: Array<{ slug: string; name: string; files: Array<{ name: string; label: string; url: string }> }> = [];

    for (const f of (folders ?? []).filter((x) => x.id === null)) {
      const { data: files } = await admin.storage.from(bucket).list(f.name, {
        limit: 1000, sortBy: { column: "name", order: "asc" },
      });
      const items = (files ?? []).filter((x) => x.id !== null).map((x) => {
        const path = `${f.name}/${x.name}`;
        const { data: pub } = admin.storage.from(bucket).getPublicUrl(path);
        return { name: x.name, label: prettify(x.name), url: pub.publicUrl };
      });
      if (items.length > 0) {
        themes.push({ slug: f.name, name: prettify(f.name), files: items });
      }
    }

    return new Response(JSON.stringify({ themes }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
