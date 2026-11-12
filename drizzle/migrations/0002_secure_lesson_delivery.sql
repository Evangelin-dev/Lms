CREATE OR REPLACE VIEW public.course_catalog_lessons WITH (security_invoker = false) AS
SELECT l.id, l.course_id, l.title, l.description, l.section_title, l.duration_seconds, l.sort_order, l.is_preview
FROM public.lessons l
JOIN public.courses c ON c.id = l.course_id
WHERE l.visibility = 'published' AND c.visibility = 'published';
GRANT SELECT ON public.course_catalog_lessons TO anon, authenticated;

DROP POLICY IF EXISTS "Published lessons for published courses are visible" ON public.lessons;
CREATE POLICY "Lesson details are visible to course purchasers" ON public.lessons FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'instructor')
  OR EXISTS (
    SELECT 1 FROM public.course_access ca
    WHERE ca.course_id = lessons.course_id
      AND ca.user_id = auth.uid()
      AND ca.status = 'active'
      AND (ca.expires_at IS NULL OR ca.expires_at > now())
  )
);

CREATE POLICY "Admins can upload course videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'course-videos' AND public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Admins can update course videos" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'course-videos' AND public.has_role(auth.uid(), 'admin')
) WITH CHECK (bucket_id = 'course-videos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete course videos" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'course-videos' AND public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Learners can view videos for their active courses" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'course-videos' AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.course_access ca
      WHERE ca.course_id::text = split_part(name, '/', 1)
        AND ca.user_id = auth.uid()
        AND ca.status = 'active'
        AND (ca.expires_at IS NULL OR ca.expires_at > now())
    )
    OR EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.video_reference = storage.objects.name
        AND l.is_preview = true
        AND l.visibility = 'published'
    )
  )
);
CREATE POLICY "Public can view published preview videos" ON storage.objects FOR SELECT TO anon USING (
  bucket_id = 'course-videos' AND EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.video_reference = storage.objects.name
      AND l.is_preview = true
      AND l.visibility = 'published'
  )
);