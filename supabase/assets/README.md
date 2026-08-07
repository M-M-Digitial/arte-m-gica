# Assets tecnicos versionados

`mold-faces/` contem os JSONs de geometria e area segura usados pelos 21 moldes
de producao. Eles sao pequenos, nao possuem imagens licenciadas e precisam
acompanhar o codigo para que orientacao, corte e posicionamento sejam
reproduziveis.

Os mesmos arquivos sao publicados no bucket publico `moldes/faces/`. Ao mudar
um JSON:

1. gere e revise a geometria com `tools/ingestao/faces.mjs`;
2. execute a matriz de composicoes usando o diretorio local;
3. publique o JSON no Supabase Storage;
4. adicione uma migration que atualize `moldes.faces_url` com uma nova versao;
5. confirme a matriz novamente contra a URL remota.

Imagens, fontes e arquivos `.studio3` licenciados nao pertencem a esta pasta.
