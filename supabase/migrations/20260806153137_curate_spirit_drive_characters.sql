insert into public.tema_assets (theme_slug, kind, name, url, role, meta)
values
  (
    'spirit', 'clipart', 'clipart-principal.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/spirit/clipart-principal.png',
    'principal',
    '{"w":1438,"h":1438,"usage":"border","enabled":true,"source":"alice-drive-studio","driveThemeFolderId":"1jCDBZ8ib6F6l7KSXAfWvKc4fCRXh1r-y","curation":"alice-drive-character-coverage-v2","copyright":"licensed-by-alice","label":"Corda arqueada"}'::jsonb
  ),
  (
    'spirit', 'clipart', 'clipart-amigo.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/spirit/clipart-amigo.png',
    'amigo',
    '{"w":1438,"h":1438,"usage":"border","enabled":true,"source":"alice-drive-studio","driveThemeFolderId":"1jCDBZ8ib6F6l7KSXAfWvKc4fCRXh1r-y","curation":"alice-drive-character-coverage-v2","copyright":"licensed-by-alice","label":"Corda com lacos"}'::jsonb
  ),
  (
    'spirit', 'clipart', 'clipart-amigo2.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/spirit/clipart-amigo2.png',
    'amigo2',
    '{"w":1438,"h":1438,"usage":"border","enabled":true,"source":"alice-drive-studio","driveThemeFolderId":"1jCDBZ8ib6F6l7KSXAfWvKc4fCRXh1r-y","curation":"alice-drive-character-coverage-v2","copyright":"licensed-by-alice","label":"Corda com lacos laterais"}'::jsonb
  ),
  (
    'spirit', 'clipart', 'clipart-principal-v2.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/spirit/clipart-principal-v2.png',
    'principal',
    '{"w":461,"h":542,"usage":"hero","enabled":true,"source":"alice-drive-studio","driveThemeFolderId":"1jCDBZ8ib6F6l7KSXAfWvKc4fCRXh1r-y","sourceFile":"11c6hXyMalWfbkxyDTMSkBjLDQKGtmouo","sourceSha256":"a01b7d0145b703d1a8c1188d1a8e1b1a38c8118a2c83652322bae65a8c939ad5","curation":"alice-drive-character-coverage-v2","copyright":"licensed-by-alice","label":"Spirit e personagem principal"}'::jsonb
  ),
  (
    'spirit', 'clipart', 'clipart-amigo-v2.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/spirit/clipart-amigo-v2.png',
    'amigo',
    '{"w":544,"h":703,"usage":"hero","enabled":true,"source":"alice-drive-studio","driveThemeFolderId":"1jCDBZ8ib6F6l7KSXAfWvKc4fCRXh1r-y","sourceFile":"1kt6pONpsY7Rbljh7ASNKbqW1J7ohhQdN","sourceSha256":"e888c9c27c4f0d61a575d419236144a8df3f57ddeb1d3c90f4e5d425fbc29303","curation":"alice-drive-character-coverage-v2","copyright":"licensed-by-alice","label":"Cavalo e personagem de apoio"}'::jsonb
  ),
  (
    'spirit', 'clipart', 'clipart-amigo2-v2.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/spirit/clipart-amigo2-v2.png',
    'amigo2',
    '{"w":481,"h":745,"usage":"hero","enabled":true,"source":"alice-drive-studio","driveThemeFolderId":"1jCDBZ8ib6F6l7KSXAfWvKc4fCRXh1r-y","sourceFile":"13vCC-yGnZSAko2qpMhvzQ_2-O68fqZ0L","sourceSha256":"a5b08197737e037070d7c36e15cb4b2440b8fddb65911c436e8f44ab7fa4b47b","curation":"alice-drive-character-coverage-v2","copyright":"licensed-by-alice","label":"Cavalo e segunda personagem de apoio"}'::jsonb
  ),
  (
    'spirit', 'clipart', 'clipart-cavalo-v2.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/spirit/clipart-cavalo-v2.png',
    'variacao-4',
    '{"w":600,"h":776,"usage":"hero","enabled":true,"source":"alice-drive-studio","driveThemeFolderId":"1jCDBZ8ib6F6l7KSXAfWvKc4fCRXh1r-y","sourceFile":"1pUDlq5m61H1bj5Qkzd1ln66WVdz8xhTa","sourceSha256":"94b5a20bb2ee597faca4619b548c8058ba09905bb5ddc04b2040a05bac734a67","curation":"alice-drive-character-coverage-v2","copyright":"licensed-by-alice","label":"Cavalo isolado"}'::jsonb
  )
on conflict (theme_slug, kind, name) do update
set url = excluded.url,
    role = excluded.role,
    meta = excluded.meta;
