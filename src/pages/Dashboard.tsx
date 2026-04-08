import { Box, Palette, PenTool, Image, ArrowRight, Sparkles, PartyPopper, Cake } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroParty from "@/assets/hero-party.png";
import themeSafari from "@/assets/theme-safari.png";
import themeUnicornio from "@/assets/theme-unicornio.png";
import themePrincesas from "@/assets/theme-princesas.png";
import themeFazendinha from "@/assets/theme-fazendinha.png";
import moldMilkBox from "@/assets/mold-milk-box.png";
import moldSacolinha from "@/assets/mold-sacolinha.png";
import moldTopper from "@/assets/mold-topper.png";
import moldPiramide from "@/assets/mold-piramide.png";

const steps = [
  { number: "1", title: "Escolha o Molde", description: "Caixinha, sacolinha, topper...", icon: Box, link: "/moldes", color: "gradient-hero" },
  { number: "2", title: "Escolha o Tema", description: "Safari, Unicórnio, Princesas...", icon: Palette, link: "/temas", color: "bg-accent" },
  { number: "3", title: "Crie sua Arte", description: "Personalize nome, idade, cores", icon: PenTool, link: "/editor", color: "bg-peach" },
  { number: "4", title: "Gere o Mockup", description: "Imagem pronta para divulgar", icon: Image, link: "/mockups", color: "bg-mint" },
];

const popularMolds = [
  { name: "Caixinha Milk", image: moldMilkBox },
  { name: "Sacolinha", image: moldSacolinha },
  { name: "Topo de Bolo", image: moldTopper },
  { name: "Caixa Pirâmide", image: moldPiramide },
];

const trendingThemes = [
  { name: "Safari", image: themeSafari },
  { name: "Unicórnio", image: themeUnicornio },
  { name: "Princesas", image: themePrincesas },
  { name: "Fazendinha", image: themeFazendinha },
];

export default function Dashboard() {
  return (
    <div className="space-y-8 animate-fade-in max-w-6xl">
      {/* Hero Banner */}
      <Card className="border-border/50 overflow-hidden gradient-card">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row items-center">
            <div className="flex-1 p-6 md:p-8 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <PartyPopper className="h-5 w-5" />
                <span className="text-sm font-semibold">MoldePronto</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground leading-tight">
                Sua arte no molde certo,<br />pronta para imprimir ✨
              </h1>
              <p className="text-muted-foreground text-sm max-w-md">
                Escolha o molde, aplique o tema, personalize e gere mockups profissionais para divulgar seus personalizados.
              </p>
              <div className="flex gap-3 pt-2">
                <Link to="/moldes">
                  <Button className="gradient-hero border-0 text-primary-foreground">
                    <Cake className="h-4 w-4 mr-2" /> Começar Agora
                  </Button>
                </Link>
              </div>
            </div>
            <div className="md:w-80 p-4">
              <img src={heroParty} alt="Personalizados para festas" width={1024} height={512} className="w-full h-auto object-contain" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flow Steps */}
      <div>
        <h2 className="font-display font-semibold text-lg text-foreground mb-4">
          🎯 Como funciona
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {steps.map((step) => (
            <Link to={step.link} key={step.number}>
              <Card className="group cursor-pointer border-border/50 hover:shadow-soft transition-all hover:-translate-y-1 h-full">
                <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                  <div className="relative">
                    <div className={`h-14 w-14 rounded-xl ${step.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <step.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center">
                      {step.number}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Popular Molds */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg text-foreground">📦 Moldes Populares</h2>
          <Link to="/moldes">
            <Button variant="ghost" size="sm" className="text-primary text-xs">
              Ver todos <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {popularMolds.map((mold) => (
            <Link to="/editor" key={mold.name}>
              <Card className="group cursor-pointer border-border/50 hover:shadow-soft transition-all hover:-translate-y-1 overflow-hidden">
                <CardContent className="p-0">
                  <div className="h-28 bg-card flex items-center justify-center p-3 overflow-hidden">
                    <img src={mold.image} alt={mold.name} loading="lazy" width={512} height={512}
                      className="h-full w-auto object-contain group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="p-3 gradient-accent">
                    <p className="font-semibold text-xs text-foreground text-center">{mold.name}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Trending Themes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg text-foreground">🔥 Temas em Alta</h2>
          <Link to="/temas">
            <Button variant="ghost" size="sm" className="text-primary text-xs">
              Ver todos <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {trendingThemes.map((theme) => (
            <Link to="/editor" key={theme.name}>
              <Card className="group cursor-pointer border-border/50 hover:shadow-soft transition-all hover:-translate-y-1 overflow-hidden">
                <CardContent className="p-0">
                  <div className="h-28 bg-card flex items-center justify-center p-2 overflow-hidden">
                    <img src={theme.image} alt={theme.name} loading="lazy" width={512} height={512}
                      className="h-full w-auto object-contain group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="p-3 gradient-accent">
                    <p className="font-semibold text-xs text-foreground text-center">{theme.name}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Card className="border-border/50 gradient-hero overflow-hidden">
        <CardContent className="p-6 text-center space-y-3">
          <Sparkles className="h-8 w-8 text-primary-foreground mx-auto" />
          <h2 className="font-display font-bold text-xl text-primary-foreground">
            Pronta para criar?
          </h2>
          <p className="text-primary-foreground/80 text-sm max-w-md mx-auto">
            Crie sua arte no molde certo, exporte para imprimir e gere mockups lindos para divulgar e vender!
          </p>
          <Link to="/moldes">
            <Button variant="outline" className="mt-2 bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/30">
              Começar Agora →
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
