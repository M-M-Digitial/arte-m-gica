export const MARKET_VISUAL_RESEARCH = {
  version: "market-multi-2026-08-05-r2",
  collectedAt: "2026-08-05",
  source: "Mercado Livre",
  query: "kit festa papelaria personalizada",
  sampleSize: 236,
  recordsWithSales: 146,
  recordsWithRating: 143,
  blockedSources: ["Shopee direta: login necessario durante a coleta anonima"],
  metricPercentiles: {
    meanSaturation: { p25: 0.175, median: 0.276, p75: 0.369 },
    vividShare: { p25: 0.075, median: 0.154, p75: 0.245 },
    colorfulness: { p25: 47.753, median: 62.74, p75: 81.31 },
    whiteShare: { p25: 0.008, median: 0.183, p75: 0.504 },
    entropy: { p25: 5.187, median: 6.736, p75: 7.378 },
    edgeDensity: { p25: 0.138, median: 0.204, p75: 0.257 },
    contrastSpread: { p25: 158.27, median: 187.86, p75: 207.742 },
  },
  basePalette: ["#EEEADB", "#BE896C", "#8C4342", "#3F373D", "#D0C5B6", "#767F72", "#A3B9AC", "#E9CBB0"],
  vividAccentPalette: ["#BC7230", "#39736F", "#E3B233", "#BA1B30", "#BD4848", "#5F2248", "#59A874", "#574B54"],
  compositionSignals: {
    visualLayers: 3,
    heroPanelCoverage: { min: 38, target: 48, max: 58 },
    paletteRecoloredAreaMin: 35,
    protectedNameZone: true,
    distinctStructuralChangesFromReference: 3,
  },
  googleImageValidation: {
    source: "Google Imagens",
    query: "kit festa personalizado caixinhas nome idade mesa infantil",
    sampleSize: 350,
    generalSampleSize: 200,
    shopeeIndexedSampleSize: 150,
    salesVerified: false,
    shopeeDirectAccess: "blocked-login-required",
    metricPercentiles: {
      meanSaturation: { p25: 0.148, median: 0.221, p75: 0.297 },
      vividShare: { p25: 0.032, median: 0.089, p75: 0.168 },
      colorfulness: { p25: 37.847, median: 50.445, p75: 65.495 },
      whiteShare: { p25: 0, median: 0.003, p75: 0.111 },
      entropy: { p25: 6.47, median: 6.986, p75: 7.4 },
      edgeDensity: { p25: 0.158, median: 0.201, p75: 0.243 },
      contrastSpread: { p25: 127.84, median: 163.01, p75: 188.305 },
    },
    indexedSignals: {
      nameOrAgeMentions: 285,
      luxuryMentions: 75,
      assembleAtHomeMentions: 56,
      boxKitMentions: 221,
    },
  },
} as const;

