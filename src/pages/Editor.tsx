import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Sparkles, Download, FileText, Loader2, RefreshCw, Search, Heart, Wand2, Palette, Camera, Image as ImageIcon, Type } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  composeKit,
  svgToPngDataUrl,
  downloadText,
  downloadDataUrl,
  type KitPalette,
  type TemaAsset,
} from "@/lib/compose-kit";
import { Thumb } from "@/components/Thumb";
import { runImageGenerationJob } from "@/lib/image-job";
import { getThemeReadiness, isThemeHeroAsset } from "@/lib/theme-curation";
import { getDefaultThemePalette } from "@/lib/theme-palettes";

interface TemaCard {
  slug: string;
  name: string;
  capa: string | null;   // clipart principal
  papel: string | null;  // papel top (fundo do card)
  cor: string;
}

interface ClipartOption {
  url: string;
  role: string;
  meta?: {
    usage?: "hero" | "ornament" | "border" | "panel";
    enabled?: boolean;
    w?: number;
    h?: number;
  } | null;
}

type ResultadoTab = "arte" | "mockup";
type MockupFormato = "feed" | "story";
type MockupQuality = {
  score: number;
  approved: boolean;
};

const FONTES = [
  { id: "tema", label: "Fonte do tema", family: undefined, preview: "inherit", useThemeFont: true },
  { id: "divertida", label: "Divertida", family: "Trebuchet MS, sans-serif", preview: "Trebuchet MS, sans-serif", useThemeFont: false },
  { id: "classica", label: "Clássica", family: "Georgia, serif", preview: "Georgia, serif", useThemeFont: false },
  { id: "moderna", label: "Moderna", family: "Verdana, sans-serif", preview: "Verdana, sans-serif", useThemeFont: false },
  { id: "forte", label: "Forte", family: "Arial Black, Arial, sans-serif", preview: "Arial Black, Arial, sans-serif", useThemeFont: false },
] as const;

const isSelectableCharacter = (asset: ClipartOption) =>
  isThemeHeroAsset({ ...asset, kind: "clipart" });

const PALETAS: Array<KitPalette & { id: string; label: string }> = [
  { id: "vibrante", label: "Festa vibrante", primary: "#D93680", secondary: "#F2A900", background: "#FFF2D5", accent: "#159A9C" },
  { id: "pastel", label: "Pastel delicado", primary: "#B85C8A", secondary: "#79BFAF", background: "#FFF5F8", accent: "#E7B84B" },
  { id: "aventura", label: "Aventura", primary: "#245F4F", secondary: "#E4A82B", background: "#E9F5EA", accent: "#C9533F" },
  { id: "magica", label: "Ceu magico", primary: "#4D62A8", secondary: "#D77DA5", background: "#ECF3FF", accent: "#E7B93F" },
];

const PALETA_PERSONALIZADA: KitPalette = {
  primary: "#D93680",
  secondary: "#F2A900",
  background: "#FFF2D5",
  accent: "#159A9C",
};

const BABY_SHARK_VARIANTS: Record<string, { heroRole: string }> = {
  "baby-shark-azul": {
    heroRole: "amigo",
  },
  "baby-shark-rosa": {
    heroRole: "amigo2",
  },
};

