DROP INDEX IF EXISTS idx_assinaturas_email;
UPDATE public.assinaturas SET email = lower(email);
ALTER TABLE public.assinaturas ADD CONSTRAINT assinaturas_email_key UNIQUE (email);;