export const ALICE_QUALITY_STANDARD = {
  version: "alice-market-2026-08-05-r16",
  evidence: {
    aliceThemesReviewed: 30,
    aliceLibraryThemesMapped: 100,
    aliceStudioSourcesMapped: 490,
    marketReferencesReviewed:
      MARKET_VISUAL_RESEARCH.sampleSize + MARKET_VISUAL_RESEARCH.googleImageValidation.sampleSize,
    marketChannels: [MARKET_VISUAL_RESEARCH.source, MARKET_VISUAL_RESEARCH.googleImageValidation.source],
    marketResearchVersion: MARKET_VISUAL_RESEARCH.version,
    marketSourcesPending: MARKET_VISUAL_RESEARCH.blockedSources,
    researchBasis: [
      "inventario Drive Alice",
      "fotos e PDFs finais Alice",
      "anuncios brasileiros de kits personalizados",
      "Google Imagens geral e resultados da Shopee indexados sem dado de venda",
      "pesquisa de hierarquia visual, fluencia e complexidade",
    ],
  },
  layout: {
    visibleSurfaceTreatmentPct: 100,
    floorBand: { min: 20, target: 25, max: 30 },
    heroHeight: { min: 68, target: 78, max: 90 },
    modularElementHeight: { min: 62, target: 72, max: 82 },
    nameFaceElementHeight: { min: 68, target: 76, max: 84 },
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
    printableFacesOnly: true,
    protectedNameLayer: true,
    premiumBow: {
      countPerNamePlate: 1,
      widthToPlate: { min: 22, target: 28, max: 34 },
      maximumPlateOverlap: 24,
    },
  },
  commercialArt: {
    thumbnailReadSeconds: 2,
    focalPointsPerFace: { min: 1, target: 1, max: 2 },
    visualLayers: { min: 3, target: 3, max: 4 },
    paletteColors: { min: 3, target: 4, max: 5 },
    dominantColorShare: { min: 50, target: 58, max: 65 },
    supportingColorShare: { min: 22, target: 29, max: 35 },
    accentColorShare: { min: 8, target: 12, max: 15 },
    secondaryCharacterScaleToHero: { min: 0.32, target: 0.42, max: 0.58 },
    supportingMotifsPerFace: { min: 2, target: 3, max: 5 },
    activeCoverageHeroFace: { min: 58, target: 68, max: 78 },
    breathingAreaHeroFace: { min: 18, target: 25, max: 35 },
    minimumNameContrastRatio: 4.5,
    minimumApprovalScore: 86,
  },
  score: {
    technicalStructure: 20,
    visibleCoverage: 8,
    focalHierarchy: 12,
    colorSystem: 10,
    depthLayering: 10,
    themeStorytelling: 10,
    personalization: 10,
    commercialImpact: 10,
    originality: 5,
    printFinish: 5,
  },
  criticalFailures: [
    "molde, contorno, camada tecnica ou produto duplicado no mesmo arquivo",
    "contorno, linha de corte ou linha de dobra alterados",
    "alca, tampa ou face visivel sem cor, wash, textura ou outro tratamento intencional",
    "furo ou recorte vazado coberto pela arte",
    "nome incorreto, ilegivel ou fora da area segura",
    "personagem, monograma ou ornamento sobrepondo a personalizacao",
    "laco cobrindo nome, idade, personagem, recorte ou linha tecnica",
    "personagem ou texto em aba de cola escondida",
    "arte fora do contorno do molde",
    "personagem principal cortado ou sem margem de seguranca",
    "personagem repartido por um vinco, deixando perna, orelha ou outro fragmento isolado na face adjacente",
    "Caixa Milk com personalizacao na frente ou no verso, ou sem personagem principal maior na face frontal",
    "composicao plana que parece colagem aleatoria de adesivos",
    "face do nome vazia ou composta apenas por placa e ornamento pequeno",
    "sequencia esparsa de personagens isolados sem cenario, primeiro plano ou continuidade entre faces",
    "confetes genericos usados para fingir riqueza visual",
    "ausencia de ponto focal reconhecivel em dois segundos",
    "paleta suja, sem contraste ou sem cor de destaque",
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
    ? "REGRA CAIXA MILK: no molde de quatro paineis, classifique o primeiro e o quarto paineis como laterais, o segundo como frente e o terceiro como verso. Coloque nome e idade nas duas laterais externas, na parte inferior da area visivel do corpo; nunca na frente ou no verso. Use placa de 54-72% da largura da face e fonte delicada e menor. A frente recebe o personagem principal, maior e mais vistoso; laterais e verso usam coadjuvantes menores. Personagem lateral pode ocupar a parte superior, sem atravessar nem ficar atras do texto. Nunca posicione a personalizacao nas abas superiores, telhado, fundo, cola ou area escondida depois da montagem."
    : "REGRA GLOBAL DE PERSONALIZACAO: reserve a faixa inferior de uma face visivel sem personagem atras ou atravessando o texto; arte menor pode ocupar a parte superior. Use 68-82% da largura da face (alvo 76%) e tipografia proporcional. Em fundo calmo, prefira lettering com halo; em fundo movimentado, use placa solida simples ou a placa propria do tema.";

  return `PADRAO ALICE + MERCADO (obrigatorio):
- BASE VERIFICADA: ${MARKET_VISUAL_RESEARCH.sampleSize} anuncios publicos do ${MARKET_VISUAL_RESEARCH.source}, pesquisa "${MARKET_VISUAL_RESEARCH.query}", coletados em ${MARKET_VISUAL_RESEARCH.collectedAt}; ${MARKET_VISUAL_RESEARCH.googleImageValidation.sampleSize} referencias visuais adicionais do ${MARKET_VISUAL_RESEARCH.googleImageValidation.source}, sendo ${MARKET_VISUAL_RESEARCH.googleImageValidation.generalSampleSize} gerais e ${MARKET_VISUAL_RESEARCH.googleImageValidation.shopeeIndexedSampleSize} indexadas da Shopee. A busca direta da Shopee exigiu login. Nao atribua venda, ranking ou faturamento aos resultados do Google. Use somente padroes agregados, nunca a composicao de um anuncio individual.
- ${moldRule} Separe exterior, vazados, cola escondida, superficies visiveis calmas, superficies de destaque e area segura de personalizacao.
- Trate 100% das superficies visiveis com cor, wash, textura, microestampa ou ilustracao coerente. Fundo claro tratado e espaco de respiro sao acabamento valido; papel branco cru sem intencao e falha.
- Escolha UM perfil de composicao conforme a referencia e a geometria, sem misturar escalas:
  CENARIO IMERSIVO: mural continuo ou papel coordenado, faixa de chao de 20-30% (alvo 25%) e heroi de 68-90% (alvo 78%).
  APLIQUE EM CAMADAS: fundo calmo tratado, silhueta ou moldura de segundo plano, heroi com contorno de recorte e sombra de contato, mais 2-5 detalhes coordenados.
  GRAFICO MODULAR: corpo claro tratado com 35-70% de area calma (alvo 55%); fechamento/tampa com estampa mais densa; lateral, fole ou uma face de destaque com microestampa; elementos ativos com 62-82% da altura (alvo 72%).
  DELICADO PREMIUM: paleta suave, textura fina e poucos elementos, mas ainda com foco dominante, contraste de nome e acabamento em camadas; delicado nunca significa vazio.
- DIRECAO DE ARTE COMERCIAL: a arte precisa funcionar primeiro como miniatura vendavel e depois recompensar a aproximacao. Em ate 2 segundos devem ser reconhecidos o tema, o personagem/foco e a personalizacao.
- HIERARQUIA: use um unico foco dominante por face; personagem principal > nome > personagem secundario/cenario > microdetalhes. Heroi com 68-90% da altura util. Coadjuvante com 32-58% da escala do heroi. Nunca deixe todos os elementos do mesmo tamanho.
- PROFUNDIDADE EM TRES PLANOS: fundo (cor, textura ou paisagem), meio (moldura, vegetacao, arquitetura, nuvem ou elemento tematico) e frente (personagem, placa ou aplique). Use pelo menos uma sobreposicao intencional e sombra de contato suave; nao espalhe PNGs como adesivos soltos.
- CENA CONTINUA ENTRE FACES: trate a fileira principal como uma unica narrativa visual. Repita horizonte, faixa de chao, folhagem, rosas, ondas, nuvens ou arquitetura de forma coordenada nas dobras. Cada face recebe personagem ou motivo relevante, mas nao pode parecer um cartao independente colado sobre o mesmo papel.
- VINCOS SEPARAM ELEMENTOS FOCAIS: cenario e papel podem continuar pelas dobras, mas personagem, rosto, nome, placa, monograma e ornamento focal ficam integralmente dentro de uma unica face e de sua margem segura. Nunca deixe perna, orelha, cabeca ou fragmento isolado do outro lado do vinco.
- FACE DO NOME TAMBEM E ARTE: mantenha personagem ou cena com 68-84% da altura util atras/acima da placa. A placa entra como primeiro plano no terco inferior; nunca substitua toda a composicao por uma flor pequena, monograma ou espaco vazio.
- PALETA ARQUITETADA: use 3-5 cores com funcoes claras. Dominante 50-65%, apoio 22-35% e acento 8-15%, mais neutro quando necessario. O acento deve conduzir olhos ao foco e ao nome, nao disputar com eles. Evite mistura suja, excesso de arco-iris e monocromia acidental.
- MODOS DE COR: no modo VIBRANTE, a troca de paleta precisa recolorir pelo menos ${MARKET_VISUAL_RESEARCH.compositionSignals.paletteRecoloredAreaMin}% da area decorativa entre fundo, faixas, moldura e ornamentos; nao basta trocar confetes. Como referencia de vitrine com sinal comercial, a area de pixels vividos do Mercado Livre ficou entre ${(MARKET_VISUAL_RESEARCH.metricPercentiles.vividShare.p25 * 100).toFixed(1)}% e ${(MARKET_VISUAL_RESEARCH.metricPercentiles.vividShare.p75 * 100).toFixed(1)}% no intervalo interquartil. A amostra do Google inclui mais fotos e mockups e teve mediana menor (${(MARKET_VISUAL_RESEARCH.googleImageValidation.metricPercentiles.vividShare.median * 100).toFixed(1)}%); portanto saturacao isolada nunca aprova beleza. No modo ELEGANTE, reduza saturacao, mas preserve contraste, textura, tres planos e um acento focal; elegante nunca significa bege vazio.
- RITMO E COMPLEXIDADE: riqueza visual vem de variacao de escala, repeticao controlada, sobreposicao e materiais sugeridos, nao de lotacao uniforme. Na face heroica, mantenha 58-78% de cobertura ativa e 18-35% de respiro. Alterne faces densas e calmas sem deixar nenhuma face esquecida. Proibido usar tres confetes, pontos ou losangos genericos como substituto de cenario e ornamento tematico.
- ACABAMENTO PREMIUM IMPRESSO: use contorno branco de aplique, moldura dupla, recorte especial, faixa coordenada e brilho localizado apenas quando coerentes com o tema e imprimiveis. Integre exatamente um lacinho grafico refinado a cada plaquinha de personalizacao, com largura de 22-34% da placa (alvo 28%), no topo da moldura e com no maximo 24% de sobreposicao. O laco deve ter volume visual por luz e sombra, mas permanecer vetorial e nunca cobrir nome, idade, personagem, recorte ou linha tecnica. Nao simule pedraria, cetim ou acetato como se fossem fornecidos fisicamente no SVG plano.
- No perfil modular, distribua funcoes entre faces: personagem, nome/idade, titulo visual do tema quando houver e face de estampa/respiro. Nao repita o mesmo bloco em todas as faces.
- Use 2-4 papeis/cores da mesma familia e evite emendas perceptiveis nas dobras.
- Maximo de 2-3 elementos de ceu por face, apenas no terco superior; o centro precisa respirar.
- Personalizacao no terco inferior visivel: 68-82% da largura da face, alvo 76%, texto com contraste minimo equivalente a 4.5:1 e sem colisao com personagem. ${nameRule} ${ageRule}
- ${personalizationRule}
- Fechamentos, abas superiores, laterais e foles visiveis recebem estampa coordenada ou cor solida; nunca nome ou personagem em area de cola escondida. Alcas recebem continuidade visual e o vazado permanece livre.
- DENSIDADE CENARIO: 100% das faces uteis recebem heroi, personagem secundario ou elemento tematico relevante. A faixa do nome fica livre, mas pode haver arte menor acima dela. Use 58-78% de cobertura ativa por face, alvo 66%, e somente uma zona de respiro dentro da composicao; nao deixe uma segunda face inteira vazia.
- DENSIDADE MODULAR: preencha os quatro papeis visuais (personagem, nome, titulo/icone e estampa). Preserve 35-70% de area calma no corpo, mas concentre informacao suficiente na faixa inferior e nos fechamentos para a caixa nao parecer inacabada.
- VARIEDADE DE PERSONAGENS: use poses ou personagens distintos disponiveis no acervo antes de repetir qualquer recorte. Nao espelhe o mesmo arquivo para simular uma pose nova. Se o acervo nao trouxer poses suficientes, complete a face com elemento tematico, cenario ou icone coordenado em vez de duplicar o personagem.
- ORIGINALIDADE OBRIGATORIA: use o acervo Alice apenas como referencia de estilo e acabamento. Nao reutilize a arte final como fundo e nao replique a mesma sequencia de faces. Mude pelo menos tres decisoes estruturais entre fundo, ordem das faces, agrupamento/escala dos personagens, moldura do nome, cenario e padrao de acabamento.
- TESTE DE MINIATURA: antes de concluir, imagine a arte reduzida a 320 px. Se tema, foco e nome nao forem reconheciveis ou se a composicao parecer generica, refaca a hierarquia.
- Reprove internamente qualquer resultado com estrutura alterada, superficie visivel sem tratamento intencional, furo coberto, texto extra, grafia errada, personagem cortado, composicao plana, baixa nitidez ou artefatos.`;
}

const normalizeForRule = (value?: string) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function buildAliceCuratorStandard() {
  const weights = ALICE_QUALITY_STANDARD.score;
  return `RUBRICA DE CURADORIA ALICE + MERCADO:
- Evidencia de mercado: amostra versionada ${MARKET_VISUAL_RESEARCH.version}, com ${MARKET_VISUAL_RESEARCH.sampleSize} anuncios do ${MARKET_VISUAL_RESEARCH.source}; ${MARKET_VISUAL_RESEARCH.recordsWithSales} exibiam vendas e ${MARKET_VISUAL_RESEARCH.recordsWithRating} exibiam avaliacao. A validacao separada do Google tem ${MARKET_VISUAL_RESEARCH.googleImageValidation.sampleSize} imagens e nao possui dados de venda; ${MARKET_VISUAL_RESEARCH.googleImageValidation.shopeeIndexedSampleSize} delas sao resultados da Shopee apenas indexados. Use percentis como alerta, nao como autorizacao para copiar layout ou ativo.
- Estrutura tecnica (${weights.technicalStructure}): existe exatamente um molde; contorno, corte, dobra, sangria, abas de cola, furos e proporcoes ficam intactos, sem camada tecnica duplicada.
- Tratamento visivel (${weights.visibleCoverage}): todas as faces, tampas e alcas expostas recebem cor, wash, textura ou arte intencional; exterior, furos e cola escondida ficam preservados. Fundo claro tratado nao e falha.
- Hierarquia focal (${weights.focalHierarchy}): tema, heroi e personalizacao sao reconhecidos em ate 2 segundos na miniatura; existe um foco dominante e variacao clara de escala.
- Sistema de cor (${weights.colorSystem}): 3-5 cores harmonicas com dominante, apoio, acento e neutro; contraste de leitura forte e ausencia de mistura suja ou arco-iris sem funcao. Nao aprove ou reprove por saturacao isolada: fotos/mockups reduziram a mediana do Google sem eliminar densidade e acabamento.
- Resposta da paleta: no modo vibrante, fundo, faixas, placa e ornamentos devem responder a selecao e recolorir pelo menos ${MARKET_VISUAL_RESEARCH.compositionSignals.paletteRecoloredAreaMin}% da area decorativa; no elegante, mantenha profundidade e contraste mesmo com saturacao menor. Reprove troca que afete apenas detalhes pequenos.
- Profundidade e camadas (${weights.depthLayering}): fundo, meio e frente perceptiveis, com sobreposicao, ancoragem, sombra de contato e continuidade entre faces; nao parece uma colecao plana de PNGs soltos.
- Narrativa do tema (${weights.themeStorytelling}): personagens, cenario, papeis, icones e acabamento contam a mesma historia e cada face tem papel coordenado.
- Personalizacao (${weights.personalization}): nome exato, legivel e proporcional, area reservada sem personagem, largura de 68-82% da face, idade com 35-45% do nome e contraste alto. Na Milk, primeiro e quarto paineis sao laterais com nome; o segundo e a frente e recebe o personagem principal maior.
- Impacto comercial (${weights.commercialImpact}): a arte chama atencao em miniatura, parece produto premium pronto para venda e oferece detalhes que recompensam a aproximacao sem ficar caotica. O grupo heroico deve ocupar cerca de ${MARKET_VISUAL_RESEARCH.compositionSignals.heroPanelCoverage.min}-${MARKET_VISUAL_RESEARCH.compositionSignals.heroPanelCoverage.max}% do painel frontal, salvo restricao geometrica documentada.
- Originalidade (${weights.originality}): a referencia orienta estilo e qualidade, mas o resultado muda pelo menos tres decisoes estruturais e nao repete fundo, bordas, ordem das faces ou enquadramento de um kit pronto.
- Acabamento para impressao (${weights.printFinish}): nitidez, ausencia de artefatos/texto indevido, recortes seguros entre vincos, linhas tecnicas limpas e unicas, sem personagem repartido entre faces, e lacinho grafico vetorial bem integrado a cada placa de nome, sem colisao.
- Variedade visual: personagens e poses distintos sao usados antes de qualquer repeticao. Repetir ou apenas espelhar o mesmo recorte em faces diferentes reduz a nota; havendo poucos assets, prefira um elemento tematico coordenado. Reprove face do nome vazia, personagem pequeno sobre papel repetido ou confete generico usado para simular acabamento.

PORTAS CRITICAS: ${ALICE_QUALITY_STANDARD.criticalFailures.join("; ")}.
APROVACAO: minimo ${ALICE_QUALITY_STANDARD.commercialArt.minimumApprovalScore}/100 e nenhuma porta critica. Qualquer porta critica falha impede APROVADO. Uma arte apenas correta tecnicamente, mas simples, plana ou generica, deve ser REPROVADA.`;
}
