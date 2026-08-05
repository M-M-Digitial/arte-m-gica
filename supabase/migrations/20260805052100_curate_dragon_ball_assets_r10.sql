-- A esfera e um elemento de apoio. Tratá-la como personagem fazia o compositor
-- ampliar o arquivo sobre abas e sobre a area reservada para o nome.
update public.tema_assets
set
  role = 'ornament',
  meta = coalesce(meta, '{}'::jsonb) ||
    '{"usage":"ornament","enabled":true,"curation":"alice-market-r10"}'::jsonb
where theme_slug = 'dragon-ball-z'
  and name = 'clipart-amigo2.png';
