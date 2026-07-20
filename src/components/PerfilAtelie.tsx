import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export interface AteliePerfil {
  atelie_nome: string | null;
  produtos: string;
  publico: string | null;
  ticket_medio: string | null;
  canais: string | null;
  cidade: string | null;
  observacoes: string | null;
}

// As assistentes só acertam se conhecerem o ateliê (produtos, público, canais).
// Este hook diz se o perfil existe; o formulário coleta/edita.
export function useAteliePerfil() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["atelie-perfil", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AteliePerfil | null> => {
      const { data, error } = await supabase
        .from("atelie_perfil")
        .select("atelie_nome, produtos, publico, ticket_medio, canais, cidade, observacoes")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  return { perfil: data ?? null, carregando: isLoading, completo: !!data?.produtos?.trim() };
}

export function PerfilAtelieForm({ onSaved, compacto = false }: { onSaved?: () => void; compacto?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { perfil } = useAteliePerfil();
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    atelie_nome: "",
    produtos: "",
    publico: "",
    ticket_medio: "",
    canais: "",
    cidade: "",
    observacoes: "",
  });

  useEffect(() => {
    if (perfil) {
      setForm({
        atelie_nome: perfil.atelie_nome ?? "",
        produtos: perfil.produtos ?? "",
        publico: perfil.publico ?? "",
        ticket_medio: perfil.ticket_medio ?? "",
        canais: perfil.canais ?? "",
        cidade: perfil.cidade ?? "",
        observacoes: perfil.observacoes ?? "",
      });
    }
  }, [perfil]);

  const set = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  const salvar = async () => {
    if (!form.produtos.trim()) {
      toast.error("Conta pelo menos o que você vende — é o mais importante!");
      return;
    }
    setSalvando(true);
    try {
      const { error } = await supabase.from("atelie_perfil").upsert({
        user_id: user!.id,
        atelie_nome: form.atelie_nome.trim() || null,
        produtos: form.produtos.trim(),
        publico: form.publico.trim() || null,
        ticket_medio: form.ticket_medio.trim() || null,
        canais: form.canais.trim() || null,
        cidade: form.cidade.trim() || null,
        observacoes: form.observacoes.trim() || null,
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["atelie-perfil"] });
      toast.success("Perfil salvo! Agora as assistentes conhecem o seu ateliê 💖");
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar o perfil.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-2xl rounded-lg border-border">
      <CardContent className="space-y-4 p-6">
        {!compacto && (
          <div className="space-y-1.5 text-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
              <Heart className="h-3.5 w-3.5" /> Antes de começar
            </span>
            <h2 className="font-display text-2xl font-bold text-foreground">Me conta do seu ateliê</h2>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Suas assistentes usam essas respostas para sugerir só o que faz sentido pro
              <strong> seu </strong>negócio — sem chutar produto nem inventar preço.
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              O que você vende? <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="Ex: cadernos e agendas personalizadas com encadernação artesanal; ou: caixas, sacolinhas e lembrancinhas para festas"
              value={form.produtos}
              onChange={set("produtos")}
              rows={2}
              className="resize-none rounded-lg bg-secondary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Nome do ateliê</label>
            <Input placeholder="Ex: Ateliê da Mari" value={form.atelie_nome} onChange={set("atelie_nome")} className="rounded-lg bg-secondary" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Pra quem você vende?</label>
            <Input placeholder="Ex: mães de festa infantil; noivas; empresas" value={form.publico} onChange={set("publico")} className="rounded-lg bg-secondary" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Faixa de preço dos pedidos</label>
            <Input placeholder="Ex: pedidos entre R$ 80 e R$ 300" value={form.ticket_medio} onChange={set("ticket_medio")} className="rounded-lg bg-secondary" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Onde você vende?</label>
            <Input placeholder="Ex: WhatsApp e Instagram; Elo7; feiras" value={form.canais} onChange={set("canais")} className="rounded-lg bg-secondary" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Cidade</label>
            <Input placeholder="Ex: Catalão - GO" value={form.cidade} onChange={set("cidade")} className="rounded-lg bg-secondary" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Mais alguma coisa que elas devem saber?</label>
            <Textarea
              placeholder="Ex: não trabalho com topo de bolo; uso Silhouette; estilo delicado em tons pastel"
              value={form.observacoes}
              onChange={set("observacoes")}
              rows={2}
              className="resize-none rounded-lg bg-secondary"
            />
          </div>
        </div>

        <Button onClick={salvar} disabled={salvando} className="h-11 w-full rounded-lg font-semibold">
          {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {perfil ? "Atualizar meu ateliê" : "Salvar e conhecer minhas assistentes"}
        </Button>
      </CardContent>
    </Card>
  );
}
