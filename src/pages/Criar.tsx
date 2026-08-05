import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMoldes, useTemas } from "@/hooks/use-catalog";
import { supabase } from "@/integrations/supabase/client";
import { runImageGenerationJob } from "@/lib/image-job";
import { Thumb } from "@/components/Thumb";
import { baixarSvgDaArte, criarSvgDaArte } from "@/lib/svg-arte";
import { baixarFotoDivulgacao, type FormatoDivulgacao } from "@/lib/raster-file";
import { baixarMoldePdf, baixarMoldePng } from "@/lib/mold-export";
import { toast } from "sonner";
import {
  ArrowLeft,
  Sparkles,
  Download,
  Loader2,
  Check,
  RefreshCw,
  Camera,
  ImageIcon,
  Box,
  Palette,
  Type,
  FileText,
  ArrowRight,
  Zap,
} from "lucide-react";

// Mold images
import moldMilkBox from "@/assets/mold-milk-box.png";
import moldSacolinha from "@/assets/mold-sacolinha.png";
import moldSextavada from "@/assets/molds/mold-caixa-sextavada.png";
import moldTravesseiro from "@/assets/molds/mold-caixa-travesseiro.png";
import moldCone from "@/assets/molds/mold-cone.png";
import moldCachepot from "@/assets/molds/mold-cachepot.png";
import moldCanudo from "@/assets/molds/mold-caixa-canudo.png";
import moldCoracao from "@/assets/molds/mold-caixa-coracao.png";
import moldEnvelope from "@/assets/molds/mold-caixa-envelope.png";
import moldTopoBolo from "@/assets/molds/mold-topo-bolo.png";
import moldSacolinhaNew from "@/assets/molds/mold-sacolinha.png";
import moldPiramideNew from "@/assets/molds/mold-piramide.png";
import moldCubo from "@/assets/molds/mold-caixa-cubo.png";
import moldFatiaBolo from "@/assets/molds/mold-fatia-bolo.png";
import moldMaleta from "@/assets/molds/mold-maleta.png";
import moldCasinha from "@/assets/molds/mold-casinha.png";
import moldEstrela from "@/assets/molds/mold-estrela.png";
import moldHexagonal from "@/assets/molds/mold-hexagonal.png";
import moldBau from "@/assets/molds/mold-bau.png";
import moldGable from "@/assets/molds/mold-gable.png";
import moldBala from "@/assets/molds/mold-bala.png";
import moldDiamante from "@/assets/molds/mold-diamante.png";
import moldTubete from "@/assets/molds/mold-tubete.png";
import moldSaquinho from "@/assets/molds/mold-saquinho.png";
import moldForminha from "@/assets/molds/mold-forminha.png";
import moldLapela from "@/assets/molds/mold-lapela.png";
import moldPipoca from "@/assets/molds/mold-pipoca.png";
import moldSacola from "@/assets/molds/mold-sacola.png";
import moldCestinha from "@/assets/molds/mold-cestinha.png";
import moldGaveta from "@/assets/molds/mold-gaveta.png";
import moldExplosion from "@/assets/molds/mold-explosion.png";
import moldBandeirinha from "@/assets/molds/mold-bandeirinha.png";
import moldWrapper from "@/assets/molds/mold-wrapper.png";
import moldRotulo from "@/assets/molds/mold-rotulo.png";
import moldConvite from "@/assets/molds/mold-convite.png";
import moldPlaquinha from "@/assets/molds/mold-plaquinha.png";
import moldNumero from "@/assets/molds/mold-numero.png";
import moldBis from "@/assets/molds/mold-bis.png";
import moldTag from "@/assets/molds/mold-tag.png";
import moldGuardanapo from "@/assets/molds/mold-guardanapo.png";
import moldLivrinho from "@/assets/molds/mold-livrinho.png";
import moldPirulito from "@/assets/molds/mold-pirulito.png";
import moldAgua from "@/assets/molds/mold-agua.png";
import moldTubeteTampa from "@/assets/molds/mold-tubete-tampa.png";
import moldTalher from "@/assets/molds/mold-talher.png";
import moldChapeu from "@/assets/molds/mold-chapeu.png";
import moldMascara from "@/assets/molds/mold-mascara.png";

// Theme images
import themePrincesas from "@/assets/themes/theme-princesas.jpg";
import themeBarbie from "@/assets/themes/theme-barbie.jpg";
import themeMinnie from "@/assets/themes/theme-minnie.jpg";
import themeUnicornio from "@/assets/themes/theme-unicornio.jpg";
import themeJardim from "@/assets/themes/theme-jardim.jpg";
import themeSereia from "@/assets/themes/theme-sereia.jpg";
import themeFrozen from "@/assets/themes/theme-frozen.jpg";
import themeEncanto from "@/assets/themes/theme-encanto.jpg";
import themeMoranguinho from "@/assets/themes/theme-moranguinho.jpg";
import themePatrulha from "@/assets/themes/theme-patrulha.jpg";
import themeDinossauros from "@/assets/themes/theme-dinossauros.jpg";
import themeHerois from "@/assets/themes/theme-herois.jpg";
import themeAranha from "@/assets/themes/theme-aranha.jpg";
import themeCarros from "@/assets/themes/theme-carros.jpg";
import themeSafari from "@/assets/themes/theme-safari.jpg";
import themeAstronauta from "@/assets/themes/theme-astronauta.jpg";
import themeSonic from "@/assets/themes/theme-sonic.jpg";
import themeMickey from "@/assets/themes/theme-mickey.jpg";
import themeStitch from "@/assets/themes/theme-stitch.jpg";
import themeCirco from "@/assets/themes/theme-circo.jpg";
import themeFazendinha from "@/assets/themes/theme-fazendinha.jpg";
import themeMonica from "@/assets/themes/theme-monica.jpg";
import themeGalinha from "@/assets/themes/theme-galinha.jpg";
import themeCocomelon from "@/assets/themes/theme-cocomelon.jpg";
import themeChaRevelacao from "@/assets/themes/theme-cha-revelacao.jpg";
import themeDiaMaes from "@/assets/themes/theme-dia-maes.jpg";
import themeChaBebe from "@/assets/themes/theme-cha-bebe.jpg";
import themeBatizado from "@/assets/themes/theme-batizado.jpg";
import themeFestaJunina from "@/assets/themes/theme-festa-junina.jpg";
import themeNatal from "@/assets/themes/theme-natal.jpg";
import themeLol from "@/assets/themes/theme-lol.jpg";
import themePeppa from "@/assets/themes/theme-peppa.jpg";
import themeHelloKitty from "@/assets/themes/theme-hellokitty.jpg";
import themeMoana from "@/assets/themes/theme-moana.jpg";
import themeRapunzel from "@/assets/themes/theme-rapunzel.jpg";
import themeBailarina from "@/assets/themes/theme-bailarina.jpg";
import themeDragonBall from "@/assets/themes/theme-dragonball.jpg";
import themeNaruto from "@/assets/themes/theme-naruto.jpg";
import themeMinecraft from "@/assets/themes/theme-minecraft.jpg";
import themeHotWheels from "@/assets/themes/theme-hotwheels.jpg";
import themeBobEsponja from "@/assets/themes/theme-bobesponja.jpg";
import themeToyStory from "@/assets/themes/theme-toystory.jpg";
import themeVingadores from "@/assets/themes/theme-vingadores.jpg";
import themeBatman from "@/assets/themes/theme-batman.jpg";
import themeMundoBita from "@/assets/themes/theme-mundobita.jpg";
import themePocoyo from "@/assets/themes/theme-pocoyo.jpg";
import themeBabyShark from "@/assets/themes/theme-babyshark.jpg";
import themeSnoopy from "@/assets/themes/theme-snoopy.jpg";
import themeFloresta from "@/assets/themes/theme-floresta.jpg";
import themeArcoIris from "@/assets/themes/theme-arcoiris.jpg";
import themeNuvem from "@/assets/themes/theme-nuvem.jpg";
import themeDiaPais from "@/assets/themes/theme-dia-pais.jpg";
import themeHalloween from "@/assets/themes/theme-halloween.jpg";
import themePascoa from "@/assets/themes/theme-pascoa.jpg";
import themeAnoNovo from "@/assets/themes/theme-anonovo.jpg";
import themeFormatura from "@/assets/themes/theme-formatura.jpg";
import themeBodas from "@/assets/themes/theme-bodas.jpg";
import theme15Anos from "@/assets/themes/theme-15anos.jpg";
import themeProfessores from "@/assets/themes/theme-professores.jpg";

