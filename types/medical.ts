// types/medical.ts

export interface ClinicalCase {
    id: string;
    patient_id: string;
    code_case: string;
    status: number;
}

export interface PatientProfile {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
    phone?: string;
    dni?: string;
}

export interface LabResult {
    id: string;
    type: string; // 'sangre', 'genetico', etc.
    description: string;
    results_json: Record<string, any>; // Tu JSON dinámico
    result_text: string; // La síntesis
    analyzed_at: string;
}

export interface NeurologyAssessment {
    id?: string; // Opcional porque puede no existir aún
    has_chorea: boolean;
    uhdrs_motor_score: string | number; // String en input, number en DB
    mmse_score: string | number;
    clinical_notes: string;
    diagnosis: string; // Nuevo campo
}

export interface Appointment {
    id: string;
    scheduled_at: string;
    case_id: string;
    type: {
        type: string;
    } | null;
    status: {
        appointment_status: string;
    } | null;
    patient: {
        id: string;
        first_name: string;
        last_name: string;
    } | null;
}

export interface MedicalHistory {
    id: string;
    allergies: string[];
    blood_type: string;
    chronic_conditions: string[];
}

export interface TriageRecord {
    id: string;
    systolic_pressure: number;
    diastolic_pressure: number;
    weight_kg: number;
    temperature: number;
    heart_rate: number;
    oxygen_saturation: number;
}

export interface GeneralConsultation {
    id: string;
    current_illness: string;
    family_history: string;
}

export interface DoctorSpecialty {
    id: number;
    specialty: string;
    status: boolean;
}

export interface DoctorDetail {
    profile_id: string;
    specialty_id: number;
    cmp_code: string;
    available_hours: Record<string, { start_time: string; end_time: string }[]>; // JSONB structure
    specialty?: DoctorSpecialty; // Join
    profile?: PatientProfile; // Join (reuse PatientProfile for basic user info)
}

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}