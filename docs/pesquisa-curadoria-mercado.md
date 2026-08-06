# Pesquisa e curadoria de mercado

## Escopo correto

A coleta de descoberta contem 236 anuncios publicos do Mercado Livre:

| Categoria | Quantidade | Uso na curadoria |
| --- | ---: | --- |
| Decoracao e kits de mesa | 117 | Contexto de mockup e apelo comercial |
| Papelaria personalizada | 56 | Benchmark direto de caixas e moldes |
| Itens mistos de festa | 45 | Contexto secundario |
| Topos de bolo | 6 | Hierarquia e recorte |
| Adesivos | 6 | Acabamento e personalizacao |
| Displays | 5 | Escala e leitura a distancia |
| Baloes | 1 | Contexto de cenario |

Fotos de mesas nao medem a densidade da superficie plana do SVG. O benchmark
direto usa somente os 56 itens de papelaria personalizada. A verificacao visual
adicional reuniu 350 resultados do Google Imagens, sendo 150 resultados da
Shopee indexados pelo Google. Esses resultados nao comprovam ranking global,
faturamento ou volume de vendas.

## Padroes aplicados

- personagem focal grande e reconhecivel em miniatura;
- personagens de apoio distintos quando os assets existem;
- nome e idade em zona protegida, sem colisao;
- fundo, plano intermediario e primeiro plano perceptiveis;
- sombra de contato e contorno de aplique;
- 3 a 5 cores com funcao clara e resposta real da paleta escolhida;
- molduras, faixas e motivos coerentes com a familia visual do tema;
- nenhuma face visivel vazia ou tratada apenas com confetes genericos;
- linhas de corte, dobra, cola, furo e orientacao preservadas;
- originalidade estrutural, sem clonar um kit de referencia.

## Fonte executavel

As regras versionadas ficam em:

- `supabase/functions/_shared/alice-quality-standard.ts`;
- `src/lib/compose-kit.ts`;
- `src/lib/kit-quality.ts`;
- `tools/ingestao/audit-compositions.mjs`.

Em 6 de agosto de 2026, a matriz de producao validou 100 temas, 21 moldes e
3 paletas: 6.300 composicoes completas, sem falhas no gate deterministico.

Essa aprovacao cobre estrutura, seguranca de impressao, densidade mensuravel,
hierarquia, cor e camadas. A avaliacao artistica final continua exigindo revisao
humana por amostragem, porque beleza e apelo comercial nao sao totalmente
deterministicos.
