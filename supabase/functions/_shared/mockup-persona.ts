export type PartyAudience = "auto" | "infantil" | "teen" | "adulto";

export interface MockupPersona {
  key: Exclude<PartyAudience, "auto">;
  label: string;
  sceneDirection: string;
  forbiddenDirection: string;
  reviewRule: string;
}

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const parseAge = (value: string) => {
  const match = value.match(/\d{1,3}/);
  return match ? Number(match[0]) : null;
};

const ADULT_THEME = /boteco|cerveja|chopp|whisk|vinho|cassino|poker|churrasco|casamento|noivado|bodas|cha bar|despedida|formatura|adulto|anos 30|anos 40|anos 50|anos 60/;
const TEEN_THEME = /15 anos|debutante|balada|euphoria|tiktok|instagram|neon party|festival/;

const PERSONAS: Record<Exclude<PartyAudience, "auto">, MockupPersona> = {
  infantil: {
    key: "infantil",
    label: "festa infantil colorida",
    sceneDirection: "Crie uma festa infantil brasileira alegre, lúdica e claramente preparada para criança. Use arco de balões cheio, painel temático, bolo infantil com topper, bandejas coloridas, doces de festa e pequenos brinquedos ou elementos cenográficos do tema. Mostre pelo menos três cores coordenadas e vivas no cenário, preservando integralmente as cores da arte aplicada ao produto. A luz deve ser clara, festiva e acolhedora.",
    forbiddenDirection: "Não use estética de casamento, chá adulto ou aniversário adulto: proíba bege dominante, decoração monocromática apagada, flores secas, capim-dos-pampas, eucalipto, folhagens sóbrias, taças, velas sofisticadas, bolo de casamento, mesa rústica neutra ou cenário minimalista luxuoso.",
    reviewRule: "Reprove se a cena puder ser confundida com festa adulta, casamento, chá elegante ou editorial neutro; a leitura infantil, a variedade cromática e os elementos lúdicos precisam ser imediatos.",
  },
  teen: {
    key: "teen",
    label: "festa teen temática",
    sceneDirection: "Crie uma festa de adolescente contemporânea e temática, fotogênica e vibrante sem aparência de festa para criança pequena. Use painel gráfico, iluminação decorativa coordenada, balões modernos, bolo temático e doces bem apresentados, mantendo cores expressivas e referências visuais coerentes com o tema.",
    forbiddenDirection: "Não use personagens de bebê, brinquedos pré-escolares, decoração de casamento, flores secas dominantes, bebidas alcoólicas ou um cenário genérico de adulto.",
    reviewRule: "Reprove se a cena parecer infantil demais, adulta demais ou desconectada do tema; ela deve comunicar uma comemoração teen real.",
  },
  adulto: {
    key: "adulto",
    label: "festa adulta temática",
    sceneDirection: "Crie uma comemoração adulta temática e reconhecível, com decoração coerente com o assunto, bolo ou doces adequados e acabamento publicitário. A composição pode ser mais sóbria, mas deve continuar festiva, colorida quando o tema pedir e nunca parecer uma mesa doméstica sem decoração.",
    forbiddenDirection: "Não infantilize a cena com brinquedos de bebê ou decoração pré-escolar e não substitua a identidade temática por um editorial genérico bege.",
    reviewRule: "Reprove se a cena parecer infantil, sem tema ou excessivamente neutra; o contexto de comemoração adulta temática deve ser inequívoco.",
  },
};

export function resolveMockupPersona(
  themeName: string,
  ageRaw = "",
  audience: PartyAudience = "auto",
): MockupPersona {
  if (audience !== "auto" && PERSONAS[audience]) return PERSONAS[audience];

  const age = parseAge(ageRaw);
  if (age !== null) {
    if (age <= 12) return PERSONAS.infantil;
    if (age <= 17) return PERSONAS.teen;
    return PERSONAS.adulto;
  }

  const theme = normalize(themeName);
  if (ADULT_THEME.test(theme)) return PERSONAS.adulto;
  if (TEEN_THEME.test(theme)) return PERSONAS.teen;
  return PERSONAS.infantil;
}
