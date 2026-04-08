import { Image, Download, Share2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockupStyles = [
  { id: 1, name: "Fundo Clean", description: "Produto em fundo branco minimalista", emoji: "🤍", type: "feed" },
  { id: 2, name: "Feed Instagram", description: "Formato quadrado otimizado para feed", emoji: "📸", type: "feed" },
  { id: 3, name: "Story", description: "Formato vertical para stories", emoji: "📱", type: "story" },
  { id: 4, name: "Catálogo", description: "Layout profissional para catálogo", emoji: "📖", type: "catalog" },
  { id: 5, name: "Mesa Decorada", description: "Produto em ambientação de festa", emoji: "🎀", type: "ambient" },
  { id: 6, name: "Kit Completo", description: "Várias peças juntas em composição", emoji: "🎁", type: "kit" },
];

const recentMockups = [
  { id: 1, name: "Safari - Caixinha Milk", style: "Feed Instagram", date: "Hoje" },
  { id: 2, name: "Unicórnio - Sacolinha", style: "Story", date: "Ontem" },
  { id: 3, name: "Princesas - Kit", style: "Catálogo", date: "3 dias" },
];

export default function Mockups() {
  return (
    <div className="space-y-8 animate-fade-in max-w-6xl">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Gerador de Mockups</h1>
        <p className="text-muted-foreground mt-1">Crie imagens profissionais para divulgar seus personalizados</p>
      </div>

      {/* CTA */}
      <Card className="border-border/50 gradient-card overflow-hidden">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="h-20 w-20 rounded-2xl gradient-hero flex items-center justify-center shrink-0">
            <Sparkles className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="font-display font-bold text-lg text-foreground">Gere mockups a partir do seu projeto</h2>
            <p className="text-sm text-muted-foreground mt-1">Escolha um projeto salvo e gere mockups prontos para divulgação em segundos</p>
          </div>
          <Button className="gradient-hero border-0 text-primary-foreground shrink-0">
            <Sparkles className="h-4 w-4 mr-2" /> Gerar Mockup
          </Button>
        </CardContent>
      </Card>

      {/* Mockup Styles */}
      <div>
        <h2 className="font-display font-semibold text-lg text-foreground mb-4">Estilos de Mockup</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {mockupStyles.map((style) => (
            <Card key={style.id} className="group cursor-pointer border-border/50 hover:shadow-soft transition-all hover:-translate-y-0.5">
              <CardContent className="p-5 text-center space-y-3">
                <span className="text-4xl block group-hover:scale-110 transition-transform">{style.emoji}</span>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{style.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{style.description}</p>
                </div>
                <Badge variant="secondary" className="text-[10px]">{style.type}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Mockups */}
      <div>
        <h2 className="font-display font-semibold text-lg text-foreground mb-4">Mockups Recentes</h2>
        <div className="space-y-3">
          {recentMockups.map((mockup) => (
            <Card key={mockup.id} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg gradient-card flex items-center justify-center">
                    <Image className="h-5 w-5 text-primary/50" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{mockup.name}</p>
                    <p className="text-xs text-muted-foreground">{mockup.style} · {mockup.date}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Share2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
