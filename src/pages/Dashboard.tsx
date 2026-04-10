import { Box, Palette, PenTool, Image, ArrowRight, Sparkles } from "lucide-react";
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
  { number: "01", title: "Escolha o Molde", description: "Caixinha, sacolinha, cone e mais", icon: Box },
  { number: "02", title: "Escolha o Tema", description: "Safari, Unicórnio, Princesas...", icon: Palette },
  { number: "03", title: "Personalize", description: "Nome, idade, cores e estilos", icon: PenTool },
  { number: "04", title: "Exporte", description: "PDF para imprimir + mockup", icon: Image },
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
    <div className="animate-fade-in max-w-5xl space-y-16">
      {/* Hero */}
      <section className="flex flex-col md:flex-row items-center gap-8 md:gap-12 pt-4">
        <div className="flex-1 space-y-5">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
            <Sparkles className="h-3 w-3" />
            Geração com IA
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground leading-[1.1] tracking-tight">
            Sua arte no molde certo, pronta para imprimir.
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-lg">
            Escolha o molde, aplique o tema, personalize e exporte.
            Tudo em poucos cliques.
          </p>
          <div className="flex gap-3 pt-1">
            <Link to="/criar">
              <Button className="h-11 px-6 rounded-full text-sm font-semibold">
                Começar agora
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
            <Link to="/moldes">
              <Button variant="outline" className="h-11 px-6 rounded-full text-sm font-medium border-border">
                Ver moldes
              </Button>
            </Link>
          </div>
        </div>
        <div className="md:w-[340px] shrink-0">
          <div className="rounded-2xl overflow-hidden bg-secondary p-6">
            <img
              src={heroParty}
              alt="Personalizados para festas"
              width={1024}
              height={512}
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Como funciona
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {steps.map((step) => (
            <div key={step.number} className="group space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-display font-semibold text-border">
                  {step.number}
                </span>
                <step.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-border/60" />

      {/* Popular Molds */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground tracking-tight">Moldes populares</h2>
          <Link to="/moldes">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs h-8">
              Ver todos <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {popularMolds.map((mold) => (
            <Link to="/criar" key={mold.name}>
              <div className="group cursor-pointer">
                <div className="aspect-square rounded-2xl bg-secondary flex items-center justify-center p-6 overflow-hidden transition-all duration-300 group-hover:bg-accent">
                  <img
                    src={mold.image}
                    alt={mold.name}
                    loading="lazy"
                    width={512}
                    height={512}
                    className="h-full w-auto object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="text-sm font-medium text-foreground mt-3 text-center">{mold.name}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending Themes */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground tracking-tight">Temas em alta</h2>
          <Link to="/temas">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs h-8">
              Ver todos <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {trendingThemes.map((theme) => (
            <Link to="/criar" key={theme.name}>
              <div className="group cursor-pointer">
                <div className="aspect-square rounded-2xl overflow-hidden bg-secondary">
                  <img
                    src={theme.image}
                    alt={theme.name}
                    loading="lazy"
                    width={512}
                    height={512}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="text-sm font-medium text-foreground mt-3 text-center">{theme.name}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-2xl bg-foreground p-10 md:p-14 text-center space-y-4">
        <h2 className="font-display text-2xl md:text-3xl font-semibold text-primary-foreground tracking-tight">
          Pronta para criar?
        </h2>
        <p className="text-primary-foreground/60 text-sm max-w-md mx-auto leading-relaxed">
          Crie artes profissionais para personalizados de festa em minutos com inteligência artificial.
        </p>
        <Link to="/criar">
          <Button
            variant="outline"
            className="mt-2 rounded-full h-11 px-8 text-sm font-semibold bg-primary-foreground text-foreground border-0 hover:bg-primary-foreground/90"
          >
            Começar agora
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </Link>
      </section>

      {/* Footer spacer */}
      <div className="h-4" />
    </div>
  );
}
