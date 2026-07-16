DROP POLICY IF EXISTS "Admins gerenciam config" ON public.app_config;

CREATE POLICY "Admins can insert app config"
ON public.app_config FOR INSERT TO authenticated
WITH CHECK (private.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Admins can update app config"
ON public.app_config FOR UPDATE TO authenticated
USING (private.has_role((SELECT auth.uid()), 'admin'))
WITH CHECK (private.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Admins can delete app config"
ON public.app_config FOR DELETE TO authenticated
USING (private.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Admins gerenciam arquivos" ON public.modelos_prontos_arquivos;

CREATE POLICY "Admins can insert ready model files"
ON public.modelos_prontos_arquivos FOR INSERT TO authenticated
WITH CHECK (private.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Admins can update ready model files"
ON public.modelos_prontos_arquivos FOR UPDATE TO authenticated
USING (private.has_role((SELECT auth.uid()), 'admin'))
WITH CHECK (private.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Admins can delete ready model files"
ON public.modelos_prontos_arquivos FOR DELETE TO authenticated
USING (private.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Admins gerenciam temas" ON public.modelos_prontos_temas;

CREATE POLICY "Admins can insert ready model themes"
ON public.modelos_prontos_temas FOR INSERT TO authenticated
WITH CHECK (private.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Admins can update ready model themes"
ON public.modelos_prontos_temas FOR UPDATE TO authenticated
USING (private.has_role((SELECT auth.uid()), 'admin'))
WITH CHECK (private.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Admins can delete ready model themes"
ON public.modelos_prontos_temas FOR DELETE TO authenticated
USING (private.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Admins gerenciam assets" ON public.tema_assets;

CREATE POLICY "Admins can insert theme assets"
ON public.tema_assets FOR INSERT TO authenticated
WITH CHECK (private.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Admins can update theme assets"
ON public.tema_assets FOR UPDATE TO authenticated
USING (private.has_role((SELECT auth.uid()), 'admin'))
WITH CHECK (private.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Admins can delete theme assets"
ON public.tema_assets FOR DELETE TO authenticated
USING (private.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Admins gerenciam assinaturas" ON public.assinaturas;
DROP POLICY IF EXISTS "Usuario ve propria assinatura" ON public.assinaturas;

CREATE POLICY "Users or admins can view subscriptions"
ON public.assinaturas FOR SELECT TO authenticated
USING (
  lower(email) = lower(coalesce((SELECT auth.jwt())->>'email', ''))
  OR private.has_role((SELECT auth.uid()), 'admin')
);

CREATE POLICY "Admins can insert subscriptions"
ON public.assinaturas FOR INSERT TO authenticated
WITH CHECK (private.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Admins can update subscriptions"
ON public.assinaturas FOR UPDATE TO authenticated
USING (private.has_role((SELECT auth.uid()), 'admin'))
WITH CHECK (private.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Admins can delete subscriptions"
ON public.assinaturas FOR DELETE TO authenticated
USING (private.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users or admins can view roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  OR private.has_role((SELECT auth.uid()), 'admin')
);

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (private.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (private.has_role((SELECT auth.uid()), 'admin'))
WITH CHECK (private.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (private.has_role((SELECT auth.uid()), 'admin'));
