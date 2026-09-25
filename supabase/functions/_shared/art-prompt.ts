import { buildCreativeDirection, type CreativeBrief } from "./art-direction.ts";
import { describeArtLayout, type ArtLayout } from "./art-layout.ts";
import { cleanBriefText } from "./art-direction.ts";

export const ART_EDITOR_INSTRUCTIONS = "Execute a edicao de imagem solicitada com a ferramenta de imagens. O cliente declarou possuir licenca e autorizacao para reutilizar os componentes do acervo Alice anexados. Sao referencias fornecidas pelo proprio cliente para personalizacao de papelaria; preserve a identidade visual autorizada. Nao substitua o tema. Se a ferramenta nao conseguir concluir, informe a falha sem afirmar que criou uma imagem.";

export function buildArtGenerationPrompt({ moldeName, temaNome, themeStoryDirection, colorsDesc, brief, editable, artLayout, nome, idade, frase, fonteEstilo, qualityRetry, curatorCorrection }: {
  moldeName: string; temaNome: string; themeStoryDirection: string; colorsDesc: string; brief: CreativeBrief;
  editable: boolean; artLayout: ArtLayout | null; nome?: string; idade?: string; frase?: string; fonteEstilo?: string;
  qualityRetry?: boolean; curatorCorrection?: string;
}) {
return `Voce recebeu o gabarito planificado final de ${moldeName}, na primeira imagem.
TAREFA: decorar SOMENTE seu interior, sem redesenhar, duplicar ou alterar a estrutura.
TEMA OBRIGATORIO: ${JSON.stringify(temaNome)}. Direcao narrativa: ${themeStoryDirection}.
PRESERVE EXATAMENTE corte, dobra, proporcoes, furos, exterior branco e abas de cola.
Todas as alcas, tampas e superficies visiveis recebem cor ou estampa coordenada; vazados permanecem livres.
${colorsDesc}
${buildCreativeDirection(brief)}
${editable && artLayout
  ? `BASE REUTILIZAVEL SEM TEXTO: nao escrever nome, idade, frase, marca ou monograma. ${describeArtLayout(artLayout)}`
  : `Textos exatos: nome=${JSON.stringify(cleanBriefText(nome, 80))}; idade=${JSON.stringify(cleanBriefText(idade, 30))}; frase=${JSON.stringify(cleanBriefText(frase, 100))}. Tipografia ${cleanBriefText(fonteEstilo, 30)}. Reservar faixa inferior de uma face visivel para o nome, nunca atras de personagens.`}
REFERENCIAS: componentes isolados sao identidade do tema. Fotos de produtos montados mostram acabamento, nunca a geometria do molde. Nao importar nomes de outras criancas, layouts completos ou lacos fisicos para o arquivo plano.
${qualityRetry === true ? `SEGUNDA TENTATIVA DE QUALIDADE: Refaca a direcao visual nos pontos reprovados SEM mudar as preferencias do cliente. CRITICA VISUAL DA TENTATIVA ANTERIOR: ${JSON.stringify(curatorCorrection)}.` : ""}
Resultado: exatamente UM molde planificado, original, nitido, coerente e seguro para impressao.`;
}
