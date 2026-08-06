import { ALICE_QUALITY_STANDARD } from "../../supabase/functions/_shared/alice-quality-standard";

export const KIT_QUALITY_GATE_VERSION = "kit-svg-r2";

export interface KitQualityIssue {
  code: string;
  message: string;
  critical: boolean;
}

export interface KitQualityMetrics {
  printableFaces: number;
  activeFaces: number;
  heroInstances: number;
  supportingCharacterInstances: number;
  uniqueHeroes: number;
  namePlates: number;
  minimumHeroHeightRatio: number;
  maximumHeroHeightRatio: number;
  minimumHeroScaleRatio: number;
  maximumHeroScaleRatio: number;
  minimumHeroVisibleAreaRatio: number;
  maximumHeroVisibleAreaRatio: number;
  minimumFaceActiveEvidenceRatio: number;
  averageFaceActiveEvidenceRatio: number;
  thematicDetailFaces: number;
  visualLayers: number;
  paletteColorCount: number;
}

export interface KitQualityReport {
  approved: boolean;
  score: number;
  version: string;
  issues: KitQualityIssue[];
  metrics: KitQualityMetrics;
}

export interface KitQualityContext {
  expectedName: string;
  expectedAge?: string;
  moldName: string;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const emptyMetrics = (): KitQualityMetrics => ({
  printableFaces: 0,
  activeFaces: 0,
  heroInstances: 0,
  supportingCharacterInstances: 0,
  uniqueHeroes: 0,
  namePlates: 0,
  minimumHeroHeightRatio: 0,
  maximumHeroHeightRatio: 0,
  minimumHeroScaleRatio: 0,
  maximumHeroScaleRatio: 0,
  minimumHeroVisibleAreaRatio: 0,
  maximumHeroVisibleAreaRatio: 0,
  minimumFaceActiveEvidenceRatio: 0,
  averageFaceActiveEvidenceRatio: 0,
  thematicDetailFaces: 0,
  visualLayers: 0,
  paletteColorCount: 0,
});

const numberAttribute = (element: Element, name: string) => {
  const value = Number(element.getAttribute(name));
  return Number.isFinite(value) ? value : Number.NaN;
};

const elementBox = (
  element: Element,
  names: { x: string; y: string; width: string; height: string } = {
    x: "x",
    y: "y",
    width: "width",
    height: "height",
  },
): Box | null => {
  const box = {
    x: numberAttribute(element, names.x),
    y: numberAttribute(element, names.y),
    width: numberAttribute(element, names.width),
    height: numberAttribute(element, names.height),
  };
  return Object.values(box).every(Number.isFinite) && box.width > 0 && box.height > 0 ? box : null;
};

const faceBox = (element: Element) => elementBox(element, {
  x: "data-face-x",
  y: "data-face-y",
  width: "data-face-w",
  height: "data-face-h",
});

const zoneBox = (element: Element) => elementBox(element, {
  x: "data-zone-x",
  y: "data-zone-y",
  width: "data-zone-w",
  height: "data-zone-h",
});

const intersectionArea = (a: Box, b: Box) => {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return width * height;
};

const hrefOf = (element: Element) =>
  element.getAttribute("href")
  ?? element.getAttributeNS("http://www.w3.org/1999/xlink", "href")
  ?? "";

const metadataValue = (document: Document, id: string) =>
  document.querySelector(`metadata#${id}`)?.textContent?.trim() ?? "";

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const relativeLuminance = (hex: string) => {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  const channel = (offset: number) => {
    const srgb = Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
};

const contrastAgainstWhite = (hex: string) => {
  const luminance = relativeLuminance(hex);
  return luminance === null ? 0 : 1.05 / (luminance + 0.05);
};

const opacityOf = (element: Element, attribute: "opacity" | "fill-opacity" | "stroke-opacity") => {
  const raw = element.getAttribute(attribute);
  if (raw === null || raw === "") return 1;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
};

const hasVisiblePaint = (element: Element) => {
  const opacity = opacityOf(element, "opacity");
  const fill = element.getAttribute("fill");
  const stroke = element.getAttribute("stroke");
  const visibleFill = fill !== "none" && fill !== "transparent" && opacityOf(element, "fill-opacity") >= 0.10;
  const visibleStroke = Boolean(stroke && stroke !== "none" && stroke !== "transparent")
    && opacityOf(element, "stroke-opacity") >= 0.16;
  return opacity >= 0.10 && (visibleFill || visibleStroke);
};

const paintedShapeCount = (element: Element) => Array.from(
  element.querySelectorAll("rect,path,circle,ellipse,polygon,polyline,line"),
).filter(hasVisiblePaint).length;

export function validateComposedKitSvg(svg: string, context: KitQualityContext): KitQualityReport {
  const issues: KitQualityIssue[] = [];
  const metrics = emptyMetrics();
  let score = 0;
  const check = (
    code: string,
    message: string,
    weight: number,
    passed: boolean,
    critical = false,
  ) => {
    if (passed) score += weight;
    else issues.push({ code, message, critical });
  };

  let document: Document;
  try {
    document = new DOMParser().parseFromString(svg, "image/svg+xml");
  } catch {
    issues.push({ code: "svg_parse", message: "O SVG nao pode ser interpretado.", critical: true });
    return { approved: false, score: 0, version: KIT_QUALITY_GATE_VERSION, issues, metrics };
  }

  const root = document.documentElement;
  const parseOk = root.localName === "svg" && !document.querySelector("parsererror");
  if (!parseOk) {
    issues.push({ code: "svg_parse", message: "O arquivo nao e um SVG XML valido.", critical: true });
    return { approved: false, score: 0, version: KIT_QUALITY_GATE_VERSION, issues, metrics };
  }

  const technicalGroups = document.querySelectorAll("#molde-tecnico");
  const technicalOk = technicalGroups.length === 1
    && technicalGroups[0].children.length > 0
    && metadataValue(document, "technical-mold-instance-count") === "1"
    && Boolean(document.querySelector("mask#interior"))
    && Boolean(document.querySelector("clipPath#paperShape"))
    && !document.querySelector("script,foreignObject,html,iframe");
  check(
    "technical_structure",
    "O molde tecnico, a mascara ou o contorno vetorial nao estao preservados em uma unica instancia.",
    18,
    technicalOk,
    true,
  );
  const isPyramid = normalize(context.moldName).includes("piramide");
  const orientationMetadataCount = Number(metadataValue(document, "face-orientation-metadata-count")) || 0;
  check(
    "oriented_face_geometry",
    "As faces triangulares nao possuem orientacao de montagem e zona segura suficientes.",
    0,
    !isPyramid || (
      metadataValue(document, "safe-face-geometry") === "detected"
      && orientationMetadataCount >= 4
    ),
    true,
  );
  check(
    "safe_face_detection",
    "As zonas seguras das faces nao foram detectadas a partir dos cortes e vincos do molde.",
    0,
    metadataValue(document, "safe-face-geometry") === "detected",
    true,
  );

  const images = Array.from(document.querySelectorAll("image"));
  const embeddedAssetsOk = images.length > 0 && images.every((image) => /^data:image\//i.test(hrefOf(image)));
  check(
    "embedded_assets",
    "O SVG contem imagem ausente ou referencia externa que pode quebrar na importacao.",
    10,
    embeddedAssetsOk,
    true,
  );

  metrics.printableFaces = Number(metadataValue(document, "printable-face-count")) || 0;
  const plates = Array.from(document.querySelectorAll('[data-name-plate="true"]'));
  metrics.namePlates = plates.length;
  const milk = normalize(context.moldName).includes("caixa milk") && metrics.printableFaces >= 4;
  const expectedPlateCount = milk ? 2 : 1;
  const expectedName = context.expectedName.trim();
  const expectedAge = context.expectedAge?.trim() ?? "";
  const plateTextOk = plates.every((plate) => {
    const texts = Array.from(plate.querySelectorAll("text"));
    const nameOk = texts.some((text) => text.textContent?.trim() === expectedName);
    const ageOk = !expectedAge || texts.some((text) => text.textContent?.trim().startsWith(expectedAge));
    const nameText = texts.find((text) => text.textContent?.trim() === expectedName);
    const contrastOk = nameText ? contrastAgainstWhite(nameText.getAttribute("fill") ?? "") >= 4.5 : false;
    return nameOk && ageOk && contrastOk && plate.querySelectorAll('[data-premium-bow="true"]').length === 1;
  });
  const personalizationOk = expectedName.length > 0
    && plates.length === expectedPlateCount
    && plateTextOk;
  check(
    "personalization",
    "Nome, idade, contraste ou acabamento da personalizacao nao passaram pela zona protegida.",
    16,
    personalizationOk,
    true,
  );

  const safe = ALICE_QUALITY_STANDARD.layout.stickerSafeInset;
  const heroes = Array.from(document.querySelectorAll('image[data-theme-hero="true"]'));
  const supportingCharacters = Array.from(document.querySelectorAll('image[data-supporting-character="true"]'));
  metrics.heroInstances = heroes.length;
  metrics.supportingCharacterInstances = supportingCharacters.length;
  const heroRatios: number[] = [];
  const heroScaleRatios: number[] = [];
  const heroVisibleAreaRatios: number[] = [];
  const heroVisibleAreaRecords: Array<{ ratio: number; primary: boolean }> = [];
  const heroGeometryOk = heroes.every((hero) => {
    const image = elementBox(hero);
    const face = faceBox(hero);
    if (!image || !face) return false;
    const visibleCoverage = numberAttribute(hero, "data-visible-coverage");
    if (!Number.isFinite(visibleCoverage) || visibleCoverage <= 0 || visibleCoverage > 1) return false;
    heroRatios.push(image.height / face.height);
    heroScaleRatios.push(Math.max(image.height / face.height, image.width / face.width));
    const visibleAreaRatio = Math.min(1, (image.width * image.height * visibleCoverage) / (face.width * face.height));
    heroVisibleAreaRatios.push(visibleAreaRatio);
    heroVisibleAreaRecords.push({
      ratio: visibleAreaRatio,
      primary: hero.closest('[data-visual-priority="primary"]') !== null,
    });
    const tolerance = Math.min(face.width, face.height) * 0.008;
    const withinSafeArea = image.x >= face.x + face.width * safe.horizontal - tolerance
      && image.y >= face.y + face.height * safe.top - tolerance
      && image.x + image.width <= face.x + face.width * (1 - safe.horizontal) + tolerance
      && image.y + image.height <= face.y + face.height * (1 - safe.bottom) + tolerance;
    const faceIndex = hero.closest('[data-face-index]')?.getAttribute("data-face-index");
    const sameFacePlate = plates.find((plate) => plate.getAttribute("data-face-index") === faceIndex);
    const plateZone = sameFacePlate ? zoneBox(sameFacePlate) : null;
    const nameOverlap = plateZone ? intersectionArea(image, plateZone) / (image.width * image.height) : 0;
    return withinSafeArea && nameOverlap <= 0.01;
  });
  const plateGeometryOk = plates.every((plate) => {
    const face = faceBox(plate);
    const zone = zoneBox(plate);
    if (!face || !zone) return false;
    const tolerance = Math.min(face.width, face.height) * 0.008;
    return zone.x >= face.x - tolerance
      && zone.y >= face.y - tolerance
      && zone.x + zone.width <= face.x + face.width + tolerance
      && zone.y + zone.height <= face.y + face.height + tolerance;
  });
  const supportingGeometryOk = supportingCharacters.every((support) => {
    const image = elementBox(support);
    const face = faceBox(support);
    const coverage = numberAttribute(support, "data-visible-coverage");
    if (!image || !face || !Number.isFinite(coverage) || coverage <= 0 || coverage > 1) return false;
    const tolerance = Math.min(face.width, face.height) * 0.008;
    const withinSafeArea = image.x >= face.x + face.width * safe.horizontal - tolerance
      && image.y >= face.y + face.height * safe.top - tolerance
      && image.x + image.width <= face.x + face.width * (1 - safe.horizontal) + tolerance
      && image.y + image.height <= face.y + face.height * (1 - safe.bottom) + tolerance;
    const faceIndex = support.getAttribute("data-face-index");
    const sameFacePlate = plates.find((plate) => plate.getAttribute("data-face-index") === faceIndex);
    const plateZone = sameFacePlate ? zoneBox(sameFacePlate) : null;
    const nameOverlap = plateZone ? intersectionArea(image, plateZone) / (image.width * image.height) : 0;
    return withinSafeArea && nameOverlap <= 0.01;
  });
  check(
    "safe_geometry",
    "Personagem, placa ou texto cruza margem segura, dobra, corte ou zona do nome.",
    16,
    heroes.length > 0 && heroGeometryOk && supportingGeometryOk && plateGeometryOk,
    true,
  );

  const detailGroups = Array.from(document.querySelectorAll('[data-theme-detail="true"]'));
  const detailIndices = new Set<number>();
  const detailStructureOk = detailGroups.every((detail) => {
    const index = Number(detail.getAttribute("data-face-index"));
    const face = faceBox(detail);
    const zone = zoneBox(detail);
    if (!Number.isInteger(index) || index < 0 || !face || !zone) return false;
    const zoneRatio = intersectionArea(face, zone) / (face.width * face.height);
    const family = detail.getAttribute("data-theme-family") ?? "";
    const visibleShapes = paintedShapeCount(detail);
    const valid = zoneRatio >= ALICE_QUALITY_STANDARD.commercialArt.minimumThematicDetailZoneRatio
      && family.length > 0
      && visibleShapes >= 5;
    if (valid) detailIndices.add(index);
    return valid;
  });
  metrics.thematicDetailFaces = detailIndices.size;

  const faceEvidence = Array.from({ length: metrics.printableFaces }, (_, faceIndex) => {
    const onFace = (element: Element) => Number(element.getAttribute("data-face-index")) === faceIndex;
    let evidence = 0;
    for (const hero of heroes.filter(onFace)) {
      const image = elementBox(hero);
      const face = faceBox(hero);
      const coverage = numberAttribute(hero, "data-visible-coverage");
      if (image && face && Number.isFinite(coverage)) {
        evidence += (image.width * image.height * coverage) / (face.width * face.height);
      }
    }
    for (const support of supportingCharacters.filter(onFace)) {
      const image = elementBox(support);
      const face = faceBox(support);
      const coverage = numberAttribute(support, "data-visible-coverage");
      if (image && face && Number.isFinite(coverage)) {
        evidence += (image.width * image.height * coverage) / (face.width * face.height);
      }
    }
    const weightedZoneEvidence = (
      selector: string,
      factor: number,
      requirePaint = false,
    ) => Array.from(document.querySelectorAll(selector))
      .filter(onFace)
      .reduce((sum, element) => {
        const face = faceBox(element);
        const zone = zoneBox(element);
        if (!face || !zone || (requirePaint && paintedShapeCount(element) < 5)) return sum;
        return sum + Math.min(1, intersectionArea(face, zone) / (face.width * face.height)) * factor;
      }, 0);
    evidence += weightedZoneEvidence('[data-name-plate="true"]', 0.58);
    evidence += weightedZoneEvidence('[data-theme-panel="true"]', 0.62);
    evidence += weightedZoneEvidence('[data-theme-monogram="true"]', 0.48);
    evidence += weightedZoneEvidence('[data-theme-ornament="true"]', 0.42);
    evidence += weightedZoneEvidence('[data-theme-foreground="true"]', 0.34);
    evidence += weightedZoneEvidence('[data-theme-detail="true"]', 0.42, true);
    return Math.min(1, evidence);
  });
  metrics.minimumFaceActiveEvidenceRatio = faceEvidence.length ? Math.min(...faceEvidence) : 0;
  metrics.averageFaceActiveEvidenceRatio = faceEvidence.length
    ? faceEvidence.reduce((sum, value) => sum + value, 0) / faceEvidence.length
    : 0;
  const activeIndices = new Set(
    faceEvidence
      .map((evidence, index) => ({ evidence, index }))
      .filter(({ evidence }) => evidence >= ALICE_QUALITY_STANDARD.commercialArt.minimumFaceActiveEvidenceRatio)
      .map(({ index }) => index),
  );
  metrics.activeFaces = activeIndices.size;
  const allFacesActive = metrics.printableFaces > 0
    && detailStructureOk
    && metrics.thematicDetailFaces === metrics.printableFaces
    && metrics.activeFaces === metrics.printableFaces
    && metrics.averageFaceActiveEvidenceRatio >= ALICE_QUALITY_STANDARD.commercialArt.averageFaceActiveEvidenceRatio;
  check(
    "visible_face_coverage",
    "Existe face imprimivel com pouca ocupacao visual ou sem detalhe tematico comprovavel.",
    10,
    allFacesActive,
    true,
  );

  const heroUrls = [...heroes, ...supportingCharacters].map(hrefOf).filter(Boolean);
  const uniqueHeroUrls = new Set(heroUrls);
  metrics.uniqueHeroes = uniqueHeroUrls.size;
  const availableHeroAssets = Math.max(0, Number(metadataValue(document, "available-hero-asset-count")) || 0);
  const desiredHeroes = metrics.printableFaces === 1 ? 1 : Math.min(2, metrics.printableFaces);
  const minimumHeroes = Math.min(desiredHeroes, availableHeroAssets);
  const heroDiversityOk = uniqueHeroUrls.size >= minimumHeroes && uniqueHeroUrls.size === heroUrls.length;
  check(
    "hero_diversity",
    "O mesmo recorte de personagem foi repetido ou faltam personagens distintos para sustentar o tema.",
    10,
    heroDiversityOk,
    true,
  );

  metrics.minimumHeroHeightRatio = heroRatios.length ? Math.min(...heroRatios) : 0;
  metrics.maximumHeroHeightRatio = heroRatios.length ? Math.max(...heroRatios) : 0;
  metrics.minimumHeroScaleRatio = heroScaleRatios.length ? Math.min(...heroScaleRatios) : 0;
  metrics.maximumHeroScaleRatio = heroScaleRatios.length ? Math.max(...heroScaleRatios) : 0;
  metrics.minimumHeroVisibleAreaRatio = heroVisibleAreaRatios.length ? Math.min(...heroVisibleAreaRatios) : 0;
  metrics.maximumHeroVisibleAreaRatio = heroVisibleAreaRatios.length ? Math.max(...heroVisibleAreaRatios) : 0;
  const plateWidthRatios = plates.map((plate) => {
    const face = faceBox(plate);
    const zone = zoneBox(plate);
    return {
      ratio: face && zone ? zone.width / face.width : 0,
      sideBySide: plate.getAttribute("data-personalization-layout") === "side-by-side",
    };
  });
  const requiredMaximumScale = metrics.printableFaces === 1 ? 0.48 : 0.72;
  const sideBySideFocalOk = metrics.printableFaces === 1
    && plateWidthRatios.some(({ sideBySide }) => sideBySide)
    && metrics.maximumHeroScaleRatio >= ALICE_QUALITY_STANDARD.commercialArt.sideBySideHeroScaleRatio
    && metrics.maximumHeroVisibleAreaRatio >= ALICE_QUALITY_STANDARD.commercialArt.sideBySideHeroVisibleAreaRatio;
  const nameFaceStoryOk = plates.every((plate) => {
    const faceIndex = plate.getAttribute("data-face-index");
    if (faceIndex === null) return false;
    return heroes.some((hero) => hero.getAttribute("data-face-index") === faceIndex)
      || Array.from(document.querySelectorAll('[data-theme-panel="true"],[data-theme-ornament="true"]'))
        .some((element) => element.getAttribute("data-face-index") === faceIndex)
      || detailGroups.some((detail) => detail.getAttribute("data-face-index") === faceIndex
        && paintedShapeCount(detail) >= 5);
  });
  const hierarchyOk = metrics.maximumHeroScaleRatio >= requiredMaximumScale
    && metrics.minimumHeroScaleRatio >= 0.46
    && heroVisibleAreaRecords.every(({ ratio, primary }) => ratio >= (primary
      ? ALICE_QUALITY_STANDARD.commercialArt.minimumHeroVisibleAreaRatio
      : ALICE_QUALITY_STANDARD.commercialArt.minimumSupportingHeroVisibleAreaRatio))
    && (metrics.maximumHeroVisibleAreaRatio >= ALICE_QUALITY_STANDARD.commercialArt.dominantHeroVisibleAreaRatio
      || (metrics.maximumHeroScaleRatio >= ALICE_QUALITY_STANDARD.commercialArt.dominantHeroFullWidthScaleRatio - 0.001
        && metrics.maximumHeroVisibleAreaRatio >= ALICE_QUALITY_STANDARD.commercialArt.dominantHeroNarrowFaceVisibleAreaRatio)
      || sideBySideFocalOk)
    && nameFaceStoryOk
    && plateWidthRatios.every(({ ratio, sideBySide }) => sideBySide
      ? ratio >= 0.379 && ratio <= 0.50
      : ratio >= 0.52 && ratio <= 0.84);
  check(
    "visual_hierarchy",
    "Personagens ou placa estao pequenos demais para leitura comercial em miniatura.",
    8,
    hierarchyOk,
    true,
  );

  const scene = document.querySelector("[data-scene-template]");
  const contactShadows = Array.from(document.querySelectorAll('[data-commercial-depth="contact-shadow"]'))
    .filter(hasVisiblePaint);
  const midgroundShapes = Array.from(document.querySelectorAll('[data-commercial-depth="midground"]'))
    .filter(hasVisiblePaint);
  const hasBackgroundLayer = Boolean(scene && paintedShapeCount(scene) >= 1);
  const hasMidgroundLayer = detailStructureOk
    && metrics.thematicDetailFaces === metrics.printableFaces
    && midgroundShapes.length >= Math.min(heroes.length, metrics.printableFaces);
  const hasForegroundLayer = heroes.length > 0 && plates.length > 0;
  metrics.visualLayers = [hasBackgroundLayer, hasMidgroundLayer, hasForegroundLayer].filter(Boolean).length;
  const depthOk = metrics.visualLayers >= ALICE_QUALITY_STANDARD.commercialArt.visualLayers.min
    && contactShadows.length === heroes.length + supportingCharacters.length;
  check(
    "depth_layering",
    "A composicao nao apresenta fundo, apoio e primeiro plano suficientes.",
    5,
    depthOk,
    true,
  );

  const appearance = metadataValue(document, "color-appearance");
  const fills = new Set(
    Array.from(document.querySelectorAll("[fill]"))
      .map((element) => element.getAttribute("fill")?.toUpperCase() ?? "")
      .filter((fill) => /^#[0-9A-F]{6}$/.test(fill) && fill !== "#FFFFFF" && fill !== "#FFFDF8" && fill !== "#111111"),
  );
  metrics.paletteColorCount = fills.size;
  const vibrantLayer = document.querySelector('[data-vibrant-color-wash="true"]');
  const elegantLayer = document.querySelector('[data-elegant-finish="true"]');
  const appearanceLayerOk = appearance === "vibrant"
    ? Boolean(vibrantLayer && paintedShapeCount(vibrantLayer) >= 4)
    : appearance === "elegant"
      ? Boolean(elegantLayer && paintedShapeCount(elegantLayer) >= 3)
      : appearance === "balanced";
  const paletteAreaFaces = new Set(
    Array.from(document.querySelectorAll('[data-theme-detail="true"]'))
      .filter((detail) => detail.querySelectorAll('[data-palette-area="true"]').length > 0)
      .map((detail) => Number(detail.getAttribute("data-face-index")))
      .filter((index) => Number.isInteger(index) && index >= 0),
  );
  const colorOk = fills.size >= 3
    && appearanceLayerOk
    && paletteAreaFaces.size === metrics.printableFaces
    && Boolean(document.querySelector("pattern#papelBody"))
    && Boolean(document.querySelector("pattern#papelTop"));
  check(
    "color_system",
    "Paleta, papeis do tema ou resposta do modo de cor estao incompletos.",
    5,
    colorOk,
    true,
  );

  const provenanceOk = metadataValue(document, "deterministic-quality-gate") === KIT_QUALITY_GATE_VERSION
    && Boolean(metadataValue(document, "alice-quality-standard"))
    && Boolean(metadataValue(document, "market-research-version"));
  check(
    "quality_provenance",
    "O SVG nao registra a versao da curadoria aplicada.",
    2,
    provenanceOk,
    true,
  );

  const criticalFailure = issues.some((issue) => issue.critical);
  return {
    approved: score >= ALICE_QUALITY_STANDARD.commercialArt.minimumApprovalScore && !criticalFailure,
    score,
    version: KIT_QUALITY_GATE_VERSION,
    issues,
    metrics,
  };
}

export class KitQualityError extends Error {
  constructor(public readonly report: KitQualityReport) {
    super(report.issues[0]?.message ?? "A arte nao passou pela curadoria obrigatoria.");
    this.name = "KitQualityError";
  }
}

export function assertComposedKitQuality(svg: string, context: KitQualityContext): KitQualityReport {
  const report = validateComposedKitSvg(svg, context);
  if (!report.approved) throw new KitQualityError(report);
  return report;
}
