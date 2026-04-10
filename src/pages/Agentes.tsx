import { Sparkles, MessageCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const agents = [
  {
    name: "Nina",
    title: "Atendimento e Fechamento",
    description: "Cuida das respostas no WhatsApp e Instagram, quebra objeções, passa confiança, responde dúvidas e ajuda a fechar pedidos.",
    emoji: "💬",
  },
  {
    name: "Jade",
    title: "Orçamento e Precificação",
    description: "Monta orçamento e calcula preço com base em quantidade, material, tempo, acabamento, lucro e urgência.",
    emoji: "💎",
  },
  {
    name: "Luna",
    title: "Pedidos e Briefing",
    description: "Organiza tudo o que precisa entrar no pedido: nome, idade, tema, cores, data, quantidade, observações e aprovação da cliente.",
    emoji: "📋",
  },
  {
    name: "Flora",
    title: "Produção e Prazos",
    description: "Organiza fila de produção, prioridade, checklist, agenda de entregas e evita atraso ou promessa furada.",
    emoji: "📅",
  },
  {
    name: "Iris",
    title: "Vendas e Campanhas",
    description: "Cria ofertas, combos, campanhas sazonais, promoções e ideias para vender mais em datas estratégicas.",
    emoji: "🚀",
  },
  {
    name: "Clara",
    title: "Conteúdo e Instagram",
    description: "Cria legendas, chamadas, ideias de posts e analisa perfil para transformar seguidores em clientes.",
    emoji: "📱",
  },
  {
    name: "Violeta",
    title: "Catálogo e Portfólio",
    description: "Organiza os produtos, categorias, descrições e vitrine para facilitar a decisão de compra da cliente.",
    emoji: "🛍️",
  },
  {
    name: "Sofia",
    title: "Pós-venda e Fidelização",
    description: "Envia mensagens depois da entrega, pede feedback, incentiva indicação e puxa recompra.",
    emoji: "💖",
  },
  {
    name: "Malu",
    title: "Financeiro Básico",
    description: "Acompanha entradas, saídas, lucro por pedido, ticket médio e mostra quais produtos valem mais a pena.",
    emoji: "💰",
  },
  {
    name: "Bella",
    title: "Dicas de Impressão",
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
