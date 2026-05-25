import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
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
type ProgressState = { total: number; processed: number; success: number; failed: number };

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  json: "application/json",
  txt: "text/plain",
  csv: "text/csv",
  mp4: "video/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  zip: "application/zip",
  ttf: "font/ttf",
  otf: "font/otf",
  woff: "font/woff",
  woff2: "font/woff2",
};

const slugifySegment = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9._-]+/g, "-")
  .replace(/^-+|-+$/g, "");

const prettify = (value: string) => {
  const clean = value.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "Geral";
};

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
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("list-storage-buckets");
        if (error) throw error;
        setBuckets(data.buckets || []);
        if (data.buckets?.find((item: Bucket) => item.name === "moldes")) {
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

  const handleFile = (selectedFile: File | null) => {
    if (!selectedFile) return;
    if (!selectedFile.name.toLowerCase().endsWith(".zip")) {
      toast({ title: "Arquivo inválido", description: "Envie um .zip", variant: "destructive" });
      return;
    }
    setFile(selectedFile);
    setResults(null);
    setProgress(null);
  };

  const handleSubmit = async () => {
    if (!file || !bucket) return;

    setUploading(true);
    setResults(null);
    setProgress(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const zip = await JSZip.loadAsync(file);
      const entries = Object.values(zip.files).filter(
        (entry) => !entry.dir
          && !entry.name.startsWith("__MACOSX/")
          && !entry.name.split("/").pop()?.startsWith("."),
      );

      if (entries.length === 0) {
        throw new Error("O ZIP não contém arquivos válidos para upload.");
      }

      const nextResults: ResultItem[] = [];
      let success = 0;
      let failed = 0;
      const defaultCategory = category.trim() || "Geral";

      setProgress({ total: entries.length, processed: 0, success: 0, failed: 0 });

      for (const entry of entries) {
        const rawPath = entry.name;
        const segments = rawPath
          .split("/")
          .filter(Boolean)
          .map(slugifySegment)
          .filter(Boolean);

        if (segments.length === 0) {
          continue;
        }

        const filename = segments[segments.length - 1];
        const folderSegs = segments.slice(0, -1);
        const dotIdx = filename.lastIndexOf(".");
        const ext = dotIdx > 0 ? filename.slice(dotIdx + 1).toLowerCase() : "";
        const contentType = MIME[ext] || "application/octet-stream";
        const storagePath = [prefix.trim().replace(/^\/+|\/+$/g, ""), ...folderSegs, filename]
          .filter(Boolean)
          .join("/");

        try {
          const bytes = await entry.async("uint8array");
          const uploadFile = new File([bytes], filename, { type: contentType });
          const formData = new FormData();

          formData.append("file", uploadFile);
          formData.append("bucket", bucket);
          formData.append("prefix", prefix.trim());
          formData.append("storage_path", storagePath);
          formData.append("register_in_moldes", String(registerInMoldes));
          formData.append("default_category", defaultCategory);

          const { error: uploadError } = await supabase.functions.invoke("upload-moldes-zip", {
            body: formData,
          });

          if (uploadError) throw uploadError;

          success += 1;
          nextResults.push({ path: storagePath, status: "ok" });
        } catch (error) {
          failed += 1;
          nextResults.push({
            path: storagePath,
            status: "error",
            message: error instanceof Error ? error.message : "Erro desconhecido",
          });
        }

        setProgress({
          total: entries.length,
          processed: success + failed,
          success,
          failed,
        });
      }

      setResults(nextResults);
      toast({
        title: "Upload concluído",
        description: `${success} ok, ${failed} falhas (${entries.length} total).`,
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
              {buckets.map((item) => (
                <SelectItem key={item.id} value={item.name}>
                  {item.name} {item.public ? "🌐" : "🔒"}
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
            onCheckedChange={(checked) => setRegisterInMoldes(!!checked)}
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
              <p className="font-medium text-foreground">Arraste seu .zip aqui</p>
              <p className="text-sm text-muted-foreground">ou clique para selecionar</p>
            </div>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!file || !bucket || uploading}
          className="w-full"
          size="lg"
        >
          {uploading
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando…</>
            : "Enviar e processar"}
        </Button>

        {progress && uploading && (
          <div className="space-y-2">
            <Progress value={progress.total ? (progress.processed / progress.total) * 100 : 0} />
            <p className="text-xs text-muted-foreground text-center">
              {progress.processed} / {progress.total} arquivos
              {progress.failed > 0 && ` (${progress.failed} falhas)`}
            </p>
          </div>
        )}
      </Card>

      {results && (
        <Card className="p-6">
          <h2 className="font-semibold text-foreground mb-3">Resultados</h2>
          <ul className="space-y-2 max-h-96 overflow-auto">
            {results.map((result, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                {result.status === "ok"
                  ? <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  : <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-foreground truncate font-mono text-xs">{result.path}</p>
                  {result.message && <p className="text-muted-foreground text-xs">{result.message}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
