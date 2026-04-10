import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMoldes, useTemas } from "@/hooks/use-catalog";
import { supabase } from "@/integrations/supabase/client";
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
  const [isGeneratingMockup, setIsGeneratingMockup] = useState(false);
  const [mockupImage, setMockupImage] = useState<string | null>(null);
  const [mockupImageBase64, setMockupImageBase64] = useState<string | null>(null);
  const [mockupFormato, setMockupFormato] = useState<"feed" | "story">("feed");
  const [editingField, setEditingField] = useState<string | null>(null);

  const { data: moldes, isLoading: loadingMoldes } = useMoldes();
  const { data: temas, isLoading: loadingTemas } = useTemas();

  const handleSelectTema = (tema: any) => {
    setSelectedTema(tema);
    setStep(2);
  };

  const handleSelectMolde = (mold: any) => {
    setSelectedMolde(mold);
    setStep(3);
  };

  const handleGenerate = async () => {
    if (!nome.trim()) {
      toast.error("Digite o nome para personalizar");
      return;
    }
    setIsGenerating(true);
    setStep(4);
    try {
      const { data, error } = await supabase.functions.invoke("gerar-arte", {
        body: {
          moldeName: selectedMolde.name,
          temaNome: selectedTema.name,
          temaColors: selectedTema.colors,
          nome: nome.trim(),
          idade: idade.trim() || undefined,
          frase: frase.trim() || undefined,
          corDominante: corDominante || undefined,
          fonteEstilo,
          desenhoEstilo,
          densidadeVisual,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGeneratedImage(data.imageUrl);
      setGeneratedImageBase64(data.imageBase64);
      toast.success("Arte gerada com sucesso!");
    } catch (err: any) {
      console.error("Erro:", err);
      toast.error(err.message || "Erro ao gerar arte. Tente novamente.");
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
    try {
      const { data, error } = await supabase.functions.invoke("gerar-mockup", {
        body: {
          arteImageUrl: generatedImage,
          moldeName: selectedMolde.name,
          temaNome: selectedTema.name,
          nome: nome.trim(),
          formato,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMockupImage(data.mockupUrl);
      setMockupImageBase64(data.mockupBase64);
      toast.success("Mockup pronto!");
    } catch (err: any) {
      console.error("Erro:", err);
      toast.error(err.message || "Erro ao gerar mockup. Tente novamente.");
      setStep(4);
    } finally {
      setIsGeneratingMockup(false);
    }
  };

  const handleDownload = (base64: string | null, prefix: string) => {
    if (!base64) return;
    const link = document.createElement("a");
    link.href = base64;
    link.download = `${prefix}-${selectedTema?.name}-${selectedMolde?.name}-${nome}.png`;
    link.click();
  };

  const handleDownloadPDF = async (orientation: "portrait" | "landscape" = "landscape") => {
    if (!generatedImageBase64) return;
    try {
      const { default: jsPDF } = await import("jspdf");
      const isLandscape = orientation === "landscape";
      const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
      const pageW = isLandscape ? 297 : 210;
      const pageH = isLandscape ? 210 : 297;
      const margin = 12;
      const contentW = pageW - margin * 2;
      const contentH = pageH - margin * 2 - 28;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(60, 60, 60);
      doc.text("MoldePronto", margin, margin + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text(
        `${selectedTema?.name} · ${selectedMolde?.name} · ${nome}${idade ? ` (${idade} anos)` : ""}`,
        margin, margin + 11
      );
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(margin, margin + 14, pageW - margin, margin + 14);

      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = generatedImageBase64!;
      });

      const imgRatio = img.width / img.height;
      let drawW = contentW - 14;
      let drawH = drawW / imgRatio;
      if (drawH > contentH) {
        drawH = contentH;
        drawW = drawH * imgRatio;
      }
      const rulerSpace = 7;
      const offsetX = margin + rulerSpace + (contentW - rulerSpace - drawW) / 2;
      const offsetY = margin + 20;

      const rulerColor = { r: 180, g: 180, b: 180 };
      doc.setDrawColor(rulerColor.r, rulerColor.g, rulerColor.b);
      doc.setLineWidth(0.2);
      const rulerX = offsetX - 4;
      doc.line(rulerX, offsetY, rulerX, offsetY + drawH);
      const cmCountV = Math.floor(drawH / 10);
      for (let i = 0; i <= cmCountV * 10; i++) {
        const y = offsetY + i;
        if (y > offsetY + drawH) break;
        const isCm = i % 10 === 0;
        const isHalf = i % 5 === 0;
        const tickLen = isCm ? 3 : isHalf ? 2 : 1.5;
        doc.line(rulerX - tickLen, y, rulerX, y);
        if (isCm && i > 0) {
          doc.setFontSize(5);
          doc.setTextColor(rulerColor.r, rulerColor.g, rulerColor.b);
          doc.text(`${i / 10}`, rulerX - tickLen - 3.5, y + 1);
        }
      }

      const rulerY = offsetY - 4;
      doc.setDrawColor(rulerColor.r, rulerColor.g, rulerColor.b);
      doc.line(offsetX, rulerY, offsetX + drawW, rulerY);
      const cmCountH = Math.floor(drawW / 10);
      for (let i = 0; i <= cmCountH * 10; i++) {
        const x = offsetX + i;
        if (x > offsetX + drawW) break;
        const isCm = i % 10 === 0;
        const isHalf = i % 5 === 0;
        const tickLen = isCm ? 3 : isHalf ? 2 : 1.5;
        doc.line(x, rulerY - tickLen, x, rulerY);
        if (isCm && i > 0) {
          doc.setFontSize(5);
          doc.setTextColor(rulerColor.r, rulerColor.g, rulerColor.b);
          doc.text(`${i / 10}`, x - 1.5, rulerY - tickLen - 1);
        }
      }

      doc.addImage(generatedImageBase64!, "PNG", offsetX, offsetY, drawW, drawH);

      const markLen = 6;
      const markGap = 2;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.35);
      doc.line(offsetX - markGap, offsetY, offsetX - markGap - markLen, offsetY);
      doc.line(offsetX, offsetY - markGap, offsetX, offsetY - markGap - markLen);
      doc.line(offsetX + drawW + markGap, offsetY, offsetX + drawW + markGap + markLen, offsetY);
      doc.line(offsetX + drawW, offsetY - markGap, offsetX + drawW, offsetY - markGap - markLen);
      doc.line(offsetX - markGap, offsetY + drawH, offsetX - markGap - markLen, offsetY + drawH);
      doc.line(offsetX, offsetY + drawH + markGap, offsetX, offsetY + drawH + markGap + markLen);
      doc.line(offsetX + drawW + markGap, offsetY + drawH, offsetX + drawW + markGap + markLen, offsetY + drawH);
      doc.line(offsetX + drawW, offsetY + drawH + markGap, offsetX + drawW, offsetY + drawH + markGap + markLen);

      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.25);
      const dashLen = 3;
      const gapLen = 2;
      const foldY = offsetY + drawH / 2;
      let cx = offsetX;
      while (cx < offsetX + drawW) {
        const end = Math.min(cx + dashLen, offsetX + drawW);
        doc.line(cx, foldY, end, foldY);
        cx += dashLen + gapLen;
      }
      const foldX = offsetX + drawW / 2;
      let cy = offsetY;
      while (cy < offsetY + drawH) {
        const end = Math.min(cy + dashLen, offsetY + drawH);
        doc.line(foldX, cy, foldX, end);
        cy += dashLen + gapLen;
      }

      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `${Math.round(drawW / 10 * 10) / 10} × ${Math.round(drawH / 10 * 10) / 10} cm`,
        offsetX + drawW + 3, offsetY + drawH + 5
      );

      const legendY = offsetY + drawH + 12;
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.4);
      doc.line(margin, legendY, margin + 12, legendY);
      doc.text("Linha de corte (recortar)", margin + 14, legendY + 1);
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.25);
      let lx = margin;
      const ly = legendY + 6;
      for (let i = 0; i < 4; i++) {
        doc.line(lx, ly, lx + 2, ly);
        lx += 3.5;
      }
      doc.text("Linha de dobra (dobrar)", margin + 14, ly + 1);
      doc.setDrawColor(rulerColor.r, rulerColor.g, rulerColor.b);
      doc.setLineWidth(0.2);
      doc.line(margin, legendY + 12, margin + 12, legendY + 12);
      for (let i = 0; i <= 12; i += 3) {
        doc.line(margin + i, legendY + 12 - 1.5, margin + i, legendY + 12);
      }
      doc.text("Régua em centímetros (cm)", margin + 14, legendY + 13);

      const footerY = pageH - margin;
      doc.setFontSize(6.5);
      doc.setTextColor(170, 170, 170);
      doc.text("Imprima em A4 · Escala 100% · Sem ajuste de página · Qualidade: Alta", margin, footerY);
      doc.text("MoldePronto.com", pageW - margin, footerY, { align: "right" });

      doc.save(`molde-${selectedTema?.name}-${selectedMolde?.name}-${nome}.pdf`);
      toast.success("PDF salvo!");
    } catch (err) {
      console.error("Erro PDF:", err);
      toast.error("Erro ao gerar PDF");
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
    setMockupImage(null);
    setMockupImageBase64(null);
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
              <img src={themeImages[selectedTema.name]} alt="" className="h-5 w-5 rounded-full object-cover" />
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
                <img src={moldImages[selectedMolde.name]} alt="" className="h-5 w-5 object-contain" />
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
        <div className="max-w-4xl mx-auto px-4 sm:px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl gradient-hero flex items-center justify-center shrink-0 shadow-soft">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm sm:text-[15px] font-bold tracking-tight text-foreground">
              Molde<span className="text-gradient">Pronto</span>
            </span>
          </div>

          {/* Step pills — desktop */}
          <nav className="hidden sm:flex items-center gap-1">
            {STEPS.map((s, i) => {
              const isActive = step === i + 1;
              const isDone = step > i + 1;
              return (
                <button
                  key={s.key}
                  onClick={() => { if (isDone) setStep(i + 1); }}
                  disabled={!isDone && !isActive}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? "gradient-hero text-white shadow-soft"
                      : isDone
                      ? "bg-primary/10 text-primary hover:bg-primary/15 cursor-pointer"
                      : "text-border cursor-default"
                  }`}
                >
                  {isDone && <Check className="h-3 w-3 inline mr-1" />}
                  {s.label}
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

      <main className="max-w-4xl mx-auto px-4 sm:px-5 py-6 sm:py-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
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
                        <img
                          src={image}
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
                {(moldes ?? []).filter((m) => m.category === "Caixas" || m.category === "Embalagens").map((mold) => {
                  const image = mold.image_url || moldImages[mold.name];
                  return (
                    <button
                      key={mold.id}
                      onClick={() => handleSelectMolde(mold)}
                      className="group text-left rounded-2xl overflow-hidden bg-secondary hover:bg-accent transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2"
                    >
                      <div className="aspect-square flex items-center justify-center p-6">
                        {image ? (
                          <img
                            src={image}
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

        {/* ─── STEP 3: PERSONALIZAR ─── */}
        {step === 3 && (
          <section className="max-w-lg mx-auto animate-fade-in space-y-8">
            <div className="flex items-start gap-4">
              <button
                onClick={() => setStep(2)}
                className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors mt-1"
              >
                <ArrowLeft className="h-4 w-4 text-foreground" />
              </button>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Passo 3
                </p>
                <h1 className="font-display text-3xl font-semibold text-foreground">
                  Personalizar
                </h1>
              </div>
            </div>

            {/* Dados */}
            <div className="space-y-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Dados do homenageado
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Nome *</label>
                    <Input
                      placeholder="Ex: Maria Clara"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="h-11 bg-secondary border-0 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-foreground"
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
                      className="h-11 bg-secondary border-0 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-foreground"
                      maxLength={3}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Frase personalizada</label>
                  <Input
                    placeholder="Ex: Obrigada por celebrar comigo!"
                    value={frase}
                    onChange={(e) => setFrase(e.target.value)}
                    className="h-11 bg-secondary border-0 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-foreground"
                    maxLength={80}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border/60" />

            {/* Cor dominante */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Cor dominante
                </h3>
                <span className="text-[10px] text-muted-foreground/60">opcional</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCorDominante("")}
                  className={`h-8 px-3 rounded-full text-xs font-medium transition-all ${
                    !corDominante
                      ? "bg-foreground text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-accent"
                  }`}
                >
                  Auto
                </button>
                {COR_PRESETS.map((cor) => (
                  <button
                    key={cor}
                    onClick={() => setCorDominante(cor)}
                    className={`h-8 w-8 rounded-full transition-all duration-200 ${
                      corDominante === cor
                        ? "ring-2 ring-foreground ring-offset-2 scale-110"
                        : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground">Personalizada:</label>
                <input
                  type="color"
                  value={corDominante || "#FF69B4"}
                  onChange={(e) => setCorDominante(e.target.value)}
                  className="h-7 w-10 rounded-lg cursor-pointer border-0 bg-transparent"
                />
                {corDominante && (
                  <span className="text-[11px] font-mono text-muted-foreground">{corDominante}</span>
                )}
              </div>
            </div>

            <div className="border-t border-border/60" />

            {/* Estilo de fonte */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Estilo da fonte
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FONT_STYLES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFonteEstilo(f.id)}
                    className={`relative p-3 rounded-xl text-left transition-all duration-200 ${
                      fonteEstilo === f.id
                        ? "bg-foreground text-primary-foreground"
                        : "bg-secondary hover:bg-accent text-foreground"
                    }`}
                  >
                    <p className="text-sm font-medium">{f.emoji} {f.label}</p>
                    <p className={`text-[10px] mt-0.5 ${fonteEstilo === f.id ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {f.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border/60" />

            {/* Estilo de desenho */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Estilo de desenho
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DRAW_STYLES.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDesenhoEstilo(d.id)}
                    className={`relative p-3 rounded-xl text-left transition-all duration-200 ${
                      desenhoEstilo === d.id
                        ? "bg-foreground text-primary-foreground"
                        : "bg-secondary hover:bg-accent text-foreground"
                    }`}
                  >
                    <p className="text-sm font-medium">{d.emoji} {d.label}</p>
                    <p className={`text-[10px] mt-0.5 ${desenhoEstilo === d.id ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {d.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border/60" />

            {/* Densidade visual */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Densidade visual
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DENSITY_STYLES.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDensidadeVisual(d.id)}
                    className={`relative p-3 rounded-xl text-left transition-all duration-200 ${
                      densidadeVisual === d.id
                        ? "bg-foreground text-primary-foreground"
                        : "bg-secondary hover:bg-accent text-foreground"
                    }`}
                  >
                    <p className="text-sm font-medium">{d.emoji} {d.label}</p>
                    <p className={`text-[10px] mt-0.5 ${densidadeVisual === d.id ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {d.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {nome.trim() && (
              <>
                <div className="border-t border-border/60" />
                <div className="rounded-2xl bg-secondary p-4 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Resumo
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-foreground">
                    <span className="bg-background px-2.5 py-1 rounded-lg font-medium">{selectedTema?.name}</span>
                    <span className="text-border">·</span>
                    <span className="bg-background px-2.5 py-1 rounded-lg">{selectedMolde?.name}</span>
                    <span className="text-border">·</span>
                    <span className="bg-background px-2.5 py-1 rounded-lg font-semibold" style={corDominante ? { color: corDominante } : undefined}>
                      {nome}{idade && ` (${idade})`}
                    </span>
                    <span className="text-border">·</span>
                    <span className="bg-background px-2.5 py-1 rounded-lg">{FONT_STYLES.find(f => f.id === fonteEstilo)?.label}</span>
                    <span className="text-border">·</span>
                    <span className="bg-background px-2.5 py-1 rounded-lg">{DRAW_STYLES.find(d => d.id === desenhoEstilo)?.label}</span>
                    <span className="text-border">·</span>
                    <span className="bg-background px-2.5 py-1 rounded-lg">{DENSITY_STYLES.find(d => d.id === densidadeVisual)?.label}</span>
                  </div>
                </div>
              </>
            )}

            {/* Spacer for fixed button on mobile */}
            <div className="h-20 sm:hidden" />

            {/* Generate button — fixed on mobile */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 glass border-t border-border/40 z-40 sm:static sm:p-0 sm:bg-transparent sm:border-0 sm:backdrop-blur-none">
              <Button
                onClick={handleGenerate}
                disabled={!nome.trim()}
                className="w-full h-12 text-sm font-semibold rounded-full disabled:opacity-30"
                style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar arte com IA
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </section>
        )}

        {/* ─── STEP 4: ARTE GERADA ─── */}
        {step === 4 && (
          <section className="animate-fade-in">
            {isGenerating ? (
              <LoadingState
                title="Criando sua arte"
                subtitle={`${selectedTema?.name} · ${selectedMolde?.name} · ${nome}`}
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
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-4">
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Baixar arte
                      </h3>
                      <Button
                        onClick={() => handleDownload(generatedImageBase64, "arte")}
                        className="w-full h-11 rounded-full text-sm font-semibold"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar PNG
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => handleDownloadPDF("landscape")}
                          variant="outline"
                          className="rounded-full text-xs font-medium h-9"
                          size="sm"
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          PDF Horizontal
                        </Button>
                        <Button
                          onClick={() => handleDownloadPDF("portrait")}
                          variant="outline"
                          className="rounded-full text-xs font-medium h-9"
                          size="sm"
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          PDF Vertical
                        </Button>
                      </div>
                    </div>

                    <div className="border-t border-border/60" />

                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Mockup para Instagram
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => handleGenerateMockup("feed")}
                          className="h-11 rounded-full text-sm font-semibold"
                        >
                          <ImageIcon className="h-4 w-4 mr-1.5" />
                          Feed
                        </Button>
                        <Button
                          onClick={() => handleGenerateMockup("story")}
                          className="h-11 rounded-full text-sm font-semibold"
                        >
                          <Camera className="h-4 w-4 mr-1.5" />
                          Story
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
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-4">
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Baixar mockup
                      </h3>
                      <Button
                        onClick={() => handleDownload(mockupImageBase64, "mockup")}
                        className="w-full h-11 rounded-full text-sm font-semibold"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar PNG
                      </Button>
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

function LoadingState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="max-w-sm mx-auto py-32 flex flex-col items-center gap-6">
      <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-lg font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
        <p className="text-xs text-muted-foreground/50 pt-2">Pode levar até 30 segundos</p>
      </div>
    </div>
  );
}
