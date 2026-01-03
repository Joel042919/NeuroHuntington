-- POLICY: Staff (Doctor/Receptionist) can view ALL Profiles
CREATE POLICY "Staff can view all profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles AS me
    WHERE me.id = auth.uid()
    AND me.id_role IN (1, 2) -- 1=Doctor, 2=Receptionist
  )
);

-- POLICY: Staff can view ALL Appointments
CREATE POLICY "Staff can view all appointments"
ON public.appointments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles AS me
    WHERE me.id = auth.uid()
    AND me.id_role IN (1, 2)
  )
);

-- POLICY: Receptionist can INSERT Appointments (for others)
CREATE POLICY "Receptionist can insert appointments"
ON public.appointments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles AS me
    WHERE me.id = auth.uid()
    AND me.id_role = 2
  )
);

-- POLICY: Staff can view ALL Clinical Cases
CREATE POLICY "Staff can view all cases"
ON public.clinical_cases FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles AS me
    WHERE me.id = auth.uid()
    AND me.id_role IN (1, 2)
  )
);

-- POLICY: Receptionist can INSERT Clinical Cases
CREATE POLICY "Receptionist can insert cases"
ON public.clinical_cases FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles AS me
    WHERE me.id = auth.uid()
    AND me.id_role = 2
  )
);

-- POLICY: Receptionist can UPDATE Clinical Cases (optional, e.g. status)
CREATE POLICY "Receptionist can update cases"
ON public.clinical_cases FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles AS me
    WHERE me.id = auth.uid()
    AND me.id_role = 2
  )
);
