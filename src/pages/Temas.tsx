import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Thumb } from "@/components/Thumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useTemas } from "@/hooks/use-catalog";
import { Skeleton } from "@/components/ui/skeleton";

// Infantil Menina
import themePrincesas from "@/assets/themes/theme-princesas.jpg";
import themeBarbie from "@/assets/themes/theme-barbie.jpg";
import themeMinnie from "@/assets/themes/theme-minnie.jpg";
import themeUnicornio from "@/assets/themes/theme-unicornio.jpg";
import themeJardim from "@/assets/themes/theme-jardim.jpg";
import themeSereia from "@/assets/themes/theme-sereia.jpg";
import themeFrozen from "@/assets/themes/theme-frozen.jpg";
import themeEncanto from "@/assets/themes/theme-encanto.jpg";
import themeMoranguinho from "@/assets/themes/theme-moranguinho.jpg";

// Infantil Menino
import themePatrulha from "@/assets/themes/theme-patrulha.jpg";
import themeDinossauros from "@/assets/themes/theme-dinossauros.jpg";
import themeHerois from "@/assets/themes/theme-herois.jpg";
import themeAranha from "@/assets/themes/theme-aranha.jpg";
import themeCarros from "@/assets/themes/theme-carros.jpg";
import themeSafari from "@/assets/themes/theme-safari.jpg";
import themeAstronauta from "@/assets/themes/theme-astronauta.jpg";
import themeSonic from "@/assets/themes/theme-sonic.jpg";
import themeMickey from "@/assets/themes/theme-mickey.jpg";

// Infantil Unissex
import themeStitch from "@/assets/themes/theme-stitch.jpg";
import themeCirco from "@/assets/themes/theme-circo.jpg";
import themeFazendinha from "@/assets/themes/theme-fazendinha.jpg";
import themeMonica from "@/assets/themes/theme-monica.jpg";
import themeGalinha from "@/assets/themes/theme-galinha.jpg";
import themeCocomelon from "@/assets/themes/theme-cocomelon.jpg";

// Datas Especiais
import themeChaRevelacao from "@/assets/themes/theme-cha-revelacao.jpg";
import themeDiaMaes from "@/assets/themes/theme-dia-maes.jpg";
import themeChaBebe from "@/assets/themes/theme-cha-bebe.jpg";
import themeBatizado from "@/assets/themes/theme-batizado.jpg";
import themeFestaJunina from "@/assets/themes/theme-festa-junina.jpg";
import themeNatal from "@/assets/themes/theme-natal.jpg";

const localImages: Record<string, string> = {
  "Princesas Disney": themePrincesas,
  "Barbie": themeBarbie,
  "Minnie Rosa": themeMinnie,
  "Unicórnio": themeUnicornio,
  "Jardim Encantado": themeJardim,
  "Sereia / Fundo do Mar": themeSereia,
  "Frozen": themeFrozen,
  "Encanto": themeEncanto,
  "Moranguinho": themeMoranguinho,
  "Patrulha Canina": themePatrulha,
  "Dinossauros": themeDinossauros,
  "Super-Heróis": themeHerois,
  "Homem-Aranha": themeAranha,
  "Carros / McQueen": themeCarros,
  "Safari": themeSafari,
  "Astronauta / Espaço": themeAstronauta,
  "Sonic": themeSonic,
  "Mickey": themeMickey,
  "Stitch": themeStitch,
  "Circo": themeCirco,
  "Fazendinha": themeFazendinha,
  "Turma da Mônica": themeMonica,
  "Galinha Pintadinha": themeGalinha,
  "Cocomelon": themeCocomelon,
  "Chá Revelação": themeChaRevelacao,
  "Dia das Mães": themeDiaMaes,
  "Chá de Bebê": themeChaBebe,
  "Batizado": themeBatizado,
  "Festa Junina": themeFestaJunina,
  "Natal": themeNatal,
};

const categories = ["Todos", "Infantil Menina", "Infantil Menino", "Infantil Unissex", "Datas Especiais"];

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
        <p className="text-muted-foreground mt-1">30 temas reais para personalizar suas lembrancinhas de festa</p>
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

      <p className="text-xs text-muted-foreground">{filtered.length} temas encontrados</p>

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
                  <div className="h-40 bg-card flex items-center justify-center relative overflow-hidden">
                    {image ? (
                      <Thumb src={image} size={512} alt={theme.name} width={512} height={384}
                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300" />
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
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        {(theme.colors || []).map((color, i) => (
                          <div key={i} className="h-5 w-5 rounded-full border border-border/50 shadow-sm" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                      <Badge variant="secondary" className="text-[10px] ml-auto">{theme.category}</Badge>
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