const moldImages: Record<string, string> = {
  "Caixinha Milk": moldMilkBox,
  "Sacolinha de Papel": moldSacolinhaNew,
  "Caixa Pirâmide": moldPiramideNew,
  "Caixa Sextavada": moldSextavada,
  "Caixa Travesseiro": moldTravesseiro,
  "Cone de Guloseimas": moldCone,
  "Cachepot / Bandeja": moldCachepot,
  "Caixa Canudo": moldCanudo,
  "Caixa Coração": moldCoracao,
  "Caixa Envelope": moldEnvelope,
  "Topo de Bolo": moldTopoBolo,
  "Porta-bis": moldBis,
  Sacolinha: moldSacolinha,
  "Caixa Cubo": moldCubo,
  "Caixa Fatia de Bolo": moldFatiaBolo,
  "Caixa Maleta": moldMaleta,
  "Caixa Casinha": moldCasinha,
  "Caixa Estrela": moldEstrela,
  "Caixa Hexagonal": moldHexagonal,
  "Caixa Baú": moldBau,
  "Caixa Gable (Lunch Box)": moldGable,
  "Caixa Bala": moldBala,
  "Caixa Diamante": moldDiamante,
  "Tubete / Tubo de Ensaio": moldTubete,
  "Saquinho Kraft": moldSaquinho,
  "Forminha para Doces": moldForminha,
  "Caixa Lapela": moldLapela,
  "Caixa Pipoca": moldPipoca,
  "Sacola de Papel": moldSacola,
  "Cestinha / Cesta": moldCestinha,
  "Caixa Gaveta": moldGaveta,
  "Caixa Explosion Box": moldExplosion,
  "Bandeirinha / Topper Varal": moldBandeirinha,
  "Wrapper Cupcake": moldWrapper,
  "Rótulo Personalizado": moldRotulo,
  "Convite Personalizado": moldConvite,
  "Plaquinha de Mesa": moldPlaquinha,
  "Número / Letra de Mesa": moldNumero,
  "Caixa para Bis": moldBis,
  "Tag / Etiqueta": moldTag,
  "Porta-Guardanapo": moldGuardanapo,
  "Livrinho / Revista de Colorir": moldLivrinho,
  "Capa de Pirulito": moldPirulito,
  "Água Personalizada (Rótulo)": moldAgua,
  "Tubete Tampa (Rótulo)": moldTubeteTampa,
  "Porta-Talher": moldTalher,
  "Chapeuzinho de Festa": moldChapeu,
  "Máscara de Personagem": moldMascara,
};

const themeImages: Record<string, string> = {
  "Princesas Disney": themePrincesas,
  Barbie: themeBarbie,
  "Minnie Rosa": themeMinnie,
  Unicórnio: themeUnicornio,
  "Jardim Encantado": themeJardim,
  "Sereia / Fundo do Mar": themeSereia,
  Frozen: themeFrozen,
  Encanto: themeEncanto,
  Moranguinho: themeMoranguinho,
  "Patrulha Canina": themePatrulha,
  Dinossauros: themeDinossauros,
  "Super-Heróis": themeHerois,
  "Homem-Aranha": themeAranha,
  "Carros / McQueen": themeCarros,
  Safari: themeSafari,
  "Astronauta / Espaço": themeAstronauta,
  Sonic: themeSonic,
  Mickey: themeMickey,
  Stitch: themeStitch,
  Circo: themeCirco,
  Fazendinha: themeFazendinha,
  "Turma da Mônica": themeMonica,
  "Galinha Pintadinha": themeGalinha,
  Cocomelon: themeCocomelon,
  "Chá Revelação": themeChaRevelacao,
  "Dia das Mães": themeDiaMaes,
  "Chá de Bebê": themeChaBebe,
  Batizado: themeBatizado,
  "Festa Junina": themeFestaJunina,
  Natal: themeNatal,
  "Boneca LOL": themeLol,
  "Peppa Pig": themePeppa,
  "Hello Kitty": themeHelloKitty,
  Moana: themeMoana,
  Rapunzel: themeRapunzel,
  Bailarina: themeBailarina,
  "Dragon Ball": themeDragonBall,
  Naruto: themeNaruto,
  Minecraft: themeMinecraft,
  "Hot Wheels": themeHotWheels,
  "Bob Esponja": themeBobEsponja,
  "Toy Story": themeToyStory,
  Vingadores: themeVingadores,
  Batman: themeBatman,
  "Mundo Bita": themeMundoBita,
  Pocoyo: themePocoyo,
  "Baby Shark": themeBabyShark,
  Snoopy: themeSnoopy,
  "Floresta Encantada": themeFloresta,
  "Arco-Íris": themeArcoIris,
  "Nuvem de Amor": themeNuvem,
  "Dia dos Pais": themeDiaPais,
  Halloween: themeHalloween,
  "Páscoa": themePascoa,
  "Ano Novo": themeAnoNovo,
  Formatura: themeFormatura,
  Bodas: themeBodas,
  "15 Anos": theme15Anos,
  "Dia dos Professores": themeProfessores,
};

