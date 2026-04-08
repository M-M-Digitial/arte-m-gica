import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMoldes, useTemas } from "@/hooks/use-catalog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Download, Loader2, Check, RefreshCw, Camera, ImageIcon } from "lucide-react";

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
  "Barbie": themeBarbie,
  "Minnie Rosa": themeMinnie,
  "Unicórnio": themeUnicornio,
  "Jardim Encantado": themeJardim,
  "Sereia / Fundo do Mar": themeSereia,
  "Frozen": themeFrozen,
  "Encanto": themeEncanto,
  "Moranguinho": themeMoranguinho,
  "Patrulha Canina": themePatrulha,
  "Dinossauros": themeDinossauros,
  "Super-Heróis": themeHerois,
  "Homem-Aranha": themeAranha,
  "Carros / McQueen": themeCarros,
  "Safari": themeSafari,
  "Astronauta / Espaço": themeAstronauta,
  "Sonic": themeSonic,
  "Mickey": themeMickey,
  "Stitch": themeStitch,
  "Circo": themeCirco,
  "Fazendinha": themeFazendinha,
  "Turma da Mônica": themeMonica,
  "Galinha Pintadinha": themeGalinha,
  "Cocomelon": themeCocomelon,
  "Chá Revelação": themeChaRevelacao,
  "Dia das Mães": themeDiaMaes,
  "Chá de Bebê": themeChaBebe,
  "Batizado": themeBatizado,
  "Festa Junina": themeFestaJunina,
  "Natal": themeNatal,
};

