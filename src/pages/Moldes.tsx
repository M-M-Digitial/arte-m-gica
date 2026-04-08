import { useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

import moldMilkBox from "@/assets/mold-milk-box.png";
import moldSacolinha from "@/assets/mold-sacolinha.png";
import moldTopper from "@/assets/mold-topper.png";
import moldPiramide from "@/assets/mold-piramide.png";

const categories = ["Todos", "Caixas", "Embalagens", "Decoração", "Convites", "Rótulos"];

const moldes = [
  { id: 1, name: "Caixinha Milk", category: "Caixas", image: moldMilkBox, description: "Caixa formato milk, perfeita para doces e lembrancinhas", popular: true },
  { id: 2, name: "Sacolinha", category: "Embalagens", image: moldSacolinha, description: "Sacola personalizada para presentes de festa", popular: true },
  { id: 3, name: "Caixa Pirâmide", category: "Caixas", image: moldPiramide, description: "Caixa formato pirâmide elegante com laço", popular: false },
  { id: 4, name: "Topo de Bolo", category: "Decoração", image: moldTopper, description: "Topper personalizado para o bolo da festa", popular: true },
  { id: 5, name: "Tag", category: "Rótulos", emoji: "🏷️", description: "Etiqueta personalizada para lembrancinhas", popular: false },
  { id: 6, name: "Tubete", category: "Embalagens", emoji: "🍬", description: "Rótulo para tubete de docinhos da festa", popular: false },
  { id: 7, name: "Convite", category: "Convites", emoji: "💌", description: "Convite lindo para o aniversário", popular: true },
  { id: 8, name: "Caixa Acrílica", category: "Caixas", emoji: "💎", description: "Rótulo para caixa acrílica de doces", popular: false },
  { id: 9, name: "Porta Bis", category: "Embalagens", emoji: "🍫", description: "Embalagem temática para chocolate Bis", popular: false },
  { id: 10, name: "Card com Mimo", category: "Convites", emoji: "🎁", description: "Cartão com espaço para mimo especial", popular: false },
  { id: 11, name: "Lapela", category: "Embalagens", emoji: "🎀", description: "Lapela para saquinhos de doces", popular: false },
  { id: 12, name: "Forminha", category: "Decoração", emoji: "🧁", description: "Forminha personalizada para docinhos", popular: false },
  { id: 13, name: "Rótulo Água", category: "Rótulos", emoji: "💧", description: "Rótulo para garrafinha de água da festa", popular: false },
  { id: 14, name: "Cone Trufado", category: "Embalagens", emoji: "🍦", description: "Cone decorado para trufa ou chocolate", popular: false },
];

type Mold = typeof moldes[0];

function MoldCard({ mold }: { mold: Mold }) {
  const hasImage = 'image' in mold && mold.image;

  return (
    <Card className="group cursor-pointer border-border/50 hover:shadow-soft transition-all hover:-translate-y-1 overflow-hidden">
      <CardContent className="p-0">
        <div className="h-40 bg-card flex items-center justify-center relative overflow-hidden p-3">
          {hasImage ? (
            <img
              src={mold.image as string}
              alt={mold.name}
              loading="lazy"
              width={512}
              height={512}
              className="h-full w-auto object-contain group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <span className="text-5xl group-hover:scale-110 transition-transform">{'emoji' in mold ? (mold as any).emoji : '📦'}</span>
          )}
          {mold.popular && (
            <Badge className="absolute top-2 right-2 gradient-hero text-primary-foreground border-0 text-[10px]">
              ⭐ Popular
            </Badge>
          )}
        </div>
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-sm text-foreground">{mold.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2">{mold.description}</p>
          <Badge variant="secondary" className="text-[10px]">{mold.category}</Badge>
          <Link to="/editor">
            <Button size="sm" className="w-full mt-2 gradient-hero border-0 text-primary-foreground text-xs">
              🎨 Usar este molde
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Moldes() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");

  const filtered = moldes.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === "Todos" || m.category === activeCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          🎁 Biblioteca de Moldes
        </h1>
        <p className="text-muted-foreground mt-1">Escolha o molde perfeito para sua lembrancinha de festa</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar molde..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border/50"
          />
        </div>
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

      <p className="text-xs text-muted-foreground">{filtered.length} moldes encontrados</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((mold) => (
          <MoldCard key={mold.id} mold={mold} />
        ))}
      </div>
    </div>
  );
}
