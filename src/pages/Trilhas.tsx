import { ArrowRight, CheckCircle2, Clock3, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { AgentIcon } from "@/components/AgentIcon";
import { Button } from "@/components/ui/button";
import type { AgentId } from "@/data/agents";

const routines: Array<{
  title: string;
  description: string;
  agentId: AgentId;
  steps: readonly string[];
}> = [
  {
    title: "Responder e fechar pedidos",
    description: "Saia das mensagens acumuladas com respostas claras e um próximo passo para cada cliente.",
    agentId: "nina",
    steps: ["Separar conversas por estágio", "Responder objeções", "Confirmar o próximo passo"],
  },
  {
    title: "Produzir sem atraso",
    description: "Revise pedidos e distribua as etapas da semana com margem para imprevistos.",
    agentId: "maia",
    steps: ["Listar prazos", "Apontar conflitos", "Montar agenda"],
  },
  {
    title: "Conferir antes de imprimir",
    description: "Encontre pendências de nome, data, quantidade e aprovação antes do material virar custo.",
    agentId: "elisa",
    steps: ["Conferir dados", "Resolver pendências", "Liberar produção"],
  },
  {
    title: "Planejar conteúdo da semana",
    description: "Transforme produtos e bastidores em posts, reels e stories com objetivo definido.",
    agentId: "clara",
    steps: ["Escolher objetivo", "Criar os roteiros", "Programar chamadas"],
  },
  {
    title: "Vender de novo para clientes",
    description: "Organize acompanhamento, feedback e recompra depois da entrega.",
    agentId: "sofia",
    steps: ["Confirmar entrega", "Pedir feedback", "Planejar recompra"],
  },
];

export default function Trilhas() {
  return (
    <div className="animate-fade-in max-w-6xl space-y-7">
      <header className="border-b border-border/60 pb-6">
        <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
          <GraduationCap className="h-3.5 w-3.5" /> Rotinas práticas
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">Um ponto de partida para cada dia</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Escolha a rotina mais urgente e faça as três etapas com a assistente indicada.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {routines.map((routine) => (
          <div key={routine.title} className="flex min-h-72 flex-col rounded-lg border border-border/70 bg-card p-5">
            <div className="flex items-center justify-between">
              <AgentIcon agentId={routine.agentId} />
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" /> 20 minutos
              </span>
            </div>
            <h2 className="mt-4 text-sm font-bold text-foreground">{routine.title}</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{routine.description}</p>
            <div className="mt-4 space-y-2">
              {routine.steps.map((step) => (
                <div key={step} className="flex items-center gap-2 text-xs text-foreground/80">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> {step}
                </div>
              ))}
            </div>
            <Button asChild variant="outline" className="mt-auto h-9 justify-between rounded-lg text-xs">
              <Link to={`/agentes/${routine.agentId}`}>
                Começar rotina <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        ))}
      </section>
    </div>
  );
}
