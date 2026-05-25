
-- 1. Role enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. has_role security-definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. user_roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Admin policies on moldes
CREATE POLICY "Admins can insert moldes"
ON public.moldes FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update moldes"
ON public.moldes FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete moldes"
ON public.moldes FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Storage policies for moldes bucket (admin-only write)
CREATE POLICY "Anyone can view moldes files"
ON storage.objects FOR SELECT
USING (bucket_id = 'moldes');

CREATE POLICY "Admins can upload moldes files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'moldes' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update moldes files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'moldes' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete moldes files"
ON storage.objects FOR DELETE
USING (bucket_id = 'moldes' AND public.has_role(auth.uid(), 'admin'));
