export const ALICE_QUALITY_STANDARD = {
  version: "alice-market-2026-08-05-r13",
  evidence: {
    aliceThemesReviewed: 30,
    aliceLibraryThemesMapped: 100,
    aliceStudioSourcesMapped: 490,
    marketReferencesReviewed: 16,
    marketChannels: ["Pinterest", "Shopee", "Mercado Livre", "Elo7"],
    researchBasis: [
      "inventario Drive Alice",
      "fotos e PDFs finais Alice",
      "anuncios brasileiros de kits personalizados",
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
    "contorno, linha de corte ou linha de dobra alterados",
    "alca, tampa ou face visivel sem cor, wash, textura ou outro tratamento intencional",
    "furo ou recorte vazado coberto pela arte",
    "nome incorreto, ilegivel ou fora da area segura",
    "personagem, monograma ou ornamento sobrepondo a personalizacao",
    "laco cobrindo nome, idade, personagem, recorte ou linha tecnica",
    "personagem ou texto em aba de cola escondida",
    "arte fora do contorno do molde",
    "personagem principal cortado ou sem margem de seguranca",
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
    ? "REGRA CAIXA MILK: coloque nome e idade em duas faces laterais alternadas, na parte inferior da area visivel do corpo. Use placa de 54-72% da largura da face e fonte delicada e menor. Personagem ou elemento tematico pode ocupar a parte superior, sem atravessar nem ficar atras do texto. Nunca posicione a personalizacao nas abas superiores, telhado, fundo, cola ou area escondida depois da montagem."
    : "REGRA GLOBAL DE PERSONALIZACAO: reserve a faixa inferior de uma face visivel sem personagem atras ou atravessando o texto; arte menor pode ocupar a parte superior. Use 68-82% da largura da face (alvo 76%) e tipografia proporcional. Em fundo calmo, prefira lettering com halo; em fundo movimentado, use placa solida simples ou a placa propria do tema.";

  return `PADRAO ALICE + MERCADO (obrigatorio):
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
- FACE DO NOME TAMBEM E ARTE: mantenha personagem ou cena com 68-84% da altura util atras/acima da placa. A placa entra como primeiro plano no terco inferior; nunca substitua toda a composicao por uma flor pequena, monograma ou espaco vazio.
- PALETA ARQUITETADA: use 3-5 cores com funcoes claras. Dominante 50-65%, apoio 22-35% e acento 8-15%, mais neutro quando necessario. O acento deve conduzir olhos ao foco e ao nome, nao disputar com eles. Evite mistura suja, excesso de arco-iris e monocromia acidental.
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
- Estrutura tecnica (${weights.technicalStructure}): contorno, corte, dobra, sangria, abas de cola, furos e proporcoes intactos.
- Tratamento visivel (${weights.visibleCoverage}): todas as faces, tampas e alcas expostas recebem cor, wash, textura ou arte intencional; exterior, furos e cola escondida ficam preservados. Fundo claro tratado nao e falha.
- Hierarquia focal (${weights.focalHierarchy}): tema, heroi e personalizacao sao reconhecidos em ate 2 segundos na miniatura; existe um foco dominante e variacao clara de escala.
- Sistema de cor (${weights.colorSystem}): 3-5 cores harmonicas com dominante, apoio, acento e neutro; contraste de leitura forte e ausencia de mistura suja ou arco-iris sem funcao.
- Profundidade e camadas (${weights.depthLayering}): fundo, meio e frente perceptiveis, com sobreposicao, ancoragem, sombra de contato e continuidade entre faces; nao parece uma colecao plana de PNGs soltos.
- Narrativa do tema (${weights.themeStorytelling}): personagens, cenario, papeis, icones e acabamento contam a mesma historia e cada face tem papel coordenado.
- Personalizacao (${weights.personalization}): nome exato, legivel e proporcional, area reservada sem personagem, largura de 68-82% da face, idade com 35-45% do nome e contraste alto. Na Milk, duas faces laterais inferiores usam 54-72%.
- Impacto comercial (${weights.commercialImpact}): a arte chama atencao em miniatura, parece produto premium pronto para venda e oferece detalhes que recompensam a aproximacao sem ficar caotica.
- Originalidade (${weights.originality}): a referencia orienta estilo e qualidade, mas o resultado muda pelo menos tres decisoes estruturais e nao repete fundo, bordas, ordem das faces ou enquadramento de um kit pronto.
- Acabamento para impressao (${weights.printFinish}): nitidez, ausencia de artefatos/texto indevido, recortes seguros, linhas tecnicas limpas e lacinho grafico vetorial bem integrado a cada placa de nome, sem colisao.
- Variedade visual: personagens e poses distintos sao usados antes de qualquer repeticao. Repetir ou apenas espelhar o mesmo recorte em faces diferentes reduz a nota; havendo poucos assets, prefira um elemento tematico coordenado. Reprove face do nome vazia, personagem pequeno sobre papel repetido ou confete generico usado para simular acabamento.

PORTAS CRITICAS: ${ALICE_QUALITY_STANDARD.criticalFailures.join("; ")}.
APROVACAO: minimo ${ALICE_QUALITY_STANDARD.commercialArt.minimumApprovalScore}/100 e nenhuma porta critica. Qualquer porta critica falha impede APROVADO. Uma arte apenas correta tecnicamente, mas simples, plana ou generica, deve ser REPROVADA.`;
}
