# Ingestão da biblioteca (moldes + temas Alice)

Ferramentas Node (rodar `npm install` nesta pasta):

- `mold2svg.mjs <pdf> <svg> [scale]` — molde PDF → SVG vetorial (potrace)
- `faces.mjs <pdf> <faces.json> [scale] [dilatacao] [mask.png]` — detecta faces + máscara de interior
- `ingest-theme.mjs <slug> <fonteFolderId> <papelFolderId>` — ingere tema do Drive (service key via stdin: `npx supabase projects api-keys --project-ref qdwhwxboocplmnmczkfj -o json | node ingest-theme.mjs ...`); depois aplicar o `updates_<slug>.sql` gerado
- `upload-assets.mjs` — sobe moldes SVG/mask/faces (mesma entrada via stdin)
- `prep-assets.mjs` / `compose-kit.mjs` — processamento e composição de referência (a versão de produção é `src/lib/compose-kit.ts`)