export default function Criar() {
  const [step, setStep] = useState(1);
  const [selectedTema, setSelectedTema] = useState<any>(null);
  const [selectedMolde, setSelectedMolde] = useState<any>(null);
  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedImageBase64, setGeneratedImageBase64] = useState<string | null>(null);

  // Mockup state
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
      toast.error("Digite o nome para personalizar a arte");
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
      toast.success("Arte pronta! 🎉");
    } catch (err: any) {
      console.error("Erro ao gerar arte:", err);
      toast.error(err.message || "Erro ao gerar a arte. Tente novamente.");
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
      toast.success("Mockup pronto! 📸");
    } catch (err: any) {
      console.error("Erro ao gerar mockup:", err);
      toast.error(err.message || "Erro ao gerar o mockup. Tente novamente.");
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

  const stepLabels = ["Tema", "Molde", "Nome", "Arte", "Mockup"];

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl">
      {/* Step indicator */}
      <div className="flex items-center gap-1 flex-wrap">
        {stepLabels.map((label, i) => (
          <div key={i} className="flex items-center gap-1">
            <button
              onClick={() => { if (i + 1 < step) setStep(i + 1); }}
              disabled={i + 1 >= step}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                step === i + 1
                  ? "gradient-hero text-primary-foreground"
                  : step > i + 1
                  ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > i + 1 ? <Check className="h-3 w-3 inline mr-0.5" /> : null}{label}
            </button>
            {i < stepLabels.length - 1 && (
              <span className="text-muted-foreground text-xs">›</span>
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Theme */}
      {step === 1 && (
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">🎨 Qual o tema da festa?</h1>
            <p className="text-sm text-muted-foreground">Toque no tema para continuar</p>
          </div>
          {loadingTemas ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({ length: 15 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {(temas ?? []).map((tema) => {
                const image = tema.image_url || themeImages[tema.name];
                return (
                  <Card
                    key={tema.id}
                    onClick={() => handleSelectTema(tema)}
                    className="group cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg overflow-hidden border-border/30"
                  >
                    <CardContent className="p-0">
                      <div className="aspect-square bg-card overflow-hidden">
                        {image ? (
                          <img src={image} alt={tema.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <span className="text-3xl">{tema.emoji || "🎉"}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-2 text-center">
                        <h3 className="font-semibold text-xs text-foreground leading-tight">{tema.name}</h3>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Choose Mold */}
      {step === 2 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setStep(1)} className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">📦 Escolha o molde</h1>
              <p className="text-sm text-muted-foreground">
                Tema: <span className="text-primary font-medium">{selectedTema?.name}</span>
              </p>
            </div>
          </div>
          {loadingMoldes ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {(moldes ?? []).map((mold) => {
                const image = mold.image_url || moldImages[mold.name];
                return (
                  <Card
                    key={mold.id}
                    onClick={() => handleSelectMolde(mold)}
                    className="group cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg overflow-hidden border-border/30"
                  >
                    <CardContent className="p-0">
                      <div className="aspect-square bg-card flex items-center justify-center p-3">
                        {image ? (
                          <img src={image} alt={mold.name} className="h-full w-auto object-contain group-hover:scale-110 transition-transform duration-300" />
                        ) : (
                          <span className="text-3xl">{mold.emoji || "📦"}</span>
                        )}
                      </div>
                      <div className="p-2 text-center">
                        <h3 className="font-semibold text-xs text-foreground leading-tight">{mold.name}</h3>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Name + Generate */}
      {step === 3 && (
        <div className="space-y-5 max-w-md">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setStep(2)} className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">✍️ Personalizar</h1>
              <p className="text-sm text-muted-foreground">Só falta o nome!</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-sm">
              {themeImages[selectedTema?.name] ? (
                <img src={themeImages[selectedTema?.name]} alt="" className="h-8 w-8 rounded object-cover" />
              ) : <span>{selectedTema?.emoji || "🎨"}</span>}
              <span className="font-medium text-foreground">{selectedTema?.name}</span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-sm">
              {moldImages[selectedMolde?.name] ? (
                <img src={moldImages[selectedMolde?.name]} alt="" className="h-8 w-8 object-contain" />
              ) : <span>{selectedMolde?.emoji || "📦"}</span>}
              <span className="font-medium text-foreground">{selectedMolde?.name}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground">Nome *</label>
              <Input
                placeholder="Ex: Maria Clara"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1 bg-card border-border/50 text-lg h-12"
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
                className="mt-1 bg-card border-border/50"
                maxLength={3}
              />
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!nome.trim()}
            className="w-full gradient-hero border-0 text-primary-foreground h-12 text-base font-semibold"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Gerar Arte com IA
          </Button>
        </div>
      )}

      {/* Step 4: Art Result + Mockup CTA */}
      {step === 4 && (
        <div className="space-y-5">
          {isGenerating ? (
            <Card className="border-border/50">
              <CardContent className="p-12 flex flex-col items-center gap-4">
                <div className="relative">
                  <Loader2 className="h-16 w-16 text-primary animate-spin" />
                  <Sparkles className="h-6 w-6 text-primary absolute -top-1 -right-1 animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                  <p className="font-semibold text-foreground text-lg">Criando sua arte...</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedTema?.name} + {selectedMolde?.name} para {nome}
                  </p>
                  <p className="text-xs text-muted-foreground">Pode levar até 30 segundos</p>
                </div>
              </CardContent>
            </Card>
          ) : generatedImage ? (
            <div className="space-y-5">
              <h1 className="text-2xl font-display font-bold text-foreground">🎉 Arte pronta!</h1>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Art preview */}
                <Card className="border-border/50 overflow-hidden">
                  <CardContent className="p-0">
                    <img
                      src={generatedImage}
                      alt={`${selectedTema?.name} - ${selectedMolde?.name} - ${nome}`}
                      className="w-full h-auto"
                    />
                  </CardContent>
                </Card>

                {/* Actions panel */}
                <div className="space-y-4">
                  {/* Download art */}
                  <Card className="border-border/50">
                    <CardContent className="p-4 space-y-3">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Download className="h-4 w-4" /> Baixar Arte
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Molde planificado pronto para imprimir, recortar e montar.
                      </p>
                      <Button
                        onClick={() => handleDownload(generatedImageBase64, "arte")}
                        className="w-full gradient-hero border-0 text-primary-foreground"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar PNG
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Generate mockup CTA */}
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4 space-y-3">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Camera className="h-4 w-4" /> Gerar Mockup para Divulgação
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        A IA cria uma foto realista do produto montado, pronta pra você postar no Instagram!
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => handleGenerateMockup("feed")}
                          variant="outline"
                          className="border-primary/30 hover:bg-primary/10"
                        >
                          <ImageIcon className="h-4 w-4 mr-1" />
                          Feed (1:1)
                        </Button>
                        <Button
                          onClick={() => handleGenerateMockup("story")}
                          variant="outline"
                          className="border-primary/30 hover:bg-primary/10"
                        >
                          <Camera className="h-4 w-4 mr-1" />
                          Story (9:16)
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Other actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleGenerate}
                      className="flex-1 border-border/50"
                      size="sm"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Nova versão
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="flex-1 border-border/50"
                      size="sm"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Nova arte
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Step 5: Mockup Result */}
      {step === 5 && (
        <div className="space-y-5">
          {isGeneratingMockup ? (
            <Card className="border-border/50">
              <CardContent className="p-12 flex flex-col items-center gap-4">
                <div className="relative">
                  <Loader2 className="h-16 w-16 text-primary animate-spin" />
                  <Camera className="h-6 w-6 text-primary absolute -top-1 -right-1 animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                  <p className="font-semibold text-foreground text-lg">Criando mockup...</p>
                  <p className="text-sm text-muted-foreground">
                    Montando {selectedMolde?.name} com tema {selectedTema?.name} em cenário de festa
                  </p>
                  <p className="text-xs text-muted-foreground">Pode levar até 30 segundos</p>
                </div>
              </CardContent>
            </Card>
          ) : mockupImage ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setStep(4)} className="shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-display font-bold text-foreground">📸 Mockup pronto para divulgar!</h1>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Mockup preview */}
                <Card className="border-border/50 overflow-hidden">
                  <CardContent className="p-0">
                    <img
                      src={mockupImage}
                      alt={`Mockup ${selectedTema?.name} - ${selectedMolde?.name}`}
                      className="w-full h-auto"
                    />
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="space-y-4">
                  <Card className="border-border/50">
                    <CardContent className="p-4 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Mockup {mockupFormato === "feed" ? "quadrado (Feed)" : "vertical (Story)"} do produto montado, pronto pra postar!
                      </p>
                      <Button
                        onClick={() => handleDownload(mockupImageBase64, "mockup")}
                        className="w-full gradient-hero border-0 text-primary-foreground"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar Mockup
                      </Button>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleGenerateMockup("feed")}
                      className="border-border/50"
                      size="sm"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Novo Feed
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleGenerateMockup("story")}
                      className="border-border/50"
                      size="sm"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Novo Story
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setStep(4)}
                      className="flex-1 border-border/50"
                      size="sm"
                    >
                      <ArrowLeft className="h-3 w-3 mr-1" />
                      Voltar à arte
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="flex-1 border-border/50"
                      size="sm"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Nova arte
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
