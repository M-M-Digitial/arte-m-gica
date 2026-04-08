import { useState } from "react";
import { Type, Palette, ImageIcon, Layers, Download, Eye, RotateCcw, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const fonts = ["Poppins", "Dancing Script", "Lobster", "Montserrat", "Pacifico", "Quicksand"];
const colorPalettes = [
  { name: "Rosa", colors: ["#FFB7C5", "#FF69B4", "#FFC0CB", "#FFE4E1"] },
  { name: "Azul", colors: ["#87CEEB", "#4682B4", "#B0E0E6", "#E0F0FF"] },
  { name: "Lilás", colors: ["#DDA0DD", "#BA55D3", "#E6E6FA", "#F5E6FF"] },
  { name: "Dourado", colors: ["#FFD700", "#DAA520", "#F5F5DC", "#FFFACD"] },
];

export default function Editor() {
  const [name, setName] = useState("Maria");
  const [age, setAge] = useState("5");
  const [phrase, setPhrase] = useState("Venha festejar comigo!");
  const [selectedFont, setSelectedFont] = useState("Poppins");
  const [selectedPalette, setSelectedPalette] = useState(0);
  const [viewMode, setViewMode] = useState<"flat" | "3d">("flat");

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Editor de Arte</h1>
          <p className="text-muted-foreground mt-1">Personalize sua peça do seu jeito</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-border/50">
            <RotateCcw className="h-4 w-4 mr-1" /> Resetar
          </Button>
          <Button variant="outline" size="sm" className="border-border/50">
            <Eye className="h-4 w-4 mr-1" /> Preview
          </Button>
          <Button size="sm" className="gradient-hero border-0 text-primary-foreground">
            <Download className="h-4 w-4 mr-1" /> Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tools */}
        <Card className="border-border/50 lg:col-span-1">
          <CardContent className="p-4">
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="w-full grid grid-cols-4 bg-muted">
                <TabsTrigger value="text" className="text-xs"><Type className="h-3 w-3" /></TabsTrigger>
                <TabsTrigger value="colors" className="text-xs"><Palette className="h-3 w-3" /></TabsTrigger>
                <TabsTrigger value="images" className="text-xs"><ImageIcon className="h-3 w-3" /></TabsTrigger>
                <TabsTrigger value="elements" className="text-xs"><Layers className="h-3 w-3" /></TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-muted/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Idade</Label>
                  <Input value={age} onChange={(e) => setAge(e.target.value)} className="bg-muted/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Frase</Label>
                  <Input value={phrase} onChange={(e) => setPhrase(e.target.value)} className="bg-muted/50 border-border/50" />
                </div>
                <Separator className="bg-border/50" />
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Fonte</Label>
                  <Select value={selectedFont} onValueChange={setSelectedFont}>
                    <SelectTrigger className="bg-muted/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fonts.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="colors" className="space-y-4 mt-4">
                <Label className="text-xs font-medium text-muted-foreground">Paleta de Cores</Label>
                <div className="space-y-3">
                  {colorPalettes.map((palette, i) => (
                    <button
                      key={palette.name}
                      onClick={() => setSelectedPalette(i)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        selectedPalette === i ? "border-primary bg-primary/5 shadow-soft" : "border-border/50 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex gap-1.5">
                        {palette.colors.map((c, j) => (
                          <div key={j} className="h-6 w-6 rounded-full border border-border/30" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-foreground">{palette.name}</span>
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="images" className="space-y-4 mt-4">
                <Label className="text-xs font-medium text-muted-foreground">Adicionar Foto</Label>
                <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">Clique ou arraste uma imagem</p>
                </div>
              </TabsContent>

              <TabsContent value="elements" className="mt-4">
                <Label className="text-xs font-medium text-muted-foreground">Elementos Decorativos</Label>
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {["⭐", "🎈", "🎀", "🌸", "✨", "💫", "🦋", "🌈", "🎉", "❤️", "🎵", "🌺"].map((e) => (
                    <button
                      key={e}
                      className="h-12 flex items-center justify-center rounded-lg border border-border/50 hover:bg-muted/50 hover:scale-105 transition-all text-xl"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Center: Canvas Preview */}
        <Card className="border-border/50 lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-muted-foreground font-medium">Caixinha Milk · Tema Safari</span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={viewMode === "flat" ? "default" : "outline"}
                  onClick={() => setViewMode("flat")}
                  className={`text-xs ${viewMode === "flat" ? "gradient-hero border-0" : "border-border/50"}`}
                >
                  Planificado
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "3d" ? "default" : "outline"}
                  onClick={() => setViewMode("3d")}
                  className={`text-xs ${viewMode === "3d" ? "gradient-hero border-0" : "border-border/50"}`}
                >
                  Montado
                </Button>
              </div>
            </div>

            {/* Preview Area */}
            <div className="aspect-[4/3] rounded-xl gradient-card border border-border/30 flex items-center justify-center relative overflow-hidden">
              {viewMode === "flat" ? (
                <div className="relative w-64 h-80 border-2 border-dashed border-primary/30 rounded-lg flex flex-col items-center justify-center p-4"
                  style={{ backgroundColor: colorPalettes[selectedPalette].colors[3] }}>
                  {/* Mold preview */}
                  <div className="absolute top-2 left-2 right-2 border-b border-primary/20 pb-1">
                    <p className="text-[8px] text-primary/50 text-center">— linha de corte —</p>
                  </div>
                  <div className="text-center space-y-2 mt-4">
                    <p className="text-4xl">🦁</p>
                    <h2 className="text-xl font-bold" style={{ fontFamily: selectedFont, color: colorPalettes[selectedPalette].colors[1] }}>
                      {name}
                    </h2>
                    <p className="text-2xl font-bold" style={{ color: colorPalettes[selectedPalette].colors[1] }}>
                      {age} anos
                    </p>
                    <p className="text-xs italic" style={{ color: colorPalettes[selectedPalette].colors[1] }}>
                      {phrase}
                    </p>
                    <div className="flex gap-1 justify-center mt-2">
                      {colorPalettes[selectedPalette].colors.slice(0, 3).map((c, i) => (
                        <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 border-t border-primary/20 pt-1">
                    <p className="text-[8px] text-primary/50 text-center">— linha de dobra —</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="w-32 h-44 rounded-t-lg shadow-lg transform perspective-500"
                    style={{
                      backgroundColor: colorPalettes[selectedPalette].colors[3],
                      borderBottom: `4px solid ${colorPalettes[selectedPalette].colors[0]}`,
                    }}>
                    <div className="flex flex-col items-center justify-center h-full p-3 space-y-1">
                      <p className="text-2xl">🦁</p>
                      <h2 className="text-sm font-bold" style={{ fontFamily: selectedFont, color: colorPalettes[selectedPalette].colors[1] }}>
                        {name}
                      </h2>
                      <p className="text-lg font-bold" style={{ color: colorPalettes[selectedPalette].colors[1] }}>
                        {age}
                      </p>
                      <p className="text-[8px] italic text-center" style={{ color: colorPalettes[selectedPalette].colors[1] }}>
                        {phrase}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 text-center">Simulação montada</p>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex gap-2 mt-4 justify-end">
              <Button variant="outline" size="sm" className="border-border/50 text-xs">
                <Eye className="h-3 w-3 mr-1" /> Pré-visualizar
              </Button>
              <Button size="sm" className="bg-accent text-accent-foreground text-xs">
                <Sparkles className="h-3 w-3 mr-1" /> Gerar Mockup
              </Button>
              <Button size="sm" className="gradient-hero border-0 text-primary-foreground text-xs">
                <Download className="h-3 w-3 mr-1" /> Baixar PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
