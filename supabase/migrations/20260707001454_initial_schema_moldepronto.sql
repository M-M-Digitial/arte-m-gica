-- moldes table (public catalog)
CREATE TABLE public.moldes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  image_url TEXT,
  emoji TEXT,
  popular BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.moldes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Moldes are viewable by everyone" ON public.moldes FOR SELECT USING (true);

-- temas table (public catalog)
CREATE TABLE public.temas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  emoji TEXT,
  colors TEXT[] NOT NULL DEFAULT '{}',
  trending BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.temas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Temas are viewable by everyone" ON public.temas FOR SELECT USING (true);

-- projetos table (user-specific)
CREATE TABLE public.projetos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  molde_id UUID REFERENCES public.moldes(id),
  tema_id UUID REFERENCES public.temas(id),
  personalization JSONB NOT NULL DEFAULT '{}',
  preview_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own projects" ON public.projetos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own projects" ON public.projetos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON public.projetos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own projects" ON public.projetos FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_moldes_updated_at BEFORE UPDATE ON public.moldes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_temas_updated_at BEFORE UPDATE ON public.temas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projetos_updated_at BEFORE UPDATE ON public.projetos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- storage bucket for generated arts
INSERT INTO storage.buckets (id, name, public) VALUES ('artes-geradas', 'artes-geradas', true);
CREATE POLICY "Generated arts are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'artes-geradas');
CREATE POLICY "Authenticated users can upload generated arts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'artes-geradas' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own generated arts" ON storage.objects FOR DELETE USING (bucket_id = 'artes-geradas' AND auth.uid()::text = (storage.foldername(name))[1]);
ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS arte_url text;

-- chat-uploads bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-uploads', 'chat-uploads', true);
CREATE POLICY "Allow public uploads to chat-uploads" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'chat-uploads');
CREATE POLICY "Allow public read access to chat-uploads" ON storage.objects FOR SELECT TO public USING (bucket_id = 'chat-uploads');

