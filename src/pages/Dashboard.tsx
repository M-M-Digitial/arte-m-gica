import { Plus, Box, Palette, Image, ArrowRight, Sparkles, TrendingUp, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const recentProjects = [
  { id: 1, name: "Kit Safari - Pedro", theme: "Safari", mold: "Caixinha Milk", date: "Hoje" },
  { id: 2, name: "Unicórnio - Maria", theme: "Unicórnio", mold: "Sacolinha", date: "Ontem" },
  { id: 3, name: "Princesas - Ana", theme: "Princesas", mold: "Topo de Bolo", date: "3 dias" },
];

const popularMolds = [
  { name: "Caixinha Milk", uses: 1240, emoji: "📦" },
  { name: "Sacolinha", uses: 980, emoji: "🛍️" },
  { name: "Topo de Bolo", uses: 870, emoji: "🎂" },
  { name: "Tubete", uses: 650, emoji: "🧪" },
];

const trendingThemes = [
  { name: "Safari", color: "bg-peach" },
  { name: "Unicórnio", color: "bg-lilac" },
  { name: "Princesas", color: "bg-rose-light" },
  { name: "Fazendinha", color: "bg-mint" },
];

const stats = [
  { label: "Projetos", value: "24", icon: Box, trend: "+3 esta semana" },
  { label: "Downloads", value: "156", icon: Download, trend: "+12 este mês" },
  { label: "Mockups", value: "48", icon: Image, trend: "+5 esta semana" },
];

export default function Dashboard() {
  return (
    <div className="space-y-8 animate-fade-in max-w-6xl">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          Olá, bem-vinda! ✨
        </h1>
        <p className="text-muted-foreground mt-1">
          Crie artes incríveis prontas para imprimir e divulgar.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/moldes">
          <Card className="group cursor-pointer border-border/50 hover:shadow-soft transition-all hover:-translate-y-0.5">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl gradient-hero flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Box className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Escolher Molde</p>
                <p className="text-xs text-muted-foreground">14 moldes disponíveis</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/temas">
          <Card className="group cursor-pointer border-border/50 hover:shadow-soft transition-all hover:-translate-y-0.5">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Palette className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Escolher Tema</p>
                <p className="text-xs text-muted-foreground">11 temas incríveis</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/editor">
          <Card className="group cursor-pointer border-border/50 hover:shadow-soft transition-all hover:-translate-y-0.5">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-peach flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Plus className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Criar Arte</p>
                <p className="text-xs text-muted-foreground">Começar novo projeto</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-display font-bold text-foreground mt-1">{stat.value}</p>
                  <p className="text-xs text-primary mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {stat.trend}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-lg text-foreground">Projetos Recentes</h2>
              <Link to="/projetos">
                <Button variant="ghost" size="sm" className="text-primary text-xs">
                  Ver todos <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {recentProjects.map((project) => (
                <div key={project.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div>
                    <p className="font-medium text-sm text-foreground">{project.name}</p>
                    <p className="text-xs text-muted-foreground">{project.mold} · {project.theme}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{project.date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Popular Molds */}
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-lg text-foreground">Moldes Populares</h2>
              <Link to="/moldes">
                <Button variant="ghost" size="sm" className="text-primary text-xs">
                  Ver todos <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {popularMolds.map((mold) => (
                <div key={mold.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{mold.emoji}</span>
                    <p className="font-medium text-sm text-foreground">{mold.name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{mold.uses} usos</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trending Themes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Temas em Alta
          </h2>
          <Link to="/temas">
            <Button variant="ghost" size="sm" className="text-primary text-xs">
              Ver todos <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {trendingThemes.map((theme) => (
            <Card key={theme.name} className="group cursor-pointer border-border/50 hover:shadow-soft transition-all hover:-translate-y-0.5 overflow-hidden">
              <CardContent className="p-0">
                <div className={`h-24 ${theme.color} flex items-center justify-center`}>
                  <span className="text-3xl">🎉</span>
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm text-foreground text-center">{theme.name}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
