# Geracao de artes: implementacao e validacao

Data: 2026-09-25. Estado: implementado e testado; deploy de producao bloqueado por acesso ao Supabase.

## Mudancas

- GPT Image 2.5 Sunburst para arte final e mockup; Flare para rascunho. Curadoria em GPT-5.4-mini. Modelos consultados na conta existente, sem criar ou expor credenciais.
- Briefing separa densidade, intensidade de cor, acabamento, publico e pedidos livres. Minimalista pode ser vibrante; elegante nao precisa ser bege. O curador usa o mesmo briefing.
- A geracao produz uma base sem nome. Nome, idade e frase sao aplicados em SVG dentro dos retangulos seguros de cada molde. Textos longos quebram em linhas ou sao recusados, nunca comprimidos horizontalmente.
- Mudancas apenas de personalizacao reutilizam a base, inclusive depois de abrir o historico. Nao ha custo de IA para renomear.
- Receita JSON, SVG e PNG ficam juntos no Storage existente. Artes antigas sem receita nao podem ter nomes removidos com seguranca: o aplicativo informa que precisam de nova base.
- Jobs sao vinculados ao usuario autenticado e ao briefing original. Falhas do provedor nao autorizam trocar tema, reduzir modelo ou entregar arte sem parecer.
- Mockup continua opcional, segue o publico escolhido, usa a arte personalizada final e pede mesa, bolo, baloes, lembrancinhas e laco fisico. Story passa a 9:16.

## Evidencia consultada

Foto 01 do kit Frozen da Alice: https://drive.google.com/file/d/1YPiA1aqvf9NtlmIN5Pn0KLlYa7uSO5_z/view

Observado diretamente: papeis coordenados, azul/rosa/lilas, personagens grandes, contorno de aplique e lacos fisicos no produto montado. A foto nao constitui gabarito de recorte nem prova de ranking de vendas. Tambem foram consultados os componentes Frozen e Safari no catalogo do projeto.

Os inventarios e numeros de pesquisas historicas existentes no repositorio nao foram revalidados integralmente nesta entrega. Nao houve auditoria visual de todos os temas ou de todas as artes do Drive. O curador recebe componentes reais do tema; isso nao equivale a comparar automaticamente com todos os produtos finais da Alice.

Documentacao oficial: https://developers.openai.com/api/docs/guides/image-generation e https://developers.openai.com/api/docs/guides/tools-image-generation.

## Verificacoes

- Testes unitarios: briefing, modelos, proporcao, contexto de job, areas seguras de todos os 21 mapas versionados, quebra de nomes e SVG.
- TypeScript, Deno check e build do gerador.
- Navegador: 1440x1000 e 390x844, sem overflow horizontal ou erros JavaScript. Geracao inicial simulada + troca de nome + reutilizacao pelo historico: apenas UMA chamada de geracao por viewport. Mockup nao acionado automaticamente.
- Os testes de navegador interceptam autenticacao, geracao e escritas: nao alteram dados de producao. Capturas com gabarito branco sao fixtures de regressao, nao amostras de qualidade artistica.

## Geracao real e bloqueio de publicacao

As chamadas reais utilizaram a chave existente e o GPT Image 2.5 Sunburst:

1. Frozen: resposta sem imagem e mensagem de recusa dos personagens.
2. Frozen com autorizacao do acervo explicitada: erro interno do provedor.
3. Safari: imagem gerada com cenario e personagens grandes, mas o curador atribuiu 74/100 e REPROVOU por personagens invadindo as zonas reservadas para o nome.

A amostra Safari nao esta aprovada para venda ou impressao personalizada. O bloqueio evita colocar placas sobre personagens, mas ainda falta obter e inspecionar amostras aprovadas com o novo processo. Nao se pode afirmar que a qualidade de todos os temas esta acima da Alice.

Arte e parecer locais: output/art-upgrade/safari-decorado-base.png e output/art-upgrade/safari-decorado-review.json. Capturas e relatorio do navegador na mesma pasta (ignorada pelo Git).

## Liberacao

Nao fazer deploy somente do frontend: ele exige o contrato artLayout da nova gerar-arte. A publicacao precisa incluir gerar-arte, gerar-mockup e seus modulos compartilhados, seguida pelo frontend.

Validacao visual ainda pendente: obter amostras aprovadas de estilos minimalista e exuberante, conferir nomes curtos/longos nas faces reais, testar importacao no editor de destino e impressao fisica, e validar o acesso autenticado no ambiente de homologacao. A compatibilidade estrutural do SVG nao substitui teste de importacao com fontes no computador de destino.

## Tentativa de deploy em 2026-09-25

- O usuario solicitou a publicacao no site oficial depois do aviso sobre a amostra reprovada. O bloqueio de curadoria permanece ativo.
- GitHub autenticado e repositorio acessivel. A main remota estava em fd572f7d3e59de09252a3d3f5e0386bfc4558968.
- Supabase CLI retornou HTTP 403 ao listar as funcoes do projeto qdwhwxboocplmnmczkfj. Tanto o CLI quanto o plugin listam somente o projeto luana-belo-webinario, que nao e o destino deste deploy.
- Nao houve publicacao parcial do frontend nem alteracao do site em producao. O workflow da main publica apenas a interface; as funcoes devem ser publicadas primeiro com a conta autorizada.
- Os 112 testes passaram novamente. A versao fica preparada na branch release/art-generation-2-5 para concluir a publicacao apos restaurar o acesso ao projeto correto.

## Comandos

Teste local sem consumo de imagem: npm test; npx tsc -b; deno check supabase/functions/gerar-arte/index.ts supabase/functions/gerar-mockup/index.ts.

Teste real pago, somente sob demanda: deno run --env-file=.env --env-file=.env.local --allow-env --allow-net --allow-read --allow-write=output/art-upgrade tools/qa/art-generation-smoke.ts --generate decorado --safari.

Teste de interface (servidor local na porta 5187): node --env-file=.env tools/qa/art-flow-browser.mjs.