const STEPS = [
  { key: "tema", label: "Tema", icon: Palette },
  { key: "molde", label: "Molde", icon: Box },
  { key: "personalizar", label: "Personalizar", icon: Type },
  { key: "arte", label: "Arte", icon: Sparkles },
  { key: "mockup", label: "Mockup", icon: Camera },
];

const FONT_STYLES = [
  { id: "divertida", label: "Divertida", emoji: "🎈", desc: "Arredondada e lúdica" },
  { id: "elegante", label: "Elegante", emoji: "✨", desc: "Fina e sofisticada" },
  { id: "negrito", label: "Negrito", emoji: "💪", desc: "Grossa e impactante" },
  { id: "manuscrita", label: "Manuscrita", emoji: "✍️", desc: "Escrita à mão" },
  { id: "fantasia", label: "Fantasia", emoji: "🦄", desc: "Decorativa e temática" },
  { id: "minimalista", label: "Minimalista", emoji: "◻️", desc: "Clean e moderna" },
  { id: "retro", label: "Retrô", emoji: "📺", desc: "Vintage e nostálgica" },
];

const DRAW_STYLES = [
  { id: "cartoon", label: "Cartoon", emoji: "🎨", desc: "Desenho animado colorido" },
  { id: "aquarela", label: "Aquarela", emoji: "🖌️", desc: "Pintura suave e artística" },
  { id: "flat", label: "Flat Design", emoji: "📐", desc: "Vetorial limpo e moderno" },
  { id: "realista", label: "Realista", emoji: "📷", desc: "Ilustração detalhada" },
  { id: "kawaii", label: "Kawaii", emoji: "🌸", desc: "Fofo estilo japonês" },
  { id: "handdrawn", label: "Desenhado à mão", emoji: "✏️", desc: "Traço manual e artesanal" },
  { id: "3d", label: "3D", emoji: "🧊", desc: "Volume e profundidade" },
  { id: "pixel", label: "Pixel Art", emoji: "👾", desc: "Retro pixelado" },
];

const DENSITY_STYLES = [
  { id: "minimalista", label: "Minimalista", emoji: "🪷", desc: "Poucos elementos, clean" },
  { id: "equilibrado", label: "Equilibrado", emoji: "⚖️", desc: "Quantidade moderada" },
  { id: "decorado", label: "Decorado", emoji: "🎀", desc: "Bastante detalhes" },
  { id: "maximalista", label: "Maximalista", emoji: "🎆", desc: "Cheio de elementos" },
];

const COR_PRESETS = [
  "#FF69B4", "#FF1493", "#E91E63", "#F44336", "#FF5722",
  "#FF9800", "#FFC107", "#FFEB3B", "#8BC34A", "#4CAF50",
  "#009688", "#00BCD4", "#03A9F4", "#2196F3", "#3F51B5",
  "#673AB7", "#9C27B0", "#E040FB", "#795548", "#607D8B",
];

const AI_CREDITS_MESSAGE =
  "Créditos de IA esgotados. Adicione créditos em Settings → Cloud & AI balance para continuar gerando artes.";

const getFunctionErrorMessage = (err: any, fallback: string) => {
  const message = err?.context?.error || err?.message || fallback;
  return message.includes("Créditos") || message.includes("credits") || message.includes("402")
    ? AI_CREDITS_MESSAGE
    : message;
};

