-- Enable RLS and Add Policies for Patient Access

-- 1. Clinical Cases
-- Permitir que el paciente vea SUS propios casos
CREATE POLICY "Patient can view own clinical_cases"
ON public.clinical_cases FOR SELECT
USING (auth.uid() = patient_id);

-- 2. Appointments
-- Permitir ver sus propias citas
CREATE POLICY "Patient can view own appointments"
ON public.appointments FOR SELECT
USING (auth.uid() = patient_id);

-- 3. Medical Histories
-- Permitir ver su historial
CREATE POLICY "Patient can view own medical_histories"
ON public.medical_histories FOR SELECT
USING (auth.uid() = patient_id);

-- 4. Prescriptions
-- Permitir ver recetas (a través del case_id se podría filtrar, pero las recetas no tienen patient_id directo a veces, revisando esquema...)
-- El esquema dice: prescriptions -> case_id -> clinical_cases -> patient_id
-- O prescriptions -> (quizas no tiene patient_id directo? Revisemos esquema en memoria)
-- El esquema dice: prescriptions(id, case_id, doctor_id).
-- Entonces necesitamos una subquery o join.
-- Policy usando EXISTS:
CREATE POLICY "Patient can view own prescriptions"
ON public.prescriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clinical_cases
    WHERE clinical_cases.id = prescriptions.case_id
    AND clinical_cases.patient_id = auth.uid()
  )
);

-- 5. Prescription Detail
-- Relacionado a prescription -> case ...
CREATE POLICY "Patient can view own prescription details"
ON public.prescription_detail FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.prescriptions
    JOIN public.clinical_cases ON clinical_cases.id = prescriptions.case_id
    WHERE prescriptions.id = prescription_detail.id_prescripcion
    AND clinical_cases.patient_id = auth.uid()
  )
);

-- 6. Neurology Assessments
-- Relacionado por case_id
CREATE POLICY "Patient can view own neurology assessments"
ON public.neurology_assessments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clinical_cases
    WHERE clinical_cases.id = neurology_assessments.case_id
    AND clinical_cases.patient_id = auth.uid()
  )
);

-- 7. Lab Results
-- Relacionado por case_id
CREATE POLICY "Patient can view own lab results"
ON public.lab_results FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clinical_cases
    WHERE clinical_cases.id = lab_results.case_id
    AND clinical_cases.patient_id = auth.uid()
  )
);

-- 8. Triage Records (Si se desea mostrar)
CREATE POLICY "Patient can view own triage records"
ON public.triage_records FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clinical_cases
    WHERE clinical_cases.id = triage_records.case_id
    AND clinical_cases.patient_id = auth.uid()
  )
);
