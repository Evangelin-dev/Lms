CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Learners can read their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Learners can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('admin', 'instructor', 'learner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
REVOKE ALL ON FUNCTION public.has_role(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO authenticated, service_role;
CREATE POLICY "Learners can view their own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Design',
  instructor_name TEXT NOT NULL DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  discount_price NUMERIC(10,2) CHECK (discount_price IS NULL OR discount_price >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
  level TEXT NOT NULL DEFAULT 'All levels',
  thumbnail_url TEXT,
  learning_outcomes TEXT[] NOT NULL DEFAULT '{}',
  visibility TEXT NOT NULL DEFAULT 'draft' CHECK (visibility IN ('draft', 'published', 'archived')),
  is_free BOOLEAN NOT NULL DEFAULT false,
  access_duration_days INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published courses are visible to everyone" ON public.courses FOR SELECT TO anon, authenticated USING (visibility = 'published' OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'instructor'));
CREATE POLICY "Admins can create courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update courses" ON public.courses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete courses" ON public.courses FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  section_title TEXT NOT NULL DEFAULT 'Getting started',
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  video_provider TEXT,
  video_reference TEXT,
  thumbnail_url TEXT,
  captions_reference TEXT,
  is_preview BOOLEAN NOT NULL DEFAULT false,
  visibility TEXT NOT NULL DEFAULT 'draft' CHECK (visibility IN ('draft', 'published', 'archived')),
  allow_downloads BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lessons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published lessons for published courses are visible" ON public.lessons FOR SELECT TO anon, authenticated USING ((visibility = 'published' AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = lessons.course_id AND c.visibility = 'published')) OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'instructor'));
CREATE POLICY "Admins can create lessons" ON public.lessons FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update lessons" ON public.lessons FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete lessons" ON public.lessons FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.course_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  grant_reason TEXT NOT NULL DEFAULT 'purchase',
  granted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT ON public.course_access TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.course_access TO authenticated;
GRANT ALL ON public.course_access TO service_role;
ALTER TABLE public.course_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Learners can view their own course access" ON public.course_access FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can grant course access" ON public.course_access FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update course access" ON public.course_access FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can revoke course access" ON public.course_access FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  payment_provider TEXT,
  payment_reference TEXT,
  refund_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Learners can view their own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  last_position_seconds INTEGER NOT NULL DEFAULT 0 CHECK (last_position_seconds >= 0),
  watched_seconds INTEGER NOT NULL DEFAULT 0 CHECK (watched_seconds >= 0),
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_progress TO authenticated;
GRANT ALL ON public.video_progress TO service_role;
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Learners can view their own progress" ON public.video_progress FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Learners can create their own progress" ON public.video_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Learners can update their own progress" ON public.video_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Learners can delete their own progress" ON public.video_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.video_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('play', 'pause', 'seek', 'complete')),
  watched_seconds INTEGER NOT NULL DEFAULT 0 CHECK (watched_seconds >= 0),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.video_events TO authenticated;
GRANT SELECT ON public.video_events TO authenticated;
GRANT ALL ON public.video_events TO service_role;
ALTER TABLE public.video_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Learners can record their own video events" ON public.video_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can read video engagement" ON public.video_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  reason TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX courses_visibility_category_idx ON public.courses (visibility, category);
CREATE INDEX lessons_course_order_idx ON public.lessons (course_id, sort_order);
CREATE INDEX course_access_user_status_idx ON public.course_access (user_id, status);
CREATE INDEX orders_user_created_idx ON public.orders (user_id, created_at DESC);
CREATE INDEX video_progress_user_updated_idx ON public.video_progress (user_id, updated_at DESC);
CREATE INDEX video_events_lesson_time_idx ON public.video_events (lesson_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER courses_set_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER lessons_set_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER video_progress_set_updated_at BEFORE UPDATE ON public.video_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'display_name'), ''), split_part(COALESCE(NEW.email, ''), '@', 1)), NEW.raw_user_meta_data ->> 'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'learner') ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();