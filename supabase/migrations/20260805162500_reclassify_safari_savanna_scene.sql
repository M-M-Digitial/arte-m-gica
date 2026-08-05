update public.tema_assets
set role = 'cenario',
    meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object(
      'enabled', true,
      'usage', 'panel',
      'curation', 'alice-market-2026-08-05-r13',
      'qualityPurpose', 'continuous-scene-only',
      'rejectionReason', null
    )
where theme_slug = 'safari'
  and kind = 'clipart'
  and name = 'clipart-amigo.png';
