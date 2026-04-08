import { useState } from "react";
import { Search, Star, Copy, Trash2, MoreHorizontal, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const projects = [
  { id: 1, name: "Kit Safari - Pedro", theme: "Safari", mold: "Caixinha Milk", date: "08/04/2026", favorite: true, client: "Carla Silva" },
  { id: 2, name: "Unicórnio - Maria", theme: "Unicórnio", mold: "Sacolinha", date: "07/04/2026", favorite: true, client: "Ana Costa" },
  { id: 3, name: "Princesas - Ana", theme: "Princesas", mold: "Topo de Bolo", date: "05/04/2026", favorite: false, client: "Julia Santos" },
  { id: 4, name: "Fazendinha - Lucas", theme: "Fazendinha", mold: "Tubete", date: "03/04/2026", favorite: false, client: "Maria Lima" },
  { id: 5, name: "Chá Revelação - Baby", theme: "Chá Revelação", mold: "Convite", date: "01/04/2026", favorite: true, client: "Paula Rocha" },
  { id: 6, name: "Páscoa - Escola", theme: "Páscoa", mold: "Caixa Acrílica", date: "28/03/2026", favorite: false, client: "Escola Flores" },
];

export default function Projetos() {
  const [search, setSearch] = useState("");

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.client.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Meus Projetos</h1>
          <p className="text-muted-foreground mt-1">{projects.length} projetos salvos</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card border-border/50"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((project) => (
          <Card key={project.id} className="border-border/50 hover:shadow-soft transition-all group">
            <CardContent className="p-0">
              <div className="h-36 gradient-card flex items-center justify-center">
                <FolderOpen className="h-10 w-10 text-primary/30" />
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">{project.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{project.client}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Copy className="h-3 w-3 mr-2" /> Duplicar</DropdownMenuItem>
                      <DropdownMenuItem><Star className="h-3 w-3 mr-2" /> Favoritar</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive"><Trash2 className="h-3 w-3 mr-2" /> Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-[10px]">{project.mold}</Badge>
                  <Badge variant="outline" className="text-[10px] border-border/50">{project.theme}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{project.date}</span>
                  {project.favorite && <Star className="h-3.5 w-3.5 text-primary fill-primary" />}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
