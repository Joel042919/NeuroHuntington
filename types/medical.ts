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
    birthday?: string;
}

export interface LabResult {
    id: string;
    type: string; // 'sangre', 'genetico', etc.
    description: string;
    results_json: Record<string, any>; // Tu JSON dinámico
    result_text: string; // La síntesis
    analyzed_at: string;
    status: boolean;
}

export interface NeurologyAssessment {
    id?: string;
    case_id?: string;
    doctor_id?: string;

    // Motor Symptoms (Booleans)
    has_chorea: boolean;
    has_dystonia: boolean;
    has_bradykinesia: boolean;

    // Scores
    uhdrs_motor_score?: number | string; // 0-124
    mmse_score?: number | string; // 0-35
    pba_score?: number | string;
    fc_score?: number | string;

    // JSON Details
    uhdrs_motor_info?: Record<string, any>;
    mmse_info?: Record<string, any>;
    pba_info?: Record<string, any>;
    fc_info?: Record<string, any>;

    clinical_notes?: string;
    diagnosis?: string;
    genetic_test_ordered?: boolean;
    created_at?: string;
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
    notes?: string;
}

export interface GeneralConsultation {
    id: string;
    reason_consultation?: string;
    current_illness: string;
    family_history: string;
    pathological_history?: string;
    physical_exam_notes?: string;
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