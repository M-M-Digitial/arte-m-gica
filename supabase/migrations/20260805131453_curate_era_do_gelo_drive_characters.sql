update public.tema_assets
set meta = coalesce(meta, '{}'::jsonb) || '{"enabled":false,"curation":"superseded-by-drive-character-coverage-v1"}'::jsonb
where theme_slug = 'a-era-do-gelo'
  and kind = 'clipart'
  and meta->>'source' = 'original-imagegen';

insert into public.tema_assets (theme_slug, kind, name, url, role, meta)
values
  (
    'a-era-do-gelo', 'clipart', 'clipart-grupo-principal-drive.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/a-era-do-gelo/clipart-grupo-principal-drive.png',
    'principal',
    '{"w":760,"h":1057,"usage":"hero","enabled":true,"source":"alice-drive-studio","driveThemeFolderId":"1s_n5qFwV0N3vqCJ2R9t2zS-Ae9xgu__2","sourceFile":"Caixa Milk.studio3","sourceSha256":"12373eaae9b93633c99b70a90901b2811ba735ab47701f3a241fb4c7755002fa","curation":"drive-character-coverage-v1","copyright":"licensed-by-alice","label":"Grupo principal"}'::jsonb
  ),
  (
    'a-era-do-gelo', 'clipart', 'clipart-sid-drive.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/a-era-do-gelo/clipart-sid-drive.png',
    'amigo',
    '{"w":1800,"h":1578,"usage":"hero","enabled":true,"source":"alice-drive-studio","driveThemeFolderId":"1s_n5qFwV0N3vqCJ2R9t2zS-Ae9xgu__2","sourceFile":"Caixa Milk.studio3","sourceSha256":"45820bfe3c59f3297aab0459fc3b90e0f3105b5001a525d9bfb04a6466414a0c","curation":"drive-character-coverage-v1","copyright":"licensed-by-alice","label":"Sid"}'::jsonb
  ),
  (
    'a-era-do-gelo', 'clipart', 'clipart-manny-drive.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/a-era-do-gelo/clipart-manny-drive.png',
    'amigo2',
    '{"w":1056,"h":954,"usage":"hero","enabled":true,"source":"alice-drive-studio","driveThemeFolderId":"1s_n5qFwV0N3vqCJ2R9t2zS-Ae9xgu__2","sourceFile":"Caixa Mala.studio3","sourceSha256":"f8d609e97c8ea9370deca29a05f544bdfddac29233d069e22492ee94f1ef047c","curation":"drive-character-coverage-v1","copyright":"licensed-by-alice","label":"Manny"}'::jsonb
  ),
  (
    'a-era-do-gelo', 'clipart', 'clipart-diego-drive.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/a-era-do-gelo/clipart-diego-drive.png',
    'variacao-4',
    '{"w":1086,"h":653,"usage":"hero","enabled":true,"source":"alice-drive-studio","driveThemeFolderId":"1s_n5qFwV0N3vqCJ2R9t2zS-Ae9xgu__2","sourceFile":"Caixa Bala.studio3","sourceSha256":"e209aa62e5e2c902df85b408d3e67464b017bf448ae4cb6d4aa0a59fba1adab6","curation":"drive-character-coverage-v1","copyright":"licensed-by-alice","label":"Diego"}'::jsonb
  ),
  (
    'a-era-do-gelo', 'clipart', 'clipart-scrat-drive.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/a-era-do-gelo/clipart-scrat-drive.png',
    'variacao-5',
    '{"w":673,"h":528,"usage":"hero","enabled":true,"source":"alice-drive-studio","driveThemeFolderId":"1s_n5qFwV0N3vqCJ2R9t2zS-Ae9xgu__2","sourceFile":"Caixa Sushi.studio3","sourceSha256":"95cf84e62969a9fb7aa745512804c879191a41d4a1ef5d1e20121a3530c7381a","curation":"drive-character-coverage-v1","copyright":"licensed-by-alice","label":"Scrat"}'::jsonb
  ),
  (
    'a-era-do-gelo', 'clipart', 'clipart-shira-drive.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/a-era-do-gelo/clipart-shira-drive.png',
    'variacao-6',
    '{"w":984,"h":1314,"usage":"hero","enabled":true,"source":"alice-drive-studio","driveThemeFolderId":"1s_n5qFwV0N3vqCJ2R9t2zS-Ae9xgu__2","sourceFile":"Caixa Piramide.studio3","sourceSha256":"c8af717fc012e7d2464ddf096b8e216f33920b9344bda9d3e6efa999003188f4","curation":"drive-character-coverage-v1","copyright":"licensed-by-alice","label":"Shira"}'::jsonb
  ),
  (
    'a-era-do-gelo', 'clipart', 'clipart-esquilos-drive.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/a-era-do-gelo/clipart-esquilos-drive.png',
    'variacao-7',
    '{"w":529,"h":344,"usage":"hero","enabled":true,"source":"alice-drive-studio","driveThemeFolderId":"1s_n5qFwV0N3vqCJ2R9t2zS-Ae9xgu__2","sourceFile":"Caixa Mala.studio3","sourceSha256":"436d9ee9ab751ba7747e6c841ab86aea0b0e14722f6bb0fb8edd393c2a1b625a","curation":"drive-character-coverage-v1","copyright":"licensed-by-alice","label":"Dupla de esquilos"}'::jsonb
  ),
  (
    'a-era-do-gelo', 'clipart', 'clipart-gambazinho-drive.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/a-era-do-gelo/clipart-gambazinho-drive.png',
    'variacao-8',
    '{"w":983,"h":1800,"usage":"hero","enabled":true,"source":"alice-drive-studio","driveThemeFolderId":"1s_n5qFwV0N3vqCJ2R9t2zS-Ae9xgu__2","sourceFile":"Caixa Mala.studio3","sourceSha256":"c0336d11d232e9f590c723dc0016f12064f1faef75449ee2594849ae745c0bf6","curation":"drive-character-coverage-v1","copyright":"licensed-by-alice","label":"Gambazinho"}'::jsonb
  )
on conflict (theme_slug, kind, name) do update
set url = excluded.url,
    role = excluded.role,
    meta = excluded.meta;
