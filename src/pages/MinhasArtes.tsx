import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Images, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Thumb } from "@/components/Thumb";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { baixarSvgDaArte } from "@/lib/svg-arte";
import { toast } from "sonner";

export interface ArteSalva {
  id: string;
  tema_nome: string;
  tema_colors: string[] | null;
  molde_name: string;
  molde_template_url: string | null;
  nome: string;
  idade: string | null;
  frase: string | null;
  cor_dominante: string | null;
  fonte_estilo: string | null;
  desenho_estilo: string | null;
  densidade_visual: string | null;
  qualidade: string | null;
  image_url: string;
  mockup_url: string | null;
  created_at: string;
}

export default function MinhasArtes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const { data: artes, isLoading } = useQuery({
    queryKey: ["minhas-artes", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ArteSalva[]> => {
      // a tabela é a galeria universal — aqui filtramos só as artes da dona
      const { data, error } = await (supabase as any)
        .from("minhas_artes")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const excluir = async (id: string) => {
    setExcluindo(id);
    try {
      const { error } = await (supabase as any).from("minhas_artes").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["minhas-artes"] });
      toast.success("Arte removida do histórico.");
    } catch {
      toast.error("Não consegui excluir. Tente de novo.");
    } finally {
      setExcluindo(null);
    }
  };

  const refazer = (arte: ArteSalva) => {
    navigate("/criar", { state: { refazer: arte } });
  };

  // entrega oficial em SVG: arte + linhas vetoriais do molde
  const baixarSvg = async (arte: ArteSalva) => {
    const { data: molde } = await (supabase as any)
      .from("moldes")
      .select("svg_url")
      .eq("name", arte.molde_name)
      .maybeSingle();
    await baixarSvgDaArte({
      imagem: arte.image_url,
      moldeSvgUrl: molde?.svg_url ?? null,
      nomeArquivo: `molde-${arte.tema_nome}-${arte.nome}`.replace(/\s+/g, "-").toLowerCase(),
    });
  };

  return (
    <div className="animate-fade-in max-w-6xl space-y-7">
      <header className="border-b border-border/60 pb-6">
        <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
          <Images className="h-3.5 w-3.5" /> Histórico
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">Minhas Artes</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Tudo que você gerou fica salvo aqui. Refaça qualquer arte trocando só o nome da cliente.
        </p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : !artes?.length ? (
        <Card className="border-dashed border-border">
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <Sparkles className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Nenhuma arte salva ainda</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Gere sua primeira arte com IA — ela aparece aqui automaticamente.
              </p>
            </div>
            <Button className="rounded-full gradient-hero border-0 text-white" onClick={() => navigate("/criar")}>
              <Sparkles className="mr-2 h-4 w-4" /> Criar com IA
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {artes.map((arte) => (
            <Card key={arte.id} className="group overflow-hidden border-border/50 transition-all hover:shadow-soft">
              <CardContent className="p-0">
                <div className="aspect-square bg-secondary">
                  <Thumb src={arte.image_url} size={480} alt={`${arte.tema_nome} — ${arte.nome}`} className="h-full w-full object-cover" />
                </div>
                <div className="space-y-2 p-3">
                  <div>
                    <p className="truncate text-sm font-bold text-foreground">{arte.nome}{arte.idade ? ` (${arte.idade})` : ""}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {arte.tema_nome} · {arte.molde_name} · {new Date(arte.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full rounded-full gradient-hero border-0 text-white text-xs h-8"
                    onClick={() => refazer(arte)}
                  >
                    <RefreshCw className="mr-1.5 h-3 w-3" /> Refazer com outro nome
                  </Button>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" className="flex-1 rounded-full text-xs h-8" onClick={() => baixarSvg(arte)}>
                      <Download className="mr-1.5 h-3 w-3" /> Baixar SVG
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="rounded-full text-xs h-8 px-3 text-muted-foreground hover:text-destructive"
                      disabled={excluindo === arte.id}
                      onClick={() => excluir(arte.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
