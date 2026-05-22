import { useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useMoldes } from "@/hooks/use-catalog";
import { Skeleton } from "@/components/ui/skeleton";

import moldMilkBox from "@/assets/mold-milk-box.png";
import moldSacolinha from "@/assets/mold-sacolinha.png";
import moldTopper from "@/assets/mold-topper.png";
import moldPiramide from "@/assets/mold-piramide.png";
import moldSextavada from "@/assets/molds/mold-caixa-sextavada.png";
import moldTravesseiro from "@/assets/molds/mold-caixa-travesseiro.png";
import moldCone from "@/assets/molds/mold-cone.png";
import moldCachepot from "@/assets/molds/mold-cachepot.png";
import moldCanudo from "@/assets/molds/mold-caixa-canudo.png";
import moldCoracao from "@/assets/molds/mold-caixa-coracao.png";
import moldEnvelope from "@/assets/molds/mold-caixa-envelope.png";
import moldTopoBolo from "@/assets/molds/mold-topo-bolo.png";
import moldSacolinhaNew from "@/assets/molds/mold-sacolinha.png";
import moldPiramideNew from "@/assets/molds/mold-piramide.png";

const localImages: Record<string, string> = {
  "Caixinha Milk": moldMilkBox,
  "Sacolinha de Papel": moldSacolinhaNew,
  "Caixa Pirâmide": moldPiramideNew,
  "Caixa Sextavada": moldSextavada,
  "Caixa Travesseiro": moldTravesseiro,
  "Cone de Guloseimas": moldCone,
  "Cachepot / Bandeja": moldCachepot,
  "Caixa Canudo": moldCanudo,
  "Caixa Coração": moldCoracao,
  "Caixa Envelope": moldEnvelope,
  "Topo de Bolo": moldTopoBolo,
  "Porta-bis": moldMilkBox,
  "Sacolinha": moldSacolinha,
};

const categories = ["Todos", "Caixas", "Embalagens", "Decoração"];

export default function Moldes() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const { data: moldes, isLoading } = useMoldes();

  const filtered = (moldes ?? []).filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === "Todos" || m.category === activeCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">🎁 Biblioteca de Moldes</h1>
        <p className="text-muted-foreground mt-1">Moldes reais para imprimir em tamanho real — caixas, embalagens e decorações para festa</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar molde..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card border-border/50" />
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

      <p className="text-xs text-muted-foreground">{filtered.length} moldes encontrados</p>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((mold) => {
            const image = mold.image_url || localImages[mold.name];
            return (
              <Card key={mold.id} className="group cursor-pointer border-border/50 hover:shadow-soft transition-all hover:-translate-y-1 overflow-hidden">
                <CardContent className="p-0">
                  <div className="h-40 bg-card flex items-center justify-center relative overflow-hidden p-3">
                    {image ? (
                      <img src={image} alt={mold.name} loading="lazy" width={512} height={512}
                        className="h-full w-auto object-contain group-hover:scale-110 transition-transform duration-300" />
                    ) : (
                      <span className="text-5xl group-hover:scale-110 transition-transform">{mold.emoji || '📦'}</span>
                    )}
                    {mold.popular && (
                      <Badge className="absolute top-2 right-2 gradient-hero text-primary-foreground border-0 text-[10px]">⭐ Popular</Badge>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-sm text-foreground">{mold.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{mold.description}</p>
                    <Badge variant="secondary" className="text-[10px]">{mold.category}</Badge>
                    <Link to="/criar">
                      <Button size="sm" className="w-full mt-2 gradient-hero border-0 text-primary-foreground text-xs">🎨 Usar este molde</Button>
                    </Link>
                    {(mold as any).template_pdf_url && (
                      <a href={(mold as any).template_pdf_url} target="_blank" rel="noopener noreferrer" className="block">
                        <Button size="sm" variant="outline" className="w-full text-xs">📄 Baixar PDF</Button>
                      </a>
                    )}
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