-- conversas
CREATE TABLE public.conversas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.conversas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own conversations" ON public.conversas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own conversations" ON public.conversas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own conversations" ON public.conversas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own conversations" ON public.conversas FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_conversas_updated_at BEFORE UPDATE ON public.conversas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- avatars bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- template_pdf_url + seed 18 moldes (URLs do pemjul continuam publicas)
ALTER TABLE public.moldes ADD COLUMN IF NOT EXISTS template_pdf_url text;
INSERT INTO public.moldes (name, category, description, emoji, popular, sort_order, image_url, template_pdf_url) VALUES
('Caixa Milk', 'Caixas', 'Caixinha milk clássica para lembrancinhas e doces', '🥛', true, 1, 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/thumbs/Caixa_Milk.png', 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/Caixa%20Milk.pdf'),
('Caixa Milk Vintage', 'Caixas', 'Versão vintage da caixinha milk com recortes decorativos', '🥛', true, 2, 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/thumbs/Caixa_Milk_Vintage.png', 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/Caixa%20Milk%20Vintage.pdf'),
('Caixa Cubo', 'Caixas', 'Caixa cúbica clássica para presentes e doces', '📦', false, 3, 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/thumbs/Caixa_Cubo.png', 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/Caixa%20Cubo.pdf'),
('Caixa Bala', 'Embalagens', 'Embalagem em formato de bala torcida nas pontas', '🍬', true, 4, 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/thumbs/Caixa_Bala.png', 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/Caixa%20Bala.pdf'),
('Caixa Meia Bala', 'Embalagens', 'Meia bala — versão menor da embalagem bala', '🍬', false, 5, 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/thumbs/Caixa_Meia_Bala.png', 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/Caixa%20Meia%20Bala.pdf'),
('Caixa Brownie', 'Caixas', 'Caixa retangular ideal para brownies e doces fatiados', '🍫', false, 6, 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/thumbs/Caixa_Brownie.png', 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/Caixa%20Brownie.pdf'),
('Caixa Canudo', 'Embalagens', 'Embalagem tubular para canudos recheados', '🌮', false, 7, 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/thumbs/Caixa_Canudo.png', 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/Caixa%20Canudo.pdf'),
('Caixa Fina', 'Caixas', 'Caixa fina e elegante para chocolates e bombons', '🍫', false, 8, 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/thumbs/Caixa_Fina.png', 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/Caixa%20Fina.pdf'),
('Caixa Mala', 'Caixas', 'Caixa em formato de mala com alça decorativa', '🧳', true, 9, 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/thumbs/Caixa_Mala.png', 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/Caixa%20Mala.pdf'),
('Caixa Pipoca', 'Embalagens', 'Balde de pipoca clássico para festas e cinema', '🍿', true, 10, 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/thumbs/Caixa_Pipoca.png', 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/Caixa%20Pipoca.pdf'),
('Caixa Porta Tubetes', 'Embalagens', 'Caixa expositora com divisórias para tubetes', '🧪', false, 11, 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/thumbs/Caixa_Porta_Tubetes.png', 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/Caixa%20Porta%20Tubetes.pdf'),
('Caixa Saquinho', 'Embalagens', 'Saquinho com fundo em caixa para lembrancinhas', '🛍️', false, 12, 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/thumbs/Caixa_Saquinho.png', 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/Caixa%20Saquinho.pdf'),
('Caixa Sextava Gomos', 'Caixas', 'Caixa sextavada com gomos decorativos', '⬡', false, 13, 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/thumbs/Caixa_Sextava_Gomos.png', 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/Caixa%20Sextava%20-%20Gomos.pdf'),
('Caixa Sushi', 'Embalagens', 'Caixa estilo sushi para doces e salgados finos', '🍣', false, 14, 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/thumbs/Caixa_Sushi.png', 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/Caixa%20Sushi.pdf'),
('China In Box', 'Embalagens', 'Caixa estilo comida chinesa take-away', '🥡', true, 15, 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/thumbs/China_In_Box.png', 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/China%20In%20Box.pdf'),
('Cestinha', 'Embalagens', 'Cestinha de papel com alça para guloseimas', '🧺', true, 16, 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/thumbs/Cestinha.png', 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/Cestinha.pdf'),
('Forminhas', 'Decoração', 'Forminhas decorativas para doces de festa', '🌸', false, 17, 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/thumbs/Forminhas.png', 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/Forminhas.pdf'),
('Porta Bis Duplo', 'Decoração', 'Porta-bis duplo para personalizar chocolates', '🍫', true, 18, 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/thumbs/Porta_Bis_Duplo.png', 'https://pemjulrovatvcicnpvbo.supabase.co/storage/v1/object/public/moldes/Porta%20Bis%20Duplo.pdf');

-- roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert moldes" ON public.moldes FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update moldes" ON public.moldes FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete moldes" ON public.moldes FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view moldes files" ON storage.objects FOR SELECT USING (bucket_id = 'moldes');
CREATE POLICY "Admins can upload moldes files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'moldes' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update moldes files" ON storage.objects FOR UPDATE USING (bucket_id = 'moldes' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete moldes files" ON storage.objects FOR DELETE USING (bucket_id = 'moldes' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert into any bucket" ON storage.objects FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update any object" ON storage.objects FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete any object" ON storage.objects FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- upload_jobs
CREATE TABLE public.upload_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bucket text NOT NULL,
  prefix text NOT NULL DEFAULT '',
  file_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  total int NOT NULL DEFAULT 0,
  success int NOT NULL DEFAULT 0,
  failed int NOT NULL DEFAULT 0,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  register_in_moldes boolean NOT NULL DEFAULT false,
  default_category text NOT NULL DEFAULT 'Geral',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.upload_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view their own jobs" ON public.upload_jobs FOR SELECT USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins create their own jobs" ON public.upload_jobs FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update their own jobs" ON public.upload_jobs FOR UPDATE USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can upload to any bucket" ON storage.objects FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- modelos prontos
CREATE TABLE public.modelos_prontos_temas (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.modelos_prontos_arquivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_slug TEXT NOT NULL REFERENCES public.modelos_prontos_temas(slug) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (theme_slug, file_name)
);
CREATE INDEX idx_mp_arquivos_theme ON public.modelos_prontos_arquivos(theme_slug);
ALTER TABLE public.modelos_prontos_temas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modelos_prontos_arquivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Temas visíveis a todos" ON public.modelos_prontos_temas FOR SELECT USING (true);
CREATE POLICY "Arquivos visíveis a todos" ON public.modelos_prontos_arquivos FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam temas" ON public.modelos_prontos_temas FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins gerenciam arquivos" ON public.modelos_prontos_arquivos FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));;
