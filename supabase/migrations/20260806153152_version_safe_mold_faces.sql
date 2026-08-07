with face_versions(name, faces_url) as (
  values
    ('Caixa Bala', 'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/faces/caixa-bala.json?v=20260805-safe-r2'),
    ('Caixa Brownie', 'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/faces/caixa-brownie.json?v=20260805-safe-r2'),
    ('Caixa Canudo', 'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/faces/caixa-canudo.json?v=20260805-safe-r2'),
    ('Caixa Com Alca', 'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/faces/caixa-com-alca.json?v=20260805-safe-r2'),
    ('Caixa Coracao', 'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/faces/caixa-coracao.json?v=20260805-safe-r2'),
    ('Caixa Cubo', 'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/faces/caixa-cubo.json?v=20260805-safe-r2'),
    ('Caixa Fina', 'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/faces/caixa-fina.json?v=20260805-safe-r2'),
    ('Caixa Mala', 'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/faces/caixa-mala.json?v=20260805-safe-r2'),
    ('Caixa Meia Bala', 'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/faces/caixa-meia-bala.json?v=20260805-safe-r2'),
    ('Caixa Milk', 'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/faces/caixa-milk.json?v=20260805-safe-r2'),
    ('Caixa Milk Vintage', 'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/faces/caixa-milk-vintage.json?v=20260805-safe-r2'),
    ('Caixa Pipoca', 'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/faces/caixa-pipoca.json?v=20260805-safe-r2'),
    ('Caixa Piramide', 'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/faces/caixa-piramide.json?v=20260805-safe-r2'),
    ('Caixa Porta Tubetes', 'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/faces/caixa-porta-tubetes.json?v=20260805-safe-r2'),
    ('Caixa Saquinho', 'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/faces/caixa-saquinho.json?v=20260805-safe-r2'),
    ('Caixa Sextava Gomos', 'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/faces/caixa-sextava-gomos.json?v=20260805-safe-r2'),
    ('Caixa Sushi', 'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/faces/caixa-sushi.json?v=20260805-safe-r2'),
    ('Cestinha', 'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/faces/cestinha.json?v=20260805-safe-r2'),
    ('China In Box', 'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/faces/china-in-box.json?v=20260805-safe-r2'),
    ('Forminhas', 'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/faces/forminhas.json?v=20260805-safe-r2'),
    ('Porta Bis Duplo', 'https://qdwhwxboocplmnmczkfj.supabase.co/storage/v1/object/public/moldes/faces/porta-bis-duplo.json?v=20260805-safe-r2')
)
update public.moldes as mold
set faces_url = face_versions.faces_url
from face_versions
where translate(lower(mold.name), 'áàâãéèêíìîóòôõúùûç', 'aaaaeeeiiioooouuuc') =
      translate(lower(face_versions.name), 'áàâãéèêíìîóòôõúùûç', 'aaaaeeeiiioooouuuc');
