import {
  ArrowRight,
  Bot,
  Box,
  CalendarCheck,
  CheckCircle2,
  GraduationCap,
  Image,
  Palette,
  PenTool,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";
import heroParty from "@/assets/hero-party.png";
import { Button } from "@/components/ui/button";
import { activeProduct, productMode } from "@/config/products";

const generatorSteps = [
  { number: "01", title: "Escolha o molde", description: "Caixinha, sacolinha, cone e mais", icon: Box },
  { number: "02", title: "Escolha o tema", description: "Safari, unicornio, princesas e datas", icon: Palette },
  { number: "03", title: "Personalize", description: "Nome, idade, cores e estilos", icon: PenTool },
  { number: "04", title: "Exporte", description: "PDF para imprimir, PNG, SVG e mockup", icon: Image },
];

const schoolSteps = [
  { number: "01", title: "Escolha a trilha", description: "Vendas, preco, producao ou conteudo", icon: GraduationCap },
  { number: "02", title: "Fale com a agente", description: "Receba respostas prontas para aplicar", icon: Bot },
  { number: "03", title: "Execute a rotina", description: "Tarefas pequenas para todos os dias", icon: CalendarCheck },
  { number: "04", title: "Acompanhe o lucro", description: "Ajuste preco, agenda e atendimento", icon: WalletCards },
];

export default function Dashboard() {
  const isSchool = productMode === "escola-agentes";
  const steps = isSchool ? schoolSteps : generatorSteps;

  return (
    <div className="animate-fade-in max-w-5xl space-y-16">
      <section className="flex flex-col md:flex-row items-center gap-8 md:gap-12 pt-4">
        <div className="flex-1 space-y-5">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full">
            {isSchool ? <GraduationCap className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
            {activeProduct.badge}
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground leading-[1.1] tracking-tight">
            {activeProduct.headline} <span className="text-gradient">{activeProduct.headlineAccent}</span>
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-lg">{activeProduct.description}</p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link to={activeProduct.primaryCta.path}>
              <Button className="h-11 px-6 rounded-full text-sm font-semibold gradient-hero border-0 text-white shadow-soft hover:shadow-elevated transition-all hover:-translate-y-0.5">
                {activeProduct.primaryCta.label}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
            <Link to={activeProduct.secondaryCta.path}>
              <Button variant="outline" className="h-11 px-6 rounded-full text-sm font-medium border-border hover:bg-secondary">
                {activeProduct.secondaryCta.label}
              </Button>
            </Link>
          </div>
        </div>

        <div className="md:w-[340px] shrink-0">
          {isSchool ? (
            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-bold text-foreground">Plano de hoje</p>
              <div className="mt-4 space-y-3">
                {["Responder leads parados", "Revisar preco dos kits", "Programar posts da semana"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl overflow-hidden gradient-card p-6 shadow-card">
              <img
                src={heroParty}
                alt="Personalizados para festas"
                width={1024}
                height={512}
                className="w-full h-auto object-contain"
              />
            </div>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Como funciona</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {steps.map((step) => (
            <div key={step.number} className="group space-y-3 p-4 rounded-2xl hover:bg-secondary/60 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-display font-bold text-primary/20">{step.number}</span>
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

      <section className="rounded-3xl gradient-hero p-10 md:p-14 text-center space-y-4 shadow-elevated relative overflow-hidden">
        {isSchool ? (
          <GraduationCap className="h-8 w-8 text-white/80 mx-auto" />
        ) : (
          <Sparkles className="h-8 w-8 text-white/80 mx-auto" />
        )}
        <h2 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight relative">
          {isSchool ? "Pronta para organizar sua proxima venda?" : "Pronta para criar?"}
        </h2>
        <p className="text-white/70 text-sm max-w-md mx-auto leading-relaxed relative">
          {isSchool
            ? "Abra uma trilha, escolha uma agente e transforme duvidas do dia a dia em acoes simples."
            : "Crie artes profissionais para personalizados de festa em minutos com inteligencia artificial."}
        </p>
        <Link to={activeProduct.primaryCta.path}>
          <Button className="mt-2 rounded-full h-11 px-8 text-sm font-semibold bg-white text-foreground border-0 hover:bg-white/90 shadow-soft relative">
            {activeProduct.primaryCta.label}
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </Link>
      </section>

      <div className="h-4" />
    </div>
  );
}
