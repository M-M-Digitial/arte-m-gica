import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

// Re-estampa as linhas escuras do template por cima da arte gerada — garantia
// determinística de que contorno, abas e linhas de dobra ficam intactos.
// Varre o TEMPLATE e projeta cada pixel de traço na arte: no sentido inverso
// (amostrar o template por pixel da arte) linhas de 1px caem entre as amostras
// no downscale e o traço sai pontilhado (~44% de cobertura). O limiar 200 pega
// também o anti-aliasing do traço, e "escurecer sem clarear" preserva a arte.
// Validado: 100% dos pixels de linha do gabarito presentes na arte final.
export async function compositeMoldLines(templateBytes: Uint8Array, generatedBytes: Uint8Array): Promise<Uint8Array> {
  const tpl = await Image.decode(templateBytes);
  const gen = await Image.decode(generatedBytes);
  const tW = tpl.width, tH = tpl.height, tData = tpl.bitmap;
  const gW = gen.width, gH = gen.height, gData = gen.bitmap;

  for (let y = 0; y < tH; y++) {
    const gy = Math.min(gH - 1, Math.round((y * gH) / tH));
    for (let x = 0; x < tW; x++) {
      const tIdx = (y * tW + x) * 4;
      const a = tData[tIdx + 3];
      if (a < 200) continue;
      const r = tData[tIdx];
      const g = tData[tIdx + 1];
      const b = tData[tIdx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > 200) continue;
      const gx = Math.min(gW - 1, Math.round((x * gW) / tW));
      const gIdx = (gy * gW + gx) * 4;
      if (0.299 * gData[gIdx] + 0.587 * gData[gIdx + 1] + 0.114 * gData[gIdx + 2] > lum) {
        gData[gIdx] = r;
        gData[gIdx + 1] = g;
        gData[gIdx + 2] = b;
        gData[gIdx + 3] = 255;
      }
    }
  }
  return await gen.encode();
}