export default function Criar() {
  const [step, setStep] = useState(1);
  const [selectedTema, setSelectedTema] = useState<any>(null);
  const [selectedMolde, setSelectedMolde] = useState<any>(null);
  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [frase, setFrase] = useState("");
  const [corDominante, setCorDominante] = useState("");
  const [fonteEstilo, setFonteEstilo] = useState("divertida");
  const [desenhoEstilo, setDesenhoEstilo] = useState("cartoon");
  const [densidadeVisual, setDensidadeVisual] = useState("equilibrado");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedImageBase64, setGeneratedImageBase64] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewIsFinal, setPreviewIsFinal] = useState(false);
  const [isGeneratingMockup, setIsGeneratingMockup] = useState(false);
  const [mockupImage, setMockupImage] = useState<string | null>(null);
  const [mockupImageBase64, setMockupImageBase64] = useState<string | null>(null);
  const [mockupPreview, setMockupPreview] = useState<string | null>(null);
  const [mockupPreviewIsFinal, setMockupPreviewIsFinal] = useState(false);
  const [mockupFormato, setMockupFormato] = useState<"feed" | "story">("feed");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [qualidade, setQualidade] = useState<"low" | "medium">("medium");
  const [fraseBusy, setFraseBusy] = useState(false);
  // Personalização em formato de quiz: uma pergunta por tela
  const [quizPergunta, setQuizPergunta] = useState(0);
  // Histórico: id da arte salva nesta sessão e modo "refazer com outro nome"
  const [arteSalvaId, setArteSalvaId] = useState<string | null>(null);
  const [refazendo, setRefazendo] = useState(false);
  const location = useLocation();

  // Chegou de "Minhas Artes" com uma receita: pré-preenche tudo e pede só o nome
  useEffect(() => {
    const r = (location.state as any)?.refazer;
    if (!r) return;
    setSelectedTema({ name: r.tema_nome, colors: r.tema_colors ?? undefined });
    setSelectedMolde({ name: r.molde_name, template_png_url: r.molde_template_url ?? undefined });
    setNome("");
    setIdade(r.idade ?? "");
    setFrase(r.frase ?? "");
    setCorDominante(r.cor_dominante ?? "");
    setFonteEstilo(r.fonte_estilo ?? "divertida");
    setDesenhoEstilo(r.desenho_estilo ?? "cartoon");
    setDensidadeVisual(r.densidade_visual ?? "equilibrado");
    setQualidade(r.qualidade === "low" ? "low" : "medium");
    setRefazendo(true);
    setQuizPergunta(0);
    setStep(3);
    window.history.replaceState({}, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gera uma frase fofa via chat-agente (streaming SSE no formato chat/completions)
  const gerarFrase = async () => {
    setFraseBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-agente`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anon,
          Authorization: `Bearer ${session?.access_token ?? anon}`,
        },
        body: JSON.stringify({
          agentId: "frase",
          messages: [{
            role: "user",
            content: `Crie UMA frase curta e emocionante (máximo 55 caracteres) para a lembrancinha de festa infantil tema "${selectedTema?.name ?? "festa"}"${nome.trim() ? ` da criança ${nome.trim()}` : ""}${idade.trim() ? ` de ${idade.trim()} anos` : ""}. Tom carinhoso, em português. Responda SOMENTE a frase, sem aspas e sem explicação.`,
          }],
        }),
      });
      if (!res.ok || !res.body) throw new Error("Não consegui criar a frase agora.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", texto = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        for (const line of buf.split("\n")) {
          if (!line.startsWith("data:") || line.includes("[DONE]")) continue;
          try {
            const delta = JSON.parse(line.slice(5))?.choices?.[0]?.delta?.content;
            if (delta) texto += delta;
          } catch {}
        }
        buf = buf.slice(buf.lastIndexOf("\n") + 1);
        if (texto) setFrase(texto.replace(/^["'\s]+|["'\s]+$/g, "").slice(0, 80));
      }
      if (!texto.trim()) throw new Error("Não veio frase — tenta de novo!");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar a frase.");
    } finally {
      setFraseBusy(false);
    }
  };

  // SVG híbrido (formato oficial de entrega): arte como fundo + linhas vetoriais
  const baixarSvgHibrido = async () => {
    if (!generatedImageBase64) return;
    await baixarSvgDaArte({
      imagem: generatedImageBase64,
      moldeSvgUrl: (selectedMolde as any)?.svg_url,
      nomeArquivo: `arte-${nome.trim() || "molde"}`,
    });
  };

  const { data: moldes, isLoading: loadingMoldes } = useMoldes();
  const { data: temas, isLoading: loadingTemas } = useTemas();

  const handleSelectTema = (tema: any) => {
    setSelectedTema(tema);
    setStep(2);
  };

  const handleSelectMolde = (mold: any) => {
    setSelectedMolde(mold);
    setQuizPergunta(0);
    setStep(3);
  };

  const handleGenerate = async () => {
    if (!nome.trim()) {
      toast.error("Digite o nome para personalizar");
      return;
    }
    setIsGenerating(true);
    setStep(4);
    setPreviewImage(null);
    setPreviewIsFinal(false);
    setGeneratedImage(null);
    setGeneratedImageBase64(null);
    setArteSalvaId(null);
    try {
      let gotMeta = false;
      let lastFrameDataUrl: string | null = null;
      let metaFinal: any = null;
      await runImageGenerationJob(
        "gerar-arte",
        {
          moldeName: selectedMolde.name,
          // template em alta resolução (2048px) quando existir; thumb como fallback
          moldeTemplateUrl: (selectedMolde as any).template_png_url || (selectedMolde as any).image_url || undefined,
          moldeMaskUrl: (selectedMolde as any).mask_url || undefined,
          temaNome: selectedTema.name,
          temaColors: selectedTema.colors,
          nome: nome.trim(),
          idade: idade.trim() || undefined,
          frase: frase.trim() || undefined,
          corDominante: corDominante || undefined,
          fonteEstilo,
          desenhoEstilo,
          densidadeVisual,
          quality: qualidade,
        },
        {
          onFrame: ({ dataUrl, isFinal }) => {
            lastFrameDataUrl = dataUrl;
            flushSync(() => {
              setPreviewImage(dataUrl);
              setPreviewIsFinal(isFinal);
            });
          },
          onMeta: (meta) => {
            gotMeta = true;
            metaFinal = meta;
            if (meta.imageBase64) setGeneratedImageBase64(meta.imageBase64);
            if (meta.imageUrl || meta.imageBase64) {
              setGeneratedImage(meta.imageUrl ?? meta.imageBase64);
            }
          },
        }
      );
      if (!gotMeta) {
        if (!lastFrameDataUrl) throw new Error("A IA não terminou de gerar a imagem. Tente novamente.");
        setGeneratedImage(lastFrameDataUrl);
        setGeneratedImageBase64(lastFrameDataUrl);
      }
      // Salva no histórico "Minhas Artes" (best-effort; não atrapalha a entrega)
      if (metaFinal?.imageUrl) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: salva } = await (supabase as any)
              .from("minhas_artes")
              .insert({
                user_id: user.id,
                tema_nome: selectedTema.name,
                tema_colors: selectedTema.colors ?? null,
                molde_name: selectedMolde.name,
                molde_template_url: (selectedMolde as any).template_png_url || (selectedMolde as any).image_url || null,
                nome: nome.trim(),
                idade: idade.trim() || null,
                frase: frase.trim() || null,
                cor_dominante: corDominante || null,
                fonte_estilo: fonteEstilo,
                desenho_estilo: desenhoEstilo,
                densidade_visual: densidadeVisual,
                qualidade,
                image_url: metaFinal.imageUrl,
              })
              .select("id")
              .single();
            if (salva?.id) setArteSalvaId(salva.id);
          }
        } catch (e) {
          console.warn("não consegui salvar no histórico:", e);
        }
      }
      toast.success("Arte gerada com sucesso!");
    } catch (err: any) {
      console.error("Erro:", err);
      toast.error(getFunctionErrorMessage(err, "Erro ao gerar arte. Tente novamente."));
      setStep(3);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMockup = async (formato: "feed" | "story") => {
    setMockupFormato(formato);
    setIsGeneratingMockup(true);
    setStep(5);
    setMockupImage(null);
    setMockupImageBase64(null);
    setMockupPreview(null);
    setMockupPreviewIsFinal(false);
    try {
      let gotMeta = false;
      let lastFrameDataUrl: string | null = null;
      await runImageGenerationJob(
        "gerar-mockup",
        {
          arteImageUrl: generatedImage,
          moldeName: selectedMolde.name,
          temaNome: selectedTema.name,
          nome: nome.trim(),
          idade: idade.trim() || undefined,
          formato,
          quality: qualidade,
        },
        {
          onFrame: ({ dataUrl, isFinal }) => {
            lastFrameDataUrl = dataUrl;
            flushSync(() => {
              setMockupPreview(dataUrl);
              setMockupPreviewIsFinal(isFinal);
            });
          },
          onMeta: (meta) => {
            gotMeta = true;
            if (meta.mockupBase64) setMockupImageBase64(meta.mockupBase64);
            if (meta.mockupUrl || meta.mockupBase64) {
              setMockupImage(meta.mockupUrl ?? meta.mockupBase64);
            }
            if (arteSalvaId && meta.mockupUrl) {
              (supabase as any)
                .from("minhas_artes")
                .update({ mockup_url: meta.mockupUrl })
                .eq("id", arteSalvaId)
                .then(({ error }: { error: unknown }) => {
                  if (error) console.warn("não consegui salvar o mockup no histórico:", error);
                });
            }
          },
        }
      );
      if (!gotMeta) {
        if (!lastFrameDataUrl) throw new Error("Mockup não finalizou. Tente novamente.");
        setMockupImage(lastFrameDataUrl);
        setMockupImageBase64(lastFrameDataUrl);
      }
      toast.success("Mockup pronto!");
    } catch (err: any) {
      console.error("Erro:", err);
      toast.error(getFunctionErrorMessage(err, "Erro ao gerar mockup. Tente novamente."));
      setStep(4);
    } finally {
      setIsGeneratingMockup(false);
    }
  };


  const handleDownloadMockup = async (formato: FormatoDivulgacao) => {
    if (!mockupImageBase64) return;
    await baixarFotoDivulgacao(
      `divulgacao-${selectedTema?.name}-${selectedMolde?.name}-${nome}`,
      mockupImageBase64,
      formato,
    );
  };

  const criarSvgFinal = async () => {
    if (!generatedImageBase64) throw new Error("A arte final ainda não está pronta.");
    return criarSvgDaArte({
      imagem: generatedImageBase64,
      moldeSvgUrl: (selectedMolde as any)?.svg_url,
      nomeArquivo: `arte-${nome.trim() || "molde"}`,
    });
  };

  const baixarMoldeOpcional = async (formato: "png" | "pdf") => {
    try {
      const svg = await criarSvgFinal();
      const filename = `molde-${selectedTema?.name}-${selectedMolde?.name}-${nome}`;
      if (formato === "png") await baixarMoldePng(filename, svg);
      else await baixarMoldePdf(filename, svg);
    } catch (error) {
      console.error("Erro ao exportar molde:", error);
      toast.error("Não foi possível exportar o molde.");
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedTema(null);
    setSelectedMolde(null);
    setNome("");
    setIdade("");
    setFrase("");
    setCorDominante("");
    setFonteEstilo("divertida");
    setDesenhoEstilo("cartoon");
    setDensidadeVisual("equilibrado");
    setGeneratedImage(null);
    setGeneratedImageBase64(null);
    setPreviewImage(null);
    setPreviewIsFinal(false);
    setMockupImage(null);
    setMockupImageBase64(null);
    setMockupPreview(null);
    setMockupPreviewIsFinal(false);
    setEditingField(null);
  };

  // Breadcrumb-style selections
  const SelectionsBreadcrumb = () => {
    if (step < 2) return null;
    return (
      <div className="flex items-center gap-2 mb-8 flex-wrap">
        {selectedTema && (
          <button
            onClick={() => { setStep(1); setEditingField("tema"); }}
            className="inline-flex items-center gap-2 bg-secondary hover:bg-accent text-foreground pl-1.5 pr-3 py-1.5 rounded-full text-xs font-medium transition-colors"
          >
            {themeImages[selectedTema.name] && (
              <Thumb src={themeImages[selectedTema.name]} size={64} alt="" className="h-5 w-5 rounded-full object-cover" />
            )}
            {selectedTema.name}
          </button>
        )}
        {selectedMolde && step >= 3 && (
          <>
            <span className="text-border text-xs">/</span>
            <button
              onClick={() => { setStep(2); setEditingField("molde"); }}
              className="inline-flex items-center gap-2 bg-secondary hover:bg-accent text-foreground pl-1.5 pr-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            >
              {moldImages[selectedMolde.name] && (
                <Thumb src={moldImages[selectedMolde.name]} size={64} alt="" className="h-5 w-5 object-contain" />
              )}
              {selectedMolde.name}
            </button>
          </>
        )}
        {nome && step >= 4 && (
          <>
            <span className="text-border text-xs">/</span>
            <button
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 bg-secondary hover:bg-accent text-foreground px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            >
              {nome}{idade ? ` · ${idade}` : ""}
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 glass border-b border-border/40">
        <div className="max-w-[1320px] w-full mx-auto px-4 sm:px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl gradient-hero flex items-center justify-center shrink-0 shadow-soft">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm sm:text-[15px] font-bold tracking-tight text-foreground">
              Molde<span className="text-gradient">Pronto</span>
            </span>
          </div>

          {/* Step pills — desktop */}
          <nav className="hidden sm:flex items-center gap-1.5" aria-label="Etapas da criação">
            {STEPS.map((s, i) => {
              const isActive = step === i + 1;
              const isDone = step > i + 1;
              const StepIcon = s.icon;
              return (
                <button
                  key={s.key}
                  onClick={() => { if (isDone) setStep(i + 1); }}
                  disabled={!isDone && !isActive}
                  aria-current={isActive ? "step" : undefined}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? "gradient-hero text-white shadow-soft"
                      : isDone
                      ? "bg-primary/10 text-primary hover:bg-primary/15 cursor-pointer"
                      : "bg-secondary/70 text-muted-foreground cursor-default"
                  }`}
                >
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full mr-1.5 ${
                    isActive
                      ? "bg-white/20 text-white"
                      : isDone
                      ? "bg-primary/15 text-primary"
                      : "bg-background text-muted-foreground"
                  }`}>
                    {isDone ? <Check className="h-3 w-3" /> : <StepIcon className="h-3 w-3" />}
                  </span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Step indicator — mobile */}
          <div className="sm:hidden flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {step}/5
            </span>
          </div>
        </div>
        {/* Mobile progress bar */}
        <div className="sm:hidden h-0.5 bg-secondary">
          <div
            className="h-full gradient-hero transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </header>

      <main className="max-w-[1320px] w-full mx-auto px-4 sm:px-5 py-6 sm:py-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <SelectionsBreadcrumb />

        {/* ─── STEP 1: TEMA ─── */}
        {step === 1 && (
          <section className="animate-fade-in space-y-10">
            <div className="max-w-md space-y-2 sm:space-y-3">
              <p className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Passo 1
              </p>
              <h1 className="font-display text-2xl sm:text-4xl font-semibold text-foreground leading-[1.15]">
                Qual o tema da festa?
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Escolha o tema e a IA cria toda a arte personalizada.
              </p>
            </div>

            {loadingTemas ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                {Array.from({ length: 18 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                {(temas ?? []).map((tema) => {
                  const image = tema.image_url || themeImages[tema.name];
                  return (
                    <button
                      key={tema.id}
                      onClick={() => handleSelectTema(tema)}
                      className="group relative aspect-square rounded-2xl overflow-hidden bg-secondary focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 transition-all duration-300 hover:shadow-elevated"
                    >
                      {image ? (
                        <Thumb
                          src={image}
                          size={480}
                          alt={tema.name}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-3xl">{tema.emoji || "🎉"}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-2.5">
                        <span className="text-white text-[11px] font-medium leading-tight">
                          {tema.name}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ─── STEP 2: MOLDE ─── */}
        {step === 2 && (
          <section className="animate-fade-in space-y-10">
            <div className="flex items-start gap-4">
              <button
                onClick={() => setStep(1)}
                className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors mt-1"
              >
                <ArrowLeft className="h-4 w-4 text-foreground" />
              </button>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Passo 2
                </p>
                <h1 className="font-display text-3xl font-semibold text-foreground">
                  Escolha o molde
                </h1>
              </div>
            </div>

            {loadingMoldes ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {(moldes ?? []).map((mold) => {
                  const image = mold.image_url || moldImages[mold.name];
                  return (
                    <button
                      key={mold.id}
                      onClick={() => handleSelectMolde(mold)}
                      className="group text-left rounded-2xl overflow-hidden bg-secondary hover:bg-accent transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2"
                    >
                      <div className="aspect-square flex items-center justify-center p-6">
                        {image ? (
                          <Thumb
                            src={image}
                            size={480}
                            alt={mold.name}
                            className="h-full w-auto object-contain transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <span className="text-4xl">{mold.emoji || "📦"}</span>
                        )}
                      </div>
                      <div className="px-3 pb-3 text-center">
                        <span className="text-xs font-medium text-foreground">
                          {mold.name}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ─── STEP 3: PERSONALIZAR (quiz de seleção) ─── */}
        {step === 3 && (
          <section key={quizPergunta} className="max-w-lg mx-auto animate-fade-in space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => (quizPergunta === 0 ? setStep(2) : setQuizPergunta(quizPergunta - 1))}
                  className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 text-foreground" />
                </button>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Personalizar · {quizPergunta + 1} de 7
                </p>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full gradient-hero transition-all duration-300"
                  style={{ width: `${((quizPergunta + 1) / 7) * 100}%` }}
                />
              </div>
            </div>

            {/* 1 · Nome e idade */}
            {quizPergunta === 0 && (
              <div className="space-y-6">
                <h1 className="font-display text-3xl font-semibold text-foreground">Pra quem é essa arte?</h1>
                {refazendo && (
                  <p className="text-sm text-muted-foreground -mt-4">
                    Refazendo <strong>{selectedTema?.name} · {selectedMolde?.name}</strong> — só digite o novo nome. 💛
                  </p>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Nome *</label>
                    <Input
                      placeholder="Ex: Maria Clara"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && nome.trim()) setQuizPergunta(refazendo ? 6 : 1); }}
                      className="h-12 bg-secondary border-0 rounded-xl text-base focus-visible:ring-1 focus-visible:ring-foreground"
                      maxLength={50}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Idade</label>
                    <Input
                      placeholder="5"
                      value={idade}
                      onChange={(e) => setIdade(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && nome.trim()) setQuizPergunta(refazendo ? 6 : 1); }}
                      className="h-12 bg-secondary border-0 rounded-xl text-base focus-visible:ring-1 focus-visible:ring-foreground"
                      maxLength={3}
                    />
                  </div>
                </div>
                <Button
                  onClick={() => setQuizPergunta(refazendo ? 6 : 1)}
                  disabled={!nome.trim()}
                  className="w-full h-12 text-sm font-semibold rounded-full disabled:opacity-30 gradient-hero border-0 text-white shadow-soft hover:shadow-elevated transition-all"
                >
                  {refazendo ? "Revisar e gerar" : "Continuar"} <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                {refazendo && (
                  <button
                    type="button"
                    onClick={() => { if (nome.trim()) setQuizPergunta(1); }}
                    disabled={!nome.trim()}
                    className="w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
                  >
                    Quero ajustar os estilos também
                  </button>
                )}
              </div>
            )}

            {/* 2 · Estilo de desenho */}
            {quizPergunta === 1 && (
              <div className="space-y-6">
                <h1 className="font-display text-3xl font-semibold text-foreground">Qual estilo de desenho?</h1>
                <p className="text-sm text-muted-foreground -mt-4">Toque em uma opção para continuar.</p>
                <div className="grid grid-cols-2 gap-3">
                  {DRAW_STYLES.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => { setDesenhoEstilo(d.id); setQuizPergunta(2); }}
                      className={`p-4 rounded-2xl text-left transition-all duration-200 ${
                        desenhoEstilo === d.id
                          ? "gradient-hero text-white shadow-soft"
                          : "bg-secondary hover:bg-accent text-foreground hover:-translate-y-0.5"
                      }`}
                    >
                      <p className="text-2xl">{d.emoji}</p>
                      <p className="text-sm font-semibold mt-1.5">{d.label}</p>
                      <p className={`text-[11px] mt-0.5 ${desenhoEstilo === d.id ? "text-white/70" : "text-muted-foreground"}`}>{d.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3 · Estilo da fonte */}
            {quizPergunta === 2 && (
              <div className="space-y-6">
                <h1 className="font-display text-3xl font-semibold text-foreground">Como escrever "{nome.trim() || "o nome"}"?</h1>
                <p className="text-sm text-muted-foreground -mt-4">Toque em uma opção para continuar.</p>
                <div className="grid grid-cols-2 gap-3">
                  {FONT_STYLES.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => { setFonteEstilo(f.id); setQuizPergunta(3); }}
                      className={`p-4 rounded-2xl text-left transition-all duration-200 ${
                        fonteEstilo === f.id
                          ? "gradient-hero text-white shadow-soft"
                          : "bg-secondary hover:bg-accent text-foreground hover:-translate-y-0.5"
                      }`}
                    >
                      <p className="text-2xl">{f.emoji}</p>
                      <p className="text-sm font-semibold mt-1.5">{f.label}</p>
                      <p className={`text-[11px] mt-0.5 ${fonteEstilo === f.id ? "text-white/70" : "text-muted-foreground"}`}>{f.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4 · Densidade visual */}
            {quizPergunta === 3 && (
              <div className="space-y-6">
                <h1 className="font-display text-3xl font-semibold text-foreground">Quanto enfeite você quer?</h1>
                <p className="text-sm text-muted-foreground -mt-4">Toque em uma opção para continuar.</p>
                <div className="grid grid-cols-2 gap-3">
                  {DENSITY_STYLES.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => { setDensidadeVisual(d.id); setQuizPergunta(4); }}
                      className={`p-4 rounded-2xl text-left transition-all duration-200 ${
                        densidadeVisual === d.id
                          ? "gradient-hero text-white shadow-soft"
                          : "bg-secondary hover:bg-accent text-foreground hover:-translate-y-0.5"
                      }`}
                    >
                      <p className="text-2xl">{d.emoji}</p>
                      <p className="text-sm font-semibold mt-1.5">{d.label}</p>
                      <p className={`text-[11px] mt-0.5 ${densidadeVisual === d.id ? "text-white/70" : "text-muted-foreground"}`}>{d.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 5 · Cor de destaque */}
            {quizPergunta === 4 && (
              <div className="space-y-6">
                <h1 className="font-display text-3xl font-semibold text-foreground">Tem uma cor de destaque?</h1>
                <button
                  onClick={() => { setCorDominante(""); setQuizPergunta(5); }}
                  className={`w-full p-4 rounded-2xl text-left transition-all duration-200 ${
                    !corDominante
                      ? "gradient-hero text-white shadow-soft"
                      : "bg-secondary hover:bg-accent text-foreground"
                  }`}
                >
                  <p className="text-sm font-semibold">🎨 Automática</p>
                  <p className={`text-[11px] mt-0.5 ${!corDominante ? "text-white/70" : "text-muted-foreground"}`}>
                    uso a paleta do tema {selectedTema?.name}
                  </p>
                </button>
                <div className="grid grid-cols-6 gap-3">
                  {COR_PRESETS.map((cor) => (
                    <button
                      key={cor}
                      onClick={() => { setCorDominante(cor); setQuizPergunta(5); }}
                      className={`aspect-square rounded-2xl transition-all duration-200 ${
                        corDominante === cor ? "ring-2 ring-primary ring-offset-2 scale-105" : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: cor }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-muted-foreground">Outra cor:</label>
                  <input
                    type="color"
                    value={corDominante || "#FF69B4"}
                    onChange={(e) => setCorDominante(e.target.value)}
                    className="h-9 w-12 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                  {corDominante && (
                    <span className="text-[11px] font-mono text-muted-foreground">{corDominante}</span>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="ml-auto h-9 rounded-full text-xs font-semibold"
                    onClick={() => setQuizPergunta(5)}
                  >
                    Continuar <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* 6 · Frase especial */}
            {quizPergunta === 5 && (
              <div className="space-y-6">
                <h1 className="font-display text-3xl font-semibold text-foreground">Quer uma frase especial?</h1>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">Aparece em uma face do molde</label>
                    <button
                      type="button"
                      onClick={gerarFrase}
                      disabled={fraseBusy}
                      className="text-[11px] font-semibold text-primary hover:opacity-80 inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      {fraseBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {fraseBusy ? "criando…" : "Criar frase pra mim"}
                    </button>
                  </div>
                  <Input
                    placeholder="Ex: Obrigada por celebrar comigo!"
                    value={frase}
                    onChange={(e) => setFrase(e.target.value)}
                    className="h-12 bg-secondary border-0 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-foreground"
                    maxLength={80}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="secondary"
                    className="h-12 rounded-full text-sm font-semibold"
                    onClick={() => { setFrase(""); setQuizPergunta(6); }}
                  >
                    Sem frase
                  </Button>
                  <Button
                    className="h-12 rounded-full text-sm font-semibold gradient-hero border-0 text-white shadow-soft"
                    onClick={() => setQuizPergunta(6)}
                  >
                    Continuar <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* 7 · Revisão e qualidade */}
            {quizPergunta === 6 && (
              <div className="space-y-6">
                <h1 className="font-display text-3xl font-semibold text-foreground">Tudo pronto?</h1>
                <p className="text-sm text-muted-foreground -mt-4">Toque em um item para ajustar.</p>
                <div className="rounded-2xl bg-secondary p-4">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-foreground">
                    <button className="bg-background px-2.5 py-1 rounded-lg font-medium hover:ring-1 hover:ring-primary/50" onClick={() => setStep(1)}>{selectedTema?.name}</button>
                    <span className="text-border">·</span>
                    <button className="bg-background px-2.5 py-1 rounded-lg hover:ring-1 hover:ring-primary/50" onClick={() => setStep(2)}>{selectedMolde?.name}</button>
                    <span className="text-border">·</span>
                    <button className="bg-background px-2.5 py-1 rounded-lg font-semibold hover:ring-1 hover:ring-primary/50" style={corDominante ? { color: corDominante } : undefined} onClick={() => setQuizPergunta(0)}>
                      {nome}{idade && ` (${idade})`}
                    </button>
                    <span className="text-border">·</span>
                    <button className="bg-background px-2.5 py-1 rounded-lg hover:ring-1 hover:ring-primary/50" onClick={() => setQuizPergunta(1)}>{DRAW_STYLES.find(d => d.id === desenhoEstilo)?.label}</button>
                    <span className="text-border">·</span>
                    <button className="bg-background px-2.5 py-1 rounded-lg hover:ring-1 hover:ring-primary/50" onClick={() => setQuizPergunta(2)}>{FONT_STYLES.find(f => f.id === fonteEstilo)?.label}</button>
                    <span className="text-border">·</span>
                    <button className="bg-background px-2.5 py-1 rounded-lg hover:ring-1 hover:ring-primary/50" onClick={() => setQuizPergunta(3)}>{DENSITY_STYLES.find(d => d.id === densidadeVisual)?.label}</button>
                    {frase.trim() && (
                      <>
                        <span className="text-border">·</span>
                        <button className="bg-background px-2.5 py-1 rounded-lg italic hover:ring-1 hover:ring-primary/50" onClick={() => setQuizPergunta(5)}>“{frase.trim()}”</button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setQualidade("low")}
                    className={`p-3 rounded-xl text-left transition-all duration-200 ${
                      qualidade === "low"
                        ? "gradient-hero text-white shadow-soft"
                        : "bg-secondary hover:bg-accent text-foreground"
                    }`}
                  >
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5" /> Rascunho rápido
                    </p>
                    <p className={`text-[10px] mt-0.5 ${qualidade === "low" ? "text-white/70" : "text-muted-foreground"}`}>
                      ~10–60s · ideal para testar
                    </p>
                  </button>
                  <button
                    onClick={() => setQualidade("medium")}
                    className={`p-3 rounded-xl text-left transition-all duration-200 ${
                      qualidade === "medium"
                        ? "gradient-hero text-white shadow-soft"
                        : "bg-secondary hover:bg-accent text-foreground"
                    }`}
                  >
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Final
                    </p>
                    <p className={`text-[10px] mt-0.5 ${qualidade === "medium" ? "text-white/70" : "text-muted-foreground"}`}>
                      ~5m · alta fidelidade
                    </p>
                  </button>
                </div>

                {/* Spacer for fixed button on mobile */}
                <div className="h-20 sm:hidden" />

                {/* Generate button — fixed on mobile */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 glass border-t border-border/40 z-40 sm:static sm:p-0 sm:bg-transparent sm:border-0 sm:backdrop-blur-none">
                  <Button
                    onClick={handleGenerate}
                    disabled={!nome.trim()}
                    className="w-full h-12 text-sm font-semibold rounded-full disabled:opacity-30 gradient-hero border-0 text-white shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all"
                    style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar arte com IA
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ─── STEP 4: ARTE GERADA ─── */}
        {step === 4 && (
          <section className="animate-fade-in">
            {isGenerating ? (
              <LoadingState
                title="Criando sua arte"
                subtitle={`${selectedTema?.name} · ${selectedMolde?.name} · ${nome}`}
                previewSrc={previewImage}
                isFinal={previewIsFinal}
              />
            ) : generatedImage ? (
              <div className="space-y-8">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-1.5 bg-secondary text-foreground px-3 py-1.5 rounded-full text-xs font-medium">
                    <Check className="h-3 w-3" /> Arte gerada
                  </div>
                  <h1 className="font-display text-3xl font-semibold text-foreground">
                    Ficou linda!
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Molde pronto para imprimir, recortar e montar.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8">
                  <div className="lg:col-span-3">
                    <div className="rounded-2xl overflow-hidden bg-secondary">
                      <img
                        src={generatedImage}
                        alt={`${selectedTema?.name} - ${selectedMolde?.name} - ${nome}`}
                        className="w-full h-auto"
                        onError={() => {
                          if (generatedImageBase64 && generatedImage !== generatedImageBase64) {
                            setGeneratedImage(generatedImageBase64);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-4">
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Baixar arte
                      </h3>
                      <Button
                        onClick={baixarSvgHibrido}
                        className="w-full h-11 rounded-full text-sm font-semibold gradient-hero border-0 text-white shadow-soft"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar SVG importável
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => void baixarMoldeOpcional("png")}
                          variant="outline"
                          className="rounded-full text-xs font-medium h-10"
                        >
                          <Download className="h-3.5 w-3.5 mr-1" />
                          Molde PNG
                        </Button>
                        <Button
                          onClick={() => void baixarMoldeOpcional("pdf")}
                          variant="outline"
                          className="rounded-full text-xs font-medium h-10"
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          Molde PDF
                        </Button>
                      </div>
                    </div>

                    <div className="border-t border-border/60" />

                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Foto de divulgação (opcional)
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => handleGenerateMockup("feed")}
                          className="h-11 rounded-full text-sm font-semibold gradient-hero border-0 text-white shadow-soft"
                        >
                          <ImageIcon className="h-4 w-4 mr-1.5" />
                          Criar Feed
                        </Button>
                        <Button
                          onClick={() => handleGenerateMockup("story")}
                          className="h-11 rounded-full text-sm font-semibold gradient-hero border-0 text-white shadow-soft"
                        >
                          <Camera className="h-4 w-4 mr-1.5" />
                          Criar Story
                        </Button>
                      </div>
                    </div>

                    <div className="border-t border-border/60" />

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleGenerate}
                        className="flex-1 rounded-full text-xs h-9"
                        size="sm"
                      >
                        <RefreshCw className="h-3 w-3 mr-1.5" /> Nova versão
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        className="flex-1 rounded-full text-xs h-9"
                        size="sm"
                      >
                        Recomeçar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        )}

        {/* ─── STEP 5: MOCKUP ─── */}
        {step === 5 && (
          <section className="animate-fade-in">
            {isGeneratingMockup ? (
              <LoadingState
                title="Criando mockup"
                subtitle={`${selectedMolde?.name} · ${selectedTema?.name}`}
                previewSrc={mockupPreview}
                isFinal={mockupPreviewIsFinal}
              />
            ) : mockupImage ? (
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => setStep(4)}
                    className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors mt-1"
                  >
                    <ArrowLeft className="h-4 w-4 text-foreground" />
                  </button>
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 bg-secondary text-foreground px-3 py-1 rounded-full text-xs font-medium">
                      <Check className="h-3 w-3" />
                      {mockupFormato === "feed" ? "Feed 1:1" : "Story 9:16"}
                    </div>
                    <h1 className="font-display text-3xl font-semibold text-foreground">
                      Mockup pronto
                    </h1>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                  <div className="lg:col-span-3">
                    <div className="rounded-2xl overflow-hidden bg-secondary">
                      <img
                        src={mockupImage}
                        alt={`Mockup ${selectedTema?.name}`}
                        className="w-full h-auto"
                        onError={() => {
                          if (mockupImageBase64 && mockupImage !== mockupImageBase64) {
                            setMockupImage(mockupImageBase64);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-4">
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Baixar mockup
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => void handleDownloadMockup("png")}
                          className="h-11 rounded-full text-sm font-semibold gradient-hero border-0 text-white shadow-soft"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          PNG
                        </Button>
                        <Button
                          onClick={() => void handleDownloadMockup("jpg")}
                          variant="outline"
                          className="h-11 rounded-full text-sm font-semibold"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          JPG/JPEG
                        </Button>
                      </div>
                    </div>

                    <div className="border-t border-border/60" />

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleGenerateMockup("feed")}
                        size="sm"
                        className="rounded-full text-xs h-9"
                      >
                        <RefreshCw className="h-3 w-3 mr-1.5" /> Novo Feed
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleGenerateMockup("story")}
                        size="sm"
                        className="rounded-full text-xs h-9"
                      >
                        <RefreshCw className="h-3 w-3 mr-1.5" /> Novo Story
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setStep(4)}
                        className="flex-1 rounded-full text-xs h-9"
                        size="sm"
                      >
                        <ArrowLeft className="h-3 w-3 mr-1.5" /> Voltar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        className="flex-1 rounded-full text-xs h-9"
                        size="sm"
                      >
                        Recomeçar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        )}
      </main>
    </div>
  );
}

/* ─── Sub-components ─── */

function LoadingState({
  title,
  subtitle,
  previewSrc,
  isFinal,
}: {
  title: string;
  subtitle: string;
  previewSrc?: string | null;
  isFinal?: boolean;
}) {
  // progresso estimado: sobe rápido no começo, desacelera perto do fim,
  // dá um salto quando a prévia chega e fecha em 100 na arte final
  const [pct, setPct] = useState(3);
  useEffect(() => {
    if (isFinal) { setPct(100); return; }
    const id = setInterval(() => {
      setPct((p) => {
        const teto = previewSrc ? 96 : 88;
        if (p >= teto) return p;
        const passo = p < 35 ? 2.4 : p < 65 ? 1.1 : 0.35;
        return Math.min(teto, p + passo);
      });
    }, 420);
    return () => clearInterval(id);
  }, [previewSrc, isFinal]);

  const etapa =
    pct < 25 ? "Preparando o molde…"
    : pct < 55 ? "Pintando o tema…"
    : pct < 80 ? "Caprichando nos detalhes…"
    : "Quase pronto…";

  return (
    <div className="max-w-md mx-auto py-10 sm:py-16 flex flex-col items-center gap-6">
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-secondary flex items-center justify-center">
        {previewSrc ? (
          <>
            <img
              src={previewSrc}
              alt="Prévia"
              className={`absolute inset-0 h-full w-full object-contain transition-[filter] duration-500 ${
                isFinal ? "" : "blur-xl scale-105"
              }`}
            />
            {!isFinal && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full px-10">
            <p className="font-display text-5xl font-bold text-foreground tabular-nums">
              {Math.round(pct)}<span className="text-2xl text-muted-foreground">%</span>
            </p>
            <div className="w-full h-2.5 rounded-full bg-background overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full gradient-hero transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{etapa}</p>
          </div>
        )}
        {previewSrc && !isFinal && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 bg-background/90 glass px-3 py-1.5 rounded-full text-[11px] font-medium text-foreground shadow-soft">
            <span className="tabular-nums font-semibold">{Math.round(pct)}%</span>
            Deixando nítida…
          </div>
        )}
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-lg font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
        <p className="text-xs text-muted-foreground/60 pt-1">
          {previewSrc && !isFinal
            ? "Você já está vendo uma prévia. A versão final chega em segundos."
            : "Sua arte está sendo montada com todo o carinho — vale a espera. 💖"}
        </p>
      </div>
    </div>
  );
}
