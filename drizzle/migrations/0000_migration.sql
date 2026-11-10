CREATE TABLE public.teacher_settings (
  user_id uuid PRIMARY KEY,
  section text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_settings TO authenticated;
GRANT ALL ON public.teacher_settings TO service_role;
ALTER TABLE public.teacher_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings select" ON public.teacher_settings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own settings insert" ON public.teacher_settings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own settings update" ON public.teacher_settings FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_token text NOT NULL UNIQUE,
  name text NOT NULL,
  section text NOT NULL,
  parent_name text NOT NULL,
  parent_phone text NOT NULL,
  carrier text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.teaches_section(_section text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.teacher_settings t WHERE t.user_id = auth.uid() AND t.section <> '' AND lower(trim(t.section)) = lower(trim(_section)));
$$;

CREATE POLICY "teacher reads section" ON public.students FOR SELECT TO authenticated USING (public.teaches_section(section));
CREATE POLICY "teacher deletes section" ON public.students FOR DELETE TO authenticated USING (public.teaches_section(section));

CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  day date NOT NULL,
  period text NOT NULL CHECK (period IN ('morning','afternoon')),
  late boolean NOT NULL DEFAULT false,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, day, period)
);
GRANT SELECT ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher reads attendance" ON public.attendance FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND public.teaches_section(s.section)));