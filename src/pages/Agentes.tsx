import { Sparkles, MessageCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const agents = [
  {
    name: "Flora",
    title: "Estrategista de Vendas",
    description: "Ajuda você a vender todos os dias, criar ofertas, CTAs, argumentos e destravar decisões de compra.",
    emoji: "💰",
  },
  {
    name: "Iris",
    title: "Analista de Perfil do Instagram",
    description: "Analisa seu perfil, bio, destaques e conteúdo para transformar seguidores em clientes.",
    emoji: "📱",
  },
  {
    name: "Luna",
    title: "Geradora de Legendas",
    description: "Cria legendas estratégicas que conectam, geram desejo e levam a cliente para o WhatsApp.",
    emoji: "✍️",
  },
  {
    name: "Jade",
    title: "Musa da Precificação",
    description: "Te ajuda a precificar corretamente, sair do barato e cobrar com segurança e clareza.",
    emoji: "💎",
  },
  {
    name: "Violeta",
    title: "Mentora do Portfólio",
    description: "Organiza seus produtos, cria estrutura de portfólio e deixa tudo fácil para a cliente decidir.",
    emoji: "📋",
  },
  {
    name: "Clara",
    title: "Assistente de Mensagens",
    description: "Cria respostas prontas para WhatsApp e Instagram, sem insegurança e sem enrolação.",
    emoji: "💬",
  },
  {
    name: "Sofia",
    title: "Transformador de Ideias",
    description: "Te ajuda a transformar ideias soltas em produtos vendáveis e conteúdos claros.",
    emoji: "💡",
  },
  {
    name: "Malu",
    title: "Especialista em Impressão",
    description: "Dá dicas de papel, gramatura, impressora, corte e acabamento para seus personalizados ficarem perfeitos.",
    emoji: "🖨️",
  },
];

export default function Agentes() {
  return (
    <div className="animate-fade-in max-w-4xl space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full">
          <Sparkles className="h-3 w-3" />
          Assistentes IA
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-tight">
          Seus agentes <span className="text-gradient">inteligentes</span>
        </h1>
        <p className="text-muted-foreground text-sm max-w-lg leading-relaxed">
          Cada agente é especialista em uma área. Escolha quem vai te ajudar hoje ✨
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <button
            key={agent.name}
            className="group text-left p-5 rounded-2xl border border-border/60 bg-card hover:border-primary/30 hover:shadow-card transition-all duration-300 space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0">
                {agent.emoji}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{agent.name}</p>
                <p className="text-xs text-primary font-medium">{agent.title}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {agent.description}
            </p>
            <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              Conversar <ArrowRight className="h-3 w-3" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
