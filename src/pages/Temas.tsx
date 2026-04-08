import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const categories = ["Todos", "Infantil", "Bebê", "Religioso", "Sazonal", "Escolar"];

const themes = [
  { id: 1, name: "Safari", category: "Infantil", emoji: "🦁", colors: ["#F4A460", "#8B4513", "#228B22", "#FFD700"], trending: true },
  { id: 2, name: "Unicórnio", category: "Infantil", emoji: "🦄", colors: ["#FFB6C1", "#DDA0DD", "#87CEEB", "#F0E68C"], trending: true },
  { id: 3, name: "Princesas", category: "Infantil", emoji: "👑", colors: ["#FFB7C5", "#FFD700", "#E6E6FA", "#FFF0F5"], trending: true },
  { id: 4, name: "Fazendinha", category: "Infantil", emoji: "🐄", colors: ["#8B4513", "#228B22", "#FFD700", "#FF6347"], trending: false },
  { id: 5, name: "Super-Heróis", category: "Infantil", emoji: "🦸", colors: ["#FF0000", "#0000FF", "#FFD700", "#000000"], trending: false },
  { id: 6, name: "Páscoa", category: "Sazonal", emoji: "🐰", colors: ["#FFB6C1", "#98FB98", "#FFFACD", "#DDA0DD"], trending: false },
  { id: 7, name: "Natal", category: "Sazonal", emoji: "🎄", colors: ["#FF0000", "#228B22", "#FFD700", "#FFFFFF"], trending: false },
  { id: 8, name: "Chá Revelação", category: "Bebê", emoji: "💙💗", colors: ["#87CEEB", "#FFB6C1", "#FFFFFF", "#E0E0E0"], trending: true },
  { id: 9, name: "Batizado", category: "Religioso", emoji: "✝️", colors: ["#FFFFFF", "#FFD700", "#F5F5DC", "#D4AF37"], trending: false },
  { id: 10, name: "Maternidade", category: "Bebê", emoji: "👶", colors: ["#FFFACD", "#FFB6C1", "#E6E6FA", "#FFFFFF"], trending: false },
  { id: 11, name: "Escolar", category: "Escolar", emoji: "📚", colors: ["#4169E1", "#FF6347", "#FFD700", "#32CD32"], trending: false },
];

export default function Temas() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");

  const filtered = themes.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === "Todos" || t.category === activeCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Biblioteca de Temas</h1>
        <p className="text-muted-foreground mt-1">Escolha um tema incrível para sua peça</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar tema..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card border-border/50"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(cat)}
            className={activeCategory === cat ? "gradient-hero border-0" : "border-border/50"}
          >
            {cat}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((theme) => (
          <Card key={theme.id} className="group cursor-pointer border-border/50 hover:shadow-soft transition-all hover:-translate-y-1 overflow-hidden">
            <CardContent className="p-0">
              <div className="h-32 gradient-card flex items-center justify-center relative">
                <span className="text-5xl group-hover:scale-110 transition-transform">{theme.emoji}</span>
                {theme.trending && (
                  <Badge className="absolute top-2 right-2 gradient-hero text-primary-foreground border-0 text-[10px] flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" /> Em alta
                  </Badge>
                )}
              </div>
              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-sm text-foreground">{theme.name}</h3>
                <div className="flex gap-1.5">
                  {theme.colors.map((color, i) => (
                    <div
                      key={i}
                      className="h-5 w-5 rounded-full border border-border/50"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <Link to="/editor">
                  <Button size="sm" className="w-full gradient-hero border-0 text-primary-foreground text-xs">
                    Aplicar tema
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
