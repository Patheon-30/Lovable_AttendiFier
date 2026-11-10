ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'present';
UPDATE public.attendance SET status = CASE WHEN late THEN 'late' ELSE 'present' END;
CREATE TABLE public.monthly_attendance (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_attendance_id uuid NOT NULL UNIQUE,
 student_id uuid NOT NULL,
 student_name text NOT NULL,
 section text NOT NULL,
 day date NOT NULL,
 period text NOT NULL,
 status text NOT NULL,
 time_in timestamptz NOT NULL,
 scheduled_time_out timestamptz,
 UNIQUE(student_id, day, period)
);
GRANT SELECT ON public.monthly_attendance TO authenticated;
GRANT ALL ON public.monthly_attendance TO service_role;
ALTER TABLE public.monthly_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher reads monthly section" ON public.monthly_attendance FOR SELECT TO authenticated USING (public.teaches_section(section));
CREATE INDEX monthly_attendance_section_day ON public.monthly_attendance(section, day);
CREATE OR REPLACE FUNCTION public.archive_attendance() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.monthly_attendance(source_attendance_id,student_id,student_name,section,day,period,status,time_in,scheduled_time_out)
 SELECT NEW.id,s.id,s.name,s.section,NEW.day,NEW.period,NEW.status,NEW.scanned_at,
 CASE WHEN NEW.status <> 'absent' THEN (NEW.day + CASE WHEN NEW.period='morning' THEN time '07:31' ELSE time '12:51' END) AT TIME ZONE 'Asia/Manila' ELSE NULL END
 FROM public.students s WHERE s.id=NEW.student_id;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.archive_attendance() FROM PUBLIC;
CREATE TRIGGER archive_attendance_insert AFTER INSERT ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.archive_attendance();
INSERT INTO public.monthly_attendance(source_attendance_id,student_id,student_name,section,day,period,status,time_in,scheduled_time_out)
SELECT a.id,s.id,s.name,s.section,a.day,a.period,a.status,a.scanned_at,NULL FROM public.attendance a JOIN public.students s ON s.id=a.student_id ON CONFLICT DO NOTHING;