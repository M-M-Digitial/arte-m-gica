export const ALICE_QUALITY_STANDARD = {
  version: "alice-market-2026-08-05-r9",
  evidence: {
    aliceThemesReviewed: 30,
    marketLayoutReferencesReviewed: 1,
    marketChannels: ["Pinterest", "Shopee", "Mercado Livre"],
  },
  layout: {
    visibleSurfaceTreatmentPct: 100,
    floorBand: { min: 20, target: 25, max: 30 },
    heroHeight: { min: 68, target: 78, max: 90 },
    modularElementHeight: { min: 62, target: 72, max: 82 },
    nameFaceElementHeight: { min: 48, target: 56, max: 64 },
    modularCalmArea: { min: 35, target: 55, max: 70 },
    modularLowerBand: { min: 14, target: 18, max: 22 },
    namePlateWidth: { min: 68, target: 76, max: 82 },
    milkNamePlateWidth: { min: 54, target: 64, max: 72 },
    milkPersonalizationFaces: 2,
    ageToNameFontRatio: { min: 0.35, target: 0.42, max: 0.45 },
    decoratedDensity: { min: 58, target: 66, max: 78 },
    sceneActiveFacesPct: 100,
    distinctCharacterAssetsBeforeRepeat: 4,
    skyElementsPerFace: { min: 0, target: 2, max: 3 },
    breathingZones: 1,
    stickerOutlineToFaceHeight: 0.012,
    stickerMaxWidthToFace: 0.89,
    stickerSafeInset: { horizontal: 0.055, top: 0.075, bottom: 0.065 },
    directTextHaloToFontSize: 0.08,
  },
  score: {
    technicalStructure: 25,
    visibleCoverage: 15,
    composition: 15,
    personalization: 15,
    themeConsistency: 10,
    originality: 10,
    printFinish: 10,
  },
  criticalFailures: [
    "contorno, linha de corte ou linha de dobra alterados",
    "alca, tampa ou face visivel sem cor, wash, textura ou outro tratamento intencional",
    "furo ou recorte vazado coberto pela arte",
    "nome incorreto, ilegivel ou fora da area segura",
    "personagem ou texto em aba de cola escondida",
    "arte fora do contorno do molde",
    "composicao substancialmente identica a uma arte final de referencia",
  ],
} as const;

interface PersonalizationContext {
  name?: string;
  age?: string;
  moldName?: string;
}

