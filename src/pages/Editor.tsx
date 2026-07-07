import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Download, FileText, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  composeKit,
  svgToPngDataUrl,
  downloadText,
  downloadDataUrl,
  type TemaAsset,
} from "@/lib/compose-kit";

// Compositor "padrão Alice": tema (biblioteca) + molde (vetor) + nome → SVG editável.
export default function Editor() {
  const [themeSlug, setThemeSlug] = useState<string>("");
  const [moldeId, setMoldeId] = useState<string>("");
  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [svg, setSvg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: temas, isLoading: loadingTemas } = useQuery({
    queryKey: ["biblioteca-temas"],
    queryFn: async () => {
      const { data: assets, error } = await (supabase as any)
        .from("tema_assets")
        .select("theme_slug");
      if (error) throw error;
      const slugs = [...new Set((assets ?? []).map((a: any) => a.theme_slug))];
      if (slugs.length === 0) return [];
      const { data: nomes } = await supabase
        .from("modelos_prontos_temas")
        .select("slug,name")
        .in("slug", slugs);
      const nameBySlug = new Map((nomes ?? []).map((t: any) => [t.slug, t.name]));
      return slugs.map((s) => ({ slug: s, name: nameBySlug.get(s) ?? s }));
    },
  });

  const { data: moldes, isLoading: loadingMoldes } = useQuery({
    queryKey: ["moldes-vetoriais"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("moldes")
        .select("id,name,image_url,svg_url,mask_url,faces_url")
        .not("svg_url", "is", null)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const molde = useMemo(
    () => (moldes ?? []).find((m: any) => m.id === moldeId),
    [moldes, moldeId]
  );

  const gerar = async () => {
    if (!themeSlug || !molde || !nome.trim()) {
      toast.error("Escolha o tema, o molde e digite o nome.");
      return;
    }
    setBusy(true);
    try {
      const { data: assets, error } = await (supabase as any)
        .from("tema_assets")
        .select("kind,name,url,role,meta")
        .eq("theme_slug", themeSlug);
      if (error) throw error;
      const out = await composeKit({
        molde: molde as any,
        assets: (assets ?? []) as TemaAsset[],
        nome: nome.trim(),
        idade: idade.trim() || undefined,
      });
      setSvg(out);
      toast.success("Kit composto! Pronto para baixar.");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Erro ao compor o kit.");
    } finally {
      setBusy(false);
    }
  };

  const baixarSvg = () => {
    if (!svg) return;
    downloadText(`kit-${nome || "arte"}.svg`, svg);
  };

  const baixarPng = async () => {
    if (!svg) return;
    setBusy(true);
    try {
      downloadDataUrl(`kit-${nome || "arte"}.png`, await svgToPngDataUrl(svg));
    } finally {
      setBusy(false);
    }
  };

  const baixarPdf = async () => {
    if (!svg) return;
    setBusy(true);
    try {
      const png = await svgToPngDataUrl(svg, 2526);
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const margin = 8;
      doc.addImage(png, "PNG", margin, margin, 297 - margin * 2, (297 - margin * 2) * (1786 / 2526));
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text("Imprima em A4 · Escala 100% · Sem ajuste de página", margin, 210 - 6);
      doc.text("MoldePronto", 297 - margin, 210 - 6, { align: "right" });
      doc.save(`kit-${nome || "arte"}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  const previewSrc = useMemo(
    () => (svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null),
    [svg]
  );

  return (
    <div className="animate-fade-in space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Compositor de Kits</h1>
        <p className="text-muted-foreground mt-1">
          Tema da biblioteca + molde vetorial + nome — arte editável em segundos, sem custo de IA.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border/50 lg:col-span-1">
          <CardContent className="p-5 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                1 · Tema
              </Label>
              {loadingTemas ? (
                <Skeleton className="h-10 rounded-lg" />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(temas ?? []).map((t) => (
                    <button
                      key={t.slug}
                      onClick={() => setThemeSlug(t.slug)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        themeSlug === t.slug
                          ? "gradient-hero text-white shadow-soft"
                          : "bg-secondary hover:bg-accent text-foreground"
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                  {(temas ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Nenhum tema na biblioteca ainda.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                2 · Molde
              </Label>
              {loadingMoldes ? (
                <Skeleton className="h-24 rounded-lg" />
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {(moldes ?? []).map((m: any) => (
                    <button
                      key={m.id}
                      onClick={() => setMoldeId(m.id)}
                      className={`p-2 rounded-xl text-xs font-medium text-left transition-all ${
                        moldeId === m.id
                          ? "gradient-hero text-white shadow-soft"
                          : "bg-secondary hover:bg-accent text-foreground"
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                3 · Personalizar
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Input
                    placeholder="Nome (ex: Sofia)"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    maxLength={30}
                    className="h-11 bg-secondary border-0 rounded-xl"
                  />
                </div>
                <Input
                  placeholder="Idade"
                  value={idade}
                  onChange={(e) => setIdade(e.target.value)}
                  maxLength={3}
                  className="h-11 bg-secondary border-0 rounded-xl"
                />
              </div>
            </div>

            <Button
              onClick={gerar}
              disabled={busy || !themeSlug || !moldeId || !nome.trim()}
              className="w-full h-12 rounded-full text-sm font-semibold gradient-hero border-0 text-white shadow-soft"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Compor kit
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50 lg:col-span-2">
          <CardContent className="p-5 space-y-4">
            <div className="aspect-[2526/1786] rounded-xl bg-secondary overflow-hidden flex items-center justify-center">
              {previewSrc ? (
                <img src={previewSrc} alt="Kit composto" className="w-full h-full object-contain" />
              ) : (
                <p className="text-sm text-muted-foreground px-8 text-center">
                  Escolha tema, molde e nome — a composição é instantânea e o resultado é um
                  SVG editável (abre no Canva, troca nome e cores).
                </p>
              )}
            </div>
            {svg && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={baixarSvg} className="rounded-full gradient-hero border-0 text-white" size="sm">
                  <Download className="h-4 w-4 mr-1.5" /> SVG editável
                </Button>
                <Button onClick={baixarPng} variant="outline" className="rounded-full" size="sm" disabled={busy}>
                  <Download className="h-4 w-4 mr-1.5" /> PNG
                </Button>
                <Button onClick={baixarPdf} variant="outline" className="rounded-full" size="sm" disabled={busy}>
                  <FileText className="h-4 w-4 mr-1.5" /> PDF p/ imprimir
                </Button>
                <Button onClick={gerar} variant="outline" className="rounded-full" size="sm" disabled={busy}>
                  <RefreshCw className="h-4 w-4 mr-1.5" /> Recompor
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
