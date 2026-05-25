import { useState, useRef } from "react";
import { Upload, FileArchive, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

type ResultItem = { name: string; status: "ok" | "error"; message?: string };

export default function AdminMoldesUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("Geral");
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<ResultItem[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".zip")) {
      toast({ title: "Arquivo inválido", description: "Envie um arquivo .zip", variant: "destructive" });
      return;
    }
    setFile(f);
    setResults(null);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setResults(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const form = new FormData();
      form.append("file", file);
      form.append("category", category);

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-moldes-zip`;
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha no upload");

      setResults(data.results);
      toast({
        title: "Upload concluído",
        description: `${data.success} sucesso, ${data.failed} falhas (${data.total} total).`,
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Upload de Moldes</h1>
        <p className="text-muted-foreground mt-1">
          Envie um arquivo ZIP contendo imagens (PNG, JPG, WEBP, SVG) ou PDFs. Cada arquivo vira um molde na biblioteca.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <Label htmlFor="category">Categoria padrão</Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ex: Caixas, Embalagens, Sacolas"
            className="mt-1"
          />
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0] ?? null);
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileArchive className="h-10 w-10 text-primary" />
              <p className="font-medium text-foreground">{file.name}</p>
              <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium text-foreground">Arraste seu arquivo .zip aqui</p>
              <p className="text-sm text-muted-foreground">ou clique para selecionar</p>
            </div>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!file || uploading}
          className="w-full"
          size="lg"
        >
          {uploading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando…</>
          ) : (
            "Enviar e processar"
          )}
        </Button>
      </Card>

      {results && (
        <Card className="p-6">
          <h2 className="font-semibold text-foreground mb-3">Resultados</h2>
          <ul className="space-y-2 max-h-96 overflow-auto">
            {results.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                {r.status === "ok" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-foreground truncate">{r.name}</p>
                  {r.message && <p className="text-muted-foreground text-xs">{r.message}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
