import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  Download,
  ArrowLeft,
  Clock,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Projeto {
  id: string;
  name: string;
  arte_url: string | null;
  preview_url: string | null;
  personalization: any;
  status: string;
  created_at: string;
  molde_id: string | null;
  tema_id: string | null;
}

export default function Historico() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchProjetos();
  }, [user]);

  const fetchProjetos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("projetos")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar histórico");
      console.error(error);
    } else {
      setProjetos(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("projetos").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
    } else {
      setProjetos((prev) => prev.filter((p) => p.id !== id));
      toast.success("Projeto excluído");
    }
  };

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}.png`;
    link.target = "_blank";
    link.click();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="font-bold text-lg text-foreground">Meu Histórico</span>
            </div>
          </div>
          <Button onClick={() => navigate("/")} className="gradient-hero gap-2 text-sm">
            <Sparkles className="h-4 w-4" />
            Criar Novo
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-0">
                  <Skeleton className="aspect-square w-full rounded-t-lg" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projetos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Nenhum projeto ainda
            </h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Comece criando sua primeira arte personalizada. É rápido e fácil!
            </p>
            <Button onClick={() => navigate("/")} className="gradient-hero gap-2">
              <Sparkles className="h-4 w-4" />
              Criar minha primeira arte
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projetos.map((projeto) => {
              const p = projeto.personalization as any;
              return (
                <Card key={projeto.id} className="border-border/50 overflow-hidden group hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    {/* Image */}
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      {projeto.arte_url ? (
                        <img
                          src={projeto.arte_url}
                          alt={projeto.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}

                      {/* Mockup badge */}
                      {projeto.preview_url && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium">
                          + Mockup
                        </div>
                      )}

                      {/* Hover actions */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {projeto.arte_url && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDownload(projeto.arte_url!, projeto.name + "-arte")}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Arte
                          </Button>
                        )}
                        {projeto.preview_url && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDownload(projeto.preview_url!, projeto.name + "-mockup")}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Mockup
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-foreground truncate">{projeto.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {p?.tema && <span>{p.tema}</span>}
                            {p?.molde && <span> · {p.molde}</span>}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {formatDate(projeto.created_at)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleDelete(projeto.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
