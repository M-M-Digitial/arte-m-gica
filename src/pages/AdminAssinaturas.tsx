import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Ban, RotateCcw, Users, CircleDollarSign, Link2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";
import { toast } from "sonner";

const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotmart-webhook`;

const statusCor: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  canceled: "bg-amber-100 text-amber-700",
  refunded: "bg-red-100 text-red-700",
  chargeback: "bg-red-100 text-red-700",
  past_due: "bg-amber-100 text-amber-700",
  expired: "bg-slate-100 text-slate-600",
  inactive: "bg-slate-100 text-slate-600",
};

// Painel admin: assinaturas (Hotmart + manuais)
export default function AdminAssinaturas() {
  const { isAdmin, loading: loadingSub } = useSubscription();
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [novoEmail, setNovoEmail] = useState("");

  const [checkoutUrl, setCheckoutUrl] = useState("");

  useQuery({
    queryKey: ["config-checkout-admin"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("app_config").select("value").eq("key", "hotmart_checkout_url").maybeSingle();
      if (data?.value) setCheckoutUrl(data.value);
      return data?.value ?? "";
    },
  });

  const salvarCheckout = async () => {
    const url = checkoutUrl.trim();
    if (url && !/^https?:\/\//.test(url)) { toast.error("Cole a URL completa (https://...)"); return; }
    const { error } = await (supabase as any)
      .from("app_config")
      .upsert({ key: "hotmart_checkout_url", value: url, updated_at: new Date().toISOString() });
    if (error) toast.error(error.message);
    else toast.success("Link de checkout salvo — o paywall já usa ele.");
  };

  const { data: linhas, isLoading } = useQuery({
    queryKey: ["admin-assinaturas"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("assinaturas")
        .select("id,email,status,plano,origem,valid_until,created_at,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return linhas ?? [];
    return (linhas ?? []).filter((l: any) => l.email.includes(q) || l.status.includes(q));
  }, [linhas, busca]);

  const ativas = (linhas ?? []).filter((l: any) => l.status === "active").length;

  const recarregar = () => qc.invalidateQueries({ queryKey: ["admin-assinaturas"] });

  const mudarStatus = async (id: string, status: string, meses = 12) => {
    const { error } = await (supabase as any)
      .from("assinaturas")
      .update({
        status,
        valid_until: status === "active"
          ? new Date(Date.now() + meses * 30 * 24 * 3600 * 1000).toISOString()
          : null,
      })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Assinatura atualizada."); recarregar(); }
  };

  const adicionarManual = async () => {
    const email = novoEmail.trim().toLowerCase();
    if (!email.includes("@")) { toast.error("E-mail inválido."); return; }
    const { error } = await (supabase as any).from("assinaturas").upsert(
      {
        email,
        status: "active",
        plano: "manual",
        origem: "manual",
        valid_until: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      },
      { onConflict: "email" }
    );
    if (error) toast.error(error.message);
    else { toast.success(`Acesso liberado pra ${email}.`); setNovoEmail(""); recarregar(); }
  };

  if (loadingSub) return <Skeleton className="h-64 rounded-2xl max-w-4xl" />;
  if (!isAdmin) return <p className="text-muted-foreground py-10">Acesso restrito a administradores.</p>;

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Assinaturas</h1>
        <p className="text-muted-foreground mt-1">Gestão de acessos — Hotmart e liberações manuais.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-hero flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{ativas}</p>
              <p className="text-xs text-muted-foreground">assinaturas ativas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
              <CircleDollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                R$ {(ativas * 39.9).toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">receita mensal estimada*</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Link2 className="h-3 w-3" /> Webhook pra colar na Hotmart
            </p>
            <button
              className="text-[11px] text-primary break-all text-left hover:underline"
              onClick={() => { navigator.clipboard.writeText(WEBHOOK_URL); toast.success("URL copiada!"); }}
            >
              {WEBHOOK_URL}
            </button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted-foreground mb-1">
              Link de checkout da Hotmart (usado nos botões "Assinar" do paywall)
            </p>
            <Input
              placeholder="https://pay.hotmart.com/SEU_PRODUTO"
              value={checkoutUrl}
              onChange={(e) => setCheckoutUrl(e.target.value)}
              className="h-10 bg-secondary border-0 rounded-xl"
            />
          </div>
          <Button onClick={salvarCheckout} className="h-10 rounded-xl gradient-hero border-0 text-white sm:self-end">
            Salvar link
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por e-mail ou status…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 h-10 bg-secondary border-0 rounded-xl"
              />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="e-mail pra liberar acesso manual"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                className="h-10 bg-secondary border-0 rounded-xl w-64"
              />
              <Button onClick={adicionarManual} className="h-10 rounded-xl gradient-hero border-0 text-white">
                <Plus className="h-4 w-4 mr-1" /> Liberar
              </Button>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border/50">
                    <th className="py-2 pr-3">E-mail</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Plano</th>
                    <th className="py-2 pr-3">Origem</th>
                    <th className="py-2 pr-3">Válida até</th>
                    <th className="py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((l: any) => (
                    <tr key={l.id} className="border-b border-border/30">
                      <td className="py-2.5 pr-3 font-medium text-foreground">{l.email}</td>
                      <td className="py-2.5 pr-3">
                        <Badge className={`${statusCor[l.status] ?? "bg-slate-100 text-slate-600"} border-0`}>
                          {l.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{l.plano ?? "—"}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{l.origem}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">
                        {l.valid_until ? new Date(l.valid_until).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="py-2.5">
                        {l.status === "active" ? (
                          <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive" onClick={() => mudarStatus(l.id, "canceled")}>
                            <Ban className="h-3.5 w-3.5 mr-1" /> Revogar
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => mudarStatus(l.id, "active")}>
                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reativar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtradas.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Nenhuma assinatura ainda.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            * estimativa simples: ativas × R$ 39,90 (plano mensal). Assinaturas via Hotmart entram
            e saem automaticamente pelo webhook; as manuais você controla aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
