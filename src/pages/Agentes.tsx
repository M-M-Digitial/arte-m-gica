import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { AgentIcon } from "@/components/AgentIcon";
import { agents } from "@/data/agents";

export default function Agentes() {
  return (
    <div className="animate-fade-in max-w-6xl space-y-7">
      <header className="border-b border-border/60 pb-6">
        <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Meu Ateliê Digital
        </div>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
              Quem vai te ajudar hoje?
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Escolha a especialista, conte o que precisa e receba uma entrega pronta para aplicar no seu ateliê.
            </p>
          </div>
          <p className="text-xs font-medium text-muted-foreground">9 assistentes especializadas</p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Time de assistentes">
        {agents.map((agent) => (
          <Link
            to={`/agentes/${agent.id}`}
            key={agent.id}
            className="group flex min-h-64 flex-col rounded-lg border border-border/70 bg-card p-5 transition-colors hover:border-primary/40 hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-start gap-3">
              <AgentIcon agentId={agent.id} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">{agent.name}</p>
                <p className="text-xs font-medium text-primary">{agent.title}</p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{agent.description}</p>

            <div className="mt-4 space-y-2">
              {agent.deliverables.map((deliverable) => (
                <div key={deliverable} className="flex items-center gap-2 text-xs text-foreground/80">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span>{deliverable}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto flex items-center gap-1 pt-5 text-xs font-semibold text-primary">
              Conversar com {agent.name}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
