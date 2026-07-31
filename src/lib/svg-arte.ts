import { toast } from "sonner";

// SVG híbrido — o formato de entrega oficial do molde personalizado:
// a arte gerada entra como imagem de fundo e as linhas de corte/dobra do
// molde entram VETORIAIS por cima (escala perfeita na impressão e edição
// fácil no Canva).
export async function baixarSvgDaArte(opts: {
  imagem: string; // URL pública ou data URI da arte
  moldeSvgUrl?: string | null;
  nomeArquivo: string;
}): Promise<void> {
  try {
    let imagemUri = opts.imagem;
    if (!imagemUri.startsWith("data:")) {
      const r = await fetch(imagemUri);
      if (!r.ok) throw new Error("não consegui baixar a arte");
      const blob = await r.blob();
      imagemUri = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
    }

    let overlay = "";
    let vw = 2526;
    let vh = 1786;
    if (opts.moldeSvgUrl) {
      const moldSvg = await (await fetch(opts.moldeSvgUrl)).text();
      const vb = moldSvg.match(/viewBox="([^"]+)"/);
      if (vb) [, , vw, vh] = vb[1].split(/\s+/).map(Number) as any;
      const path = moldSvg.match(/<path[\s\S]*?\/>/i)?.[0] ?? "";
      overlay = `<g fill="#111111">${path.replace(/fill="[^"]*"/, "")}</g>`;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${vw}" height="${vh}" viewBox="0 0 ${vw} ${vh}"><image href="${imagemUri}" x="0" y="0" width="${vw}" height="${vh}" preserveAspectRatio="xMidYMid meet"/>${overlay}</svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${opts.nomeArquivo}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error("Erro ao montar o SVG.");
  }
}
