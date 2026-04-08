import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useTemas } from "@/hooks/use-catalog";
import { Skeleton } from "@/components/ui/skeleton";

import themeSafari from "@/assets/theme-safari.png";
import themeUnicornio from "@/assets/theme-unicornio.png";
import themePrincesas from "@/assets/theme-princesas.png";
import themeFazendinha from "@/assets/theme-fazendinha.png";

const localImages: Record<string, string> = {
  "Safari": themeSafari,
  "Unicórnio": themeUnicornio,
  "Princesas": themePrincesas,
  "Fazendinha": themeFazendinha,
};

const categories = ["Todos", "Infantil", "Bebê", "Religioso", "Sazonal", "Escolar"];

export default function Temas() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const { data: temas, isLoading } = useTemas();

  const filtered = (temas ?? []).filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === "Todos" || t.category === activeCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">🎨 Biblioteca de Temas</h1>
        <p className="text-muted-foreground mt-1">Escolha um tema lindo para sua festa</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar tema..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card border-border/50" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <Button key={cat} variant={activeCategory === cat ? "default" : "outline"} size="sm"
            onClick={() => setActiveCategory(cat)}
            className={activeCategory === cat ? "gradient-hero border-0" : "border-border/50"}>
            {cat}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((theme) => {
            const image = theme.image_url || localImages[theme.name];
            return (
              <Card key={theme.id} className="group cursor-pointer border-border/50 hover:shadow-soft transition-all hover:-translate-y-1 overflow-hidden">
                <CardContent className="p-0">
                  <div className="h-40 bg-card flex items-center justify-center relative overflow-hidden p-2">
                    {image ? (
                      <img src={image} alt={theme.name} loading="lazy" width={512} height={512}
                        className="h-full w-auto object-contain group-hover:scale-110 transition-transform duration-300" />
                    ) : (
                      <span className="text-5xl group-hover:scale-110 transition-transform">{theme.emoji || '🎉'}</span>
                    )}
                    {theme.trending && (
                      <Badge className="absolute top-2 right-2 gradient-hero text-primary-foreground border-0 text-[10px] flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5" /> Em alta
                      </Badge>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <h3 className="font-semibold text-sm text-foreground">{theme.name}</h3>
                    <div className="flex gap-1.5">
                      {(theme.colors || []).map((color, i) => (
                        <div key={i} className="h-5 w-5 rounded-full border border-border/50 shadow-sm" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                    <Link to="/editor">
                      <Button size="sm" className="w-full gradient-hero border-0 text-primary-foreground text-xs">🎉 Aplicar tema</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
