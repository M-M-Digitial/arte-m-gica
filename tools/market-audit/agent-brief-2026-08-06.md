# Agente de recriacao e curadoria - 06/08/2026

## Objetivo

Revisar e recriar as artes do MoldePronto por tema e por molde, usando a biblioteca licenciada da Alice como acervo de componentes e a auditoria de mercado como referencia agregada de impacto. Nao copiar arte final, sequencia de faces, fundo, enquadramento ou composicao individual do Drive ou de um vendedor.

## Entradas obrigatorias

- `output/market-audit/market-visual-analysis.json`
- `output/pdf/auditoria-visual-kits-festa-mercado-2026-08-05.pdf`
- `supabase/functions/_shared/alice-quality-standard.ts`
- `tools/ingestao/curadoria-beleza-comercial.md`
- Manifestos e assets licenciados da biblioteca Alice ja cadastrados no projeto.

## Lote

1. Priorizar temas com maior recorrencia e demanda publica na amostra.
2. Para cada tema, percorrer todos os moldes habilitados.
3. Gerar duas direcoes novas: `vibrant` e `elegant`.
4. Variar pelo menos tres decisoes estruturais em relacao a qualquer referencia: fundo, ordem das faces, escala/agrupamento, placa do nome, cenario ou acabamento.
5. Usar poses/personagens licenciados distintos antes de repetir qualquer recorte.

## Composicao obrigatoria

- Tres planos percebidos: fundo, apoio e herois.
- Grupo heroico entre 38% e 58% do painel frontal, salvo restricao geometrica documentada.
- Zona exclusiva do nome, sem personagem, dobra, recorte ou ornamento sobreposto.
- Todas as superficies visiveis tratadas, incluindo alcas e fechamentos.
- Modo vibrante: pelo menos 35% da area decorativa responde a paleta; nao vale trocar apenas confetes.
- Modo elegante: saturacao menor com contraste, textura, profundidade e acento focal; proibido bege vazio.
- Um laco refinado somente quando coerente com a persona, o tema e a geometria.

## Gates bloqueantes

- SVG puro, importavel e valido; nunca HTML renomeado.
- Um unico molde tecnico; corte, dobra, encaixe, furo e aba de cola preservados.
- Nenhum personagem ou texto cortado, repartido por vinco ou fora da area segura.
- Nome e idade exatos, legiveis e testados com valores curto e longo.
- Paleta selecionada altera massas cromaticas do SVG.
- Originalidade estrutural confirmada; semelhanca alta com uma unica referencia reprova.
- Nota Cora minima de 86/100 e todos os criterios booleanos verdadeiros.

## Verificacao por saida

1. Salvar SVG.
2. Renderizar PNG de prova em largura minima de 2526 px.
3. Validar geometria e metadados `market-research-version`, `market-reference-sample-size` e `color-appearance`.
4. Comparar modo vibrante e elegante lado a lado.
5. Rodar Cora e registrar nota, bloqueios e correcao objetiva.
6. Regerar uma vez quando reprovado; nao fazer ajuste cosmetico sobre composicao fraca.
7. Publicar apenas saidas aprovadas.

## Mockup opcional

Depois da aprovacao do SVG, oferecer mockup opcional. Para festa infantil, mostrar mesa de festa com baloes, bolo tematico, doces e tres a sete lembrancinhas. Preservar a arte original na caixa e alinhar a cena a persona infantil, delicada, adolescente ou adulta.

## Pendencia de pesquisa

A Shopee exigiu login durante a coleta de 05/08/2026. Complementar a auditoria somente em sessao autenticada, sem contornar o bloqueio e sem atribuir a Shopee dados inferidos do Mercado Livre.

## Saidas do ciclo

- Relatorio por tema e molde com aprovados, reprovados e motivos.
- Galeria comparativa vibrante/elegante.
- Lista de temas com assets insuficientes ou repetidos.
- Correcoes de codigo e testes para qualquer falha sistemica encontrada.
