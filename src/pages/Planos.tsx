import { Check, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    name: "Grátis",
    price: "R$ 0",
    period: "/mês",
    description: "Para começar a explorar",
    featured: false,
    features: [
      "5 moldes básicos",
      "3 temas",
      "Mockups com marca d'água",
      "3 downloads por mês",
      "2 projetos salvos",
    ],
    cta: "Plano Atual",
    disabled: true,
  },
  {
    name: "Básico",
    price: "R$ 29",
    period: "/mês",
    description: "Para quem está começando a vender",
    featured: true,
    features: [
      "Todos os moldes",
      "8 temas",
      "Downloads sem marca d'água",
      "30 downloads por mês",
      "20 projetos salvos",
      "Mockups básicos",
      "Suporte por email",
    ],
    cta: "Assinar Básico",
    disabled: false,
  },
  {
    name: "Pro",
    price: "R$ 59",
    period: "/mês",
    description: "Para profissionais que querem escalar",
    featured: false,
    features: [
      "Todos os moldes + premium",
      "Todos os temas + novos toda semana",
      "Downloads ilimitados",
      "Projetos ilimitados",
      "Mockups premium ilimitados",
      "Catálogo completo",
      "Biblioteca premium de elementos",
      "Suporte prioritário",
    ],
    cta: "Assinar Pro",
    disabled: false,
  },
];

export default function Planos() {
  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-display font-bold text-foreground">
          Escolha seu plano
        </h1>
        <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
          Desbloqueie todo o potencial do MoldePronto e crie personalizados incríveis
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`border-border/50 relative overflow-hidden transition-all hover:-translate-y-1 ${
              plan.featured ? "shadow-soft border-primary/30 ring-1 ring-primary/20" : ""
            }`}
          >
            {plan.featured && (
              <div className="gradient-hero py-1.5 text-center">
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 text-xs">
                  <Sparkles className="h-3 w-3 mr-1" /> Mais Popular
                </Badge>
              </div>
            )}
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="font-display font-bold text-xl text-foreground">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-display font-bold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>

              <ul className="space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full ${
                  plan.featured
                    ? "gradient-hero border-0 text-primary-foreground"
                    : plan.disabled
                    ? "bg-muted text-muted-foreground"
                    : "bg-card text-foreground border border-border/50 hover:bg-muted"
                }`}
                disabled={plan.disabled}
              >
                {plan.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
