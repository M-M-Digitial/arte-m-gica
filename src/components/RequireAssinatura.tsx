import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscription } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";
import { HOTMART_CHECKOUT_URL, PLANOS, BENEFICIOS } from "@/config/billing";

// Gate de assinatura: envolve as áreas premium. Admin sempre passa.
export function RequireAssinatura({ children }: { children: ReactNode }) {
  const { loading, liberado, assinatura } = useSubscription();

  // link de checkout configurável pelo painel admin (app_config), com fallback
  const { data: checkoutUrl } = useQuery({
    queryKey: ["config-checkout"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("app_config")
        .select("value")
        .eq("key", "hotmart_checkout_url")
        .maybeSingle();
      return (data?.value as string) || HOTMART_CHECKOUT_URL;
    },
  });
  const linkCheckout = checkoutUrl || HOTMART_CHECKOUT_URL;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 py-8">
        <Skeleton className="h-10 w-2/3 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (liberado) return <>{children}</>;

  const statusMsg =
    assinatura && assinatura.status !== "active"
      ? `Sua assinatura está "${assinatura.status}". Renove para voltar a criar!`
      : null;

  return (
    <div className="max-w-4xl mx-auto py-8 animate-fade-in space-y-8">
      <div className="text-center space-y-3">
        <span className="inline-flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-full text-xs font-medium text-foreground">
          <Lock className="h-3 w-3" /> Área exclusiva de assinantes
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
          Sua papelaria com <span className="text-primary">arte profissional</span>,
          <br className="hidden sm:block" /> pronta em segundos
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Pare de pagar R$ 15–40 por arte ou passar horas no Canva. Aqui você compõe
          kits no padrão de estúdio, com personagem, nome e molde — na hora.
        </p>
        {statusMsg && (
          <p className="text-sm font-medium text-destructive">{statusMsg}</p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {PLANOS.map((p) => (
          <Card
            key={p.id}
            className={`border-2 ${p.destaque ? "border-primary shadow-soft" : "border-border/50"}`}
          >
            <CardContent className="p-6 text-center space-y-3">
              {p.destaque && (
                <span className="inline-block text-[11px] font-bold uppercase tracking-wide gradient-hero text-white px-3 py-1 rounded-full">
                  Melhor valor · {"economia" in p ? p.economia : ""}
                </span>
              )}
              <p className="text-sm font-semibold text-muted-foreground">{p.nome}</p>
              <p className="font-display text-4xl font-bold text-foreground">
                {p.preco}
                <span className="text-sm font-normal text-muted-foreground">{p.periodo}</span>
              </p>
              <Button
                asChild
                className={`w-full h-11 rounded-full font-semibold ${
                  p.destaque ? "gradient-hero border-0 text-white shadow-soft" : ""
                }`}
                variant={p.destaque ? "default" : "outline"}
              >
                <a href={linkCheckout} target="_blank" rel="noreferrer">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Assinar {p.nome}
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 max-w-2xl mx-auto">
        <CardContent className="p-6">
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {BENEFICIOS.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                {b}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground text-center mt-4">
            Pagamento seguro pela Hotmart · Acesso liberado automaticamente no e-mail da compra ·
            Cancele quando quiser
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