export function buildAliceGenerationStandard(context: PersonalizationContext = {}) {
  const nameRule = context.name
    ? `O nome deve ser exatamente "${context.name}", conferido letra por letra.`
    : "Quando houver nome, confira a grafia letra por letra.";
  const ageRule = context.age
    ? `A idade "${context.age}" deve aparecer legivel, com 35-45% do corpo do nome.`
    : "Quando houver idade, use 35-45% do corpo do nome.";
  const moldRule = context.moldName
    ? `Classifique primeiro as zonas funcionais do molde "${context.moldName}".`
    : "Classifique primeiro as zonas funcionais do molde.";
  const isMilk = normalizeForRule(context.moldName).includes("caixa milk");
  const personalizationRule = isMilk
    ? "REGRA CAIXA MILK: coloque nome e idade em duas faces laterais alternadas, na parte inferior da area visivel do corpo. Use placa de 54-72% da largura da face e fonte delicada e menor. Personagem ou elemento tematico pode ocupar a parte superior, sem atravessar nem ficar atras do texto. Nunca posicione a personalizacao nas abas superiores, telhado, fundo, cola ou area escondida depois da montagem."
    : "REGRA GLOBAL DE PERSONALIZACAO: reserve a faixa inferior de uma face visivel sem personagem atras ou atravessando o texto; arte menor pode ocupar a parte superior. Use 68-82% da largura da face (alvo 76%) e tipografia proporcional. Em fundo calmo, prefira lettering com halo; em fundo movimentado, use placa solida simples ou a placa propria do tema.";

  return `PADRAO ALICE + MERCADO (obrigatorio):
- ${moldRule} Separe exterior, vazados, cola escondida, superficies visiveis calmas, superficies de destaque e area segura de personalizacao.
- Trate 100% das superficies visiveis com cor, wash, textura, microestampa ou ilustracao coerente. Fundo claro tratado e espaco de respiro sao acabamento valido; papel branco cru sem intencao e falha.
- Escolha UM perfil de composicao conforme a referencia e a geometria, sem misturar escalas:
  CENARIO: mural continuo ou papel coordenado, faixa de chao de 20-30% (alvo 25%) e heroi de 68-90% (alvo 78%).
  MODULAR: corpo claro tratado com 35-70% de area calma (alvo 55%); fechamento/tampa com estampa mais densa; lateral, fole ou uma face de destaque com microestampa; elementos ativos com 62-82% da altura (alvo 72%).
- No perfil modular, distribua funcoes entre faces: personagem, nome/idade, titulo visual do tema quando houver e face de estampa/respiro. Nao repita o mesmo bloco em todas as faces.
- Use 2-4 papeis/cores da mesma familia e evite emendas perceptiveis nas dobras.
- Maximo de 2-3 elementos de ceu por face, apenas no terco superior; o centro precisa respirar.
- Personalizacao no terco inferior visivel: 68-82% da largura da face, alvo 76%, texto com contraste forte e sem colisao com personagem. ${nameRule} ${ageRule}
- ${personalizationRule}
- Fechamentos, abas superiores, laterais e foles visiveis recebem estampa coordenada ou cor solida; nunca nome ou personagem em area de cola escondida. Alcas recebem continuidade visual e o vazado permanece livre.
- DENSIDADE CENARIO: 100% das faces uteis recebem heroi, personagem secundario ou elemento tematico relevante. A faixa do nome fica livre, mas pode haver arte menor acima dela. Use 58-78% de cobertura ativa por face, alvo 66%, e somente uma zona de respiro dentro da composicao; nao deixe uma segunda face inteira vazia.
- DENSIDADE MODULAR: preencha os quatro papeis visuais (personagem, nome, titulo/icone e estampa). Preserve 35-70% de area calma no corpo, mas concentre informacao suficiente na faixa inferior e nos fechamentos para a caixa nao parecer inacabada.
- VARIEDADE DE PERSONAGENS: use poses ou personagens distintos disponiveis no acervo antes de repetir qualquer recorte. Nao espelhe o mesmo arquivo para simular uma pose nova. Se o acervo nao trouxer poses suficientes, complete a face com elemento tematico, cenario ou icone coordenado em vez de duplicar o personagem.
- ORIGINALIDADE OBRIGATORIA: use o acervo Alice apenas como referencia de estilo e acabamento. Nao reutilize a arte final como fundo e nao replique a mesma sequencia de faces. Mude pelo menos tres decisoes estruturais entre fundo, ordem das faces, agrupamento/escala dos personagens, moldura do nome, cenario e padrao de acabamento.
- Reprove internamente qualquer resultado com estrutura alterada, superficie visivel sem tratamento intencional, furo coberto, texto extra, grafia errada, baixa nitidez ou artefatos.`;
}

const normalizeForRule = (value?: string) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function buildAliceCuratorStandard() {
  const weights = ALICE_QUALITY_STANDARD.score;
  return `RUBRICA DE CURADORIA ALICE + MERCADO:
- Estrutura tecnica (${weights.technicalStructure}): contorno, corte, dobra, sangria, abas de cola, furos e proporcoes intactos.
- Tratamento visivel (${weights.visibleCoverage}): todas as faces, tampas e alcas expostas recebem cor, wash, textura ou arte intencional; exterior, furos e cola escondida ficam preservados. Fundo claro tratado nao e falha.
- Composicao (${weights.composition}): identifique se o perfil e CENARIO ou MODULAR. No cenario, todas as faces uteis recebem arte e a cobertura ativa fica em 58-78%, com a faixa do nome protegida. No modular, os quatro papeis visuais ficam preenchidos e a area calma e intencional, nao uma face esquecida.
- Personalizacao (${weights.personalization}): nome exato, legivel e proporcional, area reservada sem personagem, largura de 68-82% da face, idade com 35-45% do nome e contraste alto. Na Milk, duas faces laterais inferiores usam 54-72%.
- Coerencia de tema (${weights.themeConsistency}): paleta, papeis, personagens, cenario e acabamento contam a mesma historia; no perfil modular, as faces exercem papeis diferentes e coordenados.
- Variedade visual: personagens e poses distintos sao usados antes de qualquer repeticao. Repetir ou apenas espelhar o mesmo recorte em faces diferentes reduz a nota; havendo poucos assets, prefira um elemento tematico coordenado.
- Originalidade (${weights.originality}): a referencia orienta estilo e qualidade, mas o resultado muda pelo menos tres decisoes estruturais e nao repete fundo, bordas, ordem das faces ou enquadramento de um kit pronto.
- Acabamento para impressao (${weights.printFinish}): nitidez, ausencia de artefatos/texto indevido e linhas tecnicas limpas.

PORTAS CRITICAS: ${ALICE_QUALITY_STANDARD.criticalFailures.join("; ")}.
Qualquer porta critica falha impede APROVADO, mesmo com nota numerica alta.`;
}
