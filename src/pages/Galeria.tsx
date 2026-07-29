import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Globe, RefreshCw, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Thumb } from "@/components/Thumb";
import { supabase } from "@/integrations/supabase/client";
import type { ArteSalva } from "@/pages/MinhasArtes";

export default function Galeria() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");

  const { data: artes, isLoading } = useQuery({
    queryKey: ["galeria-artes"],
    queryFn: async (): Promise<ArteSalva[]> => {
      // banco universal: artes geradas por TODAS as usuárias
      const { data, error } = await (supabase as any)
        .from("minhas_artes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(400);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return artes ?? [];
    return (artes ?? []).filter((a) =>
      [a.tema_nome, a.molde_name, a.nome].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [artes, busca]);

  return (
    <div className="animate-fade-in max-w-6xl space-y-7">
      <header className="border-b border-border/60 pb-6">
        <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
          <Globe className="h-3.5 w-3.5" /> Banco universal
        </div>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">Galeria de Artes</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Artes criadas por toda a comunidade. Encontrou uma parecida com o pedido da sua cliente?
              Refaça trocando só o nome.
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar tema, molde ou nome…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-10 rounded-xl border-0 bg-secondary pl-9"
            />
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : !filtradas.length ? (
        <Card className="border-dashed border-border">
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <Sparkles className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {busca ? `Nada encontrado para "${busca}"` : "A galeria ainda está vazia"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {busca ? "Tente outro tema ou molde." : "As artes geradas pela comunidade aparecem aqui."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtradas.map((arte) => (
            <Card key={arte.id} className="group overflow-hidden border-border/50 transition-all hover:shadow-soft">
              <CardContent className="p-0">
                <div className="aspect-square bg-secondary">
                  <Thumb src={arte.image_url} size={480} alt={`${arte.tema_nome} — ${arte.molde_name}`} className="h-full w-full object-cover" />
                </div>
                <div className="space-y-2 p-3">
                  <div>
                    <p className="truncate text-sm font-bold text-foreground">{arte.tema_nome}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {arte.molde_name} · {new Date(arte.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full rounded-full gradient-hero border-0 text-white text-xs h-8"
                    onClick={() => navigate("/criar", { state: { refazer: arte } })}
                  >
                    <RefreshCw className="mr-1.5 h-3 w-3" /> Usar com outro nome
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
