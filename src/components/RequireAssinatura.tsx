import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BENEFICIOS, BILLING_COPY, HOTMART_CHECKOUT_URL, isCheckoutUrlConfigured, PLANOS } from "@/config/billing";
import { useSubscription } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";

export function RequireAssinatura({ children }: { children: ReactNode }) {
  const { loading, liberado, assinatura } = useSubscription();
  const { data: checkoutUrl } = useQuery({
    queryKey: ["config-checkout"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "hotmart_checkout_url")
        .maybeSingle();
      return data?.value || HOTMART_CHECKOUT_URL;
    },
  });
  const linkCheckout = checkoutUrl || HOTMART_CHECKOUT_URL;
  const checkoutConfigured = isCheckoutUrlConfigured(linkCheckout);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-8">
        <Skeleton className="h-10 w-2/3 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }
  if (liberado) return <>{children}</>;

  const statusMessage = assinatura && assinatura.status !== "active"
    ? `Seu acesso está como "${assinatura.status}". Regularize para entrar novamente.`
    : null;

  return (
    <div className="mx-auto max-w-4xl animate-fade-in space-y-7 py-8">
      <header className="space-y-3 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
          <Lock className="h-3.5 w-3.5" /> {BILLING_COPY.eyebrow}
        </span>
        <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">{BILLING_COPY.headline}</h1>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">{BILLING_COPY.description}</p>
        {statusMessage && <p className="text-sm font-medium text-destructive">{statusMessage}</p>}
      </header>

      <div className={`mx-auto grid max-w-2xl gap-4 ${PLANOS.length > 1 ? "sm:grid-cols-2" : "sm:max-w-md"}`}>
        {PLANOS.map((plan) => (
          <Card key={plan.id} className={`rounded-lg border ${plan.destaque ? "border-primary shadow-soft" : "border-border"}`}>
            <CardContent className="space-y-3 p-6 text-center">
              {plan.destaque && (
                <span className="inline-block text-[11px] font-bold uppercase text-primary">
                  {"economia" in plan ? plan.economia : ""}
                </span>
              )}
              <p className="text-sm font-semibold text-muted-foreground">{plan.nome}</p>
              <p className="font-display text-3xl font-bold text-foreground">
                {plan.preco}
                <span className="block text-xs font-normal text-muted-foreground">{plan.periodo}</span>
              </p>
              {checkoutConfigured ? (
                <Button asChild className="h-11 w-full rounded-lg font-semibold">
                  <a href={linkCheckout} target="_blank" rel="noreferrer">
                    {BILLING_COPY.action}<ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              ) : (
                <Button disabled className="h-11 w-full rounded-lg font-semibold">
                  Checkout em configuração
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {!checkoutConfigured && (
        <p className="text-center text-xs text-muted-foreground">
          A compra será liberada assim que a configuração da Hotmart for concluída.
        </p>
      )}

      <Card className="mx-auto max-w-2xl rounded-lg border-border/70">
        <CardContent className="p-6">
          <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {BENEFICIOS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {benefit}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-center text-[11px] text-muted-foreground">{BILLING_COPY.security}</p>
        </CardContent>
      </Card>
    </div>
  );
}