// Compositor "padrão Alice": biblioteca de 100 temas + molde vetorial + nome → arte editável na hora.
export default function Editor() {
  const [themeSlug, setThemeSlug] = useState<string>("");
  const [moldeId, setMoldeId] = useState<string>("");
  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [busca, setBusca] = useState("");
  const [svg, setSvg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cliparts, setCliparts] = useState<ClipartOption[]>([]);
  const [principalUrl, setPrincipalUrl] = useState<string>("");
  const [paletaId, setPaletaId] = useState("tema");
  const [paletaPersonalizada, setPaletaPersonalizada] = useState<KitPalette>(PALETA_PERSONALIZADA);
  const [fonteId, setFonteId] = useState("tema");
  const [fonteEscala, setFonteEscala] = useState(115);
  const [previewing, setPreviewing] = useState(false);
  const [resultadoTab, setResultadoTab] = useState<ResultadoTab>("arte");
  const [mockupFormato, setMockupFormato] = useState<MockupFormato>("feed");
  const [mockupImage, setMockupImage] = useState<string | null>(null);
  const [mockupImageBase64, setMockupImageBase64] = useState<string | null>(null);
  const [mockupBusy, setMockupBusy] = useState(false);
  const [mockupError, setMockupError] = useState<string | null>(null);
  const [mockupQuality, setMockupQuality] = useState<MockupQuality | null>(null);
  const previewRequestRef = useRef(0);
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
        .select("url,role,meta")
        .eq("theme_slug", themeSlug)
        .eq("kind", "clipart");
      // a placa é elemento decorativo (medalhão/plaquinha), não personagem — fora do seletor
      const list = ((data ?? []) as ClipartOption[]).filter(isSelectableCharacter);
      const preferredRole = BABY_SHARK_VARIANTS[themeSlug]?.heroRole ?? "principal";
      setCliparts(list);
      setPrincipalUrl(
        list.find((c) => c.role === preferredRole)?.url ??
        list.find((c) => c.role === "principal")?.url ??
        list[0]?.url ??
        "",
      );
    })();
  }, [themeSlug]);

  const { data: temas, isLoading: loadingTemas } = useQuery({
    queryKey: ["biblioteca-temas-cards"],
    queryFn: async (): Promise<TemaCard[]> => {
      const { data: assets, error } = await (supabase as any)
        .from("tema_assets")
        .select("theme_slug,kind,url,role,meta");
      if (error) throw error;
      const { data: nomes, error: nomesError } = await supabase
        .from("modelos_prontos_temas")
        .select("slug,name");
      if (nomesError) throw nomesError;
      const nameBySlug = new Map((nomes ?? []).map((t: any) => [t.slug, t.name]));
      const bySlug = new Map<string, TemaCard>();
      const assetsBySlug = new Map<string, typeof assets>();
      for (const a of assets ?? []) {
        const grouped = assetsBySlug.get(a.theme_slug) ?? [];
        grouped.push(a);
        assetsBySlug.set(a.theme_slug, grouped);
        const variant = BABY_SHARK_VARIANTS[a.theme_slug];
        const defaultPalette = getDefaultThemePalette(a.theme_slug);
        if (!bySlug.has(a.theme_slug)) {
          bySlug.set(a.theme_slug, {
            slug: a.theme_slug,
            name: nameBySlug.get(a.theme_slug) ?? a.theme_slug.replace(/-/g, " "),
            capa: null,
            papel: null,
            cor: defaultPalette?.background ?? "#E91E90",
          });
        }
        const t = bySlug.get(a.theme_slug)!;
        const coverRole = variant?.heroRole ?? "principal";
        if (a.kind === "clipart" && a.role === coverRole) t.capa = a.url;
        if (a.kind === "papel" && a.role === "top") t.papel = a.url;
        if (!variant && a.kind === "fonte" && a.meta?.cor) t.cor = a.meta.cor;
      }
      return [...bySlug.values()]
        .filter((theme) => getThemeReadiness(assetsBySlug.get(theme.slug) ?? []).ready)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
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
  const paletaAtiva = useMemo<KitPalette | undefined>(() => {
    if (paletaId === "tema") return getDefaultThemePalette(themeSlug);
    if (paletaId === "personalizada") return paletaPersonalizada;
    return PALETAS.find((paleta) => paleta.id === paletaId);
  }, [paletaId, paletaPersonalizada, themeSlug]);
  const fonteAtiva = useMemo(
    () => FONTES.find((fonte) => fonte.id === fonteId) ?? FONTES[0],
    [fonteId],
  );

  const gerarMockup = useCallback(async (sourceSvg: string, formato: MockupFormato = "feed") => {
    if (!molde || !temaSel) return;

    setMockupFormato(formato);
    setMockupBusy(true);
    setMockupError(null);
    setMockupImage(null);
    setMockupImageBase64(null);
    setMockupQuality(null);

    try {
      const arteImageUrl = await svgToPngDataUrl(sourceSvg, 1536);
      await runImageGenerationJob(
        "gerar-mockup",
        {
          arteImageUrl,
          moldeName: molde.name,
          temaNome: temaSel.name,
          nome: nome.trim(),
          idade: idade.trim() || undefined,
          formato,
          quality: "high",
        },
        {
          onFrame: ({ dataUrl }) => setMockupImage(dataUrl),
          onMeta: (meta) => {
            if (meta.mockupBase64) setMockupImageBase64(meta.mockupBase64);
            if (meta.mockupUrl || meta.mockupBase64) {
              setMockupImage(meta.mockupUrl ?? meta.mockupBase64);
            }
            if (typeof meta.qualityReview?.score === "number") {
              setMockupQuality({
                score: meta.qualityReview.score,
                approved: Boolean(meta.qualityReview.approved),
              });
            }
          },
        }
      );
      toast.success("Mockup de divulgação pronto!");
    } catch (error: unknown) {
      console.error("Erro ao gerar mockup:", error);
      const message = error instanceof Error
        ? error.message
        : "Não foi possível gerar o mockup. Tente novamente.";
      setMockupError(message);
      toast.error(message);
    } finally {
      setMockupBusy(false);
    }
  }, [idade, molde, nome, temaSel]);

  const gerar = useCallback(async (previewOnly = false) => {
    if (!themeSlug || !molde || !nome.trim()) {
      toast.error("Escolha o tema, o molde e digite o nome da criança.");
      return;
    }
    const requestId = previewOnly ? ++previewRequestRef.current : 0;
    if (previewOnly) setPreviewing(true);
    else {
      setBusy(true);
      setResultadoTab("arte");
      setMockupImage(null);
      setMockupImageBase64(null);
      setMockupError(null);
      setMockupQuality(null);
    }
    try {
      const { data: assets, error } = await (supabase as any)
        .from("tema_assets")
        .select("kind,name,url,role,meta")
        .eq("theme_slug", themeSlug);
      if (error) throw error;

      // aplica a escolha de personagem em destaque (troca de roles em memória)
      const lista = (assets ?? []) as TemaAsset[];
      const readiness = getThemeReadiness(lista);
      if (!readiness.ready) {
        throw new Error(`Este tema está em revisão: ${readiness.reasons.join(", ")}.`);
      }
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
        palette: paletaAtiva,
        typography: {
          family: fonteAtiva.family,
          scale: fonteEscala / 100,
          useThemeFont: fonteAtiva.useThemeFont,
        },
      });
      if (!previewOnly || requestId === previewRequestRef.current) setSvg(out);
      if (!previewOnly) {
        toast.success(`Kit ${temaSel?.name} da ${nome.trim()} pronto!`);
        setBusy(false);
        setResultadoTab("mockup");
        await gerarMockup(out, "feed");
      }
    } catch (e: any) {
      console.error(e);
      if (!previewOnly) toast.error(e?.message ?? "Erro ao compor o kit.");
    } finally {
      if (previewOnly) {
        if (requestId === previewRequestRef.current) setPreviewing(false);
      } else setBusy(false);
    }
  }, [themeSlug, molde, nome, principalUrl, idade, paletaAtiva, fonteAtiva, fonteEscala, temaSel?.name, gerarMockup]);

  useEffect(() => {
    if (etapa !== 4 || !themeSlug || !molde || !nome.trim()) return;
    const timer = window.setTimeout(() => void gerar(true), 300);
    return () => {
      window.clearTimeout(timer);
      previewRequestRef.current += 1;
    };
  }, [etapa, themeSlug, molde, nome, gerar]);

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

  const baixarMockup = () => {
    const source = mockupImageBase64 ?? mockupImage;
    if (!source) return;
    downloadDataUrl(`mockup-${mockupFormato}-${nome || "arte"}.png`, source);
  };

  const previewSrc = useMemo(
    () => (svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null),
    [svg]
  );

  return (
    <div className="animate-fade-in w-full max-w-none space-y-6">
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
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
              {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
              {temasFiltrados.map((t) => {
                const variant = BABY_SHARK_VARIANTS[t.slug];
                return (
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
                    <div
                      className="aspect-square bg-secondary relative"
                      style={variant ? { backgroundColor: variant.palette.background } : undefined}
                    >
                      {t.papel && (
                        <Thumb
                          src={t.papel}
                          size={320}
                          alt=""
                          className={`absolute inset-0 h-full w-full object-cover ${variant ? "opacity-20" : "opacity-60"}`}
                        />
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
                );
              })}
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
            <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
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

          <div className="space-y-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Palette className="h-4 w-4 text-primary" /> Escolha a paleta
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                As cores atualizam a arte abaixo sem trocar os personagens.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  id: "tema",
                  label: "Cores do tema",
                  primary: temaSel?.cor || "#D93680",
                  secondary: "#F2A900",
                  background: "#FFFFFF",
                  accent: "#159A9C",
                },
                ...PALETAS,
                { id: "personalizada", label: "Personalizada", ...paletaPersonalizada },
              ].map((paleta) => (
                <button
                  key={paleta.id}
                  type="button"
                  aria-pressed={paletaId === paleta.id}
                  onClick={() => setPaletaId(paleta.id)}
                  className={`min-h-16 rounded-lg border-2 px-3 py-2 text-left transition-colors ${
                    paletaId === paleta.id
                      ? "border-primary bg-primary/5"
                      : "border-border/50 bg-card hover:border-primary/40"
                  }`}
                >
                  <span className="mb-2 flex gap-1" aria-hidden="true">
                    {[paleta.primary, paleta.secondary, paleta.background, paleta.accent].map((cor, index) => (
                      <span
                        key={`${cor}-${index}`}
                        className="h-4 flex-1 rounded-sm border border-black/10"
                        style={{ backgroundColor: cor }}
                      />
                    ))}
                  </span>
                  <span className="block text-xs font-semibold text-foreground">{paleta.label}</span>
                </button>
              ))}
            </div>

            {paletaId === "personalizada" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg border border-border/50 bg-secondary/40 p-3">
                {(
                  [
                    ["primary", "Principal"],
                    ["secondary", "Secundária"],
                    ["background", "Fundo"],
                    ["accent", "Detalhe"],
                  ] as const
                ).map(([campo, label]) => (
                  <label key={campo} className="space-y-1 text-[11px] font-medium text-muted-foreground">
                    <span>{label}</span>
                    <input
                      type="color"
                      value={paletaPersonalizada[campo]}
                      onChange={(event) => setPaletaPersonalizada((atual) => ({
                        ...atual,
                        [campo]: event.target.value,
                      }))}
                      className="h-9 w-full cursor-pointer rounded border border-border bg-card p-1"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Type className="h-4 w-4 text-primary" /> Tipografia do nome
              </h3>
            </div>
            <div className="grid gap-4 rounded-lg border border-border/50 bg-card p-4 sm:grid-cols-2">
              <label className="space-y-2 text-xs font-medium text-muted-foreground">
                <span>Fonte</span>
                <Select value={fonteId} onValueChange={setFonteId}>
                  <SelectTrigger className="h-10 bg-background text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONTES.map((fonte) => (
                      <SelectItem key={fonte.id} value={fonte.id}>
                        {fonte.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>Tamanho</span>
                  <output className="font-semibold tabular-nums text-foreground">{fonteEscala}%</output>
                </div>
                <Slider
                  aria-label="Tamanho do nome"
                  min={85}
                  max={150}
                  step={5}
                  value={[fonteEscala]}
                  onValueChange={([valor]) => setFonteEscala(valor)}
                />
              </div>
              <div className="flex min-h-16 items-center justify-center overflow-hidden rounded-md border border-border/50 bg-secondary/40 px-3 sm:col-span-2">
                <span
                  className="max-w-full truncate text-center font-semibold text-foreground"
                  style={{
                    fontFamily: fonteAtiva.preview,
                    fontSize: `${Math.min(30, 17 * (fonteEscala / 100))}px`,
                  }}
                >
                  {nome.trim() || "Nome da criança"}
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border/60 bg-secondary/50">
            <div className="flex h-9 items-center justify-between border-b border-border/50 px-3">
              <span className="text-xs font-semibold text-foreground">Prévia da arte</span>
              {previewing && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
            </div>
            <div className="aspect-[2526/1786] bg-white flex items-center justify-center">
              {previewSrc ? (
                <img src={previewSrc} alt="Prévia do molde com a paleta selecionada" className="h-full w-full object-contain" />
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" /> Preparando a prévia
                </div>
              )}
            </div>
          </div>

          {temaSel && molde && nome.trim() && (
            <p className="text-xs text-muted-foreground">
              <Heart className="h-3 w-3 inline mr-1 text-primary" />
              {molde.name} · {temaSel.name} · pra <strong>{nome.trim()}</strong>
              {idade.trim() ? ` (${idade.trim()} anos)` : ""}
            </p>
          )}
          <Button
            onClick={() => { setEtapa(5); gerar(); }}
            disabled={busy || previewing || !themeSlug || !moldeId || !nome.trim()}
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
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1" role="tablist" aria-label="Resultado do kit">
                <button
                  type="button"
                  role="tab"
                  aria-selected={resultadoTab === "arte"}
                  onClick={() => setResultadoTab("arte")}
                  className={`flex min-h-10 items-center justify-center gap-2 rounded-md px-2 py-2 text-center text-sm font-semibold leading-tight transition-colors ${
                    resultadoTab === "arte" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ImageIcon className="h-4 w-4" /> Arte para impressão
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={resultadoTab === "mockup"}
                  onClick={() => setResultadoTab("mockup")}
                  className={`flex min-h-10 items-center justify-center gap-2 rounded-md px-2 py-2 text-center text-sm font-semibold leading-tight transition-colors ${
                    resultadoTab === "mockup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Camera className="h-4 w-4" /> Mockup de divulgação
                </button>
              </div>

              {resultadoTab === "arte" ? (
                <>
                  <div className="aspect-[2526/1786] rounded-lg bg-secondary overflow-hidden flex items-center justify-center">
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
                      <Button onClick={() => gerar()} variant="ghost" className="rounded-full" size="sm" disabled={busy || mockupBusy}>
                        <RefreshCw className="h-4 w-4 mr-1.5" /> Recompor
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-semibold text-foreground">Produto montado em uma festa fictícia</h2>
                        {mockupQuality && (
                          <Badge variant="secondary" className="text-[11px]">
                            Curadoria {mockupQuality.approved ? "aprovada" : "revisar"} · {mockupQuality.score}/100
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Imagem pronta para divulgar o produto nas redes sociais.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1" aria-label="Formato do mockup">
                      {(["feed", "story"] as const).map((formato) => (
                        <button
                          key={formato}
                          type="button"
                          aria-pressed={mockupFormato === formato}
                          disabled={mockupBusy || !svg}
                          onClick={() => svg && void gerarMockup(svg, formato)}
                          className={`h-8 rounded-md px-3 text-xs font-semibold transition-colors disabled:opacity-40 ${
                            mockupFormato === formato ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {formato === "feed" ? "Feed 1:1" : "Story 9:16"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`mx-auto flex w-full items-center justify-center overflow-hidden rounded-lg bg-secondary ${
                    mockupFormato === "story" ? "max-w-sm aspect-[9/16]" : "max-w-2xl aspect-square"
                  }`}>
                    {mockupBusy ? (
                      <div className="max-w-xs space-y-3 px-6 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm font-medium text-foreground">Montando a cena da festa…</p>
                        <p className="text-xs text-muted-foreground">Aplicando a arte na caixa e preparando a fotografia de divulgação.</p>
                      </div>
                    ) : mockupImage ? (
                      <img src={mockupImage} alt={`Mockup da ${molde?.name} no tema ${temaSel?.name}`} className="h-full w-full object-contain" />
                    ) : (
                      <div className="max-w-sm space-y-3 px-6 text-center">
                        <Camera className="mx-auto h-8 w-8 text-primary/70" />
                        <p className="text-sm text-muted-foreground">{mockupError ?? "O mockup será criado depois da arte."}</p>
                        {svg && (
                          <Button onClick={() => void gerarMockup(svg, mockupFormato)} size="sm" className="rounded-full" disabled={mockupBusy}>
                            <RefreshCw className="mr-1.5 h-4 w-4" /> Gerar novamente
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {mockupImage && !mockupBusy && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button onClick={baixarMockup} className="rounded-full gradient-hero border-0 text-white" size="sm">
                        <Download className="mr-1.5 h-4 w-4" /> Baixar mockup PNG
                      </Button>
                      <Button onClick={() => svg && void gerarMockup(svg, mockupFormato)} variant="outline" className="rounded-full" size="sm">
                        <RefreshCw className="mr-1.5 h-4 w-4" /> Nova versão
                      </Button>
                    </div>
                  )}
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
