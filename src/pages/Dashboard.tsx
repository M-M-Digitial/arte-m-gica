import { Box, Palette, PenTool, Image, ArrowRight, Sparkles, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroParty from "@/assets/hero-party.png";

const steps = [
  { number: "01", title: "Escolha o Molde", description: "Caixinha, sacolinha, cone e mais", icon: Box },
  { number: "02", title: "Escolha o Tema", description: "Safari, Unicórnio, Princesas...", icon: Palette },
  { number: "03", title: "Personalize", description: "Nome, idade, cores e estilos", icon: PenTool },
  { number: "04", title: "Exporte", description: "PDF para imprimir + mockup", icon: Image },
];

export default function Dashboard() {
  return (
    <div className="animate-fade-in max-w-5xl space-y-16">
      {/* Hero */}
      <section className="flex flex-col md:flex-row items-center gap-8 md:gap-12 pt-4">
        <div className="flex-1 space-y-5">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full">
            <Sparkles className="h-3 w-3" />
            Geração com IA
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground leading-[1.1] tracking-tight">
            Sua arte no molde certo,{" "}
            <span className="text-gradient">pronta para imprimir.</span>
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-lg">
            Escolha o molde, aplique o tema, personalize e exporte.
            Tudo em poucos cliques ✨
          </p>
          <div className="flex gap-3 pt-1">
            <Link to="/criar">
              <Button className="h-11 px-6 rounded-full text-sm font-semibold gradient-hero border-0 text-white shadow-soft hover:shadow-elevated transition-all hover:-translate-y-0.5">
                Começar agora
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
            <Link to="/moldes">
              <Button variant="outline" className="h-11 px-6 rounded-full text-sm font-medium border-border hover:bg-secondary">
                Ver moldes
              </Button>
            </Link>
          </div>
        </div>
        <div className="md:w-[340px] shrink-0">
          <div className="rounded-3xl overflow-hidden gradient-card p-6 shadow-card">
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
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Como funciona
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {steps.map((step) => (
            <div key={step.number} className="group space-y-3 p-4 rounded-2xl hover:bg-secondary/60 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-display font-bold text-primary/20">
                  {step.number}
                </span>
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <step.icon className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>



      {/* CTA */}
      <section className="rounded-3xl gradient-hero p-10 md:p-14 text-center space-y-4 shadow-elevated relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-8 text-4xl">✨</div>
          <div className="absolute bottom-6 right-12 text-3xl">🎀</div>
          <div className="absolute top-1/2 left-1/4 text-2xl">💖</div>
        </div>
        <Heart className="h-8 w-8 text-white/80 mx-auto" />
        <h2 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight relative">
          Pronta para criar?
        </h2>
        <p className="text-white/70 text-sm max-w-md mx-auto leading-relaxed relative">
          Crie artes profissionais para personalizados de festa em minutos com inteligência artificial.
        </p>
        <Link to="/criar">
          <Button className="mt-2 rounded-full h-11 px-8 text-sm font-semibold bg-white text-foreground border-0 hover:bg-white/90 shadow-soft relative">
            Começar agora
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </Link>
      </section>

      <div className="h-4" />
    </div>
  );
}