// A4 — Máscara de edição: gera uma máscara onde SÓ as faces internas do molde
// ficam editáveis (alpha 0). As linhas escuras (corte/dobra) e o fundo externo
// ficam preservados (alpha 255), então a IA não desloca nem redesenha a estrutura.
// Retorna null quando a máscara sai degenerada (nada/tudo editável) — nesse caso
// o chamador cai no fluxo sem máscara.
export async function buildEditMask(templateBytes: Uint8Array): Promise<Uint8Array | null> {
  const tpl = await Image.decode(templateBytes);
  const W = tpl.width, H = tpl.height, data = tpl.bitmap;
  const N = W * H;
  if (N === 0) return null;

  // 1) Classifica pixels de linha (opacos e escuros).
  const isLine = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const a = data[i * 4 + 3];
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (a >= 200 && lum < 110) isLine[i] = 1;
  }

  // 2) Flood-fill a partir das bordas, atravessando pixels que NÃO são linha.
  //    Tudo alcançado = fundo externo.
  const outside = new Uint8Array(N);
  const stack = new Int32Array(N);
  let sp = 0;
  const pushIf = (idx: number) => {
    if (!outside[idx] && !isLine[idx]) {
      outside[idx] = 1;
      stack[sp++] = idx;
    }
  };
  for (let x = 0; x < W; x++) {
    pushIf(x);
    pushIf((H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    pushIf(y * W);
    pushIf(y * W + (W - 1));
  }
  while (sp > 0) {
    const idx = stack[--sp];
    const x = idx % W;
    const y = (idx / W) | 0;
    if (x > 0) pushIf(idx - 1);
    if (x < W - 1) pushIf(idx + 1);
    if (y > 0) pushIf(idx - W);
    if (y < H - 1) pushIf(idx + W);
  }

  // 3) Editável = não é linha E não é fundo externo (faces internas fechadas).
  const mask = new Image(W, H);
  let editableCount = 0;
  for (let i = 0; i < N; i++) {
    const editable = !isLine[i] && !outside[i];
    if (editable) editableCount++;
    mask.bitmap[i * 4] = 0;
    mask.bitmap[i * 4 + 1] = 0;
    mask.bitmap[i * 4 + 2] = 0;
    mask.bitmap[i * 4 + 3] = editable ? 0 : 255; // alpha 0 = editar; 255 = preservar
  }

  const frac = editableCount / N;
  if (frac < 0.04 || frac > 0.96) {
    console.warn(`buildEditMask: fração editável ${frac.toFixed(3)} degenerada — sem máscara.`);
    return null;
  }
  console.log(`buildEditMask: fração editável ${frac.toFixed(3)}.`);
  return await mask.encode();
}

// The official mold mask marks printable paper with white/alpha. Resample it
// to the exact template size and remove components nested inside another
// component (handle holes, windows and other cutouts).
export async function buildEditMaskFromInteriorMask(
  interiorMaskBytes: Uint8Array,
  templateBytes: Uint8Array,
): Promise<Uint8Array | null> {
  const interior = await Image.decode(interiorMaskBytes);
  const template = await Image.decode(templateBytes);
  const W = template.width;
  const H = template.height;
  const N = W * H;
  if (!N || !interior.width || !interior.height) return null;

  const paintable = new Uint8Array(N);
  const isLine = new Uint8Array(N);
  const templateData = template.bitmap;
  const interiorData = interior.bitmap;

  for (let y = 0; y < H; y++) {
    const my = Math.min(interior.height - 1, Math.round((y * interior.height) / H));
    for (let x = 0; x < W; x++) {
      const mx = Math.min(interior.width - 1, Math.round((x * interior.width) / W));
      const target = y * W + x;
      const maskIndex = (my * interior.width + mx) * 4;
      const maskLum = 0.299 * interiorData[maskIndex]
        + 0.587 * interiorData[maskIndex + 1]
        + 0.114 * interiorData[maskIndex + 2];
      paintable[target] = interiorData[maskIndex + 3] >= 128 && maskLum >= 180 ? 1 : 0;

      const templateIndex = target * 4;
      const alpha = templateData[templateIndex + 3];
      const lum = 0.299 * templateData[templateIndex]
        + 0.587 * templateData[templateIndex + 1]
        + 0.114 * templateData[templateIndex + 2];
      if (alpha >= 200 && lum <= 200) isLine[target] = 1;
    }
  }

  const componentId = new Int32Array(N);
  const stack = new Int32Array(N);
  const components: Array<{
    id: number;
    area: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }> = [];
  let componentCount = 0;
  let stackSize = 0;
  const visit = (idx: number, id: number) => {
    if (!paintable[idx] || isLine[idx] || componentId[idx]) return;
    componentId[idx] = id;
    stack[stackSize++] = idx;
  };

  for (let start = 0; start < N; start++) {
    if (!paintable[start] || isLine[start] || componentId[start]) continue;
    const id = ++componentCount;
    let area = 0;
    let minX = W;
    let minY = H;
    let maxX = 0;
    let maxY = 0;
    stackSize = 0;
    visit(start, id);
    while (stackSize > 0) {
      const idx = stack[--stackSize];
      const x = idx % W;
      const y = (idx / W) | 0;
      area++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0) visit(idx - 1, id);
      if (x < W - 1) visit(idx + 1, id);
      if (y > 0) visit(idx - W, id);
      if (y < H - 1) visit(idx + W, id);
    }
    components.push({ id, area, minX, minY, maxX, maxY });
  }

  const holeComponents = new Uint8Array(componentCount + 1);
  for (const inner of components) {
    if (inner.area < N * 0.002) continue;
    for (const outer of components) {
      if (inner.id === outer.id || inner.area >= outer.area * 0.9) continue;
      const nested = inner.minX > outer.minX + 2
        && inner.minY > outer.minY + 2
        && inner.maxX < outer.maxX - 2
        && inner.maxY < outer.maxY - 2;
      if (nested) {
        holeComponents[inner.id] = 1;
        break;
      }
    }
  }

  const mask = new Image(W, H);
  let editableCount = 0;
  for (let i = 0; i < N; i++) {
    const editable = Boolean(
      paintable[i] && !isLine[i] && !holeComponents[componentId[i]],
    );
    if (editable) editableCount++;
    mask.bitmap[i * 4] = 0;
    mask.bitmap[i * 4 + 1] = 0;
    mask.bitmap[i * 4 + 2] = 0;
    mask.bitmap[i * 4 + 3] = editable ? 0 : 255;
  }

  const frac = editableCount / N;
  if (frac < 0.04 || frac > 0.92) {
    console.warn(`buildEditMaskFromInteriorMask: editable fraction ${frac.toFixed(3)} is degenerate.`);
    return null;
  }
  const removed = holeComponents.reduce((total, value) => total + value, 0);
  console.log(`buildEditMaskFromInteriorMask: editable fraction ${frac.toFixed(3)}; ${removed} cutouts preserved.`);
  return await mask.encode();
}
