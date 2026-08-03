import { useState } from "react";
import { ArrowRight, CheckCircle2, Settings2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { AgentIcon } from "@/components/AgentIcon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PerfilAtelieForm, useAteliePerfil } from "@/components/PerfilAtelie";
import { agents } from "@/data/agents";

export default function Agentes() {
  const { carregando, completo } = useAteliePerfil();
  const [editandoPerfil, setEditandoPerfil] = useState(false);

  if (carregando) {
    return (
      <div className="max-w-6xl space-y-4 py-4">
        <Skeleton className="h-16 w-2/3 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  // Onboarding obrigatório: as assistentes só funcionam bem conhecendo o ateliê
  if (!completo || editandoPerfil) {
    return (
      <div className="animate-fade-in max-w-6xl space-y-6 py-4">
        <PerfilAtelieForm onSaved={() => setEditandoPerfil(false)} />
        {editandoPerfil && (
          <p className="text-center">
            <button className="text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => setEditandoPerfil(false)}>
              Voltar para as assistentes sem salvar
            </button>
          </p>
        )}
      </div>
    );
  }

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
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium text-muted-foreground">9 assistentes especializadas</p>
            <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs" onClick={() => setEditandoPerfil(true)}>
              <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Meu ateliê
            </Button>
          </div>
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
