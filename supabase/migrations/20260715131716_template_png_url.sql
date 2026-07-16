ALTER TABLE public.moldes ADD COLUMN IF NOT EXISTS template_png_url text;
UPDATE public.moldes
SET template_png_url = replace(replace(svg_url, '/moldes/svg/', '/moldes/templates/'), '.svg', '.png')
WHERE svg_url IS NOT NULL;;
