import { User, Mail, Phone, MapPin, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Perfil() {
  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-6 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full gradient-hero flex items-center justify-center">
              <User className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Artesã Criativa</p>
              <p className="text-xs text-muted-foreground">Plano Grátis</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input defaultValue="Artesã Criativa" className="bg-muted/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input defaultValue="artesa@email.com" className="bg-muted/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Telefone</Label>
              <Input defaultValue="(11) 99999-0000" className="bg-muted/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Cidade</Label>
              <Input defaultValue="São Paulo, SP" className="bg-muted/50 border-border/50" />
            </div>
          </div>

          <Button className="gradient-hero border-0 text-primary-foreground">
            <Save className="h-4 w-4 mr-2" /> Salvar Alterações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
