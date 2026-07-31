import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Sparkles, Download, FileText, Loader2, RefreshCw, Search, Heart, Wand2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  composeKit,
  composeAlice,
  svgToPngDataUrl,
  downloadText,
  downloadDataUrl,
  type TemaAsset,
} from "@/lib/compose-kit";
import { Thumb } from "@/components/Thumb";

interface TemaCard {
  slug: string;
  name: string;
  capa: string | null;   // clipart principal
  papel: string | null;  // papel top (fundo do card)
  cor: string;
}

// Compositor "padrão Alice": biblioteca de 100 temas + molde vetorial + nome → arte editável na hora.
export default function Editor() {
  const [themeSlug, setThemeSlug] = useState<string>("");
  const [moldeId, setMoldeId] = useState<string>("");
  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [busca, setBusca] = useState("");
  const [svg, setSvg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [arteOriginal, setArteOriginal] = useState(false);
  const [cliparts, setCliparts] = useState<{ url: string; role: string }[]>([]);
  const [principalUrl, setPrincipalUrl] = useState<string>("");
  // Quiz em página inteira: 1 tema → 2 molde → 3 nome → 4 toque final → 5 resultado
  const [etapa, setEtapa] = useState(1);

  // ao trocar de tema, carrega os cliparts p/ escolha do personagem em destaque
  useEffect(() => {
    setCliparts([]);
    setPrincipalUrl("");
    if (!themeSlug) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("tema_assets")
        .select("url,role")
        .eq("theme_slug", themeSlug)
        .eq("kind", "clipart");
      // a placa é elemento decorativo (medalhão/plaquinha), não personagem — fora do seletor
      const list = ((data ?? []) as { url: string; role: string }[]).filter((c) => c.role !== "placa");
      setCliparts(list);
      setPrincipalUrl(list.find((c) => c.role === "principal")?.url ?? list[0]?.url ?? "");
    })();
  }, [themeSlug]);

  const { data: temas, isLoading: loadingTemas } = useQuery({
    queryKey: ["biblioteca-temas-cards"],
    queryFn: async (): Promise<TemaCard[]> => {
      const { data: assets, error } = await (supabase as any)
        .from("tema_assets")
        .select("theme_slug,kind,url,role,meta");
      if (error) throw error;
      const { data: nomes } = await supabase
        .from("modelos_prontos_temas")
        .select("slug,name");
      const nameBySlug = new Map((nomes ?? []).map((t: any) => [t.slug, t.name]));
      const bySlug = new Map<string, TemaCard>();
      for (const a of assets ?? []) {
        if (!bySlug.has(a.theme_slug)) {
          bySlug.set(a.theme_slug, {
            slug: a.theme_slug,
            name: nameBySlug.get(a.theme_slug) ?? a.theme_slug.replace(/-/g, " "),
            capa: null,
            papel: null,
            cor: "#E91E90",
          });
        }
        const t = bySlug.get(a.theme_slug)!;
        if (a.kind === "clipart" && a.role === "principal") t.capa = a.url;
        if (a.kind === "papel" && a.role === "top") t.papel = a.url;
        if (a.kind === "fonte" && a.meta?.cor) t.cor = a.meta.cor;
      }
      return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    },
  });

  const { data: moldes, isLoading: loadingMoldes } = useQuery({
    queryKey: ["moldes-vetoriais"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("moldes")
        .select("id,name,image_url,svg_url,mask_url,faces_url,popular")
        .not("svg_url", "is", null)
        .order("popular", { ascending: false })
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const temasFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return temas ?? [];
    return (temas ?? []).filter((t) => t.name.toLowerCase().includes(q));
  }, [temas, busca]);

  const temaSel = useMemo(() => (temas ?? []).find((t) => t.slug === themeSlug), [temas, themeSlug]);
  const molde = useMemo(() => (moldes ?? []).find((m: any) => m.id === moldeId), [moldes, moldeId]);

  const gerar = async () => {
    if (!themeSlug || !molde || !nome.trim()) {
      toast.error("Escolha o tema, o molde e digite o nome da criança.");
      return;
    }
    setBusy(true);
    try {
      const { data: assets, error } = await (supabase as any)
        .from("tema_assets")
        .select("kind,name,url,role,meta")
        .eq("theme_slug", themeSlug);
      if (error) throw error;

      // arte ORIGINAL da Alice para este tema × molde? Ela tem prioridade.
      const { data: original } = await (supabase as any)
        .from("alice_artes")
        .select("image_url,largura,altura")
        .eq("tema_slug", themeSlug)
        .eq("molde_name", (molde as any).name)
        .maybeSingle();
      if (original?.image_url) {
        const out = await composeAlice({
          imageUrl: original.image_url,
          largura: original.largura,
          altura: original.altura,
          assets: (assets ?? []) as TemaAsset[],
          nome: nome.trim(),
          idade: idade.trim() || undefined,
        });
        setSvg(out);
        setArteOriginal(true);
        toast.success(`Kit ${temaSel?.name} da ${nome.trim()} — arte original! ✨`);
        return;
      }
      setArteOriginal(false);
      // aplica a escolha de personagem em destaque (troca de roles em memória)
      let lista = (assets ?? []) as TemaAsset[];
      if (principalUrl) {
        const atual = lista.find((a) => a.kind === "clipart" && a.role === "principal");
        const escolhido = lista.find((a) => a.kind === "clipart" && a.url === principalUrl);
        if (atual && escolhido && atual !== escolhido) {
          const r = escolhido.role;
          escolhido.role = "principal";
          atual.role = r;
        }
      }
      const out = await composeKit({
        molde: molde as any,
        assets: lista,
        nome: nome.trim(),
        idade: idade.trim() || undefined,
      });
      setSvg(out);
      toast.success(`Kit ${temaSel?.name} da ${nome.trim()} pronto! 🎉`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Erro ao compor o kit.");
    } finally {
      setBusy(false);
    }
  };

  const baixarSvg = () => svg && downloadText(`kit-${nome || "arte"}.svg`, svg);
  const baixarPng = async () => {
    if (!svg) return;
    setBusy(true);
    try { downloadDataUrl(`kit-${nome || "arte"}.png`, await svgToPngDataUrl(svg)); }
    finally { setBusy(false); }
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
    } finally { setBusy(false); }
  };

  const previewSrc = useMemo(
    () => (svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null),
    [svg]
  );

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Compositor de Kits <span className="text-primary">✨</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Responda o quiz e sua arte sai <strong>pronta em segundos</strong> —
            no capricho de estúdio, editável e sem gastar nada por arte.
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Badge variant="secondary" className="text-xs">💯 {temas?.length ?? "…"} temas</Badge>
          <Badge variant="secondary" className="text-xs">📦 {moldes?.length ?? "…"} moldes</Badge>
          <Badge variant="secondary" className="text-xs">⚡ na hora</Badge>
        </div>
      </div>

      {/* Progresso do quiz */}
      {etapa <= 4 && (
        <div className="flex items-center gap-3">
          {etapa > 1 && (
            <button
              onClick={() => setEtapa(etapa - 1)}
              className="h-9 w-9 shrink-0 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </button>
          )}
          <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full gradient-hero transition-all duration-300"
              style={{ width: `${(etapa / 4) * 100}%` }}
            />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground shrink-0">{etapa} de 4</span>
        </div>
      )}

      {/* 1 · TEMA */}
      {etapa === 1 && (
        <section key="etapa-tema" className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-display text-2xl font-semibold text-foreground">Qual o tema da festa? 🎉</h2>
            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar tema… (ex: safari)"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 h-10 bg-secondary border-0 rounded-xl"
              />
            </div>
          </div>
          {loadingTemas ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {temasFiltrados.map((t) => (
                <button
                  key={t.slug}
                  onClick={() => { setThemeSlug(t.slug); setEtapa(2); }}
                  title={t.name}
                  className={`group relative rounded-2xl overflow-hidden border-2 transition-all text-left ${
                    themeSlug === t.slug
                      ? "border-primary shadow-soft scale-[1.02]"
                      : "border-transparent hover:border-primary/40 hover:-translate-y-0.5"
                  }`}
                >
                  <div className="aspect-square bg-secondary relative">
                    {t.papel && (
                      <Thumb src={t.papel} size={320} alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-60" />
                    )}
                    {t.capa && (
                      <Thumb src={t.capa} size={320} alt={t.name}
                        className="absolute inset-0 w-full h-full object-contain p-2 drop-shadow-md group-hover:scale-105 transition-transform" />
                    )}
                    {themeSlug === t.slug && (
                      <span className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full gradient-hero text-white text-xs flex items-center justify-center shadow">✓</span>
                    )}
                  </div>
                  <div className="px-2 py-1.5 bg-card">
                    <p className="text-[11px] font-semibold leading-tight truncate">{t.name}</p>
                  </div>
                </button>
              ))}
              {temasFiltrados.length === 0 && (
                <p className="col-span-full text-sm text-muted-foreground py-6 text-center">
                  Nenhum tema encontrado pra "{busca}" 🥺 — tenta outro nome!
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* 2 · MOLDE */}
      {etapa === 2 && (
        <section key="etapa-molde" className="space-y-4 animate-fade-in">
          <h2 className="font-display text-2xl font-semibold text-foreground">Qual molde você quer?</h2>
          {loadingMoldes ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(moldes ?? []).map((m: any) => (
                <button
                  key={m.id}
                  onClick={() => { setMoldeId(m.id); setEtapa(3); }}
                  className={`rounded-xl border-2 overflow-hidden text-left transition-all ${
                    moldeId === m.id
                      ? "border-primary shadow-soft"
                      : "border-border/40 hover:border-primary/40 hover:-translate-y-0.5"
                  }`}
                >
                  <div className="aspect-[4/3] bg-white flex items-center justify-center">
                    {m.image_url ? (
                      <Thumb src={m.image_url} size={320} alt={m.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="text-3xl">📦</span>
                    )}
                  </div>
                  <div className="px-2.5 py-1.5 bg-card flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold truncate">{m.name}</p>
                    {m.popular && <span className="text-[10px]">🔥</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 3 · NOME E IDADE */}
      {etapa === 3 && (
        <section key="etapa-nome" className="max-w-md mx-auto space-y-6 animate-fade-in py-4">
          <h2 className="font-display text-2xl font-semibold text-foreground">Pra quem é o kit?</h2>
          <Input
            placeholder="Nome da criança (ex: Sofia)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && nome.trim()) setEtapa(4); }}
            maxLength={30}
            autoFocus
            className="h-12 bg-secondary border-0 rounded-xl text-base"
          />
          <Input
            placeholder="Idade (opcional)"
            value={idade}
            onChange={(e) => setIdade(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && nome.trim()) setEtapa(4); }}
            maxLength={3}
            className="h-12 bg-secondary border-0 rounded-xl text-base"
          />
          <Button
            onClick={() => setEtapa(4)}
            disabled={!nome.trim()}
            className="w-full h-12 rounded-full text-sm font-semibold gradient-hero border-0 text-white shadow-soft disabled:opacity-30"
          >
            Continuar <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </section>
      )}

      {/* 4 · TOQUE FINAL */}
      {etapa === 4 && (
        <section key="etapa-final" className="max-w-lg mx-auto space-y-6 animate-fade-in py-4">
          {cliparts.length > 1 ? (
            <>
              <div>
                <h2 className="font-display text-2xl font-semibold text-foreground">Quem brilha na frente? ✨</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Toque no personagem que vai aparecer em destaque — os outros continuam na decoração.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {cliparts.map((c) => (
                  <button
                    key={c.url}
                    onClick={() => setPrincipalUrl(c.url)}
                    className={`relative rounded-2xl border-2 bg-white p-4 transition-all duration-200 ${
                      principalUrl === c.url
                        ? "border-primary shadow-soft scale-[1.03]"
                        : "border-border/40 hover:border-primary/40 hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="h-28 flex items-center justify-center">
                      <Thumb src={c.url} size={320} alt="" className="max-h-full max-w-full object-contain drop-shadow-sm" />
                    </div>
                    {principalUrl === c.url && (
                      <span className="absolute top-2 right-2 h-6 w-6 rounded-full gradient-hero text-white text-xs flex items-center justify-center shadow">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <h2 className="font-display text-2xl font-semibold text-foreground">Último toque ✨</h2>
          )}
          {temaSel && molde && nome.trim() && (
            <p className="text-xs text-muted-foreground">
              <Heart className="h-3 w-3 inline mr-1 text-primary" />
              {molde.name} · {temaSel.name} · pra <strong>{nome.trim()}</strong>
              {idade.trim() ? ` (${idade.trim()} anos)` : ""}
            </p>
          )}
          <Button
            onClick={() => { setEtapa(5); gerar(); }}
            disabled={busy || !themeSlug || !moldeId || !nome.trim()}
            className="w-full h-12 rounded-full text-sm font-semibold gradient-hero border-0 text-white shadow-soft disabled:opacity-30"
          >
            <Wand2 className="h-4 w-4 mr-2" /> Compor kit agora
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            Sem fila, sem crédito de IA — quantos kits você quiser. 💖
          </p>
        </section>
      )}

      {/* 5 · RESULTADO */}
      {etapa === 5 && (
        <section key="etapa-resultado" className="space-y-4 animate-fade-in">
          <Card className="border-border/50">
            <CardContent className="p-5 space-y-4">
              <div className="aspect-[2526/1786] rounded-xl bg-secondary overflow-hidden flex items-center justify-center">
                {busy ? (
                  <div className="text-center px-8 py-10 space-y-3">
                    <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">
                      Compondo o kit {temaSel?.name} da {nome.trim() || "sua cliente"}…
                    </p>
                  </div>
                ) : previewSrc ? (
                  <img src={previewSrc} alt="Kit composto" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center px-8 py-10 space-y-2">
                    <Sparkles className="h-8 w-8 mx-auto text-primary/60" />
                    <p className="text-sm text-muted-foreground">Algo deu errado — tente compor de novo.</p>
                  </div>
                )}
              </div>
              {svg && !busy && arteOriginal && (
                <p className="text-xs font-semibold text-primary inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Arte original do acervo — personalizada com o nome
                </p>
              )}
              {svg && !busy && (
                <div className="flex flex-wrap gap-2 items-center">
                  <Button onClick={baixarSvg} className="rounded-full gradient-hero border-0 text-white" size="sm">
                    <Download className="h-4 w-4 mr-1.5" /> SVG editável (Canva)
                  </Button>
                  <Button onClick={baixarPng} variant="outline" className="rounded-full" size="sm" disabled={busy}>
                    <Download className="h-4 w-4 mr-1.5" /> PNG
                  </Button>
                  <Button onClick={baixarPdf} variant="outline" className="rounded-full" size="sm" disabled={busy}>
                    <FileText className="h-4 w-4 mr-1.5" /> PDF pra imprimir
                  </Button>
                  <Button onClick={gerar} variant="ghost" className="rounded-full" size="sm" disabled={busy}>
                    <RefreshCw className="h-4 w-4 mr-1.5" /> Recompor
                  </Button>
                </div>
              )}
              {!busy && (
                <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40">
                  <Button
                    onClick={() => setEtapa(3)}
                    variant="secondary"
                    size="sm"
                    className="rounded-full mt-3"
                  >
                    ✏️ Trocar o nome
                  </Button>
                  <Button
                    onClick={() => { setEtapa(1); setBusca(""); }}
                    variant="secondary"
                    size="sm"
                    className="rounded-full mt-3"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Novo kit
                  </Button>
                  <span className="text-[11px] text-muted-foreground ml-auto mt-4">
                    Troque o nome e componha de novo — leva segundos ✨
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
