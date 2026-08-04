UPDATE public.tema_assets
SET role = 'legacy',
    meta = COALESCE(meta, '{}'::jsonb) || '{"usage":"hero","enabled":false,"curation":"alice-market-r8"}'::jsonb
WHERE theme_slug = 'a-bela-e-a-fera'
  AND kind = 'clipart'
  AND name = 'clipart-principal.png';

UPDATE public.tema_assets
SET role = 'panel',
    meta = COALESCE(meta, '{}'::jsonb) || '{"usage":"panel","enabled":false,"curation":"alice-market-r8"}'::jsonb
WHERE theme_slug = 'a-bela-e-a-fera'
  AND kind = 'clipart'
  AND name = 'clipart-amigo.png';

UPDATE public.tema_assets
SET role = 'border',
    meta = COALESCE(meta, '{}'::jsonb) || '{"usage":"border","enabled":true,"curation":"alice-market-r8"}'::jsonb
WHERE theme_slug = 'a-bela-e-a-fera'
  AND kind = 'clipart'
  AND name = 'clipart-amigo2.png';

INSERT INTO public.tema_assets (theme_slug, kind, name, url, role, meta)
VALUES
  (
    'a-bela-e-a-fera',
    'clipart',
    'casal-aquarela.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/a-bela-e-a-fera/curadoria-r8/casal-aquarela.png',
    'principal',
    '{"w":1302,"h":1302,"usage":"hero","enabled":true,"source":"alice-drive","curation":"alice-market-r8"}'::jsonb
  ),
  (
    'a-bela-e-a-fera',
    'clipart',
    'casal-danca-aquarela.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/a-bela-e-a-fera/curadoria-r8/casal-danca-aquarela.png',
    'personagem',
    '{"w":2205,"h":2205,"usage":"hero","enabled":true,"source":"alice-drive","curation":"alice-market-r8"}'::jsonb
  ),
  (
    'a-bela-e-a-fera',
    'clipart',
    'bela-aquarela.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/a-bela-e-a-fera/curadoria-r8/bela-aquarela.png',
    'personagem',
    '{"w":1384,"h":2219,"usage":"hero","enabled":true,"source":"alice-drive","curation":"alice-market-r8"}'::jsonb
  ),
  (
    'a-bela-e-a-fera',
    'clipart',
    'fera-aquarela.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/a-bela-e-a-fera/curadoria-r8/fera-aquarela.png',
    'personagem',
    '{"w":1832,"h":1832,"usage":"hero","enabled":true,"source":"alice-drive","curation":"alice-market-r8"}'::jsonb
  ),
  (
    'a-bela-e-a-fera',
    'clipart',
    'rosas-aquarela.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/a-bela-e-a-fera/curadoria-r8/rosas-aquarela.png',
    'ornament',
    '{"w":1677,"h":1605,"usage":"ornament","enabled":true,"source":"alice-drive","curation":"alice-market-r8"}'::jsonb
  )
ON CONFLICT (theme_slug, kind, name)
DO UPDATE SET
  url = EXCLUDED.url,
  role = EXCLUDED.role,
  meta = EXCLUDED.meta;
