DROP POLICY IF EXISTS "Authenticated can manage fines" ON public.fines;
CREATE POLICY "Account manages its workers fines" ON public.fines
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = fines.worker_id AND w.user_id = auth.uid()))
WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.workers w WHERE w.id = fines.worker_id AND w.user_id = auth.uid()));