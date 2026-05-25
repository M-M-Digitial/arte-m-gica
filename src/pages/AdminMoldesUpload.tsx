import { useState, useEffect, useRef } from "react";
import { Upload, FileArchive, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

type ResultItem = { path: string; status: "ok" | "error"; message?: string };
type Bucket = { id: string; name: string; public: boolean };

export default function AdminMoldesUpload() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [bucket, setBucket] = useState<string>("");
  const [prefix, setPrefix] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [registerInMoldes, setRegisterInMoldes] = useState(true);
  const [category, setCategory] = useState("Geral");
  const [uploading, setUploading] = useState(false);
  const [loadingBuckets, setLoadingBuckets] = useState(true);
  const [results, setResults] = useState<ResultItem[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("list-storage-buckets");
        if (error) throw error;
        setBuckets(data.buckets || []);
        if (data.buckets?.find((b: Bucket) => b.name === "moldes")) {
          setBucket("moldes");
        } else if (data.buckets?.[0]) {
          setBucket(data.buckets[0].name);
        }
      } catch (err) {
        toast({
          title: "Erro ao carregar buckets",
          description: err instanceof Error ? err.message : "Verifique se você é admin.",
          variant: "destructive",
        });
      } finally {
        setLoadingBuckets(false);
      }
    })();
  }, []);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".zip")) {
      toast({ title: "Arquivo inválido", description: "Envie um .zip", variant: "destructive" });
      return;
    }
    setFile(f);
    setResults(null);
  };

  const [progress, setProgress] = useState<{ total: number; success: number; failed: number } | null>(null);

  const pollJob = async (jobId: string) => {
    while (true) {
      await new Promise((r) => setTimeout(r, 2000));
      const { data, error } = await supabase
        .from("upload_jobs")
        .select("status,total,success,failed,results,error")
        .eq("id", jobId)
        .maybeSingle();
      if (error) throw error;
      if (!data) continue;
      setProgress({ total: data.total, success: data.success, failed: data.failed });
      if (data.status === "completed") {
        setResults((data.results as ResultItem[]) || []);
        toast({
          title: "Upload concluído",
          description: `${data.success} ok, ${data.failed} falhas (${data.total} total).`,
        });
        return;
      }
      if (data.status === "failed") {
        throw new Error(data.error || "Processamento falhou");
      }
    }
  };

  const handleSubmit = async () => {
    if (!file || !bucket) return;
    setUploading(true);
    setResults(null);
    setProgress(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const form = new FormData();
      form.append("file", file);
      form.append("bucket", bucket);
      form.append("prefix", prefix);
      form.append("register_in_moldes", registerInMoldes ? "true" : "false");
      form.append("category", category);

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-moldes-zip`;
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha no upload");

      await pollJob(data.job_id);
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
        <h1 className="text-3xl font-bold text-foreground">Upload em massa via ZIP</h1>
        <p className="text-muted-foreground mt-1">
          Escolha um bucket, envie um ZIP. Pastas dentro do ZIP viram pastas dentro do bucket.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <Label>Bucket de destino</Label>
          <Select value={bucket} onValueChange={setBucket} disabled={loadingBuckets}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={loadingBuckets ? "Carregando…" : "Escolha um bucket"} />
            </SelectTrigger>
            <SelectContent>
              {buckets.map((b) => (
                <SelectItem key={b.id} value={b.name}>
                  {b.name} {b.public ? "🌐" : "🔒"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="prefix">Pasta base no bucket (opcional)</Label>
          <Input
            id="prefix"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="Ex: lote-2026/janeiro"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Todos os arquivos do ZIP serão criados dentro desta pasta, preservando a estrutura interna.
          </p>
        </div>

        <div className="flex items-start gap-2 pt-2">
          <Checkbox
            id="register"
            checked={registerInMoldes}
            onCheckedChange={(v) => setRegisterInMoldes(!!v)}
          />
          <div className="space-y-1">
            <Label htmlFor="register" className="cursor-pointer">
              Registrar também na biblioteca de moldes
            </Label>
            <p className="text-xs text-muted-foreground">
              Cria um item em <code>moldes</code> para cada imagem/PDF. A categoria vem do nome da pasta.
            </p>
          </div>
        </div>

        {registerInMoldes && (
          <div>
            <Label htmlFor="category">Categoria padrão (raiz)</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Geral"
              className="mt-1"
            />
          </div>
        )}

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
            ref={inputRef} type="file" accept=".zip" className="hidden"
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
              <p className="font-medium text-foreground">Arraste seu .zip aqui</p>
              <p className="text-sm text-muted-foreground">ou clique para selecionar</p>
            </div>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!file || !bucket || uploading}
          className="w-full" size="lg"
        >
          {uploading
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando…</>
            : "Enviar e processar"}
        </Button>

        {progress && uploading && (
          <div className="space-y-2">
            <Progress
              value={progress.total ? ((progress.success + progress.failed) / progress.total) * 100 : 5}
            />
            <p className="text-xs text-muted-foreground text-center">
              {progress.success + progress.failed} / {progress.total || "?"} arquivos
              {progress.failed > 0 && ` (${progress.failed} falhas)`}
            </p>
          </div>
        )}
      </Card>

      {results && (
        <Card className="p-6">
          <h2 className="font-semibold text-foreground mb-3">Resultados</h2>
          <ul className="space-y-2 max-h-96 overflow-auto">
            {results.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                {r.status === "ok"
                  ? <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  : <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-foreground truncate font-mono text-xs">{r.path}</p>
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
