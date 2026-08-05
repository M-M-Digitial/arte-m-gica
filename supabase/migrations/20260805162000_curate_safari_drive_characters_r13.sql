update public.tema_assets
set meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object(
  'enabled', false,
  'curation', 'replaced-by-alice-market-r13',
  'rejectionReason', 'Arquivo antigo era painel, placa vazia ou personagem isolado fora do conjunto aquarela curado.'
)
where theme_slug = 'safari'
  and kind = 'clipart'
  and name in ('clipart-amigo.png', 'clipart-amigo2.png', 'clipart-principal.png');

insert into public.tema_assets (theme_slug, kind, name, url, role, meta)
values
  (
    'safari', 'clipart', 'safari-elefante-r13.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/safari/safari-elefante-r13.png',
    'principal',
    '{"w":1800,"h":1602,"usage":"hero","enabled":true,"source":"alice-drive-studio","driveThemeFolderId":"1bQtFZb2DbwiqCXmz22Lk5RrLr0AkwQjy","sourceFile":"elefante femea.png","sourceSha256":"926191a30ab3e052a7c352a5ad815d100ac0c1779c68c81011047f2d389f9ad1","curation":"alice-market-2026-08-05-r13","copyright":"licensed-by-alice","label":"Elefante aquarela"}'::jsonb
  ),
  (
    'safari', 'clipart', 'safari-leao-r13.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/safari/safari-leao-r13.png',
    'amigo',
    '{"w":1749,"h":1800,"usage":"hero","enabled":true,"source":"alice-drive-studio","driveThemeFolderId":"1bQtFZb2DbwiqCXmz22Lk5RrLr0AkwQjy","sourceFile":"leao deitado.png","sourceSha256":"4e7b10cf8c8604a7c6684908916f7068d7d1997f652b55feb7b4a8743d36ba7e","curation":"alice-market-2026-08-05-r13","copyright":"licensed-by-alice","label":"Leao aquarela"}'::jsonb
  ),
  (
    'safari', 'clipart', 'safari-zebra-r13.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/safari/safari-zebra-r13.png',
    'amigo2',
    '{"w":1800,"h":1577,"usage":"hero","enabled":true,"source":"alice-drive-studio","driveThemeFolderId":"1bQtFZb2DbwiqCXmz22Lk5RrLr0AkwQjy","sourceFile":"zebra.png","sourceSha256":"dd388c269c8d7904e44ea1251a70bd9f00b94b81030ae8ca7d6edb065697b107","curation":"alice-market-2026-08-05-r13","copyright":"licensed-by-alice","label":"Zebra aquarela"}'::jsonb
  ),
  (
    'safari', 'clipart', 'safari-girafa-r13.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/safari/safari-girafa-r13.png',
    'amigo3',
    '{"w":1003,"h":1800,"usage":"hero","enabled":true,"source":"alice-drive-studio","driveThemeFolderId":"1bQtFZb2DbwiqCXmz22Lk5RrLr0AkwQjy","sourceFile":"girafa.png","sourceSha256":"1f0b9a21e602364e2b5b010af56aab1ed923c1b5a967d8e5fe9fd4f33a202b5d","curation":"alice-market-2026-08-05-r13","copyright":"licensed-by-alice","label":"Girafa aquarela"}'::jsonb
  ),
  (
    'safari', 'clipart', 'safari-macaco-r13.png',
    'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/temas/safari/safari-macaco-r13.png',
    'amigo4',
    '{"w":1800,"h":1463,"usage":"hero","enabled":true,"source":"alice-drive-studio","driveThemeFolderId":"1bQtFZb2DbwiqCXmz22Lk5RrLr0AkwQjy","sourceFile":"macaquinho.png","sourceSha256":"69d40f58568fa8877edfdbfc5af0139458dbf168ba0610b0e7f29778e051cebe","curation":"alice-market-2026-08-05-r13","copyright":"licensed-by-alice","label":"Macaco aquarela"}'::jsonb
  )
on conflict (theme_slug, kind, name) do update
set url = excluded.url,
    role = excluded.role,
    meta = excluded.meta;
