import { useEffect, useMemo, useState } from "react";
import { Search, FileText, Download, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";

type ThemeFile = { name: string; label: string; url: string };
type Theme = { slug: string; name: string; files: ThemeFile[] };

export default function ModelosProntos() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("list-modelos-prontos");
        if (error) throw error;
        setThemes((data as { themes: Theme[] }).themes || []);
      } catch (e: any) {
        setError(e?.message ?? "Erro ao carregar");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return themes;
    return themes
      .map((t) => ({ ...t, files: t.files.filter((f) => f.label.toLowerCase().includes(q)) }))
      .filter((t) => t.name.toLowerCase().includes(q) || t.files.length > 0);
  }, [themes, search]);

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">📚 Modelos Prontos</h1>
        <p className="text-muted-foreground mt-1">
          Coleção de modelos PDF prontos para imprimir, organizados por tema.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar tema ou modelo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card border-border/50"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {loading ? "Carregando..." : `${filtered.length} temas • ${filtered.reduce((s, t) => s + t.files.length, 0)} modelos`}
      </p>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((theme) => {
            const open = openSlug === theme.slug;
            return (
              <Collapsible
                key={theme.slug}
                open={open}
                onOpenChange={(v) => setOpenSlug(v ? theme.slug : null)}
              >
                <Card className="border-border/50 overflow-hidden">
                  <CollapsibleTrigger className="w-full text-left">
                    <CardContent className="p-4 flex items-center justify-between hover:bg-accent/40 transition-colors">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-foreground truncate">{theme.name}</h3>
                        <p className="text-xs text-muted-foreground">{theme.files.length} modelos</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-[10px]">PDF</Badge>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                        />
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-border/50 divide-y divide-border/40">
                      {theme.files.map((file) => (
                        <div key={file.name} className="flex items-center justify-between gap-2 p-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-xs text-foreground truncate">{file.label}</span>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <a href={file.url} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="ghost" className="h-7 text-[11px]">Ver</Button>
                            </a>
                            <a href={file.url} download>
                              <Button size="sm" variant="outline" className="h-7 text-[11px]">
                                <Download className="h-3 w-3 mr-1" /> PDF
                              </Button>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
