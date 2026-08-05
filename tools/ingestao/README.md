# Ingestão da biblioteca (moldes + temas Alice)

Ferramentas Node (rodar `npm install` nesta pasta):

- `mold2svg.mjs <pdf> <svg> [scale]` — molde PDF → SVG vetorial (potrace)
- `faces.mjs <pdf> <faces.json> [scale] [dilatacao] [mask.png]` — detecta faces + máscara de interior
- `ingest-theme.mjs <slug> <fonteFolderId> <papelFolderId>` — ingere tema do Drive (service key via stdin: `npx supabase projects api-keys --project-ref qdwhwxboocplmnmczkfj -o json | node ingest-theme.mjs ...`); depois aplicar o `updates_<slug>.sql` gerado
- `extract-studio-assets.mjs <arquivo-ou-pasta> <pasta-saida>` — extrai PNGs e JPEGs incorporados nos arquivos `.studio3`, remove duplicatas por SHA-256 e grava um `manifest.json` para curadoria
- `audit-drive-library.mjs <pasta-raiz-drive> [manifesto.json] [temas-extras.json]` — percorre os temas da biblioteca pública, localiza `Moldes/Studio` e registra todos os arquivos de origem para sincronização e auditoria; o terceiro argumento completa páginas adicionais do Drive
- `upload-curated-theme.mjs <curadoria.json>` — recebe a chave de serviço por `stdin`, valida SHA-256, recorta margens transparentes, limita a 1800 px e envia os personagens aprovados ao Storage com rastreabilidade do Drive
- `upload-assets.mjs` — sobe moldes SVG/mask/faces (mesma entrada via stdin)
- `prep-assets.mjs` / `compose-kit.mjs` — processamento e composição de referência (a versão de produção é `src/lib/compose-kit.ts`)
