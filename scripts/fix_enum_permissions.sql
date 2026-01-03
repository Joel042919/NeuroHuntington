-- Permissions for Enum/Lookup Tables
-- Ensure these tables are readable by everyone, including authenticated patients.

-- 1. Appointment Types
ALTER TABLE public.type_appointment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for type_appointment"
ON public.type_appointment FOR SELECT
USING (true);

-- 2. Case Status
ALTER TABLE public.case_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for case_status"
ON public.case_status FOR SELECT
USING (true);

-- 3. Patient Priority (for Triage)
ALTER TABLE public.patient_priority ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for patient_priority"
ON public.patient_priority FOR SELECT
USING (true);

-- 4. User Role (if needed)
ALTER TABLE public.user_role ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for user_role"
ON public.user_role FOR SELECT
USING (true);
