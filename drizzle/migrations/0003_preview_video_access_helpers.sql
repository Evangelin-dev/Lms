CREATE OR REPLACE FUNCTION public.is_published_preview_video(_object_name TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, storage
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.video_reference = _object_name
      AND l.is_preview = true
      AND l.visibility = 'published'
      AND c.visibility = 'published'
  )
$$;
REVOKE ALL ON FUNCTION public.is_published_preview_video(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_published_preview_video(TEXT) TO anon, authenticated;
DROP POLICY IF EXISTS "Learners can view videos for their active courses" ON storage.objects;
DROP POLICY IF EXISTS "Public can view published preview videos" ON storage.objects;
CREATE POLICY "Learners can view videos for their active courses" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'course-videos' AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.course_access ca
      WHERE ca.course_id::text = split_part(storage.objects.name, '/', 1)
        AND ca.user_id = auth.uid()
        AND ca.status = 'active'
        AND (ca.expires_at IS NULL OR ca.expires_at > now())
    )
    OR public.is_published_preview_video(storage.objects.name)
  )
);
CREATE POLICY "Public can view published preview videos" ON storage.objects FOR SELECT TO anon USING (
  bucket_id = 'course-videos' AND public.is_published_preview_video(storage.objects.name)
);

GRANT INSERT ON public.audit_logs TO authenticated;
CREATE POLICY "Admins can write audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND actor_id = auth.uid());