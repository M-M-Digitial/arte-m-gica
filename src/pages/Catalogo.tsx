import { Share2, ExternalLink, Copy, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const catalogItems = [
  { id: 1, name: "Kit Safari Completo", price: "R$ 45,00", emoji: "🦁", liked: true },
  { id: 2, name: "Caixinha Unicórnio", price: "R$ 25,00", emoji: "🦄", liked: true },
  { id: 3, name: "Topper Princesas", price: "R$ 15,00", emoji: "👑", liked: false },
  { id: 4, name: "Sacolinha Fazendinha", price: "R$ 20,00", emoji: "🐄", liked: true },
  { id: 5, name: "Convite Chá Revelação", price: "R$ 10,00", emoji: "💗", liked: false },
  { id: 6, name: "Kit Páscoa", price: "R$ 35,00", emoji: "🐰", liked: false },
];

export default function Catalogo() {
  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Meu Catálogo</h1>
          <p className="text-muted-foreground mt-1">Sua vitrine de personalizados para compartilhar</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-border/50 text-xs">
            <Copy className="h-3 w-3 mr-1" /> Copiar Link
          </Button>
          <Button size="sm" className="gradient-hero border-0 text-primary-foreground text-xs">
            <Share2 className="h-3 w-3 mr-1" /> Compartilhar
          </Button>
        </div>
      </div>

      {/* Share Options */}
      <Card className="border-border/50 gradient-card">
        <CardContent className="p-4 flex flex-wrap gap-3">
          <Button variant="outline" size="sm" className="border-border/50 text-xs">
            📱 WhatsApp
          </Button>
          <Button variant="outline" size="sm" className="border-border/50 text-xs">
            📸 Instagram
          </Button>
          <Button variant="outline" size="sm" className="border-border/50 text-xs">
            <ExternalLink className="h-3 w-3 mr-1" /> Link da Vitrine
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {catalogItems.map((item) => (
          <Card key={item.id} className="border-border/50 hover:shadow-soft transition-all group overflow-hidden">
            <CardContent className="p-0">
              <div className="h-36 gradient-card flex items-center justify-center relative">
                <span className="text-5xl group-hover:scale-110 transition-transform">{item.emoji}</span>
                <button className="absolute top-2 right-2">
                  <Heart className={`h-5 w-5 ${item.liked ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                </button>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-sm text-foreground">{item.name}</h3>
                <p className="text-primary font-bold text-sm mt-1">{item.price}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
