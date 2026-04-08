import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMoldes, useTemas } from "@/hooks/use-catalog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Sparkles, Download, Loader2, Check } from "lucide-react";

// Import mold images
import moldMilkBox from "@/assets/mold-milk-box.png";
import moldSacolinha from "@/assets/mold-sacolinha.png";
import moldTopper from "@/assets/mold-topper.png";
import moldPiramide from "@/assets/mold-piramide.png";
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

// Import theme images
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

const steps = [
  { number: 1, title: "Escolha o Molde", emoji: "📦" },
  { number: 2, title: "Escolha o Tema", emoji: "🎨" },
  { number: 3, title: "Personalize", emoji: "✍️" },
  { number: 4, title: "Arte Pronta!", emoji: "🎉" },
];

export default function Criar() {
  const [step, setStep] = useState(1);
  const [selectedMolde, setSelectedMolde] = useState<any>(null);
  const [selectedTema, setSelectedTema] = useState<any>(null);
  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [frase, setFrase] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedImageBase64, setGeneratedImageBase64] = useState<string | null>(null);

  const { data: moldes, isLoading: loadingMoldes } = useMoldes();
  const { data: temas, isLoading: loadingTemas } = useTemas();

  const canProceed = () => {
    if (step === 1) return !!selectedMolde;
    if (step === 2) return !!selectedTema;
    if (step === 3) return nome.trim().length > 0;
    return false;
  };

  const handleGenerate = async () => {
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
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      setGeneratedImage(data.imageUrl);
      setGeneratedImageBase64(data.imageBase64);
      toast.success("Arte gerada com sucesso! 🎉");
    } catch (err: any) {
      console.error("Erro ao gerar arte:", err);
      toast.error(err.message || "Erro ao gerar a arte. Tente novamente.");
      setStep(3);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadImage = () => {
    if (!generatedImageBase64) return;
    const link = document.createElement("a");
    link.href = generatedImageBase64;
    link.download = `arte-${selectedTema?.name}-${nome}.png`;
    link.click();
  };

  const handleNewArt = () => {
    setStep(1);
    setSelectedMolde(null);
    setSelectedTema(null);
    setNome("");
    setIdade("");
    setFrase("");
    setGeneratedImage(null);
    setGeneratedImageBase64(null);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">✨ Criar Arte com IA</h1>
        <p className="text-muted-foreground mt-1">
          A inteligência artificial cria a arte personalizada já aplicada no molde, pronta pra imprimir
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div key={s.number} className="flex items-center gap-2 shrink-0">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                step === s.number
                  ? "gradient-hero text-primary-foreground"
                  : step > s.number
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s.number ? (
                <Check className="h-4 w-4" />
              ) : (
                <span>{s.emoji}</span>
              )}
              <span className="hidden sm:inline">{s.title}</span>
              <span className="sm:hidden">{s.number}</span>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Mold */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="font-display font-semibold text-lg">📦 Qual molde você quer usar?</h2>
          {loadingMoldes ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {(moldes ?? []).map((mold) => {
                const image = mold.image_url || moldImages[mold.name];
                const isSelected = selectedMolde?.id === mold.id;
                return (
                  <Card
                    key={mold.id}
                    onClick={() => setSelectedMolde(mold)}
                    className={`group cursor-pointer transition-all hover:-translate-y-1 overflow-hidden ${
                      isSelected
                        ? "ring-2 ring-primary shadow-lg"
                        : "border-border/50 hover:shadow-soft"
                    }`}
                  >
                    <CardContent className="p-0">
                      <div className="h-32 bg-card flex items-center justify-center p-3">
                        {image ? (
                          <img
                            src={image}
                            alt={mold.name}
                            className="h-full w-auto object-contain group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <span className="text-4xl">{mold.emoji || "📦"}</span>
                        )}
                      </div>
                      <div className="p-3 text-center">
                        <h3 className="font-semibold text-sm text-foreground">{mold.name}</h3>
                        {isSelected && (
                          <Badge className="mt-1 gradient-hero border-0 text-[10px]">
                            Selecionado ✓
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Choose Theme */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="font-display font-semibold text-lg">🎨 Qual o tema da festa?</h2>
          {loadingTemas ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {(temas ?? []).map((tema) => {
                const image = tema.image_url || themeImages[tema.name];
                const isSelected = selectedTema?.id === tema.id;
                return (
                  <Card
                    key={tema.id}
                    onClick={() => setSelectedTema(tema)}
                    className={`group cursor-pointer transition-all hover:-translate-y-1 overflow-hidden ${
                      isSelected
                        ? "ring-2 ring-primary shadow-lg"
                        : "border-border/50 hover:shadow-soft"
                    }`}
                  >
                    <CardContent className="p-0">
                      <div className="h-32 bg-card flex items-center justify-center overflow-hidden">
                        {image ? (
                          <img
                            src={image}
                            alt={tema.name}
                            className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <span className="text-4xl">{tema.emoji || "🎉"}</span>
                        )}
                      </div>
                      <div className="p-3 text-center">
                        <h3 className="font-semibold text-sm text-foreground">{tema.name}</h3>
                        <div className="flex justify-center gap-1 mt-1">
                          {(tema.colors || []).slice(0, 4).map((color, i) => (
                            <div
                              key={i}
                              className="h-3 w-3 rounded-full border border-border/50"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        {isSelected && (
                          <Badge className="mt-1 gradient-hero border-0 text-[10px]">
                            Selecionado ✓
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Personalize */}
      {step === 3 && (
        <div className="space-y-6 max-w-lg">
          <h2 className="font-display font-semibold text-lg">✍️ Personalize sua arte</h2>

          {/* Summary of selections */}
          <div className="flex gap-4">
            <Card className="flex-1 border-border/50">
              <CardContent className="p-3 flex items-center gap-3">
                {moldImages[selectedMolde?.name] ? (
                  <img src={moldImages[selectedMolde?.name]} alt="" className="h-10 w-10 object-contain" />
                ) : (
                  <span className="text-2xl">{selectedMolde?.emoji || "📦"}</span>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Molde</p>
                  <p className="text-sm font-medium">{selectedMolde?.name}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1 border-border/50">
              <CardContent className="p-3 flex items-center gap-3">
                {themeImages[selectedTema?.name] ? (
                  <img src={themeImages[selectedTema?.name]} alt="" className="h-10 w-10 object-cover rounded" />
                ) : (
                  <span className="text-2xl">{selectedTema?.emoji || "🎨"}</span>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Tema</p>
                  <p className="text-sm font-medium">{selectedTema?.name}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                Nome da criança / homenageado(a) *
              </label>
              <Input
                placeholder="Ex: Maria Clara"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1 bg-card border-border/50"
                maxLength={50}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Idade (opcional)</label>
              <Input
                placeholder="Ex: 5"
                value={idade}
                onChange={(e) => setIdade(e.target.value)}
                className="mt-1 bg-card border-border/50"
                maxLength={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Frase especial (opcional)</label>
              <Input
                placeholder="Ex: Obrigada por fazer parte da minha festa!"
                value={frase}
                onChange={(e) => setFrase(e.target.value)}
                className="mt-1 bg-card border-border/50"
                maxLength={100}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === 4 && (
        <div className="space-y-6">
          <h2 className="font-display font-semibold text-lg">
            {isGenerating ? "⏳ Gerando sua arte..." : "🎉 Sua arte está pronta!"}
          </h2>

          {isGenerating ? (
            <Card className="border-border/50">
              <CardContent className="p-12 flex flex-col items-center gap-4">
                <div className="relative">
                  <Loader2 className="h-16 w-16 text-primary animate-spin" />
                  <Sparkles className="h-6 w-6 text-primary absolute -top-1 -right-1 animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                  <p className="font-semibold text-foreground">A IA está criando sua arte</p>
                  <p className="text-sm text-muted-foreground">
                    Gerando {selectedMolde?.name} com tema {selectedTema?.name} para {nome}...
                  </p>
                  <p className="text-xs text-muted-foreground">Isso pode levar até 30 segundos</p>
                </div>
              </CardContent>
            </Card>
          ) : generatedImage ? (
            <div className="space-y-4">
              <Card className="border-border/50 overflow-hidden">
                <CardContent className="p-0">
                  <img
                    src={generatedImage}
                    alt={`Arte ${selectedTema?.name} - ${nome}`}
                    className="w-full h-auto"
                  />
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleDownloadImage}
                  className="gradient-hero border-0 text-primary-foreground flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Imagem (PNG)
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGenerate}
                  className="flex-1 border-border/50"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Nova Versão
                </Button>
                <Button
                  variant="outline"
                  onClick={handleNewArt}
                  className="flex-1 border-border/50"
                >
                  Criar Outra Arte
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Navigation Buttons */}
      {step < 4 && (
        <div className="flex justify-between pt-4 border-t border-border/50">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="border-border/50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          {step === 3 ? (
            <Button
              onClick={handleGenerate}
              disabled={!canProceed()}
              className="gradient-hero border-0 text-primary-foreground"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar Arte com IA
            </Button>
          ) : (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="gradient-hero border-0 text-primary-foreground"
            >
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
