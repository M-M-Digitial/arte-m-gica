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

// New theme images
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
  "Porta-bis": moldMilkBox,
  "Sacolinha": moldSacolinha,
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
  { key: "nome", label: "Nome", icon: Type },
  { key: "arte", label: "Arte", icon: Sparkles },
  { key: "mockup", label: "Mockup", icon: Camera },
];

export default function Criar() {
  const [step, setStep] = useState(1);
  const [selectedTema, setSelectedTema] = useState<any>(null);
  const [selectedMolde, setSelectedMolde] = useState<any>(null);
  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedImageBase64, setGeneratedImageBase64] = useState<string | null>(null);
  const [isGeneratingMockup, setIsGeneratingMockup] = useState(false);
  const [mockupImage, setMockupImage] = useState<string | null>(null);
  const [mockupImageBase64, setMockupImageBase64] = useState<string | null>(null);
  const [mockupFormato, setMockupFormato] = useState<"feed" | "story">("feed");

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

  const handleReset = () => {
    setStep(1);
    setSelectedTema(null);
    setSelectedMolde(null);
    setNome("");
    setIdade("");
    setGeneratedImage(null);
    setGeneratedImageBase64(null);
    setMockupImage(null);
    setMockupImageBase64(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg gradient-hero flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">
              MoldePronto
            </span>
          </div>

          {/* Step pills */}
          <nav className="hidden sm:flex items-center gap-1">
            {STEPS.map((s, i) => {
              const StepIcon = s.icon;
              const isActive = step === i + 1;
              const isDone = step > i + 1;
              return (
                <button
                  key={s.key}
                  onClick={() => { if (isDone) setStep(i + 1); }}
                  disabled={!isDone}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? "gradient-hero text-white shadow-soft"
                      : isDone
                      ? "bg-primary/10 text-primary hover:bg-primary/15 cursor-pointer"
                      : "text-muted-foreground"
                  }`}
                >
                  {isDone ? <Check className="h-3 w-3" /> : <StepIcon className="h-3 w-3" />}
                  {s.label}
                </button>
              );
            })}
          </nav>

          {step > 1 && step <= 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground text-xs"
            >
              Recomeçar
            </Button>
          )}
          {(step > 3 || step === 1) && <div className="w-20" />}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* ─── STEP 1: TEMA ─── */}
        {step === 1 && (
          <section className="space-y-5 animate-in fade-in duration-300">
            <div className="text-center max-w-lg mx-auto">
              <h1 className="text-2xl font-bold text-foreground">
                Qual o tema da festa?
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Escolha o tema e a IA faz toda a arte pra você
              </p>
            </div>
            {loadingTemas ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {Array.from({ length: 18 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {(temas ?? []).map((tema) => {
                  const image = tema.image_url || themeImages[tema.name];
                  return (
                    <button
                      key={tema.id}
                      onClick={() => handleSelectTema(tema)}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-card shadow-card hover:shadow-soft transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={tema.name}
                          className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-accent/30">
                          <span className="text-3xl">{tema.emoji || "🎉"}</span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2 pt-6">
                        <span className="text-white text-[11px] font-semibold leading-tight block">
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
          <section className="space-y-5 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep(1)}
                className="h-9 w-9 rounded-full bg-card shadow-card flex items-center justify-center hover:bg-accent/50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-foreground" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Escolha o molde</h1>
                <p className="text-sm text-muted-foreground">
                  Tema: <span className="text-primary font-semibold">{selectedTema?.name}</span>
                </p>
              </div>
            </div>
            {loadingMoldes ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {(moldes ?? []).map((mold) => {
                  const image = mold.image_url || moldImages[mold.name];
                  return (
                    <button
                      key={mold.id}
                      onClick={() => handleSelectMolde(mold)}
                      className="group bg-card rounded-xl shadow-card overflow-hidden hover:shadow-soft transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <div className="aspect-square flex items-center justify-center p-4 bg-muted/30">
                        {image ? (
                          <img
                            src={image}
                            alt={mold.name}
                            className="h-full w-auto object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <span className="text-4xl">{mold.emoji || "📦"}</span>
                        )}
                      </div>
                      <div className="p-2.5 text-center border-t border-border/30">
                        <span className="text-xs font-semibold text-foreground">{mold.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ─── STEP 3: NOME ─── */}
        {step === 3 && (
          <section className="max-w-md mx-auto space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep(2)}
                className="h-9 w-9 rounded-full bg-card shadow-card flex items-center justify-center hover:bg-accent/50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-foreground" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Personalizar</h1>
                <p className="text-sm text-muted-foreground">Só falta o nome!</p>
              </div>
            </div>

            {/* Selected items summary */}
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-card rounded-lg px-3 py-2.5 shadow-card">
                {themeImages[selectedTema?.name] && (
                  <img src={themeImages[selectedTema.name]} alt="" className="h-9 w-9 rounded-md object-cover" />
                )}
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Tema</p>
                  <p className="text-sm font-semibold text-foreground truncate">{selectedTema?.name}</p>
                </div>
              </div>
              <div className="flex-1 flex items-center gap-2 bg-card rounded-lg px-3 py-2.5 shadow-card">
                {moldImages[selectedMolde?.name] && (
                  <img src={moldImages[selectedMolde.name]} alt="" className="h-9 w-9 object-contain" />
                )}
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Molde</p>
                  <p className="text-sm font-semibold text-foreground truncate">{selectedMolde?.name}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground">
                  Nome da criança / homenageado(a) *
                </label>
                <Input
                  placeholder="Ex: Maria Clara"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="mt-1.5 h-12 text-base bg-card border-border/60 focus:border-primary shadow-card"
                  maxLength={50}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Idade (opcional)</label>
                <Input
                  placeholder="Ex: 5"
                  value={idade}
                  onChange={(e) => setIdade(e.target.value)}
                  className="mt-1.5 bg-card border-border/60 shadow-card"
                  maxLength={3}
                />
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!nome.trim()}
              className="w-full h-13 text-base font-bold gradient-hero border-0 text-white shadow-soft hover:opacity-95 transition-opacity"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Gerar Arte com IA
            </Button>
          </section>
        )}

        {/* ─── STEP 4: ARTE GERADA ─── */}
        {step === 4 && (
          <section className="animate-in fade-in duration-300">
            {isGenerating ? (
              <LoadingState
                title="Criando sua arte..."
                subtitle={`${selectedTema?.name} + ${selectedMolde?.name} para ${nome}`}
                icon={<Sparkles className="h-5 w-5 text-primary absolute -top-1 -right-1 animate-pulse" />}
              />
            ) : generatedImage ? (
              <div className="space-y-5">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-foreground">Arte pronta! 🎉</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Molde planificado pronto para imprimir, recortar e montar
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                  {/* Image */}
                  <div className="lg:col-span-3">
                    <Card className="overflow-hidden shadow-card border-border/30">
                      <CardContent className="p-0">
                        <img
                          src={generatedImage}
                          alt={`${selectedTema?.name} - ${selectedMolde?.name} - ${nome}`}
                          className="w-full h-auto"
                        />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Actions */}
                  <div className="lg:col-span-2 space-y-4">
                    <ActionCard
                      icon={<Download className="h-5 w-5 text-primary" />}
                      title="Baixar Arte"
                      description="Molde pronto para imprimir em A4"
                    >
                      <Button
                        onClick={() => handleDownload(generatedImageBase64, "arte")}
                        className="w-full gradient-hero border-0 text-white font-semibold shadow-soft"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar PNG
                      </Button>
                    </ActionCard>

                    <ActionCard
                      icon={<Camera className="h-5 w-5 text-primary" />}
                      title="Gerar Mockup"
                      description="Foto realista do produto montado pra divulgar no Instagram"
                      highlight
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => handleGenerateMockup("feed")}
                          className="gradient-hero border-0 text-white font-semibold"
                          size="sm"
                        >
                          <ImageIcon className="h-3.5 w-3.5 mr-1" />
                          Feed
                        </Button>
                        <Button
                          onClick={() => handleGenerateMockup("story")}
                          className="gradient-hero border-0 text-white font-semibold"
                          size="sm"
                        >
                          <Camera className="h-3.5 w-3.5 mr-1" />
                          Story
                        </Button>
                      </div>
                    </ActionCard>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleGenerate}
                        className="flex-1 text-xs"
                        size="sm"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" /> Nova versão
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        className="flex-1 text-xs"
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
          <section className="animate-in fade-in duration-300">
            {isGeneratingMockup ? (
              <LoadingState
                title="Criando mockup..."
                subtitle={`Montando ${selectedMolde?.name} com tema ${selectedTema?.name}`}
                icon={<Camera className="h-5 w-5 text-primary absolute -top-1 -right-1 animate-pulse" />}
              />
            ) : mockupImage ? (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep(4)}
                    className="h-9 w-9 rounded-full bg-card shadow-card flex items-center justify-center hover:bg-accent/50 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 text-foreground" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Mockup pronto! 📸</h1>
                    <p className="text-sm text-muted-foreground">
                      {mockupFormato === "feed" ? "Feed (1:1)" : "Story (9:16)"} — pronto pra postar
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                  <div className="lg:col-span-3">
                    <Card className="overflow-hidden shadow-card border-border/30">
                      <CardContent className="p-0">
                        <img
                          src={mockupImage}
                          alt={`Mockup ${selectedTema?.name}`}
                          className="w-full h-auto"
                        />
                      </CardContent>
                    </Card>
                  </div>

                  <div className="lg:col-span-2 space-y-4">
                    <ActionCard
                      icon={<Download className="h-5 w-5 text-primary" />}
                      title="Baixar Mockup"
                      description="Imagem pronta para redes sociais"
                    >
                      <Button
                        onClick={() => handleDownload(mockupImageBase64, "mockup")}
                        className="w-full gradient-hero border-0 text-white font-semibold shadow-soft"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar PNG
                      </Button>
                    </ActionCard>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleGenerateMockup("feed")}
                        size="sm"
                        className="text-xs"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" /> Novo Feed
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleGenerateMockup("story")}
                        size="sm"
                        className="text-xs"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" /> Novo Story
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setStep(4)}
                        className="flex-1 text-xs"
                        size="sm"
                      >
                        <ArrowLeft className="h-3 w-3 mr-1" /> Voltar à arte
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        className="flex-1 text-xs"
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
  icon,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="max-w-sm mx-auto py-20 flex flex-col items-center gap-5">
      <div className="relative">
        <Loader2 className="h-14 w-14 text-primary animate-spin" />
        {icon}
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-lg font-bold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
        <p className="text-xs text-muted-foreground/70">Pode levar até 30 segundos</p>
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  children,
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`shadow-card border-border/30 ${
        highlight ? "ring-1 ring-primary/20 bg-primary/[0.02]" : ""
      }`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
