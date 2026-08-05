import { useMemo, useState } from "react";
import { Palette, Search, Wand2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Thumb } from "@/components/Thumb";
import { ThemeCover } from "@/components/ThemeCover";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useThemeLibrary } from "@/hooks/use-theme-library";

export default function Temas() {
  const [search, setSearch] = useState("");
  const { data: themes, isLoading, error } = useThemeLibrary();
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    if (!query) return themes ?? [];
    return (themes ?? []).filter((theme) => theme.name.toLocaleLowerCase("pt-BR").includes(query));
  }, [search, themes]);

  return (
    <div className="max-w-7xl space-y-5 animate-fade-in">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" aria-hidden="true" />
            <h1 className="font-display text-3xl font-bold text-foreground">Biblioteca de Temas</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{themes?.length ?? 0} temas curados disponíveis</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Buscar tema"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 bg-card pl-9"
          />
        </div>
      </header>

      {error ? (
        <div className="border-y border-destructive/30 bg-destructive/5 px-4 py-5 text-sm text-destructive">
          Não foi possível carregar a biblioteca de temas.
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <Skeleton key={index} className="aspect-[4/3] rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground">{filtered.length} resultados</p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4">
            {filtered.map((theme) => (
              <Card key={theme.slug} className="group overflow-hidden rounded-lg border-border/60 transition-shadow hover:shadow-soft">
                <CardContent className="p-0">
                  <div className="relative aspect-[4/3] overflow-hidden" style={{ backgroundColor: theme.palette.background }}>
                    <Thumb
                      src={theme.paper}
                      size={512}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full object-cover opacity-35"
                    />
                    <ThemeCover
                      src={theme.cover}
                      size={512}
                      alt={theme.name}
                    />
                  </div>
                  <div className="space-y-3 p-3">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <h2 className="min-w-0 truncate text-sm font-semibold text-foreground" title={theme.name}>{theme.name}</h2>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">{theme.heroCount} artes</Badge>
                    </div>
                    <div className="flex gap-1.5" aria-label={`Paleta do tema ${theme.name}`}>
                      {[theme.palette.primary, theme.palette.secondary, theme.palette.background, theme.palette.accent].map((color, index) => (
                        <span
                          key={`${color}-${index}`}
                          className="h-4 flex-1 border border-border/60"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <Button asChild size="sm" className="w-full border-0 text-xs text-primary-foreground gradient-hero">
                      <Link to={`/editor?tema=${encodeURIComponent(theme.slug)}`}>
                        <Wand2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Aplicar tema
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="border-y border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
              Nenhum tema encontrado para “{search}”.
            </div>
          )}
        </>
      )}
    </div>
  );
}
